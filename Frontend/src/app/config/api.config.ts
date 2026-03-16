// Configuration de l'API pour le frontend SmartTax

export const API_CONFIG = {
  // URL de base de l'API backend
  BASE_URL: 'http://localhost:8080/api',
  
  // Endpoints de l'API Immatriculation
  IMMATRICULATION: {
    BASE: '/immatriculation',
    CREATE: '/immatriculation/create',
    CREATE_WITH_FILES: '/immatriculation/create-with-files',
    GET_BY_ID: (id: number) => `/immatriculation/${id}`,
    GET_BY_NUMBER: (number: string) => `/immatriculation/number/${number}`,
    UPDATE: (id: number) => `/immatriculation/${id}`,
    GET_ALL: '/immatriculation',
    GET_BY_STATUS: (status: string) => `/immatriculation/status/${status}`,
    SEARCH: '/immatriculation/search',
    PAGINATED: '/immatriculation/paginated',
    SUBMIT: (id: number) => `/immatriculation/${id}/submit`,
    VALIDATE: (id: number) => `/immatriculation/${id}/validate`,
    REJECT: (id: number) => `/immatriculation/${id}/reject`,
    ARCHIVE: (id: number) => `/immatriculation/${id}/archive`,
    STATISTICS: '/immatriculation/statistics',
    DASHBOARD: '/immatriculation/dashboard',
    DOWNLOAD_FILE: (id: number, fileType: string) => `/immatriculation/${id}/download/${fileType}`,
    EXPORT: '/immatriculation/export'
  },
  
  // Endpoints Authentification
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password'
  },
  
  // Endpoints Utilisateur
  UTILISATEUR: {
    BASE: '/utilisateur',
    PROFILE: '/utilisateur/profile',
    UPDATE: (id: number) => `/utilisateur/${id}`,
    DELETE: (id: number) => `/utilisateur/${id}`
  },
  
  // Endpoints Réclamation
  RECLAMATION: {
    BASE: '/reclamation',
    CREATE: '/reclamation/create',
    GET_BY_ID: (id: number) => `/reclamation/${id}`,
    GET_ALL: '/reclamation',
    UPDATE: (id: number) => `/reclamation/${id}`,
    DELETE: (id: number) => `/reclamation/${id}`
  },
  
  // Endpoints Dossier
  DOSSIER: {
    BASE: '/dossier',
    GET_BY_USER: '/dossier/user',
    GET_BY_NUMBER: (number: string) => `/dossier/number/${number}`,
    TRACK: (number: string) => `/dossier/track/${number}`
  },
  
  // Endpoints Test
  TEST: {
    HEALTH: '/test/health',
    IMMATRICULATION_READY: '/test/immatriculation-ready'
  }
};

// Configuration HTTP
export const HTTP_CONFIG = {
  // Timeout par défaut en millisecondes
  TIMEOUT: 30000,
  
  // Headers par défaut
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  
  // Options pour les fichiers
  FILE_HEADERS: {
    'Accept': 'application/json, multipart/form-data'
  },
  
  // Options pour le téléchargement
  DOWNLOAD_HEADERS: {
    'Accept': 'application/octet-stream, application/pdf, image/*'
  }
};

// Configuration de l'environnement
export const ENV_CONFIG = {
  // Mode développement
  DEVELOPMENT: {
    API_URL: 'http://localhost:8080/api',
    ENABLE_LOGGING: true,
    ENABLE_MOCK: false
  },
  
  // Mode production
  PRODUCTION: {
    API_URL: 'https://api.smarttax.tn/api',
    ENABLE_LOGGING: false,
    ENABLE_MOCK: false
  },
  
  // Mode test
  TEST: {
    API_URL: 'http://localhost:8080/api',
    ENABLE_LOGGING: true,
    ENABLE_MOCK: true
  }
};

// Obtenir la configuration actuelle
export function getCurrentConfig() {
  const environment = (process as any)['env']?.['NODE_ENV'] || 'development';
  
  switch (environment) {
    case 'production':
      return ENV_CONFIG.PRODUCTION;
    case 'test':
      return ENV_CONFIG.TEST;
    default:
      return ENV_CONFIG.DEVELOPMENT;
  }
}

// URL de base dynamique
export const BASE_API_URL = getCurrentConfig().API_URL;
