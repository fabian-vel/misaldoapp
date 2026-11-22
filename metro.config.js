const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push('sql'); // migraciones de Drizzle
config.resolver.assetExts.push('wasm'); // expo-sqlite en web

module.exports = withNativeWind(config, { input: './src/global.css' });
