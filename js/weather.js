const STORAGE_KEY = "weatherUnit";
const DEFAULT_UNIT = "C";

const WEATHER_CODE_MAP = {
  0: { icon: "fa-sun", desc: "晴朗", animate: "spin-slow" },
  1: { icon: "fa-cloud-sun", desc: "大部晴朗" },
  2: { icon: "fa-cloud-sun", desc: "多云" },
  3: { icon: "fa-cloud", desc: "阴天" },
  45: { icon: "fa-smog", desc: "雾" },
  48: { icon: "fa-smog", desc: "雾凇" },
  51: { icon: "fa-cloud-rain", desc: "毛毛雨" },
  53: { icon: "fa-cloud-rain", desc: "中度毛毛雨" },
  55: { icon: "fa-cloud-showers-heavy", desc: "密集毛毛雨" },
  56: { icon: "fa-cloud-meatball", desc: "冻毛毛雨" },
  57: { icon: "fa-cloud-meatball", desc: "强冻毛毛雨" },
  61: { icon: "fa-cloud-rain", desc: "小雨" },
  63: { icon: "fa-cloud-rain", desc: "中雨" },
  65: { icon: "fa-cloud-showers-heavy", desc: "大雨" },
  66: { icon: "fa-icicles", desc: "冻雨" },
  67: { icon: "fa-icicles", desc: "强冻雨" },
  71: { icon: "fa-snowflake", desc: "小雪", animate: "spin-slow" },
  73: { icon: "fa-snowflake", desc: "中雪", animate: "spin-slow" },
  75: { icon: "fa-snowflake", desc: "大雪", animate: "spin-slow" },
  77: { icon: "fa-snowflake", desc: "雪粒", animate: "spin-slow" },
  80: { icon: "fa-cloud-showers-heavy", desc: "阵雨" },
  81: { icon: "fa-cloud-showers-heavy", desc: "强阵雨" },
  82: { icon: "fa-cloud-showers-water", desc: "暴雨" },
  85: { icon: "fa-snowflake", desc: "阵雪", animate: "spin-slow" },
  86: { icon: "fa-snowflake", desc: "强阵雪", animate: "spin-slow" },
  95: { icon: "fa-bolt", desc: "雷暴" },
  96: { icon: "fa-cloud-bolt", desc: "雷暴伴小冰雹" },
  99: { icon: "fa-cloud-bolt", desc: "雷暴伴大冰雹" }
};

const getWeatherInfo = (code) => WEATHER_CODE_MAP[code] || { icon: "fa-cloud", desc: "未知" };

const fetchJson = async (url, options = {}) => {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

const getStoredUnit = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "C" || stored === "F") return stored;
  } catch (e) {
    // localStorage 不可用则回退默认值
  }
  return DEFAULT_UNIT;
};

const setStoredUnit = (unit) => {
  try {
    localStorage.setItem(STORAGE_KEY, unit);
  } catch (e) {
    // 忽略写入失败
  }
};

let currentUnit = getStoredUnit();
let lastWeatherData = null;
let lastCity = "当前位置";
let unitToggleBound = false;

const getLocation = async (config) => {
  if (config.latitude && config.longitude) {
    return {
      lat: String(config.latitude).trim(),
      lon: String(config.longitude).trim(),
      city: config.city || "当前位置"
    };
  }

  try {
    const data = await fetchJson("https://ipapi.co/json/", { credentials: "omit" });
    if (data && data.latitude != null && data.longitude != null) {
      return {
        lat: String(data.latitude),
        lon: String(data.longitude),
        city: data.city || config.city || "当前位置"
      };
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[weather] IP 定位失败，使用默认城市", e);
  }

  return {
    lat: "22.5176",
    lon: "113.3927",
    city: config.city || "中山"
  };
};

const fetchWeather = async (lat, lon) => {
  const tempUnit = currentUnit === "F" ? "fahrenheit" : "celsius";
  const windUnit = currentUnit === "F" ? "mph" : "kmh";
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation,cloud_cover,pressure_msl,visibility` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max` +
    `&timezone=auto&temperature_unit=${tempUnit}&windspeed_unit=${windUnit}`;
  return fetchJson(url);
};

const formatTemp = (value) => `${Math.round(value)}${currentUnit === "F" ? "℉" : "℃"}`;
const formatShortTemp = (value) => `${Math.round(value)}${currentUnit === "F" ? "℉" : "℃"}`;

const getWeekday = (dateStr) => {
  const date = new Date(dateStr);
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return weekdays[date.getDay()];
};

const updateUnitToggleUI = () => {
  const modal = document.getElementById("weather-modal");
  if (!modal) return;
  const btnC = modal.querySelector(".weather-unit-c");
  const btnF = modal.querySelector(".weather-unit-f");
  if (btnC) btnC.classList.toggle("active", currentUnit === "C");
  if (btnF) btnF.classList.toggle("active", currentUnit === "F");
};

const renderIcon = (el, code) => {
  if (!el) return;
  const info = getWeatherInfo(code);
  el.className = `weather-modal-icon fas ${info.icon}`;
  el.dataset.animate = info.animate || "";
};

const updateWeatherUI = (data, city) => {
  lastWeatherData = data;
  lastCity = city;

  const current = data.current;
  const daily = data.daily;
  const info = getWeatherInfo(current.weather_code);
  const iconClass = `fas ${info.icon}`;
  const temp = Math.round(current.temperature_2m);
  const apparent = Math.round(current.apparent_temperature);
  const humidity = current.relative_humidity_2m;
  const wind = current.wind_speed_10m;
  const precipitation = current.precipitation ?? 0;
  const cloudCover = current.cloud_cover ?? 0;
  const pressure = current.pressure_msl ?? 0;
  const visibility = current.visibility ?? 0;
  const uv = daily.uv_index_max?.[0] ?? 0;
  const rainProb = daily.precipitation_probability_max?.[0] ?? 0;
  const maxTemp = Math.round(daily.temperature_2m_max[0]);
  const minTemp = Math.round(daily.temperature_2m_min[0]);

  const capsule = document.getElementById("nav-weather");
  const iconEl = capsule?.querySelector(".weather-icon");
  const summaryEl = capsule?.querySelector(".weather-summary");
  if (iconEl) {
    iconEl.className = `weather-icon ${iconClass}`;
    iconEl.dataset.animate = info.animate || "";
  }
  if (summaryEl) summaryEl.textContent = `${temp}${currentUnit === "F" ? "℉" : "℃"} ${info.desc}`;

  const modal = document.getElementById("weather-modal");
  if (!modal) return;

  const modalIcon = modal.querySelector(".weather-modal-icon");
  renderIcon(modalIcon, current.weather_code);

  const setText = (sel, text) => {
    const el = modal.querySelector(sel);
    if (el) el.textContent = text;
  };

  setText(".weather-modal-temp", formatTemp(temp));
  setText(".weather-modal-desc", info.desc);
  setText(".weather-apparent", formatTemp(apparent));
  setText(".weather-humidity", `${humidity}%`);
  setText(".weather-cloud", `${cloudCover}%`);
  setText(".weather-wind", `${wind} ${currentUnit === "F" ? "mph" : "km/h"}`);
  setText(".weather-rain-prob", `${rainProb}%`);
  setText(".weather-precipitation", `${precipitation} mm`);
  setText(".weather-uv", `${uv}`);
  setText(".weather-visibility", `${Math.round(visibility / 1000)} km`);
  setText(".weather-pressure", `${Math.round(pressure)} hPa`);
  setText(".weather-temp-max", formatTemp(maxTemp));
  setText(".weather-temp-min", formatTemp(minTemp));
  setText(".weather-city", city);

  updateUnitToggleUI();
  renderForecast(modal, daily);
};

const renderForecast = (modal, daily) => {
  const listEl = modal.querySelector(".weather-forecast-list");
  if (!listEl || !daily?.time) return;

  const count = Math.min(5, daily.time.length);
  listEl.innerHTML = "";

  for (let i = 0; i < count; i++) {
    const code = daily.weather_code[i];
    const info = getWeatherInfo(code);
    const max = Math.round(daily.temperature_2m_max[i]);
    const min = Math.round(daily.temperature_2m_min[i]);
    const date = daily.time[i];
    const weekday = i === 0 ? "今天" : getWeekday(date);

    const item = document.createElement("div");
    item.className = "weather-forecast-item";
    item.innerHTML = `
      <span class="weather-forecast-day">${weekday}</span>
      <i class="weather-forecast-icon fas ${info.icon}" data-animate="${info.animate || ""}"></i>
      <span class="weather-forecast-temp">${formatShortTemp(max)} / ${formatShortTemp(min)}</span>
    `;
    listEl.appendChild(item);
  }
};

const refreshWeatherWithUnit = async () => {
  if (!lastWeatherData) return;
  const config = window.Solitude?.config?.weather;
  if (!config) return;
  try {
    const { lat, lon } = await getLocation(config);
    const data = await fetchWeather(lat, lon);
    updateWeatherUI(data, lastCity);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[weather] 切换单位后刷新失败", e);
  }
};

const toggleUnit = (unit) => {
  if (unit === currentUnit) return;
  currentUnit = unit;
  setStoredUnit(unit);
  refreshWeatherWithUnit();
};

const showWeatherModal = () => {
  const modal = document.getElementById("weather-modal");
  if (modal) modal.classList.add("show");
};

const hideWeatherModal = () => {
  const modal = document.getElementById("weather-modal");
  if (modal) modal.classList.remove("show");
};

const setWeatherError = (message) => {
  const capsule = document.getElementById("nav-weather");
  const summaryEl = capsule?.querySelector(".weather-summary");
  if (summaryEl) summaryEl.textContent = message;
};

const bindUnitToggle = () => {
  if (unitToggleBound) return;
  unitToggleBound = true;
  document.addEventListener("click", (e) => {
    if (e.target.closest(".weather-unit-c")) {
      e.stopPropagation();
      toggleUnit("C");
    }
    if (e.target.closest(".weather-unit-f")) {
      e.stopPropagation();
      toggleUnit("F");
    }
  });
};

export const initWeather = async () => {
  const config = window.Solitude?.config?.weather;
  if (!config || !config.enable) return;

  // 每次初始化时从 localStorage 同步当前单位
  currentUnit = getStoredUnit();
  bindUnitToggle();

  try {
    const { lat, lon, city } = await getLocation(config);
    const data = await fetchWeather(lat, lon);
    updateWeatherUI(data, city);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[weather] 天气加载失败", e);
    setWeatherError("天气加载失败");
  }
};

export const handleWeatherClick = () => {
  showWeatherModal();
};

export const hideWeatherModalAction = () => {
  hideWeatherModal();
};
