import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.semogrouptech.streamrateapp',
  appName: 'Zyiro',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      backgroundColor: '#021124',
      // Keep the branded launch screen visible while the web view initializes.
      launchShowDuration: 1800,
    },
  },
};

export default config;
