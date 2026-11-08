package expo.modules.alarmscheduler

import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar

/**
 * Un réveil programmé, tel qu'envoyé par le JavaScript.
 *
 * - Réveil répété : [hour]:[minute] les jours [days] (lundi = 0 … dimanche = 6).
 * - Réveil unique : [at] (horodatage en ms) ; ignoré s'il est passé.
 *
 * [payload] contient ce dont l'écran de sonnerie a besoin (heure affichée, nom, sonnerie, défi…).
 */
data class AlarmSpec(
  val id: String,
  val hour: Int,
  val minute: Int,
  val days: List<Int>,
  val at: Long?,
  val payload: JSONObject,
) {
  /** Prochain déclenchement strictement après [now], ou null s'il n'y en a plus. */
  fun nextTrigger(now: Long): Long? {
    if (at != null) return if (at > now) at else null

    val base = Calendar.getInstance().apply {
      timeInMillis = now
      set(Calendar.HOUR_OF_DAY, hour)
      set(Calendar.MINUTE, minute)
      set(Calendar.SECOND, 0)
      set(Calendar.MILLISECOND, 0)
    }
    for (offset in 0..7) {
      val c = base.clone() as Calendar
      c.add(Calendar.DAY_OF_YEAR, offset)
      c.set(Calendar.HOUR_OF_DAY, hour) // garde l'heure murale même en cas de changement d'heure
      c.set(Calendar.MINUTE, minute)
      if (c.timeInMillis <= now) continue
      // Calendar : dimanche = 1 … samedi = 7  →  lundi = 0 … dimanche = 6
      val weekday = (c.get(Calendar.DAY_OF_WEEK) + 5) % 7
      if (days.isEmpty() || weekday in days) return c.timeInMillis
    }
    return null
  }

  val isRepeating: Boolean get() = at == null

  fun toJson(): JSONObject = JSONObject().apply {
    put("id", id)
    put("hour", hour)
    put("minute", minute)
    put("days", JSONArray(days))
    if (at != null) put("at", at)
    put("payload", payload)
  }

  companion object {
    fun fromJson(o: JSONObject): AlarmSpec {
      val daysJson = o.optJSONArray("days") ?: JSONArray()
      return AlarmSpec(
        id = o.getString("id"),
        hour = o.getInt("hour"),
        minute = o.getInt("minute"),
        days = List(daysJson.length()) { daysJson.getInt(it) },
        at = if (o.has("at") && !o.isNull("at")) o.getLong("at") else null,
        payload = o.optJSONObject("payload") ?: JSONObject(),
      )
    }

    fun listFromJson(json: String): List<AlarmSpec> {
      val arr = JSONArray(json)
      return List(arr.length()) { fromJson(arr.getJSONObject(it)) }
    }

    fun listToJson(list: List<AlarmSpec>): String =
      JSONArray().apply { list.forEach { put(it.toJson()) } }.toString()
  }
}
