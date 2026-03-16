import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ValidationService {
  private readonly apiUrl = 'http://localhost:8080/api/immatriculation';

  constructor(private http: HttpClient) {}

  /**
   * Vérifie si un CIN existe déjà
   */
  checkCinExists(cin: string): Observable<boolean> {
    const params = new HttpParams().set('cin', cin);
    return this.http.get<{ [key: string]: boolean }>(`${this.apiUrl}/check-duplicates`, { params })
      .pipe(map(response => response['cinExists'] || false));
  }

  /**
   * Vérifie si un email existe déjà
   */
  checkEmailExists(email: string): Observable<boolean> {
    const params = new HttpParams().set('email', email);
    return this.http.get<{ [key: string]: boolean }>(`${this.apiUrl}/check-duplicates`, { params })
      .pipe(map(response => response['emailExists'] || false));
  }

  /**
   * Vérifie si un registre de commerce existe déjà
   */
  checkRegistreCommerceExists(registreCommerce: string): Observable<boolean> {
    const params = new HttpParams().set('registreCommerce', registreCommerce);
    return this.http.get<{ [key: string]: boolean }>(`${this.apiUrl}/check-duplicates`, { params })
      .pipe(map(response => response['registreCommerceExists'] || false));
  }

  /**
   * Vérifie tous les doublons potentiels
   */
  checkAllDuplicates(data: {
    cin?: string;
    email?: string;
    registreCommerce?: string;
  }): Observable<{
    cinExists?: boolean;
    emailExists?: boolean;
    registreCommerceExists?: boolean;
  }> {
    let params = new HttpParams();
    
    if (data.cin) {
      params = params.set('cin', data.cin);
    }
    if (data.email) {
      params = params.set('email', data.email);
    }
    if (data.registreCommerce) {
      params = params.set('registreCommerce', data.registreCommerce);
    }

    return this.http.get<{ [key: string]: boolean }>(`${this.apiUrl}/check-duplicates`, { params });
  }

  /**
   * Valide un CIN (format tunisien)
   */
  validateCinFormat(cin: string): boolean {
    // Format CIN tunisien : 8 chiffres
    const cinPattern = /^[0-9]{8}$/;
    return cinPattern.test(cin);
  }

  /**
   * Valide un email
   */
  validateEmailFormat(email: string): boolean {
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailPattern.test(email);
  }

  /**
   * Valide un téléphone tunisien
   */
  validatePhoneFormat(phone: string): boolean {
    // Formats tunisiens : 216XXXXXXXX ou 8 chiffres
    const phonePattern = /^(216[0-9]{8}|[0-9]{8})$/;
    return phonePattern.test(phone.replace(/\s/g, ''));
  }

  /**
   * Valide un registre de commerce
   */
  validateRegistreCommerceFormat(rc: string): boolean {
    // Format RC tunisien : généralement alphanumérique
    const rcPattern = /^[A-Za-z0-9]{5,20}$/;
    return rcPattern.test(rc);
  }

  /**
   * Messages d'erreur personnalisés
   */
  getErrorMessage(field: string, value: string): string {
    switch (field) {
      case 'cin':
        if (!this.validateCinFormat(value)) {
          return 'Le CIN doit contenir exactement 8 chiffres';
        }
        return 'Ce CIN existe déjà dans notre base de données';
      
      case 'email':
        if (!this.validateEmailFormat(value)) {
          return 'Veuillez entrer une adresse email valide';
        }
        return 'Cet email est déjà utilisé par un autre contribuable';
      
      case 'telephone':
        if (!this.validatePhoneFormat(value)) {
          return 'Le numéro de téléphone doit commencer par 216 suivi de 8 chiffres, ou contenir 8 chiffres';
        }
        return 'Format de téléphone invalide';
      
      case 'registreCommerce':
        if (!this.validateRegistreCommerceFormat(value)) {
          return 'Le registre de commerce doit contenir entre 5 et 20 caractères alphanumériques';
        }
        return 'Ce registre de commerce existe déjà dans notre base de données';
      
      default:
        return 'Ce champ contient une erreur';
    }
  }
}
