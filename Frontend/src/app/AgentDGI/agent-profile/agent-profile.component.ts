import { Component, OnInit, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { UserService } from '../../services/user/user.service';
import { Utilisateur } from '../../models/utilisateur';

@Component({
  selector: 'app-agent-profile',
  templateUrl: './agent-profile.component.html',
  styleUrls: ['./agent-profile.component.css']
})
export class AgentProfileComponent implements OnInit {
  agentInfo: Utilisateur | null = null;
  isLoading = false;
  error: string | null = null;
agentAdditionalInfo = {
   
    competences: [
      'Traitement des immatriculations',
      'Validation des dossiers fiscaux',
      'Contrôle de conformité',
      'Support contribuables',
      'Traitement des publication'
    ],
   
  };
  
  theme: 'dark' | 'light' = 'dark';

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private userService: UserService
  ) { }

  ngOnInit(): void {
    this.detectTheme();
    this.loadAgentInfo();
  }

  loadAgentInfo(): void {
    this.isLoading = true;
    this.error = null;
    
    this.userService.getUserDetails().subscribe({
      next: (user) => {
        // Vérifier si l'utilisateur est un agent
        if (user.role === 'AGENT_DGI' || user.role === 'AGENT') {
          this.agentInfo = user;
        } else {
          this.error = 'Cet utilisateur n\'est pas un agent DGI';
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des informations de l\'agent:', err);
        this.error = 'Impossible de charger les informations de l\'agent';
        this.isLoading = false;
      }
    });
  }

  private detectTheme(): void {
    // Détecter le thème depuis le dashboard parent
    const daElement = this.document.querySelector('.da');
    if (daElement) {
      this.theme = daElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    }
  }

  editProfile(): void {
    // TODO: Implémenter la fonction d'édition du profil
    console.log('Édition du profil');
  }

  changePassword(): void {
    // TODO: Implémenter la fonction de changement de mot de passe
    console.log('Changement de mot de passe');
  }

  exportData(): void {
    // TODO: Implémenter l'export des données
    console.log('Export des données');
  }

  goBack(): void {
    window.history.back();
  }
}
