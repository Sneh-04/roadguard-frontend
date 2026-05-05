import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import codePush from 'react-native-code-push';

import { AppProvider, useAppContext } from './src/context/AppContext';
import ReportScreen from './src/screens/ReportScreen';

function AppRoot() {
  return (
    <AppProvider>
      <ReportScreen />
    </AppProvider>
  );
}

export default codePush(AppRoot);
