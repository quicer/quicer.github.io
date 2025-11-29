document.addEventListener("DOMContentLoaded", (function() {
    if (!getCookie("agreementAccepted")) {
        const referrer = document.referrer ? new URL(document.referrer).hostname : "直接访问本站 的";
        
        swal({
            title: "欢迎来到 quicer 的博客",
            content: {
                element: "div",
                attributes: {
                    innerHTML: `
                        <img src='https://bmgucnlcvqpnyjdy.public.blob.vercel-storage.com/quicer-ES8JhKFugh1xxUHFd1dEV4E1Rfv0n4.webp' alt='https://bmgucnlcvqpnyjdy.public.blob.vercel-storage.com/quicer-ES8JhKFugh1xxUHFd1dEV4E1Rfv0n4.webp' 
                            style='width:80px; height:auto; border-radius: 50%; 
                            display: block; margin: 0 auto;' /><br />
                        您是 ${referrer}<br /><br />
                        这里有关于学习、前端开发，竞赛等有趣的文章，更新频率正常为一月一篇（除特殊情况）。<br />
                        深色模式会有更棒的视觉效果哦~ <br /><br />
                        请您在继续浏览本站之前，仔细阅读以下协议：<br />
                        1. <a href='/privacy/' title='隐私协议' data-pjax-state=''>隐私协议</a>&nbsp;&nbsp;
                        2. <a href='/cookie/' title='cookies协议' data-pjax-state=''>Cookies</a>&nbsp;&nbsp;<br />
                        点击“同意”表示您已阅读并同意遵守以上协议，若点击“不同意”将退出本站。
                    `
                }
            },
            buttons: {
                cancel: "不同意",
                confirm: "同意"
            },
            text: "若未获取新内容请Ctrl+F5以清理浏览器缓存。"
        }).then(willProceed => {
            willProceed ? setCookie("agreementAccepted", "true", 30) :
            window.history.length > 1 ? window.history.back() :
            window.location.href = "https://quicer.js.cool/cookie/";// 替换为希望重定向的 URL
        });
    }

    function setCookie(name, value, days) {
        const date = new Date();
        date.setTime(date.getTime() + 24 * days * 60 * 60 * 1000); //添加30天的cookie
        const expires = "expires=" + date.toUTCString();
        document.cookie = name + "=" + value + ";" + expires + ";path=/";
    }

    function getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(";");

        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (" " === c.charAt(0)) c = c.substring(1, c.length);
            if (0 === c.indexOf(nameEQ)) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }
}));
