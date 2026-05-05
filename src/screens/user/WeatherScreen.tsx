import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useNavigation } from '@react-navigation/native';
import Svg, {
  Circle,
  Line,
  Text as SvgText,
  G,
  Rect,
  Path,
} from 'react-native-svg';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { useWeather } from '../../hooks/useWeather';
import { useLocation } from '../../hooks/useLocation';
import { offlineService } from '../../services/offlineService';
import { format, addDays } from 'date-fns';

const { width } = Dimensions.get('window');

interface WeatherAlert {
  type: 'rain' | 'wind' | 'temperature' | 'visibility';
  severity: 'low' | 'medium' | 'high';
  message: string;
  icon: string;
}

interface RoadSafetyTip {
  condition: string;
  tip: string;
  icon: string;
}

export default function WeatherScreen() {
  const navigation = useNavigation();
  const { weather, loading, error, fetchWeather } = useWeather();
  const { location } = useLocation();

  const [weatherAlerts, setWeatherAlerts] = useState<WeatherAlert[]>([]);
  const [roadSafetyTips, setRoadSafetyTips] = useState<RoadSafetyTip[]>([]);
  const [isOnline, setIsOnline] = useState(true);

  // Generate mock 5-day forecast (in real app, this would come from API)
  const [forecast, setForecast] = useState<any[]>([]);

  useEffect(() => {
    if (weather) {
      generateWeatherAlerts();
      generateRoadSafetyTips();
      generateMockForecast();
    }

    // Monitor online status
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? true);
    });

    return () => unsubscribe();
  }, [weather]);

  const generateWeatherAlerts = () => {
    if (!weather) return;
    const alerts: WeatherAlert[] = [];

    if (weather.precipitation > 5) {
      alerts.push({
        type: 'rain',
        severity: weather.precipitation > 15 ? 'high' : 'medium',
        message: `Heavy rain expected (${weather.precipitation}mm). Wet roads increase stopping distance.`,
        icon: '🌧️',
      });
    }

    if (weather.windSpeed > 20) {
      alerts.push({
        type: 'wind',
        severity: weather.windSpeed > 30 ? 'high' : 'medium',
        message: `Strong winds (${weather.windSpeed}km/h). Be cautious of reduced vehicle control.`,
        icon: '💨',
      });
    }

    if (weather.temperature < 5) {
      alerts.push({
        type: 'temperature',
        severity: 'medium',
        message: `Freezing temperatures (${weather.temperature}°C). Watch for ice on roads.`,
        icon: '❄️',
      });
    }

    if (weather.visibility < 1000) {
      alerts.push({
        type: 'visibility',
        severity: weather.visibility < 500 ? 'high' : 'medium',
        message: `Poor visibility (${weather.visibility}m). Use headlights and drive cautiously.`,
        icon: '🌫️',
      });
    }

    setWeatherAlerts(alerts);
  };

  const generateRoadSafetyTips = () => {
    if (!weather) return;
    const tips: RoadSafetyTip[] = [];

    if (weather.precipitation > 0) {
      tips.push({
        condition: 'Rainy Conditions',
        tip: 'Increase following distance by 2-3 seconds. Use headlights even in daylight.',
        icon: '🌧️',
      });
    }

    if (weather.windSpeed > 15) {
      tips.push({
        condition: 'Windy Conditions',
        tip: 'Reduce speed and maintain firm grip on steering wheel. Watch for gusts.',
        icon: '💨',
      });
    }

    if (weather.temperature < 10) {
      tips.push({
        condition: 'Cold Weather',
        tip: 'Allow extra time for vehicle warm-up. Check tire pressure and tread.',
        icon: '❄️',
      });
    }

    if (weather.visibility < 2000) {
      tips.push({
        condition: 'Low Visibility',
        tip: 'Use fog lights if available. Clean windshield and mirrors regularly.',
        icon: '🌫️',
      });
    }

    // Default tips
    if (tips.length === 0) {
      tips.push({
        condition: 'General Safety',
        tip: 'Maintain safe following distance and be aware of your surroundings.',
        icon: '🛡️',
      });
    }

    setRoadSafetyTips(tips);
  };

  const generateMockForecast = () => {
    if (!weather) return;
    const mockForecast = [];
    for (let i = 0; i < 5; i++) {
      const date = addDays(new Date(), i);
      mockForecast.push({
        date,
        temperature: weather.temperature + (Math.random() - 0.5) * 10,
        condition: ['Clear', 'Clouds', 'Rain'][Math.floor(Math.random() * 3)],
        precipitation: Math.random() * 10,
      });
    }
    setForecast(mockForecast);
  };

  const getWeatherIcon = (condition: string, size: number = 48) => {
    const icons: { [key: string]: string } = {
      'Clear': '☀️',
      'Clouds': '☁️',
      'Rain': '🌧️',
      'Snow': '❄️',
      'Thunderstorm': '⛈️',
      'Drizzle': '🌦️',
      'Mist': '🌫️',
    };
    return icons[condition] || '🌤️';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return colors.danger;
      case 'medium': return colors.warning;
      case 'low': return colors.success;
      default: return colors.textMuted;
    }
  };

  const TemperatureGauge = ({ temperature }: { temperature: number }) => {
    const size = 120;
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;

    // Temperature ranges: -10°C to 40°C
    const minTemp = -10;
    const maxTemp = 40;
    const normalizedTemp = Math.max(0, Math.min(1, (temperature - minTemp) / (maxTemp - minTemp)));
    const strokeDashoffset = circumference - normalizedTemp * circumference;

    const getTempColor = (temp: number) => {
      if (temp < 0) return colors.accent;
      if (temp < 15) return colors.accent;
      if (temp < 25) return colors.success;
      if (temp < 35) return colors.warning;
      return colors.danger;
    };

    return (
      <View style={styles.gaugeContainer}>
        <Svg width={size} height={size}>
          <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={colors.surfaceLight}
              strokeWidth={strokeWidth}
              fill="none"
            />
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={getTempColor(temperature)}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </G>
          <SvgText
            x={size / 2}
            y={size / 2 - 8}
            textAnchor="middle"
            fontSize="18"
            fontWeight="bold"
            fill={colors.text}
          >
            {Math.round(temperature)}°
          </SvgText>
          <SvgText
            x={size / 2}
            y={size / 2 + 8}
            textAnchor="middle"
            fontSize="10"
            fill={colors.textMuted}
          >
            CELSIUS
          </SvgText>
        </Svg>
      </View>
    );
  };

  const WeatherChart = ({ data }: { data: any[] }) => {
    if (!data || data.length === 0) return null;

    const chartWidth = width - spacing.lg * 2;
    const chartHeight = 120;
    const padding = 20;

    const temps = data.map(d => d.temperature);
    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);
    const tempRange = maxTemp - minTemp || 1;

    const points = data.map((d, i) => {
      const x = padding + (i / (data.length - 1)) * (chartWidth - padding * 2);
      const y = chartHeight - padding - ((d.temperature - minTemp) / tempRange) * (chartHeight - padding * 2);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>5-Day Temperature Trend</Text>
        <Svg width={chartWidth} height={chartHeight}>
          {/* Grid lines */}
          <G>
            {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
              <Line
                key={ratio}
                x1={padding}
                y1={padding + ratio * (chartHeight - padding * 2)}
                x2={chartWidth - padding}
                y2={padding + ratio * (chartHeight - padding * 2)}
                stroke={colors.surfaceLight}
                strokeWidth={1}
                opacity={0.3}
              />
            ))}
          </G>

          {/* Temperature line */}
          <Path
            d={points}
            stroke={colors.accent}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {data.map((d, i) => {
            const x = padding + (i / (data.length - 1)) * (chartWidth - padding * 2);
            const y = chartHeight - padding - ((d.temperature - minTemp) / tempRange) * (chartHeight - padding * 2);
            return (
              <G key={i}>
                <Circle
                  cx={x}
                  cy={y}
                  r={4}
                  fill={colors.accent}
                />
                <SvgText
                  x={x}
                  y={y - 8}
                  textAnchor="middle"
                  fontSize="10"
                  fill={colors.text}
                  fontWeight="bold"
                >
                  {Math.round(d.temperature)}°
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading weather data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>🌤️</Text>
        <Text style={styles.errorTitle}>Weather Unavailable</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchWeather}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Weather & Safety</Text>
          <View style={styles.onlineStatus}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? colors.success : colors.warning }]} />
            <Text style={[styles.statusText, { color: isOnline ? colors.success : colors.warning }]}>
              {isOnline ? 'Live' : 'Cached'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={fetchWeather}
        >
          <Text style={styles.refreshIcon}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Current Weather */}
      <View style={styles.currentWeather}>
        <View style={styles.weatherMain}>
          <Text style={styles.weatherIcon}>
            {getWeatherIcon(weather?.condition || 'Clear', 64)}
          </Text>
          <View style={styles.weatherInfo}>
            <Text style={styles.location}>
              {location?.city || 'Current Location'}
            </Text>
            <Text style={styles.condition}>
              {weather?.condition || 'Clear'}
            </Text>
          </View>
        </View>

        <TemperatureGauge temperature={weather?.temperature || 20} />

        <View style={styles.weatherStats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{weather?.humidity || 0}%</Text>
            <Text style={styles.statLabel}>Humidity</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{weather?.windSpeed || 0}</Text>
            <Text style={styles.statLabel}>Wind (km/h)</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{weather?.visibility ? (weather.visibility / 1000).toFixed(1) : 0}km</Text>
            <Text style={styles.statLabel}>Visibility</Text>
          </View>
        </View>
      </View>

      {/* Weather Alerts */}
      {weatherAlerts.length > 0 && (
        <View style={styles.alertsSection}>
          <Text style={styles.sectionTitle}>⚠️ Weather Alerts</Text>
          {weatherAlerts.map((alert, index) => (
            <View key={index} style={[styles.alertCard, { borderLeftColor: getSeverityColor(alert.severity) }]}>
              <Text style={styles.alertIcon}>{alert.icon}</Text>
              <View style={styles.alertContent}>
                <Text style={styles.alertMessage}>{alert.message}</Text>
                <Text style={[styles.alertSeverity, { color: getSeverityColor(alert.severity) }]}>
                  {alert.severity.toUpperCase()} RISK
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Road Safety Tips */}
      <View style={styles.tipsSection}>
        <Text style={styles.sectionTitle}>🛡️ Road Safety Tips</Text>
        {roadSafetyTips.map((tip, index) => (
          <View key={index} style={styles.tipCard}>
            <Text style={styles.tipIcon}>{tip.icon}</Text>
            <View style={styles.tipContent}>
              <Text style={styles.tipCondition}>{tip.condition}</Text>
              <Text style={styles.tipText}>{tip.tip}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* 5-Day Forecast */}
      <View style={styles.forecastSection}>
        <Text style={styles.sectionTitle}>📅 5-Day Forecast</Text>
        <WeatherChart data={forecast} />

        <View style={styles.forecastList}>
          {forecast.map((day, index) => (
            <View key={index} style={styles.forecastItem}>
              <Text style={styles.forecastDay}>
                {index === 0 ? 'Today' : format(day.date, 'EEE')}
              </Text>
              <Text style={styles.forecastIcon}>
                {getWeatherIcon(day.condition, 24)}
              </Text>
              <Text style={styles.forecastTemp}>
                {Math.round(day.temperature)}°
              </Text>
              {day.precipitation > 0 && (
                <Text style={styles.forecastRain}>
                  {day.precipitation.toFixed(1)}mm
                </Text>
              )}
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  loadingText: {
    ...typography.text.lg,
    color: colors.text,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
    padding: spacing.lg,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  errorTitle: {
    ...typography.text.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  errorText: {
    ...typography.text.md,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  retryButtonText: {
    ...typography.text.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLight,
  },
  backButton: {
    padding: spacing.sm,
  },
  backIcon: {
    fontSize: 24,
    color: colors.text,
  },
  title: {
    ...typography.text.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  refreshButton: {
    padding: spacing.sm,
  },
  refreshIcon: {
    fontSize: 20,
    color: colors.accent,
  },
  currentWeather: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  weatherMain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  weatherIcon: {
    fontSize: 64,
    marginRight: spacing.md,
  },
  weatherInfo: {
    alignItems: 'center',
  },
  location: {
    ...typography.text.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  condition: {
    ...typography.text.md,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  gaugeContainer: {
    marginVertical: spacing.md,
  },
  weatherStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    ...typography.text.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
  },
  statLabel: {
    ...typography.text.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  alertsSection: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    ...typography.text.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceLight,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
  },
  alertIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  alertContent: {
    flex: 1,
  },
  alertMessage: {
    ...typography.text.md,
    color: colors.text,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  alertSeverity: {
    ...typography.text.sm,
    fontWeight: typography.fontWeight.bold,
  },
  tipsSection: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceLight,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  tipIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  tipContent: {
    flex: 1,
  },
  tipCondition: {
    ...typography.text.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  tipText: {
    ...typography.text.sm,
    color: colors.textMuted,
    lineHeight: 18,
  },
  forecastSection: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartContainer: {
    marginBottom: spacing.lg,
  },
  chartTitle: {
    ...typography.text.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  forecastList: {
    marginTop: spacing.md,
  },
  forecastItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLight,
  },
  forecastDay: {
    ...typography.text.md,
    color: colors.text,
    width: 60,
  },
  forecastIcon: {
    fontSize: 24,
    width: 40,
    textAlign: 'center',
  },
  forecastTemp: {
    ...typography.text.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
    width: 50,
    textAlign: 'center',
  },
  forecastRain: {
    ...typography.text.sm,
    color: colors.accent,
    width: 50,
    textAlign: 'right',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  onlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.xs,
  },
  statusText: {
    ...typography.text.xs,
    fontWeight: typography.fontWeight.medium,
  },
});