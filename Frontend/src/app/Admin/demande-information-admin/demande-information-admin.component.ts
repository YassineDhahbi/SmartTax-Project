import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { UserService } from '../../services/user/user.service';
import { Utilisateur } from '../../models/utilisateur';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

interface DemandeInformationAdminItem {
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

interface AgentOption {
  id: number;
  fullName: string;
  email: string;
}

@Component({
  selector: 'app-demande-information-admin',
  templateUrl: './demande-information-admin.component.html',
  styleUrls: ['./demande-information-admin.component.css']
})
export class DemandeInformationAdminComponent implements OnInit, OnDestroy {
  demandesInformation: DemandeInformationAdminItem[] = [];
  loading = false;
  errorMessage = '';
  searchTerm = '';
  selectedTraitementFilter: 'ALL' | 'TRAITE' | 'NON_TRAITE' = 'ALL';
  selectedUrgenceFilter: 'ALL' | 'URGENT' | 'NORMAL' = 'ALL';
  page = 0;
  pageSize = 10;
  readonly pageSizeOptions = [10, 20, 50];
  totalElements = 0;
  totalPages = 0;
  private readonly destroy$ = new Subject<void>();
  private readonly searchDebounce$ = new Subject<string>();
  agents: AgentOption[] = [];
  showAssignModal = false;
  selectedDemandeToAssign: DemandeInformationAdminItem | null = null;
  selectedAgentIdForAssign: number | '' = '';
  isAssigning = false;
  showDetailsModal = false;
  selectedDemandeForDetails: DemandeInformationAdminItem | null = null;
  pendingDemandeIdToOpen: number | null = null;

  stats = [
    { title: 'Total demandes', value: '0', subtitle: 'Toutes les demandes', delta: '--', trend: 'neutral' },
    { title: 'Traitées', value: '0', subtitle: 'Statut traité', delta: '--', trend: 'up' },
    { title: 'Non traitées', value: '0', subtitle: 'à suivre', delta: '--', trend: 'down' },
    { title: 'Urgentes', value: '0', subtitle: 'Priorité élevée', delta: '--', trend: 'neutral' }
  ];

  constructor(
    private http: HttpClient,
    private userService: UserService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const rawId = params.get('openDemandeId');
      const parsed = rawId ? Number(rawId) : NaN;
      this.pendingDemandeIdToOpen = !Number.isNaN(parsed) && parsed > 0 ? parsed : null;
      if (this.pendingDemandeIdToOpen) {
        this.tryOpenDemandeFromNotification();
      }
    });
    this.loadAgents();
    this.searchDebounce$
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.page = 0;
        this.loadDemandesInformation();
      });
    this.loadDemandesInformation();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadAgents(): void {
    this.userService.getAllUtilisateurs().subscribe({
      next: (users: Utilisateur[]) => {
        this.agents = (Array.isArray(users) ? users : [])
          .filter((u) => `${u?.role || ''}`.toUpperCase() === 'AGENT')
          .map((u) => ({
            id: Number(u.idUtilisateur),
            fullName: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || `Agent ${u.idUtilisateur}`,
            email: u.email || ''
          }));
      },
      error: () => {
        this.agents = [];
      }
    });
  }

  private buildListParams(): HttpParams {
    let p = new HttpParams().set('page', String(this.page)).set('size', String(this.pageSize));
    const q = this.searchTerm.trim();
    if (q) {
      p = p.set('search', q);
    }
    if (this.selectedTraitementFilter !== 'ALL') {
      p = p.set('traitement', this.selectedTraitementFilter);
    }
    if (this.selectedUrgenceFilter !== 'ALL') {
      p = p.set('urgence', this.selectedUrgenceFilter === 'URGENT' ? 'urgent' : 'normal');
    }
    return p;
  }

  loadDemandesInformation(): void {
    this.loading = true;
    this.errorMessage = '';
    const base = `${environment.apiUrl}/demande-information`;
    forkJoin({
      stats: this.http.get<any>(`${base}/stats`),
      list: this.http.get<any>(`${base}/all`, { params: this.buildListParams() }),
    }).subscribe({
      next: ({ stats, list }) => {
        const items = Array.isArray(list?.items) ? list.items : [];
        this.demandesInformation = items.map((item: DemandeInformationAdminItem) => ({
          ...item,
          traitementStatus: item.traitementStatus === 'TRAITE' ? 'TRAITE' : 'NON_TRAITE',
        }));
        this.totalElements = Number(list?.total) || 0;
        this.totalPages = Number(list?.totalPages) || 0;
        const n = Number(list?.page);
        if (!Number.isNaN(n)) {
          this.page = n;
        }
        this.stats = [
          {
            title: 'Total demandes',
            value: `${Number(stats?.total) || 0}`,
            subtitle: 'Toutes les demandes',
            delta: '--',
            trend: 'neutral',
          },
          {
            title: 'Traitées',
            value: `${Number(stats?.traitees) || 0}`,
            subtitle: 'Statut traité',
            delta: '--',
            trend: 'up',
          },
          {
            title: 'Non traitées',
            value: `${Number(stats?.nonTraitees) || 0}`,
            subtitle: 'à suivre',
            delta: '--',
            trend: 'down',
          },
          {
            title: 'Urgentes',
            value: `${Number(stats?.urgentes) || 0}`,
            subtitle: 'Priorité élevée',
            delta: '--',
            trend: 'neutral',
          },
        ];
        this.tryOpenDemandeFromNotification();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Impossible de charger les demandes d\'information.';
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

  onTraitementFilterChange(value: string): void {
    this.selectedTraitementFilter = value as 'ALL' | 'TRAITE' | 'NON_TRAITE';
    this.page = 0;
    this.loadDemandesInformation();
  }

  onUrgenceFilterChange(value: string): void {
    this.selectedUrgenceFilter = value as 'ALL' | 'URGENT' | 'NORMAL';
    this.page = 0;
    this.loadDemandesInformation();
  }

  goToPage(p: number): void {
    const last = Math.max(0, this.totalPages - 1);
    const next = Math.max(0, Math.min(p, last));
    if (next === this.page) {
      return;
    }
    this.page = next;
    this.loadDemandesInformation();
  }

  prevPage(): void {
    this.goToPage(this.page - 1);
  }

  nextPage(): void {
    this.goToPage(this.page + 1);
  }

  onPageSizeChange(size: number | string): void {
    const n = typeof size === 'string' ? parseInt(size, 10) : Number(size);
    if (!Number.isFinite(n) || !this.pageSizeOptions.includes(n)) {
      return;
    }
    this.pageSize = n;
    this.page = 0;
    this.loadDemandesInformation();
  }

  updateTraitementStatus(demande: DemandeInformationAdminItem, status: 'TRAITE' | 'NON_TRAITE'): void {
    if (!demande?.id) {
      return;
    }

    const previous = demande.traitementStatus || 'NON_TRAITE';
    demande.traitementStatus = status;
    this.http
      .put<any>(`${environment.apiUrl}/demande-information/${demande.id}/traitement-status`, {
        traitementStatus: status,
      })
      .subscribe({
        next: (res) => {
          demande.traitementStatus = res?.traitementStatus === 'TRAITE' ? 'TRAITE' : 'NON_TRAITE';
          this.loadDemandesInformation();
        },
        error: () => {
          demande.traitementStatus = previous;
        },
      });
  }

  openAssignAgentModal(demande: DemandeInformationAdminItem): void {
    this.selectedDemandeToAssign = demande;
    this.selectedAgentIdForAssign = demande.assignedAgentId ?? '';
    this.showAssignModal = true;
  }

  closeAssignAgentModal(): void {
    this.showAssignModal = false;
    this.selectedDemandeToAssign = null;
    this.selectedAgentIdForAssign = '';
    this.isAssigning = false;
  }

  assignSelectedAgent(): void {
    if (!this.selectedDemandeToAssign?.id) {
      return;
    }
    this.isAssigning = true;

    const selectedAgentId =
      this.selectedAgentIdForAssign === '' ? null : Number(this.selectedAgentIdForAssign);

    this.http
      .put<any>(
        `${environment.apiUrl}/demande-information/${this.selectedDemandeToAssign.id}/assign-agent`,
        { agentId: selectedAgentId }
      )
      .subscribe({
        next: (response) => {
          const updatedAgentId = response?.assignedAgentId ?? null;
          const updatedAgentName = response?.assignedAgentName ?? null;
          this.selectedDemandeToAssign!.assignedAgentId = updatedAgentId;
          this.selectedDemandeToAssign!.assignedAgentName = updatedAgentName;
          this.isAssigning = false;
          this.closeAssignAgentModal();
          this.loadDemandesInformation();
        },
      error: () => {
        this.isAssigning = false;
      }
    });
  }

  openDetailsModal(demande: DemandeInformationAdminItem): void {
    this.selectedDemandeForDetails = demande;
    this.showDetailsModal = true;
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedDemandeForDetails = null;
  }

  private tryOpenDemandeFromNotification(): void {
    if (!this.pendingDemandeIdToOpen) {
      return;
    }
    const targetId = this.pendingDemandeIdToOpen;
    const found = this.demandesInformation.find((d) => Number(d.id) === targetId);
    if (found) {
      this.openDetailsModal(found);
      this.pendingDemandeIdToOpen = null;
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { openDemandeId: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
      return;
    }
    this.http.get<DemandeInformationAdminItem>(`${environment.apiUrl}/demande-information/${targetId}`).subscribe({
      next: (raw) => {
        if (raw?.id != null) {
          const item: DemandeInformationAdminItem = {
            ...raw,
            traitementStatus: raw.traitementStatus === 'TRAITE' ? 'TRAITE' : 'NON_TRAITE',
          };
          this.openDetailsModal(item);
        }
        this.pendingDemandeIdToOpen = null;
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { openDemandeId: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      },
      error: () => {
        this.pendingDemandeIdToOpen = null;
      },
    });
  }

  formatDate(date?: string): string {
    if (!date) {
      return '-';
    }
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) {
      return '-';
    }
    return d.toLocaleDateString('fr-FR');
  }
}
