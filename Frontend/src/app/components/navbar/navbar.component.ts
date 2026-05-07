import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../services/auth/auth.service';
import { interval, Subscription } from 'rxjs';
import { UserService } from '../../services/user/user.service';
import { ReclamationService } from '../../services/reclamation.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
  searchQuery: string = '';
  activeLink: string = 'home';
  sessionTimeRemaining: string = '';
  sessionTimer: Subscription | null = null;
  unreadMessagesTimer: Subscription | null = null;
  showSessionWarning: boolean = false;
  contribuableFullName: string = '';
  contribuableTin: string = '';
  unreadAgentMessagesCount: number = 0;

  constructor(
    public authService: AuthService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private userService: UserService,
    private reclamationService: ReclamationService
  ) {}

  ngOnInit(): void {
    this.updateActiveLink();
    
    // Écouter les changements de route
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateActiveLink();
      this.loadContribuableIdentity();
      this.loadUnreadAgentMessageCount();
    });

    // Démarrer le timer de session si l'utilisateur est connecté
    if (this.authService.isLoggedIn()) {
      this.startSessionTimer();
    }

    this.loadContribuableIdentity();
    this.loadUnreadAgentMessageCount();
    this.startUnreadMessagesRealtimeRefresh();
  }

  ngOnDestroy(): void {
    if (this.sessionTimer) {
      this.sessionTimer.unsubscribe();
    }
    if (this.unreadMessagesTimer) {
      this.unreadMessagesTimer.unsubscribe();
    }
  }

  private startSessionTimer(): void {
    // Mettre à jour chaque seconde
    this.sessionTimer = interval(1000).subscribe(() => {
      if (this.authService.isLoggedIn()) {
        const remaining = this.authService.getSessionTimeRemaining();
        this.sessionTimeRemaining = this.authService.getFormattedSessionTimeRemaining();
        
        // Afficher un avertissement si moins de 15 minutes restantes
        this.showSessionWarning = remaining > 0 && remaining < 15 * 60 * 1000; // 15 minutes
        
        // Si la session est expirée, déconnecter
        if (remaining <= 0) {
          this.authService.logout();
        }
      } else {
        this.sessionTimeRemaining = '';
        this.showSessionWarning = false;
        this.stopSessionTimer();
      }
    });
  }

  private stopSessionTimer(): void {
    if (this.sessionTimer) {
      this.sessionTimer.unsubscribe();
      this.sessionTimer = null;
    }
  }

  private startUnreadMessagesRealtimeRefresh(): void {
    if (this.unreadMessagesTimer) {
      this.unreadMessagesTimer.unsubscribe();
      this.unreadMessagesTimer = null;
    }

    // Rafraîchissement léger en quasi temps réel.
    this.unreadMessagesTimer = interval(8000).subscribe(() => {
      this.loadUnreadAgentMessageCount();
    });
  }

  private updateActiveLink(): void {
    const url = this.router.url;
    
    // Extraire le fragment s'il existe
    const urlTree = this.router.parseUrl(url);
    const fragment = urlTree.fragment;
    
    // Déterminer le lien actif basé sur l'URL et le fragment
    if (url.includes('/home')) {
      if (fragment) {
        // Mapper les fragments aux liens du navbar
        switch(fragment) {
          case 'services':
            this.activeLink = 'services';
            break;
          case 'about':
            this.activeLink = 'about';
            break;
          case 'blog':
            this.activeLink = 'blog';
            break;
          case 'reclamation':
            this.activeLink = 'reclamation';
            break;
          case 'contact':
            this.activeLink = 'reclamation'; // Contact pointe vers reclamation
            break;
          default:
            this.activeLink = 'home';
        }
      } else {
        this.activeLink = 'home';
      }
    } else if (url.includes('/about')) {
      this.activeLink = 'about';
    } else if (url.includes('/service')) {
      this.activeLink = 'service';
    } else if (url.includes('/blog')) {
      this.activeLink = 'blog';
    } else if (url.includes('/actualite')) {
      this.activeLink = 'actualite';
    } else if (url.includes('/contact')) {
      this.activeLink = 'reclamation';
    } else if (url.includes('/login')) {
      this.activeLink = 'login';
    } else {
      this.activeLink = 'home';
    }
  }

  isActive(link: string): boolean {
    return this.activeLink === link;
  }

  navigateToProfile(): void {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/profile']);
    } else {
      this.router.navigate(['/login']);
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  performSearch(): void {
    if (this.searchQuery.trim()) {
      // Rediriger vers une page de recherche avec la query
      this.router.navigate(['/search'], { 
        queryParams: { q: this.searchQuery.trim() } 
      });
      // Optionnel: vider le champ de recherche après la recherche
      this.searchQuery = '';
    }
  }

  getButtonText(): string {
    if (this.isContribuableLoggedIn()) {
      return 'Mon Profile';
    }
    return 'Espace Contribuable';
  }

  getButtonLink(): string {
    if (this.authService.isLoggedIn()) {
      const role = localStorage.getItem('role');
      return role === 'CONTRIBUABLE' ? '/profile' : '/login';
    }
    return '/login';
  }

  isContribuableLoggedIn(): boolean {
    return this.authService.isLoggedIn() && localStorage.getItem('role') === 'CONTRIBUABLE';
  }

  getContribuableIdentityLabel(): string {
    const fullName = this.contribuableFullName || 'Mon Profile';
    if (!this.contribuableTin) {
      return fullName;
    }
    return `${fullName} - TIN: ${this.contribuableTin}`;
  }

  private loadContribuableIdentity(): void {
    if (!this.isContribuableLoggedIn()) {
      this.contribuableFullName = '';
      this.contribuableTin = '';
      return;
    }

    const firstName = localStorage.getItem('firstName')?.trim() || '';
    const lastName = localStorage.getItem('lastName')?.trim() || '';
    const userInfo = this.getParsedUserInfo();
    const tokenPayload = this.getJwtPayload();

    const resolvedFirstName = firstName || userInfo?.firstName || userInfo?.prenom || '';
    const resolvedLastName = lastName || userInfo?.lastName || userInfo?.nom || '';
    const resolvedFullName = `${resolvedFirstName} ${resolvedLastName}`.trim();

    this.contribuableFullName = resolvedFullName || userInfo?.fullName || userInfo?.name || 'Mon Profile';
    this.contribuableTin = (
      localStorage.getItem('tin') ||
      localStorage.getItem('matricule') ||
      localStorage.getItem('matriculeFiscal') ||
      userInfo?.tin ||
      userInfo?.matricule ||
      userInfo?.matriculeFiscal ||
      userInfo?.TIN ||
      tokenPayload?.tin ||
      tokenPayload?.matricule ||
      tokenPayload?.matriculeFiscal ||
      tokenPayload?.TIN ||
      ''
    ).toString().trim();

    if (!this.contribuableTin) {
      this.loadContribuableTinFromApi();
    }
  }

  private loadUnreadAgentMessageCount(): void {
    if (!this.isContribuableLoggedIn()) {
      this.unreadAgentMessagesCount = 0;
      return;
    }

    this.reclamationService.getReclamations().subscribe({
      next: (reclamations: any[]) => {
        this.unreadAgentMessagesCount = (reclamations || []).reduce((sum, rec) => {
          const unread = Number(rec?.unreadAgentMessageCount ?? 0);
          return sum + (Number.isFinite(unread) ? unread : 0);
        }, 0);
      },
      error: () => {
        this.unreadAgentMessagesCount = 0;
      }
    });
  }

  private getParsedUserInfo(): any | null {
    const raw = localStorage.getItem('userInfo');
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private getJwtPayload(): any | null {
    const token = localStorage.getItem('token');
    if (!token) {
      return null;
    }

    try {
      const payloadBase64 = token.split('.')[1];
      if (!payloadBase64) {
        return null;
      }

      const normalizedBase64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(normalizedBase64));
    } catch {
      return null;
    }
  }

  private loadContribuableTinFromApi(): void {
    const userIdRaw = localStorage.getItem('userId');
    const userId = Number(userIdRaw);

    if (!userIdRaw || Number.isNaN(userId) || userId <= 0) {
      return;
    }

    this.userService.getUserById(userId).subscribe({
      next: (user: any) => {
        const apiTin = (user?.matricule || user?.tin || user?.matriculeFiscal || '').toString().trim();
        if (apiTin) {
          this.contribuableTin = apiTin;
          localStorage.setItem('matricule', apiTin);
          localStorage.setItem('tin', apiTin);
        }
      },
      error: () => {
        // Ne rien faire : la navbar continue de fonctionner même sans appel API.
      }
    });
  }

  extendSession(): void {
    // Prolonger la session en réinitialisant le timer
    // Pour l'instant, on peut simplement recharger la page ou faire une action
    console.log('Extension de session demandée');
    // Optionnel: implémenter une API pour étendre la session
  }
}