import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { AdminNotificationItem, AdminNotificationService } from 'src/app/services/admin-notification.service';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.css']
})
export class TopbarComponent implements OnInit, OnDestroy {
  notifications: AdminNotificationItem[] = [];
  unreadCount = 0;
  showNotificationsPanel = false;
  isLoadingNotifications = false;
  deletingNotificationId: number | null = null;
  private refreshSub?: Subscription;

  constructor(
    private router: Router,
    private adminNotificationService: AdminNotificationService
  ) {}

  ngOnInit(): void {
    this.refreshNotifications();
    this.refreshSub = interval(15000).subscribe(() => this.refreshNotifications());
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  toggleNotificationsPanel(): void {
    this.showNotificationsPanel = !this.showNotificationsPanel;
    if (this.showNotificationsPanel) {
      this.refreshNotifications();
    }
  }

  openNotification(item: AdminNotificationItem): void {
    if (!item) {
      return;
    }
    const goToTarget = () => this.navigateFromNotification(item);

    if (item.isRead) {
      goToTarget();
      return;
    }

    this.adminNotificationService.markAsRead(item.id).subscribe({
      next: () => {
        item.isRead = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
        goToTarget();
      },
      error: () => {
        goToTarget();
      }
    });
  }

  deleteNotification(item: AdminNotificationItem, event: Event): void {
    event.stopPropagation();
    if (!item?.id || this.deletingNotificationId) {
      return;
    }

    this.deletingNotificationId = item.id;
    this.adminNotificationService.deleteNotification(item.id).subscribe({
      next: () => {
        const wasUnread = !item.isRead;
        this.notifications = this.notifications.filter((notif) => notif.id !== item.id);
        if (wasUnread) {
          this.unreadCount = Math.max(0, this.unreadCount - 1);
        }
        this.deletingNotificationId = null;
      },
      error: () => {
        this.deletingNotificationId = null;
      }
    });
  }

  formatNotificationDate(createdAt?: string): string {
    if (!createdAt) {
      return '';
    }
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  get publicationNotifications(): AdminNotificationItem[] {
    return this.notifications.filter(
      (item) => !this.isImmatriculationNotification(item) && !this.isUserNotification(item)
    );
  }

  get immatriculationNotifications(): AdminNotificationItem[] {
    return this.notifications.filter((item) => this.isImmatriculationNotification(item));
  }

  get userNotifications(): AdminNotificationItem[] {
    return this.notifications.filter((item) => this.isUserNotification(item));
  }

  private navigateFromNotification(item: AdminNotificationItem): void {
    const eventType = `${item?.eventType || ''}`.toUpperCase();
    this.showNotificationsPanel = false;

    if (eventType.includes('IMMATRICULATION')) {
      this.router.navigate(['/admin/immatriculations'], {
        queryParams: item.publicationId
          ? { openImmatriculationId: item.publicationId }
          : { openLatestImmatriculation: 'true' }
      });
      return;
    }

    if (eventType.includes('USER')) {
      this.router.navigate(['/admin/utilisateurs'], {
        queryParams: item.publicationId ? { openUserId: item.publicationId } : {}
      });
      return;
    }

    if (item.publicationId) {
      this.router.navigate(['/admin/publications'], { queryParams: { openPublicationId: item.publicationId } });
    }
  }

  private isImmatriculationNotification(item: AdminNotificationItem): boolean {
    const eventType = `${item?.eventType || ''}`.toUpperCase();
    return eventType.includes('IMMATRICULATION');
  }

  private isUserNotification(item: AdminNotificationItem): boolean {
    const eventType = `${item?.eventType || ''}`.toUpperCase();
    return eventType.includes('USER');
  }

  private refreshNotifications(): void {
    this.isLoadingNotifications = true;
    this.adminNotificationService.getMyNotifications().subscribe({
      next: (items) => {
        this.notifications = Array.isArray(items) ? items : [];
        this.isLoadingNotifications = false;
      },
      error: () => {
        this.notifications = [];
        this.isLoadingNotifications = false;
      }
    });
    this.adminNotificationService.getMyUnreadCount().subscribe({
      next: (res) => {
        this.unreadCount = Number(res?.count ?? 0);
      },
      error: () => {
        this.unreadCount = 0;
      }
    });
  }

  logout(): void {
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }
}
