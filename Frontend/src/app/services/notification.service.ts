import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications$ = new BehaviorSubject<Notification[]>([]);
  private notificationCounter = 0;

  // Observable pour les composants qui veulent écouter les notifications
  getNotifications(): Observable<Notification[]> {
    return this.notifications$.asObservable();
  }

  // Ajouter une notification de succès
  showSuccess(message: string, title: string = 'Succès', duration: number = 5000): void {
    this.addNotification({
      type: 'success',
      title,
      message,
      duration
    });
  }

  // Ajouter une notification d'erreur
  showError(message: string, title: string = 'Erreur', duration: number = 8000): void {
    this.addNotification({
      type: 'error',
      title,
      message,
      duration
    });
  }

  // Ajouter un avertissement
  showWarning(message: string, title: string = 'Attention', duration: number = 6000): void {
    this.addNotification({
      type: 'warning',
      title,
      message,
      duration
    });
  }

  // Ajouter une information
  showInfo(message: string, title: string = 'Information', duration: number = 5000): void {
    this.addNotification({
      type: 'info',
      title,
      message,
      duration
    });
  }

  // Ajouter une notification personnalisée
  addNotification(notification: Omit<Notification, 'id' | 'timestamp'>): void {
    const newNotification: Notification = {
      ...notification,
      id: this.generateId(),
      timestamp: new Date(),
      duration: notification.duration || 5000
    };

    const currentNotifications = this.notifications$.value;
    this.notifications$.next([...currentNotifications, newNotification]);

    // Auto-suppression après la durée spécifiée
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        this.removeNotification(newNotification.id);
      }, newNotification.duration);
    }
  }

  // Supprimer une notification spécifique
  removeNotification(id: string): void {
    const currentNotifications = this.notifications$.value;
    const updatedNotifications = currentNotifications.filter(n => n.id !== id);
    this.notifications$.next(updatedNotifications);
  }

  // Supprimer toutes les notifications
  clearAll(): void {
    this.notifications$.next([]);
  }

  // Supprimer les notifications d'un type spécifique
  clearByType(type: Notification['type']): void {
    const currentNotifications = this.notifications$.value;
    const updatedNotifications = currentNotifications.filter(n => n.type !== type);
    this.notifications$.next(updatedNotifications);
  }

  // Marquer une notification comme lue (pour fonctionnalités futures)
  markAsRead(id: string): void {
    // Implémentation future pour le suivi des notifications lues
    console.log(`Notification ${id} marked as read`);
  }

  // Obtenir le nombre de notifications actives
  getNotificationCount(): number {
    return this.notifications$.value.length;
  }

  // Obtenir le nombre de notifications par type
  getNotificationCountByType(type: Notification['type']): number {
    return this.notifications$.value.filter(n => n.type === type).length;
  }

  // Générer un ID unique pour la notification
  private generateId(): string {
    return `notification-${++this.notificationCounter}-${Date.now()}`;
  }

  // Méthodes utilitaires pour les cas d'usage courants

  // Notification de succès pour la création
  showCreationSuccess(entityName: string, identifier?: string): void {
    const message = identifier 
      ? `${entityName} "${identifier}" a été créé avec succès.`
      : `${entityName} a été créé avec succès.`;
    this.showSuccess(message, 'Création réussie');
  }

  // Notification de succès pour la mise à jour
  showUpdateSuccess(entityName: string, identifier?: string): void {
    const message = identifier 
      ? `${entityName} "${identifier}" a été mis à jour avec succès.`
      : `${entityName} a été mis à jour avec succès.`;
    this.showSuccess(message, 'Mise à jour réussie');
  }

  // Notification de succès pour la suppression
  showDeleteSuccess(entityName: string): void {
    this.showSuccess(`${entityName} a été supprimé avec succès.`, 'Suppression réussie');
  }

  // Notification d'erreur de réseau
  showNetworkError(): void {
    this.showError(
      'Impossible de se connecter au serveur. Veuillez vérifier votre connexion internet.',
      'Erreur de connexion'
    );
  }

  // Notification d'erreur de validation
  showValidationError(errors: string[]): void {
    const message = errors.length > 0 
      ? `Veuillez corriger les erreurs suivantes:\n${errors.join('\n• ')}`
      : 'Veuillez vérifier les champs du formulaire.';
    this.showError(message, 'Erreur de validation');
  }

  // Notification de chargement
  showLoading(message: string = 'Chargement en cours...'): void {
    this.showInfo(message, 'Chargement', 0); // durée 0 = pas d'auto-suppression
  }

  // Notification d'opération terminée
  showOperationComplete(operation: string): void {
    this.showSuccess(`${operation} terminée avec succès.`, 'Opération réussie');
  }

  // Notification d'erreur d'autorisation
  showAuthError(): void {
    this.showError(
      'Vous n\'avez pas les permissions nécessaires pour effectuer cette action.',
      'Non autorisé'
    );
  }

  // Notification pour les doublons
  showDuplicateError(field: string, value: string): void {
    this.showError(
      `Un enregistrement avec ${field} "${value}" existe déjà.`,
      'Doublon détecté'
    );
  }
}
