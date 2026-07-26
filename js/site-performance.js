/*
 * 站点性能卡片
 * ------------------------------------------------------------
 * 功能：实时心跳折线图、页面加载时间、JS 堆内存占用。
 * 数据全部来自浏览器 Performance API，无需后端接口。
 */
(function () {
  'use strict';

  var CHART_POINTS = 40;
  var SAMPLE_INTERVAL = 250;
  var SVG_WIDTH = 100;
  var SVG_HEIGHT = 30;

  var heartbeatValue = document.getElementById('perf-heartbeat-value');
  var heartbeatLine = document.getElementById('perf-heartbeat-line');
  var loadValue = document.getElementById('perf-load-value');
  var memoryValue = document.getElementById('perf-memory-value');

  if (!heartbeatValue || !heartbeatLine || !loadValue || !memoryValue) return;

  var data = new Array(CHART_POINTS).fill(SAMPLE_INTERVAL);
  var targetData = data.slice();
  var lastTick = performance.now();
  var nextTick = lastTick + SAMPLE_INTERVAL;

  function formatLoad(ms) {
    if (!ms || ms <= 0) return '—';
    if (ms < 1000) return Math.round(ms) + ' MS';
    return (ms / 1000).toFixed(2) + ' S';
  }

  function formatMemory(bytes) {
    if (!bytes || bytes <= 0) return '—';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function updateLoadTime() {
    var nav = null;
    try {
      var entries = performance.getEntriesByType && performance.getEntriesByType('navigation');
      if (entries && entries.length) nav = entries[0];
    } catch (e) {}

    var ms = 0;
    if (nav && nav.loadEventEnd && nav.loadEventEnd > 0) {
      ms = nav.loadEventEnd - (nav.startTime || 0);
    } else if (window.performance && window.performance.timing) {
      var t = window.performance.timing;
      if (t.loadEventEnd && t.loadEventEnd > 0 && t.loadEventEnd > t.navigationStart) {
        ms = t.loadEventEnd - t.navigationStart;
      }
    }
    loadValue.textContent = formatLoad(ms);
  }

  function updateMemory() {
    var mem = null;
    if (window.performance && window.performance.memory) {
      mem = window.performance.memory;
    }
    memoryValue.textContent = mem ? formatMemory(mem.usedJSHeapSize) : '—';
  }

  function updateChart(points) {
    var min = Math.min.apply(null, points);
    var max = Math.max.apply(null, points);
    var range = Math.max(max - min, SAMPLE_INTERVAL);
    var step = SVG_WIDTH / (CHART_POINTS - 1);

    var coords = points.map(function (val, i) {
      var ratio = 1 - (val - min) / range;
      var y = Math.max(1, Math.min(SVG_HEIGHT - 1, ratio * SVG_HEIGHT));
      return (i * step).toFixed(2) + ',' + y.toFixed(2);
    }).join(' ');

    heartbeatLine.setAttribute('points', coords);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function tick() {
    var now = performance.now();

    if (now >= nextTick) {
      var delta = now - lastTick;
      lastTick = now;
      nextTick = now + SAMPLE_INTERVAL;

      // 推进数据：上一目标成为当前数据，再左移一位加入新 delta
      data = targetData.slice();
      targetData = data.slice(1).concat(delta);
    }

    var t = Math.min(1, (now - lastTick) / SAMPLE_INTERVAL);
    var current = new Array(CHART_POINTS);
    for (var i = 0; i < CHART_POINTS; i++) {
      current[i] = lerp(data[i], targetData[i], t);
    }

    heartbeatValue.textContent = Math.round(current[CHART_POINTS - 1]);
    updateChart(current);

    requestAnimationFrame(tick);
  }

  function init() {
    updateLoadTime();
    updateMemory();
    lastTick = performance.now();
    nextTick = lastTick + SAMPLE_INTERVAL;
    targetData = data.slice(1).concat(SAMPLE_INTERVAL);
    requestAnimationFrame(tick);

    // DOMContentLoaded 时 loadEventEnd 可能还没产生，等 window.load 后再取一次
    if (document.readyState !== 'complete') {
      window.addEventListener('load', updateLoadTime, { once: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // pjax 页面切换后刷新加载时间与内存（心跳保持运行）
  if (!window.__sitePerformancePjaxBound) {
    window.__sitePerformancePjaxBound = true;
    document.addEventListener('pjax:complete', function () {
      updateLoadTime();
      updateMemory();
    });
  }
})();
