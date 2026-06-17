import { environmentSecrets } from './environment.secrets';

export const environment = {
  production: true,
  apiUrl: '/api',
  wsUrl: '/ws',
  appName: 'SmartTax Project',
  version: '1.0.0',
  enableDebug: false,
  groqApiKey: environmentSecrets.groqApiKey,
};
