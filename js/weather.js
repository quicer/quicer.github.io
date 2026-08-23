const WEATHER_CODE_MAP = {
  0: { icon: "fa-sun", desc: "晴朗" },
  1: { icon: "fa-cloud-sun", desc: "大部晴朗" },
  2: { icon: "fa-cloud-sun", desc: "多云" },
  3: { icon: "fa-cloud", desc: "阴天" },
  45: { icon: "fa-smog", desc: "雾" },
  48: { icon: "fa-smog", desc: "雾凇" },
  51: { icon: "fa-cloud-rain", desc: "毛毛雨" },
  53: { icon: "fa-cloud-rain", desc: "中度毛毛雨" },
  55: { icon: "fa-cloud-showers-heavy", desc: "密集毛毛雨" },
  56: { icon: "fa-cloud-rain", desc: "冻毛毛雨" },
  57: { icon: "fa-cloud-showers-heavy", desc: "强冻毛毛雨" },
  61: { icon: "fa-cloud-rain", desc: "小雨" },
  63: { icon: "fa-cloud-rain", desc: "中雨" },
  65: { icon: "fa-cloud-showers-heavy", desc: "大雨" },
  66: { icon: "fa-cloud-rain", desc: "冻雨" },
  67: { icon: "fa-cloud-showers-heavy", desc: "强冻雨" },
  71: { icon: "fa-snowflake", desc: "小雪" },
  73: { icon: "fa-snowflake", desc: "中雪" },
  75: { icon: "fa-snowflake", desc: "大雪" },
  77: { icon: "fa-snowflake", desc: "雪粒" },
  80: { icon: "fa-cloud-rain", desc: "阵雨" },
  81: { icon: "fa-cloud-showers-heavy", desc: "强阵雨" },
  82: { icon: "fa-cloud-showers-heavy", desc: "暴雨" },
  85: { icon: "fa-snowflake", desc: "阵雪" },
  86: { icon: "fa-snowflake", desc: "强阵雪" },
  95: { icon: "fa-bolt", desc: "雷暴" },
  96: { icon: "fa-bolt", desc: "雷暴伴小冰雹" },
  99: { icon: "fa-bolt", desc: "雷暴伴大冰雹" }
};

const getWeatherInfo = (code) => WEATHER_CODE_MAP[code] || { icon: "fa-cloud", desc: "未知" };

const fetchJson = async (url, options = {}) => {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

const getLocation = async (config) => {
  // 若配置中显式指定了经纬度，直接使用
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

  // 默认回退：中山城区
  return {
    lat: "22.5176",
    lon: "113.3927",
    city: config.city || "中山"
  };
};

const fetchWeather = async (lat, lon) => {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
  return fetchJson(url);
};

const updateWeatherUI = (data, city) => {
  const current = data.current;
  const daily = data.daily;
  const info = getWeatherInfo(current.weather_code);
  const iconClass = `fas ${info.icon}`;
  const temp = Math.round(current.temperature_2m);
  const humidity = current.relative_humidity_2m;
  const wind = current.wind_speed_10m;
  const maxTemp = Math.round(daily.temperature_2m_max[0]);
  const minTemp = Math.round(daily.temperature_2m_min[0]);

  const capsule = document.getElementById("nav-weather");
  const iconEl = capsule?.querySelector(".weather-icon");
  const summaryEl = capsule?.querySelector(".weather-summary");
  if (iconEl) iconEl.className = `weather-icon ${iconClass}`;
  if (summaryEl) summaryEl.textContent = `${temp}° ${info.desc}`;

  const modal = document.getElementById("weather-modal");
  if (!modal) return;

  const modalIcon = modal.querySelector(".weather-modal-icon");
  if (modalIcon) modalIcon.className = `weather-modal-icon ${iconClass}`;

  const setText = (sel, text) => {
    const el = modal.querySelector(sel);
    if (el) el.textContent = text;
  };

  setText(".weather-modal-temp", `${temp}°C`);
  setText(".weather-modal-desc", info.desc);
  setText(".weather-humidity", `${humidity}%`);
  setText(".weather-wind", `${wind} km/h`);
  setText(".weather-temp-max", `${maxTemp}°C`);
  setText(".weather-temp-min", `${minTemp}°C`);
  setText(".weather-city", city);
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

export const initWeather = async () => {
  const config = window.Solitude?.config?.weather;
  if (!config || !config.enable) return;

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

export const handleWeatherClick = (event) => {
  if (!event || event.target?.closest?.("#weather-modal")) return;
  showWeatherModal();
};

export const hideWeatherModalAction = () => {
  hideWeatherModal();
};
