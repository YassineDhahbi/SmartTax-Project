import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

/** Aligne sur spring.servlet.multipart.max-file-size (10 Mo) */
export const MAX_UPLOAD_FILE_BYTES = 10 * 1024 * 1024;

export type LibraryCategoryId = 'formulaires' | 'guides' | 'lois' | 'modeles';

export interface LibraryCategory {
  id: LibraryCategoryId;
  name: string;
  description: string;
  icon: 'file' | 'book' | 'gavel' | 'copy';
}

export const DOCUMENT_LIBRARY_CATEGORIES: LibraryCategory[] = [
  {
    id: 'formulaires',
    name: 'Formulaires',
    description: 'D\u00e9clarations, attestations et demandes officielles',
    icon: 'file',
  },
  {
    id: 'guides',
    name: 'Guides',
    description: 'Proc\u00e9dures pas \u00e0 pas et aide \u00e0 la saisie',
    icon: 'book',
  },
  {
    id: 'lois',
    name: 'Lois & R\u00e8glements',
    description: 'Textes juridiques et r\u00e9f\u00e9rences r\u00e9glementaires',
    icon: 'gavel',
  },
  {
    id: 'modeles',
    name: 'Mod\u00e8les',
    description: 'Mod\u00e8les types et documents pr\u00e9format\u00e9s',
    icon: 'copy',
  },
];

export interface AgentDownloadDocument {
  id: string;
  categoryId: LibraryCategoryId;
  title: string;
  description: string;
  updatedAt: string;
  downloadUrl?: string;
  originalFileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  /** Compteur renvoye par l'API (GET liste). */
  downloadCount?: number;
}

interface DownloadLibraryDocumentApiDto {
  id: number;
  categoryId: string;
  title: string;
  description?: string | null;
  updatedAt: string;
  downloadUrl?: string | null;
  originalFileName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  downloadCount?: number | null;
}

@Injectable({ providedIn: 'root' })
export class DownloadDocumentCatalogService {
  private readonly baseUrl = `${environment.apiUrl}/download-documents`;
  private readonly docs$ = new BehaviorSubject<AgentDownloadDocument[]>([]);

  constructor(private readonly http: HttpClient) {}

  watch(): Observable<AgentDownloadDocument[]> {
    return this.docs$.asObservable();
  }

  get categories(): LibraryCategory[] {
    return DOCUMENT_LIBRARY_CATEGORIES;
  }

  snapshot(): AgentDownloadDocument[] {
    return [...this.docs$.getValue()];
  }

  documentsInCategory(categoryId: LibraryCategoryId): AgentDownloadDocument[] {
    return this.snapshot()
      .filter((d) => d.categoryId === categoryId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  countInCategory(categoryId: LibraryCategoryId): number {
    return this.snapshot().filter((d) => d.categoryId === categoryId).length;
  }

  loadAll(): Observable<void> {
    return this.http.get<DownloadLibraryDocumentApiDto[]>(this.baseUrl).pipe(
      map((rows) => (Array.isArray(rows) ? rows : []).map((r) => this.mapDto(r))),
      tap((list) => this.docs$.next(list)),
      map(() => undefined),
      catchError((err) => {
        this.docs$.next([]);
        const status = err?.status;
        const suffix =
          status != null
            ? ` (HTTP ${status}${err?.statusText ? ' ' + err.statusText : ''})`
            : err?.message?.includes('Http failure')
              ? ' (r�seau ou CORS � v�rifiez que le backend tourne sur le port attendu.)'
              : '';
        return throwError(
          () => new Error(`Impossible de charger les documents depuis le serveur.${suffix}`)
        );
      })
    );
  }

  /** Liste catalogue (GET public) sans mettre a jour le cache agent (BehaviorSubject). */
  fetchPublicList(): Observable<AgentDownloadDocument[]> {
    return this.http
      .get<DownloadLibraryDocumentApiDto[]>(this.baseUrl)
      .pipe(map((rows) => (Array.isArray(rows) ? rows : []).map((r) => this.mapDto(r))));
  }

  upload(input: {
    categoryId: LibraryCategoryId;
    title: string;
    description?: string;
    downloadUrl?: string;
    file?: File | null;
  }): Observable<void> {
    const fd = new FormData();
    fd.set('categoryId', input.categoryId);
    fd.set('title', input.title.trim());
    if (input.description?.trim()) {
      fd.set('description', input.description.trim());
    }
    const url = (input.downloadUrl || '').trim();
    if (url) {
      fd.set('downloadUrl', url);
    }
    if (input.file) {
      fd.set('file', input.file, input.file.name);
    }
    return this.http.post<DownloadLibraryDocumentApiDto>(this.baseUrl, fd, { headers: this.authHeadersMultipart() }).pipe(
      tap(() => {
        this.loadAll().subscribe({ error: () => undefined });
      }),
      map(() => undefined),
      catchError((err) => {
        const msg =
          err?.error?.error ||
          (typeof err?.error === 'string' ? err.error : null) ||
          err?.message ||
          "Erreur lors de l'enregistrement";
        return throwError(() => new Error(msg));
      })
    );
  }

  deleteDocument(id: string): Observable<void> {
    const num = Number(id);
    if (!Number.isFinite(num)) {
      return throwError(() => new Error('Identifiant invalide'));
    }
    return this.http.delete<void>(`${this.baseUrl}/${num}`, { headers: this.authHeadersJson() }).pipe(
      tap(() => {
        this.loadAll().subscribe({ error: () => undefined });
      }),
      map(() => undefined),
      catchError((err) => {
        const msg = err?.error?.error || err?.message || 'Suppression impossible';
        return throwError(() => new Error(msg));
      })
    );
  }

  triggerDownload(doc: AgentDownloadDocument): void {
    const url = doc.downloadUrl?.trim();
    if (!url) {
      return;
    }
    const isOurStoredFile = this.isOurApiStoredFileUrl(url);
    if (!isOurStoredFile) {
      const num = Number(doc.id);
      if (Number.isFinite(num)) {
        this.http.post(`${this.baseUrl}/${num}/record-download`, {}).subscribe({ error: () => undefined });
      }
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  /** URL du fichier heberge par notre API (le compteur est incremente cote GET /file). */
  private isOurApiStoredFileUrl(url: string): boolean {
    try {
      const u = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
      return /\/api\/download-documents\/\d+\/file$/.test(u.pathname);
    } catch {
      return false;
    }
  }

  formatSize(bytes?: number): string {
    if (bytes == null || bytes <= 0) {
      return '-';
    }
    if (bytes < 1024) {
      return `${bytes} o`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} Ko`;
    }
    return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
  }

  private mapDto(r: DownloadLibraryDocumentApiDto): AgentDownloadDocument {
    return {
      id: String(r.id),
      categoryId: r.categoryId as LibraryCategoryId,
      title: r.title ?? '',
      description: r.description || '',
      updatedAt: r.updatedAt ?? '',
      downloadUrl: r.downloadUrl || undefined,
      originalFileName: r.originalFileName || undefined,
      mimeType: r.mimeType || undefined,
      sizeBytes: r.sizeBytes ?? undefined,
      downloadCount: r.downloadCount != null ? Number(r.downloadCount) : 0,
    };
  }

  private authHeadersJson(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    });
  }

  private authHeadersMultipart(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }
}
