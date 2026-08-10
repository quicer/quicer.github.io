/*
 * 文章页浏览量填充（Umami 版）
 * ------------------------------------------------------------
 * 数据源：用户自有的 Umami Worker（Cloudflare 域名）
 *   https://hot.quicer-umami.indevs.in/page-views?path=/posts/xxx.html
 *
 * 设计要点：
 *  1) 从当前文章的 #umami-page-pv 元素读取 data-path；
 *  2) 优先用 localStorage 缓存立即显示，避免每次从转圈开始；
 *  3) 异步拉取 Worker 真实数据，成功后写入并刷新缓存；
 *  4) 6 秒超时兜底：若 Worker 未部署 / 网络异常，仍显示缓存值或 "—"；
 *  5) 监听 pjax:complete，文章切换后自动重新填充。
 */
(function () {
  var WORKER = "https://hot.quicer-umami.indevs.in/page-views";
  var TIMEOUT = 6000;

  function cacheKey(path) { return "umami_pv_" + path; }
  function getCache(path) {
    try { return localStorage.getItem(cacheKey(path)); } catch (e) { return null; }
  }
  function setCache(path, v) {
    try { localStorage.setItem(cacheKey(path), v); } catch (e) {}
  }

  function formatNumber(n) {
    if (typeof n !== "number") return n;
    if (n >= 10000) return (n / 10000).toFixed(1) + "w";
    if (n >= 1000) return (n / 1000).toFixed(1) + "k";
    return n.toString();
  }

  function load() {
    var el = document.getElementById("umami-page-pv");
    if (!el) return;
    var path = el.getAttribute("data-path");
    if (!path) return;

    // 先用缓存即时显示（仅当还是 spinner 时）
    var c = getCache(path);
    if (c && el.querySelector("i.fa-spin")) el.textContent = c;

    var done = false;
    var timer = setTimeout(function () {
      if (done) return;
      if (el.querySelector("i.fa-spin")) el.textContent = c ? c : "—";
    }, TIMEOUT);

    fetch(WORKER + "?path=" + encodeURIComponent(path), { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        if (typeof data.views !== "number") throw new Error("invalid payload");
        done = true;
        clearTimeout(timer);
        var text = formatNumber(data.views);
        el.textContent = text;
        setCache(path, text);
      })
      .catch(function () {
        // 拉取失败：交给超时兜底处理
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load);
  } else {
    load();
  }

  if (!window.__umamiPagePvPjaxBound) {
    window.__umamiPagePvPjaxBound = true;
    document.addEventListener("pjax:complete", function () {
      setTimeout(load, 200);
    });
  }
})();
