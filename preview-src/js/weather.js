// The weather where they are right now, from Open-Meteo (free, no key). If it cannot be reached the page simply
// leaves the weather out.

const WORDS = [
  [[0], 'clear'], [[1], 'mostly clear'], [[2], 'partly cloudy'], [[3], 'cloudy'], [[45, 48], 'foggy'],
  [[51, 53, 55, 56, 57], 'drizzle'], [[61, 80], 'light rain'], [[63, 81], 'rain'], [[65, 82], 'heavy rain'], [[66, 67], 'freezing rain'],
  [[71, 85], 'light snow'], [[73], 'snow'], [[75, 86], 'heavy snow'], [[77], 'snow flurries'], [[95, 96, 99], 'thunderstorms'],
];
const describe = code => (WORDS.find(([codes]) => codes.includes(code)) || [null, ''])[1];

const KEEP_MS = 15 * 60 * 1000;

/** -> { text: "61°F, clear" } or null. Cached for a quarter of an hour so a refresh does not ask again. */
export async function currentWeather(lat, lon) {
  const key = `weather:${lat.toFixed(2)},${lon.toFixed(2)}`;
  try {
    const kept = JSON.parse(sessionStorage.getItem(key) || 'null');
    if (kept && Date.now() - kept.at < KEEP_MS) return kept.value;
  } catch (error) { /* no storage: just ask */ }
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`;
  const control = new AbortController(), timer = setTimeout(() => control.abort(), 6000);
  try {
    const response = await fetch(url, { signal: control.signal });
    if (!response.ok) return null;
    const now = (await response.json()).current;
    if (!now || typeof now.temperature_2m !== 'number') return null;
    const words = describe(now.weather_code);
    const value = { text: `${Math.round(now.temperature_2m)}°F${words ? ', ' + words : ''}` };
    try { sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), value })); } catch (error) { /* fine */ }
    return value;
  } catch (error) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
