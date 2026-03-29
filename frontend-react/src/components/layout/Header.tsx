import { Shield, Moon, Sun, Clock } from 'lucide-react';
import { useClock } from '../../hooks/useClock';
import { useTheme } from '../../hooks/useTheme';
import { Badge } from '../ui/Badge';
import styles from './Header.module.css';

interface HeaderProps {
  threatCount: number;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Header({ threatCount, activeTab, onTabChange }: HeaderProps) {
  const clockStr = useClock();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <Shield size={22} className={styles.logoIcon} />
        AEGIS
      </div>

      <nav className={styles.navTabs}>
        {['Overview', 'Defense Map', 'Endpoints', 'Forensics'].map((tab) => (
          <div
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`${styles.navItem} ${activeTab === tab ? styles.active : ''}`}
          >
            {tab}
          </div>
        ))}
      </nav>

      <div className={styles.rightControls}>
        <Badge variant={threatCount > 0 ? 'critical' : 'live'}>
          {threatCount > 0 ? `${threatCount} THREATS` : 'SECURE'}
        </Badge>
        
        <div className={styles.clock}>
          <Clock size={14} />
          {clockStr}
        </div>

        <button 
          className={styles.iconBtn} 
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}
