document.addEventListener("DOMContentLoaded", (function() {
    if (!getCookie("agreementAccepted")) {
        const referrer = document.referrer ? new URL(document.referrer).hostname : "直接访问";
        
        swal({
            title: "欢迎来到 quicer 的个人博客！",
            content: {
                element: "div",
                attributes: {
                    innerHTML: `
                        <img src='/img/avatar.webp' alt='<i class="fa-solid fa-earth-americas"></i>' 
                            style='width:80px; height:auto; border-radius: 50%; 
                            display: block; margin: 0 auto;' /><br />
                        您来自: ${referrer}<br />
                        使用深色模式会有更棒的视觉体验！<br />
                        请您在继续浏览本站之前，仔细阅读以下协议：<br />
                        1. <a href='/privacy/' title='隐私政策' data-pjax-state=''>隐私政策</a>&nbsp;&nbsp;
                        2. <a href='/cookies/' title='Cookies' data-pjax-state=''>Cookies</a>&nbsp;&nbsp;<br />
                        点击“同意”表示您已阅读并同意遵守以上协议。
                    `
                }
            },
            buttons: {
                cancel: "不同意",
                confirm: "同意"
            },
            text: "由于本站存在缓存问题，建议你在每次访问本站时按下Ctrl+F5强制刷新页面（或直接刷新），以确保你看到的是最新的内容。",
        }).then(willProceed => {
            willProceed ? setCookie("agreementAccepted", "true", 30) :
            window.history.length > 1 ? window.history.back() :
            window.location.href = "https://quicer.us.ci";// 替换为希望重定向的 URL
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
