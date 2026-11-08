package expo.modules.alarmscheduler

import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer

/** Sonneries (res/raw) et écoute d'une sonnerie sur le volume « alarme ». */
object Sounds {
  private val KNOWN = setOf("beeps", "chime", "marimba", "digital", "rise")
  private var preview: MediaPlayer? = null

  fun resId(context: Context, id: String): Int {
    val name = if (id in KNOWN) id else "chime"
    return context.resources.getIdentifier(name, "raw", context.packageName)
  }

  fun preview(context: Context, id: String) {
    stopPreview()
    val res = resId(context, id)
    if (res == 0) return
    preview = MediaPlayer().apply {
      setAudioAttributes(
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_ALARM)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build(),
      )
      context.resources.openRawResourceFd(res).use { setDataSource(it.fileDescriptor, it.startOffset, it.length) }
      setOnCompletionListener { stopPreview() }
      prepare()
      start()
    }
  }

  fun stopPreview() {
    preview?.run {
      try {
        stop()
      } catch (_: IllegalStateException) {
      }
      release()
    }
    preview = null
  }
}
