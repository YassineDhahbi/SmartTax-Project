import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth/auth.service';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ImmatriculationService } from '../../services/immatriculation.service';
import { UserService } from '../../services/user/user.service';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

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
  
  // Gestion de l'affichage des documents
  selectedDocument: { url: string; title: string; type: string } | null = null;
  showDocumentModal = false;
  
  // Gestion du zoom pour les documents
  zoomLevel = 1;
  imageLoaded = false;
  imageError = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private http: HttpClient,
    private immatriculationService: ImmatriculationService,
    private userService: UserService
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
      const userEmail = this.authService.getUserEmail();
      this.currentUser = {
        id: localStorage.getItem('userId'),
        email: userEmail,
        role: this.userRole
      };
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

  goToReclamation(): void {
    this.router.navigate(['/Reclamation']);
  }

  loadUserImmatriculation(): void {
    this.isLoadingImmatriculation = true;
    const userEmail = this.authService.getUserEmail();
    let userTin = this.authService.getUserMatricule();

    const loadDossier = (email: string, tin: string) => {
      if (!email && !tin) {
        this.hasImmatriculation = false;
        this.isLoadingImmatriculation = false;
        return;
      }

      this.immatriculationService.getMyDossier(email, tin).subscribe({
        next: (data) => {
          const dossiers = data || [];
          if (dossiers.length > 0) {
            this.immatriculation = this.pickBestDossier(dossiers);
            this.hasImmatriculation = true;
          } else {
            this.hasImmatriculation = false;
          }
          this.isLoadingImmatriculation = false;
        },
        error: () => {
          this.hasImmatriculation = false;
          this.isLoadingImmatriculation = false;
        }
      });
    };

    if (userTin || !this.authService.isLoggedIn()) {
      loadDossier(userEmail, userTin);
      return;
    }

    this.userService.getUserDetails().subscribe({
      next: (user) => {
        userTin = (user.matricule || '').trim();
        if (userTin) {
          localStorage.setItem('matricule', userTin);
          localStorage.setItem('tin', userTin);
        }
        const email = userEmail || (user.email || '').trim();
        loadDossier(email, userTin);
      },
      error: () => loadDossier(userEmail, userTin)
    });
  }

  private pickBestDossier(dossiers: any[]): any {
    const statusPriority: Record<string, number> = {
      VALIDE: 0,
      EN_COURS_VERIFICATION: 1,
      SOUMIS: 2,
      REJETE: 3,
      BROUILLON: 4
    };

    return [...dossiers].sort((a, b) => {
      const statusDiff =
        (statusPriority[a.status] ?? 99) - (statusPriority[b.status] ?? 99);
      if (statusDiff !== 0) {
        return statusDiff;
      }
      const dateA = new Date(a.dateCreation || 0).getTime();
      const dateB = new Date(b.dateCreation || 0).getTime();
      return dateB - dateA;
    })[0];
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

  downloadDocument(fileUrl: string | undefined, filename: string | undefined): void {
    if (!fileUrl || !filename) return;
    
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = filename;
    link.click();
  }

  downloadAllDocuments(): void {
    if (!this.immatriculation) {
      return;
    }

    const dossierNumber = (this.immatriculation.dossierNumber || 'dossier').toString().replace(/\s+/g, '-');
    const documents: Array<{ url: string; filename: string }> = [];

    if (this.immatriculation.identiteFile) {
      documents.push({
        url: this.immatriculation.identiteFile,
        filename: `${dossierNumber}-piece-identite`
      });
    }

    if (this.immatriculation.activiteFile) {
      documents.push({
        url: this.immatriculation.activiteFile,
        filename: `${dossierNumber}-document-activite`
      });
    }

    if (this.immatriculation.photoFile) {
      documents.push({
        url: this.immatriculation.photoFile,
        filename: `${dossierNumber}-photo-personnelle`
      });
    }

    if (Array.isArray(this.immatriculation.autresFiles)) {
      this.immatriculation.autresFiles.forEach((file: string, index: number) => {
        if (file) {
          documents.push({
            url: file,
            filename: `${dossierNumber}-autre-document-${index + 1}`
          });
        }
      });
    }

    if (documents.length === 0) {
      return;
    }

    documents.forEach((doc, index) => {
      setTimeout(() => {
        this.downloadDocument(doc.url, doc.filename);
      }, index * 250);
    });
  }

  async downloadDossierPdf(): Promise<void> {
    if (!this.immatriculation) {
      return;
    }

    const dossier = this.immatriculation;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = this.generateProfessionalDossierPdfContent(dossier);
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-99999px';
    tempDiv.style.top = '0';
    tempDiv.style.width = '794px';
    tempDiv.style.backgroundColor = '#ffffff';
    document.body.appendChild(tempDiv);

    try {
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 794,
        windowWidth: 794
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const margin = 10;
      const pageWidth = pdf.internal.pageSize.getWidth() - margin * 2;
      const pageHeight = pdf.internal.pageSize.getHeight() - margin * 2;
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const imgData = canvas.toDataURL('image/png');

      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + margin;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      await this.addDocumentPreviewPages(pdf, dossier);

      const fileName = `dossier-${(dossier.dossierNumber || 'immatriculation').toString().replace(/\s+/g, '-')}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Erreur lors de la generation du PDF:', error);
    } finally {
      if (document.body.contains(tempDiv)) {
        document.body.removeChild(tempDiv);
      }
    }
  }

  private generateProfessionalDossierPdfContent(dossier: any): string {
    const safe = (value: any): string => this.escapeHtml(value ? String(value) : 'N/A');
    const contributorName = dossier.typeContribuable === 'MORALE'
      ? safe(dossier.raisonSociale || 'N/A')
      : safe(`${dossier.prenom || ''} ${dossier.nom || ''}`.trim() || 'N/A');

    return `
      <div style="font-family: Arial, sans-serif; color: #1f2937; padding: 24px; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #1d4ed8, #7c3aed); color: #ffffff; border-radius: 14px; padding: 22px 24px; margin-bottom: 16px;">
          <div style="font-size: 12px; letter-spacing: 1px; text-transform: uppercase; opacity: 0.95;">SmartTax</div>
          <h1 style="margin: 8px 0 6px; font-size: 26px;">Dossier d'immatriculation</h1>
          <div style="font-size: 14px;">Numero dossier: <strong>${safe(dossier.dossierNumber || dossier.id)}</strong></div>
          <div style="font-size: 13px; margin-top: 4px;">Date de generation: ${new Date().toLocaleDateString('fr-FR')}</div>
        </div>

        <div style="display: flex; gap: 10px; margin-bottom: 16px;">
          <div style="flex: 1; background: #eff6ff; border: 1px solid #dbeafe; border-radius: 10px; padding: 10px 12px;">
            <div style="font-size: 11px; color: #2563eb; text-transform: uppercase;">Type</div>
            <div style="font-size: 14px; font-weight: 700;">${safe(dossier.typeContribuable)}</div>
          </div>
          <div style="flex: 1; background: #ecfeff; border: 1px solid #cffafe; border-radius: 10px; padding: 10px 12px;">
            <div style="font-size: 11px; color: #0891b2; text-transform: uppercase;">Statut</div>
            <div style="font-size: 14px; font-weight: 700;">${safe(this.formatStatus(dossier.status))}</div>
          </div>
          <div style="flex: 1; background: #f5f3ff; border: 1px solid #e9d5ff; border-radius: 10px; padding: 10px 12px;">
            <div style="font-size: 11px; color: #7c3aed; text-transform: uppercase;">Contribuable</div>
            <div style="font-size: 14px; font-weight: 700;">${contributorName}</div>
          </div>
        </div>

        <div style="border: 1px solid #e5e7eb; border-radius: 12px; margin-bottom: 14px;">
          <div style="padding: 10px 14px; background: #f8fafc; border-bottom: 1px solid #e5e7eb; font-size: 14px; font-weight: 700;">Informations de contact</div>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr><td style="padding: 10px 14px; width: 34%; color: #64748b;">Email</td><td style="padding: 10px 14px;">${safe(dossier.email)}</td></tr>
            <tr style="background: #fcfcfd;"><td style="padding: 10px 14px; color: #64748b;">Telephone</td><td style="padding: 10px 14px;">${safe(dossier.telephone)}</td></tr>
            <tr><td style="padding: 10px 14px; color: #64748b;">Adresse</td><td style="padding: 10px 14px;">${safe(dossier.adresse)}</td></tr>
            <tr style="background: #fcfcfd;"><td style="padding: 10px 14px; color: #64748b;">Ville</td><td style="padding: 10px 14px;">${safe(dossier.ville)}</td></tr>
          </table>
        </div>

        <div style="border: 1px solid #e5e7eb; border-radius: 12px; margin-bottom: 14px;">
          <div style="padding: 10px 14px; background: #f8fafc; border-bottom: 1px solid #e5e7eb; font-size: 14px; font-weight: 700;">Informations professionnelles</div>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr><td style="padding: 10px 14px; width: 34%; color: #64748b;">Type d'activite</td><td style="padding: 10px 14px;">${safe(dossier.typeActivite)}</td></tr>
            <tr style="background: #fcfcfd;"><td style="padding: 10px 14px; color: #64748b;">Secteur</td><td style="padding: 10px 14px;">${safe(dossier.secteur)}</td></tr>
            <tr><td style="padding: 10px 14px; color: #64748b;">Adresse professionnelle</td><td style="padding: 10px 14px;">${safe(dossier.adresseProfessionnelle)}</td></tr>
            <tr style="background: #fcfcfd;"><td style="padding: 10px 14px; color: #64748b;">Date debut d'activite</td><td style="padding: 10px 14px;">${safe(this.formatDate(dossier.dateDebutActivite))}</td></tr>
            <tr><td style="padding: 10px 14px; color: #64748b;">Description</td><td style="padding: 10px 14px;">${safe(dossier.descriptionActivite)}</td></tr>
          </table>
        </div>

        <div style="border: 1px solid #e5e7eb; border-radius: 12px; margin-bottom: 14px;">
          <div style="padding: 10px 14px; background: #f8fafc; border-bottom: 1px solid #e5e7eb; font-size: 14px; font-weight: 700;">Documents fournis</div>
          <div style="padding: 12px 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px;">
            <div>Piece d'identite: <strong>${dossier.identiteFile ? 'Oui' : 'Non'}</strong></div>
            <div>Document d'activite: <strong>${dossier.activiteFile ? 'Oui' : 'Non'}</strong></div>
            <div>Photo personnelle: <strong>${dossier.photoFile ? 'Oui' : 'Non'}</strong></div>
            <div>Autres documents: <strong>${Array.isArray(dossier.autresFiles) ? dossier.autresFiles.length : 0}</strong></div>
          </div>
          <div style="padding: 0 14px 14px; font-size: 12px; color: #64748b;">
            Les apercus des documents sont ajoutes dans les pages suivantes.
          </div>
        </div>

        <div style="margin-top: 18px; padding-top: 12px; border-top: 1px solid #e5e7eb; color: #64748b; font-size: 11px; text-align: center;">
          Document genere automatiquement par SmartTax - Direction Generale des Impots
        </div>
      </div>
    `;
  }

  private isDisplayableImage(url: string): boolean {
    const normalized = url.toLowerCase();
    return normalized.startsWith('data:image/')
      || normalized.endsWith('.png')
      || normalized.endsWith('.jpg')
      || normalized.endsWith('.jpeg')
      || normalized.endsWith('.webp');
  }

  private async addDocumentPreviewPages(pdf: jsPDF, dossier: any): Promise<void> {
    const docs: Array<{ title: string; url: string }> = [];

    const pushDoc = (title: string, url: string | undefined) => {
      if (url && this.isDisplayableImage(url)) {
        docs.push({ title, url });
      }
    };

    pushDoc("Piece d'identite", dossier.identiteFile);
    pushDoc("Document d'activite", dossier.activiteFile);
    pushDoc('Photo personnelle', dossier.photoFile);

    if (Array.isArray(dossier.autresFiles)) {
      dossier.autresFiles.forEach((file: string, index: number) => {
        pushDoc(`Autre document ${index + 1}`, file);
      });
    }

    for (const doc of docs) {
      pdf.addPage();

      pdf.setFillColor(248, 250, 252);
      pdf.rect(10, 10, 190, 18, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.setTextColor(30, 41, 59);
      pdf.text(doc.title, 14, 21);

      const imageProps = await this.getImageDimensions(doc.url);
      const maxWidth = 176;
      const maxHeight = 240;
      const ratio = Math.min(maxWidth / imageProps.width, maxHeight / imageProps.height);
      const renderWidth = imageProps.width * ratio;
      const renderHeight = imageProps.height * ratio;
      const x = (210 - renderWidth) / 2;
      const y = 36 + (maxHeight - renderHeight) / 2;
      const imageFormat = this.getImageFormat(doc.url);

      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(16, 34, 178, 244, 3, 3, 'S');
      pdf.addImage(doc.url, imageFormat, x, y, renderWidth, renderHeight);
    }
  }

  private getImageDimensions(url: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth || 1200, height: img.naturalHeight || 800 });
      img.onerror = () => reject(new Error('Impossible de charger image'));
      img.src = url;
    });
  }

  private getImageFormat(url: string): 'PNG' | 'JPEG' {
    const normalized = url.toLowerCase();
    if (normalized.startsWith('data:image/jpeg') || normalized.startsWith('data:image/jpg') || normalized.endsWith('.jpg') || normalized.endsWith('.jpeg')) {
      return 'JPEG';
    }
    return 'PNG';
  }

  private escapeHtml(value: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return value.replace(/[&<>"']/g, (char) => map[char]);
  }

  viewDocument(fileUrl: string, title: string): void {
    // Afficher le document dans la page au lieu d'ouvrir un nouvel onglet
    this.selectedDocument = {
      url: fileUrl,
      title: title,
      type: this.getDocumentType(fileUrl)
    };
    this.showDocumentModal = true;
    // Réinitialiser le zoom et l'état de l'image
    this.zoomLevel = 1;
    this.imageLoaded = false;
    this.imageError = false;
  }

  getDocumentType(fileUrl: string): string {
    if (fileUrl.includes('identite')) return 'identite';
    if (fileUrl.includes('activite')) return 'activite';
    if (fileUrl.includes('photo')) return 'photo';
    return 'other';
  }

  closeDocumentModal(): void {
    this.selectedDocument = null;
    this.showDocumentModal = false;
    this.zoomLevel = 1;
    this.imageLoaded = false;
    this.imageError = false;
  }

  // Méthodes pour le zoom
  zoomIn(): void {
    if (this.zoomLevel < 3) {
      this.zoomLevel += 0.25;
    }
  }

  zoomOut(): void {
    if (this.zoomLevel > 0.5) {
      this.zoomLevel -= 0.25;
    }
  }

  resetZoom(): void {
    this.zoomLevel = 1;
  }

  getZoomStyle(): string {
    return `transform: scale(${this.zoomLevel})`;
  }

  getDocumentFileName(title: string | undefined): string {
    if (!title) return 'document';
    return title.replace(/\s+/g, '-').toLowerCase();
  }

  // Méthodes pour le chargement des images
  onImageLoad(): void {
    this.imageLoaded = true;
    this.imageError = false;
  }

  onImageError(): void {
    this.imageLoaded = false;
    this.imageError = true;
  }

}
