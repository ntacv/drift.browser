package com.ntacv.drift

import android.graphics.Bitmap
import android.graphics.Rect
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.view.PixelCopy
import android.view.WindowManager
import java.io.File
import java.io.FileOutputStream
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.webkit.WebView
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.uimanager.UIManagerHelper
import java.lang.ref.WeakReference

class PageToolsModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  private var active: WeakReference<WebView>? = null
  private var generation = 0
  private var searching = false
  private var capture: Bitmap? = null
  private var captureFile: File? = null
  private var captureGeneration = 0

  private fun releaseCapture() {
    captureGeneration++
    capture?.recycle(); capture = null
    captureFile?.delete(); captureFile = null
  }

  @ReactMethod fun discardCapture() { UiThreadUtil.runOnUiThread { releaseCapture() } }

  @ReactMethod fun captureViewport(promise: Promise) = withPage(promise) { web ->
    releaseCapture()
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) throw IllegalStateException("Pixel capture requires Android 8 or later")
    val window = context.currentActivity?.window ?: throw IllegalStateException("No active window")
    if ((window.attributes.flags and WindowManager.LayoutParams.FLAG_SECURE) != 0) throw IllegalStateException("This window does not allow capture")
    val bounds = Rect()
    if (!web.getGlobalVisibleRect(bounds) || bounds.width() < 1 || bounds.height() < 1) throw IllegalStateException("No visible page")
    val location = IntArray(2)
    web.getLocationInWindow(location)
    val rect = Rect(location[0], location[1], location[0] + web.width, location[1] + web.height)
    if (web.width.toLong() * web.height > 16_000_000) throw IllegalStateException("Viewport too large to capture")
    val bitmap = Bitmap.createBitmap(web.width, web.height, Bitmap.Config.ARGB_8888)
    val token = captureGeneration
    PixelCopy.request(window, rect, bitmap, { status ->
      if (token != captureGeneration || active?.get() !== web) {
        bitmap.recycle(); promise.reject("E_CANCELLED", "Capture cancelled")
      } else if (status != PixelCopy.SUCCESS) {
        bitmap.recycle(); promise.reject("E_CAPTURE", "This page could not be captured")
      } else {
        try {
          val file = File.createTempFile("page-picker-", ".png", context.cacheDir)
          FileOutputStream(file).use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
          capture = bitmap; captureFile = file
          promise.resolve(Arguments.createMap().apply {
            putString("uri", android.net.Uri.fromFile(file).toString()); putInt("width", bitmap.width); putInt("height", bitmap.height)
          })
        } catch (error: Exception) { bitmap.recycle(); promise.reject("E_CAPTURE", error.message, error) }
      }
    }, Handler(Looper.getMainLooper()))
  }

  @ReactMethod fun sample(x: Double, y: Double, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      try {
        val bitmap = capture ?: throw IllegalStateException("Capture expired")
        require(x.isFinite() && y.isFinite() && x >= 0 && x <= 1 && y >= 0 && y <= 1)
        val color = bitmap.getPixel((x * bitmap.width).toInt().coerceAtMost(bitmap.width - 1), (y * bitmap.height).toInt().coerceAtMost(bitmap.height - 1))
        promise.resolve(String.format(java.util.Locale.ROOT, "#%06X", color and 0xFFFFFF))
      } catch (error: Exception) { promise.reject("E_CAPTURE", error.message, error) }
    }
  }

  override fun getName() = "PageTools"
  override fun initialize() { super.initialize(); instance = WeakReference(this) }
  override fun invalidate() { clear(); instance = null; super.invalidate() }
  @ReactMethod fun addListener(name: String) {}
  @ReactMethod fun removeListeners(count: Double) {}

  private fun emit(name: String, payload: WritableMap) {
    if (context.hasActiveReactInstance()) context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit(name, payload)
  }

  private fun webView(view: View?): WebView? {
    if (view is WebView) return view
    if (view is ViewGroup) for (index in 0 until view.childCount) webView(view.getChildAt(index))?.let { return it }
    return null
  }

  private fun clear() {
    releaseCapture()
    generation++
    searching = false
    active?.get()?.let { it.setFindListener(null); it.clearMatches() }
    active = null
  }

  @ReactMethod fun activate(tag: Int, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      try {
        clear()
        val root = UIManagerHelper.getUIManagerForReactTag(context, tag)?.resolveView(tag)
        val web = webView(root) ?: throw IllegalStateException("Page is not ready")
        active = WeakReference(web)
        promise.resolve(null)
      } catch (error: Exception) { promise.reject("E_PAGE", error.message, error) }
    }
  }

  @ReactMethod fun deactivate() { UiThreadUtil.runOnUiThread { clear() } }

  private fun withPage(promise: Promise, action: (WebView) -> Unit) {
    UiThreadUtil.runOnUiThread {
      try {
        val web = active?.get() ?: throw IllegalStateException("Page is not ready")
        if (!web.isShown || !web.isAttachedToWindow) throw IllegalStateException("Page is not visible")
        action(web)
      } catch (error: Exception) { promise.reject("E_PAGE", error.message, error) }
    }
  }

  @ReactMethod fun find(query: String, request: Int, promise: Promise) = withPage(promise) { web ->
    val current = ++generation
    searching = true
    web.setFindListener { index, total, done ->
      if (current == generation && done) emit("PageToolsMatches", Arguments.createMap().apply {
        putInt("request", request); putInt("index", if (total == 0) 0 else index + 1); putInt("total", total)
      })
    }
    if (query.isEmpty()) {
      web.clearMatches()
      emit("PageToolsMatches", Arguments.createMap().apply { putInt("request", request); putInt("index", 0); putInt("total", 0) })
    } else web.findAllAsync(query)
    promise.resolve(null)
  }

  @ReactMethod fun printPage(promise: Promise) = withPage(promise) { web ->
    val activity = context.currentActivity ?: throw IllegalStateException("No active activity")
    val manager = activity.getSystemService(android.content.Context.PRINT_SERVICE) as? android.print.PrintManager
      ?: throw IllegalStateException("Printing is unavailable")
    val title = web.title?.takeIf { it.isNotBlank() }?.take(120) ?: "Drift page"
    manager.print(title, web.createPrintDocumentAdapter(title), null)
    promise.resolve(null)
  }

  @ReactMethod fun next(forward: Boolean, promise: Promise) = withPage(promise) { it.findNext(forward); promise.resolve(null) }
  @ReactMethod fun closeFind() { UiThreadUtil.runOnUiThread {
    generation++; searching = false; active?.get()?.let { it.setFindListener(null); it.clearMatches() }
  } }

  companion object {
    private var instance: WeakReference<PageToolsModule>? = null
    fun handleKey(event: KeyEvent): Boolean {
      val module = instance?.get() ?: return false
      if (module.active?.get()?.isShown != true) return false
      val action = when {
        event.isCtrlPressed && event.keyCode == KeyEvent.KEYCODE_F -> "find"
        event.isCtrlPressed && event.keyCode == KeyEvent.KEYCODE_P -> "print"
        module.searching && event.keyCode == KeyEvent.KEYCODE_ESCAPE -> "close"
        module.searching && event.keyCode == KeyEvent.KEYCODE_ENTER -> if (event.isShiftPressed) "previous" else "next"
        else -> return false
      }
      if (event.action == KeyEvent.ACTION_DOWN && event.repeatCount == 0) module.emit("PageToolsAction", Arguments.createMap().apply { putString("action", action) })
      return true
    }
  }
}
