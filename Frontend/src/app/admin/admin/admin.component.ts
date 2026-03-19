import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  userName = 'Admin';
  greeting = '';

  ngOnInit(): void {
    this.loadUserName();
    this.setGreeting();
  }

  private loadUserName(): void {
    try {
      // Essayer de récupérer le nom depuis userInfo d'abord
      const userInfo = localStorage.getItem('userInfo');
      if (userInfo) {
        const user = JSON.parse(userInfo);
        this.userName = user.fullName || user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Admin';
        return;
      }

      // Alternative: essayer de récupérer depuis le token JWT
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Décoder le token pour obtenir les informations utilisateur
          const payload = JSON.parse(atob(token.split('.')[1]));
          // Extraire firstName et lastName du payload
          const firstName = payload.firstName || payload.prenom || payload.given_name || '';
          const lastName = payload.lastName || payload.nom || payload.family_name || '';
          this.userName = `${firstName} ${lastName}`.trim() || payload.fullName || payload.name || payload.sub || 'Admin';
        } catch {
          // Si le décodage échoue, utiliser une valeur par défaut personnalisée
          const role = localStorage.getItem('role');
          this.userName = role === 'ADMIN' ? 'Administrateur' : 'Admin';
        }
      } else {
        // Fallback basique
        const role = localStorage.getItem('role');
        this.userName = role === 'ADMIN' ? 'Administrateur' : 'Admin';
      }
    } catch (error) {
      console.error('Erreur lors du chargement du nom d\'utilisateur:', error);
      this.userName = 'Admin';
    }
  }

  private setGreeting(): void {
    const hour = new Date().getHours();
    if (hour < 12) this.greeting = 'Bonjour';
    else if (hour < 18) this.greeting = 'Bon après-midi';
    else this.greeting = 'Bonsoir';
  }
}
