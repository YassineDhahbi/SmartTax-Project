// Modèles TypeScript pour l'entité Immatriculation du backend

export enum TypeContribuable {
  PHYSIQUE = 'PHYSIQUE',
  MORALE = 'MORALE'
}

export enum DossierStatus {
  BROUILLON = 'BROUILLON',
  SOUMIS = 'SOUMIS',
  EN_COURS_VERIFICATION = 'EN_COURS_VERIFICATION',
  VALIDE = 'VALIDE',
  REJETE = 'REJETE'
}

export enum SubmissionMode {
  DRAFT = 'DRAFT',
  SUBMIT = 'SUBMIT'
}

export interface Immatriculation {
  id?: number;
  dossierNumber: string;
  typeContribuable: TypeContribuable;
  
  // Personne Physique
  nom?: string;
  prenom?: string;
  cin?: string;
  dateNaissance?: string;
  
  // Personne Morale
  raisonSociale?: string;
  matriculeFiscalExistant?: string;
  registreCommerce?: string;
  representantLegal?: string;
  
  // Champs communs
  email: string;
  telephone: string;
  adresse: string;
  
  // Activité
  typeActivite: string;
  secteur: string;
  adresseProfessionnelle: string;
  dateDebutActivite: string;
  descriptionActivite: string;
  
  // Fichiers (Base64)
  identiteFile?: string;
  activiteFile?: string;
  photoFile?: string;
  autresFiles?: string[];
  
  // Scores de vérification
  overallScore: number;
  completenessScore: number;
  verificationScore: number;
  documentsScore: number;
  faceRecognitionScore: number;
  
  // Vérifications
  duplicateDetected: boolean;
  ocrResults?: string;
  
  // Workflow
  status: DossierStatus;
  dateCreation: string;
  dateSoumission?: string;
  dateValidation?: string;
  dateRejet?: string;
  motifRejet?: string;
  confirmed: boolean;
  submissionMode: SubmissionMode;
  archived: boolean;
  dateArchivage?: string;
}

// DTO pour la création
export interface CreateImmatriculationDto {
  typeContribuable: TypeContribuable;
  nom?: string;
  prenom?: string;
  cin?: string;
  dateNaissance?: string;
  raisonSociale?: string;
  matriculeFiscalExistant?: string;
  registreCommerce?: string;
  representantLegal?: string;
  email: string;
  telephone: string;
  adresse: string;
  typeActivite: string;
  secteur: string;
  adresseProfessionnelle: string;
  dateDebutActivite: string;
  descriptionActivite: string;
  identiteFile?: string;
  activiteFile?: string;
  photoFile?: string;
  autresFiles?: string[];
  confirmed: boolean;
  submissionMode: SubmissionMode;
  // Scores de vérification (ajoutés pour éviter les erreurs de nullité)
  overallScore?: number;
  completenessScore?: number;
  verificationScore?: number;
  documentsScore?: number;
  faceRecognitionScore?: number;
}

// DTO pour la mise à jour
export interface UpdateImmatriculationDto {
  nom?: string;
  prenom?: string;
  cin?: string;
  dateNaissance?: string;
  raisonSociale?: string;
  matriculeFiscalExistant?: string;
  registreCommerce?: string;
  representantLegal?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  typeActivite?: string;
  secteur?: string;
  adresseProfessionnelle?: string;
  dateDebutActivite?: string;
  descriptionActivite?: string;
  status?: string;
  motifRejet?: string;
}

// DTO pour la validation/rejet
export interface ValidationDto {
  motifRejet?: string;
}

// DTO pour les statistiques
export interface StatistiqueDto {
  status: string;
  count: number;
}

// DTO pour le résumé de dossier
export interface DossierSummaryDto {
  id: number;
  dossierNumber: string;
  nom?: string;
  prenom?: string;
  raisonSociale?: string;
  email: string;
  status: DossierStatus;
  dateCreation: string;
  overallScore: number;
}

// DTO pour le tableau de bord
export interface DashboardDto {
  statistics: { [key: string]: number };
  total: number;
  recentDossiers: DossierSummaryDto[];
  lowScoreDossiers: DossierSummaryDto[];
  todayCount: number;
}

// Interface pour les résultats de recherche
export interface SearchResult {
  immatriculations: Immatriculation[];
  totalCount: number;
}

// Interface pour la réponse API
export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
}

// Interface pour la pagination
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}
