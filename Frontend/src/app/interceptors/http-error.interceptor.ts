import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class HttpErrorInterceptor implements HttpInterceptor {

  constructor(private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    
    // Cloner la requête et ajouter les headers par défaut (sauf pour FormData)
    let authReq = req;
    
    // Ne pas ajouter Content-Type pour FormData - le navigateur le gère automatiquement
    if (!(req.body instanceof FormData)) {
      authReq = req.clone({
        setHeaders: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
    } else {
      // Pour FormData, ajouter seulement les autres headers
      authReq = req.clone({
        setHeaders: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
    }

    return next.handle(authReq).pipe(
      map((event: HttpEvent<any>) => {
        // Gérer les réponses succès
        if (event instanceof HttpResponse) {
          // Logger la réponse si en mode développement
          if (this.isDevelopment()) {
            console.log('HTTP Response:', event);
          }
        }
        return event;
      }),
      catchError((error: HttpErrorResponse) => {
        // Gérer les erreurs HTTP
        let errorMessage = 'Une erreur est survenue';
        
        if (error.error instanceof ErrorEvent) {
          // Erreur côté client
          errorMessage = `Erreur client: ${error.error.message}`;
          console.error('Client Error:', error.error);
        } else {
          // Erreur côté serveur
          console.error('Server Error:', error);
          
          switch (error.status) {
            case 0:
              errorMessage = 'Impossible de se connecter au serveur. Veuillez vérifier votre connexion.';
              break;
            case 400:
              errorMessage = this.handleBadRequest(error.error);
              break;
            case 401:
              errorMessage = 'Non autorisé. Veuillez vous reconnecter.';
              this.redirectToLogin();
              break;
            case 403:
              errorMessage = 'Accès refusé. Vous n\'avez pas les permissions nécessaires.';
              break;
            case 404:
              errorMessage = 'Ressource non trouvée.';
              break;
            case 409:
              errorMessage = this.handleConflict(error.error);
              break;
            case 422:
              errorMessage = this.handleValidationError(error.error);
              break;
            case 429:
              errorMessage = 'Trop de requêtes. Veuillez réessayer plus tard.';
              break;
            case 500:
              errorMessage = 'Erreur interne du serveur. Veuillez réessayer plus tard.';
              break;
            case 502:
              errorMessage = 'Service indisponible. Veuillez réessayer plus tard.';
              break;
            case 503:
              errorMessage = 'Service en maintenance. Veuillez réessayer plus tard.';
              break;
            default:
              errorMessage = `Erreur ${error.status}: ${error.statusText}`;
          }
        }

        // Afficher une notification d'erreur (à implémenter avec un service de notification)
        this.showErrorMessage(errorMessage);
        
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  // Gérer les erreurs 400 Bad Request
  private handleBadRequest(error: any): string {
    if (error?.message) {
      return error.message;
    }
    
    if (error?.errors && Array.isArray(error.errors)) {
      return error.errors.join(', ');
    }
    
    if (error?.fieldErrors && Array.isArray(error.fieldErrors)) {
      return error.fieldErrors.map((err: any) => `${err.field}: ${err.message}`).join(', ');
    }
    
    return 'Données invalides. Veuillez vérifier les champs du formulaire.';
  }

  // Gérer les erreurs 409 Conflict (doublons)
  private handleConflict(error: any): string {
    if (error?.message) {
      return error.message;
    }
    
    if (error?.conflictField) {
      switch (error.conflictField) {
        case 'email':
          return 'Un compte avec cet email existe déjà.';
        case 'cin':
          return 'Un dossier avec ce CIN existe déjà.';
        case 'registreCommerce':
          return 'Une entreprise avec ce registre de commerce existe déjà.';
        default:
          return `Un conflit existe avec le champ: ${error.conflictField}`;
      }
    }
    
    return 'Un doublon a été détecté. Veuillez vérifier vos informations.';
  }

  // Gérer les erreurs de validation 422
  private handleValidationError(error: any): string {
    if (error?.message) {
      return error.message;
    }
    
    if (error?.validationErrors && Array.isArray(error.validationErrors)) {
      return error.validationErrors.map((err: any) => err.message).join(', ');
    }
    
    return 'Erreur de validation. Veuillez vérifier tous les champs.';
  }

  // Vérifier si on est en mode développement
  private isDevelopment(): boolean {
    return (process as any)['env']?.['NODE_ENV'] === 'development' || !(process as any)['env']?.['NODE_ENV'];
  }

  // Rediriger vers la page de login
  private redirectToLogin(): void {
    // Sauvegarder l'URL actuelle pour rediriger après login
    const currentUrl = this.router.url;
    if (currentUrl !== '/login') {
      localStorage.setItem('redirectUrl', currentUrl);
    }
    this.router.navigate(['/login']);
  }

  // Afficher un message d'erreur (à remplacer par un service de notification)
  private showErrorMessage(message: string): void {
    // Pour l'instant, utiliser alert. À remplacer par un service de toast/notification
    if (this.isDevelopment()) {
      alert(message);
    }
    
    // TODO: Implémenter un service de notification
    // this.notificationService.showError(message);
  }
}

// Provider pour l'intercepteur
export const HttpErrorInterceptorProvider = {
  provide: 'HTTP_ERROR_INTERCEPTOR',
  useClass: HttpErrorInterceptor,
  multi: true
};
