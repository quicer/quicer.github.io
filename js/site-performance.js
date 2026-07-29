/*
 * 站点性能卡片
 * ------------------------------------------------------------
 * 功能：实时心跳折线图、页面加载时间、JS 堆内存占用。
 * 数据全部来自浏览器 Performance API，无需后端接口。
 */
(function () {
  'use strict';

  var CHART_POINTS = 40;
  var SAMPLE_INTERVAL = 150;
  var SVG_WIDTH = 100;
  var SVG_HEIGHT = 30;

  var heartbeatValue = document.getElementById('perf-heartbeat-value');
  var heartbeatLine = document.getElementById('perf-heartbeat-line');
  var loadValue = document.getElementById('perf-load-value');
  var memoryValue = document.getElementById('perf-memory-value');

  if (!heartbeatValue || !heartbeatLine || !loadValue || !memoryValue) return;

  var data = new Array(CHART_POINTS).fill(SAMPLE_INTERVAL);
  var lastSampleTime = performance.now();
  var nextSampleTime = lastSampleTime + SAMPLE_INTERVAL;
  var rafId = null;

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

  function updateChart(phase) {
    var min = Math.min.apply(null, data);
    var max = Math.max.apply(null, data);
    var range = Math.max(max - min, SAMPLE_INTERVAL);
    var step = SVG_WIDTH / (CHART_POINTS - 1);

    var coords = [];
    for (var i = 0; i < CHART_POINTS; i++) {
      var ratio = 1 - (data[i] - min) / range;
      var y = Math.max(1, Math.min(SVG_HEIGHT - 1, ratio * SVG_HEIGHT));
      // x 整体向左滚动 phase * step，采样间平滑平移，不再跳变
      var x = SVG_WIDTH - ((CHART_POINTS - 1 - i) + phase) * step;
      coords.push(x.toFixed(2) + ',' + y.toFixed(2));
    }

    heartbeatLine.setAttribute('points', coords.join(' '));
  }

  function tick() {
    var now = performance.now();

    // 到采样点：整组数据左移一位，右侧推入新的 delta
    while (now >= nextSampleTime) {
      var delta = nextSampleTime - lastSampleTime;
      lastSampleTime = nextSampleTime;
      nextSampleTime += SAMPLE_INTERVAL;
      data.shift();
      data.push(delta || SAMPLE_INTERVAL);
    }

    var phase = Math.min(1, (now - lastSampleTime) / SAMPLE_INTERVAL);
    heartbeatValue.textContent = Math.round(data[CHART_POINTS - 1]);
    updateChart(phase);

    rafId = requestAnimationFrame(tick);
  }

  // 页面切到后台时暂停心跳动画，回到前台再恢复，避免后台空耗 CPU/内存
  function startLoop() {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(tick);
  }

  function stopLoop() {
    if (rafId === null) return;
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  function init() {
    updateLoadTime();
    updateMemory();
    lastSampleTime = performance.now();
    nextSampleTime = lastSampleTime + SAMPLE_INTERVAL;
    startLoop();

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

  // 后台暂停：标签页不可见时停止 requestAnimationFrame，回到前台恢复
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stopLoop();
    else startLoop();
  });
})();
