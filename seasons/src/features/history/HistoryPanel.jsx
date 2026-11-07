import { useMemo, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, CalendarDays, ChartNoAxesCombined, ChevronDown, Droplets, RotateCcw, Thermometer, Umbrella } from 'lucide-react';
import { getArchive } from '../../services/openMeteo';
import { aggregateHistoryDays } from './historyAggregation';
import { aggregateArchive, average, formatIsoDate, getLocalIsoDate, shiftIsoDate, shiftIsoYear } from '../../utils/weather';
function initialDates(timezone) {
    const yesterday = shiftIsoDate(getLocalIsoDate(timezone), -1);
    return { start: shiftIsoDate(yesterday, -13), end: yesterday };
}
function dayCount(start, end) {
    return Math.floor((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000) + 1;
}
function fillDateRange(days, start, end) {
    const available = new Map(days.map((day) => [day.date, day]));
    return Array.from({ length: dayCount(start, end) }, (_, index) => {
        const date = shiftIsoDate(start, index);
        return available.get(date) ?? {
            date,
            temperatureMean: null,
            temperatureMin: null,
            temperatureMax: null,
            humidityMean: null,
            humidityMin: null,
            humidityMax: null,
            precipitation: null,
        };
    });
}
function summarize(days) {
    const temperatures = days.map((day) => day.temperatureMean);
    const humidities = days.map((day) => day.humidityMean);
    const precipitation = days.map((day) => day.precipitation).filter((value) => value !== null);
    const tempMean = average(temperatures);
    const humidityMean = average(humidities);
    const tempLow = days.map((day) => day.temperatureMin).filter((value) => value !== null);
    const tempHigh = days.map((day) => day.temperatureMax).filter((value) => value !== null);
    return {
        tempMean,
        humidityMean,
        tempMin: findExtreme(days, 'temperatureMin', 'min'),
        tempMax: findExtreme(days, 'temperatureMax', 'max'),
        humidityMin: findExtreme(days, 'humidityMin', 'min'),
        humidityMax: findExtreme(days, 'humidityMax', 'max'),
        rainTotal: precipitation.length === days.length && days.length
            ? precipitation.reduce((sum, value) => sum + value, 0)
            : null,
        precipitationMax: findExtreme(days, 'precipitation', 'max'),
        span: tempLow.length && tempHigh.length ? Math.max(...tempHigh) - Math.min(...tempLow) : null,
    };
}
function findExtreme(days, field, direction) {
    let extreme = null;
    for (const day of days) {
        const value = day[field];
        if (value === null)
            continue;
        if (!extreme || (direction === 'max' ? value > extreme.value : value < extreme.value)) {
            extreme = { value, date: day.date };
        }
    }
    return extreme;
}
function niceNumber(value, suffix, digits = 0) {
    return value === null ? '—' : `${value.toFixed(digits)}${suffix}`;
}
function formatChartDate(date) {
    return formatIsoDate(date, { day: '2-digit', month: '2-digit' });
}
function formatCompactDate(date) {
    return `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(2, 4)}`;
}
function compactPeriodRange(days) {
    if (!days.length)
        return '';
    return `${formatCompactDate(days[0].date)}–${formatCompactDate(days[days.length - 1].date)}`;
}
function HistoryTooltipContent({ active, payload, label, formatLabel, unit, digits }) {
    const values = payload?.filter((entry) => entry.value !== null && entry.value !== undefined) ?? [];
    if (!active || !values.length)
        return null;
    return (<div className="history-tooltip" role="status">
      <strong className="history-tooltip__label">{formatLabel(label)}</strong>
      <ul>
        {values.map((entry, index) => {
            const numericValue = Number(entry.value);
            const value = Number.isFinite(numericValue) ? numericValue.toFixed(digits) : String(entry.value);
            return (<li key={`${entry.dataKey ?? entry.name ?? 'series'}-${index}`}>
              <i aria-hidden="true" style={{ backgroundColor: entry.color ?? entry.stroke ?? '#68758a' }}/>
              <span>{entry.name ?? entry.dataKey ?? 'Série'}</span>
              <b>{value}{unit}</b>
            </li>);
        })}
      </ul>
    </div>);
}
export function HistoryPanel({ location }) {
    const dates = useMemo(() => initialDates(location.timezone), [location.timezone]);
    const chartTouchStart = useRef(null);
    const [start, setStart] = useState(dates.start);
    const [end, setEnd] = useState(dates.end);
    const [compareEnabled, setCompareEnabled] = useState(false);
    const [compareStart, setCompareStart] = useState(shiftIsoYear(dates.start, -1));
    const [compareEnd, setCompareEnd] = useState(shiftIsoYear(dates.end, -1));
    const [metric, setMetric] = useState('temperature');
    const [granularity, setGranularity] = useState('day');
    const [chartTooltipView, setChartTooltipView] = useState({ active: false, scrollLeft: 0, clientWidth: 0, side: 'right' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [primary, setPrimary] = useState(null);
    const [comparison, setComparison] = useState(null);
    const [periodLabels, setPeriodLabels] = useState(null);
    const latestAllowed = shiftIsoDate(getLocalIsoDate(location.timezone), -1);
    // Valida datas no calendário local e mantém consultas limitadas ao intervalo coberto pela fonte gratuita.
    function validatePeriod(from, to, label) {
        if (!from || !to)
            return `Informe as duas datas de ${label}.`;
        if (from < '1940-01-01')
            return 'O arquivo histórico da Open-Meteo começa em 1940.';
        if (from > latestAllowed || to > latestAllowed)
            return 'O histórico aceita somente datas até ontem. Hoje e datas futuras não podem ser consultados.';
        if (from > to)
            return `A data inicial de ${label} precisa ser anterior à data final.`;
        if (dayCount(from, to) > 366)
            return 'Cada intervalo pode conter no máximo 366 dias. Divida um período maior em consultas menores.';
        return '';
    }
    async function handleSubmit(event) {
        event.preventDefault();
        const primaryError = validatePeriod(start, end, 'consulta');
        const comparisonError = compareEnabled ? validatePeriod(compareStart, compareEnd, 'comparação') : '';
        const validationError = primaryError || comparisonError;
        if (validationError) {
            setError(validationError);
            return;
        }
        if (compareEnabled && start === compareStart && end === compareEnd) {
            setError('Escolha um período de comparação diferente do período principal.');
            return;
        }
        setLoading(true);
        setError('');
        setPrimary(null);
        setComparison(null);
        try {
            const [mainPayload, comparisonPayload] = await Promise.all([
                getArchive(location, start, end),
                compareEnabled ? getArchive(location, compareStart, compareEnd) : Promise.resolve(null),
            ]);
            // Insere datas sem observações para que os gráficos e totais não escondam lacunas de cobertura.
            const mainDays = fillDateRange(aggregateArchive(mainPayload), start, end);
            const comparisonDays = comparisonPayload
                ? fillDateRange(aggregateArchive(comparisonPayload), compareStart, compareEnd)
                : null;
            if (!mainDays.length || !mainDays.some((day) => day.temperatureMean !== null || day.humidityMean !== null || day.precipitation !== null)) {
                throw new Error('A fonte não retornou dados para esse intervalo. Tente outras datas.');
            }
            if (comparisonDays && !comparisonDays.some((day) => day.temperatureMean !== null || day.humidityMean !== null || day.precipitation !== null)) {
                throw new Error('A fonte não retornou dados para o período de comparação. Tente outras datas.');
            }
            setPrimary(mainDays);
            setComparison(comparisonDays);
            setPeriodLabels({
                primary: `${formatIsoDate(start, { day: 'numeric', month: 'short', year: 'numeric' })} – ${formatIsoDate(end, { day: 'numeric', month: 'short', year: 'numeric' })}`,
                comparison: compareEnabled ? `${formatIsoDate(compareStart, { day: 'numeric', month: 'short', year: 'numeric' })} – ${formatIsoDate(compareEnd, { day: 'numeric', month: 'short', year: 'numeric' })}` : undefined,
            });
        }
        catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Não foi possível consultar o arquivo histórico. Tente novamente.');
        }
        finally {
            setLoading(false);
        }
    }
    function clearFilters() {
        const freshDates = initialDates(location.timezone);
        setStart(freshDates.start);
        setEnd(freshDates.end);
        setCompareStart(shiftIsoYear(freshDates.start, -1));
        setCompareEnd(shiftIsoYear(freshDates.end, -1));
        setCompareEnabled(false);
        setMetric('temperature');
        setGranularity('day');
        setPrimary(null);
        setComparison(null);
        setPeriodLabels(null);
        setError('');
    }
    const primaryBuckets = useMemo(() => primary ? aggregateHistoryDays(primary, granularity) : [], [primary, granularity]);
    const comparisonBuckets = useMemo(() => comparison ? aggregateHistoryDays(comparison, granularity) : null, [comparison, granularity]);
    const chartData = useMemo(() => {
        if (!primary)
            return [];
        const rows = Math.max(primaryBuckets.length, comparisonBuckets?.length ?? 0);
        return Array.from({ length: rows }, (_, index) => ({
            chartDate: primaryBuckets[index]?.date ?? comparisonBuckets?.[index]?.date ?? '',
            primaryBucket: primaryBuckets[index],
            comparisonBucket: comparisonBuckets?.[index],
            temperatureMin: primaryBuckets[index]?.temperatureMin ?? undefined,
            temperatureMax: primaryBuckets[index]?.temperatureMax ?? undefined,
            comparisonMin: comparisonBuckets?.[index]?.temperatureMin ?? undefined,
            comparisonMax: comparisonBuckets?.[index]?.temperatureMax ?? undefined,
            humidity: primaryBuckets[index]?.humidityMean ?? undefined,
            comparisonHumidity: comparisonBuckets?.[index]?.humidityMean ?? undefined,
            precipitation: primaryBuckets[index]?.precipitation ?? undefined,
            comparisonPrecipitation: comparisonBuckets?.[index]?.precipitation ?? undefined,
        }));
    }, [primary, primaryBuckets, comparisonBuckets]);
    const granularityLabels = {
        day: 'dia', week: 'semana', month: 'mês', quarter: 'trimestre', year: 'ano',
    };
    const pluralGranularity = {
        day: 'dias', week: 'semanas', month: 'meses', quarter: 'trimestres', year: 'anos',
    };
    function tooltipPeriod(label) {
        const row = chartData.find((item) => item.chartDate === String(label));
        if (!row)
            return `${granularityLabels[granularity]} · ${formatChartDate(String(label))}`;
        const range = (bucket) => `${formatChartDate(bucket.startDate)}–${formatChartDate(bucket.endDate)}`;
        const ranges = [
            row.primaryBucket ? `principal ${range(row.primaryBucket)}` : null,
            row.comparisonBucket ? `comparação ${range(row.comparisonBucket)}` : null,
        ].filter((value) => value !== null);
        return `${granularityLabels[granularity]} · ${ranges.join(' · ')}`;
    }
    // Recharts posiciona o tooltip no canvas completo; compensar o scroll mantém a caixa visível.
    function trackChartTooltipPointer(element, clientX) {
        const bounds = element.getBoundingClientRect();
        const next = {
            active: true,
            scrollLeft: element.scrollLeft,
            clientWidth: element.clientWidth,
            side: clientX - bounds.left < bounds.width / 2 ? 'right' : 'left',
        };
        setChartTooltipView((current) => current.active === next.active
            && current.scrollLeft === next.scrollLeft
            && current.clientWidth === next.clientWidth
            && current.side === next.side ? current : next);
    }
    const tooltipWidth = Math.min(260, chartTooltipView.clientWidth || 260, Math.max(0, window.innerWidth - 56));
    const tooltipPosition = chartTooltipView.active ? {
        x: chartTooltipView.scrollLeft + (chartTooltipView.side === 'right' ? Math.max(0, chartTooltipView.clientWidth - tooltipWidth) : 0),
    } : undefined;
    // Em intervalos longos, preserva espaço por dia em vez de comprimir todos os pontos.
    const chartCanvasWidth = chartData.length > 20 ? `${chartData.length * 26}px` : '100%';
    const stats = primary ? summarize(primary) : null;
    const comparisonStats = comparison ? summarize(comparison) : null;
    const humidityRange = (minimum, maximum) => minimum === null || minimum === undefined || maximum === null || maximum === undefined
        ? '—'
        : `${niceNumber(minimum, '%', 0)} – ${niceNumber(maximum, '%', 0)}`;
    const humidityDates = (minimum, maximum) => minimum && maximum
        ? `Mín. ${formatCompactDate(minimum.date)} · Máx. ${formatCompactDate(maximum.date)}`
        : null;
    const summaryCards = stats ? [
        { key: 'temperature-average', label: 'Temperatura média', icon: Thermometer, primaryValue: niceNumber(stats.tempMean, '°C', 1), comparisonValue: comparisonStats ? niceNumber(comparisonStats.tempMean, '°C', 1) : null },
        { key: 'temperature-minimum', label: 'Temperatura mínima', icon: Thermometer, primaryValue: niceNumber(stats.tempMin?.value ?? null, '°C', 1), primaryDate: stats.tempMin ? formatCompactDate(stats.tempMin.date) : null, comparisonValue: comparisonStats ? niceNumber(comparisonStats.tempMin?.value ?? null, '°C', 1) : null, comparisonDate: comparisonStats?.tempMin ? formatCompactDate(comparisonStats.tempMin.date) : null },
        { key: 'temperature-maximum', label: 'Temperatura máxima', icon: Thermometer, primaryValue: niceNumber(stats.tempMax?.value ?? null, '°C', 1), primaryDate: stats.tempMax ? formatCompactDate(stats.tempMax.date) : null, comparisonValue: comparisonStats ? niceNumber(comparisonStats.tempMax?.value ?? null, '°C', 1) : null, comparisonDate: comparisonStats?.tempMax ? formatCompactDate(comparisonStats.tempMax.date) : null },
        { key: 'humidity-average', label: 'Umidade média', icon: Droplets, primaryValue: niceNumber(stats.humidityMean, '%', 0), comparisonValue: comparisonStats ? niceNumber(comparisonStats.humidityMean, '%', 0) : null },
        { key: 'humidity-range', label: 'Umidade mínima / máxima', icon: Droplets, primaryValue: humidityRange(stats.humidityMin?.value, stats.humidityMax?.value), primaryDate: humidityDates(stats.humidityMin, stats.humidityMax), comparisonValue: comparisonStats ? humidityRange(comparisonStats.humidityMin?.value, comparisonStats.humidityMax?.value) : null, comparisonDate: comparisonStats ? humidityDates(comparisonStats.humidityMin, comparisonStats.humidityMax) : null },
        { key: 'precipitation-total', label: 'Precipitação acumulada', icon: Umbrella, primaryValue: niceNumber(stats.rainTotal, ' mm', 1), comparisonValue: comparisonStats ? niceNumber(comparisonStats.rainTotal, ' mm', 1) : null },
        { key: 'precipitation-maximum', label: 'Maior precipitação diária', icon: Umbrella, primaryValue: niceNumber(stats.precipitationMax?.value ?? null, ' mm', 1), primaryDate: stats.precipitationMax ? formatCompactDate(stats.precipitationMax.date) : null, comparisonValue: comparisonStats ? niceNumber(comparisonStats.precipitationMax?.value ?? null, ' mm', 1) : null, comparisonDate: comparisonStats?.precipitationMax ? formatCompactDate(comparisonStats.precipitationMax.date) : null },
        { key: 'temperature-span', label: 'Variação de temperatura', icon: Activity, primaryValue: niceNumber(stats.span, '°C', 1), comparisonValue: comparisonStats ? niceNumber(comparisonStats.span, '°C', 1) : null },
    ] : [];
    const hasMissingCoverage = [...(primary ?? []), ...(comparison ?? [])].some((day) => day.temperatureMean === null || day.humidityMean === null || day.precipitation === null);
    return (<section className="history-panel">
      <form className="history-filters" onSubmit={handleSubmit}>
        <div className="history-filters__top"><div><CalendarDays size={18}/><strong>Defina seus períodos</strong></div><button className="clear-button" onClick={clearFilters} type="button"><RotateCcw size={14}/> Limpar</button></div>
        <div className="period-fields">
          <fieldset className="period-fieldset"><legend>PERÍODO PRINCIPAL</legend><label>Data de início<input type="date" min="1940-01-01" max={latestAllowed} value={start} onChange={(event) => setStart(event.target.value)}/></label><label>Data de fim<input type="date" min={start || '1940-01-01'} max={latestAllowed} value={end} onChange={(event) => setEnd(event.target.value)}/></label></fieldset>
          <label className="compare-toggle"><input type="checkbox" checked={compareEnabled} onChange={(event) => setCompareEnabled(event.target.checked)}/><span className="compare-toggle__switch"/><span><strong>Comparar com outro período</strong><small>Veja as diferenças lado a lado no gráfico.</small></span></label>
          {compareEnabled && <fieldset className="period-fieldset period-fieldset--compare"><legend>PERÍODO DE COMPARAÇÃO</legend><label>Data de início<input type="date" min="1940-01-01" max={latestAllowed} value={compareStart} onChange={(event) => setCompareStart(event.target.value)}/></label><label>Data de fim<input type="date" min={compareStart || '1940-01-01'} max={latestAllowed} value={compareEnd} onChange={(event) => setCompareEnd(event.target.value)}/></label></fieldset>}
        </div>
        <div className="history-filters__bottom"><p><span className="history-filters__info">i</span> Datas futuras e o dia de hoje não estão disponíveis.</p><button className="primary-button" disabled={loading} type="submit">{loading ? 'Consultando…' : 'Gerar relatório'} <ChartNoAxesCombined size={16}/></button></div>
      </form>

      {error && <div className="history-error" role="alert">{error}</div>}
      {loading && <div className="history-loading"><span className="loading-spinner"/><div><strong>Preparando a linha do tempo</strong><p>Buscando o histórico climático para {location.name}…</p></div></div>}

      {primary && stats && !loading && (<div className="history-report">
          <div className="report-title"><div><span className="eyebrow">RELATÓRIO HISTÓRICO</span><h3>{periodLabels?.primary}</h3><p>{compareEnabled && periodLabels?.comparison ? `Comparado com ${periodLabels.comparison}` : `Condições observadas em ${location.name}`}</p></div><span className="report-title__source">Open-Meteo · arquivo de reanálise</span></div>
          <section className="history-summary" aria-labelledby="history-summary-title">
            <div className="history-summary__heading"><div><span className="eyebrow">VISÃO GERAL</span><h3 id="history-summary-title">Resumo rápido do período</h3></div>{comparisonStats && <p><span className="legend-dot"/> Principal <span className="legend-dot legend-dot--compare"/> Comparação</p>}</div>
            <div className="history-stat-grid">
              {summaryCards.map((card) => {
                const Icon = card.icon;
                return <details className="history-stat" key={card.key}>
                  <summary className="history-stat__summary">
                    <div className="history-stat__heading"><span className={`history-stat__icon${card.key.includes('humidity') || card.key.includes('precipitation') ? ' history-stat__icon--humidity' : card.key.includes('span') ? ' history-stat__icon--variation' : ''}`}><Icon size={18}/></span><small>{card.label}</small></div>
                    <ChevronDown className="history-stat__toggle-icon" size={17} aria-hidden="true"/>
                  </summary>
                  <div className="history-stat__values">
                    <div className="history-stat__series"><span className="history-stat__series-label"><i className="legend-dot"/>Principal</span><strong>{card.primaryValue}</strong>{card.primaryDate && <span className="history-stat__series-detail"><em>{card.primaryDate}</em></span>}</div>
                    {card.comparisonValue !== null && <div className="history-stat__series history-stat__series--compare"><span className="history-stat__series-label"><i className="legend-dot legend-dot--compare"/>Comparação</span><strong>{card.comparisonValue}</strong>{card.comparisonDate && <span className="history-stat__series-detail"><em>{card.comparisonDate}</em></span>}</div>}
                  </div>
                </details>;
            })}
            </div>
          </section>

          <section className="history-chart-card">
            <div className="chart-card__heading"><div><span className="eyebrow">SÉRIE HISTÓRICA</span><h3>Como os períodos se comparam</h3></div></div>
            <div className="chart-toolbar"><div className="chart-toolbar__group"><span className="chart-toolbar__label">Variável</span><div className="metric-switch" role="tablist" aria-label="Variável histórica">
              <button className={metric === 'temperature' ? 'is-active' : ''} onClick={() => setMetric('temperature')} type="button"><Thermometer size={20}/> Temperatura</button>
              <button className={metric === 'humidity' ? 'is-active' : ''} onClick={() => setMetric('humidity')} type="button"><Droplets size={20}/> Umidade</button>
              <button className={metric === 'precipitation' ? 'is-active' : ''} onClick={() => setMetric('precipitation')} type="button"><Umbrella size={20}/> Chuva</button>
            </div></div><div className="chart-toolbar__group chart-toolbar__group--granularity"><span className="chart-toolbar__label">Intervalo do gráfico</span><div className="chart-granularity"><span className="chart-granularity__label">Agrupar por</span><div className="chart-card__controls">
              {['day', 'week', 'month', 'quarter', 'year'].map((value) => <button key={value} className={`chart-granularity__button${granularity === value ? ' is-active' : ''}`} aria-pressed={granularity === value} onClick={() => setGranularity(value)} type="button">{{ day: 'Dia', week: 'Semana', month: 'Mês', quarter: 'Trimestre', year: 'Ano' }[value]}</button>)}
            </div></div></div></div>
            <div className="chart-legend" aria-label="Legenda dos períodos">
              <span className="chart-series-label"><i className="chart-series-label__sample chart-series-label__sample--primary" aria-hidden="true"/><span><strong>Principal</strong><small>{compactPeriodRange(primary)}</small></span></span>
              {comparison && <span className="chart-series-label"><i className="chart-series-label__sample chart-series-label__sample--compare" aria-hidden="true"/><span><strong>Comparação</strong><small>{compactPeriodRange(comparison)}</small></span></span>}
              
            </div>
            {chartData.length > 20 && <p className="chart-scroll-note">Deslize ou role horizontalmente para percorrer os {chartData.length} {pluralGranularity[granularity]} do período.</p>}
            <div className="history-chart" role="region" aria-label={`Gráfico histórico com ${chartData.length} ${pluralGranularity[granularity]}; deslize horizontalmente para consultar o período completo.`} tabIndex={chartData.length > 20 ? 0 : undefined} onMouseMove={(event) => trackChartTooltipPointer(event.currentTarget, event.clientX)} onTouchStart={(event) => {
                chartTouchStart.current = event.currentTarget.scrollLeft;
                const touch = event.touches[0];
                if (touch)
                    trackChartTooltipPointer(event.currentTarget, touch.clientX);
            }} onTouchMove={(event) => { const touch = event.touches[0]; if (touch)
            trackChartTooltipPointer(event.currentTarget, touch.clientX); }} onTouchEnd={(event) => {
                const start = chartTouchStart.current;
                chartTouchStart.current = null;
                if (start !== null && Math.abs(event.currentTarget.scrollLeft - start) > 3) {
                    setChartTooltipView((current) => current.active ? { ...current, active: false } : current);
                }
            }} onTouchCancel={() => {
                chartTouchStart.current = null;
                setChartTooltipView((current) => current.active ? { ...current, active: false } : current);
            }} onScroll={(event) => {
                const element = event.currentTarget;
                setChartTooltipView((current) => current.active ? { ...current, scrollLeft: element.scrollLeft, clientWidth: element.clientWidth } : current);
            }} onMouseLeave={() => setChartTooltipView((current) => current.active ? { ...current, active: false } : current)}>
              <div className="history-chart__canvas" style={{ width: chartCanvasWidth }}>
                <ResponsiveContainer width="100%" height="100%">
                {metric === 'temperature' ? (<LineChart data={chartData} margin={{ top: 12, right: 14, left: 0, bottom: 2 }}>
                    <CartesianGrid stroke="#e8edf5" vertical={false} strokeDasharray="3 5"/>
                    <XAxis dataKey="chartDate" tickLine={false} axisLine={false} tick={{ fill: '#8090a9', fontSize: 11 }} tickFormatter={(value) => formatChartDate(String(value))} minTickGap={24}/>
                    <YAxis tickLine={false} axisLine={false} width={42} tick={{ fill: '#8090a9', fontSize: 11 }} unit="°"/>
                    <Tooltip active={chartTooltipView.active} content={(props) => <HistoryTooltipContent {...props} formatLabel={tooltipPeriod} unit="°C" digits={1}/>} wrapperClassName="history-tooltip-wrapper" wrapperStyle={{ maxWidth: 'min(260px, calc(100vw - 56px))', pointerEvents: 'none', zIndex: 5, transition: 'none' }} position={tooltipPosition} allowEscapeViewBox={{ x: false, y: false }}/>
                    <Line type="monotone" dataKey="temperatureMax" name="Máxima · principal" stroke="var(--history-primary-maximum)" strokeWidth={2.5} dot={false} connectNulls={false}/>
                    <Line type="monotone" dataKey="temperatureMin" name="Mínima · principal" stroke="var(--history-primary-minimum)" strokeWidth={2.5} dot={false} connectNulls={false}/>
                    {comparison && <Line type="monotone" dataKey="comparisonMax" name="Máxima · comparação" stroke="var(--history-comparison-maximum)" strokeWidth={2.4} strokeDasharray="7 4" dot={false} connectNulls={false}/>}
                    {comparison && <Line type="monotone" dataKey="comparisonMin" name="Mínima · comparação" stroke="var(--history-comparison-minimum)" strokeWidth={2.4} strokeDasharray="7 4" dot={false} connectNulls={false}/>}
                  </LineChart>) : metric === 'humidity' ? (<LineChart data={chartData} margin={{ top: 12, right: 14, left: 0, bottom: 2 }}>
                    <CartesianGrid stroke="#e8edf5" vertical={false} strokeDasharray="3 5"/>
                    <XAxis dataKey="chartDate" tickLine={false} axisLine={false} tick={{ fill: '#8090a9', fontSize: 11 }} tickFormatter={(value) => formatChartDate(String(value))} minTickGap={24}/>
                    <YAxis domain={[0, 100]} tickLine={false} axisLine={false} width={42} tick={{ fill: '#8090a9', fontSize: 11 }} unit="%"/>
                    <Tooltip active={chartTooltipView.active} content={(props) => <HistoryTooltipContent {...props} formatLabel={tooltipPeriod} unit="%" digits={0}/>} wrapperClassName="history-tooltip-wrapper" wrapperStyle={{ maxWidth: 'min(260px, calc(100vw - 56px))', pointerEvents: 'none', zIndex: 5, transition: 'none' }} position={tooltipPosition} allowEscapeViewBox={{ x: false, y: false }}/>
                    <Line type="monotone" dataKey="humidity" name="Umidade · principal" stroke="var(--history-primary-humidity)" strokeWidth={2.7} dot={false} connectNulls={false}/>
                    {comparison && <Line type="monotone" dataKey="comparisonHumidity" name="Umidade · comparação" stroke="var(--history-comparison-humidity)" strokeWidth={2.4} strokeDasharray="7 4" dot={false} connectNulls={false}/>}
                  </LineChart>) : (<BarChart data={chartData} margin={{ top: 12, right: 14, left: 0, bottom: 2 }} barGap={3}>
                    <CartesianGrid stroke="#e8edf5" vertical={false} strokeDasharray="3 5"/>
                    <XAxis dataKey="chartDate" tickLine={false} axisLine={false} tick={{ fill: '#8090a9', fontSize: 11 }} tickFormatter={(value) => formatChartDate(String(value))} minTickGap={24}/>
                    <YAxis tickLine={false} axisLine={false} width={42} tick={{ fill: '#8090a9', fontSize: 11 }} unit="mm"/>
                    <Tooltip active={chartTooltipView.active} content={(props) => <HistoryTooltipContent {...props} formatLabel={tooltipPeriod} unit=" mm" digits={1}/>} wrapperClassName="history-tooltip-wrapper" wrapperStyle={{ maxWidth: 'min(260px, calc(100vw - 56px))', pointerEvents: 'none', zIndex: 5, transition: 'none' }} position={tooltipPosition} allowEscapeViewBox={{ x: false, y: false }}/>
                    <Bar dataKey="precipitation" name="Chuva · principal" fill="var(--history-primary-precipitation)" radius={[5, 5, 0, 0]} maxBarSize={17}/>
                    {comparison && <Bar dataKey="comparisonPrecipitation" name="Chuva · comparação" fill="var(--history-comparison-precipitation)" radius={[5, 5, 0, 0]} maxBarSize={17}/>}
                  </BarChart>)}
                </ResponsiveContainer>
              </div>
            </div>
            
          </section>
        </div>)}
      {!primary && !loading && !error && <div className="history-empty"><span className="history-empty__icon"><CalendarDays size={25}/></span><div><strong>Escolha um intervalo para começar.</strong><p>Defina as datas e gere um relatório com os dados disponíveis para esta cidade.</p></div><span className="history-empty__arrow"><ChartNoAxesCombined size={26}/></span></div>}
    </section>);
}
