const withWebRTCAndroid = require('./withWebRTCAndroid');
const withWebRTCIOS = require('./withWebRTCIOS');

module.exports = (config) => {
  // Apply Android configuration
  config = withWebRTCAndroid(config);
  
  // Apply iOS configuration
  config = withWebRTCIOS(config);
  
  return config;
};