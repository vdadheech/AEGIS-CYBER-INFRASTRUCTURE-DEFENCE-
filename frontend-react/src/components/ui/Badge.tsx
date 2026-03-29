import type { ReactNode } from 'react';
import styles from './Badge.module.css';

export type BadgeVariant = 'live' | 'healthy' | 'warning' | 'critical' | 'quarantined';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

export function Badge({ variant = 'healthy', children, className = '' }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[variant]} ${className}`}>
      <span className={styles.dot} aria-hidden="true" />
      {children}
    </span>
  );
}
