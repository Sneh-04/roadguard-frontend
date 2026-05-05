import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocation } from '../../hooks/useLocation';

export default function AdminMapScreen() {
  const { location } = useLocation();
  const lat = location?.latitude ?? 20.5937;
  const lon = location?.longitude ?? 78.9629;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>body{margin:0;padding:0;}#map{height:100vh;width:100vw;}</style>
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
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        source={{ html }}
        style={styles.map}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  map: { flex: 1 },
});
