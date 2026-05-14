import { HttpClient } from '@angular/common/http';
import { Component, HostListener, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  AgentDownloadDocument,
  DOCUMENT_LIBRARY_CATEGORIES,
  DownloadDocumentCatalogService,
  LibraryCategory,
  LibraryCategoryId,
} from '../../services/download-document-catalog.service';

@Component({
  selector: 'app-document-telecharger',
  templateUrl: './document-telecharger.component.html',
  styleUrls: ['./document-telecharger.component.css'],
})
export class DocumentTelechargerComponent implements OnInit {
  readonly categories: LibraryCategory[] = DOCUMENT_LIBRARY_CATEGORIES;

  documents: AgentDownloadDocument[] = [];
  loading = true;
  loadError: string | null = null;

  searchQuery = '';
  filterCategory: 'all' | LibraryCategoryId = 'all';

  /** Modale aperçu PDF */
  previewModalOpen = false;
  previewTitle = '';
  previewLoading = false;
  previewError = '';
  previewSafeUrl: SafeResourceUrl | null = null;
  private previewBlobUrl: string | null = null;

  constructor(
    private readonly catalog: DownloadDocumentCatalogService,
    private readonly http: HttpClient,
    private readonly sanitizer: DomSanitizer
  ) {}

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(ev: KeyboardEvent): void {
    if (ev.key === 'Escape' && this.previewModalOpen) {
      this.closePreview();
    }
  }

  ngOnInit(): void {
    this.loadDocuments();
  }

  loadDocuments(): void {
    this.loading = true;
    this.loadError = null;
    this.catalog.fetchPublicList().subscribe({
      next: (list) => {
        this.documents = list;
        this.loading = false;
      },
      error: () => {
        this.documents = [];
        this.loading = false;
        this.loadError = 'Impossible de charger les documents. Vérifiez que le serveur est disponible.';
      },
    });
  }

  categoriesToShow(): LibraryCategory[] {
    if (this.filterCategory === 'all') {
      return this.categories;
    }
    return this.categories.filter((c) => c.id === this.filterCategory);
  }

  countInCategory(catId: LibraryCategoryId): number {
    return this.documents.filter((d) => d.categoryId === catId).length;
  }

  documentsForCategory(catId: LibraryCategoryId): AgentDownloadDocument[] {
    const q = this.searchQuery.trim().toLowerCase();
    return this.documents
      .filter((d) => d.categoryId === catId)
      .filter((d) => {
        if (!q) {
          return true;
        }
        const blob = [d.title, d.description, d.originalFileName || ''].join(' ').toLowerCase();
        return blob.includes(q);
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  setFilter(cat: LibraryCategoryId | 'all'): void {
    this.filterCategory = cat;
    const el = document.getElementById('documents');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  categoryBadgeClass(catId: LibraryCategoryId): string {
    switch (catId) {
      case 'formulaires':
        return 'formulaire';
      case 'guides':
        return 'guide';
      case 'lois':
        return 'loi';
      case 'modeles':
        return 'modele';
      default:
        return 'formulaire';
    }
  }

  categoryLabel(catId: LibraryCategoryId): string {
    const c = this.categories.find((x) => x.id === catId);
    return c?.name || catId;
  }

  iconKind(doc: AgentDownloadDocument): string {
    const name = (doc.originalFileName || doc.title || '').toLowerCase();
    const m = (doc.mimeType || '').toLowerCase();
    if (m.includes('pdf') || name.endsWith('.pdf')) {
      return 'fa-file-pdf';
    }
    if (m.includes('word') || name.endsWith('.doc') || name.endsWith('.docx')) {
      return 'fa-file-word';
    }
    if (m.includes('excel') || m.includes('spreadsheet') || name.endsWith('.xls') || name.endsWith('.xlsx')) {
      return 'fa-file-excel';
    }
    if (m.includes('powerpoint') || m.includes('presentation') || name.endsWith('.ppt') || name.endsWith('.pptx')) {
      return 'fa-file-powerpoint';
    }
    if (m.includes('zip') || name.endsWith('.zip') || name.endsWith('.rar')) {
      return 'fa-file-archive';
    }
    return 'fa-file-alt';
  }

  formatUpdated(iso?: string): string {
    if (!iso) {
      return '—';
    }
    try {
      return new Date(iso).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  }

  preview(doc: AgentDownloadDocument): void {
    const url = doc.downloadUrl?.trim();
    if (!url) {
      return;
    }
    this.revokePreviewBlob();
    this.previewError = '';
    this.previewSafeUrl = null;
    this.previewTitle = doc.title || 'Document';
    this.previewModalOpen = true;
    this.previewLoading = true;
    document.body.style.overflow = 'hidden';

    if (!this.isLikelyPdf(doc)) {
      this.previewLoading = false;
      this.previewError =
        "L'affichage intégré est prévu pour les fichiers PDF. Utilisez « Télécharger » pour ouvrir ce document.";
      return;
    }

    if (this.isApiStoredFileUrl(url)) {
      this.http.get(url, { responseType: 'blob' }).subscribe({
        next: (blob) => {
          this.revokePreviewBlob();
          this.previewBlobUrl = URL.createObjectURL(blob);
          this.previewSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.previewBlobUrl);
          this.previewLoading = false;
        },
        error: () => {
          this.previewLoading = false;
          this.previewError =
            "Impossible de charger l'aperçu. Vérifiez la connexion au serveur ou utilisez « Télécharger ».";
        },
      });
      return;
    }

    this.previewSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.previewLoading = false;
  }

  closePreview(): void {
    if (!this.previewModalOpen) {
      return;
    }
    this.revokePreviewBlob();
    this.previewSafeUrl = null;
    this.previewModalOpen = false;
    this.previewLoading = false;
    this.previewError = '';
    document.body.style.overflow = '';
  }

  download(doc: AgentDownloadDocument): void {
    this.catalog.triggerDownload(doc);
  }

  canOpen(doc: AgentDownloadDocument): boolean {
    return !!doc.downloadUrl?.trim();
  }

  formatSize(bytes?: number): string {
    return this.catalog.formatSize(bytes);
  }

  private revokePreviewBlob(): void {
    if (this.previewBlobUrl) {
      URL.revokeObjectURL(this.previewBlobUrl);
      this.previewBlobUrl = null;
    }
  }

  /** Fichiers hébergés par notre API (évite Content-Disposition: attachment dans l'iframe). */
  private isApiStoredFileUrl(url: string): boolean {
    try {
      const u = new URL(url);
      return /\/api\/download-documents\/\d+\/file$/.test(u.pathname);
    } catch {
      return false;
    }
  }

  private isLikelyPdf(doc: AgentDownloadDocument): boolean {
    const name = (doc.originalFileName || doc.title || '').toLowerCase();
    const mime = (doc.mimeType || '').toLowerCase();
    if (mime.includes('pdf')) {
      return true;
    }
    if (name.endsWith('.pdf')) {
      return true;
    }
    const u = doc.downloadUrl?.trim() || '';
    return this.isApiStoredFileUrl(u);
  }
}
