import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocation } from '../../hooks/useLocation';
import { apiService } from '../../services/api';

export default function AdminMapScreen() {
  const { location } = useLocation();
  const [reports, setReports] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const lat = location?.latitude ?? 20.5937;
  const lon = location?.longitude ?? 78.9629;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch reports from backend
  const fetchReports = async () => {
    try {
      setRefreshing(true);
      const response = await apiService.getHazards();
      if (response.success && Array.isArray(response.data)) {
        setReports(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Fetch initially and every 5 seconds
  useEffect(() => {
    fetchReports();
    intervalRef.current = setInterval(fetchReports, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Generate markers for reports
  const generateMarkers = () => {
    return reports.map((report, idx) => {
      const color = report.hazard_type === 1 ? '#F59E0B' : report.hazard_type === 2 ? '#EF4444' : '#3B82F6';
      return `
        L.circleMarker([${report.latitude}, ${report.longitude}], {
          radius: 8, fillColor: '${color}', color: '#fff',
          weight: 2, opacity: 1, fillOpacity: 0.8
        }).addTo(map).bindPopup('${report.hazard_type === 1 ? '⚠️ Speed Breaker' : report.hazard_type === 2 ? '🔴 Pothole' : 'Report'}');
      `;
    }).join('');
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>body{margin:0;padding:0;}#map{height:100vh;width:100vw;}.info{padding:10px;background:#0F172A;color:#F8FAFC;font-size:12px;border-radius:5px;}</style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map').setView([${lat}, ${lon}], 13);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: 'RoadGuard-AI Admin'
        }).addTo(map);
        L.circleMarker([${lat}, ${lon}], {
          radius: 10, fillColor: '#DC2626', color: '#fff',
          weight: 2, opacity: 1, fillOpacity: 0.9
        }).addTo(map).bindPopup('Admin Location').openPopup();
        ${generateMarkers()}
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      {refreshing && <View style={styles.refreshing}><ActivityIndicator size="small" color="#DC2626" /></View>}
      <WebView
        source={{ html }}
        style={styles.map}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        key={reports.length}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  map: { flex: 1 },
  refreshing: { position: 'absolute', top: 10, right: 10, zIndex: 1000, padding: 8, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 20 },
});
