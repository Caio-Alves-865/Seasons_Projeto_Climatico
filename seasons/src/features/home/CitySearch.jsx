import { useEffect, useRef, useState } from 'react';
import { ArrowRight, MapPin, Search } from 'lucide-react';
import { searchCities } from '../../services/openMeteo';
/** Campo de busca com debounce, cancelamento de requisições antigas e seleção explícita da localidade. */
export function CitySearch({ onSelect, compact = false, initialQuery = '' }) {
    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);
    const submitRequested = useRef(false);
    useEffect(() => {
        // Aguarda a digitação estabilizar e cancela tanto o timer quanto o fetch da consulta anterior.
        if (query.trim().length < 2) {
            setResults([]);
            setMessage('');
            setLoading(false);
            return;
        }
        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            setLoading(true);
            setMessage('');
            try {
                const locations = await searchCities(query, controller.signal);
                if (controller.signal.aborted)
                    return;
                setResults(locations);
                setOpen(true);
                setMessage(locations.length ? '' : 'Não encontramos essa cidade. Pesquise pelo nome de uma cidade; estados e países não podem ser analisados.');
                if (submitRequested.current) {
                    submitRequested.current = false;
                    if (locations.length === 1)
                        selectLocation(locations[0]);
                    else if (locations.length > 1)
                        setMessage(`Encontramos ${locations.length} localidades. Selecione a cidade desejada.`);
                }
            }
            catch (error) {
                if (error instanceof DOMException && error.name === 'AbortError')
                    return;
                setResults([]);
                setMessage('Não foi possível buscar agora. Tente novamente em instantes.');
            }
            finally {
                if (!controller.signal.aborted)
                    setLoading(false);
            }
        }, 320);
        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [query]);
    useEffect(() => {
        function closeOnOutsideClick(event) {
            if (rootRef.current && !rootRef.current.contains(event.target))
                setOpen(false);
        }
        document.addEventListener('mousedown', closeOnOutsideClick);
        return () => document.removeEventListener('mousedown', closeOnOutsideClick);
    }, []);
    function handleSubmit(event) {
        event.preventDefault();
        if (query.trim().length < 2) {
            setMessage('Digite ao menos duas letras para pesquisar.');
            setOpen(true);
            return;
        }
        // Se a busca ainda está em andamento (ou aguardando o debounce), conclui a ação assim que houver resultado.
        if (loading || (!results.length && !message)) {
            submitRequested.current = true;
            setOpen(true);
            return;
        }
        // Quando há apenas uma correspondência, o botão conclui a busca e abre o clima dessa cidade.
        if (results.length === 1) {
            selectLocation(results[0]);
            return;
        }
        // Com várias correspondências, mantém a lista aberta para evitar selecionar a cidade errada.
        setOpen(true);
        if (results.length > 1) {
            setMessage(`Encontramos ${results.length} localidades. Selecione a cidade desejada.`);
        }
        else if (loading) {
            setMessage('Aguarde: estamos procurando a cidade.');
        }
    }
    function selectLocation(location) {
        setQuery([location.name, location.admin1, location.country].filter(Boolean).join(', '));
        setOpen(false);
        onSelect(location);
    }
    return (<div className={`city-search ${compact ? 'city-search--compact' : ''}`} ref={rootRef}>
        <form className="search-form" onSubmit={handleSubmit} role="search">
            <Search aria-hidden="true" className="search-form__icon" size={20} />
            <input aria-label="Pesquisar cidade" aria-autocomplete="list" aria-controls="city-suggestions" aria-expanded={open && results.length > 0} autoComplete="off" onChange={(event) => {
                submitRequested.current = false;
                setQuery(event.target.value);
                setResults([]);
                setMessage('');
                setLoading(false);
                setOpen(true);
            }} onFocus={() => results.length && setOpen(true)} placeholder="Digite o nome de uma cidade (Ex: São Paulo)" role="combobox" value={query} />
            <button className="search-form__submit" aria-label="Pesquisar cidades" type="submit">
                <span className="search-form__submit-label">{loading ? 'Buscando' : 'Buscar clima'}</span>
                <span className="search-form__submit-label-short">{loading ? 'Aguarde' : 'Buscar'}</span>
                <ArrowRight aria-hidden="true" size={17} />
            </button>
        </form>
        {(open && (results.length > 0 || loading || message)) && (<div className="suggestion-panel" id="city-suggestions" role="listbox" aria-label="Cidades encontradas">
            {loading && <div className="suggestion-panel__status">Procurando localidades…</div>}
            {message && <div className="suggestion-panel__status" role="status">{message}</div>}
            {!loading && results.map((location) => (<button aria-label={`Selecionar ${[location.name, location.admin1, location.country].filter(Boolean).join(', ')}`} className="suggestion-option" key={`${location.id}-${location.latitude}-${location.longitude}`} onClick={() => selectLocation(location)} role="option" type="button">
                <span className="suggestion-option__pin"><MapPin size={17} aria-hidden="true" /></span>
                <span className="suggestion-option__copy">
                    <strong>{location.name}</strong>
                    <small>{[location.admin1, location.country].filter(Boolean).join(', ')}</small>
                </span>
            </button>))}
        </div>)}
    </div>);
}
