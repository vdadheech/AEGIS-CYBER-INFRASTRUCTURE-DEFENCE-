import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './Panel.module.css';

interface PanelProps {
  title: string;
  children: ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  headerRight?: ReactNode;
  className?: string;
  bodyClassName?: string;
  bodyStyle?: React.CSSProperties;
  ariaLabel?: string;
}

export function Panel({
  title,
  children,
  collapsible = false,
  defaultExpanded = true,
  headerRight,
  className = '',
  bodyClassName = '',
  bodyStyle,
  ariaLabel,
}: PanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const handleToggle = () => {
    if (collapsible) setExpanded((prev) => !prev);
  };

  return (
    <section
      className={`${styles.panel} ${className}`}
      aria-label={ariaLabel || title}
      role="region"
    >
      <div
        className={`${styles.header} ${collapsible ? styles.clickable : ''}`}
        onClick={handleToggle}
        role={collapsible ? 'button' : undefined}
        tabIndex={collapsible ? 0 : undefined}
        aria-expanded={collapsible ? expanded : undefined}
        onKeyDown={
          collapsible
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleToggle();
                }
              }
            : undefined
        }
      >
        <span className={styles.title}>{title}</span>
        <div className={styles.headerRight}>
          {headerRight}
          {collapsible && (
            <span
              className={`${styles.arrow} ${!expanded ? styles.collapsed : ''}`}
              aria-hidden="true"
            >
              <ChevronDown size={16} strokeWidth={2.5} />
            </span>
          )}
        </div>
      </div>
      <div
        className={`${styles.body} ${!expanded ? styles.bodyCollapsed : ''} ${bodyClassName}`}
        style={bodyStyle}
      >
        {children}
      </div>
    </section>
  );
}
