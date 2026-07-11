document.addEventListener("DOMContentLoaded", () => {
  initializeCard();
  cardHistory();
});

document.addEventListener("pjax:complete", () => {
  initializeCard();
  cardHistory();
});

function initializeCard() {
  cardTimes();
  cardRefreshTimes();
}

let year,
  month,
  week,
  date,
  dates,
  weekStr,
  monthStr,
  asideTime,
  asideDay,
  asideDayNum,
  animalYear,
  ganzhiYear,
  lunarMon,
  lunarDay;
const now = new Date();

function cardRefreshTimes() {
  const e = document.getElementById("card-widget-schedule");
  // 元素不存在直接终止
  if (!e) return;
  asideDay = (now - asideTime) / 1e3 / 60 / 60 / 24;
  const pBarYear = e.querySelector("#pBar_year");
  const pSpanYear = e.querySelector("#p_span_year");
  const yearRemain = e.querySelector(".schedule-r0 .schedule-d1 .aside-span2");
  const pBarMonth = e.querySelector("#pBar_month");
  const pSpanMonth = e.querySelector("#p_span_month");
  const monthRemain = e.querySelector(".schedule-r1 .schedule-d1 .aside-span2");
  const pBarWeek = e.querySelector("#pBar_week");
  const pSpanWeek = e.querySelector("#p_span_week");
  const weekRemain = e.querySelector(".schedule-r2 .schedule-d1 .aside-span2");

  // 逐个判断DOM存在再赋值
  pBarYear && (pBarYear.value = asideDay);
  pSpanYear && (pSpanYear.innerHTML = ((asideDay / 365) * 100).toFixed(1) + "%");
  yearRemain && (yearRemain.innerHTML = `还剩<a> ${(365 - asideDay).toFixed(0)} </a>天`);
  pBarMonth && (pBarMonth.value = date);
  pBarMonth && (pBarMonth.max = dates);
  pSpanMonth && (pSpanMonth.innerHTML = ((date / dates) * 100).toFixed(1) + "%");
  monthRemain && (monthRemain.innerHTML = `还剩<a> ${dates - date} </a>天`);
  pBarWeek && (pBarWeek.value = week === 0 ? 7 : week);
  pSpanWeek && (pSpanWeek.innerHTML = (((week === 0 ? 7 : week) / 7) * 100).toFixed(1) + "%");
  weekRemain && (weekRemain.innerHTML = `还剩<a> ${7 - (week === 0 ? 7 : week)} </a>天`);
}

function cardTimes() {
  year = now.getFullYear();
  month = now.getMonth();
  week = now.getDay();
  date = now.getDate();

  const e = document.getElementById("card-widget-calendar");
  if (!e) return;
  const isLeapYear =
    (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  weekStr = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][week];
  const monthData = [
    { month: "1月", days: 31 },
    { month: "2月", days: isLeapYear ? 29 : 28 },
    { month: "3月", days: 31 },
    { month: "4月", days: 30 },
    { month: "5月", days: 31 },
    { month: "6月", days: 30 },
    { month: "7月", days: 31 },
    { month: "8月", days: 31 },
    { month: "9月", days: 30 },
    { month: "10月", days: 31 },
    { month: "11月", days: 30 },
    { month: "12月", days: 31 },
  ];
  monthStr = monthData[month].month;
  dates = monthData[month].days;

  const t = (week + 8 - (date % 7)) % 7;
  let n = "",
    d = false,
    s = 7 - t;
  const o =
    (dates - s) % 7 === 0
      ? Math.floor((dates - s) / 7) + 1
      : Math.floor((dates - s) / 7) + 2;
  const c = e.querySelector("#calendar-main");
  const l = e.querySelector("#calendar-date");

  if (l) l.style.fontSize = ["64px", "48px", "36px"][Math.min(o - 3, 2)];

  if (c) {
    for (let i = 0; i < o; i++) {
      if (!c.querySelector(`.calendar-r${i}`)) {
        c.innerHTML += `<div class='calendar-r${i}'></div>`;
      }
      for (let j = 0; j < 7; j++) {
        if (i === 0 && j === t) {
          n = 1;
          d = true;
        }
        const r = n === date ? " class='now'" : "";
        const rowDom = c.querySelector(`.calendar-r${i}`);
        if (rowDom && !rowDom.querySelector(`.calendar-d${j} a`)) {
          rowDom.innerHTML += `<div class='calendar-d${j}'><a${r}>${n}</a></div>`;
        }
        if (n >= dates) {
          n = "";
          d = false;
        }
        if (d) {
          n += 1;
        }
      }
    }
  }

  const lunarDate = chineseLunar.solarToLunar(new Date(year, month, date));
  animalYear = chineseLunar.format(lunarDate, "A");
  ganzhiYear = chineseLunar.format(lunarDate, "T").slice(0, -1);
  lunarMon = chineseLunar.format(lunarDate, "M");
  lunarDay = chineseLunar.format(lunarDate, "d");

  const newYearDate = new Date("2027/06/25 00:00:00");
  const daysUntilNewYear = Math.floor(
    (newYearDate - now) / 1e3 / 60 / 60 / 24
  );
  asideTime = new Date(`${new Date().getFullYear()}/01/01 00:00:00`);
  asideDay = (now - asideTime) / 1e3 / 60 / 60 / 24;
  asideDayNum = Math.floor(asideDay);
  const weekNum =
    week - (asideDayNum % 7) >= 0
      ? Math.ceil(asideDayNum / 7)
      : Math.ceil(asideDayNum / 7) + 1;

  const weekDom = e.querySelector("#calendar-week");
  const dateDom = e.querySelector("#calendar-date");
  const solarDom = e.querySelector("#calendar-solar");
  const lunarDom = e.querySelector("#calendar-lunar");
  const scheduleDaysDom = document.getElementById("schedule-days");

  weekDom && (weekDom.innerHTML = `第${weekNum}周&nbsp;${weekStr}`);
  dateDom && (dateDom.innerHTML = date.toString().padStart(2, "0"));
  solarDom && (solarDom.innerHTML = `${year}年${monthStr}&nbsp;第${asideDay.toFixed(0)}天`);
  lunarDom && (lunarDom.innerHTML = `${ganzhiYear}${animalYear}年&nbsp;${lunarMon}${lunarDay}`);
  scheduleDaysDom && (scheduleDaysDom.innerHTML = daysUntilNewYear);
}

async function cardHistory() {
  const historyContainer = document.getElementById('history-container');
  if (!historyContainer) return;

  const data = await fetchHistoryData();
  const html = data.map(item => `
      <div class="swiper-slide history_slide">
          <span class="history_slide_time">A.D.${item.year}</span>
          <span class="history_slide_link">${item.title}</span>
      </div>
  `).join('');

  const swiperWrapper = document.getElementById('history_container_wrapper');
  if (swiperWrapper) swiperWrapper.innerHTML = html;

  const swiperContainer = document.querySelector('.history_swiper-container');
  if (!swiperContainer || data.length === 0) return;

  // 修复Swiper loop警告：幻灯片少于2张关闭循环
  const swiperHistory = new Swiper(swiperContainer, {
      loop: data.length >= 2,
      direction: 'vertical',
      autoplay: {disableOnInteraction: true, delay: 5000},
      mousewheel: false,
  });

  historyContainer.onmouseenter = () => swiperHistory.autoplay.stop();
  historyContainer.onmouseleave = () => swiperHistory.autoplay.start();
}

async function fetchHistoryData() {
  const myDate = new Date();
  const month = `${myDate.getMonth() + 1}`.padStart(2, '0');
  const day = `${myDate.getDate()}`.padStart(2, '0');
  const formattedDate = `${month}${day}`;
  const historyDataUrl = `https://v2.xxapi.cn/api/history`;

  try {
      const response = await fetch(historyDataUrl);
      const result = await response.json();

      if (result.code === 200) {
          const data = result.data;
          const formattedData = Object.entries(data).map(([year, event]) => ({
              year: year.replace(/年$/, ''),
              title: event
          }));
          return formattedData;
      } else {
          console.error('Error fetching history data:', result.msg);
          return [];
      }
  } catch (error) {
      console.error('Fetch error:', error);
      return [];
  }
}