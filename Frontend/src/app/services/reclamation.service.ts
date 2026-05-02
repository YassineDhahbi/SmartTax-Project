import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { AuthService } from './auth/auth.service';

export interface Reclamation {
  id?: number;
  type: any;
  categorie: string;
  sujet: string;
  description: string;
  urgence: any;
  reference?: string;
  statut: any;
  etatReclamation?: any;
  dateCreation: Date;
  dateSoumission?: Date;
  dateResolution?: Date;
  emailUser?: string;
  nomUser?: string;
  telephoneUser?: string;
  piecesJointes: string[];
  messages: Message[];
  /** Messages agent non lus (API / contribuable). */
  unreadAgentMessageCount?: number;
}

export interface Message {
  id?: number;
  contenu: string;
  auteur: 'contribuable' | 'agent' | any;
  date: Date;
  lu: boolean;
  pieceJointe?: {
    nom?: string;
    taille?: number;
    type?: string;
    url?: string;
  };
}

export interface CreateReclamationResponse {
  id: number;
  reference: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReclamationService {
  private apiUrl = `${environment.apiUrl}/reclamation`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /** En-tête Authorization si l'utilisateur a un JWT (requis pour lier la réclamation au compte). */
  private optAuth(extra: Record<string, unknown> = {}): Record<string, unknown> {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({ Accept: 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return { headers, ...extra };
  }

  // Créer une nouvelle réclamation
  createReclamation(formData: FormData): Observable<CreateReclamationResponse> {
    return this.http
      .post<CreateReclamationResponse>(`${this.apiUrl}/create`, formData, this.optAuth())
      .pipe(catchError(this.handleError));
  }

  // Alternative : créer une réclamation avec paramètres de formulaire
  createReclamationWithForm(data: any, files: File[]): Observable<CreateReclamationResponse> {
    const formData = new FormData();
    
    // Ajouter les champs
    formData.append('type', data.type);
    formData.append('categorie', data.categorie);
    formData.append('sujet', data.sujet);
    formData.append('description', data.description);
    formData.append('urgence', data.urgence);
    formData.append('statut', data.statut || 'BROUILLON');
    
    if (data.reference) {
      formData.append('reference', data.reference);
    }
    if (data.nom) {
      formData.append('nom', data.nom);
    }
    if (data.telephone) {
      formData.append('telephone', data.telephone);
    }
    if (data.emailUser) {
      formData.append('emailUser', data.emailUser);
    }
    
    // Ajouter les fichiers
    files.forEach((file, index) => {
      formData.append(`files`, file);
    });
    
    return this.http
      .post<CreateReclamationResponse>(`${this.apiUrl}/create-with-form`, formData, this.optAuth())
      .pipe(catchError(this.handleError));
  }

  // Mettre à jour un brouillon via formulaire simple
  updateReclamationWithForm(id: number, data: any, files: File[]): Observable<Reclamation> {
    const formData = new FormData();

    formData.append('type', data.type);
    formData.append('categorie', data.categorie);
    formData.append('sujet', data.sujet);
    formData.append('description', data.description);
    formData.append('urgence', data.urgence);

    if (data.reference) {
      formData.append('reference', data.reference);
    }
    if (data.nom) {
      formData.append('nom', data.nom);
    }
    if (data.telephone) {
      formData.append('telephone', data.telephone);
    }
    if (data.emailUser) {
      formData.append('emailUser', data.emailUser);
    }

    files.forEach(file => {
      formData.append('files', file);
    });

    return this.http
      .put<Reclamation>(`${this.apiUrl}/${id}/update-with-form`, formData, this.optAuth())
      .pipe(
        map(rec => this.normalizeReclamation(rec)),
        catchError(this.handleError)
      );
  }

  // Obtenir toutes les réclamations de l'utilisateur
  getReclamations(): Observable<Reclamation[]> {
    return this.http
      .get<Reclamation[]>(`${this.apiUrl}/user`, this.optAuth())
      .pipe(
        map(reclamations => reclamations.map(rec => this.normalizeReclamation(rec))),
        catchError(this.handleError)
      );
  }

  // Obtenir une réclamation par son ID
  getReclamationById(id: number): Observable<Reclamation> {
    return this.http
      .get<Reclamation>(`${this.apiUrl}/${id}`, this.optAuth())
      .pipe(
        map(rec => this.normalizeReclamation(rec)),
        catchError(this.handleError)
      );
  }

  // Mettre à jour une réclamation
  updateReclamation(id: number, formData: FormData): Observable<Reclamation> {
    return this.http
      .put<Reclamation>(`${this.apiUrl}/${id}`, formData, this.optAuth())
      .pipe(
        map(rec => this.normalizeReclamation(rec)),
        catchError(this.handleError)
      );
  }

  // Supprimer une réclamation
  deleteReclamation(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, this.optAuth()).pipe(
      catchError(this.handleError)
    );
  }

  // Soumettre un brouillon
  submitDraft(id: number): Observable<Reclamation> {
    return this.http
      .post<Reclamation>(`${this.apiUrl}/${id}/submit`, {}, this.optAuth())
      .pipe(
        map(rec => this.normalizeReclamation(rec)),
        catchError(this.handleError)
      );
  }

  // Obtenir les messages d'une réclamation
  getMessages(reclamationId: number): Observable<Message[]> {
    return this.http
      .get<Message[]>(`${this.apiUrl}/${reclamationId}/messages`, this.optAuth())
      .pipe(
        map(messages => messages.map(msg => this.normalizeMessage(msg))),
        catchError(this.handleError)
      );
  }

  // Envoyer un message (contribuable)
  sendMessage(reclamationId: number, message: Partial<Message>, file?: File | null): Observable<Message> {
    if (file) {
      return this.sendMessageWithFile(reclamationId, message.contenu || '', 'contribuable', file);
    }
    const params = new HttpParams()
      .set('contenu', message.contenu || '')
      .set('auteur', 'contribuable');

    return this.http
      .post<Message>(`${this.apiUrl}/${reclamationId}/messages/simple`, null, {
        params,
        ...this.optAuth(),
      })
      .pipe(
        map(msg => this.normalizeMessage(msg)),
        catchError(this.handleError)
      );
  }

  /** Message envoyé par l'agent DGI (dashboard agent). */
  sendAgentMessage(reclamationId: number, contenu: string, file?: File | null): Observable<Message> {
    if (file) {
      return this.sendMessageWithFile(reclamationId, contenu, 'agent', file);
    }
    const params = new HttpParams().set('contenu', contenu).set('auteur', 'agent');
    return this.http
      .post<Message>(`${this.apiUrl}/${reclamationId}/messages/simple`, null, {
        params,
        ...this.optAuth(),
      })
      .pipe(
        map(msg => this.normalizeMessage(msg)),
        catchError(this.handleError)
      );
  }

  private sendMessageWithFile(
    reclamationId: number,
    contenu: string,
    auteur: 'contribuable' | 'agent',
    file: File
  ): Observable<Message> {
    const formData = new FormData();
    const messagePayload = {
      contenu,
      auteur,
    };
    formData.append(
      'message',
      new Blob([JSON.stringify(messagePayload)], { type: 'application/json' })
    );
    formData.append('file', file);
    return this.http
      .post<Message>(`${this.apiUrl}/${reclamationId}/messages`, formData, this.optAuth())
      .pipe(
        map(msg => this.normalizeMessage(msg)),
        catchError(this.handleError)
      );
  }

  // Marquer les messages comme lus
  markMessagesAsRead(reclamationId: number): Observable<void> {
    return this.http
      .post<void>(`${this.apiUrl}/${reclamationId}/messages/read`, {}, this.optAuth())
      .pipe(catchError(this.handleError));
  }

  // Obtenir les statistiques des réclamations
  getStatistics(): Observable<{
    total: number;
    brouillons: number;
    soumis: number;
    enCours: number;
    resolus: number;
  }> {
    return this.http.get<{
      total: number;
      brouillons: number;
      soumis: number;
      enCours: number;
      resolus: number;
    }>(`${this.apiUrl}/statistics`, this.optAuth()).pipe(
      catchError(this.handleError)
    );
  }

  // Rechercher des réclamations
  searchReclamations(query: string): Observable<Reclamation[]> {
    return this.http
      .get<Reclamation[]>(`${this.apiUrl}/search?q=${encodeURIComponent(query)}`, this.optAuth())
      .pipe(
        map(reclamations => reclamations.map(rec => this.normalizeReclamation(rec))),
        catchError(this.handleError)
      );
  }

  // Filtrer les réclamations par statut
  getReclamationsByStatut(statut: string): Observable<Reclamation[]> {
    return this.http
      .get<Reclamation[]>(`${this.apiUrl}/filter?statut=${statut}`, this.optAuth())
      .pipe(
        map(reclamations => reclamations.map(rec => this.normalizeReclamation(rec))),
        catchError(this.handleError)
      );
  }

  private normalizeReclamation(rec: any): Reclamation {
    const unread = rec?.unreadAgentMessageCount;
    return {
      ...rec,
      type: rec?.type?.value ?? rec?.type ?? '',
      urgence: rec?.urgence?.value ?? rec?.urgence ?? '',
      statut: rec?.statut?.value ?? rec?.statut ?? '',
      etatReclamation: rec?.etatReclamation?.value ?? rec?.etatReclamation ?? '',
      dateCreation: rec?.dateCreation ? new Date(rec.dateCreation) : new Date(),
      dateSoumission: rec?.dateSoumission ? new Date(rec.dateSoumission) : undefined,
      dateResolution: rec?.dateResolution ? new Date(rec.dateResolution) : undefined,
      piecesJointes: rec?.piecesJointes ?? [],
      messages: rec?.messages ?? [],
      unreadAgentMessageCount: unread != null ? Number(unread) : 0,
    };
  }

  private normalizeMessage(msg: any): Message {
    const auteurRaw = msg?.auteur?.value ?? msg?.auteur ?? 'contribuable';
    const normalizedAuteur = `${auteurRaw}`.toLowerCase().includes('agent') ? 'agent' : 'contribuable';
    const rawDate = msg?.dateEnvoi ?? msg?.date ?? new Date();
    return {
      ...msg,
      auteur: normalizedAuteur,
      date: new Date(rawDate),
      lu: msg?.lu ?? false
    };
  }

  // Télécharger une pièce jointe
  downloadPieceJointe(reclamationId: number, fileName: string): Observable<Blob> {
    return this.http
      .get(`${this.apiUrl}/${reclamationId}/files/${fileName}`, {
        ...this.optAuth(),
        responseType: 'blob',
      })
      .pipe(catchError(this.handleError));
  }

  // Supprimer une pièce jointe
  deletePieceJointe(reclamationId: number, fileName: string): Observable<void> {
    return this.http
      .delete<void>(`${this.apiUrl}/${reclamationId}/files/${fileName}`, this.optAuth())
      .pipe(catchError(this.handleError));
  }

  // Gestion des erreurs
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Une erreur est survenue';

    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      // Erreur côté serveur
      switch (error.status) {
        case 400:
          errorMessage = 'Requête invalide. Veuillez vérifier les données saisies.';
          break;
        case 401:
          errorMessage = 'Vous n\'êtes pas autorisé à effectuer cette action.';
          break;
        case 403:
          errorMessage = 'Accès refusé. Vous n\'avez pas les permissions nécessaires.';
          break;
        case 404:
          errorMessage = 'Réclamation non trouvée.';
          break;
        case 409:
          errorMessage = 'Conflit de données. La réclamation existe déjà.';
          break;
        case 413:
          errorMessage = 'Fichier trop volumineux. La taille maximale est de 5MB.';
          break;
        case 415:
          errorMessage = 'Type de fichier non supporté.';
          break;
        case 422:
          errorMessage = 'Données invalides. Veuillez vérifier tous les champs.';
          break;
        case 429:
          errorMessage = 'Trop de requêtes. Veuillez réessayer plus tard.';
          break;
        case 500:
          errorMessage = 'Erreur serveur interne. Veuillez réessayer plus tard.';
          break;
        case 503:
          errorMessage = 'Service temporairement indisponible.';
          break;
        default:
          errorMessage = error.error?.message || `Erreur ${error.status}: ${error.message}`;
      }
    }

    console.error('Erreur ReclamationService:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }

  // Utilitaires
  generateReference(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `REC-${year}${month}${day}-${random}`;
  }

  validateFile(file: File): { isValid: boolean; error?: string } {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, error: 'Type de fichier non autorisé' };
    }

    if (file.size > maxSize) {
      return { isValid: false, error: 'Fichier trop volumineux (max 5MB)' };
    }

    return { isValid: true };
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
