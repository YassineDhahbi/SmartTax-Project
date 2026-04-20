import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ImmatriculationService } from '../../services/immatriculation.service';
import { TrashService } from '../../services/trash.service';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
  showImageModal = false;
  imageModalUrl = '';
  imageModalTitle = '';
  
  // Propriétés pour la gestion de la suppression
  showDeleteModal = false;
  immatriculationToDelete: any = null;
  userName = 'admin'; // Nom d'utilisateur pour la corbeille
  
  // Propriétés pour la gestion du rejet
  showRejectModal = false;
  immatriculationToReject: any = null;
  rejectionReason = '';
  
  // View rejection reason properties
  showRejectionReasonModal = false;
  rejectionReasonToView: string = '';

  constructor(
    private router: Router,
    private immatriculationService: ImmatriculationService,
    private trashService: TrashService,
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
    const actives = this.immatriculations.filter(i => i.status === 'VALIDE').length;
    const enAttente = this.immatriculations.filter(i => i.status === 'REJETE').length;
    const enCours = this.immatriculations.filter(i => i.status === 'EN_COURS_VERIFICATION').length;

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
        title: 'Rejetées',
        value: enAttente.toString(),
        subtitle: 'Dossiers rejetés',
        delta: `-${Math.round((enAttente / total) * 100)}%`,
        trend: 'down'
      },
      {
        title: 'Dossiers en cours',
        value: enCours.toString(),
        subtitle: 'En vérification',
        delta: `+${Math.round((enCours / total) * 100)}%`,
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

    // Filtrer par statut avec logique de nettoyage
    if (this.selectedStatut !== 'ALL') {
      filtered = filtered.filter(i => {
        const cleanStatus = i.status ? i.status.trim().toUpperCase() : '';
        return this.matchesStatut(cleanStatus, this.selectedStatut);
      });
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

  private matchesStatut(status: string, filterValue: string): boolean {
    const cleanStatus = status ? status.trim().toUpperCase() : '';
    const cleanFilter = filterValue ? filterValue.trim().toUpperCase() : '';
    
    switch (cleanFilter) {
      case 'VALIDATED':
        return ['VALIDATED', 'VALIDÉ', 'VALIDE', 'APPROUVED', 'ACCEPTED'].includes(cleanStatus);
      case 'REJECTED':
        return ['REJECTED', 'REJETE', 'REJETÉ', 'DECLINED', 'REFUSED'].includes(cleanStatus);
      case 'PENDING':
        return ['PENDING', 'EN ATTENTE', 'WAITING', 'PENDING_APPROVAL', 'EN_COURS_VERIFICATION'].includes(cleanStatus);
      case 'EN_COURS_VERIFICATION':
        return ['EN_COURS_VERIFICATION', 'VERIFICATION', 'VERIFYING', 'IN_PROGRESS', 'EN COURS'].includes(cleanStatus);
      default:
        return cleanStatus === cleanFilter;
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

  openTrashModal(): void {
    // Rediriger directement vers la page de corbeille
    this.navigateToTrash();
  }

  editImmatriculation(immatriculation: any): void {
    // Sélectionner l'immatriculation et télécharger le PDF
    this.selectedImmatriculation = immatriculation;
    this.downloadImmatriculationPDF();
  }

  downloadImmatriculationPDF(): void {
    // Créer un élément HTML temporaire pour le contenu
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = this.generatePrintContent();
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    tempDiv.style.width = '800px';
    tempDiv.style.padding = '20px';
    tempDiv.style.backgroundColor = 'white';
    tempDiv.style.fontFamily = 'Arial, sans-serif';
    
    document.body.appendChild(tempDiv);
    
    // Utiliser html2canvas pour capturer le contenu
    html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      allowTaint: true
    }).then(canvas => {
      // Créer un PDF avec jsPDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      
      // Calculer les dimensions pour adapter au format A4
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;
      
      // Ajouter l'image au PDF
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      
      // Télécharger le PDF
      const fileName = `Immatriculation_${this.selectedImmatriculation?.dossierNumber || 'unknown'}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      // Nettoyer l'élément temporaire
      document.body.removeChild(tempDiv);
    }).catch(error => {
      console.error('Erreur lors de la génération du PDF:', error);
      document.body.removeChild(tempDiv);
      // En cas d'erreur, revenir à l'ancienne méthode
      this.fallbackPDFDownload();
    });
  }

  private fallbackPDFDownload(): void {
    // Méthode de secours si html2canvas échoue
    const printContent = this.generatePrintContent();
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          setTimeout(() => {
            printWindow.close();
          }, 1000);
        }, 500);
      };
    }
  }

  printImmatriculationDetails(): void {
    // Créer une fenêtre d'impression avec les détails de l'immatriculation
    const printContent = this.generatePrintContent();
    const printWindow = window.open('', '_blank');
    
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      
      // Attendre que le contenu soit chargé avant d'imprimer
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  }

  private generatePrintContent(): string {
    const immatriculation = this.selectedImmatriculation;
    if (!immatriculation) return '';

    const formatDate = (date: string) => new Date(date).toLocaleDateString('fr-TN');
    const formatAdresse = () => {
      const parts = [
        immatriculation.adresse,
        immatriculation.ville,
        immatriculation.codePostal,
        immatriculation.pays
      ].filter(part => part && part.trim() !== '');
      return parts.length > 0 ? parts.join(', ') : 'N/A';
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Détails de l'Immatriculation - ${immatriculation.dossierNumber}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            line-height: 1.6;
            color: #333;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            margin: 0;
            color: #333;
          }
          .section {
            margin-bottom: 30px;
          }
          .section h2 {
            color: #333;
            border-bottom: 1px solid #ccc;
            padding-bottom: 5px;
            margin-bottom: 15px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-bottom: 20px;
          }
          .info-item {
            margin-bottom: 10px;
          }
          .info-item label {
            font-weight: bold;
            display: inline-block;
            width: 150px;
            color: #555;
          }
          .info-item span {
            color: #333;
          }
          .full-width {
            grid-column: 1 / -1;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
          @media print {
            body { margin: 15px; }
            .header { page-break-after: always; }
            .section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Détails de l'Immatriculation</h1>
          <p>Numéro dossier: ${immatriculation.dossierNumber}</p>
          <p>Date d'impression: ${new Date().toLocaleDateString('fr-TN')}</p>
        </div>

        <div class="section">
          <h2>Informations générales</h2>
          <div class="info-grid">
            <div class="info-item">
              <label>Numéro dossier:</label>
              <span>${immatriculation.dossierNumber}</span>
            </div>
            <div class="info-item">
              <label>Type contribuable:</label>
              <span>${immatriculation.typeContribuable}</span>
            </div>
            <div class="info-item">
              <label>Statut:</label>
              <span>${immatriculation.status}</span>
            </div>
            <div class="info-item">
              <label>Date de création:</label>
              <span>${formatDate(immatriculation.dateCreation)}</span>
            </div>
            ${immatriculation.typeContribuable === 'PHYSIQUE' ? `
              <div class="info-item">
                <label>Nom:</label>
                <span>${immatriculation.nom || 'N/A'}</span>
              </div>
              <div class="info-item">
                <label>Prénom:</label>
                <span>${immatriculation.prenom || 'N/A'}</span>
              </div>
            ` : ''}
            ${immatriculation.typeContribuable === 'MORALE' ? `
              <div class="info-item">
                <label>Raison sociale:</label>
                <span>${immatriculation.raisonSociale || 'N/A'}</span>
              </div>
              <div class="info-item">
                <label>Forme juridique:</label>
                <span>${immatriculation.formeJuridique || 'N/A'}</span>
              </div>
            ` : ''}
          </div>
        </div>

        <div class="section">
          <h2>Coordonnées</h2>
          <div class="info-grid">
            <div class="info-item">
              <label>Email:</label>
              <span>${immatriculation.email || 'N/A'}</span>
            </div>
            <div class="info-item">
              <label>Téléphone:</label>
              <span>${immatriculation.telephone || 'N/A'}</span>
            </div>
            <div class="info-item full-width">
              <label>Adresse:</label>
              <span>${formatAdresse()}</span>
            </div>
          </div>
        </div>

        ${immatriculation.typeContribuable === 'PHYSIQUE' ? `
        <div class="section">
          <h2>Informations personnelles</h2>
          <div class="info-grid">
            <div class="info-item">
              <label>CIN:</label>
              <span>${immatriculation.cin || 'N/A'}</span>
            </div>
            <div class="info-item">
              <label>Date de naissance:</label>
              <span>${formatDate(immatriculation.dateNaissance)}</span>
            </div>
            <div class="info-item">
              <label>Nationalité:</label>
              <span>${immatriculation.nationalite || 'N/A'}</span>
            </div>
          </div>
        </div>
        ` : ''}

        ${immatriculation.typeContribuable === 'MORALE' ? `
        <div class="section">
          <h2>Informations entreprise</h2>
          <div class="info-grid">
            <div class="info-item">
              <label>Actionnaire principal:</label>
              <span>${immatriculation.actionnaire || 'N/A'}</span>
            </div>
            <div class="info-item">
              <label>Représentant légal:</label>
              <span>${immatriculation.representantLegal || 'N/A'}</span>
            </div>
            <div class="info-item">
              <label>Registre de commerce:</label>
              <span>${immatriculation.registreCommerce || 'N/A'}</span>
            </div>
          </div>
        </div>
        ` : ''}

        <div class="section">
          <h2>Informations professionnelles</h2>
          <div class="info-grid">
            <div class="info-item">
              <label>Type d'activité:</label>
              <span>${immatriculation.typeActivite || 'N/A'}</span>
            </div>
            <div class="info-item">
              <label>Secteur:</label>
              <span>${immatriculation.secteur || 'N/A'}</span>
            </div>
            <div class="info-item full-width">
              <label>Adresse professionnelle:</label>
              <span>${immatriculation.adresseProfessionnelle || 'N/A'}</span>
            </div>
            <div class="info-item">
              <label>Date début d'activité:</label>
              <span>${formatDate(immatriculation.dateDebutActivite)}</span>
            </div>
            <div class="info-item full-width">
              <label>Description de l'activité:</label>
              <span>${immatriculation.descriptionActivite || 'N/A'}</span>
            </div>
          </div>
        </div>

       

        <div class="footer">
          <p>Document généré par SmartTax - Système de Gestion Fiscale</p>
        </div>
      </body>
      </html>
    `;
  }

  deleteImmatriculation(immatriculation: any): void {
    // Ouvrir le modal de confirmation au lieu de supprimer directement
    this.immatriculationToDelete = immatriculation;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (!this.immatriculationToDelete) return;
    
    // Déplacer vers la corbeille au lieu de supprimer définitivement
    this.trashService.moveToTrash(this.immatriculationToDelete.id.toString(), this.userName || 'admin').subscribe({
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
        
        // Rediriger vers la page de corbeille
        this.navigateToTrash();
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

  // Navigation vers la corbeille
  navigateToTrash(): void {
    // Rediriger vers la page de corbeille
    window.location.href = '/trash';
  }

  // ==================== GESTION DE LA VALIDATION ====================
  
  validateImmatriculation(): void {
    if (!this.selectedImmatriculation) return;
    
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
        this.closeImmatriculationDetails();
      },
      error: (error: any) => {
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
    if (!this.selectedImmatriculation) return;
    
    this.immatriculationToReject = this.selectedImmatriculation;
    this.rejectionReason = '';
    this.showRejectModal = true;
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.immatriculationToReject = null;
    this.rejectionReason = '';
  }

  confirmReject(): void {
    if (!this.immatriculationToReject || !this.rejectionReason.trim()) return;
    
    this.immatriculationService.rejectDossier(this.immatriculationToReject.id, this.rejectionReason).subscribe({
      next: (response: any) => {
        console.log('✅ Immatriculation rejetée avec succès:', response);
        
        // Vérifier si la réponse contient une notification personnalisée
        if (response.notification) {
          this.showNotification(
            response.notification.text || 'Dossier rejeté avec succès !',
            response.notification.type || 'error'
          );
        } else {
          this.showNotification(
            'Dossier rejeté avec succès !',
            'error'
          );
        }
        
        // Mettre à jour le statut dans la liste locale
        const index = this.immatriculations.findIndex(i => i.id === this.immatriculationToReject.id);
        if (index !== -1) {
          this.immatriculations[index] = response.data || response;
          this.applyFilter();
        }
        
        // Mettre à jour l'immatriculation sélectionnée
        this.selectedImmatriculation = response.data || response;
        
        // Fermer les modals
        this.closeRejectModal();
        this.closeImmatriculationDetails();
      },
      error: (error: any) => {
        console.error('❌ Erreur lors du rejet:', error);
        this.showNotification(
          'Erreur lors du rejet du dossier',
          'error'
        );
        this.closeRejectModal();
      }
    });
  }

  resetToEnCoursVerification(immatriculation: any): void {
    if (!immatriculation) return;
    
    this.immatriculationService.submitDossier(immatriculation.id).subscribe({
      next: (response: any) => {
        console.log('✅ Immatriculation remise en cours de vérification:', response);
        
        this.showNotification(
          'Dossier remis en cours de vérification avec succès !',
          'warning'
        );
        
        // Mettre à jour le statut dans la liste locale
        const index = this.immatriculations.findIndex(i => i.id === immatriculation.id);
        if (index !== -1) {
          this.immatriculations[index] = response.data || response;
          this.applyFilter();
        }
        
        // Mettre à jour l'immatriculation sélectionnée
        this.selectedImmatriculation = response.data || response;
        
        // Fermer le modal
        this.closeImmatriculationDetails();
      },
      error: (error: any) => {
        console.error('❌ Erreur lors de la remise en cours:', error);
        this.showNotification(
          'Erreur lors de la remise en cours de vérification',
          'error'
        );
      }
    });
  }

  viewRejectionReason(immatriculation: any): void {
    this.rejectionReasonToView = immatriculation.motifRejet || 'Aucune raison spécifiée';
    this.showRejectionReasonModal = true;
  }

  closeRejectionReasonModal(): void {
    this.showRejectionReasonModal = false;
    this.rejectionReasonToView = '';
  }

  showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    // Implémenter un système de notification (toast, alert, etc.)
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Pour l'instant, utiliser une alerte simple
    // TODO: Implémenter un système de toast moderne
    const alertClass = type === 'success' ? 'alert-success' : 
                      type === 'error' ? 'alert-danger' : 
                      type === 'warning' ? 'alert-warning' : 'alert-info';
    
    // Créer une alerte stylisée
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert ${alertClass}`;
    alertDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      padding: 15px 20px;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease;
      max-width: 300px;
    `;
    
    const icon = type === 'success' ? '✅' : 
                 type === 'error' ? '❌' : 
                 type === 'warning' ? '⚠️' : 'ℹ️';
    
    alertDiv.innerHTML = `${icon} ${message}`;
    document.body.appendChild(alertDiv);
    
    // Animation d'entrée
    setTimeout(() => {
      alertDiv.style.opacity = '1';
      alertDiv.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto-suppression après 4 secondes
    setTimeout(() => {
      alertDiv.style.opacity = '0';
      alertDiv.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (document.body.contains(alertDiv)) {
          document.body.removeChild(alertDiv);
        }
      }, 300);
    }, 4000);
  }

  // Méthodes pour gérer les documents
  viewDocument(fileUrl: string, title: string): void {
    this.imageModalUrl = fileUrl;
    this.imageModalTitle = title;
    this.showImageModal = true;
  }

  // Méthode pour fermer le modal d'image
  closeImageModal(): void {
    this.showImageModal = false;
    this.imageModalUrl = '';
    this.imageModalTitle = '';
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
