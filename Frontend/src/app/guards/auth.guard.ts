import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return false;
    }

    const expectedRoles = route.data['roles'] as string[] | undefined;
    const currentRole = this.authService.getRole();

    if (expectedRoles && currentRole && !expectedRoles.includes(currentRole)) {
      this.router.navigate(['/login']);
      return false;
    }

    return true;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
