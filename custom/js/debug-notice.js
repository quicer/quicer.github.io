/* ============================================================
   进站调试提示弹窗
   ------------------------------------------------------------
   仅调试期间使用。恢复时删除 _config.Aether.yml extends.head 中：
     <script defer src="/custom/js/debug-notice.js"></script>
   ============================================================ */
(function () {
  function showDebugNotice() {
    if (document.getElementById('debug-notice-modal')) return;
    var overlay = document.createElement('div');
    overlay.id = 'debug-notice-modal';
    overlay.setAttribute('style',
      'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;' +
      'background:rgba(0,0,0,.55);'
    );
    var box = document.createElement('div');
    box.setAttribute('style',
      'max-width:360px;width:86%;box-sizing:border-box;' +
      'background:var(--efu-card-bg,#ffffff);color:var(--efu-fontcolor,#222);' +
      'border:1px solid var(--efu-card-border,#ccc);border-radius:14px;' +
      'padding:24px 22px;box-shadow:0 20px 60px rgba(0,0,0,.4);text-align:center;font-family:inherit;'
    );
    var title = document.createElement('div');
    title.textContent = '站点调试中';
    title.setAttribute('style', 'font-size:18px;font-weight:700;margin-bottom:12px;');
    var msg = document.createElement('div');
    msg.textContent = '现在站点正在调试，许多功能无法使用';
    msg.setAttribute('style', 'font-size:15px;line-height:1.6;margin-bottom:20px;opacity:.85;');
    var btn = document.createElement('button');
    btn.textContent = '我知道了';
    btn.setAttribute('style',
      'cursor:pointer;border:none;border-radius:10px;padding:9px 26px;font-size:15px;font-weight:600;' +
      'color:#fff;background:var(--efu-theme,#0084ff);'
    );
    btn.onclick = function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    };
    box.appendChild(title);
    box.appendChild(msg);
    box.appendChild(btn);
    overlay.appendChild(box);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    });
    document.body.appendChild(overlay);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showDebugNotice);
  } else {
    showDebugNotice();
  }

  // pjax 站内跳转后移除弹窗，避免停留并跨页面叠加
  document.addEventListener('pjax:complete', function () {
    var m = document.getElementById('debug-notice-modal');
    if (m && m.parentNode) m.parentNode.removeChild(m);
  });
})();
