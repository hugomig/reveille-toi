package expo.modules.alarmscheduler

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.os.Build

/** Notification « Pas de réveil de prévu pour demain. Un oubli ? ». */
object Reminders {
  private const val CHANNEL_ID = "reminders"
  private const val NOTIFICATION_ID = 4300

  fun notify(context: Context, text: String) {
    val manager = context.getSystemService(NotificationManager::class.java)
    if (!manager.areNotificationsEnabled()) return

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      manager.createNotificationChannel(
        NotificationChannel(CHANNEL_ID, "Rappels de réveil", NotificationManager.IMPORTANCE_HIGH).apply {
          description = "Prévient quand aucun réveil n'est programmé pour le lendemain"
        },
      )
    }

    val open = PendingIntent.getActivity(
      context, 2, AlarmScheduler.launchIntent(context),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(context, CHANNEL_ID)
    else @Suppress("DEPRECATION") Notification.Builder(context).setPriority(Notification.PRIORITY_HIGH)

    val appName = context.applicationInfo.loadLabel(context.packageManager).toString()
    val notification = builder
      .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
      .setContentTitle(appName)
      .setContentText(text)
      .setStyle(Notification.BigTextStyle().bigText(text))
      .setCategory(Notification.CATEGORY_REMINDER)
      .setAutoCancel(true)
      .setContentIntent(open)
      .build()
    manager.notify(NOTIFICATION_ID, notification)
  }
}
