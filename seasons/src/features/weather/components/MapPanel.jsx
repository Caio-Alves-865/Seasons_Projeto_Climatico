import { useEffect, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, ZoomControl } from 'react-leaflet';
import { ExternalLink, MapPin } from 'lucide-react';
import { describeWeather, formatLocation } from '../../../utils/weather';
import { WeatherGlyph } from './WeatherGlyph';
export function MapPanel({ location, code, temperature, theme }) {
    const [tilesUnavailable, setTilesUnavailable] = useState(false);
    const tileErrorCount = useRef(0);
    const tileFallbackTimer = useRef(null);
    const weather = describeWeather(code);
    const coordinates = [location.latitude, location.longitude];
    const polar = Math.abs(location.latitude) >= 66;
    const darkMap = theme === 'dark';
    const streetAttribution = 'Tiles &copy; <a href="https://www.arcgis.com/home/item.html?id=3b93337983e9436f8db950e38a8629af" target="_blank" rel="noreferrer">Esri</a> — Sources: Esri, HERE, Garmin, USGS, Intermap, INCREMENT P, NRCan, Esri Japan, METI, Esri China (Hong Kong), Esri Korea, Esri (Thailand), NGCC, &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>, GIS User Community';
    const darkBaseAttribution = 'Tiles &copy; <a href="https://www.arcgis.com/home/item.html?id=a284a9b99b3446a3910d4144a50990f6" target="_blank" rel="noreferrer">Esri Dark Gray Base</a>, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>, GIS user community';
    const darkReferenceAttribution = 'Labels &copy; <a href="https://www.arcgis.com/home/item.html?id=233a6a2fe58e444296b30512e1bcbb42" target="_blank" rel="noreferrer">Esri Dark Gray Reference</a>, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>, GIS user community';
    const externalMapUrl = `https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=${polar ? 5 : 12}/${location.latitude}/${location.longitude}`;
    useEffect(() => {
        // Reseta as falhas ao trocar de local ou tema: cada camada de tiles precisa ser avaliada de forma independente.
        tileErrorCount.current = 0;
        if (tileFallbackTimer.current !== null) {
            window.clearTimeout(tileFallbackTimer.current);
            tileFallbackTimer.current = null;
        }
        setTilesUnavailable(false);
        return () => {
            if (tileFallbackTimer.current !== null)
                window.clearTimeout(tileFallbackTimer.current);
        };
    }, [location.latitude, location.longitude, theme]);
    function handleTileLoad() {
        tileErrorCount.current = 0;
        if (tileFallbackTimer.current !== null) {
            window.clearTimeout(tileFallbackTimer.current);
            tileFallbackTimer.current = null;
        }
    }
    function handleTileError() {
        tileErrorCount.current += 1;
        if (tileErrorCount.current < 4 || tileFallbackTimer.current !== null)
            return;
        tileFallbackTimer.current = window.setTimeout(() => {
            tileFallbackTimer.current = null;
            if (tileErrorCount.current >= 4)
                setTilesUnavailable(true);
        }, 1800);
    }
    return (<section className="map-panel" aria-label={`Mapa de ${formatLocation(location)}`}>
      <div className="map-panel__map">
        {tilesUnavailable ? (<div className="map-tile-fallback">
            <div className="map-tile-fallback__grid" aria-hidden="true"/>
            <div className="map-tile-fallback__marker"><MapPin size={25} aria-hidden="true"/><strong>{location.name}</strong><span>{location.latitude.toFixed(3)}°, {location.longitude.toFixed(3)}°</span></div>
            <a href={externalMapUrl} target="_blank" rel="noreferrer">Abrir mapa <ExternalLink size={14} aria-hidden="true"/></a>
          </div>) : (<MapContainer center={coordinates} zoom={polar ? 5 : 12} scrollWheelZoom={false} zoomControl={false} className="location-map" key={`${location.latitude}-${location.longitude}`}>
            <TileLayer attribution={darkMap ? darkBaseAttribution : streetAttribution} url={darkMap
                ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
                : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'} maxZoom={19} eventHandlers={{ tileload: handleTileLoad, tileerror: handleTileError }}/>
            {darkMap && <TileLayer attribution={darkReferenceAttribution} url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}" maxZoom={19} eventHandlers={{ tileload: handleTileLoad, tileerror: handleTileError }}/>}
            <ZoomControl position="topright"/>
            <CircleMarker center={coordinates} radius={9} pathOptions={{ color: '#ffffff', weight: 4, fillColor: '#f29536', fillOpacity: 1 }}>
              <Popup>{formatLocation(location)}</Popup>
            </CircleMarker>
          </MapContainer>)}
        <div className="map-weather-chip">
          <WeatherGlyph code={code} size={24}/>
          <span><strong>{temperature === null ? '—' : `${Math.round(temperature)}°`}</strong><small>{weather.label}</small></span>
        </div>
        <div className="map-location-chip"><MapPin size={15} aria-hidden="true"/> {location.name}</div>
      </div>
      <div className="map-panel__caption">
        <span className="map-panel__caption-dot"/>
        <span>Mapa da região consultada</span>
        <span className="map-panel__caption-coordinates">{location.latitude.toFixed(3)}°, {location.longitude.toFixed(3)}°</span>
      </div>
    </section>);
}
