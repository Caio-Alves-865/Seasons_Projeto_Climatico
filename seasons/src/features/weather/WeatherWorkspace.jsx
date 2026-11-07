import { lazy, Suspense, useState } from 'react';
import { ArrowLeft, ArrowRight, Clock3, Droplets, Gauge, MapPin, Sun, Thermometer, Wind } from 'lucide-react';
import { describeWeather, formatIsoDate, formatLocation } from '../../utils/weather';
import { TipsPanel } from './components/TipsPanel';
import { WeatherGlyph } from './components/WeatherGlyph';
import { ThemeToggle } from '../../components/shared/ThemeToggle';
const HistoryPanel = lazy(() => import('../history/HistoryPanel').then((module) => ({ default: module.HistoryPanel })));
const MapPanel = lazy(() => import('./components/MapPanel').then((module) => ({ default: module.MapPanel })));
function MetricCard({ icon: Icon, label, value, tone = '' }) {
    return <div className={`metric-card ${tone}`}><span className="metric-card__icon"><Icon size={19} aria-hidden="true"/></span><span className="metric-card__copy"><small>{label}</small><strong>{value}</strong></span></div>;
}
// A API devolve probabilidade horária no mesmo fuso local de current.time; associamos o valor à hora atual.
function currentHourProbability(forecast) {
    const currentHour = forecast.current.time.slice(0, 13);
    let index = forecast.hourly.time.findIndex((time) => time.slice(0, 13) === currentHour);
    if (index < 0)
        index = forecast.hourly.time.findIndex((time) => time.slice(0, 13) > currentHour);
    return index >= 0 ? forecast.hourly.precipitation_probability[index] ?? null : null;
}
function WeatherDetail({ location, forecast, dayIndex, theme }) {
    const { current, daily, hourly } = forecast;
    const dailyMode = dayIndex !== null;
    const code = dailyMode ? daily.weather_code[dayIndex] ?? 0 : current.weather_code;
    const isDay = dailyMode ? true : current.is_day === 1;
    const description = describeWeather(code, isDay);
    const date = dailyMode ? daily.time[dayIndex] : current.time.slice(0, 10);
    const time = current.time.includes('T') ? current.time.slice(11, 16) : '--:--';
    const temperature = dailyMode
        ? daily.temperature_2m_max[dayIndex] ?? null
        : current.temperature_2m;
    const feelsLike = dailyMode
        ? daily.apparent_temperature_max[dayIndex] ?? null
        : current.apparent_temperature;
    const humidity = dailyMode
        ? averageForDate(hourly.time, hourly.relative_humidity_2m, date)
        : current.relative_humidity_2m;
    const wind = dailyMode ? daily.wind_speed_10m_max[dayIndex] ?? null : current.wind_speed_10m;
    // Em ambos os modos, “Precipitação” representa milímetros acumulados previstos para aquele dia.
    const precipitationIndex = dayIndex ?? 0;
    const precipitation = daily.precipitation_sum[precipitationIndex] ?? null;
    const gusts = dailyMode ? daily.wind_gusts_10m_max[dayIndex] ?? null : current.wind_gusts_10m;
    const temperatureLow = dailyMode ? daily.temperature_2m_min[dayIndex] ?? null : null;
    const probability = dailyMode
        ? daily.precipitation_probability_max[precipitationIndex] ?? null
        : currentHourProbability(forecast);
    const uvIndex = dailyMode ? daily.uv_index_max[dayIndex] ?? null : current.uv_index;
    return (<>
      <section className={`weather-hero weather-hero--${description.mood}`}>
        <div className="weather-hero__copy">
          <span className="weather-hero__date"><span className="live-dot"/> {dailyMode ? formatIsoDate(date, { weekday: 'long', day: 'numeric', month: 'long' }) : `AGORA · ${time} · ${forecast.timezone_abbreviation}`}</span>
          <div className="weather-hero__main">
            <div className="weather-hero__temperature">{temperature === null ? '—' : Math.round(temperature)}<span>°</span></div>
            <div className="weather-hero__condition"><WeatherGlyph code={code} isDay={isDay} size={51}/><div><h2>{description.label}</h2><p>{dailyMode && temperatureLow !== null ? `Mínima de ${Math.round(temperatureLow)}°` : `Sensação de ${feelsLike === null ? '—' : `${Math.round(feelsLike)}°`}`}</p></div></div>
          </div>
          <div className="weather-hero__place"><MapPin size={16} aria-hidden="true"/><span>{formatLocation(location)}</span></div>
          <div className="weather-hero__timezone"><Clock3 size={14} aria-hidden="true"/> Fuso horário: {forecast.timezone}</div>
        </div>
        <div className="weather-hero__aside">
          <div className="weather-hero__aside-label">{dailyMode ? 'VISÃO DO DIA' : 'CONDIÇÃO LOCAL'}</div>
          <WeatherGlyph code={code} isDay={isDay} size={92}/>
          <div className="weather-hero__aside-summary"><strong>{description.label}</strong><span>{dailyMode ? `Máxima prevista${temperature === null ? '' : ` de ${Math.round(temperature)}°`}` : 'Atualização do modelo meteorológico'}</span></div>
          {dailyMode && probability !== null && <div className="weather-hero__probability"><Droplets size={15}/> {Math.round(probability)}% de chance de precipitação</div>}
        </div>
      </section>

      <div className="weather-detail-grid">
        <div className="weather-facts">
          <div className="weather-facts__heading"><div><span className="eyebrow">LEITURA DO TEMPO</span><h2>As condições em detalhe</h2></div><span className="weather-facts__units">°C · km/h · mm</span></div>
          <div className="metrics-grid">
            <MetricCard icon={Thermometer} label="Sensação térmica" value={feelsLike === null ? '—' : `${Math.round(feelsLike)}°`}/>
            <MetricCard icon={Droplets} label="Umidade do ar" value={humidity === null ? '—' : `${Math.round(humidity)}%`} tone="metric-card--blue"/>
            <MetricCard icon={Wind} label={dailyMode ? 'Vento máximo' : 'Velocidade do vento'} value={wind === null ? '—' : `${Math.round(wind)} km/h`} tone="metric-card--mint"/>
            <MetricCard icon={Gauge} label={dailyMode ? 'Rajadas máximas' : 'Rajadas de vento'} value={gusts === null ? '—' : `${Math.round(gusts)} km/h`} tone="metric-card--gold"/>
            <MetricCard icon={Droplets} label="Precipitação" value={precipitation === null ? '—' : `${precipitation.toFixed(1)} mm`} tone="metric-card--blue"/>
            {probability !== null && <MetricCard icon={Droplets} label="Chance de chuva" value={`${Math.round(probability)}%`}/>}
          </div>
        </div>
        <Suspense fallback={<div className="map-loading"><span className="loading-spinner"/> Carregando mapa…</div>}><MapPanel location={location} code={code} temperature={temperature} theme={theme}/></Suspense>
      </div>

      <TipsPanel temperature={temperature} feelsLike={feelsLike} humidity={humidity} precipitation={precipitation} wind={wind} weatherCode={code} uvIndex={uvIndex} latitude={location.latitude} timeScale={dailyMode ? 'daily' : 'current'}/>
    </>);
}
function averageForDate(times, values, date) {
    const dayValues = values.filter((value, index) => times[index]?.startsWith(date) === true && value !== null);
    return dayValues.length ? dayValues.reduce((sum, value) => sum + value, 0) / dayValues.length : null;
}
function ForecastDays({ forecast, onSelect }) {
    const { daily } = forecast;
    const days = daily.time.slice(1, 6).map((_, index) => index + 1);
    return (<section className="forecast-section">
      <div className="forecast-heading"><div><span className="eyebrow">CINCO DIAS À FRENTE</span><h2>O céu que vem aí</h2><p>Selecione um dia para abrir o panorama completo.</p></div><span className="forecast-heading__timezone"><Clock3 size={15}/> Horários locais · {forecast.timezone}</span></div>
      <div className="forecast-cards">
        {days.map((index) => {
            const code = daily.weather_code[index] ?? 0;
            const mood = describeWeather(code);
            const high = daily.temperature_2m_max[index];
            const low = daily.temperature_2m_min[index];
            const date = daily.time[index];
            const precipitation = daily.precipitation_sum[index];
            const probability = daily.precipitation_probability_max[index];
            return (<button className={`forecast-card forecast-card--${mood.mood}`} key={date} onClick={() => onSelect(index)} type="button">
              <span className="forecast-card__date">{index === 1 ? 'Amanhã' : formatIsoDate(date, { weekday: 'short' })}</span>
              <span className="forecast-card__day">{formatIsoDate(date, { day: 'numeric', month: 'short' })}</span>
              <span className="forecast-card__icon"><WeatherGlyph code={code} size={34}/></span>
              <span className="forecast-card__condition">{mood.label}</span>
              <span className="forecast-card__temps"><strong>{high === null ? '—' : `${Math.round(high)}°`}</strong><span>{low === null ? '—' : `${Math.round(low)}°`}</span></span>
              <span className="forecast-card__precipitation"><Droplets size={14} aria-hidden="true"/><span><small>Precipitação</small><strong>{precipitation === null ? '—' : `${precipitation.toFixed(1)} mm`}</strong></span></span>
              <span className="forecast-card__probability"><span>Chance de chuva</span><strong>{probability === null ? '—' : `${Math.round(probability)}%`}</strong></span>
              <span className="forecast-card__open">Ver detalhes <ArrowRight size={14}/></span>
            </button>);
        })}
      </div>
      <p className="forecast-note">Previsões são estimativas de modelos meteorológicos e podem mudar conforme novas atualizações.</p>
    </section>);
}
export function WeatherWorkspace({ location, forecast, loading, error, onBack, theme, onToggleTheme }) {
    const [tab, setTab] = useState('now');
    const [selectedDay, setSelectedDay] = useState(null);
    return (<div className="workspace-page">
      <header className="workspace-header page-shell">
        <button className="back-button" onClick={onBack} type="button"><ArrowLeft size={17}/> <span>Menu principal</span></button>
        <a className="workspace-brand" href="#" onClick={(event) => { event.preventDefault(); onBack(); }} aria-label="Voltar à página inicial">
          <img src="/seasons-logo.png" alt="Seasons"/>
        </a>
        <div className="workspace-location"><span className="workspace-location__pin"><MapPin size={16}/></span><span><small>CONSULTA PARA</small><strong>{location.name}</strong><em>{[location.admin1, location.country].filter(Boolean).join(', ')}</em></span></div>
        <ThemeToggle theme={theme} onToggle={onToggleTheme}/>
      </header>

      
      <main className="workspace-main page-shell">
        <div className="workspace-title-row">
          <div><span className="eyebrow">CLIMA EM PERSPECTIVA</span><h1>{location.name}<span>.</span></h1></div>
          <span className="workspace-full-location">{formatLocation(location)}</span>
        </div>
        <nav className="weather-tabs" aria-label="Tipo de consulta">
          <button className={tab === 'now' ? 'is-active' : ''} onClick={() => { setTab('now'); setSelectedDay(null); }} type="button"><Sun size={18}/> <span>Tempo atual</span></button>
          <button className={tab === 'forecast' ? 'is-active' : ''} onClick={() => { setTab('forecast'); setSelectedDay(null); }} type="button"><Wind size={18}/> <span>Previsão</span><small>5 dias</small></button>
          <button className={tab === 'history' ? 'is-active' : ''} onClick={() => { setTab('history'); setSelectedDay(null); }} type="button"><Clock3 size={18}/> <span>Histórico</span></button>
        </nav>

        {loading && <div className="loading-state"><span className="loading-spinner"/><div><strong>Buscando o céu da sua cidade</strong><p>Consultando as condições meteorológicas mais recentes…</p></div></div>}
        {!loading && error && <div className="error-state"><strong>Não conseguimos carregar os dados do clima.</strong><p>{error}</p><button onClick={onBack} type="button">Voltar à busca</button></div>}
        {!loading && !error && forecast && tab === 'now' && <WeatherDetail location={location} forecast={forecast} dayIndex={null} theme={theme}/>}
        {!loading && !error && forecast && tab === 'forecast' && (selectedDay === null
            ? <ForecastDays forecast={forecast} onSelect={setSelectedDay}/>
            : <section className="forecast-detail-view"><button className="inline-back inline-back--prominent" onClick={() => setSelectedDay(null)} type="button"><ArrowLeft size={18}/> Voltar aos cinco dias</button><WeatherDetail location={location} forecast={forecast} dayIndex={selectedDay} theme={theme}/></section>)}
        {!loading && !error && tab === 'history' && <Suspense fallback={<div className="history-loading"><span className="loading-spinner"/><div><strong>Preparando o histórico</strong><p>Carregando os gráficos e filtros…</p></div></div>}><HistoryPanel location={location}/></Suspense>}
      </main>

      <footer className="workspace-footer page-shell"><span>Temperaturas em °C · vento em km/h · precipitação em mm</span><span>Fonte meteorológica: <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a></span></footer>
    </div>);
}
