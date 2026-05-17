export const lightColors = {
  // Backgrounds
  background: '#FAF9F7',
  surface: '#FFFFFF',
  surfaceSecondary: '#F2F1EE',

  // Brand
  primary: '#1E96C8',
  primaryLight: '#D6EEF8',
  primaryDark: '#1578A0',
  accent: '#F5871F',
  accentLight: '#FDE8CE',

  // Text
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textDisabled: '#ADADAD',
  textOnPrimary: '#FFFFFF',

  // Risk system
  riscoAlto: '#E64539',
  riscoAltoLight: '#FDECEA',
  riscoAltoDark: '#B83530',

  riscoAtencao: '#F5A623',
  riscoAtencaoLight: '#FEF3E2',
  riscoAtencaoDark: '#C2820F',

  riscoSeguro: '#7CB342',
  riscoSeguroLight: '#EDF5E1',
  riscoSeguroDark: '#5A8430',

  // UI
  border: '#E8E6E1',
  borderLight: '#F0EEE9',
  divider: '#EEECE8',
  shadow: 'rgba(0,0,0,0.08)',

  // Status bar
  statusBar: 'dark',
} as const;

export const darkColors = {
  // Backgrounds
  background: '#1A1A1C',
  surface: '#26262A',
  surfaceSecondary: '#313137',

  // Brand
  primary: '#3AABDC',
  primaryLight: '#1A3D4F',
  primaryDark: '#1E96C8',
  accent: '#F7963A',
  accentLight: '#3D2A10',

  // Text
  textPrimary: '#F0EFEC',
  textSecondary: '#9A9A9A',
  textDisabled: '#555555',
  textOnPrimary: '#FFFFFF',

  // Risk system
  riscoAlto: '#F06B65',
  riscoAltoLight: '#3D1715',
  riscoAltoDark: '#E64539',

  riscoAtencao: '#F7B944',
  riscoAtencaoLight: '#3D2A0A',
  riscoAtencaoDark: '#F5A623',

  riscoSeguro: '#96CC5A',
  riscoSeguroLight: '#1E3010',
  riscoSeguroDark: '#7CB342',

  // UI
  border: '#3A3A40',
  borderLight: '#2E2E34',
  divider: '#2E2E34',
  shadow: 'rgba(0,0,0,0.3)',

  // Status bar
  statusBar: 'light',
} as const;

export type AppColors = {
  [K in keyof typeof lightColors]: string;
};
