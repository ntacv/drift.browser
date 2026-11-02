package com.ntacv.drift

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
        module.searching && event.keyCode == KeyEvent.KEYCODE_ESCAPE -> "close"
        module.searching && event.keyCode == KeyEvent.KEYCODE_ENTER -> if (event.isShiftPressed) "previous" else "next"
        else -> return false
      }
      if (event.action == KeyEvent.ACTION_DOWN && event.repeatCount == 0) module.emit("PageToolsAction", Arguments.createMap().apply { putString("action", action) })
      return true
    }
  }
}
