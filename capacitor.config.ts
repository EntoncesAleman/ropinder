import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ropinder.app',
  appName: 'Ropinder',
  webDir: 'out',
  server: {
    url: 'https://ropinder.vercel.app',
    cleartext: false
  }
};

export default config;
