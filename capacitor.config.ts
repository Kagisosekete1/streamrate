import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.semogrouptech.streamrateapp',
  appName: 'streamrate',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      backgroundColor: '#FFFFFF',
      launchShowDuration: 0,
    },
  },
};

export default config;
