import React from 'react';
import ReactDOM from 'react-dom/client';
import 'leaflet/dist/leaflet.css'; // biblioteca para o mapa interativo
import './styles/base.css';
import './styles/theme.css';
import App from './app/App';
ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode>
    <App />
  </React.StrictMode>);
