import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import {
  AgentDownloadDocument,
  DOCUMENT_LIBRARY_CATEGORIES,
  DownloadDocumentCatalogService,
  LibraryCategory,
  LibraryCategoryId,
  MAX_UPLOAD_FILE_BYTES,
} from '../../services/download-document-catalog.service';

@Component({
  selector: 'app-documents',
  templateUrl: './documents.component.html',
  styleUrls: ['./documents.component.css'],
})
export class DocumentsComponent implements OnInit, OnDestroy {
  readonly categories: LibraryCategory[] = DOCUMENT_LIBRARY_CATEGORIES;

  documents: AgentDownloadDocument[] = [];

  /** Recherche & filtre liste */
  searchQuery = '';
  filterCategoryId: 'all' | LibraryCategoryId = 'all';

  selectedCategoryId: LibraryCategoryId = 'formulaires';
  fileTitle = '';
  fileDescription = '';
  fileUrl = '';
  pendingFile: File | null = null;
  fileError = '';

  feedback = '';
  feedbackIsError = false;

  /** Modale suppression */
  showDeleteModal = false;
  documentToDelete: AgentDownloadDocument | null = null;

  private sub?: Subscription;

  constructor(private readonly catalog: DownloadDocumentCatalogService) {}

  ngOnInit(): void {
    this.sub = this.catalog.watch().subscribe((d) => (this.documents = d));
    this.catalog.loadAll().subscribe({
      error: (e: Error) => this.setFeedback(e.message, true),
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  docsFor(catId: LibraryCategoryId): AgentDownloadDocument[] {
    return this.catalog.documentsInCategory(catId);
  }

  filteredDocsFor(catId: LibraryCategoryId): AgentDownloadDocument[] {
    const list = this.docsFor(catId);
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      return list;
    }
    return list.filter((d) => {
      const hay = [
        d.title,
        d.description || '',
        d.originalFileName || '',
        d.downloadUrl || '',
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }

  visibleCategories(): LibraryCategory[] {
    if (this.filterCategoryId === 'all') {
      return this.categories;
    }
    return this.categories.filter((c) => c.id === this.filterCategoryId);
  }

  isFilterActive(): boolean {
    return !!this.searchQuery.trim() || this.filterCategoryId !== 'all';
  }

  clearListFilters(): void {
    this.searchQuery = '';
    this.filterCategoryId = 'all';
  }

  displayedResultsCount(): number {
    return this.visibleCategories().reduce((sum, c) => sum + this.filteredDocsFor(c.id).length, 0);
  }

  countIn(catId: LibraryCategoryId): number {
    return this.catalog.countInCategory(catId);
  }

  onPickFile(ev: Event): void {
    this.fileError = '';
    this.pendingFile = null;
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    if (!this.isPdfFile(file)) {
      this.fileError = 'Seuls les fichiers PDF (.pdf) sont acceptés.';
      input.value = '';
      return;
    }
    if (file.size > MAX_UPLOAD_FILE_BYTES) {
      this.fileError = `Fichier trop lourd (max ${Math.round(MAX_UPLOAD_FILE_BYTES / 1024 / 1024)} Mo). Indiquez un lien HTTPS.`;
      input.value = '';
      return;
    }
    this.pendingFile = file;
  }

  submitDocument(): void {
    this.clearFeedback();
    const url = this.fileUrl.trim();
    if (!url && !this.pendingFile) {
      this.setFeedback('Choisissez un fichier ou saisissez un lien de téléchargement.', true);
      return;
    }
    if (url && this.pendingFile) {
      this.setFeedback('Utilisez soit un fichier soit un lien, pas les deux.', true);
      return;
    }
    if (this.pendingFile && !this.isPdfFile(this.pendingFile)) {
      this.setFeedback('Seuls les fichiers PDF (.pdf) sont acceptés.', true);
      return;
    }
    this.catalog
      .upload({
        categoryId: this.selectedCategoryId,
        title: this.fileTitle,
        description: this.fileDescription,
        downloadUrl: url || undefined,
        file: this.pendingFile || undefined,
      })
      .subscribe({
        next: () => {
          this.resetForm();
          this.setFeedback('Document enregistré en base dans la catégorie sélectionnée.', false);
        },
        error: (e: Error) => this.setFeedback(e.message, true),
      });
  }

  openDeleteModal(doc: AgentDownloadDocument, ev?: Event): void {
    ev?.stopPropagation();
    this.documentToDelete = doc;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.documentToDelete = null;
  }

  confirmDelete(): void {
    const doc = this.documentToDelete;
    if (!doc) {
      return;
    }
    this.catalog.deleteDocument(doc.id).subscribe({
      next: () => {
        this.closeDeleteModal();
        this.setFeedback('Document supprimé.', false);
      },
      error: (e: Error) => {
        this.closeDeleteModal();
        this.setFeedback(e.message, true);
      },
    });
  }

  download(doc: AgentDownloadDocument): void {
    this.catalog.triggerDownload(doc);
  }

  formatSize(doc: AgentDownloadDocument): string {
    return this.catalog.formatSize(doc.sizeBytes);
  }

  formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  }

  resetForm(): void {
    this.fileTitle = '';
    this.fileDescription = '';
    this.fileUrl = '';
    this.pendingFile = null;
    this.fileError = '';
  }

  private setFeedback(msg: string, isError: boolean): void {
    this.feedback = msg;
    this.feedbackIsError = isError;
  }

  private clearFeedback(): void {
    this.feedback = '';
    this.feedbackIsError = false;
  }

  /** Extension .pdf + type MIME cohérent (les navigateurs envoient parfois application/octet-stream). */
  private isPdfFile(file: File): boolean {
    const name = (file.name || '').trim().toLowerCase();
    if (!name.endsWith('.pdf')) {
      return false;
    }
    const t = (file.type || '').trim().toLowerCase();
    if (!t) {
      return true;
    }
    return (
      t === 'application/pdf' ||
      t === 'application/x-pdf' ||
      t === 'application/octet-stream'
    );
  }
}
