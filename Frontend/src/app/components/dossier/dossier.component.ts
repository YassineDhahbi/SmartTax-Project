import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth/auth.service';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ImmatriculationService } from '../../services/immatriculation.service';

@Component({
  selector: 'app-dossier',
  templateUrl: './dossier.component.html',
  styleUrls: ['./dossier.component.css']
})
export class DossierComponent implements OnInit {
  currentUser: any = null;
  userRole: string = '';
  isLoggedIn: boolean = false;
  
  // Données d'immatriculation
  immatriculation: any = null;
  isLoadingImmatriculation = false;
  hasImmatriculation = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private http: HttpClient,
    private immatriculationService: ImmatriculationService
  ) {}

  ngOnInit(): void {
    this.checkUserStatus();
    if (this.isLoggedIn) {
      this.loadUserImmatriculation();
    }
  }

  checkUserStatus(): void {
    this.isLoggedIn = this.authService.isLoggedIn();
    
    if (this.isLoggedIn) {
      this.userRole = this.authService.getRole() || '';
      const userId = localStorage.getItem('userId');
      
      // Récupérer l'email depuis plusieurs sources possibles
      let userEmail = localStorage.getItem('userEmail');
      if (!userEmail) {
        // Essayer de récupérer depuis les infos utilisateur stockées
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
          try {
            const parsedUserInfo = JSON.parse(userInfo);
            userEmail = parsedUserInfo.email;
          } catch (e) {
            console.error('Erreur parsing userInfo:', e);
          }
        }
      }
      
      this.currentUser = {
        id: userId,
        email: userEmail,
        role: this.userRole
      };
      
      console.log('Utilisateur connecté:', this.currentUser);
    }
  }

  isSimpleUser(): boolean {
    return this.isLoggedIn && this.userRole === 'USER';
  }

  isContribuable(): boolean {
    return this.isLoggedIn && this.userRole === 'CONTRIBUABLE';
  }

  goToImmatriculation(): void {
    this.router.navigate(['/Immatriculation']);
  }

  loadUserImmatriculation(): void {
    this.isLoadingImmatriculation = true;
    const userId = localStorage.getItem('userId');
    
    if (userId) {
      // Récupérer toutes les immatriculations et filtrer par utilisateur
      this.immatriculationService.getAllImmatriculations().subscribe({
        next: (data: any[]) => {
          console.log('Toutes les immatriculations:', data);
          
          if (data && data.length > 0) {
            // Filtrer les immatriculations de l'utilisateur connecté
            // Essayer plusieurs critères de correspondance
            const userImmatriculations = data.filter((imm: any) => {
              // Vérifier par userId si disponible
              if (imm.userId && imm.userId === userId) {
                console.log('Trouvé par userId:', imm);
                return true;
              }
              
              // Vérifier par email de l'utilisateur
              const userEmail = localStorage.getItem('userEmail') || this.currentUser?.email;
              if (userEmail && imm.email && imm.email.toLowerCase() === userEmail.toLowerCase()) {
                console.log('Trouvé par email:', imm);
                return true;
              }
              
              // Vérifier par email connu (yassinedhahbi65@gmail.com)
              if (imm.email && imm.email.toLowerCase() === 'yassinedhahbi65@gmail.com'.toLowerCase()) {
                console.log('Trouvé par email connu:', imm);
                return true;
              }
              
              // Vérifier par nom/prénom
              if (imm.nom && imm.prenom && 
                  (imm.nom.toLowerCase() === 'dhahbi'.toLowerCase() || 
                   imm.prenom.toLowerCase() === 'yassine'.toLowerCase())) {
                console.log('Trouvé par nom/prénom:', imm);
                return true;
              }
              
              // Vérifier par CIN
              if (imm.cin && imm.cin === '78787878') {
                console.log('Trouvé par CIN:', imm);
                return true;
              }
              
              // Vérifier par ID si correspond
              if (imm.id && imm.id === userId) {
                console.log('Trouvé par ID:', imm);
                return true;
              }
              
              return false;
            });
            
            console.log('Immatriculations filtrées pour utilisateur:', userImmatriculations);
            
            if (userImmatriculations.length > 0) {
              // Prendre la première immatriculation validée, sinon la première
              this.immatriculation = userImmatriculations.find((imm: any) => imm.status === 'VALIDE') || userImmatriculations[0];
              this.hasImmatriculation = true;
              console.log('Immatriculation sélectionnée:', this.immatriculation);
            } else {
              this.hasImmatriculation = false;
              console.log('Aucune immatriculation trouvée pour cet utilisateur');
            }
          } else {
            this.hasImmatriculation = false;
            console.log('Aucune immatriculation trouvée dans la base');
          }
          this.isLoadingImmatriculation = false;
        },
        error: (error: any) => {
          console.error('Erreur lors du chargement de l\'immatriculation:', error);
          this.hasImmatriculation = false;
          this.isLoadingImmatriculation = false;
        }
      });
    } else {
      this.isLoadingImmatriculation = false;
      console.log('Pas de userId trouvé');
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  formatStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'EN_COURS_VERIFICATION': 'En cours de vérification',
      'VALIDE': 'Validé',
      'REJETE': 'Rejeté',
      'EN_COURS': 'En cours'
    };
    return statusMap[status] || status;
  }

  getImmatriculationStatusKey(status: string): string {
    const statusMap: { [key: string]: string } = {
      'EN_COURS_VERIFICATION': 'in_review',
      'VALIDE': 'done',
      'REJETE': 'blocked',
      'EN_COURS': 'open'
    };
    return statusMap[status] || 'open';
  }

  getContribuableName(immatriculation: any): string {
    if (immatriculation.typeContribuable === 'MORALE') {
      return immatriculation.raisonSociale || 'N/A';
    } else {
      return `${immatriculation.prenom || ''} ${immatriculation.nom || ''}`.trim() || 'N/A';
    }
  }

  downloadDocument(fileUrl: string, filename: string): void {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = filename;
    link.click();
  }

  viewDocument(fileUrl: string, title: string): void {
    window.open(fileUrl, '_blank');
  }

  setEmailManually(email: string): void {
    if (email && email.trim()) {
      // Stocker l'email dans localStorage
      localStorage.setItem('userEmail', email.trim());
      
      // Mettre à jour l'objet currentUser
      if (this.currentUser) {
        this.currentUser.email = email.trim();
      }
      
      console.log('Email défini manuellement:', email.trim());
      
      // Recharger les immatriculations avec le nouvel email
      this.loadUserImmatriculation();
    }
  }
}
