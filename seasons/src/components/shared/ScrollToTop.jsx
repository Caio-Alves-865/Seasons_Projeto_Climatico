import { useEffect, useState } from 'react';
import { ArrowUp, Leaf } from 'lucide-react';

/** Atalho global para retornar ao topo, disponível em todas as telas do Seasons. */
export function ScrollToTop() {
    const [isVisible, setIsVisible] = useState(false);

    // Acompanha a rolagem da janela independentemente da página atualmente exibida.
    useEffect(() => {
        const updateVisibility = () => setIsVisible(window.scrollY > 360);
        updateVisibility();
        window.addEventListener('scroll', updateVisibility, { passive: true });
        return () => window.removeEventListener('scroll', updateVisibility);
    }, []);

    function scrollToTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    return (
        <button
            type="button"
            className={`scroll-top ${isVisible ? 'is-visible' : ''}`}
            onClick={scrollToTop}
            aria-label="Voltar ao topo"
            aria-hidden={!isVisible}
            tabIndex={isVisible ? 0 : -1}
            title="Voltar ao topo"
        >
            <Leaf className="scroll-top__leaf" size={15} aria-hidden="true" />
            <ArrowUp className="scroll-top__arrow" size={17} aria-hidden="true" />
            <span>Topo</span>
        </button>
    );
}
