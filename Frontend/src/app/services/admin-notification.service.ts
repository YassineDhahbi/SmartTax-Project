import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AdminNotificationItem {
  id: number;
  eventType: string;
  title: string;
  message: string;
  publicationId?: number;
  isRead: boolean;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminNotificationService {
  private readonly apiUrl = 'http://localhost:8080/api/notifications';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    });
  }

  getMyNotifications(): Observable<AdminNotificationItem[]> {
    return this.http.get<AdminNotificationItem[]>(`${this.apiUrl}/me`, {
      headers: this.getAuthHeaders()
    });
  }

  getMyUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/me/unread-count`, {
      headers: this.getAuthHeaders()
    });
  }

  markAsRead(id: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/read`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  deleteNotification(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, {
      headers: this.getAuthHeaders()
    });
  }
}
