const STORAGE_KEY = "weatherUnit";
const DEFAULT_UNIT = "C";

// 和风天气 condition.code → 图标 + 中文描述
// 参考和风官方图标命名（QWeather Icons），用 FontAwesome 近似替代，保证清晰可辨
const WEATHER_CODE_MAP = {
  '100': { icon: 'fa-sun', desc: '晴', animate: 'spin-slow' },
  '101': { icon: 'fa-cloud-sun', desc: '多云' },
  '102': { icon: 'fa-cloud-sun', desc: '少云' },
  '103': { icon: 'fa-cloud-sun', desc: '晴间多云' },
  '104': { icon: 'fa-cloud', desc: '阴' },
  '150': { icon: 'fa-moon', desc: '晴' },
  '151': { icon: 'fa-cloud-moon', desc: '多云' },
  '152': { icon: 'fa-cloud-moon', desc: '少云' },
  '153': { icon: 'fa-cloud-moon', desc: '晴间多云' },

  '200': { icon: 'fa-wind', desc: '有风' },
  '201': { icon: 'fa-wind', desc: '静风' },
  '202': { icon: 'fa-wind', desc: '微风' },
  '203': { icon: 'fa-wind', desc: '和风' },
  '204': { icon: 'fa-wind', desc: '清风' },
  '205': { icon: 'fa-wind', desc: '强风' },
  '206': { icon: 'fa-wind', desc: '疾风' },
  '207': { icon: 'fa-wind', desc: '大风' },
  '208': { icon: 'fa-wind', desc: '烈风' },
  '209': { icon: 'fa-wind', desc: '狂风' },
  '210': { icon: 'fa-wind', desc: '风暴' },
  '211': { icon: 'fa-wind', desc: '狂飙' },
  '212': { icon: 'fa-wind', desc: '飓风' },
  '213': { icon: 'fa-wind', desc: '龙卷风' },

  '300': { icon: 'fa-cloud-showers-heavy', desc: '阵雨' },
  '301': { icon: 'fa-cloud-showers-heavy', desc: '强阵雨' },
  '302': { icon: 'fa-cloud-bolt', desc: '雷阵雨' },
  '303': { icon: 'fa-cloud-bolt', desc: '强雷阵雨' },
  '304': { icon: 'fa-cloud-bolt', desc: '雷阵雨伴冰雹' },
  '305': { icon: 'fa-cloud-rain', desc: '小雨' },
  '306': { icon: 'fa-cloud-rain', desc: '中雨' },
  '307': { icon: 'fa-cloud-showers-heavy', desc: '大雨' },
  '308': { icon: 'fa-cloud-showers-heavy', desc: '极端降雨' },
  '309': { icon: 'fa-cloud-rain', desc: '毛毛雨' },
  '310': { icon: 'fa-cloud-showers-heavy', desc: '暴雨' },
  '311': { icon: 'fa-cloud-showers-heavy', desc: '大暴雨' },
  '312': { icon: 'fa-cloud-showers-heavy', desc: '特大暴雨' },
  '313': { icon: 'fa-icicles', desc: '冻雨' },
  '314': { icon: 'fa-cloud-rain', desc: '小到中雨' },
  '315': { icon: 'fa-cloud-showers-heavy', desc: '中到大雨' },
  '316': { icon: 'fa-cloud-showers-heavy', desc: '大到暴雨' },
  '317': { icon: 'fa-cloud-showers-heavy', desc: '暴雨到大暴雨' },
  '318': { icon: 'fa-cloud-showers-heavy', desc: '大暴雨到特大暴雨' },
  '350': { icon: 'fa-cloud-showers-heavy', desc: '阵雨' },
  '351': { icon: 'fa-cloud-showers-heavy', desc: '强阵雨' },

  '400': { icon: 'fa-snowflake', desc: '小雪', animate: 'spin-slow' },
  '401': { icon: 'fa-snowflake', desc: '中雪', animate: 'spin-slow' },
  '402': { icon: 'fa-snowflake', desc: '大雪', animate: 'spin-slow' },
  '403': { icon: 'fa-snowflake', desc: '暴雪', animate: 'spin-slow' },
  '404': { icon: 'fa-cloud-meatball', desc: '雨夹雪' },
  '405': { icon: 'fa-cloud-meatball', desc: '雨雪天气' },
  '406': { icon: 'fa-cloud-meatball', desc: '阵雨夹雪' },
  '407': { icon: 'fa-snowflake', desc: '阵雪', animate: 'spin-slow' },
  '408': { icon: 'fa-snowflake', desc: '小到中雪', animate: 'spin-slow' },
  '409': { icon: 'fa-snowflake', desc: '中到大雪', animate: 'spin-slow' },
  '410': { icon: 'fa-snowflake', desc: '大到暴雪', animate: 'spin-slow' },
  '456': { icon: 'fa-cloud-meatball', desc: '阵雨夹雪' },
  '457': { icon: 'fa-snowflake', desc: '阵雪', animate: 'spin-slow' },

  '500': { icon: 'fa-smog', desc: '薄雾' },
  '501': { icon: 'fa-smog', desc: '雾' },
  '502': { icon: 'fa-smog', desc: '浓雾' },
  '503': { icon: 'fa-smog', desc: '强浓雾' },
  '504': { icon: 'fa-smog', desc: '轻雾' },
  '505': { icon: 'fa-smog', desc: '大雾' },
  '506': { icon: 'fa-smog', desc: '特强浓雾' },
  '507': { icon: 'fa-wind', desc: '沙尘暴' },
  '508': { icon: 'fa-wind', desc: '强沙尘暴' },
  '509': { icon: 'fa-smog', desc: '浮尘' },
  '510': { icon: 'fa-smog', desc: '扬沙' },
  '511': { icon: 'fa-smog', desc: '沙尘' },
  '512': { icon: 'fa-smog', desc: '沙尘' },
  '513': { icon: 'fa-smog', desc: '雾凇' },
  '514': { icon: 'fa-smog', desc: '雾凇' },
  '515': { icon: 'fa-smog', desc: '雾霾' },

  '900': { icon: 'fa-cloud', desc: '未知' }
};

const getWeatherInfo = (code) => {
  const key = String(code);
  return WEATHER_CODE_MAP[key] || { icon: 'fa-cloud', desc: '未知' };
};

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
let isLoading = false;

const fetchIpWho = async () => {
  const data = await fetchJson("https://ipwho.is/?fields=success,message,city,latitude,longitude", { credentials: "omit" });
  if (data && data.success && data.latitude != null && data.longitude != null) {
    return {
      lat: String(data.latitude),
      lon: String(data.longitude),
      city: data.city || "当前位置"
    };
  }
  throw new Error(data?.message || "ipwho.is 定位失败");
};

const fetchGeoJs = async () => {
  const data = await fetchJson("https://get.geojs.io/v1/ip/geo.json", { credentials: "omit" });
  if (data && data.latitude != null && data.longitude != null) {
    return {
      lat: String(data.latitude),
      lon: String(data.longitude),
      city: data.city || "当前位置"
    };
  }
  throw new Error("geojs.io 定位失败");
};

const getLocation = async (config) => {
  if (config.latitude && config.longitude) {
    return {
      lat: String(config.latitude).trim(),
      lon: String(config.longitude).trim(),
      city: config.city || "当前位置"
    };
  }

  // 依次尝试多个支持 CORS 的 IP 定位服务
  const providers = [fetchIpWho, fetchGeoJs];
  for (const provider of providers) {
    try {
      const result = await provider();
      return {
        lat: result.lat,
        lon: result.lon,
        city: result.city || config.city || "当前位置"
      };
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[weather] IP 定位源失败，尝试下一个", e);
    }
  }

  // eslint-disable-next-line no-console
  console.warn("[weather] 所有 IP 定位源均失败，使用默认城市");
  return {
    lat: "22.5176",
    lon: "113.3927",
    city: config.city || "中山"
  };
};

// 通过自己的 Worker 代理请求和风天气（避免 token 暴露）。Worker 内部已做 C/F 单位前的公制获取。
// 返回结构：{ now: {...和风实况归一化}, daily: [...5日归一化] }
const fetchWeather = async (lat, lon) => {
  const config = window.Solitude?.config?.weather || {};
  const worker = config.worker;
  if (!worker) {
    throw new Error("未配置天气 Worker 地址（theme.weather.worker）");
  }
  const url = `${worker}?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
  return fetchJson(url, { credentials: "omit" });
};

const convertTemp = (value, from, to) => {
  if (from === to) return value;
  if (from === "C" && to === "F") return value * 9 / 5 + 32;
  if (from === "F" && to === "C") return (value - 32) * 5 / 9;
  return value;
};

const convertWind = (value, from, to) => {
  if (from === to) return value;
  // km/h <-> mph
  if (from === "kmh" && to === "mph") return value / 1.609344;
  if (from === "mph" && to === "kmh") return value * 1.609344;
  return value;
};

const formatTemp = (value) => `${Math.round(value)}${currentUnit === "F" ? "℉" : "℃"}`;
const formatShortTemp = (value) => `${Math.round(value)}${currentUnit === "F" ? "℉" : "℃"}`;

const getWeekday = (dateStr) => {
  const date = new Date(dateStr);
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return weekdays[date.getDay()];
};

const setLoading = (loading) => {
  isLoading = loading;
  const modal = document.getElementById("weather-modal");
  if (!modal) return;
  modal.classList.toggle("is-loading", loading);
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

  const current = data.now;
  const daily = data.daily;
  const info = getWeatherInfo(current.code);
  const iconClass = `fas ${info.icon}`;

  // 和风返回的公制基准为摄氏度 / m/s，显示时按 currentUnit 本地换算
  const temp = convertTemp(current.temp, "C", currentUnit);
  const apparent = convertTemp(current.feelsLike, "C", currentUnit);
  // 风速 m/s → km/h 或 mph（1 m/s = 3.6 km/h）
  const windMs = current.windSpeed ?? 0;
  const wind = convertWind(windMs * 3.6, "kmh", currentUnit === "F" ? "mph" : "kmh");
  const maxDay = daily?.[0];
  const maxTemp = convertTemp(maxDay?.tempMax ?? 0, "C", currentUnit);
  const minTemp = convertTemp(maxDay?.tempMin ?? 0, "C", currentUnit);

  const humidity = current.humidity;
  const precipitation = current.precip ?? 0;
  const cloudCover = current.cloud ?? 0;
  const pressure = current.pressure ?? 0;
  const visibility = current.visibility ?? 0;
  const uv = current.uv ?? 0;
  const rainProb = maxDay?.precipProb ?? 0;

  const capsule = document.getElementById("nav-weather");
  const iconEl = capsule?.querySelector(".weather-icon");
  const summaryEl = capsule?.querySelector(".weather-summary");
  if (iconEl) {
    iconEl.className = `weather-icon ${iconClass}`;
    iconEl.dataset.animate = info.animate || "";
  }
  if (summaryEl) summaryEl.textContent = `${Math.round(temp)}${currentUnit === "F" ? "℉" : "℃"} ${info.desc}`;

  const modal = document.getElementById("weather-modal");
  if (!modal) return;

  const modalIcon = modal.querySelector(".weather-modal-icon");
  renderIcon(modalIcon, current.code);

  const setText = (sel, text) => {
    const el = modal.querySelector(sel);
    if (el) el.textContent = text;
  };

  setText(".weather-modal-temp", formatTemp(temp));
  setText(".weather-modal-desc", info.desc);
  setText(".weather-apparent", formatTemp(apparent));
  setText(".weather-humidity", `${humidity}%`);
  setText(".weather-cloud", `${cloudCover}%`);
  setText(".weather-wind", `${Math.round(wind)} ${currentUnit === "F" ? "mph" : "km/h"}`);
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
  setLoading(false);
};

const renderForecast = (modal, daily) => {
  const listEl = modal.querySelector(".weather-forecast-list");
  if (!listEl || !Array.isArray(daily)) return;

  const count = Math.min(5, daily.length);
  listEl.innerHTML = "";

  for (let i = 0; i < count; i++) {
    const day = daily[i];
    const info = getWeatherInfo(day.code);
    const max = convertTemp(day.tempMax, "C", currentUnit);
    const min = convertTemp(day.tempMin, "C", currentUnit);
    const weekday = i === 0 ? "今天" : getWeekday(day.date);

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

const refreshWeather = async () => {
  const config = window.Solitude?.config?.weather;
  if (!config) return;
  try {
    setLoading(true);
    const { lat, lon, city } = await getLocation(config);
    const data = await fetchWeather(lat, lon);
    updateWeatherUI(data, city);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[weather] 刷新天气失败", e);
    setLoading(false);
    setWeatherError("天气加载失败");
  }
};

const toggleUnit = (unit) => {
  if (unit === currentUnit) return;
  currentUnit = unit;
  setStoredUnit(unit);
  if (lastWeatherData) {
    updateWeatherUI(lastWeatherData, lastCity);
  }
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
    await refreshWeather();
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
