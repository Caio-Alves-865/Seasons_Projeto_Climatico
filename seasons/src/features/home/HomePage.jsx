import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import rainImage from '../../../assets/images/seasons/rain.webp';
import sunImage from '../../../assets/images/seasons/sun.webp';
import snowImage from '../../../assets/images/seasons/snow.webp';
import autumnImage from '../../../assets/images/seasons/autumn.webp';
import { ThemeToggle } from '../../components/shared/ThemeToggle';
import { CitySearch } from './CitySearch';
// Os WebP locais entram no build do Vite; assim, o carrossel não depende de um pedido remoto para trocar de foto.
const slides = [
    {
        image: rainImage,
        alt: 'Estrada rural em vale montanhoso sob nuvens carregadas de chuva.',
        label: 'Chuva',
    },
    {
        image: sunImage,
        alt: 'Prado alpino com flores amarelas, cabanas e montanhas ao fundo.',
        label: 'Sol',
        objectPosition: 'center 58%',
    },
    {
        image: snowImage,
        alt: 'Floresta coberta de neve com montanhas ao fundo.',
        label: 'Neve',
    },
    {
        image: autumnImage,
        alt: 'Caminho de bosque coberto por folhas douradas no outono.',
        label: 'Outono',
        objectPosition: 'center 64%',
    },
];
export function HomePage({ onSelectLocation, initialQuery = '', theme, onToggleTheme }) {
    const [activeSlide, setActiveSlide] = useState(0);
    const [pendingSlide, setPendingSlide] = useState(null);
    const [preloadError, setPreloadError] = useState(false);
    const loadedImages = useRef(new Set([slides[0].image]));
    const failedImages = useRef(new Set());
    const pendingSlideRef = useRef(null);
    const slide = slides[activeSlide];

    useEffect(() => {
        // Baixa e decodifica os quadros em segundo plano; se a pessoa clicar antes, o atual permanece visível até o próximo estar pronto.
        let cancelled = false;
        const preloads = slides.slice(1).map((item, offset) => {
            const slideIndex = offset + 1;
            const image = new Image();
            image.decoding = 'async';
            const markReady = () => {
                if (cancelled)
                    return;
                loadedImages.current.add(item.image);
                if (pendingSlideRef.current === slideIndex) {
                    pendingSlideRef.current = null;
                    setActiveSlide(slideIndex);
                    setPendingSlide(null);
                    setPreloadError(false);
                }
            };
            const markFailed = () => {
                if (cancelled)
                    return;
                failedImages.current.add(item.image);
                if (pendingSlideRef.current === slideIndex) {
                    pendingSlideRef.current = null;
                    setPendingSlide(null);
                    setPreloadError(true);
                }
            };
            image.onload = () => {
                if (typeof image.decode === 'function') {
                    void image.decode().then(markReady).catch(markFailed);
                }
                else {
                    markReady();
                }
            };
            image.onerror = markFailed;
            image.src = item.image;
            return image;
        });
        return () => {
            cancelled = true;
            preloads.forEach((image) => {
                image.onload = null;
                image.onerror = null;
            });
        };
    }, []);
    const showSlide = useCallback((index) => {
        const nextIndex = (index + slides.length) % slides.length;
        if (nextIndex === activeSlide && pendingSlideRef.current === null)
            return;
        // Não substitui o <img> enquanto a imagem de destino ainda está baixando.
        if (loadedImages.current.has(slides[nextIndex].image)) {
            pendingSlideRef.current = null;
            setPendingSlide(null);
            setPreloadError(false);
            setActiveSlide(nextIndex);
            return;
        }
        if (failedImages.current.has(slides[nextIndex].image)) {
            pendingSlideRef.current = null;
            setPendingSlide(null);
            setPreloadError(true);
            return;
        }
        pendingSlideRef.current = nextIndex;
        setPendingSlide(nextIndex);
        setPreloadError(false);
    }, [activeSlide]);
    useEffect(() => {
        if (pendingSlide !== null || preloadError)
            return;
        // O intervalo começa de novo após cada troca ou seleção manual.
        const timer = window.setTimeout(() => showSlide(activeSlide + 1), 4000);
        return () => window.clearTimeout(timer);
    }, [activeSlide, pendingSlide, preloadError, showSlide]);
    const loadingMessage = pendingSlide !== null
        ? `Carregando foto de ${slides[pendingSlide].label}.`
        : preloadError
            ? 'Não foi possível carregar essa foto; a imagem atual foi mantida.'
            : `Imagem ${activeSlide + 1} de ${slides.length}: ${slides[activeSlide].label}.`;
    return (<div className="home-page">
        <header className="site-header">
            <a className="brand-lockup" href="#inicio" aria-label="Seasons — início">
                <img className="brand-lockup__image" src="/seasons-logo.png" alt="Seasons" />
            </a>
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </header>

        <main id="inicio" className="home-main">
            <section className="search-section page-shell" id="pesquisa" aria-labelledby="home-title">
                <div className="search-section__heading">
                    <div>
                        <h1 id="home-title">Consulte o tempo de qualquer cidade do Mundo</h1>
                        <p>Tenha uma visão sobre o clima da cidade que desejar</p>
                    </div>
                </div>
                <CitySearch onSelect={onSelectLocation} initialQuery={initialQuery} />
            </section>

            <section className="hero-carousel page-shell" aria-label="Imagens das estações e condições do tempo" aria-roledescription="carrossel" aria-busy={pendingSlide !== null}>
                <img key={slide.image} className="hero-carousel__image" src={slide.image} alt={slide.alt} decoding="async" fetchPriority="high" loading="eager" style={{ objectPosition: slide.objectPosition ?? 'center' }} />
                <div className="hero-carousel__controls">
                    <button type="button" aria-label="Imagem anterior" onClick={() => showSlide(activeSlide - 1)}><ArrowLeft size={20} /></button>
                    <div className="hero-carousel__dots" aria-label={`Imagem ${activeSlide + 1} de ${slides.length}`}>
                        {slides.map((item, index) => (<button type="button" key={item.label} className={activeSlide === index ? 'is-active' : ''} aria-label={`Mostrar imagem de ${item.label.toLowerCase()}`} aria-current={activeSlide === index ? 'true' : undefined} onClick={() => showSlide(index)} />))}
                    </div>
                    <button type="button" aria-label="Próxima imagem" onClick={() => showSlide(activeSlide + 1)}><ArrowRight size={20} /></button>
                    <span className="sr-only" aria-live={pendingSlide !== null ? 'polite' : 'off'}>{loadingMessage}</span>
                </div>
            </section>
        </main>

        <footer className="site-footer page-shell">
            <a className="brand-lockup brand-lockup--footer" href="#inicio" aria-label="Voltar ao início Seasons">
                <img className="brand-lockup__image" src="/seasons-logo.png" alt="" />
            </a>
            <div className="site-footer__credits">
                <span>Desenvolvido por <strong>Caio Alves de Vasconcelos</strong></span>
                <span>API climática: <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a></span>
                <span>Endpoint de Geolocalização: <a href="https://www.geonames.org/" target="_blank" rel="noreferrer">GeoNames</a></span>
            </div>
        </footer>

    </div>);
}
