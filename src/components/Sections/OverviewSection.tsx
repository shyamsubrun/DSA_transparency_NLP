import { Activity, Building2, Clock, Bot, Globe, Scale } from 'lucide-react';
import { useFilteredData } from '../../hooks/useFilteredData';
import { KPICard } from '../KPICards/KPICard';
import styles from './Section.module.css';

export function OverviewSection() {
  const { stats } = useFilteredData();

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <Activity className={styles.headerIcon} size={24} />
        <div>
          <h2 className={styles.title}>Overview</h2>
          <p className={styles.subtitle}>Key performance indicators across all moderation activities</p>
        </div>
      </div>

      <div className={styles.kpiGrid}>
        <KPICard
          title="Total Actions"
          value={stats.totalActions.toLocaleString()}
          subtitle="Moderation decisions"
          icon={<Activity size={24} />}
          color="primary"
          delay={0}
        />
        <KPICard
          title="Platforms"
          value={stats.platformCount}
          subtitle="Active platforms"
          icon={<Building2 size={24} />}
          color="accent"
          delay={50}
        />
        <KPICard
          title="Avg. Delay"
          value={`${stats.averageDelay} days`}
          subtitle="Content to action"
          icon={<Clock size={24} />}
          color="warning"
          delay={100}
        />
        <KPICard
          title="Auto Detection"
          value={`${stats.automatedDetectionRate}%`}
          subtitle="AI-detected content"
          icon={<Bot size={24} />}
          color="success"
          delay={150}
        />
        <KPICard
          title="Auto Decision"
          value={`${stats.automatedDecisionRate}%`}
          subtitle="Automated decisions"
          icon={<Scale size={24} />}
          color="primary"
          delay={200}
        />
        <KPICard
          title="Countries"
          value={stats.countryCount}
          subtitle="EU member states"
          icon={<Globe size={24} />}
          color="accent"
          delay={250}
        />
      </div>
    </section>
  );
}

