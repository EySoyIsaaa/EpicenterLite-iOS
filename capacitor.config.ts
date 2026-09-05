import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.epicenterdsp.lite',
  appName: 'EpicenterDSP Lite',
  webDir: 'dist/public',
  ios: {
    scheme: 'EpicenterDSPLite',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#000000',
      showSpinner: false,
      launchAutoHide: true,
    },
  },
};

export default config;
