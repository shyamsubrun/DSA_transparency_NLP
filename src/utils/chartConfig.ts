// ECharts configuration utilities and color palettes

export const CHART_COLORS = [
  '#1e3a5f', // Primary navy
  '#0d9488', // Teal accent
  '#8b5cf6', // Purple
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#6366f1', // Indigo
  '#84cc16', // Lime
];

// Known platform colors (for popular platforms)
const KNOWN_PLATFORM_COLORS: Record<string, string> = {
  'Meta': '#1877f2',
  'TikTok': '#ff0050',
  'X': '#1da1f2',
  'Twitter': '#1da1f2',
  'YouTube': '#ff0000',
  'LinkedIn': '#0a66c2',
  'Snapchat': '#fffc00',
  'Pinterest': '#bd081c',
  'Amazon': '#ff9900',
  'Google Shopping': '#4285f4',
  'Temu': '#ff6b00',
  'AliExpress': '#ff6600',
  'Shopify': '#96bf48',
  'eBay': '#0064d2',
};

// Known decision type colors
const KNOWN_DECISION_TYPE_COLORS: Record<string, string> = {
  'Removal': '#ef4444',
  'Visibility Restriction': '#f59e0b',
  'Account Suspension': '#8b5cf6',
  'Demonetization': '#6366f1',
  'Warning Label': '#3b82f6',
  'Age Restriction': '#ec4899',
  'Geo-Blocking': '#10b981',
};

// Generate a color based on string hash for consistent coloring
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  // Use a more vibrant saturation and lightness
  return `hsl(${hue}, 65%, 50%)`;
}

// Get platform color dynamically
export function getPlatformColor(platform: string): string {
  // Try known colors first
  if (KNOWN_PLATFORM_COLORS[platform]) {
    return KNOWN_PLATFORM_COLORS[platform];
  }
  // Try case-insensitive match
  const lowerPlatform = platform.toLowerCase();
  for (const [key, color] of Object.entries(KNOWN_PLATFORM_COLORS)) {
    if (key.toLowerCase() === lowerPlatform) {
      return color;
    }
  }
  // Generate consistent color from string
  return stringToColor(platform);
}

// Get decision type color dynamically
export function getDecisionTypeColor(decisionType: string): string {
  // Try known colors first
  if (KNOWN_DECISION_TYPE_COLORS[decisionType]) {
    return KNOWN_DECISION_TYPE_COLORS[decisionType];
  }
  // Try case-insensitive match
  const lowerType = decisionType.toLowerCase();
  for (const [key, color] of Object.entries(KNOWN_DECISION_TYPE_COLORS)) {
    if (key.toLowerCase() === lowerType) {
      return color;
    }
  }
  // Generate consistent color from string
  return stringToColor(decisionType);
}

// Legacy exports for backward compatibility (will use dynamic functions)
export const PLATFORM_COLORS: Record<string, string> = new Proxy({} as Record<string, string>, {
  get(target, prop: string) {
    return getPlatformColor(prop);
  }
});

export const DECISION_TYPE_COLORS: Record<string, string> = new Proxy({} as Record<string, string>, {
  get(target, prop: string) {
    return getDecisionTypeColor(prop);
  }
});

export const baseChartOptions = {
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    top: '15%',
    containLabel: true,
  },
  tooltip: {
    trigger: 'axis' as const,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    textStyle: {
      color: '#1e293b',
      fontSize: 13,
    },
    extraCssText: 'box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);',
  },
  legend: {
    type: 'scroll' as const,
    top: 0,
    textStyle: {
      color: '#64748b',
      fontSize: 12,
    },
    itemWidth: 12,
    itemHeight: 12,
    itemGap: 16,
  },
};

export const pieChartOptions = {
  tooltip: {
    trigger: 'item' as const,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    textStyle: {
      color: '#1e293b',
      fontSize: 13,
    },
    formatter: '{b}: {c} ({d}%)',
  },
  legend: {
    type: 'scroll' as const,
    orient: 'vertical' as const,
    right: 10,
    top: 'center',
    textStyle: {
      color: '#64748b',
      fontSize: 11,
    },
  },
};

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function formatPercent(value: number, total: number): string {
  if (total === 0) return '0%';
  return ((value / total) * 100).toFixed(1) + '%';
}

/**
 * Detect screen size category for responsive chart configuration
 */
export function getScreenSize(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  
  const width = window.innerWidth;
  if (width < 480) return 'mobile';
  if (width < 768) return 'tablet';
  return 'desktop';
}

/**
 * Get responsive chart options based on screen size
 */
export function getResponsiveChartOptions(baseOptions: any, screenSize?: 'mobile' | 'tablet' | 'desktop'): any {
  const size = screenSize || getScreenSize();
  const isMobile = size === 'mobile';
  const isTablet = size === 'tablet';

  const responsiveOptions: any = {
    grid: {
      ...baseOptions.grid,
      left: isMobile ? '8%' : isTablet ? '10%' : baseOptions.grid?.left || '3%',
      right: isMobile ? '3%' : isTablet ? '4%' : baseOptions.grid?.right || '4%',
      bottom: isMobile ? '8%' : isTablet ? '5%' : baseOptions.grid?.bottom || '3%',
      top: isMobile ? '12%' : isTablet ? '15%' : baseOptions.grid?.top || '15%',
    },
    tooltip: {
      ...baseOptions.tooltip,
      textStyle: {
        ...baseOptions.tooltip?.textStyle,
        fontSize: isMobile ? 11 : isTablet ? 12 : baseOptions.tooltip?.textStyle?.fontSize || 13,
      },
    },
    legend: {
      ...baseOptions.legend,
      textStyle: {
        ...baseOptions.legend?.textStyle,
        fontSize: isMobile ? 10 : isTablet ? 11 : baseOptions.legend?.textStyle?.fontSize || 12,
      },
      itemWidth: isMobile ? 10 : isTablet ? 11 : baseOptions.legend?.itemWidth || 12,
      itemHeight: isMobile ? 10 : isTablet ? 11 : baseOptions.legend?.itemHeight || 12,
      itemGap: isMobile ? 8 : isTablet ? 12 : baseOptions.legend?.itemGap || 16,
      ...(isMobile && baseOptions.legend?.orient === 'vertical' ? {
        right: 5,
        top: 'middle',
      } : {}),
    },
  };

  // Handle xAxis responsive
  if (baseOptions.xAxis) {
    responsiveOptions.xAxis = {
      ...baseOptions.xAxis,
      axisLabel: {
        ...baseOptions.xAxis.axisLabel,
        fontSize: isMobile ? 9 : isTablet ? 10 : baseOptions.xAxis.axisLabel?.fontSize || 11,
        rotate: isMobile ? (baseOptions.xAxis.axisLabel?.rotate || 45) : baseOptions.xAxis.axisLabel?.rotate || 0,
      },
    };
  }

  // Handle yAxis responsive
  if (baseOptions.yAxis) {
    responsiveOptions.yAxis = {
      ...baseOptions.yAxis,
      axisLabel: {
        ...baseOptions.yAxis.axisLabel,
        fontSize: isMobile ? 9 : isTablet ? 10 : baseOptions.yAxis.axisLabel?.fontSize || 11,
      },
    };
  }

  // Handle multiple axes
  if (Array.isArray(baseOptions.xAxis)) {
    responsiveOptions.xAxis = baseOptions.xAxis.map((axis: any) => ({
      ...axis,
      axisLabel: {
        ...axis.axisLabel,
        fontSize: isMobile ? 9 : isTablet ? 10 : axis.axisLabel?.fontSize || 11,
      },
    }));
  }

  if (Array.isArray(baseOptions.yAxis)) {
    responsiveOptions.yAxis = baseOptions.yAxis.map((axis: any) => ({
      ...axis,
      axisLabel: {
        ...axis.axisLabel,
        fontSize: isMobile ? 9 : isTablet ? 10 : axis.axisLabel?.fontSize || 11,
      },
    }));
  }

  return {
    ...baseOptions,
    ...responsiveOptions,
  };
}

/**
 * Get responsive pie chart options
 */
export function getResponsivePieChartOptions(baseOptions: any, screenSize?: 'mobile' | 'tablet' | 'desktop'): any {
  const size = screenSize || getScreenSize();
  const isMobile = size === 'mobile';
  const isTablet = size === 'tablet';

  return {
    ...baseOptions,
    tooltip: {
      ...baseOptions.tooltip,
      textStyle: {
        ...baseOptions.tooltip?.textStyle,
        fontSize: isMobile ? 11 : isTablet ? 12 : baseOptions.tooltip?.textStyle?.fontSize || 13,
      },
    },
    legend: {
      ...baseOptions.legend,
      textStyle: {
        ...baseOptions.legend?.textStyle,
        fontSize: isMobile ? 9 : isTablet ? 10 : baseOptions.legend?.textStyle?.fontSize || 11,
      },
      itemWidth: isMobile ? 8 : isTablet ? 10 : baseOptions.legend?.itemWidth || 12,
      itemHeight: isMobile ? 8 : isTablet ? 10 : baseOptions.legend?.itemHeight || 12,
      itemGap: isMobile ? 6 : isTablet ? 8 : baseOptions.legend?.itemGap || 12,
      ...(isMobile && baseOptions.legend?.orient === 'vertical' ? {
        right: 5,
        top: 'middle',
      } : {}),
    },
  };
}

