import { TextStyle } from 'react-native';

export const typography = {
  // Font sizes
  fontSize: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 18,
    xl: 22,
    xxl: 28,
    xxxl: 36,
  },

  // Font weights
  fontWeight: {
    regular: '400' as TextStyle['fontWeight'],
    medium: '500' as TextStyle['fontWeight'],
    semibold: '600' as TextStyle['fontWeight'],
    bold: '700' as TextStyle['fontWeight'],
  },

  // Common text styles
  text: {
    xs: {
      fontSize: 11,
      fontWeight: '400' as TextStyle['fontWeight'],
    },
    sm: {
      fontSize: 13,
      fontWeight: '400' as TextStyle['fontWeight'],
    },
    md: {
      fontSize: 15,
      fontWeight: '400' as TextStyle['fontWeight'],
    },
    lg: {
      fontSize: 18,
      fontWeight: '400' as TextStyle['fontWeight'],
    },
    xl: {
      fontSize: 22,
      fontWeight: '400' as TextStyle['fontWeight'],
    },
    xxl: {
      fontSize: 28,
      fontWeight: '400' as TextStyle['fontWeight'],
    },
    xxxl: {
      fontSize: 36,
      fontWeight: '400' as TextStyle['fontWeight'],
    },
  },
};