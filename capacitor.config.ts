import type { CapacitorConfig } from '@capacitor/cli';

const serverUrl = process.env.CAPACITOR_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'com.medmind.app',
  appName: 'MedMind',
  webDir: 'public',
  server: serverUrl
    ? {
        url: serverUrl,
        cleartext: serverUrl.startsWith('http://'),
        androidScheme: serverUrl.startsWith('http://') ? 'http' : 'https',
      }
    : undefined,
};

export default config;
