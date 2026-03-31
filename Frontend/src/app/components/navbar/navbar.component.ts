import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../services/auth/auth.service';
import { interval, Subscription } from 'rxjs';

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
  showSessionWarning: boolean = false;

  constructor(
    public authService: AuthService,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.updateActiveLink();
    
    // Écouter les changements de route
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateActiveLink();
    });

    // Démarrer le timer de session si l'utilisateur est connecté
    if (this.authService.isLoggedIn()) {
      this.startSessionTimer();
    }
  }

  ngOnDestroy(): void {
    if (this.sessionTimer) {
      this.sessionTimer.unsubscribe();
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
    if (this.authService.isLoggedIn()) {
      const role = localStorage.getItem('role');
      return role === 'CONTRIBUABLE' ? 'Mon Profile' : 'Espace Contribuable';
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

  extendSession(): void {
    // Prolonger la session en réinitialisant le timer
    // Pour l'instant, on peut simplement recharger la page ou faire une action
    console.log('Extension de session demandée');
    // Optionnel: implémenter une API pour étendre la session
  }
}