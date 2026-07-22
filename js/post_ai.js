import { Solitude } from "./core/api.js";

class AIPostRenderer {
  static ANIMATION_DELAY_MS = 40; // 每个字符之间的延迟（单位：ms）
  static AI_EXPLANATION_SELECTOR = ".ai-explanation"; // 解释容器选择器
  static AI_TAG_SELECTOR = ".ai-tag"; // 标签选择器

  constructor() {
    this.startTextAnimation = this.startTextAnimation.bind(this);
    this.animationFrame = null;
    this.fragment = null;
    this.isAnimating = false; // 是否正在执行动画
    this.isDeleting = false; // 是否处于删除阶段
    this.initialized = false; // 防止 init() 重复绑定 DOMContentLoaded
  }

  init() {
    // PJAX 导航后需要重新 initialize，否则会卡在"拼命加载中..."
    // 因为单例的 explanationElement 仍指向已被移除的旧 DOM。
    // 若上一次动画尚未结束（理论上 lifecycle.disposePage 已 cancel，这里兜底），先取消。
    if (this.isAnimating) this.cancel();
    if (document.readyState === "loading") {
      // 首次加载：只绑定一次 DOMContentLoaded
      if (!this.initialized) {
        this.initialized = true;
        document.addEventListener("DOMContentLoaded", this.initialize.bind(this), { once: true });
      }
    } else {
      // PJAX 后：每次都重新 initialize，重新缓存新页面的 DOM 元素
      this.initialize();
    }
  }

  initialize() {
    this.cacheElements();
    if (this.validateContent()) {
      this.renderAIContent();
    }
  }

  cacheElements() {
    this.refs = new WeakMap();
    this.refs.set(document, {
      explanationElement: document.querySelector(AIPostRenderer.AI_EXPLANATION_SELECTOR),
      tagElement: document.querySelector(AIPostRenderer.AI_TAG_SELECTOR)
    });
    const { explanationElement, tagElement } = this.refs.get(document) || {};
    this.explanationElement = explanationElement;
    this.tagElement = tagElement;
  }

  validateContent() {
    return (
      this.explanationElement &&
      this.tagElement &&
      this.aiContent.length &&
      !this.isAnimating
    );
  }

  renderAIContent() {
    this.prepareAnimation();
    // 延迟3秒后，开始真正执行删除和打字动画
    this.timeoutId = setTimeout(() => {
      this.timeoutId = null;
      if (!this.explanationElement || !this.tagElement) return;
      this.explanationElement.style.display = "block"; // 显示解释容器
      this.explanationElement.classList.add("fast-blink"); // 开始快闪
      this.animationFrame = requestAnimationFrame(() =>
        this.startTextAnimation(0)
      );
    }, 3000);
  }

  prepareAnimation() {
    this.isAnimating = true;
    this.isDeleting = true; // 初始化设为删除模式
    this.tagElement.classList.add("loadingAI");
    // 注意这里不加 fast-blink，保持3000ms期间慢闪
  }

  startTextAnimation(index) {
    if (this.isDeleting) {
      // 删除阶段
      const currentText = this.explanationElement.textContent;
      if (currentText.length > 0) {
        this.explanationElement.textContent = currentText.slice(0, -1); // 删除最后一个字
        this.timeoutId = setTimeout(() => {
          this.timeoutId = null;
          this.animationFrame = requestAnimationFrame(() =>
            this.startTextAnimation(index)
          );
        }, AIPostRenderer.ANIMATION_DELAY_MS);
      } else {
        this.isDeleting = false; // 删除完成，开始打字
        this.startTextAnimation(0);
      }
    } else {
      // 打字阶段
      if (index >= this.aiContent.length) {
        this.completeAnimation(); // 打字完成
      } else {
        this.explanationElement.textContent += this.aiContent[index]; // 添加下一个字符
        this.timeoutId = setTimeout(() => {
          this.timeoutId = null;
          this.animationFrame = requestAnimationFrame(() =>
            this.startTextAnimation(index + 1)
          );
        }, AIPostRenderer.ANIMATION_DELAY_MS);
      }
    }
  }

  completeAnimation() {
    cancelAnimationFrame(this.animationFrame);
    this.animationFrame = null;
    this.isAnimating = false;
    this.tagElement.classList.remove("loadingAI");
    this.explanationElement.classList.remove("fast-blink"); // 打字完成后恢复慢闪
    const event = new CustomEvent("aiRenderComplete", {
      detail: { element: this.explanationElement }
    });
    document.dispatchEvent(event);
  }

  // main.js 在 PJAX 离开页面时通过 lifecycle.add(() => ai.cancel()) 调用
  cancel() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.isAnimating = false;
    this.tagElement?.classList.remove("loadingAI");
    this.explanationElement?.classList.remove("fast-blink");
  }

  get aiContent() {
    // Solitude.page 由 core/api.js 注入，从 <template id="config-diff"> 解析得到
    return Solitude.page?.ai_text || "";
  }
}

// 单例模式，避免重复初始化
const aiPostRenderer = (() => {
  let instance;
  return () => {
    if (!instance) {
      instance = new AIPostRenderer();
      instance.init();
    }
    return instance;
  };
})();

// 初始化
const ai = aiPostRenderer();

export { ai };
export default ai;
