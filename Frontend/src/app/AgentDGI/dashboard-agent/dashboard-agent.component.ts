import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ImmatriculationService } from '../../services/immatriculation.service';

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger';

type StatusKey = 'open' | 'in_review' | 'done' | 'blocked';

interface NavItem {
  label: string;
  icon: string;
  badge?: number;
  key: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface KpiCard {
  label: string;
  value: string;
  sub: string;
  delta: string;
  deltaUp: boolean;
  icon: string;
  tone: Tone;
}

interface QuickAction {
  title: string;
  sub: string;
  icon: string;
  tone: Tone;
}

interface RecentOp {
  ref: string;
  subject: string;
  kind: string;
  status: string;
  statusKey: StatusKey;
  updatedAt: string;
}

interface TaskItem {
  title: string;
  meta: string;
  done: boolean;
  tone: Tone;
}

interface AlertItem {
  title: string;
  meta: string;
  tone: Tone;
  icon: string;
}

@Component({
  selector: 'app-dashboard-agent',
  templateUrl: './dashboard-agent.component.html',
  styleUrls: ['./dashboard-agent.component.css']
})
export class DashboardAgentComponent implements OnInit {
  userName = 'Agent';

  greeting = getGreeting();

  sidebarOpen = false;

  activeNavKey: string = 'overview';

  currentView: string = 'overview'; // 'overview' or 'dossiers'

  activityRange: '7d' | '30d' = '7d';

  theme: 'dark' | 'light' = getInitialTheme();

  constructor(private http: HttpClient, private immatriculationService: ImmatriculationService) {}

  // Données des immatriculations depuis PostgreSQL
  immatriculations: any[] = [];
  filteredImmatriculations: any[] = [];
  isLoadingImmatriculations = false;
  
  // Modal properties
  showDetailsModal = false;
  selectedImmatriculation: any = null;
  
  // Filter properties
  activeFilter: 'all' | 'PHYSIQUE' | 'MORALE' = 'all';
  
  // Computed properties for filter counts
  get totalCount(): number {
    return this.immatriculations.length;
  }
  
  get physiqueCount(): number {
    return this.immatriculations.filter(i => i.typeContribuable === 'PHYSIQUE').length;
  }
  
  get moraleCount(): number {
    return this.immatriculations.filter(i => i.typeContribuable === 'MORALE').length;
  }

  ngOnInit(): void {
    this.loadUserName();
  }

  private loadUserName(): void {
    try {
      // Essayer de récupérer le nom depuis userInfo d'abord
      const userInfo = localStorage.getItem('userInfo');
      if (userInfo) {
        const user = JSON.parse(userInfo);
        this.userName = user.fullName || user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Agent';
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
          const fullName = `${firstName} ${lastName}`.trim();
          
          if (fullName) {
            this.userName = fullName;
          } else {
            // Si pas de nom dans le token, faire un appel API pour récupérer les infos utilisateur
            this.fetchUserInfo();
          }
        } catch {
          // Si le décodage échoue, utiliser une valeur par défaut personnalisée
          const role = localStorage.getItem('role');
          this.userName = role === 'AGENT_DGI' ? 'Agent DGI' : 'Agent';
        }
      } else {
        // Fallback basique
        const role = localStorage.getItem('role');
        this.userName = role === 'AGENT_DGI' ? 'Agent DGI' : 'Agent';
      }
    } catch (error) {
      console.error('Erreur lors du chargement du nom d\'utilisateur:', error);
      this.userName = 'Agent';
    }
  }

  private fetchUserInfo(): void {
    const userId = localStorage.getItem('userId');
    if (userId) {
      // Appeler l'API pour récupérer les informations complètes de l'utilisateur
      this.http.get(`http://localhost:8080/api/users/${userId}`).subscribe({
        next: (user: any) => {
          const firstName = user.firstName || user.prenom || '';
          const lastName = user.lastName || user.nom || '';
          const fullName = `${firstName} ${lastName}`.trim() || user.fullName || user.name || 'Agent';
          this.userName = fullName;
        },
        error: (error) => {
          console.error('Erreur lors de la récupération des infos utilisateur:', error);
          // Fallback: utiliser une version améliorée de l'email
          const email = localStorage.getItem('token') ? JSON.parse(atob(localStorage.getItem('token')!.split('.')[1])).sub : '';
          const emailUsername = email.split('@')[0];
          // Essayer de séparer le nom/prénom (ex: yassinedhahbi -> yassine dhahbi)
          this.userName = this.formatUsername(emailUsername);
        }
      });
    } else {
      // Fallback: utiliser l'email si pas de userId
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          this.userName = this.formatUsername(payload.sub.split('@')[0]);
        } catch {
          this.userName = 'Agent';
        }
      }
    }
  }

  private formatUsername(username: string): string {
    // Convertir en minuscules et supprimer les chiffres
    let cleanName = username.toLowerCase().replace(/[0-9]/g, '');
    
    // Cas spéciaux connus
    const knownNames: { [key: string]: string } = {
      'yassinedhahbi': 'Yassine Dhahbi',
      'mohamedali': 'Mohamed Ali',
      'jeanpierre': 'Jean Pierre',
      'paulmartin': 'Paul Martin'
    };
    
    if (knownNames[cleanName]) {
      return knownNames[cleanName];
    }
    
    // Essayer de séparer nom/prénom pour les patterns communs
    const patterns = [
      // Pattern: prénom + nom avec majuscule (johnDoe -> john Doe)
      /^([a-z]+)([A-Z][a-z]+)$/,
      // Pattern: prénom + nom avec séparation par voyelle commune
      /^([a-z]{2,8})([aeiouy][a-z]{2,8})$/,
      // Pattern: essayer de séparer au milieu pour les noms longs
      /^([a-z]{4,8})([a-z]{4,8})$/
    ];
    
    for (const pattern of patterns) {
      const match = cleanName.match(pattern);
      if (match) {
        const firstName = match[1].charAt(0).toUpperCase() + match[1].slice(1);
        const lastName = match[2].charAt(0).toUpperCase() + match[2].slice(1);
        return `${firstName} ${lastName}`;
      }
    }
    
    // Si aucun pattern ne correspond, capitaliser simplement
    return cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
  }

  nav: NavSection[] = [
    {
      title: 'Pilotage',
      items: [
        { key: 'overview', label: 'Vue d’ensemble', icon: 'fa-solid fa-grid-2' },
        { key: 'work', label: 'Dossiers', icon: 'fa-solid fa-folder-open', badge: 7 },
        { key: 'decisions', label: 'Décisions', icon: 'fa-solid fa-file-signature' },
      ],
    },
    {
      title: 'Communication',
      items: [
        { key: 'notifications', label: 'Notifications', icon: 'fa-solid fa-bell', badge: 3 },
        { key: 'support', label: 'Centre d’aide', icon: 'fa-solid fa-circle-question' },
      ],
    },
    {
      title: 'Compte',
      items: [
        { key: 'settings', label: 'Paramètres', icon: 'fa-solid fa-gear' },
        { key: 'logout', label: 'Déconnexion', icon: 'fa-solid fa-right-from-bracket' },
      ],
    },
  ];

  kpis: KpiCard[] = [
    {
      label: 'Dossiers en cours',
      value: '24',
      sub: 'Aujourd’hui',
      icon: 'fa-solid fa-folder-tree',
      delta: '+8%',
      deltaUp: true,
      tone: 'brand',
    },
    {
      label: 'À traiter',
      value: '7',
      sub: 'Priorité haute',
      icon: 'fa-solid fa-triangle-exclamation',
      delta: '-2%',
      deltaUp: false,
      tone: 'warning',
    },
    {
      label: 'Validés',
      value: '18',
      sub: 'Cette semaine',
      icon: 'fa-solid fa-circle-check',
      delta: '+12%',
      deltaUp: true,
      tone: 'success',
    },
    {
      label: 'Bloqués',
      value: '3',
      sub: 'En attente',
      icon: 'fa-solid fa-circle-xmark',
      delta: '+1',
      deltaUp: false,
      tone: 'danger',
    },
  ];

  quickActions: QuickAction[] = [
    { title: 'Créer un dossier', sub: 'Nouveau traitement', icon: 'fa-solid fa-circle-plus', tone: 'brand' },
    { title: 'Valider une demande', sub: 'Contrôle & conformité', icon: 'fa-solid fa-user-check', tone: 'success' },
    { title: 'Exporter un état', sub: 'PDF / Excel', icon: 'fa-solid fa-file-export', tone: 'neutral' },
    { title: 'Consulter procédures', sub: 'Guides & FAQ', icon: 'fa-solid fa-book-open', tone: 'warning' },
  ];

  activityBars7d: number[] = [34, 52, 41, 68, 48, 73, 59];
  activityBars30d: number[] = [22, 28, 34, 30, 38, 35, 44, 42, 50, 47, 55, 53];

  lineSeries7d: number[] = [18, 28, 22, 36, 30, 44, 40];
  lineSeries30d: number[] = [16, 18, 20, 19, 23, 25, 24, 28, 27, 31, 33, 35];

  recentOps: RecentOp[] = [
    { ref: 'DGI-2026-0142', subject: 'Société Atlas SARL', kind: 'Contrôle', status: 'En revue', statusKey: 'in_review', updatedAt: 'Il y a 12 min' },
    { ref: 'DGI-2026-0138', subject: 'M. Karim Ben Ali', kind: 'Réclamation', status: 'Ouvert', statusKey: 'open', updatedAt: 'Il y a 1 h' },
    { ref: 'DGI-2026-0130', subject: 'Entreprise Nova', kind: 'Remboursement', status: 'Terminé', statusKey: 'done', updatedAt: 'Hier' },
    { ref: 'DGI-2026-0122', subject: 'Mme Lina Trabelsi', kind: 'Vérification', status: 'Bloqué', statusKey: 'blocked', updatedAt: 'Il y a 3 j' },
  ];

  tasks: TaskItem[] = [
    { title: 'Vérifier pièces manquantes (DGI-2026-0142)', meta: 'Avant 18:00', done: false, tone: 'warning' },
    { title: 'Valider remboursement (DGI-2026-0130)', meta: 'Priorité normale', done: true, tone: 'success' },
    { title: 'Appeler contribuable — dossier en litige', meta: 'À planifier', done: false, tone: 'brand' },
    { title: 'Mettre à jour décision — contrôle terminé', meta: 'Cette semaine', done: false, tone: 'neutral' },
  ];

  alerts: AlertItem[] = [
    { title: '3 notifications non lues', meta: 'Dernière il y a 12 min', tone: 'brand', icon: 'fa-regular fa-bell' },
    { title: '1 dossier bloqué', meta: 'En attente de réponse', tone: 'danger', icon: 'fa-solid fa-circle-xmark' },
    { title: 'Audit hebdomadaire', meta: 'Rapport à générer', tone: 'warning', icon: 'fa-solid fa-shield-halved' },
  ];

  get activityBars(): number[] {
    return this.activityRange === '7d' ? this.activityBars7d : this.activityBars30d;
  }

  get lineSeries(): number[] {
    return this.activityRange === '7d' ? this.lineSeries7d : this.lineSeries30d;
  }

  get linePoints(): string {
    const series = this.lineSeries;
    const max = Math.max(...series, 1);
    const min = Math.min(...series, 0);
    const range = Math.max(max - min, 1);
    const w = 520;
    const h = 160;
    const padX = 10;
    const padY = 12;
    const innerW = w - padX * 2;
    const innerH = h - padY * 2;

    return series
      .map((v, i) => {
        const x = padX + (innerW * i) / Math.max(series.length - 1, 1);
        const y = padY + innerH - ((v - min) / range) * innerH;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  get donutStyle(): string {
    // Conic-gradient segment order: brand, success, warning, danger
    return 'conic-gradient(from 210deg, rgba(99,102,241,0.95) 0 46%, rgba(34,197,94,0.95) 46% 76%, rgba(245,158,11,0.95) 76% 92%, rgba(239,68,68,0.95) 92% 100%)';
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  setActivityRange(range: '7d' | '30d'): void {
    this.activityRange = range;
  }

  toggleTheme(): void {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem('agentdgi_theme', this.theme);
    } catch {
      // ignore storage errors (private mode, blocked, etc.)
    }
  }

  setActiveNav(key: string): void {
    this.activeNavKey = key;
    if (key === 'work') {
      this.currentView = 'dossiers';
      this.loadImmatriculations();
    } else {
      this.currentView = 'overview';
    }
  }

  private loadImmatriculations(): void {
    this.isLoadingImmatriculations = true;
    this.immatriculationService.getAllImmatriculations().subscribe({
      next: (data) => {
        this.immatriculations = data;
        this.applyFilter();
        this.isLoadingImmatriculations = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des immatriculations:', error);
        this.isLoadingImmatriculations = false;
        this.immatriculations = [];
        this.filteredImmatriculations = [];
      }
    });
  }

  setFilter(filter: 'all' | 'PHYSIQUE' | 'MORALE'): void {
    this.activeFilter = filter;
    this.applyFilter();
  }

  private applyFilter(): void {
    if (this.activeFilter === 'all') {
      this.filteredImmatriculations = [...this.immatriculations];
    } else {
      this.filteredImmatriculations = this.immatriculations.filter(
        immatriculation => immatriculation.typeContribuable === this.activeFilter
      );
    }
  }

  toggleTask(t: TaskItem): void {
    t.done = !t.done;
  }

  getStatutKey(statut: string): string {
    const statutMap: { [key: string]: string } = {
      'Ouvert': 'open',
      'Terminé': 'done', 
      'En revue': 'in_review',
      'Bloqué': 'blocked'
    };
    return statutMap[statut] || 'open';
  }

  getPriorityKey(priorite: string): string {
    const priorityMap: { [key: string]: string } = {
      'Haute': 'high',
      'Moyenne': 'medium',
      'Basse': 'low'
    };
    return priorityMap[priorite] || 'medium';
  }

  // Méthodes pour les immatriculations
  getImmatriculationStatusKey(status: string): string {
    const statusMap: { [key: string]: string } = {
      'BROUILLON': 'open',
      'SOUMIS': 'in_review',
      'VALIDE': 'done',
      'REJETE': 'blocked',
      'ARCHIVE': 'done'
    };
    return statusMap[status] || 'open';
  }

  formatStatus(status: string): string {
    const statusLabels: { [key: string]: string } = {
      'BROUILLON': 'Brouillon',
      'SOUMIS': 'Soumis',
      'VALIDE': 'Validé',
      'REJETE': 'Rejeté',
      'ARCHIVE': 'Archivé'
    };
    return statusLabels[status] || status;
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  }

  viewImmatriculationDetails(immatriculation: any): void {
    this.selectedImmatriculation = immatriculation;
    this.showDetailsModal = true;
  }

  closeModal(): void {
    this.showDetailsModal = false;
    this.selectedImmatriculation = null;
  }

  getContribuableName(immatriculation: any): string {
    if (immatriculation.raisonSociale) {
      return immatriculation.raisonSociale;
    }
    
    const nom = immatriculation.nom || '';
    const prenom = immatriculation.prenom || '';
    const fullName = `${nom} ${prenom}`.trim();
    
    return fullName || 'N/A';
  }

  getScoreLevel(score: number): string {
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    return 'low';
  }

  deleteImmatriculation(immatriculation: any): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'immatriculation "${immatriculation.dossierNumber || immatriculation.id}" ?\n\nCette action est irréversible.`)) {
      this.immatriculationService.deleteImmatriculation(immatriculation.id).subscribe({
        next: () => {
          // Supprimer localement
          const index = this.immatriculations.findIndex(i => i.id === immatriculation.id);
          if (index > -1) {
            this.immatriculations.splice(index, 1);
            this.applyFilter();
          }
          
          // Afficher un message de succès (vous pourriez utiliser un toast/notification)
          console.log('Immatriculation supprimée avec succès');
        },
        error: (error: any) => {
          console.error('Erreur lors de la suppression de l\'immatriculation:', error);
          alert('Une erreur est survenue lors de la suppression. Veuillez réessayer.');
        }
      });
    }
  }

  printDetails(): void {
    if (!this.selectedImmatriculation) return;
    
    const printContent = document.getElementById('modalContent') || document.querySelector('.da__modalBody');
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Détails Immatriculation - ${this.selectedImmatriculation.dossierNumber || this.selectedImmatriculation.id}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; border-bottom: 2px solid #6366f1; padding-bottom: 10px; }
          h2 { color: #555; margin-top: 30px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
          .info-item { display: flex; flex-direction: column; }
          .info-item label { font-weight: bold; color: #666; margin-bottom: 5px; }
          .info-item span { padding: 8px; background: #f5f5f5; border-radius: 4px; }
          .status { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 20px; font-weight: bold; }
          .status-dot { width: 8px; height: 8px; border-radius: 50%; }
          .score-item { text-align: center; padding: 15px; border: 1px solid #ddd; border-radius: 8px; margin: 10px; }
          .score-value { font-size: 24px; font-weight: bold; }
          @media print { body { margin: 10px; } }
        </style>
      </head>
      <body>
        <h1>Détails de l'Immatriculation</h1>
        <p><strong>N° Dossier:</strong> ${this.selectedImmatriculation.dossierNumber || this.selectedImmatriculation.id}</p>
        <p><strong>Date d'impression:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
        
        <h2>Informations principales</h2>
        <div class="info-grid">
          <div class="info-item">
            <label>Statut</label>
            <span>${this.formatStatus(this.selectedImmatriculation.status)}</span>
          </div>
          <div class="info-item">
            <label>Type de contribuable</label>
            <span>${this.selectedImmatriculation.typeContribuable || 'N/A'}</span>
          </div>
          <div class="info-item">
            <label>Date de création</label>
            <span>${this.formatDate(this.selectedImmatriculation.dateCreation)}</span>
          </div>
        </div>
        
        <h2>Contribuable</h2>
        <div class="info-grid">
          <div class="info-item">
            <label>Nom complet</label>
            <span>${this.getContribuableName(this.selectedImmatriculation)}</span>
          </div>
          <div class="info-item">
            <label>Email</label>
            <span>${this.selectedImmatriculation.email || 'N/A'}</span>
          </div>
          <div class="info-item">
            <label>Téléphone</label>
            <span>${this.selectedImmatriculation.telephone || 'N/A'}</span>
          </div>
          <div class="info-item">
            <label>Adresse</label>
            <span>${this.selectedImmatriculation.adresse || 'N/A'}</span>
          </div>
        </div>
        
        <h2>Activité</h2>
        <div class="info-grid">
          <div class="info-item">
            <label>Type d'activité</label>
            <span>${this.selectedImmatriculation.typeActivite || 'N/A'}</span>
          </div>
          <div class="info-item">
            <label>Secteur</label>
            <span>${this.selectedImmatriculation.secteur || 'N/A'}</span>
          </div>
        </div>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }
}

function getInitialTheme(): 'dark' | 'light' {
  try {
    const saved = localStorage.getItem('agentdgi_theme');
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // ignore
  }
  return 'dark';
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
}
