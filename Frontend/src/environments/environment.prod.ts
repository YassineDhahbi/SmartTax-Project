import { environmentSecrets } from './environment.secrets';

export const environment = {
  production: true,
  apiUrl: 'https://api.smarttax.com/api',
  appName: 'SmartTax Project',
  version: '1.0.0',
  enableDebug: false,
  groqApiKey: environmentSecrets.groqApiKey,
};
