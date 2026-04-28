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
    const goToPublication = () => {
      if (item.publicationId) {
        this.showNotificationsPanel = false;
        this.router.navigate(['/admin/publications'], { queryParams: { openPublicationId: item.publicationId } });
      }
    };

    if (item.isRead) {
      goToPublication();
      return;
    }

    this.adminNotificationService.markAsRead(item.id).subscribe({
      next: () => {
        item.isRead = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
        goToPublication();
      },
      error: () => {
        goToPublication();
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
