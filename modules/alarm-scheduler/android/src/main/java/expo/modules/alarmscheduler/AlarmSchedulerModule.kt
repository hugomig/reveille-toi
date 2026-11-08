package expo.modules.alarmscheduler

import android.app.AlarmManager
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Interface JavaScript du module (voir modules/alarm-scheduler/index.ts). */
class AlarmSchedulerModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("AlarmScheduler")

    Events("onAlarm")

    OnCreate {
      AlarmService.onRingingStarted = { payload -> sendEvent("onAlarm", mapOf("alarm" to payload)) }
    }

    OnDestroy {
      AlarmService.onRingingStarted = null
    }

    /** Remplace tous les réveils programmés. `json` : tableau d'AlarmSpec. */
    AsyncFunction("scheduleAlarms") { json: String ->
      AlarmScheduler.replaceAll(context, AlarmSpec.listFromJson(json))
    }

    /** Fait sonner un réveil tout de suite (bouton ▶ « tester »). */
    AsyncFunction("startRinging") { payload: String ->
      AlarmService.start(context, payload, fired = false)
    }

    /** Arrête la sonnerie et ne s'affiche plus par-dessus l'écran de verrouillage. */
    AsyncFunction("stopRinging") {
      AlarmService.stop(context)
      appContext.currentActivity?.let { LockScreen.hide(it) }
    }

    /** Réveil en train de sonner (payload JSON), ou null. */
    Function("getRingingAlarm") {
      AlarmService.ringing
    }

    AsyncFunction("previewSound") { id: String ->
      Sounds.preview(context, id)
    }

    AsyncFunction("stopPreview") {
      Sounds.stopPreview()
    }

    /** Autorisations nécessaires pour que les réveils sonnent correctement. */
    Function("getPermissionStatus") {
      val am = context.getSystemService(AlarmManager::class.java)
      val nm = context.getSystemService(NotificationManager::class.java)
      mapOf(
        "exactAlarms" to (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || am.canScheduleExactAlarms()),
        "fullScreen" to (Build.VERSION.SDK_INT < 34 || nm.canUseFullScreenIntent()),
        "notifications" to nm.areNotificationsEnabled(),
      )
    }

    AsyncFunction("openExactAlarmSettings") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        openSettings(Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, packageUri()))
      }
    }

    AsyncFunction("openFullScreenSettings") {
      if (Build.VERSION.SDK_INT >= 34) {
        openSettings(Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, packageUri()))
      }
    }

    AsyncFunction("openNotificationSettings") {
      openSettings(
        Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
          .putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName),
      )
    }
  }

  private fun packageUri(): Uri = Uri.parse("package:${context.packageName}")

  private fun openSettings(intent: Intent) {
    context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
  }
}
