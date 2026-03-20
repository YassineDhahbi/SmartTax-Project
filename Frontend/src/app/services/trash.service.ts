import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface TrashItem {
  id: string;
  originalId: string;
  type: 'IMMATRICULATION';
  data: any;
  deletedAt: Date;
  deletedBy: string;
  daysRemaining: number;
  expired: boolean;
  expiringSoon: boolean;
}

export interface TrashStats {
  totalItems: number;
  expiringSoon: number;
  expired: number;
}

@Injectable({
  providedIn: 'root'
})
export class TrashService {
  private readonly apiUrl = 'http://localhost:8080/api/trash';

  constructor(private http: HttpClient) {}

  // Déplacer une immatriculation vers la corbeille
  moveToTrash(immatriculationId: string, deletedBy: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/move`, null, {
      params: {
        immatriculationId: immatriculationId,
        deletedBy: deletedBy
      }
    });
  }

  // Récupérer tous les éléments de la corbeille
  getTrashItems(): Observable<TrashItem[]> {
    return this.http.get<any[]>(`${this.apiUrl}/items`);
  }

  // Récupérer les éléments par type
  getTrashItemsByType(type: string): Observable<TrashItem[]> {
    return this.http.get<any[]>(`${this.apiUrl}/items/type/${type}`);
  }

  // Restaurer un élément depuis la corbeille
  restoreFromTrash(trashId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/restore/${trashId}`, {});
  }

  // Supprimer définitivement un élément
  permanentDelete(trashId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/permanent/${trashId}`);
  }

  // Vider complètement la corbeille
  emptyTrash(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/empty`);
  }

  // Nettoyer automatiquement les éléments expirés (plus de 30 jours)
  cleanExpiredItems(): Observable<any> {
    return this.http.post(`${this.apiUrl}/clean-expired`, {});
  }

  // Obtenir les statistiques de la corbeille
  getTrashStats(): Observable<TrashStats> {
    return this.http.get<TrashStats>(`${this.apiUrl}/stats`);
  }

  // Récupérer les éléments expirant bientôt
  getItemsExpiringSoon(): Observable<TrashItem[]> {
    return this.http.get<any[]>(`${this.apiUrl}/items/expiring-soon`);
  }

  // Restaurer plusieurs éléments
  restoreBatch(trashIds: string[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/restore-batch`, trashIds);
  }

  // Supprimer définitivement plusieurs éléments
  permanentDeleteBatch(trashIds: string[]): Observable<any> {
    return this.http.delete(`${this.apiUrl}/permanent-batch`, { body: trashIds });
  }

  // Vérifier si un élément expire bientôt (dans les 3 jours)
  isExpiringSoon(deletedAt: Date): boolean {
    const daysRemaining = this.calculateDaysRemaining(deletedAt);
    return daysRemaining <= 3 && daysRemaining > 0;
  }

  // Vérifier si un élément est expiré
  isExpired(deletedAt: Date): boolean {
    return this.calculateDaysRemaining(deletedAt) === 0;
  }

  // Calculer le nombre de jours restants avant suppression définitive
  private calculateDaysRemaining(deletedAt: Date): number {
    const now = new Date();
    const deletedDate = new Date(deletedAt);
    const diffTime = deletedDate.getTime() + (30 * 24 * 60 * 60 * 1000) - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }
}
