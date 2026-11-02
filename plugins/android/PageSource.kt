package com.ntacv.drift

import android.webkit.CookieManager
import okhttp3.Call
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.HttpUrl.Companion.toHttpUrl
import java.util.concurrent.TimeUnit

class PageSource {
  @Volatile private var call: Call? = null
  @Volatile private var cancelled = false

  fun cancel() { cancelled = true; call?.cancel() }

  fun fetch(input: String, userAgent: String): Pair<String, String> {
    val deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(15)
    var url = input.toHttpUrl()
    require(url.username.isEmpty() && url.password.isEmpty()) { "URLs with embedded credentials are not supported" }
    repeat(6) { hop ->
      check(!cancelled) { "Request cancelled" }
      val remaining = deadline - System.nanoTime()
      check(remaining > 0) { "Source request timed out" }
      val client = OkHttpClient.Builder().followRedirects(false).followSslRedirects(false)
        .callTimeout(remaining, TimeUnit.NANOSECONDS).build()
      val request = Request.Builder().url(url).header("User-Agent", userAgent).header("Accept", "text/html,application/xhtml+xml")
      CookieManager.getInstance().getCookie(url.toString())?.let { request.header("Cookie", it) }
      val current = client.newCall(request.build())
      call = current
      if (cancelled) current.cancel()
      current.execute().use { response ->
        if (response.code in listOf(301, 302, 303, 307, 308)) {
          check(hop < 5) { "Too many redirects" }
          val next = url.resolve(response.header("Location") ?: error("Missing redirect location")) ?: error("Invalid redirect")
          check(next.username.isEmpty() && next.password.isEmpty()) { "Redirect credentials are not supported" }
          check(!(url.isHttps && !next.isHttps)) { "Insecure redirect refused" }
          url = next
        } else {
          check(response.isSuccessful) { "HTTP ${response.code}" }
          val body = response.body ?: error("Empty response")
          val type = body.contentType()
          check(type?.subtype == "html" || (type?.type == "application" && type.subtype == "xhtml+xml")) { "The response is not HTML" }
          val text = StringBuilder()
          val buffer = CharArray(8192)
          var bytes = 0
          body.charStream().use { reader ->
            while (true) {
              check(!cancelled) { "Request cancelled" }
              check(System.nanoTime() < deadline) { "Source request timed out" }
              val count = reader.read(buffer)
              if (count < 0) break
              val chunk = String(buffer, 0, count)
              bytes += chunk.toByteArray(Charsets.UTF_8).size
              check(bytes <= 5 * 1024 * 1024) { "HTML exceeds the 5 MiB source limit" }
              text.append(chunk)
            }
          }
          return Pair(url.toString(), text.toString())
        }
      }
    }
    error("Too many redirects")
  }
}
