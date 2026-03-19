import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpRequest } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, delay } from 'rxjs/operators';
import { 
  Immatriculation, 
  CreateImmatriculationDto, 
  UpdateImmatriculationDto, 
  ValidationDto,
  DossierStatus,
  TypeContribuable,
  SubmissionMode,
  StatistiqueDto,
  DashboardDto,
  PageResponse,
  SearchResult
} from '../models/immatriculation.model';

@Injectable({
  providedIn: 'root'
})
export class ImmatriculationService {
  private readonly apiUrl = 'http://localhost:8080/api/immatriculation';

  constructor(private http: HttpClient) {}

  // ==================== CRUD ====================

  /**
   * Créer un nouveau dossier d'immatriculation
   */
  createImmatriculation(dto: CreateImmatriculationDto): Observable<Immatriculation> {
    console.log('🚀 Appel API createImmatriculation avec DTO:', dto);
    console.log('🌐 URL:', `${this.apiUrl}/create`);
    
    return this.http.post<Immatriculation>(`${this.apiUrl}/create`, dto).pipe(
      map(response => {
        console.log('✅ Réponse API réussie:', response);
        return response;
      }),
      catchError(error => {
        console.error('❌ Erreur API détaillée:', error);
        console.error('❌ Status:', error.status);
        console.error('❌ Message:', error.message);
        console.error('❌ Error details:', error.error);
        return this.handleError(error);
      })
    );
  }

  /**
   * Créer un dossier avec fichiers
   */
  createImmatriculationWithFiles(
    dto: CreateImmatriculationDto,
    identiteFile?: File,
    activiteFile?: File,
    photoFile?: File,
    autresFiles?: File[]
  ): Observable<Immatriculation> {
    const formData = new FormData();
    
    // Ajouter les données du formulaire
    formData.append('data', JSON.stringify(dto));
    
    // Ajouter les fichiers
    if (identiteFile) {
      formData.append('identiteFile', identiteFile);
    }
    if (activiteFile) {
      formData.append('activiteFile', activiteFile);
    }
    if (photoFile) {
      formData.append('photoFile', photoFile);
    }
    if (autresFiles) {
      autresFiles.forEach(file => {
        formData.append('autresFiles', file);
      });
    }

    return this.http.post<Immatriculation>(`${this.apiUrl}/create-with-files`, formData, {
      headers: {
        // Ne pas définir Content-Type pour FormData - le navigateur le fera automatiquement
        'Accept': 'application/json'
      }
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Mettre à jour un dossier
   */
  updateImmatriculation(id: number, dto: UpdateImmatriculationDto): Observable<Immatriculation> {
    return this.http.put<Immatriculation>(`${this.apiUrl}/${id}`, dto).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Récupérer un dossier par ID
   */
  getImmatriculation(id: number): Observable<Immatriculation> {
    return this.http.get<Immatriculation>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Récupérer un dossier par numéro
   */
  getImmatriculationByNumber(dossierNumber: string): Observable<Immatriculation> {
    return this.http.get<Immatriculation>(`${this.apiUrl}/number/${dossierNumber}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Lister tous les dossiers
   */
  getAllImmatriculations(): Observable<Immatriculation[]> {
    return this.http.get<Immatriculation[]>(`${this.apiUrl}`).pipe(
      catchError(this.handleError)
    );
  }

  // ==================== RECHERCHE ====================

  /**
   * Lister les dossiers par statut
   */
  getImmatriculationsByStatus(status: DossierStatus): Observable<Immatriculation[]> {
    return this.http.get<Immatriculation[]>(`${this.apiUrl}/status/${status}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Rechercher des dossiers
   */
  searchImmatriculations(params: {
    nom?: string;
    prenom?: string;
    email?: string;
    cin?: string;
    status?: DossierStatus;
    typeContribuable?: TypeContribuable;
  }): Observable<Immatriculation[]> {
    let httpParams = new HttpParams();
    
    Object.keys(params).forEach(key => {
      const value = params[key as keyof typeof params];
      if (value !== undefined && value !== null) {
        httpParams = httpParams.set(key, value.toString());
      }
    });

    return this.http.get<Immatriculation[]>(`${this.apiUrl}/search`, { params: httpParams }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Liste paginée des dossiers
   */
  getImmatriculationsPaginated(params: {
    page?: number;
    size?: number;
    sortBy?: string;
    sortDir?: string;
  } = {}): Observable<PageResponse<Immatriculation>> {
    const httpParams = new HttpParams()
      .set('page', (params.page || 0).toString())
      .set('size', (params.size || 10).toString())
      .set('sortBy', params.sortBy || 'dateCreation')
      .set('sortDir', params.sortDir || 'desc');

    return this.http.get<PageResponse<Immatriculation>>(`${this.apiUrl}/paginated`, { params: httpParams }).pipe(
      catchError(this.handleError)
    );
  }

  // ==================== WORKFLOW ====================

  /**
   * Soumettre un dossier pour validation
   */
  submitDossier(id: number): Observable<Immatriculation> {
    return this.http.post<Immatriculation>(`${this.apiUrl}/${id}/submit`, {}).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Valider un dossier
   */
  validateDossier(id: number): Observable<Immatriculation> {
    return this.http.post<Immatriculation>(`${this.apiUrl}/${id}/validate`, {}).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Rejeter un dossier
   */
  rejectDossier(id: number, motifRejet: string): Observable<Immatriculation> {
    return this.http.post<Immatriculation>(`${this.apiUrl}/${id}/reject`, { motifRejet }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Supprimer un dossier
   */
  deleteImmatriculation(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Archiver un dossier
   */
  archiveDossier(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/archive`).pipe(
      catchError(this.handleError)
    );
  }

  // ==================== STATISTIQUES ====================

  /**
   * Obtenir les statistiques des dossiers
   */
  getStatistics(): Observable<StatistiqueDto[]> {
    return this.http.get<StatistiqueDto[]>(`${this.apiUrl}/statistics`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtenir les données du tableau de bord
   */
  getDashboard(): Observable<DashboardDto> {
    return this.http.get<DashboardDto>(`${this.apiUrl}/dashboard`).pipe(
      catchError(this.handleError)
    );
  }

  // ==================== FICHIERS ====================

  /**
   * Télécharger un fichier
   */
  downloadFile(id: number, fileType: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/download/${fileType}`, {
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Exporter les dossiers
   */
  exportDossiers(format: string = 'excel', status?: DossierStatus): Observable<Blob> {
    let params = new HttpParams().set('format', format);
    if (status) {
      params = params.set('status', status);
    }

    return this.http.get(`${this.apiUrl}/export`, {
      params,
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError)
    );
  }

  // ==================== UTILITAIRES ====================

  /**
   * Convertir un fichier en Base64
   */
  convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Extraire seulement la partie Base64 (sans le préfixe data:...)
        const base64 = result.split(',')[1] || '';
        resolve(base64);
      };
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }

  /**
   * Convertir Base64 en Blob
   */
  convertBase64ToBlob(base64: string, contentType: string = 'application/octet-stream'): Blob {
    if (!base64) {
      throw new Error('Base64 string is required');
    }
    
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: contentType });
  }

  /**
   * Générer un numéro de dossier
   */
  generateDossierNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const random = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
    return `TN-DG-${year}-${random}`;
  }

  /**
   * Calculer le score de complétude
   */
  calculateCompletenessScore(dto: CreateImmatriculationDto): number {
    const fields: (string | undefined)[] = [
      dto.typeContribuable,
      dto.email,
      dto.telephone,
      dto.adresse,
      dto.typeActivite,
      dto.secteur,
      dto.adresseProfessionnelle,
      dto.dateDebutActivite,
      dto.descriptionActivite
    ];

    // Ajouter les champs spécifiques selon le type
    if (dto.typeContribuable === TypeContribuable.PHYSIQUE) {
      fields.push(dto.nom, dto.prenom, dto.cin, dto.dateNaissance);
    } else {
      fields.push(dto.raisonSociale, dto.registreCommerce, dto.representantLegal);
    }

    const filledFields = fields.filter(field => field && field.toString().trim() !== '').length;
    return Math.floor((filledFields / fields.length) * 100);
  }

  /**
   * Valider un CIN tunisien
   */
  validateCIN(cin: string): boolean {
    // Format CIN tunisien: 8 chiffres
    const cinPattern = /^\d{8}$/;
    return cinPattern.test(cin);
  }

  /**
   * Valider un email
   */
  validateEmail(email: string): boolean {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  }

  /**
   * Valider un numéro de téléphone tunisien
   */
  validateTelephone(telephone: string): boolean {
    // Formats tunisiens: 216XXXXXXXX ou +216XXXXXXXX ou 8 chiffres
    const phonePattern = /^(?:\+216|216)?\d{8}$/;
    return phonePattern.test(telephone.replace(/\s/g, ''));
  }

  // ==================== GESTION DES ERREURS ====================

  private handleError(error: any): Observable<never> {
    console.error('Erreur dans ImmatriculationService:', error);
    
    let errorMessage = 'Une erreur est survenue';
    
    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur client: ${error.error.message}`;
    } else if (error.status) {
      // Erreur côté serveur
      switch (error.status) {
        case 400:
          errorMessage = 'Données invalides';
          break;
        case 404:
          errorMessage = 'Dossier non trouvé';
          break;
        case 409:
          errorMessage = 'Doublon détecté';
          break;
        case 500:
          errorMessage = 'Erreur interne du serveur';
          break;
        default:
          errorMessage = `Erreur serveur: ${error.status}`;
      }
    }
    
    return throwError(() => new Error(errorMessage));
  }

  // ==================== SIMULATION (pour développement) ====================

  /**
   * Simuler la création d'un dossier (mode développement)
   */
  simulateCreateImmatriculation(dto: CreateImmatriculationDto): Observable<Immatriculation> {
    const simulated: Immatriculation = {
      id: Math.floor(Math.random() * 1000),
      dossierNumber: this.generateDossierNumber(),
      ...dto,
      overallScore: this.calculateCompletenessScore(dto),
      completenessScore: this.calculateCompletenessScore(dto),
      verificationScore: 85,
      documentsScore: 90,
      faceRecognitionScore: 88,
      duplicateDetected: false,
      status: DossierStatus.BROUILLON,
      dateCreation: new Date().toISOString(),
      confirmed: false,
      submissionMode: SubmissionMode.SUBMIT,
      archived: false
    };

    return of(simulated).pipe(delay(1000)); // Simuler un délai réseau
  }

  /**
   * Simuler la soumission avec vérification automatique
   */
  simulateSubmitWithVerification(id: number): Observable<Immatriculation> {
    const simulated: Immatriculation = {
      id,
      dossierNumber: this.generateDossierNumber(),
      typeContribuable: TypeContribuable.PHYSIQUE,
      email: 'test@example.com',
      telephone: '21612345678',
      adresse: 'Test Address',
      typeActivite: 'Commerce',
      secteur: 'Retail',
      adresseProfessionnelle: 'Test Address',
      dateDebutActivite: '2024-01-01',
      descriptionActivite: 'Test Activity',
      overallScore: 87,
      completenessScore: 92,
      verificationScore: 85,
      documentsScore: 88,
      faceRecognitionScore: 86,
      duplicateDetected: false,
      status: DossierStatus.SOUMIS,
      dateCreation: new Date().toISOString(),
      dateSoumission: new Date().toISOString(),
      confirmed: true,
      submissionMode: SubmissionMode.SUBMIT,
      archived: false
    };

    return of(simulated).pipe(delay(2000)); // Simuler le traitement
  }
}
