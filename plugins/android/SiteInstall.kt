package com.ntacv.drift

import android.app.Activity
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ShortcutInfo
import android.content.pm.ShortcutManager
import android.graphics.drawable.Icon
import android.net.Uri
import android.os.Build
import java.security.MessageDigest

object SiteInstall {
  private fun webUri(url: String): Uri {
    val uri = Uri.parse(url)
    require(uri.scheme in listOf("http", "https") && !uri.host.isNullOrBlank() && uri.userInfo == null && url.none { it.isISOControl() }) { "Invalid site URL" }
    return uri
  }

  @Suppress("DEPRECATION")
  fun openBrowser(activity: Activity, url: String) {
    val uri = webUri(url)
    val generic = Intent(Intent.ACTION_VIEW, Uri.parse("https://example.org")).addCategory(Intent.CATEGORY_BROWSABLE)
    val browsers = activity.packageManager.queryIntentActivities(generic, PackageManager.MATCH_DEFAULT_ONLY)
      .filter { it.activityInfo.exported && it.activityInfo.packageName != activity.packageName }
      .map { Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE)
        .setComponent(ComponentName(it.activityInfo.packageName, it.activityInfo.name)) }
      .distinctBy { it.component }
    check(browsers.isNotEmpty()) { "No external browser is installed" }
    val chooser = Intent.createChooser(browsers.first(), "Install with another browser")
    if (browsers.size > 1) chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, browsers.drop(1).toTypedArray())
    activity.startActivity(chooser)
  }

  fun pin(activity: Activity, url: String, title: String) {
    check(Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) { "Shortcuts require Android 8 or later" }
    val uri = webUri(url)
    val manager = activity.getSystemService(ShortcutManager::class.java)
    check(manager != null && manager.isRequestPinShortcutSupported) { "This launcher does not support pinned shortcuts" }
    val link = Uri.Builder().scheme("drift").authority("open").appendQueryParameter("url", uri.toString()).build()
    val intent = Intent(Intent.ACTION_VIEW, link).setClassName(activity.packageName, "${activity.packageName}.MainActivity")
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    val id = MessageDigest.getInstance("SHA-256").digest(url.toByteArray()).joinToString("") { "%02x".format(it) }
    val label = title.filterNot { it.isISOControl() }.trim().take(80).ifBlank { uri.host ?: "Drift site" }
    val shortcut = ShortcutInfo.Builder(activity, "site-$id").setShortLabel(label).setIntent(intent)
      .setIcon(Icon.createWithResource(activity, activity.applicationInfo.icon)).build()
    check(manager.requestPinShortcut(shortcut, null)) { "The launcher refused the shortcut request" }
  }
}
