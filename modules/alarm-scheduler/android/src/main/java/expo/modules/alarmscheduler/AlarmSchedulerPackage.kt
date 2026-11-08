package expo.modules.alarmscheduler

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import expo.modules.core.interfaces.Package
import expo.modules.core.interfaces.ReactActivityLifecycleListener
import java.lang.ref.WeakReference

/** Affichage de l'appli par-dessus l'écran de verrouillage pendant qu'un réveil sonne. */
object LockScreen {
  fun show(activity: Activity) = activity.runOnUiThread {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      activity.setShowWhenLocked(true)
      activity.setTurnScreenOn(true)
    } else {
      @Suppress("DEPRECATION")
      activity.window.addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON,
      )
    }
  }

  fun hide(activity: Activity) = activity.runOnUiThread {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      activity.setShowWhenLocked(false)
      activity.setTurnScreenOn(false)
    } else {
      @Suppress("DEPRECATION")
      activity.window.clearFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON,
      )
    }
  }
}

/**
 * Branché sur le cycle de vie de l'activité principale : quand elle est ouverte par la
 * notification d'un réveil, elle s'affiche immédiatement par-dessus l'écran de verrouillage.
 */
class AlarmSchedulerPackage : Package {
  override fun createReactActivityLifecycleListeners(activityContext: Context?): List<ReactActivityLifecycleListener> {
    var current = WeakReference<Activity>(null)

    fun handle(activity: Activity?, intent: Intent?) {
      if (activity != null && intent?.hasExtra(AlarmService.EXTRA_ALARM) == true) LockScreen.show(activity)
    }

    return listOf(
      object : ReactActivityLifecycleListener {
        override fun onCreate(activity: Activity, savedInstanceState: Bundle?) {
          current = WeakReference(activity)
          handle(activity, activity.intent)
        }

        override fun onResume(activity: Activity) {
          current = WeakReference(activity)
        }

        override fun onNewIntent(intent: Intent): Boolean {
          handle(current.get(), intent)
          return false
        }
      },
    )
  }
}
