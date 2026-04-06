import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, filter } from 'rxjs/operators';

export interface CINData {
  cin: string | null;
  nom: string | null;
  prenom: string | null;
  date_naissance: string | null;
  lieu_naissance: string | null;
  sexe: string | null;
  date_expiration: string | null;
  nationalite: string | null;
}

export interface OCRResponse {
  success: boolean;
  data: CINData;
  method: string;
  confidence: number;
  real_text: string | null;
  message?: string;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class OcrService {
  private readonly apiUrl = 'http://localhost:8080/api/ocr';

  constructor(private http: HttpClient) {}

  /**
   * Extrait les informations d'une CIN à partir d'une image
   */
  extractCINInformation(file: File): Observable<OCRResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<OCRResponse>(`${this.apiUrl}/extract-cin`, formData, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      map(event => {
        if (event.type === HttpEventType.Response) {
          return event.body as OCRResponse;
        }
        return null;
      }),
      filter((response): response is OCRResponse => response !== null),
      catchError(error => {
        console.error('❌ Erreur OCR:', error);
        return throwError(() => ({
          success: false,
          data: this.getEmptyCINData(),
          method: 'Error',
          confidence: 0,
          real_text: null,
          message: 'Erreur de communication avec le service OCR',
          timestamp: Date.now()
        } as OCRResponse));
      })
    );
  }

  /**
   * Vérifie si le service OCR est disponible
   */
  checkServiceHealth(): Observable<{ available: boolean; message: string }> {
    return this.http.get<{ available: boolean; message: string }>(`${this.apiUrl}/health`).pipe(
      catchError(error => {
        console.warn('⚠️ Service OCR indisponible:', error);
        return throwError(() => ({
          available: false,
          message: 'Service OCR indisponible'
        }));
      })
    );
  }

  /**
   * Teste la connexion avec le service OCR
   */
  testOCRService(): Observable<{ available: boolean; message: string; timestamp: number }> {
    return this.http.get<{ available: boolean; message: string; timestamp: number }>(`${this.apiUrl}/test`).pipe(
      catchError(error => {
        console.error('❌ Erreur test OCR:', error);
        return throwError(() => ({
          available: false,
          message: 'Erreur de connexion au service OCR',
          timestamp: Date.now()
        }));
      })
    );
  }

  /**
   * Valide et corrige une extraction manuelle
   */
  validateExtraction(extractionData: any): Observable<OCRResponse> {
    return this.http.post<OCRResponse>(`${this.apiUrl}/validate-extraction`, extractionData).pipe(
      catchError(error => {
        console.error('❌ Erreur validation extraction:', error);
        return throwError(() => ({
          success: false,
          data: this.getEmptyCINData(),
          method: 'Manual Validation',
          confidence: 0,
          real_text: null,
          message: 'Erreur lors de la validation',
          timestamp: Date.now()
        } as OCRResponse));
      })
    );
  }

  /**
   * Crée des données CIN vides pour le fallback
   */
  private getEmptyCINData(): CINData {
    return {
      cin: null,
      nom: null,
      prenom: null,
      date_naissance: null,
      lieu_naissance: null,
      sexe: null,
      date_expiration: null,
      nationalite: 'Tunisienne'
    };
  }

  /**
   * Convertit une date JJ/MM/AAAA en format pour input date
   */
  convertDateForInput(dateString: string | null): string {
    if (!dateString) return '';
    
    const dateParts = dateString.split('/');
    if (dateParts.length !== 3) return '';
    
    const [day, month, year] = dateParts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  /**
   * Valide les données extraites
   */
  validateExtractedData(data: CINData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (data.cin && !/^\d{8}$/.test(data.cin)) {
      errors.push('Le CIN doit contenir exactement 8 chiffres');
    }

    if (data.nom && !/^[A-Z\s-]+$/.test(data.nom)) {
      errors.push('Le nom ne doit contenir que des lettres majuscules, espaces et tirets');
    }

    if (data.prenom && !/^[A-Z\s-]+$/.test(data.prenom)) {
      errors.push('Le prénom ne doit contenir que des lettres majuscules, espaces et tirets');
    }

    if (data.date_naissance && !/^\d{2}\/\d{2}\/\d{4}$/.test(data.date_naissance)) {
      errors.push('La date de naissance doit être au format JJ/MM/AAAA');
    }

    if (data.sexe && !/^[MF]$/.test(data.sexe)) {
      errors.push('Le sexe doit être M ou F');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Calcule le score de qualité des données extraites
   */
  calculateQualityScore(data: CINData): number {
    let score = 0;

    if (data.cin && /^\d{8}$/.test(data.cin)) score += 30;
    if (data.nom && data.nom.length > 2) score += 25;
    if (data.prenom && data.prenom.length > 2) score += 25;
    if (data.date_naissance && /^\d{2}\/\d{2}\/\d{4}$/.test(data.date_naissance)) score += 15;
    if (data.lieu_naissance && data.lieu_naissance.length > 2) score += 3;
    if (data.sexe && /^[MF]$/.test(data.sexe)) score += 2;

    return Math.min(score, 100);
  }
}
