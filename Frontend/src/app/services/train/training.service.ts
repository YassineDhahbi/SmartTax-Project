import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpEventType } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class TrainingService {
  private apiUrl = 'http://localhost:8080/api/training';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    if (!token) {
      throw new Error('No authentication token available');
    }
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  private handleError(error: any) {
    console.error('An error occurred:', error);
    return throwError(() => new Error(error.error?.message || error.message || 'Server error'));
  }

  uploadImages(files: File[], category: string): Observable<any> {
    const formData = new FormData();
    files.forEach(file => formData.append('images', file));
    formData.append('category', category);

    return this.http.post(`${this.apiUrl}/upload`, formData, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  getTrainingImages(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/images`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  deleteImage(imageName: string, category: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/images/${category}/${imageName}`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  trainModel(): Observable<any> {
    return this.http.post(`${this.apiUrl}/train`, {}, {
      headers: this.getHeaders(),
      observe: 'response' // Assure que la réponse complète (incluant le body) est renvoyée
    }).pipe(
      catchError(this.handleError)
    );
  }
}
