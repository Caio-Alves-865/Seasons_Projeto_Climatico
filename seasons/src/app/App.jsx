import { lazy, Suspense, useEffect, useState } from 'react';
import { getForecast } from '../services/openMeteo';
import { HomePage } from '../features/home/HomePage';
import { ScrollToTop } from '../components/shared/ScrollToTop';
const WeatherWorkspace = lazy(() => import('../features/weather/WeatherWorkspace').then((module) => ({ default: module.WeatherWorkspace })));
// Executa na inicialização do state: lê o tema salvo antes da primeira pintura e reduz o flash de cores.
function getSavedTheme() {
    let theme = 'light';
    try {
        theme = window.localStorage.getItem('seasons-theme') === 'dark' ? 'dark' : 'light';
    }
    catch {
        theme = 'light';
    }
    if (typeof document !== 'undefined')
        document.documentElement.dataset.theme = theme;
    return theme;
}
/** Componente raiz: concentra o estado compartilhado e coordena a navegação entre telas. */
export default function App() {
    const [location, setLocation] = useState(null);
    const [forecast, setForecast] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [page, setPage] = useState('home');
    const [searchSeed, setSearchSeed] = useState('');
    const [theme, setTheme] = useState(getSavedTheme);
    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        try {
            window.localStorage.setItem('seasons-theme', theme);
        }
        catch {
            // O tema continua valendo durante esta visita mesmo sem acesso ao armazenamento local.
        }
    }, [theme]);
    useEffect(() => {
        if (!location)
            return;
        const controller = new AbortController();
        setLoading(true);
        setError('');
        setForecast(null);
        // Se a cidade mudar, o cleanup cancela a consulta antiga para ela não substituir dados da seleção mais recente.
        getForecast(location, controller.signal)
            .then((data) => setForecast(data))
            .catch((requestError) => {
            if (requestError instanceof DOMException && requestError.name === 'AbortError')
                return;
            setError(requestError instanceof Error ? requestError.message : 'Falha ao consultar o serviço meteorológico.');
        })
            .finally(() => {
            if (!controller.signal.aborted)
                setLoading(false);
        });
        return () => controller.abort();
    }, [location]);
    function selectLocation(nextLocation) {
        setLocation(nextLocation);
        setPage('weather');
        setSearchSeed('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    function returnToSearch() {
        // O formulário é remontado ao voltar do painel; não reaproveita a cidade consultada anteriormente.
        setSearchSeed('');
        setPage('home');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    function toggleTheme() {
        setTheme((current) => current === 'light' ? 'dark' : 'light');
    }
    return (<div className="app-shell" data-theme={theme}>
      {page === 'home'
            ? <HomePage onSelectLocation={selectLocation} initialQuery={searchSeed} theme={theme} onToggleTheme={toggleTheme}/>
            : location
                ? <Suspense fallback={<div className="loading-state page-shell"><span className="loading-spinner"/><strong>Preparando sua consulta climática…</strong></div>}><WeatherWorkspace location={location} forecast={forecast} loading={loading} error={error} onBack={returnToSearch} theme={theme} onToggleTheme={toggleTheme}/></Suspense>
                : <HomePage onSelectLocation={selectLocation} theme={theme} onToggleTheme={toggleTheme}/>}
      <ScrollToTop />
    </div>);
}
