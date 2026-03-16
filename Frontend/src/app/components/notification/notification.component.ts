import { Component, OnInit, OnDestroy } from '@angular/core';
import { NotificationService, Notification } from '../../services/notification.service';
import { Subscription } from 'rxjs';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-notification',
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.css'],
  animations: [
    trigger('notificationAnimation', [
      state('void', style({
        opacity: 0,
        transform: 'translateX(100%) scale(0.8)'
      })),
      state('*', style({
        opacity: 1,
        transform: 'translateX(0) scale(1)'
      })),
      transition('void => *', animate('300ms ease-out')),
      transition('* => void', animate('200ms ease-in'))
    ]),
    trigger('progressAnimation', [
      state('*', style({
        width: '100%'
      })),
      state('void', style({
        width: '0%'
      })),
      transition('* => void', animate('{{duration}} linear'))
    ])
  ]
})
export class NotificationComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  private subscription: Subscription = new Subscription();

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    // S'abonner aux notifications
    this.subscription = this.notificationService.getNotifications()
      .subscribe(notifications => {
        this.notifications = notifications;
      });
  }

  ngOnDestroy(): void {
    // Se désabonner pour éviter les fuites de mémoire
    this.subscription.unsubscribe();
  }

  // Supprimer une notification
  removeNotification(id: string): void {
    this.notificationService.removeNotification(id);
  }

  // Formater l'heure de la notification
  formatTime(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    
    if (diff < 60000) { // Moins d'une minute
      return 'À l\'instant';
    } else if (diff < 3600000) { // Moins d'une heure
      const minutes = Math.floor(diff / 60000);
      return `Il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else if (diff < 86400000) { // Moins d'un jour
      const hours = Math.floor(diff / 3600000);
      return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
    } else {
      const days = Math.floor(diff / 86400000);
      return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
    }
  }

  // Supprimer toutes les notifications
  clearAll(): void {
    this.notificationService.clearAll();
  }

  // Obtenir la classe CSS pour le type de notification
  getNotificationClass(type: Notification['type']): string {
    switch (type) {
      case 'success':
        return 'notification-success';
      case 'error':
        return 'notification-error';
      case 'warning':
        return 'notification-warning';
      case 'info':
        return 'notification-info';
      default:
        return 'notification-info';
    }
  }
}
