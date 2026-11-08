package expo.modules.alarmscheduler

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import org.json.JSONObject

/**
 * Service au premier plan qui fait sonner le réveil :
 * son sur le volume « alarme » (progressif ou fort), vibration, et notification plein écran
 * qui ouvre l'écran de sonnerie (même téléphone verrouillé).
 */
class AlarmService : Service() {
  companion object {
    private const val ACTION_START = "expo.modules.alarmscheduler.START"
    private const val ACTION_STOP = "expo.modules.alarmscheduler.STOP"
    private const val EXTRA_PAYLOAD = "payload"
    const val EXTRA_ALARM = "expo.modules.alarmscheduler.ALARM"
    private const val CHANNEL_ID = "alarms"
    private const val NOTIFICATION_ID = 4242

    /** Arrêt automatique si personne ne coupe le réveil. */
    private const val MAX_RING_MS = 10 * 60 * 1000L
    private const val RAMP_MS = 30_000L
    private const val RAMP_START_VOLUME = 0.05f
    private const val RAMP_TICK_MS = 250L

    /** Réveil en train de sonner (payload JSON), ou null. */
    @Volatile
    var ringing: String? = null
      private set

    /** Appelé quand un réveil commence à sonner (pour prévenir le JavaScript). */
    var onRingingStarted: ((String) -> Unit)? = null

    fun start(context: Context, payload: String, fired: Boolean) {
      val json = JSONObject(payload).put("fired", fired).put("firedAt", System.currentTimeMillis())
      val intent = Intent(context, AlarmService::class.java)
        .setAction(ACTION_START)
        .putExtra(EXTRA_PAYLOAD, json.toString())
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent)
      else context.startService(intent)
    }

    fun stop(context: Context) {
      if (ringing == null) return
      context.startService(Intent(context, AlarmService::class.java).setAction(ACTION_STOP))
    }
  }

  private val handler = Handler(Looper.getMainLooper())
  private var player: MediaPlayer? = null
  private var vibrator: Vibrator? = null
  private var focusRequest: AudioFocusRequest? = null
  private var wakeLock: PowerManager.WakeLock? = null
  private var rampStartedAt = 0L

  private val alarmAttributes: AudioAttributes = AudioAttributes.Builder()
    .setUsage(AudioAttributes.USAGE_ALARM)
    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
    .build()

  private val rampTick = object : Runnable {
    override fun run() {
      val p = player ?: return
      val progress = ((System.currentTimeMillis() - rampStartedAt).toFloat() / RAMP_MS).coerceAtMost(1f)
      val volume = RAMP_START_VOLUME + (1f - RAMP_START_VOLUME) * progress
      p.setVolume(volume, volume)
      if (progress < 1f) handler.postDelayed(this, RAMP_TICK_MS)
    }
  }

  private val timeout = Runnable { stopEverything() }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_START -> {
        val payload = intent.getStringExtra(EXTRA_PAYLOAD) ?: return START_NOT_STICKY
        val json = JSONObject(payload)
        releasePlayback()
        goForeground(json)
        startPlayback(json)
        ringing = payload
        handler.removeCallbacks(timeout)
        handler.postDelayed(timeout, MAX_RING_MS)
        onRingingStarted?.invoke(payload)
      }
      ACTION_STOP -> stopEverything()
      else -> stopEverything()
    }
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    releasePlayback()
    ringing = null
    super.onDestroy()
  }

  private fun stopEverything() {
    handler.removeCallbacks(timeout)
    releasePlayback()
    ringing = null
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) stopForeground(STOP_FOREGROUND_REMOVE)
    else @Suppress("DEPRECATION") stopForeground(true)
    stopSelf()
  }

  // --- Notification plein écran --------------------------------------------

  private fun goForeground(alarm: JSONObject) {
    val manager = getSystemService(NotificationManager::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(CHANNEL_ID, "Réveils", NotificationManager.IMPORTANCE_HIGH).apply {
        description = "Réveil en train de sonner"
        setSound(null, null) // le son est joué par le service
        enableVibration(false) // idem pour la vibration
        lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      }
      manager.createNotificationChannel(channel)
    }

    val open = PendingIntent.getActivity(
      this, 1,
      AlarmScheduler.launchIntent(this).putExtra(EXTRA_ALARM, alarm.toString()),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val time = alarm.optString("time")
    val name = alarm.optString("name")

    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(this, CHANNEL_ID)
    else @Suppress("DEPRECATION") Notification.Builder(this).setPriority(Notification.PRIORITY_MAX)

    val notification = builder
      .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
      .setContentTitle(if (time.isNotEmpty()) "Réveil de $time" else "Réveil")
      .setContentText(name.ifEmpty { "Touche pour arrêter le réveil" })
      .setCategory(Notification.CATEGORY_ALARM)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setOngoing(true)
      .setContentIntent(open)
      .setFullScreenIntent(open, true)
      .build()

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  // --- Son et vibration -----------------------------------------------------

  private fun startPlayback(alarm: JSONObject) {
    wakeLock = getSystemService(PowerManager::class.java)
      .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "reveil:alarm")
      .apply { acquire(MAX_RING_MS) }

    startVibration()

    val ring = alarm.optString("ring", "progressive")
    if (ring == "vibrate") return

    requestAudioFocus()
    val resId = Sounds.resId(this, alarm.optString("sound"))
    if (resId == 0) return
    player = MediaPlayer().apply {
      setAudioAttributes(alarmAttributes)
      resources.openRawResourceFd(resId).use { setDataSource(it.fileDescriptor, it.startOffset, it.length) }
      isLooping = true
      prepare()
      val startVolume = if (ring == "progressive") RAMP_START_VOLUME else 1f
      setVolume(startVolume, startVolume)
      start()
    }
    if (ring == "progressive") {
      rampStartedAt = System.currentTimeMillis()
      handler.post(rampTick)
    }
  }

  private fun startVibration() {
    val v = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      getSystemService(VibratorManager::class.java).defaultVibrator
    } else {
      @Suppress("DEPRECATION") getSystemService(Vibrator::class.java)
    }
    vibrator = v
    if (!v.hasVibrator()) return
    val pattern = longArrayOf(0, 800, 600) // 0,8 s de vibration, 0,6 s de pause, en boucle
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      @Suppress("DEPRECATION") v.vibrate(VibrationEffect.createWaveform(pattern, 0), alarmAttributes)
    } else {
      @Suppress("DEPRECATION") v.vibrate(pattern, 0)
    }
  }

  private fun requestAudioFocus() {
    val am = getSystemService(AudioManager::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val req = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
        .setAudioAttributes(alarmAttributes)
        .build()
      focusRequest = req
      am.requestAudioFocus(req)
    } else {
      @Suppress("DEPRECATION")
      am.requestAudioFocus(null, AudioManager.STREAM_ALARM, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
    }
  }

  private fun releasePlayback() {
    handler.removeCallbacks(rampTick)
    player?.run {
      try {
        stop()
      } catch (_: IllegalStateException) {
      }
      release()
    }
    player = null
    vibrator?.cancel()
    vibrator = null
    val am = getSystemService(AudioManager::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      focusRequest?.let { am.abandonAudioFocusRequest(it) }
    } else {
      @Suppress("DEPRECATION") am.abandonAudioFocus(null)
    }
    focusRequest = null
    wakeLock?.takeIf { it.isHeld }?.release()
    wakeLock = null
  }
}
