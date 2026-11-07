import { getLocalIsoDate, shiftIsoDate } from '../utils/weather';
const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';
const HABITATED_PLACE_CODES = new Set([
    'PPL', 'PPLA', 'PPLA2', 'PPLA3', 'PPLA4', 'PPLA5', 'PPLC', 'PPLCD', 'PPLG',
]);
function normalizePlaceName(value) {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase();
}
// As APIs abertas são consultadas diretamente pelo navegador; este helper padroniza erros HTTP e erros reportados no JSON.
async function getJson(url, signal) {
    const response = await fetch(url, { signal });
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.error) {
        const message = payload?.reason || `A consulta não foi concluída (HTTP ${response.status}).`;
        throw new Error(message);
    }
    return payload;
}
/**
 * Pesquisa cidades habitadas e consolida resultados repetidos sem misturar homônimos de regiões diferentes.
 * @param {string} query Texto digitado no campo de busca.
 * @param {AbortSignal} [signal] Permite cancelar a consulta quando o texto muda.
 * @returns {Promise<import('../types/weather.js').GeoLocation[]>}
 */
export async function searchCities(query, signal) {
    // Só códigos de lugares habitados são destinos; PPL genérico exige população conhecida e positiva.
    const countryTerm = query.split(',')[0].trim();
    const url = new URL(GEO_URL);
    url.search = new URLSearchParams({
        name: query.trim(),
        count: '100',
        language: 'pt',
        format: 'json',
    }).toString();
    const payload = await getJson(url, signal);
    const results = payload.results ?? [];
    if (results.some((location) => location.feature_code === 'PCLI'
        && normalizePlaceName(location.name) === normalizePlaceName(countryTerm)))
        return [];
    const unique = new Map();
    for (const location of results) {
        if (!location.feature_code || !HABITATED_PLACE_CODES.has(location.feature_code))
            continue;
        if (location.feature_code === 'PPL' && !(typeof location.population === 'number' && location.population > 0))
            continue;
        const hierarchy = [
            location.admin1_id ?? normalizePlaceName(location.admin1 ?? ''),
            location.admin2_id ?? normalizePlaceName(location.admin2 ?? ''),
        ].join('|');
        const key = `${normalizePlaceName(location.name)}|${normalizePlaceName(location.country_code)}|${hierarchy}`;
        if (!unique.has(key))
            unique.set(key, location);
    }
    return [...unique.values()].slice(0, 8);
}
/**
 * Busca condições atuais e previsão diária/horária para as coordenadas selecionadas.
 * @param {import('../types/weather.js').GeoLocation} location Cidade escolhida na geocodificação.
 * @param {AbortSignal} [signal] Sinal de cancelamento do fetch.
 * @returns {Promise<import('../types/weather.js').ForecastResponse>}
 */
export async function getForecast(location, signal) {
    // Current alimenta o resumo do momento; daily/hourly alimentam os cinco dias e detalhes na hora local.
    const url = new URL(FORECAST_URL);
    url.search = new URLSearchParams({
        latitude: String(location.latitude),
        longitude: String(location.longitude),
        current: [
            'temperature_2m',
            'relative_humidity_2m',
            'apparent_temperature',
            'is_day',
            'precipitation',
            'rain',
            'showers',
            'snowfall',
            'weather_code',
            'cloud_cover',
            'uv_index',
            'wind_speed_10m',
            'wind_gusts_10m',
        ].join(','),
        hourly: 'relative_humidity_2m,precipitation_probability',
        daily: [
            'weather_code',
            'temperature_2m_max',
            'temperature_2m_min',
            'apparent_temperature_max',
            'apparent_temperature_min',
            'precipitation_sum',
            'precipitation_probability_max',
            'wind_speed_10m_max',
            'wind_gusts_10m_max',
            'uv_index_max',
        ].join(','),
        forecast_days: '7',
        temperature_unit: 'celsius',
        wind_speed_unit: 'kmh',
        precipitation_unit: 'mm',
        timezone: 'auto',
    }).toString();
    return getJson(url, signal);
}
/**
 * Consulta o arquivo histórico, solicitando margem nas bordas para preservar a agregação no fuso local.
 * @param {import('../types/weather.js').GeoLocation} location Cidade consultada.
 * @param {string} startDate Primeiro dia selecionado (ISO: AAAA-MM-DD).
 * @param {string} endDate Último dia selecionado (ISO: AAAA-MM-DD).
 * @param {AbortSignal} [signal] Sinal de cancelamento do fetch.
 * @returns {Promise<import('../types/weather.js').ArchiveResponse>}
 */
export async function getArchive(location, startDate, endDate, signal) {
    // A margem de um dia permite reagrupar observações por data local sem perder horas nas bordas do fuso.
    const latestAllowedDate = shiftIsoDate(getLocalIsoDate(location.timezone), -1);
    const requestStartDate = startDate > '1940-01-01' ? shiftIsoDate(startDate, -1) : startDate;
    const requestEndDate = endDate < latestAllowedDate ? shiftIsoDate(endDate, 1) : endDate;
    const url = new URL(ARCHIVE_URL);
    url.search = new URLSearchParams({
        latitude: String(location.latitude),
        longitude: String(location.longitude),
        start_date: requestStartDate,
        end_date: requestEndDate,
        hourly: 'temperature_2m,relative_humidity_2m,precipitation',
        temperature_unit: 'celsius',
        wind_speed_unit: 'kmh',
        precipitation_unit: 'mm',
        timezone: location.timezone || 'auto',
        timeformat: 'unixtime',
    }).toString();
    return getJson(url, signal);
}
