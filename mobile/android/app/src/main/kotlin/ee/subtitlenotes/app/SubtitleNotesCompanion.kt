package ee.subtitlenotes.app

import android.app.AlarmManager
import android.app.PendingIntent
import android.app.WallpaperManager
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.os.Build
import android.os.SystemClock
import android.widget.RemoteViews
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

internal data class CompanionCard(val word: String, val translation: String, val source: String)

internal object CompanionStore {
    private const val fileName = "subtitle_notes_companion.json"

    fun save(context: Context, values: List<Any>) {
        val cards = JSONArray()
        values.forEach { value ->
            val map = value as? Map<*, *> ?: return@forEach
            val word = map["word"]?.toString()?.trim().orEmpty()
            val translation = map["translation"]?.toString()?.trim().orEmpty()
            if (word.isNotEmpty() && translation.isNotEmpty()) {
                cards.put(JSONObject().apply {
                    put("word", word)
                    put("translation", translation)
                    put("source", map["source"]?.toString().orEmpty())
                })
            }
        }
        File(context.filesDir, fileName).writeText(JSONObject().put("cards", cards).toString())
    }

    fun random(context: Context): CompanionCard? {
        val file = File(context.filesDir, fileName)
        if (!file.exists()) return null
        val cards = JSONObject(file.readText()).optJSONArray("cards") ?: return null
        if (cards.length() == 0) return null
        val card = cards.optJSONObject((0 until cards.length()).random()) ?: return null
        return CompanionCard(card.optString("word"), card.optString("translation"), card.optString("source"))
    }
}

class SubtitleNotesWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        ids.forEach { update(context, manager, it) }
    }

    override fun onEnabled(context: Context) = updateAll(context)

    companion object {
        fun updateAll(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val component = ComponentName(context, SubtitleNotesWidgetProvider::class.java)
            val ids = manager.getAppWidgetIds(component)
            ids.forEach { update(context, manager, it) }
            WidgetRefreshSchedule.schedule(context, enabled = ids.isNotEmpty())
        }

        private fun update(context: Context, manager: AppWidgetManager, id: Int) {
            val card = CompanionStore.random(context)
            val view = RemoteViews(context.packageName, R.layout.subtitle_notes_widget)
            view.setTextViewText(R.id.widget_word, card?.word ?: "Your next phrase")
            view.setTextViewText(R.id.widget_translation, card?.translation ?: "Open Subtitle Notes to begin")
            view.setTextViewText(R.id.widget_source, card?.source?.takeIf { it.isNotBlank() } ?: "PERSONAL STUDY")
            val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
            val pending = PendingIntent.getActivity(context, 31, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            view.setOnClickPendingIntent(R.id.widget_root, pending)
            manager.updateAppWidget(id, view)
        }
    }
}

class WidgetRefreshReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val pending = goAsync()
        Thread {
            try {
                SubtitleNotesWidgetProvider.updateAll(context)
                CompanionStore.random(context)?.let { card ->
                    WallpaperRenderer.apply(context, card.word, card.translation)
                }
            } finally {
                pending.finish()
            }
        }.start()
    }
}

class LockScreenPhraseReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_SCREEN_OFF) return
        val card = CompanionStore.random(context) ?: return
        val pending = goAsync()
        Thread {
            try {
                WallpaperRenderer.apply(context, card.word, card.translation)
            } finally {
                pending.finish()
            }
        }.start()
    }
}

internal object WidgetRefreshSchedule {
    private const val action = "ee.subtitlenotes.app.REFRESH_WIDGET"
    private const val intervalMs = 5 * 60 * 1000L

    fun schedule(context: Context, enabled: Boolean) {
        val alarm = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, WidgetRefreshReceiver::class.java).setAction(action)
        val pending = PendingIntent.getBroadcast(
            context,
            942,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        if (!enabled) {
            alarm.cancel(pending)
            return
        }
        alarm.setAndAllowWhileIdle(
            AlarmManager.ELAPSED_REALTIME_WAKEUP,
            SystemClock.elapsedRealtime() + intervalMs,
            pending,
        )
    }
}

internal object WallpaperRenderer {
    // Matches lib/design/tokens.dart (dark palette): the lock screen is a study
    // card standing on its lip, not a poster with a glow behind it.
    private val ink = Color.rgb(0x10, 0x1A, 0x1E)
    private val surface = Color.rgb(0x18, 0x26, 0x2B)
    private val line = Color.rgb(0x2C, 0x41, 0x49)
    private val lip = Color.rgb(0x0A, 0x12, 0x15)
    private val textPrimary = Color.rgb(0xEA, 0xF3, 0xF0)
    private val textSecondary = Color.rgb(0x92, 0xA7, 0xAD)
    private val textMuted = Color.rgb(0x6B, 0x81, 0x88)
    private val green = Color.rgb(0x35, 0xBE, 0x58)

    fun apply(context: Context, word: String, translation: String) {
        val display = context.resources.displayMetrics
        val width = display.widthPixels
        val height = display.heightPixels
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(ink)

        val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        val gutter = width * .09f
        val cardLeft = gutter
        val cardRight = width - gutter
        val cardTop = height * .52f
        val cardBottom = height * .80f
        val radius = width * .07f
        val lipHeight = width * .018f

        // Lip first, then the face inset above it.
        paint.color = lip
        canvas.drawRoundRect(cardLeft, cardTop, cardRight, cardBottom + lipHeight, radius, radius, paint)
        paint.color = surface
        canvas.drawRoundRect(cardLeft, cardTop, cardRight, cardBottom, radius, radius, paint)
        paint.style = Paint.Style.STROKE
        paint.strokeWidth = width * .004f
        paint.color = line
        canvas.drawRoundRect(cardLeft, cardTop, cardRight, cardBottom, radius, radius, paint)
        paint.style = Paint.Style.FILL

        // Accent stripe down the leading edge, clipped to the card corner.
        canvas.save()
        val clip = android.graphics.Path().apply {
            addRoundRect(cardLeft, cardTop, cardRight, cardBottom, radius, radius, android.graphics.Path.Direction.CW)
        }
        canvas.clipPath(clip)
        paint.color = green
        canvas.drawRect(cardLeft, cardTop, cardLeft + width * .016f, cardBottom, paint)
        canvas.restore()

        val padding = gutter + width * .075f
        val textWidth = cardRight - padding - width * .05f

        paint.color = textMuted
        paint.textSize = width * .028f
        paint.letterSpacing = .1f
        paint.typeface = android.graphics.Typeface.create("sans-serif-medium", android.graphics.Typeface.BOLD)
        canvas.drawText("TODAY'S WORD", padding, cardTop + width * .11f, paint)

        paint.letterSpacing = -.01f
        paint.color = textPrimary
        paint.textSize = width * .095f
        paint.typeface = android.graphics.Typeface.create("sans-serif", android.graphics.Typeface.BOLD)
        val wordBottom = drawLines(canvas, word, paint, padding, cardTop + width * .245f, textWidth, width * .112f)

        paint.color = textSecondary
        paint.textSize = width * .048f
        paint.letterSpacing = 0f
        paint.typeface = android.graphics.Typeface.create("sans-serif", android.graphics.Typeface.NORMAL)
        drawLines(canvas, translation, paint, padding, wordBottom + width * .085f, textWidth, width * .068f)

        paint.color = textMuted
        paint.textSize = width * .026f
        paint.letterSpacing = .12f
        canvas.drawText("SUBTITLE NOTES", gutter, cardBottom + lipHeight + width * .09f, paint)

        val manager = WallpaperManager.getInstance(context)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            manager.setBitmap(bitmap, null, true, WallpaperManager.FLAG_LOCK)
        } else {
            manager.setBitmap(bitmap)
        }
    }

    /** Draws wrapped text and returns the baseline of the last line drawn. */
    private fun drawLines(canvas: Canvas, value: String, paint: Paint, x: Float, y: Float, maxWidth: Float, lineHeight: Float): Float {
        val words = value.trim().split(Regex("\\s+"))
        var line = ""
        var offset = 0f
        words.forEach { word ->
            val candidate = if (line.isEmpty()) word else "$line $word"
            if (paint.measureText(candidate) > maxWidth && line.isNotEmpty()) {
                canvas.drawText(line, x, y + offset, paint)
                offset += lineHeight
                line = word
            } else line = candidate
        }
        if (line.isNotEmpty()) canvas.drawText(line, x, y + offset, paint)
        return y + offset
    }
}
