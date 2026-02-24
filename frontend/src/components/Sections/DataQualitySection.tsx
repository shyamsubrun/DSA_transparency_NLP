import { AlertTriangle } from 'lucide-react';
import { useFilteredData } from '../../hooks/useFilteredData';
import { ChartWithExport } from '../Charts/ChartWithExport';
import { baseChartOptions } from '../../utils/chartConfig';
import styles from './Section.module.css';

export function DataQualitySection() {
  const { data } = useFilteredData();

  // Calculate missing values per field
  const fields = [
    { key: 'application_date', label: 'Application Date' },
    { key: 'content_date', label: 'Content Date' },
    { key: 'platform_name', label: 'Platform' },
    { key: 'category', label: 'Category' },
    { key: 'decision_type', label: 'Decision Type' },
    { key: 'decision_ground', label: 'Decision Ground' },
    { key: 'incompatible_content_ground', label: 'Incompatible Ground' },
    { key: 'content_type', label: 'Content Type' },
    { key: 'country', label: 'Country' },
    { key: 'language', label: 'Language' },
  ];

  const missingData = fields.map(field => {
    const missing = data.filter(d => {
      const value = d[field.key as keyof typeof d];
      return value === null || value === undefined || value === '';
    }).length;
    return {
      ...field,
      missing,
      rate: data.length > 0 ? Math.round((missing / data.length) * 100 * 10) / 10 : 0,
      complete: data.length - missing,
    };
  });

  // Sort by missing rate descending
  const sortedMissingData = [...missingData].sort((a, b) => b.rate - a.rate);

  // Bar chart for missing values
  const missingBarOption = {
    ...baseChartOptions,
    grid: { ...baseChartOptions.grid, left: '25%' },
    xAxis: {
      type: 'value',
      max: 100,
      axisLine: { show: false },
      axisLabel: { color: '#64748b', fontSize: 11, formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    yAxis: {
      type: 'category',
      data: sortedMissingData.map(d => d.label).reverse(),
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#1e293b', fontSize: 11 },
    },
    series: [{
      type: 'bar',
      data: sortedMissingData.map(d => ({
        value: d.rate,
        itemStyle: { 
          color: d.rate > 10 ? '#ef4444' : d.rate > 5 ? '#f59e0b' : '#10b981',
          borderRadius: [0, 4, 4, 0],
        },
      })).reverse(),
      barWidth: '60%',
      label: {
        show: true,
        position: 'right',
        color: '#64748b',
        fontSize: 11,
        formatter: (params: { value: number }) => `${params.value}%`,
      },
    }],
  };

  // Completeness gauge
  const totalFields = data.length * fields.length;
  const totalMissing = missingData.reduce((sum, d) => sum + d.missing, 0);
  const completenessRate = totalFields > 0 
    ? Math.round(((totalFields - totalMissing) / totalFields) * 100 * 10) / 10 
    : 100;

  const gaugeOption = {
    series: [{
      type: 'gauge',
      startAngle: 180,
      endAngle: 0,
      min: 0,
      max: 100,
      splitNumber: 5,
      radius: '90%',
      center: ['50%', '70%'],
      axisLine: {
        lineStyle: {
          width: 20,
          color: [
            [0.6, '#ef4444'],
            [0.8, '#f59e0b'],
            [1, '#10b981'],
          ],
        },
      },
      pointer: {
        icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
        length: '50%',
        width: 8,
        offsetCenter: [0, '-30%'],
        itemStyle: { color: '#1e293b' },
      },
      axisTick: {
        length: 8,
        lineStyle: { color: 'auto', width: 2 },
      },
      splitLine: {
        length: 15,
        lineStyle: { color: 'auto', width: 3 },
      },
      axisLabel: {
        color: '#64748b',
        fontSize: 12,
        distance: -40,
        formatter: '{value}%',
      },
      title: {
        offsetCenter: [0, '10%'],
        fontSize: 14,
        color: '#64748b',
      },
      detail: {
        fontSize: 32,
        fontWeight: 700,
        offsetCenter: [0, '-10%'],
        valueAnimation: true,
        formatter: '{value}%',
        color: completenessRate >= 80 ? '#10b981' : completenessRate >= 60 ? '#f59e0b' : '#ef4444',
      },
      data: [{ value: completenessRate, name: 'Data Completeness' }],
    }],
  };

  // Find records with missing critical fields
  const criticalFields = ['platform_name', 'category', 'decision_type', 'decision_ground'];
  const incompleteRecords = data.filter(record => 
    criticalFields.some(field => {
      const value = record[field as keyof typeof record];
      return value === null || value === undefined || value === '';
    })
  ).slice(0, 10);

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <AlertTriangle className={styles.headerIcon} size={24} />
        <div>
          <h2 className={styles.title}>Data Quality</h2>
          <p className={styles.subtitle}>Monitor data completeness and identify gaps</p>
        </div>
      </div>

      <div className={`${styles.chartGrid} ${styles.chartGrid2}`}>
        <ChartWithExport
          title="Missing Values by Field"
          subtitle="Percentage of records with missing data"
          option={missingBarOption}
          containerSize="default"
        />
        <ChartWithExport
          title="Overall Data Completeness"
          subtitle="Aggregate quality score"
          option={gaugeOption}
          containerSize="default"
        />

        <div className={`${styles.chartCard} ${styles.chartCardFull}`}>
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.chartTitle}>Records with Missing Critical Data</h3>
              <p className={styles.chartSubtitle}>Sample of incomplete entries (showing up to 10)</p>
            </div>
          </div>
          
          {incompleteRecords.length > 0 ? (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Date</th>
                    <th>Platform</th>
                    <th>Category</th>
                    <th>Decision Type</th>
                    <th>Decision Ground</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {incompleteRecords.map(record => (
                    <tr key={record.id}>
                      <td>{record.id}</td>
                      <td>{record.application_date}</td>
                      <td>
                        {record.platform_name || <span className={styles.missingBadge}>Missing</span>}
                      </td>
                      <td>
                        {record.category || <span className={styles.missingBadge}>Missing</span>}
                      </td>
                      <td>
                        {record.decision_type || <span className={styles.missingBadge}>Missing</span>}
                      </td>
                      <td>
                        {record.decision_ground 
                          ? (record.decision_ground.length > 30 
                              ? record.decision_ground.substring(0, 30) + '...' 
                              : record.decision_ground)
                          : <span className={styles.missingBadge}>Missing</span>
                        }
                      </td>
                      <td>
                        <span className={styles.missingBadge}>Incomplete</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <span className={styles.completeBadge} style={{ fontSize: '14px', padding: '8px 16px' }}>
                ✓ All records complete
              </span>
              <p style={{ marginTop: '12px' }}>No records with missing critical fields found.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

