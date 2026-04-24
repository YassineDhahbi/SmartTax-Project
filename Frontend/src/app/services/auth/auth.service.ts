import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap, timer, Subscription } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8080/api/auth';
  private readonly SESSION_DURATION = 4 * 60 * 60 * 1000; // 4 heures en millisecondes
  private sessionTimer: Subscription | null = null;
  private readonly SESSION_START_KEY = 'sessionStart';
  private readonly LAST_ACTIVITY_KEY = 'lastActivity';

  constructor(private http: HttpClient, private router: Router) {
    // Vérifier la session au démarrage du service
    this.checkSessionOnStartup();
    // Démarrer le suivi d'activité
    this.startActivityTracking();
  }

  login(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials, { withCredentials: true }).pipe(
      tap((response: any) => {
        if (response.token) {
          const now = Date.now();
          localStorage.setItem('token', response.token);
          localStorage.setItem('userId', response.idUtilisateur);
          localStorage.setItem('role', response.role);
          localStorage.setItem('firstName', response.firstName || response.prenom || '');
          localStorage.setItem('lastName', response.lastName || response.nom || '');
          localStorage.setItem('email', response.email);
          localStorage.setItem('dateNaissance', response.dateNaissance || '');
          localStorage.setItem('dateInscription', response.dateInscription || '');
          localStorage.setItem('userEmail', response.email);
          
          // Initialiser la session
          this.initializeSession();
        }
      })
    );
  }

  register(user: { firstName: string; lastName: string; email: string; password: string; dateNaissance: string; photo: string | null }): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, user, { withCredentials: true });
  }

  isLoggedIn(): boolean {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    // Vérifier si la session a expiré
    return this.isSessionValid();
  }

  logout(): void {
    // Nettoyer le timer de session
    this.clearSessionTimer();
    
    // Supprimer toutes les données de session
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('role');
    localStorage.removeItem('firstName');
    localStorage.removeItem('lastName');
    localStorage.removeItem('email');
    localStorage.removeItem('dateNaissance');
    localStorage.removeItem('dateInscription');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userInfo');
    localStorage.removeItem(this.SESSION_START_KEY);
    localStorage.removeItem(this.LAST_ACTIVITY_KEY);
    
    // Rediriger vers la page de login et forcer un rechargement
    this.router.navigate(['/login']).then(() => {
      window.location.reload();
    });
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getRole(): string | null {
    return localStorage.getItem('role');
  }

  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return token ? new HttpHeaders({ 'Authorization': `Bearer ${token}` }) : new HttpHeaders();
  }

  // Méthodes de gestion de session
  private initializeSession(): void {
    const now = Date.now();
    localStorage.setItem(this.SESSION_START_KEY, now.toString());
    localStorage.setItem(this.LAST_ACTIVITY_KEY, now.toString());
    
    // Démarrer le timer de session
    this.startSessionTimer();
  }

  private startSessionTimer(): void {
    this.clearSessionTimer();
    
    this.sessionTimer = timer(this.SESSION_DURATION).subscribe(() => {
      console.log('Session expirée - déconnexion automatique');
      this.logout();
    });
  }

  private clearSessionTimer(): void {
    if (this.sessionTimer) {
      this.sessionTimer.unsubscribe();
      this.sessionTimer = null;
    }
  }

  private isSessionValid(): boolean {
    const sessionStart = localStorage.getItem(this.SESSION_START_KEY);
    const lastActivity = localStorage.getItem(this.LAST_ACTIVITY_KEY);
    
    if (!sessionStart || !lastActivity) {
      return false;
    }
    
    const now = Date.now();
    const sessionStartTime = parseInt(sessionStart, 10);
    const lastActivityTime = parseInt(lastActivity, 10);
    
    // Vérifier si la session a dépassé 4 heures depuis le début
    if (now - sessionStartTime > this.SESSION_DURATION) {
      return false;
    }
    
    // Vérifier si l'utilisateur a été inactif trop longtemps (optionnel)
    // Pour l'instant, on vérifie seulement la durée totale de 4 heures
    return true;
  }

  private checkSessionOnStartup(): void {
    if (this.isLoggedIn()) {
      const sessionStart = localStorage.getItem(this.SESSION_START_KEY);
      const lastActivity = localStorage.getItem(this.LAST_ACTIVITY_KEY);
      
      if (sessionStart && lastActivity) {
        const now = Date.now();
        const sessionStartTime = parseInt(sessionStart, 10);
        const lastActivityTime = parseInt(lastActivity, 10);
        
        // Si la session est encore valide, redémarrer le timer
        if (now - sessionStartTime < this.SESSION_DURATION) {
          const remainingTime = this.SESSION_DURATION - (now - sessionStartTime);
          console.log(`Session valide, ${Math.round(remainingTime / 1000 / 60)} minutes restantes`);
          this.startSessionTimer();
        } else {
          console.log('Session expirée au démarrage - déconnexion');
          this.logout();
        }
      } else {
        // Pas de données de session, déconnexion
        this.logout();
      }
    }
  }

  private startActivityTracking(): void {
    // Suivre l'activité de l'utilisateur pour maintenir la session
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const updateLastActivity = () => {
      if (this.isLoggedIn()) {
        localStorage.setItem(this.LAST_ACTIVITY_KEY, Date.now().toString());
      }
    };
    
    activityEvents.forEach(event => {
      document.addEventListener(event, updateLastActivity, true);
    });
  }

  // Méthode pour obtenir le temps restant de session
  getSessionTimeRemaining(): number {
    const sessionStart = localStorage.getItem(this.SESSION_START_KEY);
    if (!sessionStart) return 0;
    
    const now = Date.now();
    const sessionStartTime = parseInt(sessionStart, 10);
    const elapsed = now - sessionStartTime;
    const remaining = this.SESSION_DURATION - elapsed;
    
    return Math.max(0, remaining);
  }

  // Méthode pour formater le temps restant
  getFormattedSessionTimeRemaining(): string {
    const remaining = this.getSessionTimeRemaining();
    if (remaining <= 0) return 'Session expirée';
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}min ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}min ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  // Méthode pour vérifier un TIN
  verifyTIN(tin: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/verify-tin`, { tin });
  }
}
