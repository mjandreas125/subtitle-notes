package ee.subtitlenotes.app

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Intent
import android.os.Build
import android.os.Bundle
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val channelName = "ee.subtitlenotes.app/selection"
    private val companionChannelName = "ee.subtitlenotes.app/companion"
    private var pendingText: String? = null
    private var pendingPairCode: String? = null
    private var channel: MethodChannel? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        pendingText = textFrom(intent)
        pendingPairCode = pairCodeFrom(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        textFrom(intent)?.let { text ->
            pendingText = text
            channel?.invokeMethod("incomingText", text)
        }
        pairCodeFrom(intent)?.let { code ->
            pendingPairCode = code
            channel?.invokeMethod("incomingPairCode", code)
        }
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        channel = MethodChannel(flutterEngine.dartExecutor.binaryMessenger, channelName)
        channel?.setMethodCallHandler { call, result ->
            when (call.method) {
                "takeInitialText" -> {
                    result.success(pendingText)
                    pendingText = null
                }
                "takeInitialPairCode" -> {
                    result.success(pendingPairCode)
                    pendingPairCode = null
                }
                else -> result.notImplemented()
            }
        }
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, companionChannelName)
            .setMethodCallHandler { call, result ->
                try {
                    when (call.method) {
                        "syncCompanionContent" -> {
                            // Writing the companion file and refreshing every
                            // home-screen widget takes long enough to be seen
                            // as a stutter if it runs on the main thread — and
                            // it always ran right as a card was animating away.
                            val cards = call.argument<List<Any>>("cards") ?: emptyList()
                            Thread {
                                try {
                                    CompanionStore.save(this, cards)
                                    SubtitleNotesWidgetProvider.updateAll(this)
                                } catch (_: Exception) {
                                    // The widget is a nicety; never let it
                                    // surface as an error in the app.
                                }
                            }.start()
                            result.success(true)
                        }
                        "setLockWallpaper" -> {
                            val word = call.argument<String>("word").orEmpty()
                            val translation = call.argument<String>("translation").orEmpty()
                            if (word.isBlank() || translation.isBlank()) {
                                result.error("empty_card", "Choose a saved card first.", null)
                            } else {
                                WallpaperRenderer.apply(this, word, translation)
                                result.success(true)
                            }
                        }
                        "pinWidget" -> result.success(requestPinWidget())
                        else -> result.notImplemented()
                    }
                } catch (error: Exception) {
                    result.error("native_action_failed", error.message, null)
                }
            }
    }

    /**
     * Asks the launcher to place the widget. Returns false when the launcher
     * does not support pinning, so the UI can fall back to written
     * instructions instead of claiming something happened.
     */
    private fun requestPinWidget(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return false
        val manager = getSystemService(AppWidgetManager::class.java) ?: return false
        if (!manager.isRequestPinAppWidgetSupported) return false
        val provider = ComponentName(this, SubtitleNotesWidgetProvider::class.java)
        return manager.requestPinAppWidget(provider, null, null)
    }

    /**
     * Reads the pairing code out of a scanned `subtitlenotes://pair?code=…`
     * link. Anything that is not a plausible code is ignored rather than
     * handed to the UI.
     */
    private fun pairCodeFrom(intent: Intent?): String? {
        if (intent?.action != Intent.ACTION_VIEW) return null
        val code = intent.data?.getQueryParameter("code")?.trim()?.uppercase()
        return code?.takeIf { Regex("^[A-Z0-9]{6,12}$").matches(it) }
    }

    private fun textFrom(intent: Intent?): String? {
        if (intent == null) return null
        val text = when (intent.action) {
            Intent.ACTION_PROCESS_TEXT -> intent.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT)
            Intent.ACTION_SEND -> intent.getCharSequenceExtra(Intent.EXTRA_TEXT)
            else -> null
        }?.toString()?.trim()
        return text?.takeIf { it.isNotEmpty() }
    }
}
