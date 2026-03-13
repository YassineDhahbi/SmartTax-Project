import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  searchQuery: string = '';
  activeLink: string = 'home';

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
}