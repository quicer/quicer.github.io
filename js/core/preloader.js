export const initPreloader = (api) => {
  if (document.documentElement.dataset.solitudePreloader === "true") return;
  document.documentElement.dataset.solitudePreloader = "true";

  let loaded = false;
  let fallbackTimer;
  let slowTimer;
  let slowObserver = null;
  const loadingBox = () => document.getElementById("loading-box");
  const hintEl = () => document.getElementById("loading-hint");
  const slowEl = () => document.getElementById("loading-slow");

  // 进度条（Pace）是否仍在显示
  const paceDone = () => {
    const p = document.querySelector(".pace");
    if (!p) return true; // 进度条不存在 → 视为已完成
    return p.classList.contains("pace-inactive");
  };

  const sync = () => {
    const body = document.getElementById("body");
    if (body) body.classList.toggle("pace-done", loaded);
  };

  const end = () => {
    if (loaded) return;
    loadingBox()?.classList.add("loaded");
    hintEl()?.classList.remove("show");
    loaded = true;
    clearTimeout(fallbackTimer);
    clearTimeout(slowTimer);
    document.removeEventListener("click", dismissOnClick);
    if (slowObserver) slowObserver.disconnect();
    sync();
  };

  const showSlowIfNeeded = () => {
    if (!paceDone()) slowEl()?.classList.add("show");
  };

  const start = () => {
    loadingBox()?.classList.remove("loaded");
    loaded = false;
    hintEl()?.classList.add("show");
    slowEl()?.classList.remove("show");
    document.addEventListener("click", dismissOnClick);
    clearTimeout(fallbackTimer);
    clearTimeout(slowTimer);
    // 兜底：5 秒后无论如何关闭全屏加载动画
    fallbackTimer = setTimeout(end, 5000);
    // 5 秒后若顶部进度条（Pace）仍在显示，弹出“加载缓慢”液态玻璃提示
    slowTimer = setTimeout(showSlowIfNeeded, 5000);
    sync();
  };

  // 点击任意处提前关闭全屏加载动画与提示弹窗；顶部进度条（Pace）继续，直到真正加载完成才消失
  const dismissOnClick = () => end();
  document.addEventListener("click", dismissOnClick);

  api.endLoading = end;
  window.addEventListener("load", end, { once: true });
  window.addEventListener("pjax:send", start);
  document.addEventListener("pjax:complete", end);

  // 进度条（Pace）完成后，隐藏“加载缓慢”弹窗
  slowObserver = new MutationObserver(() => {
    if (paceDone()) slowEl()?.classList.remove("show");
  });
  const paceEl = document.querySelector(".pace");
  if (paceEl) slowObserver.observe(paceEl, { attributes: true, attributeFilter: ["class"] });

  // 点击“加载缓慢”弹窗本身也可关闭该提示
  slowEl()?.addEventListener("click", () => slowEl()?.classList.remove("show"));

  // 初始进入页面即展示“正在加载”提示
  hintEl()?.classList.add("show");
  fallbackTimer = setTimeout(end, 5000);
  slowTimer = setTimeout(showSlowIfNeeded, 5000);
  if (document.readyState === "complete") end();
};
