import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ImmatriculationService } from '../../services/immatriculation.service';
import { TrashService } from '../../services/trash.service';
import { EmailService } from '../../services/email/email.service';
import { PublicationService } from '../../services/publication.service';
import { Immatriculation } from '../../models/immatriculation.model';
import jsPDF from 'jspdf';
import * as QRCode from 'qrcode';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';

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
  selector: 'app-publications-fiscales',
  templateUrl: './publications-fiscales.component.html',
  styleUrls: ['./publications-fiscales.component.css']
})
export class PublicationsFiscalesComponent implements OnInit {

   userName = 'Agent';
  
    greeting = getGreeting();
  
    sidebarOpen = false;
  
    activeNavKey: string = 'overview';
  
    currentView: string = 'overview'; // 'overview', 'dossiers', or 'profile'
  
    activityRange: '7d' | '30d' = '7d';
  
    theme: 'dark' | 'light' = getInitialTheme();

    // Propriétés pour les publications
    publications: any[] = [
    ];
    filteredPublications: any[] = [];
    tempUserId: string = ''; // Pour stocker temporairement l'ID utilisateur
    isLoadingTags = false;
    isCorrectingContent = false;
    isSavingDraft = false;
    loading = false;
    showCreatePublicationModal = false;
    isCreatingPublication = false;
    newPublicationForm = {
      title: '',
      summary: '',
      content: '',
      language: 'fr',
      image_url: '',
      is_pinned: false,
      schedule_type: 'now',
      scheduled_at: ''
    };
    
    // Propriétés séparées pour CKEditor (HTML) et affichage (texte brut)
    ckEditorTitle = '';
    ckEditorContent = '';
    
    // Propriété pour le fichier image
    selectedImageFile: File | null = null;
    
    publicationTagInput = '';
    publicationTags: string[] = [];
    
    // Tags existants pour réutilisation
    existingTags: string[] = [];
    showExistingTags = false;
    
    // Pagination
    currentPage = 0;
    itemsPerPage = 10;
    totalItems = 0;
    totalPages = 0;
    paginationInfo: any = null;
    
    // Modal de détails de publication
    showPublicationDetailsModal = false;
    selectedPublicationForDetails: any = null;
    
    // Modal de modification de publication
    showEditPublicationModal = false;
    selectedPublicationForEdit: any = null;
    showDeletePublicationModal = false;
    selectedPublicationForDelete: any = null;
    editPublicationForm = {
      title: '',
      content: '',
      summary: '',
      imageUrl: '',
      language: 'fr',
      tags: [] as string[]
    };
    isEditingPublication = false;
    
    // Gestion de l'image pour la modification
    editImagePreview: string | null = null;
    selectedEditImageFile: File | null = null;
    isUploadingEditImage = false;
  
  // Image par défaut en base64
  readonly defaultImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMzAgMTUwQzEzMCAxNjUuNSAxNDIuNSAxODAgMTU4IDE4MEgyNDJDMjU3LjUgMTgwIDI3MCAxNjUuNSAyNzAgMTUwQzI3MCAxMzQuNSAyNTcuNSAxMjAgMjQyIDEyMEgxNThDMTQyLjUgMTIwIDEzMCAxMzQuNSAxMzAgMTUwWiIgZmlsbD0iI0Q5RDlEOSIvPgo8Y2lyY2xlIGN4PSIxNTAiIGN5PSIxNTAiIHI9IjIwIiBmaWxsPSIjRjNGNEY2IiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIvPgo8Y2lyY2xlIGN4PSIyNTAiIGN5PSIxNTAiIHI9IjIwIiBmaWxsPSIjRjNGNEY2IiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIvPgo8cGF0aCBkPSJNMTUwIDE2MUMxNTUuNSAxNjEgMTYxIDE1NS41IDE2MSAxNTBDMTYxIDE0NC41IDE1NS41IDEzOSAxNTAgMTM5QzE0NC41IDEzOSAxMzkgMTQ0LjUgMTM5IDE1MEMxMzkgMTU1LjUgMTQ0LjUgMTYxIDE1MCAxNjFaIiBmaWxsPSIjOUM0QUYzIi8+CjxwYXRoIGQ9Ik0yNTAgMTYxQzI1NS41IDE2MSAyNjEgMTU1LjUgMjYxIDE1MEMyNjEgMTQ0LjUgMjU1LjUgMTM5IDI1MCAxMzVDMjQ0LjUgMTM5IDIzOSAxNDQuNSAyMzkgMTUwQzIzOSAxNTUuNSAyNDQuNSAxNjEgMjUwIDE2MVoiIGZpbGw9IiM5QzRBQjMiLz4KPHRleHQgeD0iMjAwIiB5PSIyMzAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzlDNEFDMiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+SW1hZ2Ugbm9uIGRpc3BvbmlibGU8L3RleHQ+Cjwvc3ZnPgo=';
  
  // Getter pour déboguer l'état de l'image
  get debugImageState() {
    return {
      editImagePreview: this.editImagePreview,
      formImageUrl: this.editPublicationForm.imageUrl,
      hasImage: !!(this.editImagePreview || this.editPublicationForm.imageUrl),
      showModal: this.showEditPublicationModal
    };
  }
  
    public Editor: any = ClassicEditor;
    public titleEditorConfig: any = {
      placeholder: 'Enter publication title here...',
      toolbar: {
        items: [
          'bold', 'italic', 'underline', 'strikethrough', '|',
          'link', '|', 
          'undo', 'redo'
        ],
        shouldNotGroupWhenFull: true
      }
    };
    public contentEditorConfig: any = {
      placeholder: 'Enter publication content here...',
      toolbar: {
        items: [
          'heading', '|',
          'bold', 'italic', 'underline', 'strikethrough', '|',
          'link', '|', 
          'bulletedList', 'numberedList', '|',
          'undo', 'redo'
        ],
        shouldNotGroupWhenFull: true
      }
    };
  
    constructor(
      private http: HttpClient,
      private cdr: ChangeDetectorRef,
      private immatriculationService: ImmatriculationService,
      private trashService: TrashService,
      private emailService: EmailService,
      private publicationService: PublicationService
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
    activeFilter: 'all' | 'my' = 'all';
    
    // Sorting properties
    sortBy: 'date' | 'status' | 'none' = 'none';
    sortOrder: 'recent' | 'ancient' = 'recent';
    
    // Status filter
    statusFilter: string = 'all';
    
    // Search properties
    searchTerm: string = '';
    
    // Méthode pour extraire le nom de l'auteur depuis le DTO
    getAuthorName(publication: any): string {
      // Priorité au champ createdByName du DTO
      if (publication.createdByName) {
        return publication.createdByName;
      }
      
      // Fallback si createdByName n'existe pas (ancien format)
      if (publication.createdBy) {
        // Si createdBy est un objet avec firstName/lastName
        if (publication.createdBy.firstName && publication.createdBy.lastName) {
          return `${publication.createdBy.firstName} ${publication.createdBy.lastName}`;
        }
        // Si createdBy est un objet avec name
        if (publication.createdBy.name) {
          return publication.createdBy.name;
        }
        // Si createdBy est un objet avec email
        if (publication.createdBy.email) {
          return publication.createdBy.email.split('@')[0]; // Prend la partie avant @
        }
      }
      return 'Non spécifié';
    }

    // Méthode pour corriger les URLs des images
    getImageUrl(url: string): string {
      if (!url) return '';
      
      // Si l'URL est déjà complète (commence par http), la retourner telle quelle
      if (url.startsWith('http')) {
        return url;
      }
      
      // Si l'URL commence par 'uploads/publications/', ajouter l'URL du serveur
      if (url.startsWith('uploads/publications/')) {
        return `http://localhost:8080/${url}`;
      }
      
      // Si l'URL commence par '/assets/', ajouter l'URL du serveur
      if (url.startsWith('/assets/')) {
        return `http://localhost:8080${url}`;
      }
      
      // Si l'URL commence par 'assets/', ajouter l'URL du serveur avec /
      if (url.startsWith('assets/')) {
        return `http://localhost:8080/${url}`;
      }
      
      // Sinon, retourner l'URL telle quelle
      return url;
    }

    // Méthode pour gérer les erreurs de chargement d'images
    onImageError(event: any): void {
      console.log('ð Erreur de chargement d\'image, utilisation de l\'image par défaut');
      console.log('ð URL qui a échoué:', event.target.src);
      // Remplacer l'image par une image par défaut en base64
      event.target.src = this.defaultImage;
      
      // L'image par défaut en base64 ne devrait jamais échouer, mais au cas où
      event.target.onerror = () => {
        console.log('ð Erreur de chargement de l\'image par défaut, masquage de l\'image');
        event.target.style.display = 'none';
        const parent = event.target.parentElement;
        if (parent && parent.classList.contains('da__imagePreview')) {
          parent.style.display = 'none';
        }
      };
    }
    
    // Méthode pour déboguer getImageUrl dans la modal de modification
    debugImageUrl(url: string): void {
      const processedUrl = this.getImageUrl(url);
      console.log('ð URL originale:', url);
      console.log('ð URL traitée par getImageUrl():', processedUrl);
      console.log('ð URL commence par uploads/publications/?', url.startsWith('uploads/publications/'));
    }

    // Méthode pour récupérer l'email de l'utilisateur connecté
    getCurrentUserEmail(): string {
      try {
        // Essayer directement la clé email (vu dans les logs)
        const email = localStorage.getItem('email');
        if (email && email !== 'undefined' && email !== 'null') {
          console.log('ð Email trouvé dans localStorage (clé email):', email);
          return email;
        }
        
        // Essayer la clé userEmail
        const userEmail = localStorage.getItem('userEmail');
        if (userEmail && userEmail !== 'undefined' && userEmail !== 'null') {
          console.log('ð Email trouvé dans localStorage (clé userEmail):', userEmail);
          return userEmail;
        }
        
        // Vérifier userInfo
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
          const user = JSON.parse(userInfo);
          console.log('ð userInfo trouvé:', user);
          if (user.email && user.email !== 'undefined' && user.email !== 'null') {
            console.log('ð Email trouvé dans userInfo:', user.email);
            return user.email;
          }
        }
        
        // Si aucun email trouvé, essayer de le récupérer depuis le backend
        this.fetchCurrentUserEmail();
        
        return '';
      } catch (error) {
        return '';
      }
    }

    // Méthode pour récupérer l'email depuis le backend
    private fetchCurrentUserEmail(): void {
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }

      // Appeler un endpoint pour récupérer l'utilisateur courant
      // Pour l'instant, nous allons utiliser une approche simple: vérifier s'il y a un userId
      const userId = localStorage.getItem('userId');
      if (userId) {
        // Stocker temporairement pour le filtrage
        this.tempUserId = userId;
      }
    }

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
      this.loadPublications();
    }
  
    private loadPublications(): void {
      
      
      // Utiliser la pagination avec 10 items par page
      const filters = {
        page: this.currentPage,
        size: this.itemsPerPage,
        sortBy: 'createdAt',
        sortDir: 'desc'
      };
      
      console.log('ð Filtres de pagination:', filters);
      
      this.publicationService.getPublications(filters).subscribe({
        next: (response) => {
     
          
          // Afficher les informations de pagination
          if (response.pagination) {
      
            
            // Mettre à jour les propriétés de pagination
            this.paginationInfo = response.pagination;
            this.currentPage = response.pagination.current_page;
            this.totalItems = response.pagination.total_items;
            this.totalPages = response.pagination.total_pages;
            this.itemsPerPage = response.pagination.items_per_page;
          }
          
          this.publications = response.data || [];
          this.filteredPublications = [...this.publications]; // Initialiser filteredPublications
          console.log('✅ Publications chargées depuis la BDD:', this.publications);
          console.log('📏 Nombre final de publications:', this.publications.length);
          console.log('📋 Publications après mise à jour:', this.publications.map(p => ({ id: p.id, title: p.title, author: p.createdBy })));
        },
        error: (error) => {
          console.error('❌ Erreur lors du chargement des publications:', error);
          console.error('📊 Status:', error.status);
          console.error('📝 Message:', error.message);
          console.error('📋 Erreur complète:', error);
          // Garder les publications statiques en cas d'erreur
        }
      });
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
          { key: 'work', label: 'Dossiers', icon: 'fa-solid fa-folder-open', badge: 7 },
         
          { key: 'publications', label: 'Publications', icon: 'fa-solid fa-newspaper' },
        ],
      },
      {
        title: 'Communication',
        items: [
          { key: 'notifications', label: 'Notifications', icon: 'fa-solid fa-bell', badge: 3 },
          { key: 'support', label: 'Centre d\'aide', icon: 'fa-solid fa-circle-question' },
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
      console.log('Validés trouvés:', validés.map(v => ({ id: v.id, status: v.status })));
      return validés.length;
    }
  
    getBloquésCount(): number {
      const bloqués = this.immatriculations.filter(immatriculation => 
        immatriculation.status === 'REJETE'
      );
      console.log('Rejetés trouvés:', bloqués.map(r => ({ id: r.id, status: r.status })));
      return bloqués.length;
    }
  
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
      } else if (key === 'publications') {
        this.currentView = 'publications';
      } else if (key === 'settings') {
        this.currentView = 'profile';
      } else if (key === 'logout') {
        this.logout();
      } else {
        this.currentView = 'overview';
      }
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
          console.log('Données reçues de l\'API:', data);
          console.log('Vérification des autresFiles:', data.map(imm => ({
            id: imm.id,
            dossierNumber: imm.dossierNumber,
            autresFiles: imm.autresFiles,
            autresFilesLength: imm.autresFiles?.length || 0
          })));
          this.immatriculations = data;
          this.applyFilter();
          this.cdr.detectChanges(); // Forcer la mise à jour des KPI
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
  
    setFilter(filter: 'all' | 'my'): void {
      this.activeFilter = filter;
      this.applyFilter();
    }
  
    private applyFilter(): void {
      let filtered: any[];
      
      console.log('ð applyFilter appelé - activeFilter:', this.activeFilter);
      console.log('ð Nombre total de publications:', this.publications.length);
      console.log('ð Publications disponibles:', this.publications.map(p => ({ id: p.id, title: p.title, createdBy: p.createdBy })));
      
      // Filtrer les publications
      if (this.activeFilter === 'all') {
        filtered = [...this.publications];
        console.log('â Filtrage: Toutes les publications -', filtered.length, 'publications');
      } else if (this.activeFilter === 'my') {
        // Filtrer les publication créées par l'utilisateur connecté
        const currentUserEmail = this.getCurrentUserEmail();
        const userId = localStorage.getItem('userId');
        
        console.log('ð Filtrage Mes publications - Email utilisateur:', currentUserEmail);
        console.log('ð Filtrage Mes publications - UserId:', userId);
        console.log('ð Publications disponibles:', this.publications.map(p => {
          // Log complet de la structure de la publication
          console.log('ð Structure complète de la publication:', p.title, p);
          return {
            id: p.id,
            title: p.title,
            createdByEmail: p.createdByEmail,
            createdBy: p.createdBy,
            createdByName: p.createdByName,
            createdById: p.createdBy?.id || p.createdById,
            // Ajouter tous les champs possibles pour le débogage
            createdByObj: p.createdBy,
            createdByIdField: p.createdById,
            createdByUserId: p.createdBy?.idUtilisateur,
            createdByUserIdField: p.createdByUserId,
            allFields: Object.keys(p)
          };
        }));
        
        filtered = this.publications.filter(publication => {
          // Vérifier si la publication appartient à l'utilisateur connecté
          let isMatch = false;
          
          // Vérifier par ID utilisateur (champ createdBy du DTO)
          if (userId) {
            isMatch = publication.createdBy == userId || 
                     publication.createdBy === parseInt(userId);
          }
          
          // Vérifier par email utilisateur (plus fiable)
          if (currentUserEmail && !isMatch) {
            isMatch = publication.createdByEmail === currentUserEmail ||
                     publication.createdBy?.email === currentUserEmail ||
                     publication.createdByName?.toLowerCase().includes(currentUserEmail.split('@')[0].toLowerCase());
          }
          
          // Vérifier par ID dans l'objet createdBy imbriqué
          if (!isMatch && userId && publication.createdBy?.idUtilisateur) {
            isMatch = publication.createdBy.idUtilisateur == parseInt(userId);
          }
          
          // Vérifier par ID direct dans l'objet createdBy
          if (!isMatch && userId && publication.createdBy?.id) {
            isMatch = publication.createdBy.id == parseInt(userId);
          }
          
          console.log('ð Vérification publication:', publication.title, 
                     '- createdBy:', publication.createdBy, 
                     '- createdByEmail:', publication.createdByEmail,
                     '- userId:', userId, 
                     '- currentUserEmail:', currentUserEmail,
                     '->', isMatch);
          return isMatch;
        });
        
        console.log('ð Résultat filtrage Mes publications:', filtered.length, 'publications trouvées');
      } else {
        filtered = [...this.publications];
      }
      
            
      // Appliquer le filtre de recherche
      if (this.searchTerm && this.searchTerm.trim() !== '') {
        const searchLower = this.searchTerm.toLowerCase().trim();
        console.log('ð Terme de recherche:', this.searchTerm);
        console.log('ð Terme de recherche (lowercase):', searchLower);
        console.log('ð Publications avant recherche:', filtered.length);
        
        filtered = filtered.filter(publication => {
          // Rechercher dans le titre, le contenu, le résumé et le nom de l'auteur
          const searchableFields = [
            publication.title || '',
            publication.summary || '',
            publication.content || '',
            publication.createdByName || ''
          ];
          
          console.log('ð Publication:', publication.title);
          console.log('ð Champs recherchables:', searchableFields);
          
          const matches = searchableFields.some(field => {
            const fieldLower = field.toLowerCase();
            const matches = fieldLower.includes(searchLower);
            console.log('  - Champ:', field, '->', matches);
            return matches;
          });
          
          console.log('ð Résultat final pour', publication.title, ':', matches);
          return matches;
        });
        
        console.log('ð Publications après recherche:', filtered.length);
      }
      
      // Appliquer le filtrage final
      this.filteredPublications = filtered;
    }
  
    onSearchChange(): void {
      this.applyFilter();
    }

    // Méthode pour effacer la recherche
    clearSearch(): void {
      this.searchTerm = '';
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
  
    formatDate(dateInput: any): string {
      if (!dateInput) return 'N/A';
      
      try {
        let date: Date;
        
        // Si c'est déjà un objet Date
        if (dateInput instanceof Date) {
          date = dateInput;
        }
        // Si c'est une chaîne de caractères
        else if (typeof dateInput === 'string') {
          // Gérer le format ISO (ex: 2026-04-22T12:00:00)
          if (dateInput.includes('T')) {
            date = new Date(dateInput);
          }
          // Gérer d'autres formats
          else {
            date = new Date(dateInput);
          }
        }
        // Si c'est un nombre (timestamp)
        else if (typeof dateInput === 'number') {
          date = new Date(dateInput);
        }
        // Si c'est un objet avec des propriétés de date
        else if (typeof dateInput === 'object' && dateInput.year) {
          date = new Date(dateInput.year, dateInput.monthValue - 1, dateInput.dayOfMonth, 
                         dateInput.hour || 0, dateInput.minute || 0, dateInput.second || 0);
        }
        else {
          return 'N/A';
        }
        
        // Vérifier si la date est valide
        if (isNaN(date.getTime())) {
          console.warn('Date invalide:', dateInput);
          return 'N/A';
        }
        
        return date.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        
      } catch (error) {
        console.error('Erreur de formatage de date:', error, 'pour:', dateInput);
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
  
  // ==================== MÉTHODES PUBLICATIONS ====================
  
  // Méthode pour créer une nouvelle publication
  createPublication(): void {
    this.resetCreatePublicationForm();
    this.showCreatePublicationModal = true;
  }

  closeCreatePublicationModal(): void {
    this.showCreatePublicationModal = false;
    this.isCreatingPublication = false;
  }

  saveAsDraft(): void {
    console.log('🚀 saveAsDraft appelé');
    
    // Synchroniser d'abord le contenu CKEditor avec le formulaire
    this.syncContentWithForm();
    console.log('📝 Form synchronisé:', this.newPublicationForm);

    if (!this.newPublicationForm.title || !this.newPublicationForm.content) {
      console.log('⚠️ Validation échouée - champs manquants');
      this.showNotification('Veuillez remplir les champs obligatoires (titre, contenu).', 'warning');
      return;
    }

    console.log('✅ Validation réussie');
    console.log('ð Tags actuels dans this.publicationTags:', this.publicationTags);
    console.log('ð Nombre de tags actuels:', this.publicationTags.length);
    this.isSavingDraft = true;

    const publicationRequest = {
      title: this.newPublicationForm.title,
      summary: this.newPublicationForm.content.substring(0, 200) + '...', // Générer un résumé auto
      content: this.newPublicationForm.content,
      language: this.newPublicationForm.language || 'fr',
      is_pinned: this.newPublicationForm.is_pinned,
      image_url: this.newPublicationForm.image_url.trim(),
      status: 'DRAFT' as const, // Explicitement défini comme brouillon
      ai_generated_tags: [...this.publicationTags]
    };

    console.log('📦 Request créé:', publicationRequest);
    console.log('🖼️ Image file:', this.selectedImageFile);
    console.log('📦 Tags dans le request:', publicationRequest.ai_generated_tags);
    console.log('📦 Type des tags:', typeof publicationRequest.ai_generated_tags);
    console.log('📦 Nombre de tags:', Array.isArray(publicationRequest.ai_generated_tags) ? publicationRequest.ai_generated_tags.length : 0);
    
    // Utiliser le service pour créer le brouillon
    console.log('🔄 Appel du service createDraft...');
    this.publicationService.createDraft(publicationRequest, this.selectedImageFile || undefined).subscribe({
      next: (createdPublication) => {
        console.log('✅ Brouillon créé:', createdPublication);
        // Ajouter au début du tableau
        this.publications.unshift(createdPublication);
        // Rafraîchir les publications filtrées pour afficher immédiatement le nouveau brouillon
        this.applyFilter();
        this.showNotification('Publication sauvegardée en brouillon !', 'success');
        this.isSavingDraft = false;
        this.closeCreatePublicationModal();
      },
      error: (error) => {
        console.error('❌ Erreur lors de la création du brouillon:', error);
        this.showNotification('Erreur lors de la sauvegarde du brouillon', 'error');
        this.isSavingDraft = false;
      }
    });
  }

  submitCreatePublication(): void {
    console.log('🚀 submitCreatePublication appelé');
    
    // Synchroniser d'abord le contenu CKEditor avec le formulaire
    this.syncContentWithForm();
    console.log('📝 Form synchronisé:', this.newPublicationForm);

    if (!this.newPublicationForm.title || !this.newPublicationForm.content) {
      console.log('⚠️ Validation échouée - champs manquants');
      this.showNotification('Veuillez remplir les champs obligatoires (titre, contenu).', 'warning');
      return;
    }

    console.log('✅ Validation réussie');
    console.log('ð Tags actuels dans this.publicationTags:', this.publicationTags);
    console.log('ð Nombre de tags actuels:', this.publicationTags.length);
    this.isCreatingPublication = true;

    const publicationRequest = {
      title: this.newPublicationForm.title,
      summary: this.newPublicationForm.content.substring(0, 200) + '...', // Générer un résumé auto
      content: this.newPublicationForm.content,
      language: this.newPublicationForm.language || 'fr',
      is_pinned: this.newPublicationForm.is_pinned,
      image_url: this.newPublicationForm.image_url.trim(),
      scheduled_at: this.newPublicationForm.schedule_type === 'later' ? this.newPublicationForm.scheduled_at : undefined,
      status: (this.newPublicationForm.schedule_type === 'later' ? 'SCHEDULED' : 'PUBLISHED') as 'SCHEDULED' | 'PUBLISHED', // PUBLISHED pour publication immédiate
      ai_generated_tags: [...this.publicationTags]
    };

    console.log('ð Request créé:', publicationRequest);
    console.log('ð Image file:', this.selectedImageFile);
    console.log('ð Tags dans le request:', publicationRequest.ai_generated_tags);
    console.log('ð Type des tags:', typeof publicationRequest.ai_generated_tags);
    console.log('ð Nombre de tags:', Array.isArray(publicationRequest.ai_generated_tags) ? publicationRequest.ai_generated_tags.length : 0);

    // Utiliser le service pour créer la publication
    console.log('ð Appel du service...');
    this.publicationService.createPublication(publicationRequest, this.selectedImageFile || undefined).subscribe({
      next: (createdPublication) => {
        console.log('✅ Publication créée:', createdPublication);
        // Ajouter au début du tableau
        this.publications.unshift(createdPublication);
        // Rafraîchir les publications filtrées pour afficher immédiatement la nouvelle publication
        this.applyFilter();
        this.showNotification('Publication créée avec succès !', 'success');
        this.isCreatingPublication = false;
        this.closeCreatePublicationModal();
      },
      error: (error) => {
        console.error('❌ Erreur lors de la création de la publication:', error);
        this.showNotification('Erreur lors de la création de la publication', 'error');
        this.isCreatingPublication = false;
      }
    });
  }

  private resetCreatePublicationForm(): void {
    this.newPublicationForm = {
      title: '',
      summary: '',
      content: '',
      language: 'fr',
      image_url: '',
      is_pinned: false,
      schedule_type: 'now',
      scheduled_at: ''
    };
    this.publicationTagInput = '';
    this.publicationTags = [];
  }

  addPublicationTag(): void {
    const value = this.publicationTagInput.trim();
    if (!value) {
      return;
    }
    if (!this.publicationTags.includes(value)) {
      this.publicationTags = [...this.publicationTags, value];
    }
    this.publicationTagInput = '';
  }

  removePublicationTag(tag: string): void {
    this.publicationTags = this.publicationTags.filter(t => t !== tag);
  }

  // Méthodes pour gérer les tags existants
  toggleExistingTags(): void {
    this.showExistingTags = !this.showExistingTags;
    if (this.showExistingTags && this.existingTags.length === 0) {
      this.loadExistingTags();
    }
  }

  loadExistingTags(): void {
    console.log('ð Chargement des tags existants depuis le backend...');
    
    // Charger toutes les publications avec une grande page size pour obtenir tous les tags
    const filters = {
      page: 0,
      size: 1000, // Taille de page grande pour obtenir toutes les publications
      sortBy: 'createdAt',
      sortDir: 'desc'
    };
    
    console.log('ð Filtres utilisés pour charger les tags:', filters);
    
    this.publicationService.getPublications(filters).subscribe({
      next: (response) => {
        console.log('ð Réponse complète du backend:', response);
        console.log('ð Structure de la réponse:', {
          hasData: !!response.data,
          dataType: typeof response.data,
          isArray: Array.isArray(response.data),
          dataLength: response.data?.length || 0,
          hasPagination: !!response.pagination,
          pagination: response.pagination
        });
        
        const allTags = new Set<string>();
        
        if (response.data && Array.isArray(response.data)) {
          console.log('ð Publications chargées pour les tags:', response.data.length);
          
          response.data.forEach((publication, index) => {
            // Pour la première publication, afficher toutes les clés et valeurs
            if (index === 0) {
              console.log('ð Publication complète (première publication):', publication);
              console.log('ð Toutes les clés de la publication:', Object.keys(publication));
              console.log('ð Toutes les valeurs de la publication:');
              Object.entries(publication).forEach(([key, value]) => {
                console.log(`  - ${key}:`, value);
              });
            }
            
            console.log(`ð Publication ${index + 1}:`, {
              id: publication.id,
              title: publication.title,
              fullObject: publication,
              ai_generated_tags: publication.ai_generated_tags,
              tagsType: typeof publication.ai_generated_tags,
              isArray: Array.isArray(publication.ai_generated_tags),
              allKeys: Object.keys(publication)
            });
            
            // Vérifier tous les champs possibles pour les tags
            let foundTags = null;
            
            // Vérifier aiGeneratedTags (champ principal) - utiliser une approche plus sûre
            const publicationAny = publication as any;
            if (publicationAny.aiGeneratedTags !== undefined) {
              console.log('ð Champ aiGeneratedTags trouvé:', publicationAny.aiGeneratedTags);
              foundTags = publicationAny.aiGeneratedTags;
            }
            
            const tags = foundTags;
            
            if (tags && Array.isArray(tags)) {
              console.log(`ð Tags trouvés pour la publication ${index + 1}:`, tags);
              tags.forEach((tag: string) => {
                if (tag && tag.trim()) {
                  allTags.add(tag.trim());
                  console.log('ð Tag ajouté:', tag.trim());
                }
              });
            } else {
              console.log(`ð Pas de tags valides pour la publication ${index + 1}:`, publication.title);
              console.log('ð Valeur de ai_generated_tags:', publication.ai_generated_tags);
            }
          });
        } else {
          console.log('ð Aucune donnée de publication trouvée ou format invalide');
        }
        
        this.existingTags = Array.from(allTags).sort();
       
      },
      error: (error) => {
        console.error('ð Erreur lors du chargement des tags existants:', error);
       
        // En cas d'erreur, essayer avec les publications locales
        this.loadExistingTagsFromLocal();
      }
    });
  }
  
  loadExistingTagsFromLocal(): void {
    
    
    // Extraire tous les tags des publications existantes
    const allTags = new Set<string>();
    
    this.publications.forEach((publication, index) => {
      console.log(`ð Publication ${index + 1}:`, {
        id: publication.id,
        title: publication.title,
        ai_generated_tags: publication.ai_generated_tags,
        tagsType: typeof publication.ai_generated_tags,
        isArray: Array.isArray(publication.ai_generated_tags)
      });
      
      // Vérifier les tags avec différents noms de champs possibles
      const tags = publication.ai_generated_tags;
      
      if (tags && Array.isArray(tags)) {
        tags.forEach((tag: string) => {
          if (tag && tag.trim()) {
            allTags.add(tag.trim());
            console.log('ð Tag trouvé:', tag.trim());
          }
        });
      } else {
        console.log('ð Pas de tags ou format invalide pour la publication:', publication.title);
      }
    });

    this.existingTags = Array.from(allTags).sort();
    
  }

  addExistingTag(tag: string): void {
    if (!this.publicationTags.includes(tag)) {
      this.publicationTags = [...this.publicationTags, tag];
      console.log('ð Tag ajouté depuis les existants:', tag);
    }
  }

  isTagAlreadyAdded(tag: string): boolean {
    return this.publicationTags.includes(tag);
  }

  // ==================== MÉTHODES DE PAGINATION ====================

  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadPublications();
    }
  }

  // Méthode wrapper pour le template
  navigateToPage(page: any): void {
    if (this.isPageNumber(page)) {
      this.goToPage(page as number);
    }
  }

  goToPreviousPage(): void {
    if (this.currentPage > 0) {
      this.goToPage(this.currentPage - 1);
    }
  }

  goToNextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.goToPage(this.currentPage + 1);
    }
  }

  getPageNumbers(): (number | string)[] {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;
    
    if (this.totalPages <= maxVisiblePages) {
      // Afficher toutes les pages si peu de pages
      for (let i = 0; i < this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Afficher les pages avec ellipsis
      pages.push(0); // Première page
      
      if (this.currentPage > 2) {
        pages.push('...');
      }
      
      // Pages autour de la page actuelle
      const start = Math.max(1, Math.min(this.currentPage - 1, this.totalPages - 3));
      const end = Math.min(this.totalPages - 2, Math.max(this.currentPage + 1, 2));
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (this.currentPage < this.totalPages - 3) {
        pages.push('...');
      }
      
      pages.push(this.totalPages - 1); // Dernière page
    }
    
    return pages;
  }

  getStartItem(): number {
    return this.totalItems === 0 ? 0 : this.currentPage * this.itemsPerPage + 1;
  }

  getEndItem(): number {
    const end = this.currentPage * this.itemsPerPage + this.itemsPerPage;
    return Math.min(end, this.totalItems);
  }

  isPageNumber(page: any): boolean {
    return typeof page === 'number' && !isNaN(page);
  }

  canNavigateToPage(page: any): boolean {
    return this.isPageNumber(page) && page !== '...' && page >= 0 && page < this.totalPages;
  }

  // ==================== MÉTHODES DE DÉTAILS DE PUBLICATION ====================

  viewPublicationDetails(publication: any): void {
    this.selectedPublicationForDetails = publication;
    this.showPublicationDetailsModal = true;
    console.log('ð Affichage des détails pour la publication:', publication.title);
  }

  closePublicationDetailsModal(): void {
    this.showPublicationDetailsModal = false;
    this.selectedPublicationForDetails = null;
  }

  // Méthodes pour la modification de publication
  editPublication(publication: any): void {
    this.selectedPublicationForEdit = publication;
    
    console.log('ð Publication complète pour modification:', publication);
    console.log('ð Clés de la publication:', Object.keys(publication));
    console.log('ð Valeur de imageUrl:', publication.imageUrl);
    console.log('ð Type de imageUrl:', typeof publication.imageUrl);
    console.log('ð ImageUrl existe?', !!publication.imageUrl);
    
    // Remplir le formulaire avec les données de la publication
    this.editPublicationForm = {
      title: publication.title || '',
      content: publication.content || '',
      summary: publication.summary || '',
      imageUrl: publication.imageUrl || '',
      language: publication.language || 'fr',
      tags: publication.aiGeneratedTags || []
    };
    
    // Initialiser les éditeurs CKEditor
    this.ckEditorTitle = publication.title || '';
    this.ckEditorContent = publication.content || '';
    
    // Initialiser la prévisualisation de l'image existante
    // Ne pas mettre l'URL dans editImagePreview pour laisser getImageUrl() faire la transformation
    this.editImagePreview = null; // Toujours null pour les images existantes
    this.selectedEditImageFile = null;
    
    console.log('ð editImagePreview défini:', this.editImagePreview);
    console.log('ð editPublicationForm.imageUrl:', this.editPublicationForm.imageUrl);
    
    // Déboguer le traitement de l'URL
    if (publication.imageUrl) {
      this.debugImageUrl(publication.imageUrl);
    }
    
    this.showEditPublicationModal = true;
    console.log('ð Ouverture de la modal de modification pour:', publication.title);
    console.log('ð Modal ouverte:', this.showEditPublicationModal);
  }

  closeEditPublicationModal(): void {
    this.showEditPublicationModal = false;
    this.selectedPublicationForEdit = null;
    this.editPublicationForm = {
      title: '',
      content: '',
      summary: '',
      imageUrl: '',
      language: 'fr',
      tags: [] as string[]
    };
    this.isEditingPublication = false;
    
    // Nettoyer les propriétés d'image
    this.editImagePreview = null;
    this.selectedEditImageFile = null;
    this.isUploadingEditImage = false;
  }

  updatePublication(): void {
    if (!this.selectedPublicationForEdit) return;
    const publicationId = this.selectedPublicationForEdit.id ?? this.selectedPublicationForEdit.idPublication;
    if (!publicationId) {
      console.error('❌ ID publication introuvable pour la mise à jour:', this.selectedPublicationForEdit);
      this.showErrorMessage('ID de la publication introuvable. Veuillez recharger la liste.');
      return;
    }
    
    this.isEditingPublication = true;
    
    try {
      const cleanedTitle = this.stripHtml(this.ckEditorTitle || this.editPublicationForm.title || this.selectedPublicationForEdit?.title || '');
      const cleanedContent = this.stripHtml(this.ckEditorContent || this.editPublicationForm.content || this.selectedPublicationForEdit?.content || '');
      const cleanedSummary = this.stripHtml(this.editPublicationForm.summary || this.selectedPublicationForEdit?.summary || '');

      const updatedPublication = {
        title: cleanedTitle,
        content: cleanedContent,
        summary: cleanedSummary || (cleanedContent ? cleanedContent.substring(0, 200) + '...' : ''),
        imageUrl: this.editPublicationForm.imageUrl || this.selectedPublicationForEdit?.imageUrl || '',
        language: this.editPublicationForm.language || this.selectedPublicationForEdit?.language || 'fr',
        aiGeneratedTags: this.editPublicationForm.tags || []
      };
      
      console.log('ð Mise à jour de la publication:', updatedPublication);
      
      const updateRequest$: Observable<any> = this.selectedEditImageFile
        ? this.publicationService.updatePublicationWithImage(publicationId, updatedPublication, this.selectedEditImageFile)
        : this.publicationService.updatePublication(publicationId, updatedPublication);

      // Appeler le service pour mettre à jour la publication
      updateRequest$.subscribe({
        next: (response) => {
          console.log('ð Publication mise à jour avec succès:', response);
          this.isEditingPublication = false;
          this.closeEditPublicationModal();
          this.loadPublications(); // Recharger les publications
          this.showSuccessMessage('Publication mise à jour avec succès');
        },
        error: (error) => {
          console.error('ð Erreur lors de la mise à jour de la publication:', error);
          this.isEditingPublication = false;
          this.showErrorMessage('Erreur lors de la mise à jour de la publication');
        }
      });
    } catch (error) {
      console.error('ð Erreur lors de la préparation de la mise à jour:', error);
      this.isEditingPublication = false;
      this.showErrorMessage('Erreur lors de la mise à jour de la publication');
    }
  }

  // Gestion des tags dans le formulaire de modification
  addEditTag(event: any): void {
    const input = event.target;
    const tag = input.value.trim();
    
    if (tag && !this.editPublicationForm.tags.includes(tag)) {
      this.editPublicationForm.tags.push(tag);
      input.value = '';
      console.log('ð Tag ajouté à la modification:', tag);
    }
  }

  removeEditTag(tag: string): void {
    const index = this.editPublicationForm.tags.indexOf(tag);
    if (index > -1) {
      this.editPublicationForm.tags.splice(index, 1);
      console.log('ð Tag supprimé de la modification:', tag);
    }
  }

  addEditTagFromExisting(tag: string): void {
    if (!this.editPublicationForm.tags.includes(tag)) {
      this.editPublicationForm.tags.push(tag);
      console.log('ð Tag existant ajouté à la modification:', tag);
    }
  }

  // Gestion de l'image pour la modification
  onEditImageUpload(event: any): void {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      this.selectedEditImageFile = file;
      
      // Créer une URL pour l'aperçu
      const reader = new FileReader();
      reader.onload = (e) => {
        this.editImagePreview = e.target?.result as string;
        console.log('ð Image de modification chargée:', file.name);
      };
      reader.readAsDataURL(file);
    } else {
      console.error('ð Fichier invalide. Veuillez sélectionner une image.');
      // Réinitialiser l'input
      event.target.value = '';
    }
  }

  removeEditImage(): void {
    this.selectedEditImageFile = null;
    this.editImagePreview = null;
    this.editPublicationForm.imageUrl = '';
    console.log('ð Image de modification supprimée');
  }

  // Méthode pour téléverser l'image de modification
  uploadEditImage(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.selectedEditImageFile) {
        resolve(this.editPublicationForm.imageUrl || '');
        return;
      }

      this.isUploadingEditImage = true;
      
      // Créer FormData pour l'upload
      const formData = new FormData();
      formData.append('image', this.selectedEditImageFile);
      
      // Simuler l'upload (remplacer par votre véritable API)
      setTimeout(() => {
        const imageUrl = `/assets/img/publication/${Date.now()}_${this.selectedEditImageFile!.name}`;
        this.isUploadingEditImage = false;
        console.log('ð Image de modification uploadée:', imageUrl);
        resolve(imageUrl);
      }, 1500);
    });
  }

  
  // Gestion des changements dans les éditeurs CKEditor pour la modification
  onEditTitleChange(): void {
    this.editPublicationForm.title = this.stripHtml(this.ckEditorTitle);
  }

  onEditContentChange(): void {
    this.editPublicationForm.content = this.stripHtml(this.ckEditorContent);
  }

  // Messages de succès/erreur
  showSuccessMessage(message: string): void {
    // Implémenter l'affichage d'un message de succès
    console.log('ð Succès:', message);
    // Vous pouvez utiliser un toast ou une notification ici
  }

  showErrorMessage(message: string): void {
    // Implémenter l'affichage d'un message d'erreur
    console.error('ð Erreur:', message);
    // Vous pouvez utiliser un toast ou une notification ici
  }

  // Fonction pour générer des tags avec l'API de Groq
  generateTagsFromDescription(): void {
    if (!this.ckEditorContent || this.stripHtml(this.ckEditorContent).trim() === '') {
      alert('Veuillez entrer une description pour générer des tags.');
      return;
    }

    const plainText = this.stripHtml(this.ckEditorContent).trim();

    this.isLoadingTags = true;

    const requestBody = {
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: `Génère 4 tags significatifs pour ce texte en français : "${plainText}". Retourne uniquement les tags séparés par des virgules, sans texte supplémentaire (exemple : "tag1, tag2, tag3, tag4").`
        }
      ],
      max_tokens: 50,
      temperature: 0.5
    };

    this.http.post('https://api.groq.com/openai/v1/chat/completions', requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer '
      }
    }).subscribe({
      next: (data: any) => {
        const rawTags = data.choices[0].message.content.trim();
        const tags = rawTags
          .split(',')
          .map((tag: string) => tag.replace(/[*#]+/g, '').trim())
          .filter((tag: string) => tag.length > 0)
          .slice(0, 4);

        this.publicationTags = tags.length > 0 ? tags : [];
        this.isLoadingTags = false;
      },
      error: (error) => {
        console.error('Erreur lors de la génération des tags:', error);
        alert(`Erreur lors de la génération des tags : ${error.message || 'Erreur inconnue'}`);
        this.publicationTags = [];
        this.isLoadingTags = false;
      }
    });
  }

  // Méthode pour nettoyer le HTML et obtenir le texte brut
  stripHtml(html: string): string {
    if (!html) return '';
    
    // Utiliser une approche plus simple avec regex
    return html
      .replace(/<[^>]*>/g, '') // Supprimer toutes les balises HTML
      .replace(/&nbsp;/g, ' ') // Remplacer les espaces insécables
      .replace(/\s+/g, ' ') // Nettoyer les espaces multiples
      .trim();
  }

  // Méthode pour synchroniser le contenu CKEditor avec le formulaire (texte brut)
  syncContentWithForm(): void {
    this.newPublicationForm.title = this.stripHtml(this.ckEditorTitle);
    this.newPublicationForm.content = this.stripHtml(this.ckEditorContent);
  }

  // Méthodes pour mettre à jour le formulaire en temps réel
  onTitleChange(): void {
    this.newPublicationForm.title = this.stripHtml(this.ckEditorTitle);
  }

  onContentChange(): void {
    this.newPublicationForm.content = this.stripHtml(this.ckEditorContent);
  }

  // Méthode pour gérer le téléchargement d'image
  onImageUpload(event: any): void {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      this.selectedImageFile = file;
      
      // Créer une URL pour l'aperçu
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.newPublicationForm.image_url = e.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      alert('Veuillez sélectionner un fichier image valide.');
    }
  }

  // Fonction pour corriger les fautes dans le contenu avec l'API de Groq
  correctContentWithAI(): void {
    if (!this.ckEditorContent || this.stripHtml(this.ckEditorContent).trim() === '') {
      alert('Veuillez entrer un contenu à corriger.');
      return;
    }

    const plainText = this.stripHtml(this.ckEditorContent).trim();

    this.isCorrectingContent = true;

    const requestBody = {
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: `Corrigez les fautes d'orthographe, de grammaire et de ponctuation dans ce texte en français, et améliorez sa clarté si nécessaire. Retournez uniquement le texte corrigé, sans explication ni texte supplémentaire : "${plainText}"`
        }
      ],
      max_tokens: 1000,
      temperature: 0.3
    };

    this.http.post('https://api.groq.com/openai/v1/chat/completions', requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer '
      }
    }).subscribe({
      next: (data: any) => {
        const correctedText = data.choices[0].message.content.trim();
        
        // Mettre à jour le contenu CKEditor avec le texte corrigé
        this.ckEditorContent = correctedText;
        
        // Mettre à jour aussi le formulaire
        this.newPublicationForm.content = this.stripHtml(correctedText);
        
        this.isCorrectingContent = false;
        this.showNotification('Contenu corrigé avec succès !', 'success');
      },
      error: (error) => {
        console.error('Erreur lors de la correction du contenu:', error);
        this.showNotification(`Erreur lors de la correction : ${error.message || 'Erreur inconnue'}`, 'error');
        this.isCorrectingContent = false;
      }
    });
  }

  // Méthodes pour la gestion des publications

  togglePin(publication: any): void {
    console.log('Basculer le statut épinglé:', publication);
    // TODO: Appeler le service pour épingler/désépingler
  }

  deletePublication(publication: any): void {
    this.selectedPublicationForDelete = publication;
    this.showDeletePublicationModal = true;
  }

  updatePublicationStatusFromList(publication: any, newStatus: 'DRAFT' | 'PUBLISHED'): void {
    if (!publication?.id || !newStatus || publication.status === newStatus) {
      return;
    }

    this.publicationService.updatePublicationStatus(publication.id, newStatus).subscribe({
      next: (updatedPublication) => {
        publication.status = updatedPublication?.status || newStatus;
        this.showSuccessMessage('Statut de la publication mis à jour.');
      },
      error: (error) => {
        console.error('❌ Erreur lors de la mise à jour du statut:', error);
        this.showErrorMessage('Erreur lors de la mise à jour du statut');
      }
    });
  }

  closeDeletePublicationModal(): void {
    this.showDeletePublicationModal = false;
    this.selectedPublicationForDelete = null;
  }

  confirmDeletePublication(): void {
    if (!this.selectedPublicationForDelete?.id) {
      this.showErrorMessage('Publication invalide pour la suppression.');
      this.closeDeletePublicationModal();
      return;
    }

    const publicationId = this.selectedPublicationForDelete.id;

    this.publicationService.deletePublication(publicationId).subscribe({
      next: () => {
        this.publications = this.publications.filter(p => p.id !== publicationId);
        this.applyFilter();
        this.showSuccessMessage('Publication supprimée avec succès.');
        this.closeDeletePublicationModal();
      },
      error: (error) => {
        console.error('❌ Erreur lors de la suppression de la publication:', error);
        this.showErrorMessage('Erreur lors de la suppression de la publication');
      }
    });
  }

  // Méthodes utilitaires pour les publications
  canManagePublication(publication: any): boolean {
    if (!publication) {
      return false;
    }

    const userIdRaw = localStorage.getItem('userId');
    const userId = userIdRaw ? parseInt(userIdRaw, 10) : null;
    const currentUserEmail = this.getCurrentUserEmail()?.toLowerCase();

    if (userId !== null && !Number.isNaN(userId)) {
      if (publication.createdBy === userId || publication.createdById === userId || publication.createdByUserId === userId) {
        return true;
      }
      if (publication.createdBy && typeof publication.createdBy === 'object') {
        if (publication.createdBy.id === userId || publication.createdBy.idUtilisateur === userId) {
          return true;
        }
      }
    }

    if (currentUserEmail) {
      const publicationEmail = (publication.createdByEmail || publication.createdBy?.email || '').toLowerCase();
      if (publicationEmail && publicationEmail === currentUserEmail) {
        return true;
      }
    }

    return false;
  }

  getStatusLabel(status: string): string {
    const statusLabels: { [key: string]: string } = {
      'DRAFT': 'Brouillon',
      'PENDING': 'En attente',
      'VALIDATED': 'Validé',
      'PUBLISHED': 'Publié',
      'SCHEDULED': 'Programmé',
      'REJECTED': 'Rejeté',
      'ARCHIVED': 'Archivé'
    };
    const label = statusLabels[status] || status;
    return label;
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
  
  
  