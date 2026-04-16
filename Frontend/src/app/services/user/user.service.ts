import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Utilisateur } from 'src/app/models/utilisateur';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:8080/api/users';

  constructor(private http: HttpClient) {}

  getUserDetails(): Observable<Utilisateur> {
    const token = localStorage.getItem('token');
    if (!token) {
      return throwError(() => new Error('No token found'));
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.get<Utilisateur>(`${this.apiUrl}/me`, { headers }).pipe(
      map(data => new Utilisateur(data)),
      catchError(error => {
        console.error('Error fetching user details:', error);
        return throwError(() => new Error('Failed to fetch user details'));
      })
    );
  }

  updateUserDetails(user: Partial<Utilisateur>): Observable<Utilisateur> {
    const token = localStorage.getItem('token');
    if (!token) {
      return throwError(() => new Error('No token found'));
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    console.log('Sending update request to:', `${this.apiUrl}/updateuser`);
    console.log('User data:', user);

    return this.http.put<Utilisateur>(`${this.apiUrl}/updateuser`, user, { headers }).pipe(
      map(data => new Utilisateur(data)),
      catchError(error => {
        console.error('Error updating user details:', error);
        return throwError(() => new Error('Failed to update user details'));
      })
    );
  }

  checkPassword(oldPassword: string): Observable<boolean> {
    const token = localStorage.getItem('token');
    if (!token) {
      return throwError(() => new Error('No token found'));
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.post<boolean>(`${this.apiUrl}/check-password`, { password: oldPassword }, { headers }).pipe(
      map(response => response),
      catchError(error => {
        console.error('Error checking password:', error);
        return throwError(() => new Error('Failed to check password'));
      })
    );
  }

  deleteUser(): Observable<void> {
    const token = localStorage.getItem('token');
    if (!token) {
      return throwError(() => new Error('No token found'));
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.delete<void>(`${this.apiUrl}/deleteuser`, { headers }).pipe(
      catchError(error => {
        console.error('Error deleting user:', error);
        return throwError(() => new Error('Failed to delete user'));
      })
    );
  }

  createUser(user: any): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      return throwError(() => new Error('No token found'));
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.post<any>(`${this.apiUrl}/register`, user, { headers }).pipe(
      catchError(error => {
        console.error('Error creating user:', error);
        return throwError(() => new Error('Failed to create user'));
      })
    );
  }

  uploadPhoto(file: File): Observable<string> {
    const token = localStorage.getItem('token');
    if (!token) {
      return throwError(() => new Error('No token found'));
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<{ success: boolean; photoPath?: string; error?: string }>(`${this.apiUrl}/upload-photo`, formData, { headers }).pipe(
      map(response => {
        if (response.success && response.photoPath) {
          return response.photoPath;
        } else {
          throw new Error(response.error || 'Échec du téléchargement');
        }
      }),
      catchError(error => {
        console.error('Error uploading photo:', error);
        return throwError(() => new Error('Failed to upload photo: ' + (error.error?.error || error.message)));
      })
    );
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post('http://localhost:8080/api/auth/forgot-password', { email }).pipe(
      catchError(error => {
        console.error('Error sending forgot password email:', error);
        return throwError(() => new Error('Failed to send reset email'));
      })
    );
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post('http://localhost:8080/api/auth/reset-password', { token, newPassword }).pipe(
      catchError(error => {
        console.error('Error resetting password:', error);
        return throwError(() => new Error('Failed to reset password'));
      })
    );
  }

  getAllUtilisateurs(): Observable<Utilisateur[]> {
    const token = localStorage.getItem('token');
    if (!token) {
      return throwError(() => new Error('No token found'));
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.get<Utilisateur[]>(`${this.apiUrl}/all`, { headers }).pipe(
      map(data => data.map(user => new Utilisateur(user))),
      catchError(error => {
        console.error('Error fetching all users:', error);
        return throwError(() => new Error('Failed to fetch users'));
      })
    );
  }

  deleteUser1(id: number): Observable<void> {
    const token = localStorage.getItem('token');
    if (!token) {
      return throwError(() => new Error('No token found'));
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers }).pipe(
      catchError(error => {
        console.error('Error deleting user:', error);
        return throwError(() => new Error('Failed to delete user'));
      })
    );
  }

  updateUserById(id: number, user: Partial<Utilisateur>): Observable<Utilisateur> {
    const token = localStorage.getItem('token');
    if (!token) {
      return throwError(() => new Error('No token found'));
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    console.log('=== UPDATE USER DEBUG ===');
    console.log('Sending update request to:', `${this.apiUrl}/${id}`);
    console.log('User ID:', id);
    console.log('User data:', JSON.stringify(user, null, 2));
    console.log('Headers:', headers);
    console.log('========================');

    return this.http.put<Utilisateur>(`${this.apiUrl}/${id}`, user, { headers }).pipe(
      map(data => {
        console.log('Update successful, response:', data);
        return new Utilisateur(data);
      }),
      catchError(error => {
        console.error('=== UPDATE USER ERROR ===');
        console.error('Error updating user by ID:', error);
        console.error('Error status:', error.status);
        console.error('Error statusText:', error.statusText);
        console.error('Error message:', error.message);
        console.error('Error details:', error.error);
        console.error('Full error object:', JSON.stringify(error, null, 2));
        console.error('========================');
        return throwError(() => new Error('Failed to update user details'));
      })
    );
  }
}
