import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun, } from 'lucide-react';
export function describeWeather(code, isDay = true) {
    if (code === 0)
        return { label: 'Céu limpo', mood: 'sunny', icon: Sun };
    if (code === 1)
        return { label: 'Predominantemente limpo', mood: 'sunny', icon: isDay ? CloudSun : Cloud };
    if (code === 2)
        return { label: 'Parcialmente nublado', mood: 'cloudy', icon: CloudSun };
    if (code === 3)
        return { label: 'Nublado', mood: 'cloudy', icon: Cloud };
    if (code === 45 || code === 48)
        return { label: 'Neblina', mood: 'foggy', icon: CloudFog };
    if (code >= 51 && code <= 67)
        return { label: 'Garoa ou chuva', mood: 'rainy', icon: CloudDrizzle };
    if (code >= 71 && code <= 77)
        return { label: 'Neve', mood: 'snowy', icon: CloudSnow };
    if (code >= 80 && code <= 82)
        return { label: 'Pancadas de chuva', mood: 'rainy', icon: CloudRain };
    if (code === 85 || code === 86)
        return { label: 'Pancadas de neve', mood: 'snowy', icon: CloudSnow };
    if (code >= 95)
        return { label: 'Tempestade', mood: 'stormy', icon: CloudLightning };
    return { label: 'Condição variável', mood: 'cloudy', icon: Cloud };
}
export function getLocalIsoDate(timezone) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone || 'UTC',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
}
export function shiftIsoDate(date, days) {
    const [year, month, day] = date.split('-').map(Number);
    const shifted = new Date(Date.UTC(year, month - 1, day + days, 12));
    return shifted.toISOString().slice(0, 10);
}
export function shiftIsoYear(date, years) {
    const [year, month, day] = date.split('-').map(Number);
    const adjusted = new Date(Date.UTC(year + years, month - 1, day, 12));
    return adjusted.toISOString().slice(0, 10);
}
export function formatIsoDate(date, options = {}) {
    const [year, month, day] = date.slice(0, 10).split('-').map(Number);
    const value = new Date(Date.UTC(year, month - 1, day, 12));
    return new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'UTC',
        day: 'numeric',
        month: 'short',
        ...options,
    }).format(value);
}
export function formatLocation(location) {
    return [location.name, location.admin1, location.country].filter(Boolean).join(', ');
}
function localMidnightTimestamp(date, timezone) {
    const [year, month, day] = date.split('-').map(Number);
    const wallClock = Date.UTC(year, month - 1, day);
    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone || 'UTC',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
    });
    let estimate = wallClock;
    for (let attempt = 0; attempt < 4; attempt += 1) {
        const parts = Object.fromEntries(formatter.formatToParts(new Date(estimate)).map((part) => [part.type, part.value]));
        const representedAsUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
        const nextEstimate = wallClock - (representedAsUtc - estimate);
        if (nextEstimate === estimate)
            break;
        estimate = nextEstimate;
    }
    return estimate;
}
function localDateFromUnixSeconds(timestamp, timezone) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone || 'UTC',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(new Date(timestamp * 1000)).map((part) => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
}
function expectedHoursInLocalDay(date, timezone) {
    try {
        const nextDate = shiftIsoDate(date, 1);
        const hours = (localMidnightTimestamp(nextDate, timezone) - localMidnightTimestamp(date, timezone)) / 3_600_000;
        return hours > 0 && hours <= 25 ? hours : 24;
    }
    catch {
        return 24;
    }
}
// Reagrupa timestamps absolutos pelo calendário local e deixa lacuna quando falta uma hora esperada do dia.
export function aggregateArchive(data) {
    const groups = new Map();
    data.hourly.time.forEach((time, index) => {
        const date = localDateFromUnixSeconds(time, data.timezone);
        const group = groups.get(date) ?? { temperatures: [], humidities: [], precipitation: [], observations: 0 };
        group.observations += 1;
        const temperature = data.hourly.temperature_2m[index];
        const humidity = data.hourly.relative_humidity_2m[index];
        const precipitation = data.hourly.precipitation[index];
        if (temperature !== null && temperature !== undefined)
            group.temperatures.push(temperature);
        if (humidity !== null && humidity !== undefined)
            group.humidities.push(humidity);
        if (precipitation !== null && precipitation !== undefined)
            group.precipitation.push(precipitation);
        groups.set(date, group);
    });
    const mean = (values) => values.length
        ? values.reduce((sum, value) => sum + value, 0) / values.length
        : null;
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, group]) => {
        const expectedHours = expectedHoursInLocalDay(date, data.timezone);
        const fullDay = group.observations === expectedHours;
        const completeTemperatures = fullDay && group.temperatures.length === expectedHours;
        const completeHumidity = fullDay && group.humidities.length === expectedHours;
        const completePrecipitation = fullDay && group.precipitation.length === expectedHours;
        return {
            date,
            temperatureMean: completeTemperatures ? mean(group.temperatures) : null,
            temperatureMin: completeTemperatures ? Math.min(...group.temperatures) : null,
            temperatureMax: completeTemperatures ? Math.max(...group.temperatures) : null,
            humidityMean: completeHumidity ? mean(group.humidities) : null,
            humidityMin: completeHumidity ? Math.min(...group.humidities) : null,
            humidityMax: completeHumidity ? Math.max(...group.humidities) : null,
            precipitation: completePrecipitation
                ? group.precipitation.reduce((sum, value) => sum + value, 0)
                : null,
        };
    });
}
export function average(values) {
    const usable = values.filter((value) => value !== null && Number.isFinite(value));
    return usable.length ? usable.reduce((sum, value) => sum + value, 0) / usable.length : null;
}
