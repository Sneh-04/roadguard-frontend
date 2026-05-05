import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

interface PerformanceMetrics {
  componentName: string;
  renderTime: number;
  memoryUsage?: number;
  timestamp: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private maxMetrics = 100;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  recordMetric(metric: PerformanceMetrics) {
    this.metrics.push(metric);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift(); // Remove oldest
    }
  }

  getMetrics(componentName?: string): PerformanceMetrics[] {
    if (componentName) {
      return this.metrics.filter(m => m.componentName === componentName);
    }
    return this.metrics;
  }

  getAverageRenderTime(componentName: string): number {
    const componentMetrics = this.getMetrics(componentName);
    if (componentMetrics.length === 0) return 0;

    const total = componentMetrics.reduce((sum, m) => sum + m.renderTime, 0);
    return total / componentMetrics.length;
  }

  clearMetrics() {
    this.metrics = [];
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();

// Performance monitoring hook
export function usePerformanceMonitor(componentName: string) {
  const renderStart = useRef<number>(0);

  useEffect(() => {
    renderStart.current = performance.now();

    return () => {
      const renderTime = performance.now() - renderStart.current;
      performanceMonitor.recordMetric({
        componentName,
        renderTime,
        timestamp: Date.now(),
      });
    };
  });
}

// Lazy loading hook
export function useLazyLoad(threshold: number = 100) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const ref = useRef<View>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          setHasBeenVisible(true);
        } else {
          setIsVisible(false);
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current as any);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current as any);
      }
    };
  }, [threshold]);

  return { ref, isVisible, hasBeenVisible };
}

// Lazy image component with performance monitoring
interface LazyImageProps {
  source: { uri: string };
  style?: any;
  placeholder?: React.ReactNode;
  onLoad?: () => void;
  onError?: () => void;
}

export function LazyImage({
  source,
  style,
  placeholder,
  onLoad,
  onError
}: LazyImageProps) {
  usePerformanceMonitor('LazyImage');
  const { ref, isVisible } = useLazyLoad();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (!isVisible && !loaded) {
    return (
      <View ref={ref} style={[style, styles.placeholder]}>
        {placeholder || <Text style={styles.placeholderText}>Loading...</Text>}
      </View>
    );
  }

  return (
    <View ref={ref} style={style}>
      {/* In a real implementation, this would be an Image component */}
      <Text style={styles.imagePlaceholder}>
        {error ? 'Failed to load' : 'Image loaded'}
      </Text>
    </View>
  );
}

// Memory usage monitoring
export function useMemoryMonitor() {
  const [memoryUsage, setMemoryUsage] = useState<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      // In React Native, we can't directly access memory usage
      // This would be implemented with native modules in production
      setMemoryUsage(Math.random() * 100); // Mock data
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return memoryUsage;
}

// Performance dashboard component (for development)
export function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const memoryUsage = useMemoryMonitor();

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(performanceMonitor.getMetrics());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!__DEV__) return null; // Only show in development

  const averageRenderTime = metrics.length > 0
    ? metrics.reduce((sum, m) => sum + m.renderTime, 0) / metrics.length
    : 0;

  return (
    <View style={styles.dashboard}>
      <Text style={styles.dashboardTitle}>Performance Monitor</Text>
      <Text style={styles.metric}>Avg Render Time: {averageRenderTime.toFixed(2)}ms</Text>
      <Text style={styles.metric}>Memory Usage: {memoryUsage?.toFixed(1)}MB</Text>
      <Text style={styles.metric}>Total Metrics: {metrics.length}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    ...typography.text.sm,
    color: colors.textMuted,
  },
  imagePlaceholder: {
    ...typography.text.sm,
    color: colors.text,
    textAlign: 'center',
  },
  dashboard: {
    position: 'absolute',
    top: 50,
    right: 10,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 200,
  },
  dashboardTitle: {
    ...typography.text.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  metric: {
    ...typography.text.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
});