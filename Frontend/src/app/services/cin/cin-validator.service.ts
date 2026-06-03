import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// Interface pour la réponse de l'API
interface PredictionResponse {
  status: string;
  confidence: number;
  valid: boolean;
  adjusted: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CinValidatorService {
  private apiUrl = `${environment.apiUrl}/cin-validator/verify`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  validateCin(imageFile: File): Observable<PredictionResponse> {
    const formData = new FormData();
    formData.append('cin_image', imageFile);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });

    return this.http.post(this.apiUrl, formData, { headers }).pipe(
      map((response: any) => ({
        status: response.status,
        confidence: response.confidence,
        valid: response.valid,
        adjusted: response.adjusted
      }))
    );
  }
}
