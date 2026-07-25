/*
 * 站点访问量 / 访客数填充
 * ------------------------------------------------------------
 * 数据源：用户自有的 Umami Worker（Cloudflare 域名，稳定可达）
 *   https://hot.quicer-umami.indevs.in/stats  ->  { pv, uv }
 *
 * 设计要点：
 *  1) 优先用 localStorage 缓存立即显示，避免每次都从转圈开始；
 *  2) 异步拉取 Worker 真实数据，成功后写入并刷新缓存；
 *  3) 6 秒超时兜底：若 Worker 未部署 / 网络异常，仍显示缓存值或 "—"，
 *     绝不出现永久转圈的 spinner；
 *  4) 监听 pjax:complete，侧边栏被局部刷新后也能重新填充。
 */
(function () {
  var WORKER = "https://hot.quicer-umami.indevs.in/stats";
  var TIMEOUT = 6000;
  var IDS = ["site-stat-pv", "site-stat-uv"];

  function cacheKey(id) { return "site_stat_" + id; }
  function getCache(id) {
    try { return localStorage.getItem(cacheKey(id)); } catch (e) { return null; }
  }
  function setCache(id, v) {
    try { localStorage.setItem(cacheKey(id), v); } catch (e) {}
  }

  function fill(id, value) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = value;
  }

  // 已填过真实数据则缓存；否则（还在转圈）用缓存或占位兜底
  function showFallback(id) {
    var el = document.getElementById(id);
    if (!el) return;
    if (el.querySelector("i.fa-spin")) {
      var c = getCache(id);
      el.textContent = c ? c : "—";
    } else {
      setCache(id, el.textContent);
    }
  }

  function load() {
    // 先用缓存即时显示（仅当还是 spinner 时）
    IDS.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var c = getCache(id);
      if (c && el.querySelector("i.fa-spin")) el.textContent = c;
    });

    var done = false;
    var timer = setTimeout(function () {
      if (done) return;
      IDS.forEach(showFallback);
    }, TIMEOUT);

    fetch(WORKER, { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        if (typeof data.pv !== "number" || typeof data.uv !== "number") {
          throw new Error("invalid payload");
        }
        done = true;
        clearTimeout(timer);
        var pv = data.pv.toLocaleString();
        var uv = data.uv.toLocaleString();
        fill("site-stat-pv", pv);
        fill("site-stat-uv", uv);
        setCache("site-stat-pv", pv);
        setCache("site-stat-uv", uv);
      })
      .catch(function () {
        // 拉取失败：交给上面的超时兜底处理
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load);
  } else {
    load();
  }

  // 避免重复绑定
  if (!window.__siteStatsPjaxBound) {
    window.__siteStatsPjaxBound = true;
    document.addEventListener("pjax:complete", function () {
      setTimeout(load, 200);
    });
  }
})();
