import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ImmatriculationService } from '../../services/immatriculation.service';

@Component({
  selector: 'app-immatriculation-admin',
  templateUrl: './immatriculation-admin.component.html',
  styleUrls: ['./immatriculation-admin.component.css']
})
export class ImmatriculationAdminComponent implements OnInit {

  // Données depuis la base de données
  immatriculations: any[] = [];
  filteredImmatriculations: any[] = [];
  stats: any[] = [];
  
  // États de chargement
  isLoadingImmatriculations = false;
  
  searchTerm = '';
  selectedStatut: string = 'ALL';
  selectedFormeJuridique: string = 'ALL';
  
  loading = true;
  errorMessage = '';
  showAdvancedSearch = false;
  
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;
  totalPages = 0;
  paginationPages: number[] = [];
  
  selectedImmatriculation: any = null;
  showDetailsModal = false;

  constructor(
    private router: Router,
    private immatriculationService: ImmatriculationService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadImmatriculations();
  }

  loadImmatriculations(): void {
    this.isLoadingImmatriculations = true;
    this.immatriculationService.getAllImmatriculations().subscribe(
      (data: any[]) => {
        this.immatriculations = data;
        this.filteredImmatriculations = data;
        this.totalItems = data.length;
        this.calculateTotalPages();
        this.generateStats();
        this.isLoadingImmatriculations = false;
        this.loading = false;
        this.cdr.detectChanges();
      },
      (error: any) => {
        console.error('Erreur lors du chargement des immatriculations:', error);
        this.isLoadingImmatriculations = false;
        this.loading = false;
        this.immatriculations = [];
        this.filteredImmatriculations = [];
      }
    );
  }

  generateStats(): void {
    const total = this.immatriculations.length;
    const actives = this.immatriculations.filter(i => i.status === 'VALIDATED').length;
    const enAttente = this.immatriculations.filter(i => i.status === 'PENDING').length;
    const morale = this.immatriculations.filter(i => i.typeContribuable === 'MORALE').length;

    this.stats = [
      {
        title: 'Total',
        value: total.toString(),
        subtitle: 'Immatriculations',
        delta: '+12%',
        trend: 'up'
      },
      {
        title: 'Validées',
        value: actives.toString(),
        subtitle: 'Dossiers validés',
        delta: `+${Math.round((actives / total) * 100)}%`,
        trend: 'up'
      },
      {
        title: 'En attente',
        value: enAttente.toString(),
        subtitle: 'Dossiers en attente',
        delta: `-${Math.round((enAttente / total) * 100)}%`,
        trend: 'down'
      },
      {
        title: 'Personne morale',
        value: morale.toString(),
        subtitle: 'Sociétés',
        delta: `+${Math.round((morale / total) * 100)}%`,
        trend: 'up'
      }
    ];
  }

  calculateTotalPages(): void {
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    this.updatePaginationPages();
  }

  updatePaginationPages(): void {
    this.paginationPages = [];
    for (let i = 1; i <= this.totalPages; i++) {
      this.paginationPages.push(i);
    }
  }

  onPageChange(page: number): void {
    this.currentPage = page;
  }

  onItemsPerPageChange(value: number): void {
    this.itemsPerPage = value;
    this.currentPage = 1;
    this.calculateTotalPages();
  }

  getEndRange(): number {
    const end = this.currentPage * this.itemsPerPage;
    return end > this.totalItems ? this.totalItems : end;
  }

  onSearchChange(value: string): void {
    this.searchTerm = value.toLowerCase();
    this.applyFilter();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.filteredImmatriculations = this.immatriculations;
  }

  onStatutFilterChange(value: string): void {
    this.selectedStatut = value;
    this.applyFilter();
  }

  onFormeJuridiqueFilterChange(value: string): void {
    this.selectedFormeJuridique = value;
    this.applyFilter();
  }

  resetFilters(): void {
    this.selectedStatut = 'ALL';
    this.selectedFormeJuridique = 'ALL';
    this.filteredImmatriculations = this.immatriculations;
  }

  applyFilter(): void {
    let filtered = this.immatriculations;

    // Filtrer par statut
    if (this.selectedStatut !== 'ALL') {
      filtered = filtered.filter(i => i.status === this.selectedStatut);
    }

    // Filtrer par type contribuable
    if (this.selectedFormeJuridique !== 'ALL') {
      filtered = filtered.filter(i => i.typeContribuable === this.selectedFormeJuridique);
    }

    // Appliquer la recherche si existante
    if (this.searchTerm) {
      filtered = filtered.filter(immatriculation =>
        `${immatriculation.denominationSociale || immatriculation.nomPrenom} ${immatriculation.dossierNumber} ${immatriculation.email}`
          .toLowerCase()
          .includes(this.searchTerm)
      );
    }

    this.filteredImmatriculations = filtered;
    this.totalItems = filtered.length;
    this.calculateTotalPages();
  }

  openImmatriculationDetails(immatriculation: any): void {
    this.selectedImmatriculation = immatriculation;
    this.showDetailsModal = true;
  }

  closeImmatriculationDetails(): void {
    this.showDetailsModal = false;
    this.selectedImmatriculation = null;
  }

  getStatutBadgeClass(status: string): string {
    console.log('Statut reçu:', status); // Debug pour voir les valeurs exactes
    
    // Nettoyer le statut (enlever espaces, mettre en majuscules)
    const cleanStatus = status ? status.trim().toUpperCase() : '';
    
    switch (cleanStatus) {
      case 'VALIDATED':
      case 'VALIDÉ':
      case 'VALIDE':
      case 'APPROUVED':
      case 'ACCEPTED':
        return 'statut-valide';
      case 'EN_COURS_VERIFICATION':
      case 'VERIFICATION':
      case 'VERIFYING':
      case 'IN_PROGRESS':
      case 'EN COURS':
        return 'statut-verification';
      case 'REJECTED':
      case 'REJETE':
      case 'REJETÉ':
      case 'DECLINED':
      case 'REFUSED':
        return 'statut-rejete';
      case 'PENDING':
      case 'EN ATTENTE':
      case 'WAITING':
      case 'PENDING_APPROVAL':
        return 'statut-attente';
      default: 
        console.log('Statut non reconnu, utilisation de statut-unknown pour:', cleanStatus);
        return 'statut-unknown';
    }
  }

  getFormeJuridiqueBadgeClass(type: string): string {
    switch (type) {
      case 'MORALE': return 'forme-sa';
      case 'PHYSIQUE': return 'forme-sarl';
      default: return 'forme-autre';
    }
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-TN');
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-TN', {
      style: 'currency',
      currency: 'TND',
      minimumFractionDigits: 0
    }).format(amount);
  }

  toggleAdvancedSearch(): void {
    this.showAdvancedSearch = !this.showAdvancedSearch;
  }

  exportImmatriculations(): void {
    console.log('Exportation des immatriculations...');
  }

  editImmatriculation(immatriculation: any): void {
    console.log('Modification de l\'immatriculation:', immatriculation);
  }

  deleteImmatriculation(immatriculation: any): void {
    console.log('Suppression de l\'immatriculation:', immatriculation);
  }

  // Méthodes pour gérer les documents
  viewDocument(fileUrl: string, title: string): void {
    window.open(fileUrl, '_blank');
  }

  downloadDocument(fileUrl: string, filename: string): void {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  handleImageError(event: any): void {
    event.target.src = 'assets/images/placeholder.jpg';
  }

  // Méthodes pour gérer les scores
  getScoreLevel(score: number): string {
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    return 'low';
  }

  // Getter pour vérifier si l'immatriculation a des documents
  get hasDocuments(): boolean {
    if (!this.selectedImmatriculation) return false;
    
    return !!(
      this.selectedImmatriculation.identiteFile ||
      this.selectedImmatriculation.activiteFile ||
      this.selectedImmatriculation.photoFile ||
      (this.selectedImmatriculation.autresFiles && this.selectedImmatriculation.autresFiles.length > 0)
    );
  }

  // Méthode pour formater l'adresse complète
  formatAdresse(immatriculation: any): string {
    if (!immatriculation) return 'N/A';
    
    const parts = [
      immatriculation.adresse,
      immatriculation.ville,
      immatriculation.codePostal,
      immatriculation.pays
    ].filter(part => part && part.trim() !== '');
    
    return parts.length > 0 ? parts.join(', ') : 'N/A';
  }
}
