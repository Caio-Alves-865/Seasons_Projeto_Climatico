import { Moon, Sun } from 'lucide-react';
export function ThemeToggle({ theme, onToggle }) {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    const nextLabel = nextTheme === 'dark' ? 'escuro' : 'claro';
    return (<button className="theme-toggle" type="button" onClick={onToggle} aria-label={`Ativar tema ${nextLabel}`} aria-pressed={theme === 'dark'} title={`Ativar tema ${nextLabel}`}>
      {theme === 'dark' ? <Sun size={18} aria-hidden="true"/> : <Moon size={18} aria-hidden="true"/>}
      <span>Tema {nextLabel}</span>
    </button>);
}
