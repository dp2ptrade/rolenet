import 'react-native-gesture-handler';
import { ExpoRoot } from 'expo-router';

// Must be exported or Fast Refresh won't update the context
export default function App() {
  const ctx = require.context('./app');
  return <ExpoRoot context={ctx} />;
}