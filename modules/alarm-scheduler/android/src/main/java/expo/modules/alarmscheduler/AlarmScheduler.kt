package expo.modules.alarmscheduler

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build

/** Programmation des réveils avec AlarmManager, et sauvegarde pour les reprogrammer au redémarrage. */
object AlarmScheduler {
  const val ACTION_FIRE = "expo.modules.alarmscheduler.FIRE"
  private const val PREFS = "expo.modules.alarmscheduler"
  private const val KEY_ALARMS = "alarms"

  // --- Sauvegarde -----------------------------------------------------------

  fun load(context: Context): List<AlarmSpec> {
    val json = prefs(context).getString(KEY_ALARMS, null) ?: return emptyList()
    return try {
      AlarmSpec.listFromJson(json)
    } catch (e: Exception) {
      emptyList()
    }
  }

  private fun save(context: Context, list: List<AlarmSpec>) {
    prefs(context).edit().putString(KEY_ALARMS, AlarmSpec.listToJson(list)).apply()
  }

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  // --- Programmation --------------------------------------------------------

  /** Remplace tous les réveils programmés par [specs]. Retourne le nombre de réveils programmés. */
  @Synchronized
  fun replaceAll(context: Context, specs: List<AlarmSpec>): Int {
    load(context).forEach { cancel(context, it.id) }
    val now = System.currentTimeMillis()
    val scheduled = specs.filter { schedule(context, it, now) }
    save(context, scheduled)
    return scheduled.size
  }

  /** Reprogramme les réveils sauvegardés (après redémarrage, mise à jour, changement d'heure). */
  fun rescheduleAll(context: Context) {
    replaceAll(context, load(context))
  }

  /**
   * Après un déclenchement : programme l'occurrence suivante d'un réveil répété,
   * ou retire un réveil unique. Retourne le réveil, ou null s'il est inconnu.
   */
  @Synchronized
  fun onFired(context: Context, id: String): AlarmSpec? {
    val all = load(context)
    val spec = all.find { it.id == id } ?: return null
    if (spec.isRepeating) {
      // +1 s : on ne veut pas reprogrammer la même minute.
      schedule(context, spec, System.currentTimeMillis() + 1000)
    } else {
      save(context, all.filter { it.id != id })
    }
    return spec
  }

  private fun schedule(context: Context, spec: AlarmSpec, now: Long): Boolean {
    val trigger = spec.nextTrigger(now) ?: return false
    val am = context.getSystemService(AlarmManager::class.java)
    val operation = fireIntent(context, spec.id)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !am.canScheduleExactAlarms()) {
      // Sans l'autorisation « alarmes exactes » : réveil approximatif plutôt que rien.
      am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, trigger, operation)
    } else {
      // setAlarmClock : prioritaire, ignore les économies d'énergie, affiche ⏰ dans la barre d'état.
      am.setAlarmClock(AlarmManager.AlarmClockInfo(trigger, openAppIntent(context)), operation)
    }
    return true
  }

  private fun cancel(context: Context, id: String) {
    context.getSystemService(AlarmManager::class.java).cancel(fireIntent(context, id))
  }

  /** Un PendingIntent distinct par réveil (grâce à l'URI qui contient l'identifiant). */
  private fun fireIntent(context: Context, id: String): PendingIntent {
    val intent = Intent(context, AlarmReceiver::class.java)
      .setAction(ACTION_FIRE)
      .setData(Uri.fromParts("reveil-alarm", id, null))
    return PendingIntent.getBroadcast(
      context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  /** Ouvre l'appli (utilisé quand on touche le réveil dans les réglages rapides d'Android). */
  private fun openAppIntent(context: Context): PendingIntent =
    PendingIntent.getActivity(
      context, 0, launchIntent(context),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

  fun launchIntent(context: Context): Intent =
    (context.packageManager.getLaunchIntentForPackage(context.packageName) ?: Intent())
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
}
