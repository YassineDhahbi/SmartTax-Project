import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  searchQuery: string = '';

  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

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