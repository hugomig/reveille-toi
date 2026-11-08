package expo.modules.alarmscheduler

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Reçoit un déclenchement : programme le suivant, puis fait sonner / notifie selon le type. */
class AlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != AlarmScheduler.ACTION_FIRE) return
    val id = intent.data?.schemeSpecificPart ?: return
    val now = System.currentTimeMillis()
    val spec = AlarmScheduler.onFired(context, id) ?: return

    when (spec.kind) {
      AlarmSpec.KIND_REMINDER -> {
        if (!AlarmScheduler.hasAlarmOnTargetDay(context, now, spec.targetOffsetDays)) {
          Reminders.notify(context, spec.payload.optString("name"))
        }
      }
      AlarmSpec.KIND_BACKUP -> {
        if (!AlarmScheduler.hasAlarmOnTargetDay(context, now, spec.targetOffsetDays)) {
          AlarmService.start(context, spec.payload.toString(), fired = true)
        }
      }
      else -> {
        AlarmScheduler.recordFired(context, now)
        AlarmService.start(context, spec.payload.toString(), fired = true)
      }
    }
  }
}

/** Reprogramme les réveils après un redémarrage, une mise à jour de l'appli ou un changement d'heure. */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    AlarmScheduler.rescheduleAll(context)
  }
}
