import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  Publication, 
  PublicationFilters, 
  PublicationStats, 
  CreatePublicationRequest, 
  UpdatePublicationRequest, 
  PublicationResponse 
} from '../models/publication.model';

@Injectable({
  providedIn: 'root'
})
export class PublicationService {
  private readonly apiUrl = 'http://localhost:8080/api/publications';

  constructor(private http: HttpClient) {}

  // Méthode pour obtenir les headers avec le token JWT
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    });
  }

  // ==================== GET OPERATIONS ====================

  /**
   * Récupérer toutes les publications avec filtres
   */
  getPublications(filters?: PublicationFilters): Observable<PublicationResponse> {
    let params = new HttpParams();
    
    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = filters[key as keyof PublicationFilters];
        if (value !== undefined && value !== null) {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<PublicationResponse>(this.apiUrl, { params });
  }

  /**
   * Récupérer une publication par son ID
   */
  getPublicationById(id: number): Observable<Publication> {
    return this.http.get<Publication>(`${this.apiUrl}/${id}`);
  }

  /**
   * Récupérer les statistiques des publications
   */
  getPublicationStats(): Observable<PublicationStats> {
    return this.http.get<PublicationStats>(`${this.apiUrl}/stats`);
  }

  /**
   * Récupérer les publications épinglées
   */
  getPinnedPublications(): Observable<Publication[]> {
    return this.http.get<Publication[]>(`${this.apiUrl}/pinned`);
  }

  /**
   * Récupérer les publications par statut
   */
  getPublicationsByStatus(status: Publication['status']): Observable<Publication[]> {
    return this.http.get<Publication[]>(`${this.apiUrl}/status/${status}`);
  }

  // ==================== CREATE OPERATIONS ====================

  /**
   * Méthode helper pour créer avec FormData et image
   */
  private createWithImage(publication: CreatePublicationRequest, image?: File): Observable<Publication> {
    const formData = new FormData();
    
    // Ajouter les données de la publication
    const publicationData = {
      title: publication.title,
      summary: publication.summary,
      content: publication.content,
      image_url: publication.image_url,
      language: publication.language || 'fr',
      is_pinned: publication.is_pinned || false,
      scheduled_at: publication.scheduled_at,
      status: publication.status,
      aiGeneratedTags: publication.ai_generated_tags || []
    };
    
    console.log('📤 Données publicationData avant envoi:', publicationData);
    console.log('📤 Tags dans publicationData:', publicationData.aiGeneratedTags);
    console.log('📤 Type des tags dans publicationData:', typeof publicationData.aiGeneratedTags);
    
    formData.append('publication', new Blob([JSON.stringify(publicationData)], { type: 'application/json' }));
    
    // Log du contenu FormData pour débogage
    console.log('📤 FormData créé - publication blob ajouté');
    
    // Ajouter l'image si fournie
    if (image) {
      formData.append('image', image);
      console.log('📤 Image ajoutée au FormData:', image.name);
    }
    
    return this.http.post<Publication>(this.apiUrl, formData, { headers: this.getAuthHeaders() });
  }

  /**
   * Créer une nouvelle publication avec support d'image
   */
  createPublication(publication: CreatePublicationRequest, image?: File): Observable<Publication> {
    return this.createWithImage(publication, image);
  }

  /**
   * Créer un brouillon
   */
  createDraft(publication: CreatePublicationRequest, image?: File): Observable<Publication> {
    return this.createWithImage(publication, image);
  }

  // ==================== UPDATE OPERATIONS ====================

  /**
   * Mettre à jour une publication
   */
  updatePublication(id: number, publication: UpdatePublicationRequest): Observable<Publication> {
    return this.http.put<Publication>(`${this.apiUrl}/${id}`, publication);
  }

  /**
   * Mettre à jour le statut d'une publication
   */
  updatePublicationStatus(id: number, status: Publication['status'], rejectionReason?: string): Observable<Publication> {
    const body = { status, rejection_reason: rejectionReason };
    return this.http.patch<Publication>(`${this.apiUrl}/${id}/status`, body);
  }

  /**
   * Épingler/désépingler une publication
   */
  togglePinPublication(id: number): Observable<Publication> {
    return this.http.patch<Publication>(`${this.apiUrl}/${id}/pin`, {});
  }

  /**
   * Programmer une publication
   */
  schedulePublication(id: number, scheduledAt: string): Observable<Publication> {
    return this.http.patch<Publication>(`${this.apiUrl}/${id}/schedule`, { scheduled_at: scheduledAt });
  }

  // ==================== DELETE OPERATIONS ====================

  /**
   * Supprimer une publication (soft delete)
   */
  deletePublication(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Restaurer une publication supprimée
   */
  restorePublication(id: number): Observable<Publication> {
    return this.http.patch<Publication>(`${this.apiUrl}/${id}/restore`, {});
  }

  /**
   * Archiver une publication
   */
  archivePublication(id: number): Observable<Publication> {
    return this.http.patch<Publication>(`${this.apiUrl}/${id}/archive`, {});
  }

  // ==================== INTERACTIONS ====================

  /**
   * Ajouter un like à une publication
   */
  likePublication(id: number): Observable<Publication> {
    return this.http.post<Publication>(`${this.apiUrl}/${id}/like`, {});
  }

  /**
   * Ajouter un dislike à une publication
   */
  dislikePublication(id: number): Observable<Publication> {
    return this.http.post<Publication>(`${this.apiUrl}/${id}/dislike`, {});
  }

  /**
   * Ajouter aux favoris
   */
  favoritePublication(id: number): Observable<Publication> {
    return this.http.post<Publication>(`${this.apiUrl}/${id}/favorite`, {});
  }

  /**
   * Retirer des favoris
   */
  unfavoritePublication(id: number): Observable<Publication> {
    return this.http.delete<Publication>(`${this.apiUrl}/${id}/favorite`);
  }

  /**
   * Signaler une publication
   */
  reportPublication(id: number, reason: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/report`, { reason });
  }

  /**
   * Incrémenter le compteur de vues
   */
  incrementViews(id: number): Observable<Publication> {
    return this.http.patch<Publication>(`${this.apiUrl}/${id}/views`, {});
  }

  // ==================== VALIDATION ====================

  /**
   * Valider une publication (pour les admins)
   */
  validatePublication(id: number): Observable<Publication> {
    return this.http.patch<Publication>(`${this.apiUrl}/${id}/validate`, {});
  }

  /**
   * Rejeter une publication (pour les admins)
   */
  rejectPublication(id: number, rejectionReason: string): Observable<Publication> {
    return this.http.patch<Publication>(`${this.apiUrl}/${id}/reject`, { 
      rejection_reason: rejectionReason 
    });
  }

  // ==================== SEARCH & FILTER ====================

  /**
   * Rechercher des publications
   */
  searchPublications(query: string, filters?: PublicationFilters): Observable<PublicationResponse> {
    const searchFilters = { ...filters, search: query };
    return this.getPublications(searchFilters);
  }

  /**
   * Récupérer les publications par langue
   */
  getPublicationsByLanguage(language: string): Observable<Publication[]> {
    return this.http.get<Publication[]>(`${this.apiUrl}/language/${language}`);
  }

  /**
   * Récupérer les publications créées par un agent
   */
  getPublicationsByAgent(agentId: number): Observable<Publication[]> {
    return this.http.get<Publication[]>(`${this.apiUrl}/agent/${agentId}`);
  }

  /**
   * Récupérer les publications validées par un admin
   */
  getPublicationsByAdmin(adminId: number): Observable<Publication[]> {
    return this.http.get<Publication[]>(`${this.apiUrl}/admin/${adminId}`);
  }

  // ==================== BULK OPERATIONS ====================

  /**
   * Supprimer plusieurs publications en une fois
   */
  bulkDeletePublications(ids: number[]): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/bulk/delete`, { ids });
  }

  /**
   * Archiver plusieurs publications en une fois
   */
  bulkArchivePublications(ids: number[]): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/bulk/archive`, { ids });
  }

  /**
   * Mettre à jour le statut de plusieurs publications
   */
  bulkUpdateStatus(ids: number[], status: Publication['status']): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/bulk/status`, { ids, status });
  }
}
