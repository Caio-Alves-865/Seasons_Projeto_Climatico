import { describeWeather } from '../../../utils/weather';
export function WeatherGlyph({ code, isDay = true, size = 30, className = '' }) {
    const weather = describeWeather(code, isDay);
    const Icon = weather.icon;
    return <Icon aria-hidden="true" className={`weather-glyph weather-glyph--${weather.mood} ${className}`} size={size} strokeWidth={1.7}/>;
}
