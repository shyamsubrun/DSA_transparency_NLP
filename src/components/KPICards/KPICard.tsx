import { ReactNode } from 'react';
import styles from './KPICard.module.css';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'primary' | 'accent' | 'success' | 'warning' | 'error';
  delay?: number;
}

export function KPICard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  trend,
  color = 'primary',
  delay = 0 
}: KPICardProps) {
  return (
    <div 
      className={`${styles.card} ${styles[color]}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={styles.iconWrapper}>
        {icon}
      </div>
      <div className={styles.content}>
        <p className={styles.title}>{title}</p>
        <p className={styles.value}>{value}</p>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        {trend && (
          <div className={`${styles.trend} ${trend.isPositive ? styles.trendUp : styles.trendDown}`}>
            <span>{trend.isPositive ? '↑' : '↓'}</span>
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

