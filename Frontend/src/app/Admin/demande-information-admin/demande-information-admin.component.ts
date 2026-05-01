import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { UserService } from '../../services/user/user.service';
import { Utilisateur } from '../../models/utilisateur';
import { ActivatedRoute, Router } from '@angular/router';

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
export class DemandeInformationAdminComponent implements OnInit {
  demandesInformation: DemandeInformationAdminItem[] = [];
  filteredDemandesInformation: DemandeInformationAdminItem[] = [];
  loading = false;
  errorMessage = '';
  searchTerm = '';
  selectedTraitementFilter: 'ALL' | 'TRAITE' | 'NON_TRAITE' = 'ALL';
  selectedUrgenceFilter: 'ALL' | 'URGENT' | 'NORMAL' = 'ALL';
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
    this.loadDemandesInformation();
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

  loadDemandesInformation(): void {
    this.loading = true;
    this.errorMessage = '';
    this.http.get<any>('http://localhost:8080/api/demande-information/all').subscribe({
      next: (response) => {
        const items = Array.isArray(response?.items) ? response.items : [];
        this.demandesInformation = items.map((item: DemandeInformationAdminItem) => ({
          ...item,
          traitementStatus: item.traitementStatus === 'TRAITE' ? 'TRAITE' : 'NON_TRAITE'
        }));
        this.applyFilters();
        this.updateStats();
        this.tryOpenDemandeFromNotification();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Impossible de charger les demandes d�information.';
      }
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm = value;
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.applyFilters();
  }

  onTraitementFilterChange(value: string): void {
    this.selectedTraitementFilter = value as 'ALL' | 'TRAITE' | 'NON_TRAITE';
    this.applyFilters();
  }

  onUrgenceFilterChange(value: string): void {
    this.selectedUrgenceFilter = value as 'ALL' | 'URGENT' | 'NORMAL';
    this.applyFilters();
  }

  updateTraitementStatus(demande: DemandeInformationAdminItem, status: 'TRAITE' | 'NON_TRAITE'): void {
    if (!demande?.id) {
      return;
    }

    const previous = demande.traitementStatus || 'NON_TRAITE';
    demande.traitementStatus = status;
    this.http.put<any>(`http://localhost:8080/api/demande-information/${demande.id}/traitement-status`, {
      traitementStatus: status
    }).subscribe({
      next: (res) => {
        demande.traitementStatus = res?.traitementStatus === 'TRAITE' ? 'TRAITE' : 'NON_TRAITE';
        this.updateStats();
      },
      error: () => {
        demande.traitementStatus = previous;
        this.updateStats();
      }
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

    this.http.put<any>(
      `http://localhost:8080/api/demande-information/${this.selectedDemandeToAssign.id}/assign-agent`,
      { agentId: selectedAgentId }
    ).subscribe({
      next: (response) => {
        const updatedAgentId = response?.assignedAgentId ?? null;
        const updatedAgentName = response?.assignedAgentName ?? null;
        this.selectedDemandeToAssign!.assignedAgentId = updatedAgentId;
        this.selectedDemandeToAssign!.assignedAgentName = updatedAgentName;
        this.isAssigning = false;
        this.closeAssignAgentModal();
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
    if (!this.pendingDemandeIdToOpen || !this.demandesInformation.length) {
      return;
    }
    const found = this.demandesInformation.find((d) => Number(d.id) === this.pendingDemandeIdToOpen);
    if (found) {
      this.openDetailsModal(found);
      this.pendingDemandeIdToOpen = null;
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { openDemandeId: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    }
  }

  private applyFilters(): void {
    const search = this.searchTerm.trim().toLowerCase();
    this.filteredDemandesInformation = this.demandesInformation.filter((demande) => {
      const matchesSearch = !search || [
        demande.nomComplet || '',
        demande.email || '',
        demande.sujet || '',
        demande.message || ''
      ].some((v) => v.toLowerCase().includes(search));

      const status = demande.traitementStatus === 'TRAITE' ? 'TRAITE' : 'NON_TRAITE';
      const matchesTraitement =
        this.selectedTraitementFilter === 'ALL' || status === this.selectedTraitementFilter;

      const matchesUrgence =
        this.selectedUrgenceFilter === 'ALL' ||
        (this.selectedUrgenceFilter === 'URGENT' && demande.urgent) ||
        (this.selectedUrgenceFilter === 'NORMAL' && !demande.urgent);

      return matchesSearch && matchesTraitement && matchesUrgence;
    });
  }

  private updateStats(): void {
    const total = this.demandesInformation.length;
    const traitees = this.demandesInformation.filter((d) => d.traitementStatus === 'TRAITE').length;
    const nonTraitees = total - traitees;
    const urgentes = this.demandesInformation.filter((d) => d.urgent).length;

    this.stats = [
      { title: 'Total demandes', value: `${total}`, subtitle: 'Toutes les demandes', delta: '--', trend: 'neutral' },
      { title: 'Traitées', value: `${traitees}`, subtitle: 'Statut traité', delta: '--', trend: 'up' },
      { title: 'Non traitées', value: `${nonTraitees}`, subtitle: 'à suivre', delta: '--', trend: 'down' },
      { title: 'Urgentes', value: `${urgentes}`, subtitle: 'Priorité élevée', delta: '--', trend: 'neutral' }
    ];
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
