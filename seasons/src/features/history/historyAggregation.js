function utcDate(date) {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
}
function isoDate(date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}
function bucketStart(date, granularity) {
    const value = utcDate(date);
    const month = value.getUTCMonth();
    if (granularity === 'week') {
        value.setUTCDate(value.getUTCDate() - ((value.getUTCDay() + 6) % 7));
    }
    else if (granularity === 'month') {
        value.setUTCDate(1);
    }
    else if (granularity === 'quarter') {
        value.setUTCMonth(Math.floor(month / 3) * 3, 1);
    }
    else if (granularity === 'year') {
        value.setUTCMonth(0, 1);
    }
    return isoDate(value);
}
function mean(values) {
    const available = values.filter((value) => value !== null);
    return available.length ? available.reduce((sum, value) => sum + value, 0) / available.length : null;
}
/**
 * Reagrupa dias já consultados em blocos de calendário, sem refazer a chamada à API.
 * Usa UTC apenas para aritmética das datas civis ISO: assim o fuso do computador
 * não desloca o dia e períodos sem dados continuam sendo lacunas.
 * @param {Array<Object>} days Dias históricos previamente agregados.
 * @param {'day'|'week'|'month'|'quarter'|'year'} granularity Tamanho do bloco desejado.
 * @returns {Array<Object>} Séries prontas para os gráficos.
 */
export function aggregateHistoryDays(days, granularity) {
    const ordered = [...days].sort((a, b) => a.date.localeCompare(b.date));
    const groups = new Map();
    for (const day of ordered) {
        const key = granularity === 'day' ? day.date : bucketStart(day.date, granularity);
        const group = groups.get(key) ?? [];
        group.push(day);
        groups.set(key, group);
    }
    return [...groups.entries()].map(([, group]) => {
        const precipitation = group.map((day) => day.precipitation);
        const lows = group.map((day) => day.temperatureMin).filter((value) => value !== null);
        const highs = group.map((day) => day.temperatureMax).filter((value) => value !== null);
        const humidityLows = group.map((day) => day.humidityMin).filter((value) => value !== null);
        const humidityHighs = group.map((day) => day.humidityMax).filter((value) => value !== null);
        return {
            date: group[0].date,
            startDate: group[0].date,
            endDate: group[group.length - 1].date,
            temperatureMean: mean(group.map((day) => day.temperatureMean)),
            temperatureMin: lows.length ? Math.min(...lows) : null,
            temperatureMax: highs.length ? Math.max(...highs) : null,
            humidityMean: mean(group.map((day) => day.humidityMean)),
            humidityMin: humidityLows.length ? Math.min(...humidityLows) : null,
            humidityMax: humidityHighs.length ? Math.max(...humidityHighs) : null,
            precipitation: precipitation.length > 0 && precipitation.every((value) => value !== null)
                ? precipitation.reduce((sum, value) => sum + (value ?? 0), 0)
                : null,
        };
    }).sort((a, b) => a.startDate.localeCompare(b.startDate));
}
