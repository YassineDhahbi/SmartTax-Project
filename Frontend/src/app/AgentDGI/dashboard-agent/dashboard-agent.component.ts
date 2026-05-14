import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ImmatriculationService } from '../../services/immatriculation.service';
import { TrashService } from '../../services/trash.service';
import { EmailService } from '../../services/email/email.service';
import { PublicationService } from '../../services/publication.service';
import { Immatriculation } from '../../models/immatriculation.model';
import { PublicationStats } from '../../models/publication.model';
import jsPDF from 'jspdf';
import * as QRCode from 'qrcode';
import { Subscription, Subject, interval, forkJoin, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil, catchError } from 'rxjs/operators';
import { AdminNotificationItem, AdminNotificationService } from '../../services/admin-notification.service';
import { environment } from '../../../environments/environment';
import { ReclamationService, Message as ReclamationChatMessage } from '../../services/reclamation.service';
import { ReclamationChatStompService } from '../../services/reclamation-chat-stomp.service';
import {
  AgentDownloadDocument,
  DOCUMENT_LIBRARY_CATEGORIES,
  DownloadDocumentCatalogService,
  LibraryCategoryId,
} from '../../services/download-document-catalog.service';

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
  /** Si true, la pastille / tendance (delta) n'est pas affichée (ex. KPI documents par rubrique). */
  hideDelta?: boolean;
}

interface QuickAction {
  title: string;
  sub: string;
  icon: string;
  tone: Tone;
  /** Navigation latérale (vue d’ensemble) */
  navKey?: string;
}

interface RecentOp {
  ref: string;
  subject: string;
  kind: string;
  status: string;
  statusKey: StatusKey;
  updatedAt: string;
  /** ISO date for tri du fil d’activité vue d’ensemble */
  sortDate?: string;
  module?: 'immatriculation' | 'demande-information' | 'reclamation' | 'publication';
  linkId?: number;
}

interface OverviewLegendRow {
  label: string;
  pctLabel: string;
  dotClass: string;
}

interface OverviewTaskNavItem {
  title: string;
  meta: string;
  tone: Tone;
  nav: string;
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

interface DemandeInformationStats {
  total: number;
  traitees: number;
  nonTraitees: number;
  urgentes: number;
}

interface DemandeInformationItem {
  id: number;
  nomComplet: string;
  email: string;
  telephone?: string;
  sujet: string;
  message: string;
  urgent: boolean;
  dateCreation: string;
  traitementStatus?: 'TRAITE' | 'NON_TRAITE';
  assignedAgentId?: number | null;
  assignedAgentName?: string | null;
}

interface AgentReclamationStats {
  totalSoumises: number;
  etatEnCours: number;
  etatTraite: number;
  prioriteHaute: number;
}

interface AgentReclamationPiece {
  nom?: string;
  taille?: number;
  type?: string;
  url?: string;
}

interface AgentReclamationRow {
  id: number;
  reference?: string;
  sujet: string;
  description?: string;
  categorie?: string;
  typeDisplay: string;
  urgenceDisplay: string;
  urgenceCode: string;
  statut: string;
  etatReclamation?: string | null;
  emailUser?: string;
  nomUser?: string;
  telephoneUser?: string;
  dateCreation?: string;
  dateSoumission?: string;
  piecesJointes?: AgentReclamationPiece[];
}

@Component({
  selector: 'app-dashboard-agent',
  templateUrl: './dashboard-agent.component.html',
  styleUrls: ['./dashboard-agent.component.css']
})
export class DashboardAgentComponent implements OnInit, OnDestroy {
  userName = 'Agent';

  greeting = getGreeting();

  sidebarOpen = false;

  activeNavKey: string = 'overview';

  currentView: string = 'overview'; // 'overview' | 'dossiers' | 'demande-information' | 'reclamation' | 'publications' | 'documents' | 'profile'

  activityRange: '7d' | '30d' = '7d';

  theme: 'dark' | 'light' = getInitialTheme();

  notifications: AdminNotificationItem[] = [];
  unreadCount = 0;
  showNotificationsPanel = false;
  isLoadingNotifications = false;
  deletingNotificationId: number | null = null;
  pendingImmatriculationIdToOpen: number | null = null;
  pendingPublicationIdToOpen: number | null = null;
  pendingDemandeInformationIdToOpen: number | null = null;
  pendingReclamationIdToOpen: number | null = null;
  currentAgentId: number | null = null;
  /** Modale statistiques de téléchargement (catalogue centre documentaire). */
  documentsLibraryStatsOpen = false;
  documentsLibraryStatsLoading = false;
  documentsLibraryStatsError: string | null = null;
  documentsLibraryStatsRows: AgentDownloadDocument[] = [];
  private refreshNotificationsSub?: Subscription;

  constructor(
    private http: HttpClient,
    private immatriculationService: ImmatriculationService,
    private trashService: TrashService,
    private emailService: EmailService,
    private publicationService: PublicationService,
    private reclamationService: ReclamationService,
    private reclamationChatStomp: ReclamationChatStompService,
    private cdr: ChangeDetectorRef,
    private notificationService: AdminNotificationService,
    private downloadDocumentCatalog: DownloadDocumentCatalogService
  ) {}

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

  demandesInformationMain: DemandeInformationItem[] = [];
  isLoadingDemandesInformation = false;
  selectedDemandeInformation: DemandeInformationItem | null = null;
  showDemandeInformationModal = false;
  demandeInformationSearchTerm = '';
  demandeInformationTraitementFilter: 'all' | 'TRAITE' | 'NON_TRAITE' = 'all';
  demandeInformationUrgenceFilter: 'all' | 'urgent' | 'normal' = 'all';
  demandeInfoMainPage = 0;
  demandeInfoPageSize = 10;
  readonly demandeInfoPageSizeOptions = [10, 20, 50];
  demandeInfoMainTotalElements = 0;
  demandeInfoMainTotalPages = 0;
  demandeInformationStats: DemandeInformationStats = {
    total: 0,
    traitees: 0,
    nonTraitees: 0,
    urgentes: 0,
  };

  agentReclamations: AgentReclamationRow[] = [];
  isLoadingAgentReclamations = false;
  agentReclamationSearchTerm = '';
  agentReclamationPage = 0;
  agentReclamationPageSize = 10;
  agentReclamationTotalElements = 0;
  agentReclamationTotalPages = 0;
  /** Noms d'attributs alignés sur l'API /reclamation/all (tri serveur). */
  agentReclamationSortField = 'dateCreation';
  agentReclamationSortDir: 'ASC' | 'DESC' = 'DESC';
  /** Valeurs API : EN_COURS, TRAITE ; 'all' = pas de filtre. */
  agentReclamationEtatFilter: 'all' | 'EN_COURS' | 'TRAITE' = 'all';
  /** Valeurs API : BASSE, MOYENNE, HAUTE, URGENTE ; 'all' = pas de filtre. */
  agentReclamationUrgenceFilter: 'all' | 'BASSE' | 'MOYENNE' | 'HAUTE' | 'URGENTE' = 'all';
  readonly agentReclamationPageSizeOptions = [10, 20, 50];
  agentReclamationEtatUpdatingId: number | null = null;
  agentReclamationStats: AgentReclamationStats = {
    totalSoumises: 0,
    etatEnCours: 0,
    etatTraite: 0,
    prioriteHaute: 0,
  };
  private readonly destroy$ = new Subject<void>();
  private readonly agentReclamationSearchDebounce$ = new Subject<string>();
  private readonly demandeInformationSearchDebounce$ = new Subject<string>();
  showAgentReclamationModal = false;
  selectedAgentReclamation: AgentReclamationRow | null = null;
  showReclamationChatModal = false;
  reclamationChatRow: AgentReclamationRow | null = null;
  reclamationChatMessages: ReclamationChatMessage[] = [];
  reclamationChatInput = '';
  reclamationChatFile: File | null = null;
  isLoadingReclamationChat = false;
  isSendingReclamationChat = false;
  private reclamationChatStompSub?: Subscription;
  showReplyEmailModal = false;
  /** Contexte du modal « Répondre par email » (demande d’info ou réclamation). */
  replyEmailFor: 'demande-information' | 'reclamation' | null = null;
  replyEmailSubject = '';
  replyEmailContent = '';
  isSendingReplyEmail = false;
  publicationStats: PublicationStats = {
    total: 0,
    published: 0,
    draft: 0,
    pending: 0,
    rejected: 0,
    archived: 0,
    total_views: 0,
    total_likes: 0,
    total_dislikes: 0,
    total_favorites: 0,
    total_reports: 0
  };

  /** Fil d’activité fusionné (tous modules) — vue d’ensemble. */
  overviewRecentOps: RecentOp[] = [];
  /** Raccourcis « À faire » avec navigation. */
  overviewTaskItems: OverviewTaskNavItem[] = [];

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
    this.currentAgentId = this.resolveCurrentAgentId();
    this.loadUserName();
    this.refreshNotifications();
    this.refreshNotificationsSub = interval(15000).subscribe(() => this.refreshNotifications());
    this.agentReclamationSearchDebounce$
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.agentReclamationPage = 0;
        this.loadAgentReclamations();
      });
    this.demandeInformationSearchDebounce$
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.demandeInfoMainPage = 0;
        this.loadDemandesInformation();
      });

    this.loadImmatriculations();
    this.loadDemandeInformationStats();
    this.loadAgentReclamationStats();
    this.loadPublicationStats();
  }

  ngOnDestroy(): void {
    this.reclamationChatStompSub?.unsubscribe();
    this.reclamationChatStomp.stop();
    this.refreshNotificationsSub?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
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
        { key: 'overview', label: 'Vue d\'ensemble', icon: 'fa-solid fa-grid-2' },
        { key: 'work', label: 'Immatriculations', icon: 'fa-solid fa-folder-open', badge: 7 },
       
        { key: 'publications', label: 'Publications', icon: 'fa-solid fa-newspaper' },
        { key: 'documents', label: 'Documents', icon: 'fa-solid fa-file-lines' },
      ],
    },
    {
      title: 'Communication',
      items: [
        { key: 'reclamation', label: 'Réclamations', icon: 'fa-solid fa-file-circle-exclamation' },
        { key: 'demande-information', label: 'Demande Information', icon: 'fa-solid fa-circle-info' },
        
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

  get kpis(): KpiCard[] {
    if (this.currentView === 'documents') {
      const toneByCat: Record<LibraryCategoryId, Tone> = {
        formulaires: 'brand',
        guides: 'success',
        lois: 'warning',
        modeles: 'neutral',
      };
      return DOCUMENT_LIBRARY_CATEGORIES.map((c) => ({
        label: c.name,
        value: String(this.downloadDocumentCatalog.countInCategory(c.id)),
        sub: c.description,
        delta: '',
        deltaUp: true,
        icon: this.downloadCategoryIconClass(c.icon),
        tone: toneByCat[c.id],
        hideDelta: true,
      }));
    }

    if (this.currentView === 'publications') {
      return [
        {
          label: 'Total publications',
          value: `${this.publicationStats.total || 0}`,
          sub: 'Toutes les publications',
          icon: 'fa-solid fa-newspaper',
          delta: '+0%',
          deltaUp: true,
          tone: 'neutral',
        },
        {
          label: 'Publiées',
          value: `${this.publicationStats.published || 0}`,
          sub: 'Contenu publié',
          icon: 'fa-solid fa-bullhorn',
          delta: '+0%',
          deltaUp: true,
          tone: 'success',
        },
        {
          label: 'Brouillons',
          value: `${this.publicationStats.draft || 0}`,
          sub: 'En préparation',
          icon: 'fa-solid fa-pen-to-square',
          delta: '+0%',
          deltaUp: false,
          tone: 'warning',
        },
        {
          label: 'Archivées',
          value: `${this.publicationStats.archived || 0}`,
          sub: 'Historique',
          icon: 'fa-solid fa-box-archive',
          delta: '+0%',
          deltaUp: false,
          tone: 'brand',
        },
      ];
    }

    if (this.currentView === 'demande-information') {
      return [
        {
          label: 'Total demandes',
          value: this.getTotalDemandesInformationCount().toString(),
          sub: 'Toutes les demandes',
          icon: 'fa-solid fa-inbox',
          delta: '+0%',
          deltaUp: true,
          tone: 'neutral',
        },
        {
          label: 'Traitées',
          value: this.getDemandesTraiteesCount().toString(),
          sub: 'Statut traité',
          icon: 'fa-solid fa-circle-check',
          delta: '+0%',
          deltaUp: true,
          tone: 'success',
        },
        {
          label: 'Non traitées',
          value: this.getDemandesNonTraiteesCount().toString(),
          sub: 'À suivre',
          icon: 'fa-solid fa-hourglass-half',
          delta: '+0%',
          deltaUp: false,
          tone: 'warning',
        },
        {
          label: 'Urgentes',
          value: this.getDemandesUrgentesCount().toString(),
          sub: 'Priorité élevée',
          icon: 'fa-solid fa-triangle-exclamation',
          delta: '+0%',
          deltaUp: false,
          tone: 'danger',
        },
      ];
    }

    if (this.currentView === 'reclamation') {
      return [
        {
          label: 'Soumises',
          value: this.getAgentReclamationsTotalCount().toString(),
          sub: 'Réclamations déposées',
          icon: 'fa-solid fa-paper-plane',
          delta: '+0%',
          deltaUp: true,
          tone: 'brand',
        },
        {
          label: 'État en cours',
          value: this.countAgentReclamationsByEtat('EN_COURS').toString(),
          sub: 'Traitement non clos',
          icon: 'fa-solid fa-spinner',
          delta: '+0%',
          deltaUp: false,
          tone: 'warning',
        },
        {
          label: 'État traité',
          value: this.countAgentReclamationsByEtat('TRAITE').toString(),
          sub: 'Dossiers marqués traités',
          icon: 'fa-solid fa-circle-check',
          delta: '+0%',
          deltaUp: true,
          tone: 'success',
        },
        {
          label: 'Priorité haute',
          value: this.countAgentReclamationsUrgenceElevee().toString(),
          sub: 'Haute ou urgente',
          icon: 'fa-solid fa-triangle-exclamation',
          delta: '+0%',
          deltaUp: false,
          tone: 'danger',
        },
      ];
    }

    if (this.currentView === 'overview') {
      return [
        {
          label: 'Immatriculations',
          value: this.getTotalImmatriculationsCount().toString(),
          sub: `${this.getEnCoursCount()} en vérification · ${this.getATraiterCount()} soumis`,
          icon: 'fa-solid fa-folder-open',
          delta: '—',
          deltaUp: true,
          tone: 'neutral',
        },
        {
          label: 'Demandes d\'information',
          value: this.getTotalDemandesInformationCount().toString(),
          sub: `${this.getDemandesNonTraiteesCount()} non traitées · ${this.getDemandesUrgentesCount()} urgentes`,
          icon: 'fa-solid fa-circle-info',
          delta: '—',
          deltaUp: true,
          tone: 'warning',
        },
        {
          label: 'Réclamations',
          value: this.getAgentReclamationsTotalCount().toString(),
          sub: `${this.countAgentReclamationsByEtat('EN_COURS')} en cours · ${this.countAgentReclamationsByEtat('TRAITE')} traitées`,
          icon: 'fa-solid fa-file-circle-exclamation',
          delta: '—',
          deltaUp: true,
          tone: 'brand',
        },
        {
          label: 'Publications',
          value: `${this.publicationStats.total || 0}`,
          sub: `${this.publicationStats.published || 0} publiées · ${this.publicationStats.pending || 0} en attente`,
          icon: 'fa-solid fa-newspaper',
          delta: '—',
          deltaUp: true,
          tone: 'success',
        },
      ];
    }

    return [
      {
        label: 'Total',
        value: this.getTotalImmatriculationsCount().toString(),
        sub: 'Toutes les immatriculations',
        icon: 'fa-solid fa-folder',
        delta: '-2%',
        deltaUp: false,
        tone: 'neutral',
      },
      {
        label: 'Dossiers en cours',
        value: this.getEnCoursCount().toString(),
        sub: 'Aujourd\'hui',
        icon: 'fa-solid fa-folder-tree',
        delta: '+8%',
        deltaUp: true,
        tone: 'brand',
      },
      
      {
        label: 'Validés',
        value: this.getValidésCount().toString(),
        sub: 'Cette semaine',
        icon: 'fa-solid fa-circle-check',
        delta: '+12%',
        deltaUp: true,
        tone: 'success',
      },
      {
        label: 'Bloqués',
        value: this.getBloquésCount().toString(),
        sub: 'En attente',
        icon: 'fa-solid fa-circle-xmark',
        delta: '+1',
        deltaUp: false,
        tone: 'danger',
      },
    ];
  }

  getEnCoursCount(): number {
    return this.immatriculations.filter(immatriculation => 
      immatriculation.status === 'EN_COURS_VERIFICATION'
    ).length;
  }

  getTotalImmatriculationsCount(): number {
    return this.immatriculations.length;
  }

  getATraiterCount(): number {
    return this.immatriculations.filter(immatriculation => 
      immatriculation.status === 'SOUMIS'
    ).length;
  }

  getValidésCount(): number {
    const validés = this.immatriculations.filter(immatriculation => 
      immatriculation.status === 'VALIDE'
    );
    return validés.length;
  }

  getBloquésCount(): number {
    const bloqués = this.immatriculations.filter(immatriculation => 
      immatriculation.status === 'REJETE'
    );
    
    return bloqués.length;
  }

  getTotalDemandesInformationCount(): number {
    return this.demandeInformationStats.total;
  }

  getDemandesTraiteesCount(): number {
    return this.demandeInformationStats.traitees;
  }

  getDemandesNonTraiteesCount(): number {
    return this.demandeInformationStats.nonTraitees;
  }

  getDemandesUrgentesCount(): number {
    return this.demandeInformationStats.urgentes;
  }

  getAgentReclamationsTotalCount(): number {
    return this.agentReclamationStats.totalSoumises;
  }

  countAgentReclamationsByEtat(etat: string): number {
    if (etat === 'EN_COURS') return this.agentReclamationStats.etatEnCours;
    if (etat === 'TRAITE') return this.agentReclamationStats.etatTraite;
    return 0;
  }

  countAgentReclamationsUrgenceElevee(): number {
    return this.agentReclamationStats.prioriteHaute;
  }

  onAgentReclamationSearchInput(): void {
    this.agentReclamationSearchDebounce$.next(this.agentReclamationSearchTerm);
  }

  clearAgentReclamationSearch(): void {
    this.agentReclamationSearchTerm = '';
    this.agentReclamationPage = 0;
    this.agentReclamationSearchDebounce$.next('');
  }

  onAgentReclamationFilterChange(): void {
    this.agentReclamationPage = 0;
    this.loadAgentReclamations();
  }

  goToAgentReclamationPage(page: number): void {
    const last = Math.max(0, this.agentReclamationTotalPages - 1);
    const p = Math.max(0, Math.min(page, last));
    if (p === this.agentReclamationPage) {
      return;
    }
    this.agentReclamationPage = p;
    this.loadAgentReclamations();
  }

  agentReclamationPrevPage(): void {
    this.goToAgentReclamationPage(this.agentReclamationPage - 1);
  }

  agentReclamationNextPage(): void {
    this.goToAgentReclamationPage(this.agentReclamationPage + 1);
  }

  setAgentReclamationSort(field: string): void {
    if (this.agentReclamationSortField === field) {
      this.agentReclamationSortDir = this.agentReclamationSortDir === 'ASC' ? 'DESC' : 'ASC';
    } else {
      this.agentReclamationSortField = field;
      this.agentReclamationSortDir =
        field === 'dateCreation' || field === 'dateSoumission' ? 'DESC' : 'ASC';
    }
    this.agentReclamationPage = 0;
    this.loadAgentReclamations();
  }

  agentReclamationSortIcon(field: string): string {
    if (this.agentReclamationSortField !== field) {
      return 'fa-sort';
    }
    return this.agentReclamationSortDir === 'ASC' ? 'fa-sort-up' : 'fa-sort-down';
  }

  onAgentReclamationPageSizeChange(size: number | string): void {
    const n = typeof size === 'string' ? parseInt(size, 10) : Number(size);
    if (!Number.isFinite(n) || !this.agentReclamationPageSizeOptions.includes(n)) return;
    this.agentReclamationPageSize = n;
    this.agentReclamationPage = 0;
    this.loadAgentReclamations();
  }

  get agentReclamationPageDisplayFrom(): number {
    if (this.agentReclamationTotalElements === 0) return 0;
    return this.agentReclamationPage * this.agentReclamationPageSize + 1;
  }

  get agentReclamationPageDisplayTo(): number {
    return Math.min(
      (this.agentReclamationPage + 1) * this.agentReclamationPageSize,
      this.agentReclamationTotalElements
    );
  }

  formatAgentReclamationStatut(statut: string): string {
    const labels: Record<string, string> = {
      BROUILLON: 'Brouillon',
      SOUMIS: 'Soumis',
      EN_COURS: 'En cours',
      RESOLU: 'Résolu',
      REJETE: 'Rejeté',
    };
    return labels[statut] || statut;
  }

  formatAgentReclamationEtat(etat: string | null | undefined): string {
    if (!etat) return '—';
    const labels: Record<string, string> = {
      EN_COURS: 'En cours',
      TRAITE: 'Traité',
    };
    return labels[etat] || etat;
  }

  normalizeEtatForSelect(etat: string | null | undefined): 'EN_COURS' | 'TRAITE' {
    return etat === 'TRAITE' ? 'TRAITE' : 'EN_COURS';
  }

  updateAgentReclamationEtat(row: AgentReclamationRow, etat: string): void {
    if (!row?.id) {
      return;
    }
    const target: 'EN_COURS' | 'TRAITE' = etat === 'TRAITE' ? 'TRAITE' : 'EN_COURS';
    const prevNorm = this.normalizeEtatForSelect(row.etatReclamation);
    if (prevNorm === target) {
      return;
    }

    const previous = row.etatReclamation;
    this.agentReclamationEtatUpdatingId = row.id;
    row.etatReclamation = target;

    const params = new HttpParams().set('etat', target);
    this.http.put<any>(`${environment.apiUrl}/reclamation/${row.id}/etat-traitement`, null, { params }).subscribe({
      next: (dto) => {
        const rawEtat = dto?.etatReclamation != null ? this.pickReclamationDtoValue(dto.etatReclamation) : target;
        row.etatReclamation = rawEtat === 'TRAITE' ? 'TRAITE' : 'EN_COURS';
        this.agentReclamationEtatUpdatingId = null;
        this.loadAgentReclamationStats();
        this.showNotification('État de traitement mis à jour.', 'success');
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erreur mise à jour état réclamation:', err);
        row.etatReclamation = previous;
        this.agentReclamationEtatUpdatingId = null;
        this.showNotification("Impossible de mettre à jour l'état.", 'error');
        this.cdr.markForCheck();
      },
    });
  }

  viewAgentReclamationDetails(row: AgentReclamationRow): void {
    this.selectedAgentReclamation = row;
    this.showAgentReclamationModal = true;
    this.cdr.detectChanges();
  }

  closeAgentReclamationModal(): void {
    this.showAgentReclamationModal = false;
    this.selectedAgentReclamation = null;
    this.closeReplyEmailModal();
  }

  openReclamationChat(row: AgentReclamationRow | null): void {
    if (!row?.id) {
      this.showNotification('Réclamation invalide.', 'error');
      return;
    }
    this.reclamationChatRow = row;
    this.reclamationChatInput = '';
    this.reclamationChatFile = null;
    this.showReclamationChatModal = true;
    this.reclamationChatStompSub?.unsubscribe();
    this.reclamationChatStompSub = undefined;
    this.reclamationChatStomp.stopChat();

    const reclamationId = row.id;
    this.loadReclamationChatMessages(() => {
      this.reclamationChatStompSub = this.reclamationChatStomp.watch(reclamationId).subscribe((msg) => {
        this.mergeReclamationIncomingMessage(msg);
        this.cdr.markForCheck();
      });
    });
  }

  closeReclamationChatModal(): void {
    this.reclamationChatStompSub?.unsubscribe();
    this.reclamationChatStompSub = undefined;
    this.reclamationChatStomp.stopChat();
    this.showReclamationChatModal = false;
    this.reclamationChatRow = null;
    this.reclamationChatMessages = [];
    this.reclamationChatInput = '';
    this.reclamationChatFile = null;
    this.isLoadingReclamationChat = false;
    this.isSendingReclamationChat = false;
  }

  private mergeReclamationIncomingMessage(msg: ReclamationChatMessage): void {
    if (msg.id != null && this.reclamationChatMessages.some((m) => m.id === msg.id)) {
      return;
    }
    this.reclamationChatMessages = [...this.reclamationChatMessages, msg].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  private loadReclamationChatMessages(afterLoaded?: () => void): void {
    const row = this.reclamationChatRow;
    if (!row?.id) {
      return;
    }
    this.isLoadingReclamationChat = true;
    this.reclamationService.getMessages(row.id).subscribe({
      next: (msgs: ReclamationChatMessage[]) => {
        this.reclamationChatMessages = msgs;
        this.isLoadingReclamationChat = false;
        afterLoaded?.();
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        console.error(err);
        this.reclamationChatMessages = [];
        this.isLoadingReclamationChat = false;
        this.showNotification('Impossible de charger la messagerie.', 'error');
        afterLoaded?.();
        this.cdr.markForCheck();
      },
    });
  }

  sendReclamationChatMessage(): void {
    const row = this.reclamationChatRow;
    const text = this.reclamationChatInput.trim();
    if (!row?.id || (!text && !this.reclamationChatFile)) {
      return;
    }
    this.isSendingReclamationChat = true;
    this.reclamationService.sendAgentMessage(row.id, text, this.reclamationChatFile).subscribe({
      next: (msg: ReclamationChatMessage) => {
        this.mergeReclamationIncomingMessage(msg);
        this.reclamationChatInput = '';
        this.reclamationChatFile = null;
        this.isSendingReclamationChat = false;
        this.showNotification('Message envoyé.', 'success');
        this.cdr.markForCheck();
      },
      error: (err: { error?: { message?: string } }) => {
        console.error(err);
        this.isSendingReclamationChat = false;
        const apiMsg = err?.error?.message;
        this.showNotification(
          typeof apiMsg === 'string' ? apiMsg : "Impossible d'envoyer le message.",
          'error'
        );
        this.cdr.markForCheck();
      },
    });
  }

  onReclamationChatFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length > 0 ? input.files[0] : null;
    if (!file) {
      this.reclamationChatFile = null;
      return;
    }
    const validation = this.reclamationService.validateFile(file);
    if (!validation.isValid) {
      this.reclamationChatFile = null;
      input.value = '';
      this.showNotification(validation.error || 'Fichier invalide.', 'error');
      return;
    }
    this.reclamationChatFile = file;
  }

  clearReclamationChatFile(): void {
    this.reclamationChatFile = null;
  }

  reclamationChatAttachmentHref(msg: ReclamationChatMessage): string {
    const piece: any = (msg as any)?.pieceJointe;
    const rawUrl = piece?.url;
    if (!rawUrl || typeof rawUrl !== 'string') {
      return '';
    }
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      return rawUrl;
    }
    const origin = environment.apiUrl.replace(/\/?api\/?$/, '').replace(/\/$/, '');
    return rawUrl.startsWith('/') ? `${origin}${rawUrl}` : `${origin}/${rawUrl}`;
  }

  reclamationChatAttachmentName(msg: ReclamationChatMessage): string {
    const piece: any = (msg as any)?.pieceJointe;
    const n = piece?.nom;
    return typeof n === 'string' && n.trim() ? n : 'Pièce jointe';
  }

  reclamationChatAuthorLabel(auteur: string): string {
    if (auteur === 'agent') {
      return 'Vous (agent)';
    }
    const name = this.reclamationChatRow?.nomUser?.trim();
    return name || 'Contribuable';
  }

  /** URL absolue pour téléchargement (le chemin API contient le nom réel du fichier sur disque). */
  agentReclamationPieceHref(piece: AgentReclamationPiece): string {
    const u = piece?.url?.trim();
    if (!u) {
      return '';
    }
    if (u.startsWith('http://') || u.startsWith('https://')) {
      return u;
    }
    const origin = environment.apiUrl.replace(/\/?api\/?$/, '').replace(/\/$/, '');
    return u.startsWith('/') ? `${origin}${u}` : `${origin}/${u}`;
  }

  formatAttachmentSize(bytes: number | undefined): string {
    if (bytes == null || !Number.isFinite(bytes) || bytes < 0) {
      return '';
    }
    if (bytes < 1024) {
      return `${bytes} o`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} Ko`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  quickActions: QuickAction[] = [
    {
      title: 'Immatriculations',
      sub: 'Liste et validation des dossiers',
      icon: 'fa-solid fa-folder-open',
      tone: 'brand',
      navKey: 'work',
    },
    {
      title: 'Demandes d\'information',
      sub: 'Messages et statuts de traitement',
      icon: 'fa-solid fa-circle-info',
      tone: 'warning',
      navKey: 'demande-information',
    },
    {
      title: 'Réclamations',
      sub: 'Dossiers soumis et en cours',
      icon: 'fa-solid fa-file-circle-exclamation',
      tone: 'brand',
      navKey: 'reclamation',
    },
    {
      title: 'Publications',
      sub: 'Contenus, brouillons et modération',
      icon: 'fa-solid fa-newspaper',
      tone: 'neutral',
      navKey: 'publications',
    },
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
    return this.svgLinePointsFromSeries(this.lineSeries);
  }

  /** Histogramme des immatriculations créées sur les 7 derniers jours (vue d’ensemble). */
  get overviewLineSeries(): number[] {
    const days = 7;
    const buckets = new Array(days).fill(0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    for (const imm of this.immatriculations) {
      const raw = imm?.dateCreation || imm?.dateSoumission;
      if (!raw) {
        continue;
      }
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) {
        continue;
      }
      d.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
      if (diffDays < 0 || diffDays >= days) {
        continue;
      }
      buckets[days - 1 - diffDays] += 1;
    }
    return buckets;
  }

  get overviewLinePoints(): string {
    return this.svgLinePointsFromSeries(this.overviewLineSeries);
  }

  get overviewActivityBars(): number[] {
    const series = this.overviewLineSeries;
    const max = Math.max(...series, 1);
    return series.map((v) => Math.round((v / max) * 100));
  }

  /** Donut = répartition des statuts d’immatriculation (données réelles). */
  get overviewDonutStyle(): string {
    const imm = this.immatriculations;
    const n = imm.length;
    if (!n) {
      return 'conic-gradient(from 210deg, rgba(148,163,184,0.35) 0% 100%)';
    }
    const order: Array<{ key: string; color: string }> = [
      { key: 'EN_COURS_VERIFICATION', color: 'rgba(99,102,241,0.95)' },
      { key: 'SOUMIS', color: 'rgba(245,158,11,0.95)' },
      { key: 'VALIDE', color: 'rgba(34,197,94,0.95)' },
      { key: 'REJETE', color: 'rgba(239,68,68,0.95)' },
      { key: 'BROUILLON', color: 'rgba(148,163,184,0.85)' },
    ];
    const counts = new Map<string, number>();
    for (const { key } of order) {
      counts.set(key, 0);
    }
    let other = 0;
    for (const i of imm) {
      const s = `${i?.status || ''}`.toUpperCase();
      if (counts.has(s)) {
        counts.set(s, (counts.get(s) || 0) + 1);
      } else {
        other += 1;
      }
    }
    let acc = 0;
    const parts: string[] = [];
    const add = (frac: number, color: string) => {
      if (frac <= 0) {
        return;
      }
      const pct = (frac / n) * 100;
      const start = acc;
      acc += pct;
      parts.push(`${color} ${start}% ${acc}%`);
    };
    for (const { key, color } of order) {
      add(counts.get(key) || 0, color);
    }
    if (other > 0) {
      add(other, 'rgba(59,130,246,0.8)');
    }
    if (!parts.length) {
      return 'conic-gradient(from 210deg, rgba(148,163,184,0.35) 0% 100%)';
    }
    return `conic-gradient(from 210deg, ${parts.join(', ')})`;
  }

  get overviewImmatriculationLegend(): OverviewLegendRow[] {
    const total = this.immatriculations.length;
    const pct = (c: number) => (total ? `${Math.round((c / total) * 100)}%` : '0%');
    const countOf = (status: string) =>
      this.immatriculations.filter((i) => `${i?.status || ''}`.toUpperCase() === status).length;
    const rows: OverviewLegendRow[] = [
      { label: 'En vérification', pctLabel: pct(countOf('EN_COURS_VERIFICATION')), dotClass: 'is-brand' },
      { label: 'Soumis', pctLabel: pct(countOf('SOUMIS')), dotClass: 'is-warning' },
      { label: 'Validé', pctLabel: pct(countOf('VALIDE')), dotClass: 'is-success' },
      { label: 'Rejeté', pctLabel: pct(countOf('REJETE')), dotClass: 'is-danger' },
      { label: 'Brouillon', pctLabel: pct(countOf('BROUILLON')), dotClass: 'is-neutral' },
    ];
    const known =
      countOf('EN_COURS_VERIFICATION') +
      countOf('SOUMIS') +
      countOf('VALIDE') +
      countOf('REJETE') +
      countOf('BROUILLON');
    const autre = Math.max(0, total - known);
    if (autre > 0) {
      rows.push({ label: 'Autre', pctLabel: pct(autre), dotClass: 'is-brand' });
    }
    return rows;
  }

  get overviewAlerts(): AlertItem[] {
    const out: AlertItem[] = [];
    if (this.unreadCount > 0) {
      out.push({
        title: `${this.unreadCount} notification(s) non lue(s)`,
        meta: 'Centre de notifications',
        tone: 'brand',
        icon: 'fa-regular fa-bell',
      });
    }
    if (this.demandeInformationStats.nonTraitees > 0) {
      out.push({
        title: `${this.demandeInformationStats.nonTraitees} demande(s) non traitée(s)`,
        meta: 'Module demandes d\'information',
        tone: 'warning',
        icon: 'fa-solid fa-circle-info',
      });
    }
    if (this.agentReclamationStats.etatEnCours > 0) {
      out.push({
        title: `${this.agentReclamationStats.etatEnCours} réclamation(s) en cours`,
        meta: 'Suivi des dossiers',
        tone: 'brand',
        icon: 'fa-solid fa-file-circle-exclamation',
      });
    }
    if (this.getBloquésCount() > 0) {
      out.push({
        title: `${this.getBloquésCount()} immatriculation(s) rejetée(s)`,
        meta: 'Contrôle des dossiers',
        tone: 'danger',
        icon: 'fa-solid fa-circle-xmark',
      });
    }
    if ((this.publicationStats.pending || 0) > 0) {
      out.push({
        title: `${this.publicationStats.pending} publication(s) en attente`,
        meta: 'Modération éditoriale',
        tone: 'warning',
        icon: 'fa-solid fa-newspaper',
      });
    }
    if (!out.length) {
      return [
        {
          title: 'Aucune alerte prioritaire',
          meta: 'Les indicateurs sont dans les plages habituelles',
          tone: 'success',
          icon: 'fa-solid fa-circle-check',
        },
      ];
    }
    return out.slice(0, 5);
  }

  onOverviewQuickNav(a: QuickAction): void {
    if (a.navKey) {
      this.setActiveNav(a.navKey);
    }
  }

  openOverviewRecentOp(row: RecentOp): void {
    const id = row.linkId;
    if (row.module === 'immatriculation' && id != null) {
      this.pendingImmatriculationIdToOpen = id;
      this.setActiveNav('work');
      return;
    }
    if (row.module === 'demande-information' && id != null) {
      this.pendingDemandeInformationIdToOpen = id;
      this.setActiveNav('demande-information');
      return;
    }
    if (row.module === 'reclamation' && id != null) {
      this.pendingReclamationIdToOpen = id;
      this.agentReclamationSearchTerm = '';
      this.agentReclamationEtatFilter = 'all';
      this.agentReclamationUrgenceFilter = 'all';
      this.setActiveNav('reclamation');
      return;
    }
    if (row.module === 'publication' && id != null) {
      this.pendingPublicationIdToOpen = null;
      this.setActiveNav('publications');
      setTimeout(() => {
        this.pendingPublicationIdToOpen = id;
        this.cdr.detectChanges();
      }, 0);
      return;
    }
    this.showNotification('Impossible d\'ouvrir cet élément.', 'info');
  }

  onOverviewTaskNav(item: OverviewTaskNavItem): void {
    if (item?.nav) {
      this.setActiveNav(item.nav);
    }
  }

  private svgLinePointsFromSeries(series: number[]): string {
    if (!series.length) {
      return '10,80 510,80';
    }
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

  private refreshOverviewWidgets(): void {
    const items: OverviewTaskNavItem[] = [];
    const soumis = this.getATraiterCount();
    if (soumis > 0) {
      items.push({
        title: `Traiter ${soumis} dossier(s) au statut soumis`,
        meta: 'Immatriculations',
        tone: 'brand',
        nav: 'work',
      });
    }
    if (this.getEnCoursCount() > 0) {
      items.push({
        title: `${this.getEnCoursCount()} dossier(s) en vérification`,
        meta: 'Immatriculations',
        tone: 'warning',
        nav: 'work',
      });
    }
    if (this.demandeInformationStats.nonTraitees > 0) {
      items.push({
        title: `Répondre à ${this.demandeInformationStats.nonTraitees} demande(s) d'information`,
        meta: 'Demandes d\'information',
        tone: 'warning',
        nav: 'demande-information',
      });
    }
    if (this.agentReclamationStats.etatEnCours > 0) {
      items.push({
        title: `Suivre ${this.agentReclamationStats.etatEnCours} réclamation(s) en cours`,
        meta: 'Réclamations',
        tone: 'brand',
        nav: 'reclamation',
      });
    }
    if ((this.publicationStats.pending || 0) > 0) {
      items.push({
        title: `Modérer ${this.publicationStats.pending} publication(s) en attente`,
        meta: 'Publications',
        tone: 'neutral',
        nav: 'publications',
      });
    }
    this.overviewTaskItems = items.length
      ? items.slice(0, 6)
      : [
          {
            title: 'Aucune priorité détectée',
            meta: 'Consultez les modules pour le détail',
            tone: 'success',
            nav: 'work',
          },
        ];
  }

  private loadOverviewRecentOpsMerged(): void {
    const immRows = this.mapImmatriculationsToRecentOps(this.immatriculations);
    forkJoin({
      demandes: this.http
        .get<any>(`${environment.apiUrl}/demande-information/all`, {
          params: new HttpParams().set('page', '0').set('size', '8'),
        })
        .pipe(catchError(() => of({ items: [] }))),
      reclams: this.http
        .get<any>(`${environment.apiUrl}/reclamation/all`, {
          params: new HttpParams()
            .set('page', '0')
            .set('size', '8')
            .set('statut', 'SOUMIS')
            .set('sort', 'dateSoumission')
            .set('direction', 'DESC'),
        })
        .pipe(catchError(() => of({ content: [] }))),
      pubs: this.publicationService
        .getPublications({ page: 0, limit: 8 })
        .pipe(catchError(() => of({ data: [] }))),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ demandes, reclams, pubs }) => {
        const diItems = this.mapDemandeInformationItems(demandes?.items || []);
        const diRows: RecentOp[] = diItems.map((it) => ({
          ref: `DI-${it.id}`,
          subject: (it.nomComplet || it.email || '—').trim(),
          kind: "Demande d'information",
          status: it.traitementStatus === 'TRAITE' ? 'Traitée' : 'Non traitée',
          statusKey: it.traitementStatus === 'TRAITE' ? 'done' : 'open',
          updatedAt: this.formatOverviewRelativeTime(it.dateCreation),
          sortDate: it.dateCreation,
          module: 'demande-information',
          linkId: it.id,
        }));

        const recContent = Array.isArray(reclams?.content) ? reclams.content : [];
        const recRows: RecentOp[] = recContent.map((raw: any) => {
          const row = this.normalizeAgentReclamationRow(raw);
          const etat = row.etatReclamation || '';
          return {
            ref: row.reference || `REC-${row.id}`,
            subject: (row.nomUser || row.emailUser || '—').trim(),
            kind: 'Réclamation',
            status: this.formatAgentReclamationEtat(etat) || this.formatAgentReclamationStatut(row.statut),
            statusKey: this.mapReclamationEtatToStatusKey(etat, row.statut),
            updatedAt: this.formatOverviewRelativeTime(row.dateSoumission || row.dateCreation),
            sortDate: row.dateSoumission || row.dateCreation,
            module: 'reclamation',
            linkId: row.id,
          };
        });

        const pubData = Array.isArray(pubs?.data) ? pubs.data : [];
        const pubRows: RecentOp[] = pubData.map((p: any) => {
          const st = `${p?.status || ''}`.toUpperCase();
          return {
            ref: `PUB-${p?.id ?? ''}`,
            subject: String(p?.title || p?.titre || '—').slice(0, 120),
            kind: 'Publication',
            status: this.formatPublicationStatusFr(st),
            statusKey: this.mapPublicationStatusToKey(st),
            updatedAt: this.formatOverviewRelativeTime(p?.updated_at || p?.updatedAt || p?.created_at || p?.createdAt),
            sortDate: p?.updated_at || p?.updatedAt || p?.created_at || p?.createdAt,
            module: 'publication',
            linkId: p?.id != null ? Number(p.id) : undefined,
          };
        });

        const merged = [...immRows, ...diRows, ...recRows, ...pubRows];
        merged.sort((a, b) => this.parseOverviewOpSortTime(b) - this.parseOverviewOpSortTime(a));
        this.overviewRecentOps = merged.slice(0, 5);
        this.refreshOverviewWidgets();
        this.cdr.markForCheck();
      });
  }

  private mapImmatriculationsToRecentOps(list: any[]): RecentOp[] {
    return (Array.isArray(list) ? list : []).map((imm) => {
      const isMorale = `${imm?.typeContribuable || ''}`.toUpperCase() === 'MORALE';
      const subj = isMorale
        ? (imm?.raisonSociale || imm?.email || '—')
        : `${imm?.prenom || ''} ${imm?.nom || ''}`.trim() || imm?.email || '—';
      const stat = `${imm?.status || ''}`.toUpperCase();
      const sortDate = imm?.dateSoumission || imm?.dateCreation;
      return {
        ref: imm?.dossierNumber || (imm?.id != null ? `IMM-${imm.id}` : '—'),
        subject: subj,
        kind: 'Immatriculation',
        status: this.formatImmStatusFr(stat),
        statusKey: this.mapImmStatusToKey(stat),
        updatedAt: this.formatOverviewRelativeTime(sortDate),
        sortDate,
        module: 'immatriculation',
        linkId: imm?.id != null ? Number(imm.id) : undefined,
      };
    });
  }

  private formatImmStatusFr(status: string): string {
    const map: Record<string, string> = {
      EN_COURS_VERIFICATION: 'En vérification',
      SOUMIS: 'Soumis',
      VALIDE: 'Validé',
      REJETE: 'Rejeté',
      BROUILLON: 'Brouillon',
    };
    return map[status] || status || '—';
  }

  private mapImmStatusToKey(status: string): StatusKey {
    if (status === 'VALIDE') {
      return 'done';
    }
    if (status === 'REJETE') {
      return 'blocked';
    }
    if (status === 'EN_COURS_VERIFICATION') {
      return 'in_review';
    }
    return 'open';
  }

  private formatPublicationStatusFr(status: string): string {
    const map: Record<string, string> = {
      DRAFT: 'Brouillon',
      PENDING: 'En attente',
      VALIDATED: 'Validée',
      PUBLISHED: 'Publiée',
      SCHEDULED: 'Planifiée',
      REJECTED: 'Rejetée',
      ARCHIVED: 'Archivée',
      DELETED: 'Supprimée',
    };
    return map[status] || status || '—';
  }

  private mapPublicationStatusToKey(status: string): StatusKey {
    if (status === 'PUBLISHED' || status === 'ARCHIVED') {
      return 'done';
    }
    if (status === 'REJECTED' || status === 'DELETED') {
      return 'blocked';
    }
    if (status === 'PENDING' || status === 'VALIDATED' || status === 'SCHEDULED') {
      return 'in_review';
    }
    return 'open';
  }

  private mapReclamationEtatToStatusKey(etat: string, statut: string): StatusKey {
    const e = `${etat || ''}`.toUpperCase();
    if (e === 'TRAITE') {
      return 'done';
    }
    if (e === 'EN_COURS') {
      return 'in_review';
    }
    return this.getAgentReclamationStatusKey(`${statut || ''}`.toUpperCase());
  }

  private parseOverviewOpSortTime(row: RecentOp): number {
    if (row.sortDate) {
      const t = new Date(row.sortDate).getTime();
      return Number.isNaN(t) ? 0 : t;
    }
    return 0;
  }

  private formatOverviewRelativeTime(iso?: string): string {
    if (!iso) {
      return '—';
    }
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return '—';
    }
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) {
      return "À l'instant";
    }
    if (diffMin < 60) {
      return `Il y a ${diffMin} min`;
    }
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) {
      return diffH <= 1 ? 'Il y a 1 h' : `Il y a ${diffH} h`;
    }
    const diffDays = Math.floor(diffH / 24);
    if (diffDays < 7) {
      return diffDays === 1 ? 'Hier' : `Il y a ${diffDays} j`;
    }
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
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
    } else if (key === 'demande-information') {
      this.currentView = 'demande-information';
      this.demandeInfoMainPage = 0;
      this.loadDemandesInformation();
    } else if (key === 'reclamation') {
      this.currentView = 'reclamation';
      this.agentReclamationPage = 0;
      this.loadAgentReclamationStats();
      this.loadAgentReclamations();
    } else if (key === 'publications') {
      this.currentView = 'publications';
      this.loadPublicationStats();
    } else if (key === 'documents') {
      this.currentView = 'documents';
      this.downloadDocumentCatalog.loadAll().subscribe({
        next: () => this.cdr.markForCheck(),
        error: () => this.cdr.markForCheck(),
      });
    } else if (key === 'settings') {
      this.currentView = 'profile';
    } else if (key === 'logout') {
      this.logout();
    } else {
      this.currentView = 'overview';
      this.loadDemandeInformationStats();
      this.loadAgentReclamationStats();
      this.loadPublicationStats();
      if (this.immatriculations.length > 0) {
        this.loadOverviewRecentOpsMerged();
      } else {
        this.loadImmatriculations();
      }
    }
  }

  private loadPublicationStats(): void {
    this.publicationService.getPublications({ page: 0, limit: 200 }).subscribe({
      next: (response) => {
        const publications = Array.isArray(response?.data) ? response.data : [];
        const statsFromApi = response?.stats;

        if (statsFromApi) {
          this.publicationStats = {
            total: statsFromApi.total || response?.pagination?.total_items || publications.length || 0,
            published: statsFromApi.published || 0,
            draft: statsFromApi.draft || 0,
            pending: statsFromApi.pending || 0,
            rejected: statsFromApi.rejected || 0,
            archived: statsFromApi.archived || 0,
            total_views: statsFromApi.total_views || 0,
            total_likes: statsFromApi.total_likes || 0,
            total_dislikes: statsFromApi.total_dislikes || 0,
            total_favorites: statsFromApi.total_favorites || 0,
            total_reports: statsFromApi.total_reports || 0
          };
          this.refreshOverviewWidgets();
          this.cdr.markForCheck();
          return;
        }

        this.publicationStats = {
          total: response?.pagination?.total_items || publications.length || 0,
          published: publications.filter((p: any) => `${p?.status || ''}`.toUpperCase() === 'PUBLISHED').length,
          draft: publications.filter((p: any) => `${p?.status || ''}`.toUpperCase() === 'DRAFT').length,
          pending: publications.filter((p: any) => `${p?.status || ''}`.toUpperCase() === 'PENDING').length,
          rejected: publications.filter((p: any) => `${p?.status || ''}`.toUpperCase() === 'REJECTED').length,
          archived: publications.filter((p: any) => `${p?.status || ''}`.toUpperCase() === 'ARCHIVED').length,
          total_views: publications.reduce((sum: number, p: any) => sum + (Number(p?.views_count) || 0), 0),
          total_likes: publications.reduce((sum: number, p: any) => sum + (Number(p?.likes_count) || 0), 0),
          total_dislikes: publications.reduce((sum: number, p: any) => sum + (Number(p?.dislikes_count) || 0), 0),
          total_favorites: publications.reduce((sum: number, p: any) => sum + (Number(p?.favorites_count) || 0), 0),
          total_reports: publications.reduce((sum: number, p: any) => sum + (Number(p?.reports_count) || 0), 0)
        };
        this.refreshOverviewWidgets();
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des statistiques des publications:', error);
        this.refreshOverviewWidgets();
      }
    });
  }

  toggleNotificationsPanel(): void {
    this.showNotificationsPanel = !this.showNotificationsPanel;
    if (this.showNotificationsPanel) {
      this.refreshNotifications();
    }
  }

  openNotification(item: AdminNotificationItem): void {
    if (!item) {
      return;
    }

    const goToTarget = () => {
      const eventType = `${item.eventType || ''}`.toUpperCase();
      this.showNotificationsPanel = false;
      if (eventType.includes('IMMATRICULATION')) {
        this.pendingImmatriculationIdToOpen = item.publicationId ? Number(item.publicationId) : null;
        this.setActiveNav('work');
        return;
      }
      if (eventType.includes('DEMANDE_INFORMATION')) {
        this.pendingDemandeInformationIdToOpen = item.publicationId ? Number(item.publicationId) : null;
        this.setActiveNav('demande-information');
        return;
      }
      if (eventType.includes('RECLAMATION')) {
        this.pendingReclamationIdToOpen = this.resolveReclamationIdFromNotification(item);
        this.agentReclamationSearchTerm = '';
        this.agentReclamationEtatFilter = 'all';
        this.agentReclamationUrgenceFilter = 'all';
        this.setActiveNav('reclamation');
        return;
      }
      if (eventType.includes('PUBLICATION') || eventType.includes('COMMENT')) {
        const publicationId = item.publicationId ? Number(item.publicationId) : null;
        this.pendingPublicationIdToOpen = null;
        this.setActiveNav('publications');
        if (publicationId) {
          setTimeout(() => {
            this.pendingPublicationIdToOpen = publicationId;
          }, 0);
        }
      }
    };

    if (item.isRead) {
      goToTarget();
      return;
    }

    this.notificationService.markAsRead(item.id).subscribe({
      next: () => {
        item.isRead = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
        goToTarget();
      },
      error: () => {
        goToTarget();
      }
    });
  }

  deleteNotification(item: AdminNotificationItem, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const nativeEvent = event as any;
    if (typeof nativeEvent.stopImmediatePropagation === 'function') {
      nativeEvent.stopImmediatePropagation();
    }
    if (!item?.id || this.deletingNotificationId) {
      return;
    }
    this.deletingNotificationId = item.id;
    this.notificationService.deleteNotification(item.id).subscribe({
      next: () => {
        const wasUnread = !item.isRead;
        this.notifications = this.notifications.filter((notif) => notif.id !== item.id);
        if (wasUnread) {
          this.unreadCount = Math.max(0, this.unreadCount - 1);
        }
        this.deletingNotificationId = null;
        this.refreshNotifications();
      },
      error: () => {
        this.deletingNotificationId = null;
        this.showNotification('Impossible de supprimer cette notification.', 'error');
      }
    });
  }

  get dashboardNotifications(): AdminNotificationItem[] {
    const filtered = this.notifications.filter((item) => {
      const eventType = `${item?.eventType || ''}`.toUpperCase();
      return eventType.includes('IMMATRICULATION')
        || eventType.includes('PUBLICATION')
        || eventType.includes('COMMENT')
        || eventType.includes('DEMANDE_INFORMATION')
        || eventType.includes('RECLAMATION');
    });
    return filtered.length > 0 ? filtered : this.notifications;
  }

  get publicationNotifications(): AdminNotificationItem[] {
    return this.dashboardNotifications.filter((item) => {
      const eventType = `${item?.eventType || ''}`.toUpperCase();
      return eventType.includes('PUBLICATION') && !eventType.includes('COMMENT');
    });
  }

  get commentNotifications(): AdminNotificationItem[] {
    return this.dashboardNotifications.filter((item) => {
      const eventType = `${item?.eventType || ''}`.toUpperCase();
      return eventType.includes('COMMENT');
    });
  }

  get immatriculationNotifications(): AdminNotificationItem[] {
    return this.dashboardNotifications.filter((item) => {
      const eventType = `${item?.eventType || ''}`.toUpperCase();
      return eventType.includes('IMMATRICULATION');
    });
  }

  get demandeInformationNotifications(): AdminNotificationItem[] {
    return this.dashboardNotifications.filter((item) => {
      const eventType = `${item?.eventType || ''}`.toUpperCase();
      return eventType.includes('DEMANDE_INFORMATION');
    });
  }

  get reclamationNotifications(): AdminNotificationItem[] {
    return this.dashboardNotifications.filter((item) => {
      const eventType = `${item?.eventType || ''}`.toUpperCase();
      return eventType.includes('RECLAMATION');
    });
  }

  get hasGroupedNotifications(): boolean {
    return (
      this.publicationNotifications.length > 0 ||
      this.commentNotifications.length > 0 ||
      this.immatriculationNotifications.length > 0 ||
      this.demandeInformationNotifications.length > 0 ||
      this.reclamationNotifications.length > 0
    );
  }

  trackByNotificationId(_index: number, item: AdminNotificationItem): number {
    return item.id;
  }

  isDeletingNotification(item: AdminNotificationItem): boolean {
    return this.deletingNotificationId === item.id;
  }

  private isNotificationVisibleInDashboard(item: AdminNotificationItem): boolean {
    const eventType = `${item?.eventType || ''}`.toUpperCase();
    return eventType.includes('IMMATRICULATION')
      || eventType.includes('PUBLICATION')
      || eventType.includes('COMMENT')
      || eventType.includes('DEMANDE_INFORMATION')
      || eventType.includes('RECLAMATION');
  }

  get fallbackNotifications(): AdminNotificationItem[] {
    return this.notifications.filter((item) => !this.isNotificationVisibleInDashboard(item));
  }

  formatNotificationDate(createdAt?: string): string {
    if (!createdAt) {
      return '';
    }
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Unifie les champs renvoyés par l'API (camelCase / snake_case, id numérique).
   */
  private normalizeAdminNotificationItem(raw: any): AdminNotificationItem {
    const publicationId = raw?.publicationId ?? raw?.publication_id;
    const reclamationId = raw?.reclamationId ?? raw?.reclamation_id;
    const read =
      raw?.isRead ??
      raw?.is_read ??
      raw?.read;
    return {
      id: Number(raw?.id),
      eventType: String(raw?.eventType ?? raw?.event_type ?? ''),
      title: String(raw?.title ?? ''),
      message: String(raw?.message ?? ''),
      publicationId: publicationId != null && publicationId !== '' ? Number(publicationId) : undefined,
      reclamationId: reclamationId != null && reclamationId !== '' ? Number(reclamationId) : undefined,
      isRead: read === true || read === 1 || read === 'true',
      createdAt: String(raw?.createdAt ?? raw?.created_at ?? ''),
    };
  }

  private resolveReclamationIdFromNotification(item: AdminNotificationItem): number | null {
    const fromField = item.reclamationId != null ? Number(item.reclamationId) : NaN;
    if (Number.isFinite(fromField)) {
      return fromField;
    }
    const anyItem = item as any;
    const snake = anyItem?.reclamation_id;
    if (snake != null && Number.isFinite(Number(snake))) {
      return Number(snake);
    }
    return null;
  }

  private refreshNotifications(): void {
    this.isLoadingNotifications = true;
    this.notificationService.getMyNotifications().subscribe({
      next: (items) => {
        const safeItems = Array.isArray(items) ? items : [];
        this.notifications = safeItems.map((raw) => this.normalizeAdminNotificationItem(raw));
        this.isLoadingNotifications = false;
      },
      error: () => {
        this.notifications = [];
        this.isLoadingNotifications = false;
      }
    });

    this.notificationService.getMyUnreadCount().subscribe({
      next: (res) => {
        this.unreadCount = Number(res?.count ?? 0);
      },
      error: () => {
        this.unreadCount = 0;
      }
    });
  }

  logout(): void {
    // Supprimer les informations de session du localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userName');
    
    // Afficher une notification de déconnexion
    this.showNotification('Vous avez été déconnecté avec succès', 'success');
    
    // Rediriger vers la page de connexion après un court délai
    setTimeout(() => {
      window.location.href = '/login';
    }, 1500);
  }

  private loadImmatriculations(): void {
    this.isLoadingImmatriculations = true;
    this.immatriculationService.getAllImmatriculations().subscribe({
      next: (data) => {
        const list = Array.isArray(data) ? data : [];
        console.log('Données reçues de l\'API:', list);
        console.log('Vérification des autresFiles:', list.map(imm => ({
          id: imm.id,
          dossierNumber: imm.dossierNumber,
          autresFiles: imm.autresFiles,
          autresFilesLength: imm.autresFiles?.length || 0
        })));
        this.immatriculations = list;
        this.applyFilter();
        this.tryOpenImmatriculationFromNotification();
        this.cdr.detectChanges(); // Forcer la mise à jour des KPI
        this.isLoadingImmatriculations = false;
        this.loadOverviewRecentOpsMerged();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des immatriculations:', error);
        this.isLoadingImmatriculations = false;
        this.immatriculations = [];
        this.filteredImmatriculations = [];
        this.loadOverviewRecentOpsMerged();
      }
    });
  }

  private loadDemandeInformationStats(): void {
    this.http.get<DemandeInformationStats>(`${environment.apiUrl}/demande-information/stats`).subscribe({
      next: (s) => {
        this.demandeInformationStats = {
          total: Number(s?.total) || 0,
          traitees: Number(s?.traitees) || 0,
          nonTraitees: Number(s?.nonTraitees) || 0,
          urgentes: Number(s?.urgentes) || 0,
        };
        this.refreshOverviewWidgets();
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erreur stats demandes information:', err);
        this.refreshOverviewWidgets();
      },
    });
  }

  private mapDemandeInformationItems(raw: any[]): DemandeInformationItem[] {
    return (Array.isArray(raw) ? raw : []).map((item: DemandeInformationItem) => ({
      ...item,
      traitementStatus: item.traitementStatus === 'TRAITE' ? 'TRAITE' : 'NON_TRAITE',
    }));
  }

  private buildDemandeInfoParams(page: number): HttpParams {
    let p = new HttpParams().set('page', String(page)).set('size', String(this.demandeInfoPageSize));
    const q = this.demandeInformationSearchTerm.trim();
    if (q) {
      p = p.set('search', q);
    }
    if (this.demandeInformationTraitementFilter !== 'all') {
      p = p.set('traitement', this.demandeInformationTraitementFilter);
    }
    if (this.demandeInformationUrgenceFilter !== 'all') {
      p = p.set('urgence', this.demandeInformationUrgenceFilter);
    }
    return p;
  }

  private applyDemandeInfoListResponse(response: any): void {
    const items = this.mapDemandeInformationItems(response?.items);
    const total = Number(response?.total) || 0;
    const totalPages = Number(response?.totalPages) || 0;
    const num = Number(response?.page);
    this.demandesInformationMain = items;
    this.demandeInfoMainTotalElements = total;
    this.demandeInfoMainTotalPages = totalPages;
    if (!Number.isNaN(num)) {
      this.demandeInfoMainPage = num;
    }
  }

  private loadDemandesInformation(): void {
    this.isLoadingDemandesInformation = true;
    this.loadDemandeInformationStats();
    const base = `${environment.apiUrl}/demande-information/all`;
    const resetOnError = () => {
      this.demandesInformationMain = [];
      this.demandeInfoMainTotalElements = 0;
      this.demandeInfoMainTotalPages = 0;
      this.isLoadingDemandesInformation = false;
    };

    this.http.get<any>(base, { params: this.buildDemandeInfoParams(this.demandeInfoMainPage) }).subscribe({
      next: (response) => {
        this.applyDemandeInfoListResponse(response);
        this.isLoadingDemandesInformation = false;
        this.tryOpenDemandeInformationFromNotification();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des demandes d\'information:', error);
        resetOnError();
        this.pendingDemandeInformationIdToOpen = null;
      },
    });
  }

  onDemandeInformationSearchInput(): void {
    this.demandeInformationSearchDebounce$.next(this.demandeInformationSearchTerm);
  }

  clearDemandeInformationSearch(): void {
    this.demandeInformationSearchTerm = '';
    this.demandeInfoMainPage = 0;
    this.demandeInformationSearchDebounce$.next('');
  }

  onDemandeInformationFilterChange(): void {
    this.demandeInfoMainPage = 0;
    this.loadDemandesInformation();
  }

  goToDemandeInfoMainPage(page: number): void {
    const last = Math.max(0, this.demandeInfoMainTotalPages - 1);
    const p = Math.max(0, Math.min(page, last));
    if (p === this.demandeInfoMainPage) {
      return;
    }
    this.demandeInfoMainPage = p;
    this.loadDemandesInformation();
  }

  demandeInfoMainPrevPage(): void {
    this.goToDemandeInfoMainPage(this.demandeInfoMainPage - 1);
  }

  demandeInfoMainNextPage(): void {
    this.goToDemandeInfoMainPage(this.demandeInfoMainPage + 1);
  }

  onDemandeInfoPageSizeChange(size: number | string): void {
    const n = typeof size === 'string' ? parseInt(size, 10) : Number(size);
    if (!Number.isFinite(n) || !this.demandeInfoPageSizeOptions.includes(n)) {
      return;
    }
    this.demandeInfoPageSize = n;
    this.demandeInfoMainPage = 0;
    this.loadDemandesInformation();
  }

  get demandeInfoMainPageDisplayFrom(): number {
    if (this.demandeInfoMainTotalElements === 0) {
      return 0;
    }
    return this.demandeInfoMainPage * this.demandeInfoPageSize + 1;
  }

  get demandeInfoMainPageDisplayTo(): number {
    return Math.min(
      (this.demandeInfoMainPage + 1) * this.demandeInfoPageSize,
      this.demandeInfoMainTotalElements
    );
  }

  private loadAgentReclamationStats(): void {
    this.reclamationService.getAgentReclamationStats('SOUMIS').subscribe({
        next: (s) => {
          this.agentReclamationStats = {
            totalSoumises: Number(s?.totalSoumises) || 0,
            etatEnCours: Number(s?.etatEnCours) || 0,
            etatTraite: Number(s?.etatTraite) || 0,
            prioriteHaute: Number(s?.prioriteHaute) || 0,
          };
          this.refreshOverviewWidgets();
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Erreur stats réclamations agent:', err);
          this.refreshOverviewWidgets();
        },
      });
  }

  private loadAgentReclamations(): void {
    this.isLoadingAgentReclamations = true;
    let params = new HttpParams()
      .set('page', String(this.agentReclamationPage))
      .set('size', String(this.agentReclamationPageSize))
      .set('statut', 'SOUMIS')
      .set('sort', this.agentReclamationSortField)
      .set('direction', this.agentReclamationSortDir);
    const q = this.agentReclamationSearchTerm.trim();
    if (q) {
      params = params.set('search', q);
    }
    if (this.agentReclamationEtatFilter !== 'all') {
      params = params.set('etat', this.agentReclamationEtatFilter);
    }
    if (this.agentReclamationUrgenceFilter !== 'all') {
      params = params.set('urgence', this.agentReclamationUrgenceFilter);
    }
    this.reclamationService.getAllReclamationsPaged(params).subscribe({
      next: (page) => {
        const content = Array.isArray(page?.content) ? page.content : [];
        this.agentReclamations = content.map((raw: any) => this.normalizeAgentReclamationRow(raw));
        this.agentReclamationTotalElements = Number(page?.totalElements) || 0;
        this.agentReclamationTotalPages = Number(page?.totalPages) || 0;
        const apiPage = Number(page?.number);
        if (!Number.isNaN(apiPage)) {
          this.agentReclamationPage = apiPage;
        }
        this.isLoadingAgentReclamations = false;
        this.cdr.detectChanges();
        queueMicrotask(() => {
          this.tryOpenReclamationFromNotification();
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('Erreur chargement réclamations agent:', err);
        this.agentReclamations = [];
        this.agentReclamationTotalElements = 0;
        this.agentReclamationTotalPages = 0;
        this.isLoadingAgentReclamations = false;
        this.pendingReclamationIdToOpen = null;
        this.showNotification('Impossible de charger les réclamations.', 'error');
      },
    });
  }

  private pickReclamationDtoValue(field: any): string {
    if (field == null) {
      return '';
    }
    if (typeof field === 'object' && field.value != null) {
      return String(field.value);
    }
    return String(field);
  }

  private pickReclamationDtoLabel(field: any): string {
    if (field == null) {
      return '';
    }
    if (typeof field === 'object') {
      if (field.label) {
        return String(field.label);
      }
      if (field.value != null) {
        return String(field.value);
      }
    }
    return String(field);
  }

  private normalizeAgentReclamationRow(raw: any): AgentReclamationRow {
    const statut = this.pickReclamationDtoValue(raw?.statut);
    const etatRaw =
      raw?.etatReclamation != null ? this.pickReclamationDtoValue(raw.etatReclamation) : null;
    const piecesRaw = raw?.piecesJointes;
    const piecesJointes: AgentReclamationPiece[] = Array.isArray(piecesRaw)
      ? piecesRaw.map((p: any) => ({
          nom: p?.nom != null ? String(p.nom) : undefined,
          taille: p?.taille != null ? Number(p.taille) : undefined,
          type: p?.type != null ? String(p.type) : undefined,
          url: p?.url != null ? String(p.url) : undefined,
        }))
      : [];

    return {
      id: Number(raw.id),
      reference: raw.reference,
      sujet: raw.sujet || '',
      description: raw.description,
      categorie: raw.categorie,
      typeDisplay: this.pickReclamationDtoLabel(raw?.type) || this.pickReclamationDtoValue(raw?.type),
      urgenceDisplay:
        this.pickReclamationDtoLabel(raw?.urgence) || this.pickReclamationDtoValue(raw?.urgence),
      urgenceCode: this.pickReclamationDtoValue(raw?.urgence),
      statut,
      etatReclamation: etatRaw || null,
      emailUser: raw.emailUser,
      nomUser: raw.nomUser,
      telephoneUser: raw.telephoneUser,
      dateCreation: raw.dateCreation,
      dateSoumission: raw.dateSoumission,
      piecesJointes,
    };
  }

  getAgentReclamationStatusKey(statut: string): StatusKey {
    switch (statut) {
      case 'RESOLU':
        return 'done';
      case 'REJETE':
        return 'blocked';
      case 'EN_COURS':
        return 'in_review';
      case 'SOUMIS':
        return 'open';
      default:
        return 'open';
    }
  }

  updateDemandeTraitementStatus(demande: DemandeInformationItem, status: 'TRAITE' | 'NON_TRAITE'): void {
    if (!demande?.id) {
      this.showNotification('Demande invalide.', 'error');
      return;
    }

    const previousStatus = demande.traitementStatus || 'NON_TRAITE';
    demande.traitementStatus = status;

    this.http
      .put<any>(`${environment.apiUrl}/demande-information/${demande.id}/traitement-status`, {
        traitementStatus: status,
      })
      .subscribe({
      next: (response) => {
        const savedStatus = response?.traitementStatus === 'TRAITE' ? 'TRAITE' : 'NON_TRAITE';
        demande.traitementStatus = savedStatus;
        this.showNotification(`Statut mis à jour: ${savedStatus === 'TRAITE' ? 'Traité' : 'Non traité'}.`, 'success');
        this.loadDemandesInformation();
      },
      error: (error) => {
        console.error('Erreur lors de la mise à jour du statut de traitement:', error);
        demande.traitementStatus = previousStatus;
        this.showNotification('Impossible de mettre à jour le statut de traitement.', 'error');
      }
    });
  }

  viewDemandeInformationDetails(demande: DemandeInformationItem): void {
    this.selectedDemandeInformation = demande;
    this.showDemandeInformationModal = true;
  }

  closeDemandeInformationModal(): void {
    this.showDemandeInformationModal = false;
    this.selectedDemandeInformation = null;
    this.closeReplyEmailModal();
  }

  replyToDemandeInformationByEmail(): void {
    if (!this.selectedDemandeInformation?.email) {
      this.showNotification('Adresse email introuvable pour cette demande.', 'error');
      return;
    }

    this.replyEmailFor = 'demande-information';
    this.replyEmailSubject = `Reponse a votre demande d'information - SmartTax`;
    this.replyEmailContent = '';
    this.showReplyEmailModal = true;
  }

  replyToAgentReclamationByEmail(): void {
    const rec = this.selectedAgentReclamation;
    if (!rec?.emailUser?.trim()) {
      this.showNotification('Adresse email introuvable pour ce contribuable.', 'error');
      return;
    }
    this.replyEmailFor = 'reclamation';
    const refPart = rec.reference ? ` (${rec.reference})` : '';
    this.replyEmailSubject = `Reponse a votre reclamation${refPart} - SmartTax`;
    this.replyEmailContent = '';
    this.showReplyEmailModal = true;
  }

  closeReplyEmailModal(): void {
    this.showReplyEmailModal = false;
    this.replyEmailFor = null;
    this.replyEmailSubject = '';
    this.replyEmailContent = '';
    this.isSendingReplyEmail = false;
  }

  sendReplyEmail(): void {
    let recipientEmail: string | undefined;
    if (this.replyEmailFor === 'reclamation') {
      recipientEmail = this.selectedAgentReclamation?.emailUser?.trim();
      if (!recipientEmail) {
        this.showNotification('Adresse email introuvable pour cette réclamation.', 'error');
        return;
      }
    } else if (this.replyEmailFor === 'demande-information') {
      recipientEmail = this.selectedDemandeInformation?.email?.trim();
      if (!recipientEmail) {
        this.showNotification('Adresse email introuvable pour cette demande.', 'error');
        return;
      }
    } else {
      this.showNotification('Contexte de réponse invalide.', 'error');
      return;
    }

    const subject = this.replyEmailSubject.trim();
    const body = this.replyEmailContent.trim();
    if (!subject || !body) {
      this.showNotification('Veuillez saisir le sujet et le contenu de l\'email.', 'warning');
      return;
    }

    this.isSendingReplyEmail = true;
    this.emailService.sendSimpleEmail(recipientEmail, subject, body).subscribe({
      next: (response) => {
        this.isSendingReplyEmail = false;
        if (response?.success || response?.emailSent) {
          this.showNotification('Email de réponse envoyé avec succès.', 'success');
          this.closeReplyEmailModal();
        } else {
          this.showNotification('Échec de l\'envoi de l\'email.', 'error');
        }
      },
      error: (error) => {
        this.isSendingReplyEmail = false;
        console.error('Erreur lors de l\'envoi de la réponse email:', error);
        this.showNotification('Erreur lors de l\'envoi de l\'email.', 'error');
      }
    });
  }

  deleteDemandeInformation(demande: DemandeInformationItem): void {
    if (!demande?.id) {
      this.showNotification('Demande invalide.', 'error');
      return;
    }

    const message = `Voulez-vous vraiment supprimer la demande de "${demande.nomComplet}" ?`;
    this.showConfirmation('Confirmation de suppression', message, () => {
      this.http.delete(`${environment.apiUrl}/demande-information/${demande.id}`).subscribe({
        next: () => {
          if (this.selectedDemandeInformation?.id === demande.id) {
            this.closeDemandeInformationModal();
          }
          this.showNotification('Demande d\'information supprimée avec succès.', 'success');
          this.loadDemandesInformation();
        },
        error: (error) => {
          console.error('Erreur lors de la suppression de la demande d\'information:', error);
          this.showNotification('Impossible de supprimer la demande d\'information.', 'error');
        }
      });
    });
  }

  private tryOpenImmatriculationFromNotification(): void {
    if (!this.pendingImmatriculationIdToOpen) {
      return;
    }
    const targetId = this.pendingImmatriculationIdToOpen;
    const found = this.immatriculations.find((item) => Number(item?.id) === targetId);
    if (found) {
      this.viewImmatriculationDetails(found);
      this.pendingImmatriculationIdToOpen = null;
      return;
    }
    this.immatriculationService.getImmatriculation(targetId).subscribe({
      next: (immatriculation: any) => {
        if (immatriculation) {
          this.viewImmatriculationDetails(immatriculation);
        }
        this.pendingImmatriculationIdToOpen = null;
      },
      error: () => {
        this.pendingImmatriculationIdToOpen = null;
      }
    });
  }

  private tryOpenDemandeInformationFromNotification(): void {
    if (!this.pendingDemandeInformationIdToOpen) {
      return;
    }
    const targetId = this.pendingDemandeInformationIdToOpen;
    const found = this.demandesInformationMain.find((item) => Number(item?.id) === targetId);
    if (found) {
      this.viewDemandeInformationDetails(found);
      this.pendingDemandeInformationIdToOpen = null;
      return;
    }
    this.http.get<DemandeInformationItem>(`${environment.apiUrl}/demande-information/${targetId}`).subscribe({
      next: (raw) => {
        if (raw?.id != null) {
          const item: DemandeInformationItem = {
            ...raw,
            traitementStatus: raw.traitementStatus === 'TRAITE' ? 'TRAITE' : 'NON_TRAITE',
          };
          this.viewDemandeInformationDetails(item);
        }
        this.pendingDemandeInformationIdToOpen = null;
      },
      error: () => {
        this.pendingDemandeInformationIdToOpen = null;
      },
    });
  }

  private tryOpenReclamationFromNotification(): void {
    const targetId = this.pendingReclamationIdToOpen;
    if (targetId == null || !Number.isFinite(targetId)) {
      return;
    }
    const found = this.agentReclamations.find((item) => Number(item?.id) === targetId);
    if (found) {
      this.viewAgentReclamationDetails(found);
      this.pendingReclamationIdToOpen = null;
      return;
    }
    this.http.get<any>(`${environment.apiUrl}/reclamation/${targetId}`).subscribe({
      next: (raw) => {
        if (raw?.id != null) {
          this.viewAgentReclamationDetails(this.normalizeAgentReclamationRow(raw));
        }
        this.pendingReclamationIdToOpen = null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.pendingReclamationIdToOpen = null;
        this.cdr.detectChanges();
      },
    });
  }

  private resolveCurrentAgentId(): number | null {
    const localUserId = localStorage.getItem('userId');
    if (localUserId && !Number.isNaN(Number(localUserId))) {
      return Number(localUserId);
    }

    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      try {
        const parsed = JSON.parse(userInfo);
        const idCandidate = parsed?.idUtilisateur ?? parsed?.id ?? parsed?.userId;
        if (idCandidate != null && !Number.isNaN(Number(idCandidate))) {
          return Number(idCandidate);
        }
      } catch {
        // ignore invalid JSON
      }
    }

    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const idCandidate = payload?.idUtilisateur ?? payload?.id ?? payload?.userId;
        if (idCandidate != null && !Number.isNaN(Number(idCandidate))) {
          return Number(idCandidate);
        }
      } catch {
        // ignore invalid token payload
      }
    }
    return null;
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

  getTinDisplayValue(immatriculation: any): string {
    const matriculeFiscal = `${immatriculation?.matriculeFiscal || immatriculation?.matriculeFiscalExistant || ''}`.trim();
    const dossierNumber = `${immatriculation?.dossierNumber || ''}`.trim();
    const status = `${immatriculation?.status || ''}`.toUpperCase();

    // Après validation, on affiche uniquement le TIN fiscal final.
    if (status === 'VALIDE') {
      return matriculeFiscal || 'TIN en attente';
    }

    // Avant validation, on garde le numéro de dossier.
    return dossierNumber || matriculeFiscal || `${immatriculation?.id || 'N/A'}`;
  }

  formatDate(dateInput: string | Date | undefined | null): string {
    if (dateInput == null) return 'N/A';
    try {
      const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
      if (Number.isNaN(date.getTime())) return 'N/A';
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
        
        // Envoyer un email de rejet au contribuable
        this.sendRejectionEmail(response);
        
        // Mettre à jour le statut dans la liste locale de manière immédiate
        console.log('🔍 Recherche de l\'immatriculation dans la liste:', this.selectedImmatriculation.id);
        console.log('📋 Liste actuelle:', this.immatriculations.map(i => ({ id: i.id, status: i.status })));
        
        const index = this.immatriculations.findIndex(i => i.id === this.selectedImmatriculation.id);
        console.log('📍 Index trouvé:', index);
        
        if (index !== -1) {
          console.log('🔄 Mise à jour de l\'immatriculation à l\'index:', index);
          console.log('✅ Ancien statut:', this.immatriculations[index].status);
          console.log('🆕 Nouveau statut:', response.status);
          
          // Créer une nouvelle copie pour forcer la détection de changement
          const updatedList = [...this.immatriculations];
          updatedList[index] = { ...response }; // Copie profonde pour forcer le changement
          this.immatriculations = updatedList;
          
          console.log('📋 Liste après mise à jour:', this.immatriculations.map(i => ({ id: i.id, status: i.status })));
          
          // Forcer la détection de changement avec setTimeout
          setTimeout(() => {
            this.immatriculations = [...this.immatriculations];
            console.log('⚡ Forçage de la détection de changement effectué');
          }, 0);
          
          // Appliquer le filtre pour forcer le rafraîchissement (comme dans la validation)
          this.applyFilter();
        } else {
          console.error('❌ Immatriculation non trouvée dans la liste locale');
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

  sendRejectionEmail(immatriculation: any): void {
    if (!immatriculation.email) {
      console.log('⚠️ Aucune adresse email disponible pour le contribuable');
      return;
    }

    this.emailService.sendRejectionEmail(
      immatriculation.email,
      this.rejectReason,
      immatriculation.dossierNumber || 'N/A'
    ).subscribe({
      next: (response) => {
        console.log('✅ Email de rejet envoyé avec succès:', response);
        this.showNotification('Un email de notification a été envoyé au contribuable.', 'success');
      },
      error: (error) => {
        console.error('❌ Erreur lors de l\'envoi de l\'email de rejet:', error);
        this.showNotification('L\'email de notification n\'a pas pu être envoyé.', 'warning');
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

  openDocumentsLibraryStats(): void {
    this.documentsLibraryStatsOpen = true;
    this.documentsLibraryStatsLoading = true;
    this.documentsLibraryStatsError = null;
    this.documentsLibraryStatsRows = [];
    this.downloadDocumentCatalog.loadAll().subscribe({
      next: () => {
        this.documentsLibraryStatsRows = [...this.downloadDocumentCatalog.snapshot()].sort(
          (a, b) => (b.downloadCount ?? 0) - (a.downloadCount ?? 0)
        );
        this.documentsLibraryStatsLoading = false;
      },
      error: () => {
        this.documentsLibraryStatsError =
          'Impossible de charger les statistiques. Vérifiez que le serveur est disponible.';
        this.documentsLibraryStatsLoading = false;
      },
    });
  }

  closeDocumentsLibraryStats(): void {
    this.documentsLibraryStatsOpen = false;
  }

  topDocumentsLibraryByDownloadCount(max = 8): AgentDownloadDocument[] {
    return this.documentsLibraryStatsRows.filter((d) => (d.downloadCount ?? 0) > 0).slice(0, max);
  }

  documentsLibraryCategoryLabel(catId: string): string {
    return this.downloadDocumentCatalog.categories.find((c) => c.id === catId)?.name ?? catId;
  }

  documentsLibraryDisplayFileLabel(doc: AgentDownloadDocument): string {
    if (doc.originalFileName?.trim()) {
      return doc.originalFileName.trim();
    }
    if (doc.downloadUrl?.trim()) {
      try {
        const u = new URL(doc.downloadUrl.trim(), window.location.origin);
        if (/\/api\/download-documents\/\d+\/file$/.test(u.pathname)) {
          return 'Fichier PDF (serveur)';
        }
        return 'Lien externe';
      } catch {
        return 'Lien externe';
      }
    }
    return '—';
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

  private downloadCategoryIconClass(icon: 'file' | 'book' | 'gavel' | 'copy'): string {
    switch (icon) {
      case 'book':
        return 'fa-solid fa-book';
      case 'gavel':
        return 'fa-solid fa-scale-balanced';
      case 'copy':
        return 'fa-solid fa-clone';
      default:
        return 'fa-solid fa-file-lines';
    }
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
