import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ImmatriculationService } from '../../services/immatriculation.service';
import { TrashService } from '../../services/trash.service';
import { EmailService } from '../../services/email/email.service';
import { Immatriculation } from '../../models/immatriculation.model';
import jsPDF from 'jspdf';
import * as QRCode from 'qrcode';

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

  constructor(private http: HttpClient, private immatriculationService: ImmatriculationService, private trashService: TrashService, private emailService: EmailService) {}

  // Méthode pour formater l'adresse avec gouvernorat et ville
  formatAdresse(immatriculation: any): string {
    const gouvernorat = immatriculation.adresse || '';
    const ville = immatriculation.ville || '';
    const autreVille = immatriculation.autreVille || '';
    
    // Si une ville est spécifiée
    if (ville && ville !== 'autre') {
      return `${gouvernorat}, ${ville}`;
    }
    // Si "autre" est sélectionné et une valeur est saisie
    else if (ville === 'autre' && autreVille) {
      return `${gouvernorat}, ${autreVille}`;
    }
    // Si seul le gouvernorat est disponible
    else if (gouvernorat) {
      return gouvernorat;
    }
    // Valeur par défaut
    else {
      return 'N/A';
    }
  }

  // Méthode pour filtrer par nationalité
  filterByNationalite(nationalite: string): void {
    this.nationaliteFilter = nationalite;
    this.applyFilter();
  }

  // Données des immatriculations depuis PostgreSQL
  immatriculations: any[] = [];
  filteredImmatriculations: any[] = [];
  isLoadingImmatriculations = false;
  
  // Filtre par nationalité
  nationaliteFilter: string = 'tous'; // 'tous', 'tunisien', 'etranger'
  
  // Modal properties
  showDetailsModal = false;
  selectedImmatriculation: any = null;
  showDeleteModal = false;
  immatriculationToDelete: any = null;
  
  // Reject modal properties
  showRejectModal = false;
  rejectReason: string = '';
  
  // Notification properties
  notification: { show: boolean; message: string; type: 'success' | 'error' | 'warning' | 'info' } = {
    show: false,
    message: '',
    type: 'success'
  };
  
  // View rejection reason properties
  showRejectionReasonModal = false;
  rejectionReasonToView: string = '';
  
  // Confirmation modal properties
  showConfirmationModal = false;
  confirmationData: { title: string; message: string; onConfirm: () => void } = {
    title: '',
    message: '',
    onConfirm: () => {}
  };
  
  // Auto-save rejection reason properties
  autoSaveTimeout: any = null;
  
  // Filter properties
  activeFilter: 'all' | 'PHYSIQUE' | 'MORALE' = 'all';
  
  // Sorting properties
  sortBy: 'date' | 'status' | 'none' = 'none';
  sortOrder: 'recent' | 'ancient' = 'recent';
  
  // Status filter
  statusFilter: string = 'all';
  
  // Search properties
  searchTerm: string = '';
  
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
        console.log('📋 Données reçues de l\'API:', data);
        console.log('🔍 Vérification des autresFiles:', data.map(imm => ({
          id: imm.id,
          dossierNumber: imm.dossierNumber,
          autresFiles: imm.autresFiles,
          autresFilesLength: imm.autresFiles?.length || 0
        })));
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
    let filtered: any[];
    
    // Filtrer par type de contribuable
    if (this.activeFilter === 'all') {
      filtered = [...this.immatriculations];
    } else {
      filtered = this.immatriculations.filter(
        immatriculation => immatriculation.typeContribuable === this.activeFilter
      );
    }
    
    // Filtrer par nationalité
    if (this.nationaliteFilter !== 'tous') {
      filtered = filtered.filter(imm => {
        const immNationalite = imm.nationalite || 'tunisienne'; // Par défaut tunisien
        if (this.nationaliteFilter === 'tunisien') {
          return immNationalite === 'tunisienne';
        } else if (this.nationaliteFilter === 'etranger') {
          return immNationalite !== 'tunisienne';
        }
        return true;
      });
    }
    
    // Filtrer par statut si applicable
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(
        immatriculation => immatriculation.status === this.statusFilter
      );
    }
    
    // Filtrer par recherche
    if (this.searchTerm && this.searchTerm.trim().length > 0) {
      const searchLower = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        immatriculation => {
          // Rechercher dans plusieurs champs
          const searchableFields = [
            immatriculation.dossierNumber || '',
            immatriculation.nom || '',
            immatriculation.prenom || '',
            immatriculation.raisonSociale || '',
            immatriculation.email || '',
            immatriculation.telephone || '',
            immatriculation.cin || '',
            immatriculation.matriculeFiscal || ''
          ];
          
          return searchableFields.some(field => 
            field.toLowerCase().includes(searchLower)
          );
        }
      );
    }
    
    // Appliquer le tri
    this.filteredImmatriculations = this.sortImmatriculations(filtered);
  }

  onSearchChange(): void {
    this.applyFilter();
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
    console.log('🔍 Détails de l\'immatriculation sélectionnée:', {
      id: immatriculation.id,
      dossierNumber: immatriculation.dossierNumber,
      autresFiles: immatriculation.autresFiles,
      autresFilesLength: immatriculation.autresFiles?.length || 0,
      identiteFile: !!immatriculation.identiteFile,
      activiteFile: !!immatriculation.activiteFile,
      photoFile: !!immatriculation.photoFile
    });
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

  openDeleteModal(immatriculation: any): void {
    this.immatriculationToDelete = immatriculation;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (!this.immatriculationToDelete) return;
    
    // Déplacer vers la corbeille au lieu de supprimer définitivement
    this.trashService.moveToTrash(this.immatriculationToDelete.id.toString(), this.userName || 'current_user').subscribe({
      next: () => {
        // Supprimer localement
        const index = this.immatriculations.findIndex(i => i.id === this.immatriculationToDelete.id);
        if (index > -1) {
          this.immatriculations.splice(index, 1);
          this.applyFilter();
        }
        
        // Fermer la modal
        this.closeDeleteModal();
        
        // Afficher un message de succès
        console.log('Immatriculation déplacée vers la corbeille. Elle sera supprimée définitivement dans 30 jours.');
        // Vous pourriez utiliser un toast/notification ici
      },
      error: (error: any) => {
        console.error('Erreur lors du déplacement vers la corbeille:', error);
        alert('Une erreur est survenue lors du déplacement vers la corbeille. Veuillez réessayer.');
        this.closeDeleteModal();
      }
    });
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.immatriculationToDelete = null;
  }

  // Validation et rejet d'immatriculation
  validateImmatriculation(): void {
    if (!this.selectedImmatriculation) return;
    
    console.log('🔍 Validation de l\'immatriculation:', this.selectedImmatriculation.id);
    
    this.immatriculationService.validateDossier(this.selectedImmatriculation.id).subscribe({
      next: (response: any) => {
        console.log('✅ Immatriculation validée avec succès:', response);
        
        // Vérifier si la réponse contient une notification personnalisée
        if (response.notification) {
          // Afficher la notification du backend (verte)
          this.showNotification(
            response.notification.text || 'Dossier validé avec succès !',
            response.notification.type || 'success'
          );
        } else {
          // Notification par défaut si pas de notification personnalisée
          this.showNotification(
            'Dossier validé avec succès ! Un email avec le TIN a été envoyé.',
            'success'
          );
        }
        
        // Mettre à jour le statut dans la liste locale
        const index = this.immatriculations.findIndex(i => i.id === this.selectedImmatriculation.id);
        if (index !== -1) {
          this.immatriculations[index] = response.data || response;
          this.applyFilter();
        }
        
        // Mettre à jour l'immatriculation sélectionnée
        this.selectedImmatriculation = response.data || response;
        
        // Fermer le modal après validation
        this.closeModal();
      },
      error: (error) => {
        console.error('❌ Erreur lors de la validation:', error);
        
        // Afficher un message d'erreur
        this.showNotification(
          'Erreur lors de la validation du dossier',
          'error'
        );
      }
    });
  }

  openRejectModal(): void {
    this.showRejectModal = true;
    this.rejectReason = '';
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.rejectReason = '';
  }

  confirmReject(): void {
    if (!this.selectedImmatriculation || !this.rejectReason || this.rejectReason.trim().length === 0) {
      this.showNotification('Veuillez saisir un motif de rejet', 'error');
      return;
    }
    
    console.log('🔍 Rejet de l\'immatriculation:', this.selectedImmatriculation.id, 'Motif:', this.rejectReason);
    
    // Utiliser directement rejectDossier qui gère le statut ET le motif
    this.immatriculationService.rejectDossier(this.selectedImmatriculation.id, this.rejectReason).subscribe({
      next: (response) => {
        console.log('✅ Immatriculation rejetée avec succès:', response);
        
        // Mettre à jour le statut dans la liste locale
        const index = this.immatriculations.findIndex(i => i.id === this.selectedImmatriculation.id);
        if (index !== -1) {
          this.immatriculations[index] = response;
          this.applyFilter();
        }
        
        // Mettre à jour l'immatriculation sélectionnée
        this.selectedImmatriculation = response;
        
        // Afficher un message de succès
        this.showNotification('L\'immatriculation a été rejetée avec succès !', 'success');
        
        // Fermer les modals
        this.closeRejectModal();
        this.closeModal();
      },
      error: (error) => {
        console.error('❌ Erreur lors du rejet:', error);
        this.showNotification('Une erreur est survenue lors du rejet. Veuillez réessayer.', 'error');
      }
    });
  }

  // Navigation vers la corbeille
  navigateToTrash(): void {
    // Rediriger vers la page de corbeille
    window.location.href = '/trash';
  }

  // ==================== GÉNÉRATION PDF ====================

  async generatePDF(immatriculation: any): Promise<void> {
    try {
      console.log('📄 Génération PDF pour:', immatriculation.dossierNumber);
      
      // Créer le document PDF
      const doc = new jsPDF();
      
      // Définir les styles
      doc.setFontSize(20);
      doc.setTextColor(0, 0, 0);
      
      // Titre
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('DOSSIER D\'IMMATRICULATION', 105, 30, { align: 'center' });
      
      // Informations principales
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      let yPosition = 60;
      
      doc.text(`Numéro de dossier: ${immatriculation.dossierNumber || 'N/A'}`, 20, yPosition);
      yPosition += 10;
      
      doc.text(`Nom: ${immatriculation.nom || 'N/A'} ${immatriculation.prenom || ''}`, 20, yPosition);
      yPosition += 10;
      
      if (immatriculation.raisonSociale) {
        doc.text(`Raison sociale: ${immatriculation.raisonSociale}`, 20, yPosition);
        yPosition += 10;
      }
      
      doc.text(`Email: ${immatriculation.email || 'N/A'}`, 20, yPosition);
      yPosition += 10;
      
      doc.text(`Téléphone: ${immatriculation.telephone || 'N/A'}`, 20, yPosition);
      yPosition += 10;
      
      doc.text(`Statut: ${this.getStatutKey(immatriculation.status)}`, 20, yPosition);
      yPosition += 10;
      
      doc.text(`Date de création: ${this.formatDate(immatriculation.dateCreation)}`, 20, yPosition);
      yPosition += 20;
      
      // Générer le QR Code
      const qrData = JSON.stringify({
        dossierNumber: immatriculation.dossierNumber,
        nom: immatriculation.nom,
        prenom: immatriculation.prenom,
        email: immatriculation.email,
        status: immatriculation.status,
        dateCreation: immatriculation.dateCreation
      });
      
      const qrCodeDataURL = await QRCode.toDataURL(qrData, {
        width: 100,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      // Ajouter le QR Code
      doc.text('QR Code - Informations du dossier:', 20, yPosition);
      doc.addImage(qrCodeDataURL, 'PNG', 150, yPosition - 10, 50, 50);
      
      yPosition += 60;
      
      // Pied de page
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Document généré automatiquement - SmartTax System', 105, 280, { align: 'center' });
      doc.text(`Date de génération: ${new Date().toLocaleDateString('fr-FR')}`, 105, 285, { align: 'center' });
      
      // Télécharger le fichier
      const fileName = `Dossier_${immatriculation.dossierNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      this.showNotification('PDF généré et téléchargé avec succès !', 'success');
      
    } catch (error) {
      console.error('❌ Erreur lors de la génération PDF:', error);
      this.showNotification('Erreur lors de la génération du PDF', 'error');
    }
  }

  // ==================== MÉTHODES DE TRI ====================

  onSortChange(): void {
    this.applyFilter();
  }

  sortImmatriculations(list: any[]): any[] {
    if (this.sortBy === 'none') {
      return list;
    }

    const sorted = [...list].sort((a, b) => {
      if (this.sortBy === 'date') {
        const dateA = new Date(a.dateCreation || a.dateSoumission || 0);
        const dateB = new Date(b.dateCreation || b.dateSoumission || 0);
        
        if (this.sortOrder === 'recent') {
          return dateB.getTime() - dateA.getTime(); // Plus récent en premier
        } else {
          return dateA.getTime() - dateB.getTime(); // Plus ancien en premier
        }
      } else if (this.sortBy === 'status') {
        // Tri par statut alphabétique
        const statusA = a.status || '';
        const statusB = b.status || '';
        return statusA.localeCompare(statusB);
      }
      
      return 0;
    });

    return sorted;
  }

  printDetails(): void {
    if (!this.selectedImmatriculation) return;
    
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
    printWindow.print();
    printWindow.close();
  }

  // Méthodes de gestion des documents
  get hasDocuments(): boolean {
    if (!this.selectedImmatriculation) {
      console.log('❌ Aucune immatriculation sélectionnée');
      return false;
    }
    
    const hasIdentite = !!this.selectedImmatriculation.identiteFile;
    const hasActivite = !!this.selectedImmatriculation.activiteFile;
    const hasPhoto = !!this.selectedImmatriculation.photoFile;
    const hasAutres = this.selectedImmatriculation.autresFiles && this.selectedImmatriculation.autresFiles.length > 0;
    
    return hasIdentite || hasActivite || hasPhoto || hasAutres;
  }

  viewDocument(documentData: string, title: string): void {
    if (!documentData) return;
    
    // Créer une modal pour afficher le document
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      position: relative;
      max-width: 90%;
      max-height: 90%;
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    `;
    
    modalContent.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3 style="margin: 0; color: #333;">${title}</h3>
        <button id="closeDocModal" style="
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
        ">&times;</button>
      </div>
      <div style="text-align: center;">
        <img src="${documentData}" 
             alt="${title}" 
             style="max-width: 100%; max-height: 70vh; object-fit: contain; border-radius: 4px;">
      </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Fermer la modal
    const closeModal = () => {
      document.body.removeChild(modal);
    };
    
    const closeBtn = document.getElementById('closeDocModal');
    if (closeBtn) {
      closeBtn.onclick = closeModal;
    }
    modal.onclick = (e) => {
      if (e.target === modal) closeModal();
    };
    
    // Fermer avec Échap
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  downloadDocument(documentData: string, filename: string): void {
    if (!documentData) return;
    
    // Créer un lien de téléchargement
    const link = document.createElement('a');
    link.href = documentData;
    link.download = `${filename}.${this.getFileExtension(documentData)}`;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  getFileExtension(dataUrl: string): string {
    if (dataUrl.startsWith('data:image/')) {
      const mime = dataUrl.split(':')[1].split(';')[0];
      const extension = mime.split('/')[1];
      return extension || 'jpg';
    }
    if (dataUrl.startsWith('data:application/pdf')) {
      return 'pdf';
    }
    return 'jpg';
  }

  handleImageError(event: any): void {
    const img = event.target;
    img.style.display = 'none';
    
    // Afficher un placeholder
    const placeholder = document.createElement('div');
    placeholder.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 200px;
      background: #f5f5f5;
      border: 2px dashed #ddd;
      border-radius: 4px;
      color: #999;
      font-size: 14px;
    `;
    placeholder.innerHTML = '<i class="fa-solid fa-file-image" style="margin-right: 8px;"></i> Image non disponible';
    
    if (img.parentNode) {
      img.parentNode.insertBefore(placeholder, img);
    }
  }

  // ==================== MÉTHODES DE NOTIFICATION ====================

  showNotification(message: string, notificationType: 'success' | 'error' | 'warning' | 'info' = 'success'): void {
    this.notification = {
      show: true,
      message: message,
      type: notificationType
    };
    
    // Auto-hide après 4 secondes
    setTimeout(() => {
      this.hideNotification();
    }, 4000);
  }

  hideNotification(): void {
    this.notification.show = false;
  }

  // ==================== MÉTHODES POUR VOIR LA RAISON DE REJET ====================

  viewRejectionReason(immatriculation: any): void {
    this.rejectionReasonToView = immatriculation.motifRejet || 'Aucune raison spécifiée';
    this.showRejectionReasonModal = true;
  }

  closeRejectionReasonModal(): void {
    this.showRejectionReasonModal = false;
    this.rejectionReasonToView = '';
  }

  // ==================== MÉTHODES POUR MODAL DE CONFIRMATION ====================

  showConfirmation(title: string, message: string, onConfirm: () => void): void {
    this.confirmationData = { title, message, onConfirm };
    this.showConfirmationModal = true;
  }

  closeConfirmationModal(): void {
    this.showConfirmationModal = false;
    this.confirmationData = { title: '', message: '', onConfirm: () => {} };
  }

  confirmAction(): void {
    this.confirmationData.onConfirm();
    this.closeConfirmationModal();
  }

  // ==================== MÉTHODES POUR AUTO-SAVE RAISON REJET ====================

  onRejectionReasonChange(): void {
    // Annuler le timeout précédent
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
    
    // Démarrer un nouveau timeout de 2 secondes
    this.autoSaveTimeout = setTimeout(() => {
      this.autoSaveRejectionReason();
    }, 2000);
  }

  autoSaveRejectionReason(): void {
    if (!this.selectedImmatriculation || !this.rejectReason || this.rejectReason.trim().length === 0) {
      return;
    }
    
    // Mettre à jour SEULEMENT le motif de rejet sans changer le statut
    const updateDto: any = {
      motifRejet: this.rejectReason
    };
    
    this.immatriculationService.updateImmatriculation(this.selectedImmatriculation.id, updateDto).subscribe({
      next: (updatedResponse: Immatriculation) => {
        // Mettre à jour la liste locale
        const index = this.immatriculations.findIndex(i => i.id === this.selectedImmatriculation.id);
        if (index !== -1) {
          this.immatriculations[index] = updatedResponse;
          this.applyFilter();
        }
        
        // Mettre à jour l'immatriculation sélectionnée
        this.selectedImmatriculation = updatedResponse;
        
        this.showNotification('La raison de rejet a été enregistrée avec succès !', 'success');
      },
      error: (error: any) => {
        console.error('❌ Erreur lors de l\'enregistrement du motif de rejet:', error);
        this.showNotification('Une erreur est survenue lors de l\'enregistrement du motif de rejet. Veuillez réessayer.', 'error');
      }
    });
  }

  // ==================== MÉTHODE POUR REMETTRE EN COURS DE VÉRIFICATION ====================

  resetToEnCoursVerification(immatriculation: any): void {
    if (!immatriculation || !immatriculation.id) {
      this.showNotification('Sélection invalide', 'error');
      return;
    }

    // Afficher le modal de confirmation
    const message = `Êtes-vous sûr de vouloir remettre cette immatriculation en cours de vérification ?\n\nN° dossier: ${immatriculation.dossierNumber || immatriculation.id}\nContribuable: ${this.getContribuableName(immatriculation)}`;
    
    this.showConfirmation(
      'Confirmation de réactivation',
      message,
      () => {
        this.immatriculationService.updateImmatriculationStatus(immatriculation.id, 'EN_COURS_VERIFICATION').subscribe({
          next: (response: Immatriculation) => {
            // Mettre à jour la liste locale
            const index = this.immatriculations.findIndex(i => i.id === immatriculation.id);
            if (index !== -1) {
              this.immatriculations[index] = response;
              this.applyFilter();
            }
            
            // Mettre à jour l'immatriculation sélectionnée si c'est celle-ci
            if (this.selectedImmatriculation && this.selectedImmatriculation.id === immatriculation.id) {
              this.selectedImmatriculation = response;
            }
            
            this.showNotification('L\'immatriculation a été remise en cours de vérification avec succès !', 'success');
          },
          error: (error: any) => {
            console.error('❌ Erreur lors de la mise à jour du statut:', error);
            this.showNotification('Une erreur est survenue lors de la mise à jour du statut. Veuillez réessayer.', 'error');
          }
        });
      }
    );
  }
}

// ==================== FONCTIONS UTILITAIRES ====================

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
