import { AlertTriangle, Droplets, Shirt, Umbrella } from 'lucide-react';
import { getWeatherRecommendations } from '../../../utils/recommendations';
export function TipsPanel({ temperature, feelsLike, humidity, precipitation, wind, weatherCode, uvIndex, latitude, timeScale }) {
    const recommendations = getWeatherRecommendations({
        temperature,
        feelsLike,
        humidity,
        precipitation,
        wind,
        weatherCode,
        uvIndex,
        latitude,
        timeScale,
    });
    return (<section className="tips-panel" aria-labelledby="tips-title">
      <div className="tips-panel__heading">
        <div>
          <span className="eyebrow">UM GUIA PARA O SEU DIA</span>
          <h2 id="tips-title">Recomendações para estas condições</h2>
        </div>
        {recommendations.showAlert && <span className="safety-pill"><AlertTriangle size={15} aria-hidden="true"/> Atenção às condições</span>}
      </div>
      <div className="tips-grid">
        <article className="tip-card">
          <span className="tip-card__icon tip-card__icon--clothing"><Shirt size={20} aria-hidden="true"/></span>
          <div><h3>O que vestir</h3><p>{recommendations.clothing}</p></div>
        </article>
        <article className="tip-card">
          <span className="tip-card__icon tip-card__icon--water"><Droplets size={20} aria-hidden="true"/></span>
          <div><h3>Hidratação</h3><p>{recommendations.hydration}</p></div>
        </article>
        <article className={`tip-card tip-card--wide ${recommendations.showAlert ? 'tip-card--warning' : ''}`}>
          <span className={`tip-card__icon ${recommendations.showAlert ? 'tip-card__icon--alert' : 'tip-card__icon--rain'}`}>
            {recommendations.showAlert ? <AlertTriangle size={20} aria-hidden="true"/> : <Umbrella size={20} aria-hidden="true"/>}
          </span>
          <div><h3>{recommendations.safetyHeading}</h3><p>{recommendations.safety}</p></div>
        </article>
      </div>
      {recommendations.dataNote && <p className="tips-data-note" role="note">{recommendations.dataNote}</p>}
      <p className="tips-disclaimer">Sugestões gerais baseadas nos dados meteorológicos disponíveis. Não substituem protocolos locais, alertas oficiais nem aconselhamento médico.</p>
    </section>);
}
