document.addEventListener("DOMContentLoaded", initializeHot);
document.addEventListener("pjax:complete", initializeHot);

// ============================================================
//  今日热门（后端代理版）
//  前端只调用 Cloudflare Worker 地址，Umami Token 存在 Worker 的环境变量里，
//  不会出现在任何前端代码中，也不受 CORS 限制。
//  把下面的 WORKER_URL 改成你部署 Worker 后拿到的地址。
// ============================================================
const WORKER_URL = "https://hot.quicer-umami.indevs.in";
const RANK_DAYS = 1;   // 统计范围：1 = 今日热门，7 = 近 7 天，30 = 近 30 天
const TOP_N = 5;       // 最多展示几条

function initializeHot() {
    const container = document.getElementById("card-hotpost");
    if (!container) return;

    fetch(`${WORKER_URL}?days=${RANK_DAYS}&limit=${TOP_N}`)
        .then((r) => {
            if (!r.ok) throw new Error("HTTP " + r.status);
            return r.json();
        })
        .then((data) => renderHot(container, data))
        .catch((err) => {
            // Worker 获取失败（未部署 / 网络问题）时，回退到本地静态列表
            console.warn("[今日热门] 代理获取失败，回退到本地 data.json：", err);
            fetch("/hot/data.json")
                .then((r) => r.json())
                .then((d) => renderHot(container, d))
                .catch(() => {
                    container.innerHTML = '<div class="hot-post-empty">暂无热门数据</div>';
                });
        });
}

function renderHot(container, data) {
    container.innerHTML = "";
    if (!Array.isArray(data) || data.length === 0) {
        container.innerHTML = '<div class="hot-post-empty">暂无热门数据</div>';
        return;
    }
    // 防御：即使 Worker 返回多于 TOP_N 条（旧缓存/缺 limit 参数），前端也最多渲染 TOP_N 条
    data.slice(0, TOP_N).forEach((item, i) => {
        const rank = i + 1;
        const a = document.createElement("a");
        a.className = "hot-post-link";
        a.href = item.url;
        a.innerHTML = `<span class="post-rank rank-${rank === 1 ? "1" : "2"}">${rank}</span><div class="post-title-container"><span class="post-title">${item.title}</span></div>`;
        container.appendChild(a);
    });
}
