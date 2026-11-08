package expo.modules.alarmscheduler

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Reçoit le déclenchement d'un réveil : programme le suivant et lance la sonnerie. */
class AlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != AlarmScheduler.ACTION_FIRE) return
    val id = intent.data?.schemeSpecificPart ?: return
    val spec = AlarmScheduler.onFired(context, id) ?: return
    AlarmService.start(context, spec.payload.toString(), fired = true)
  }
}

/** Reprogramme les réveils après un redémarrage, une mise à jour de l'appli ou un changement d'heure. */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    AlarmScheduler.rescheduleAll(context)
  }
}
