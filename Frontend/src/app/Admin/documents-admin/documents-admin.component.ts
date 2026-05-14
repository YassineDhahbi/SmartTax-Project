import { Component } from '@angular/core';
import {
  AgentDownloadDocument,
  DownloadDocumentCatalogService,
} from '../../services/download-document-catalog.service';

@Component({
  selector: 'app-documents-admin',
  templateUrl: './documents-admin.component.html',
  styleUrls: [
    '../demande-information-admin/demande-information-admin.component.css',
    './documents-admin.component.css',
  ],
})
export class DocumentsAdminComponent {
  statsOpen = false;
  statsLoading = false;
  statsError: string | null = null;
  /** Tri par nombre de téléchargements (décroissant), chargé à l’ouverture du panneau stats. */
  statsRows: AgentDownloadDocument[] = [];

  constructor(private readonly catalog: DownloadDocumentCatalogService) {}

  openStats(): void {
    this.statsOpen = true;
    this.statsLoading = true;
    this.statsError = null;
    this.statsRows = [];
    this.catalog.loadAll().subscribe({
      next: () => {
        this.statsRows = [...this.catalog.snapshot()].sort(
          (a, b) => (b.downloadCount ?? 0) - (a.downloadCount ?? 0)
        );
        this.statsLoading = false;
      },
      error: () => {
        this.statsError = 'Impossible de charger les statistiques.';
        this.statsLoading = false;
      },
    });
  }

  closeStats(): void {
    this.statsOpen = false;
  }

  /** Documents avec au moins un téléchargement, déjà triés par volume. */
  topDownloaded(max = 8): AgentDownloadDocument[] {
    return this.statsRows.filter((d) => (d.downloadCount ?? 0) > 0).slice(0, max);
  }

  categoryLabel(catId: string): string {
    return this.catalog.categories.find((c) => c.id === catId)?.name ?? catId;
  }

  displayFileLabel(doc: AgentDownloadDocument): string {
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
}
