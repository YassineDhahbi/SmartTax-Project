import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

interface ReclamationAdminItem {
  id: number;
  reference?: string;
  sujet: string;
  description?: string;
  categorie?: string;
  emailUser?: string;
  nomUser?: string;
  urgenceCode?: string;
  urgenceDisplay?: string;
  statutCode?: string;
  statutDisplay?: string;
  etatCode?: 'EN_COURS' | 'TRAITE';
  etatDisplay?: string;
  dateCreation?: string;
  dateSoumission?: string;
}

interface ReclamationMessageAdminItem {
  id?: number;
  contenu: string;
  auteur: 'agent' | 'contribuable';
  dateEnvoi?: string;
  pieceJointe?: {
    nom?: string;
    taille?: number;
    type?: string;
    url?: string;
  };
}

@Component({
  selector: 'app-reclamation-admin',
  templateUrl: './reclamation-admin.component.html',
  styleUrls: ['./reclamation-admin.component.css']
})
export class ReclamationAdminComponent implements OnInit, OnDestroy {
  reclamations: ReclamationAdminItem[] = [];
  loading = false;
  errorMessage = '';

  searchTerm = '';
  selectedStatutFilter: 'ALL' | 'BROUILLON' | 'SOUMIS' | 'EN_COURS' | 'RESOLU' | 'REJETE' = 'ALL';
  selectedEtatFilter: 'ALL' | 'EN_COURS' | 'TRAITE' = 'ALL';
  selectedUrgenceFilter: 'ALL' | 'BASSE' | 'MOYENNE' | 'HAUTE' | 'URGENTE' = 'ALL';

  page = 0;
  pageSize = 10;
  readonly pageSizeOptions = [10, 20, 50];
  totalElements = 0;
  totalPages = 0;

  showDetailsModal = false;
  selectedReclamationForDetails: ReclamationAdminItem | null = null;
  showDeleteModal = false;
  selectedReclamationToDelete: ReclamationAdminItem | null = null;
  isDeleting = false;
  isLoadingMessages = false;
  reclamationMessages: ReclamationMessageAdminItem[] = [];
  pendingReclamationIdToOpen: number | null = null;
  etatUpdatingId: number | null = null;

  private readonly destroy$ = new Subject<void>();
  private readonly searchDebounce$ = new Subject<string>();

  stats = [
    { title: 'Total réclamations', value: '0', subtitle: 'Toutes les réclamations', delta: '--', trend: 'neutral' },
    { title: 'Soumises', value: '0', subtitle: 'En attente de prise en charge', delta: '--', trend: 'neutral' },
    { title: 'En cours', value: '0', subtitle: 'Traitement en cours', delta: '--', trend: 'up' },
    { title: 'Résolues', value: '0', subtitle: 'Clôturées', delta: '--', trend: 'up' }
  ];

  constructor(private http: HttpClient, private route: ActivatedRoute) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders({ Accept: 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const rawId = params.get('openReclamationId');
      const parsed = rawId ? Number(rawId) : NaN;
      this.pendingReclamationIdToOpen = !Number.isNaN(parsed) && parsed > 0 ? parsed : null;
      if (this.pendingReclamationIdToOpen) {
        this.tryOpenReclamationFromNotification();
      }
    });

    this.searchDebounce$
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.page = 0;
        this.loadReclamations();
      });

    this.loadReclamations();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private pickValue(field: any): string {
    if (field == null) return '';
    if (typeof field === 'object' && field.value != null) return String(field.value);
    return String(field);
  }

  private pickLabel(field: any): string {
    if (field == null) return '';
    if (typeof field === 'object') {
      if (field.label) return String(field.label);
      if (field.value != null) return String(field.value);
    }
    return String(field);
  }

  private mapRows(rawItems: any[]): ReclamationAdminItem[] {
    return (Array.isArray(rawItems) ? rawItems : []).map((raw: any) => {
      const urgenceCode = this.pickValue(raw?.urgence);
      const statutCode = this.pickValue(raw?.statut);
      const etatCodeRaw = this.pickValue(raw?.etatReclamation);
      const etatCode: 'EN_COURS' | 'TRAITE' = etatCodeRaw === 'TRAITE' ? 'TRAITE' : 'EN_COURS';
      return {
        id: Number(raw?.id),
        reference: raw?.reference,
        sujet: raw?.sujet || '',
        description: raw?.description,
        categorie: raw?.categorie,
        emailUser: raw?.emailUser,
        nomUser: raw?.nomUser,
        urgenceCode,
        urgenceDisplay: this.pickLabel(raw?.urgence) || urgenceCode,
        statutCode,
        statutDisplay: this.pickLabel(raw?.statut) || statutCode,
        etatCode,
        etatDisplay: this.pickLabel(raw?.etatReclamation) || etatCode,
        dateCreation: raw?.dateCreation,
        dateSoumission: raw?.dateSoumission,
      };
    });
  }

  private buildListParams(): HttpParams {
    let p = new HttpParams()
      .set('page', String(this.page))
      .set('size', String(this.pageSize))
      .set('sort', 'dateCreation')
      .set('direction', 'DESC');

    const q = this.searchTerm.trim();
    if (q) p = p.set('search', q);
    if (this.selectedStatutFilter !== 'ALL') p = p.set('statut', this.selectedStatutFilter);
    if (this.selectedEtatFilter !== 'ALL') p = p.set('etat', this.selectedEtatFilter);
    if (this.selectedUrgenceFilter !== 'ALL') p = p.set('urgence', this.selectedUrgenceFilter);
    return p;
  }

  loadReclamations(): void {
    this.loading = true;
    this.errorMessage = '';
    const headers = this.getAuthHeaders();
    const listOpts = { headers, params: this.buildListParams() };

    forkJoin({
      stats: this.http
        .get<any>(`${environment.apiUrl}/reclamation/statistics`, { headers })
        .pipe(catchError(() => of(null))),
      list: this.http.get<any>(`${environment.apiUrl}/reclamation/all`, listOpts),
    }).subscribe({
      next: ({ stats, list }) => {
        this.reclamations = this.mapRows(list?.content);
        this.totalElements = Number(list?.totalElements) || 0;
        this.totalPages = Number(list?.totalPages) || 0;
        const n = Number(list?.number);
        if (!Number.isNaN(n)) this.page = n;

        this.stats = [
          { title: 'Total réclamations', value: `${Number(stats?.total) || 0}`, subtitle: 'Toutes les réclamations', delta: '--', trend: 'neutral' },
          { title: 'Soumises', value: `${Number(stats?.soumis) || 0}`, subtitle: 'En attente de prise en charge', delta: '--', trend: 'neutral' },
          { title: 'En cours', value: `${Number(stats?.enCours) || 0}`, subtitle: 'Traitement en cours', delta: '--', trend: 'up' },
          { title: 'Résolues', value: `${Number(stats?.resolus) || 0}`, subtitle: 'Clôturées', delta: '--', trend: 'up' },
        ];

        this.tryOpenReclamationFromNotification();
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        const status = err?.status;
        if (status === 401 || status === 403) {
          this.errorMessage =
            'Accès refusé. Connectez-vous en tant qu’administrateur et rouvrez cette page.';
        } else {
          this.errorMessage = 'Impossible de charger les réclamations.';
        }
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm = value;
    this.searchDebounce$.next(value);
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.page = 0;
    this.searchDebounce$.next('');
  }

  onStatutFilterChange(value: string): void {
    this.selectedStatutFilter = value as any;
    this.page = 0;
    this.loadReclamations();
  }

  onEtatFilterChange(value: string): void {
    this.selectedEtatFilter = value as any;
    this.page = 0;
    this.loadReclamations();
  }

  onUrgenceFilterChange(value: string): void {
    this.selectedUrgenceFilter = value as any;
    this.page = 0;
    this.loadReclamations();
  }

  goToPage(p: number): void {
    const last = Math.max(0, this.totalPages - 1);
    const next = Math.max(0, Math.min(p, last));
    if (next === this.page) return;
    this.page = next;
    this.loadReclamations();
  }

  prevPage(): void {
    this.goToPage(this.page - 1);
  }

  nextPage(): void {
    this.goToPage(this.page + 1);
  }

  onPageSizeChange(size: number | string): void {
    const n = typeof size === 'string' ? parseInt(size, 10) : Number(size);
    if (!Number.isFinite(n) || !this.pageSizeOptions.includes(n)) return;
    this.pageSize = n;
    this.page = 0;
    this.loadReclamations();
  }

  updateEtat(item: ReclamationAdminItem, etat: string): void {
    if (!item?.id) return;
    const target: 'EN_COURS' | 'TRAITE' = etat === 'TRAITE' ? 'TRAITE' : 'EN_COURS';
    const previous = item.etatCode || 'EN_COURS';
    if (target === previous) return;

    this.etatUpdatingId = item.id;
    item.etatCode = target;
    item.etatDisplay = target === 'TRAITE' ? 'Traité' : 'En cours';

    const params = new HttpParams().set('etat', target);
    this.http
      .put<any>(`${environment.apiUrl}/reclamation/${item.id}/etat-traitement`, null, {
        params,
        headers: this.getAuthHeaders(),
      })
      .subscribe({
        next: (dto) => {
          const code = this.pickValue(dto?.etatReclamation);
          item.etatCode = code === 'TRAITE' ? 'TRAITE' : 'EN_COURS';
          item.etatDisplay = this.pickLabel(dto?.etatReclamation) || item.etatCode;
          this.etatUpdatingId = null;
        },
        error: () => {
          item.etatCode = previous;
          item.etatDisplay = previous === 'TRAITE' ? 'Traité' : 'En cours';
          this.etatUpdatingId = null;
        },
      });
  }

  openDetailsModal(item: ReclamationAdminItem): void {
    this.selectedReclamationForDetails = item;
    this.showDetailsModal = true;
    this.loadReclamationMessages(item.id);
  }

  openDeleteModal(item: ReclamationAdminItem): void {
    if (!item?.id) return;
    this.selectedReclamationToDelete = item;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    if (this.isDeleting) return;
    this.showDeleteModal = false;
    this.selectedReclamationToDelete = null;
  }

  confirmDeleteReclamation(): void {
    const item = this.selectedReclamationToDelete;
    if (!item?.id || this.isDeleting) return;
    this.isDeleting = true;
    this.http.delete<void>(`${environment.apiUrl}/reclamation/${item.id}`, { headers: this.getAuthHeaders() }).subscribe({
      next: () => {
        this.isDeleting = false;
        this.closeDeleteModal();
        this.closeDetailsModal();
        this.loadReclamations();
      },
      error: () => {
        this.isDeleting = false;
        this.errorMessage = 'Suppression impossible (seuls les brouillons peuvent être supprimés).';
      },
    });
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedReclamationForDetails = null;
    this.reclamationMessages = [];
    this.isLoadingMessages = false;
  }

  private mapMessages(rawItems: any[]): ReclamationMessageAdminItem[] {
    return (Array.isArray(rawItems) ? rawItems : []).map((raw: any) => {
      const auteurRaw = this.pickValue(raw?.auteur).toLowerCase();
      const auteur: 'agent' | 'contribuable' = auteurRaw.includes('agent') ? 'agent' : 'contribuable';
      return {
        id: raw?.id != null ? Number(raw.id) : undefined,
        contenu: raw?.contenu ? String(raw.contenu) : '',
        auteur,
        dateEnvoi: raw?.dateEnvoi,
        pieceJointe: raw?.pieceJointe ?? undefined,
      };
    });
  }

  private loadReclamationMessages(reclamationId: number): void {
    if (!reclamationId) {
      this.reclamationMessages = [];
      return;
    }
    this.isLoadingMessages = true;
    this.http
      .get<any[]>(`${environment.apiUrl}/reclamation/${reclamationId}/messages`, { headers: this.getAuthHeaders() })
      .subscribe({
        next: (items) => {
          this.reclamationMessages = this.mapMessages(items);
          this.isLoadingMessages = false;
        },
        error: () => {
          this.reclamationMessages = [];
          this.isLoadingMessages = false;
        },
      });
  }

  messageAuteurLabel(auteur: 'agent' | 'contribuable'): string {
    return auteur === 'agent' ? 'Agent' : 'Contribuable';
  }

  messageAttachmentHref(msg: ReclamationMessageAdminItem): string {
    const url = msg?.pieceJointe?.url;
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const origin = environment.apiUrl.replace(/\/?api\/?$/, '').replace(/\/$/, '');
    return url.startsWith('/') ? `${origin}${url}` : `${origin}/${url}`;
  }

  formatDate(date?: string): string {
    if (!date) return '-';
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private tryOpenReclamationFromNotification(): void {
    if (!this.pendingReclamationIdToOpen) return;
    const targetId = this.pendingReclamationIdToOpen;
    const found = this.reclamations.find((item) => Number(item?.id) === targetId);
    if (found) {
      this.openDetailsModal(found);
      this.pendingReclamationIdToOpen = null;
      return;
    }
    this.http
      .get<any>(`${environment.apiUrl}/reclamation/${targetId}`, { headers: this.getAuthHeaders() })
      .subscribe({
        next: (raw) => {
          if (raw?.id != null) {
            const row = this.mapRows([raw])[0];
            this.openDetailsModal(row);
          }
          this.pendingReclamationIdToOpen = null;
        },
        error: () => {
          this.pendingReclamationIdToOpen = null;
        },
      });
  }
}
