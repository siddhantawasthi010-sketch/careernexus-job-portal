import Constants from 'expo-constants';

export function getApiBaseUrl() {
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost || 'localhost:5000';
  const host = hostUri.split(':')[0] || 'localhost';
  return `http://${host}:5000`;
}
