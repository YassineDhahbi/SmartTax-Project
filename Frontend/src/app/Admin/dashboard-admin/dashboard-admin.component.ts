import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ImmatriculationService } from '../../services/immatriculation.service';
import { PublicationService } from '../../services/publication.service';
import { UserService } from '../../services/user/user.service';
import { Utilisateur } from '../../models/utilisateur';

interface StatCard {
  title: string;
  value: string;
  delta: string;
  trend: 'up' | 'down' | 'neutral';
  subtitle: string;
}

interface ActivityItem {
  actor: string;
  action: string;
  time: string;
  severity: 'high' | 'medium' | 'low';
}

interface TaskItem {
  label: string;
  progress: number;
}

interface RegionPerformance {
  region: string;
  completion: number;
  amount: string;
}

interface CaseItem {
  id: string;
  citizen: string;
  type: string;
  statusLabel: string;
  statusClass: 'done' | 'in-progress' | 'late' | 'draft';
  due: string;
}

interface AlertItem {
  title: string;
  description: string;
  level: 'high' | 'medium' | 'low';
}

interface QuickActionItem {
  label: string;
  route: string;
}

@Component({
  selector: 'app-dashboard-admin',
  templateUrl: './dashboard-admin.component.html',
  styleUrls: ['./dashboard-admin.component.css'],
})
export class DashboardAdminComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  loading = false;
  loadError = '';

  stats: StatCard[] = [];
  activities: ActivityItem[] = [];
  tasks: TaskItem[] = [];
  regions: RegionPerformance[] = [];
  cases: CaseItem[] = [];
  alerts: AlertItem[] = [];
  sparklineBarHeightsPx: number[] = [];
  weekImmatriculationCreations = 0;
  chartLegendSecondary = '';

  readonly quickActions: QuickActionItem[] = [
    { label: 'Gérer les utilisateurs', route: '/admin/utilisateurs' },
    { label: 'Dossiers d\'immatriculation', route: '/admin/immatriculations' },
    { label: 'Réclamations', route: '/admin/reclamations' },
    { label: 'Publications fiscales', route: '/admin/publications' },
    { label: 'Demandes d\'information', route: '/admin/demandes-information' },
  ];

  lastRefreshLabel = '—';
  heroLead = '';
  heroMetaPrimary = '';
  heroMetaSecondary = '';

  constructor(
    private readonly router: Router,
    private readonly http: HttpClient,
    private readonly immatriculationService: ImmatriculationService,
    private readonly publicationService: PublicationService,
    private readonly userService: UserService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.refresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  refresh(): void {
    this.loading = true;
    this.loadError = '';
    forkJoin({
      imms: this.immatriculationService.getAllImmatriculations().pipe(catchError(() => of([]))),
      diStats: this.http
        .get<any>(`${environment.apiUrl}/demande-information/stats`)
        .pipe(catchError(() => of({}))),
      reclStats: this.http
        .get<any>(`${environment.apiUrl}/reclamation/statistics`)
        .pipe(catchError(() => of({}))),
      pubs: this.publicationService
        .getPublications({ page: 0, limit: 120 })
        .pipe(catchError(() => of({ data: [], pagination: {}, stats: null }))),
      diList: this.http
        .get<any>(`${environment.apiUrl}/demande-information/all`, {
          params: new HttpParams().set('page', '0').set('size', '6'),
        })
        .pipe(catchError(() => of({ items: [] }))),
      reclList: this.http
        .get<any>(`${environment.apiUrl}/reclamation/all`, {
          params: new HttpParams()
            .set('page', '0')
            .set('size', '6')
            .set('sort', 'dateCreation')
            .set('direction', 'DESC'),
        })
        .pipe(catchError(() => of({ content: [] }))),
      users: this.userService.getAllUtilisateurs().pipe(catchError(() => of([] as Utilisateur[]))),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ imms, diStats, reclStats, pubs, diList, reclList, users }) => {
          const immList = Array.isArray(imms) ? imms : [];
          this.applyDashboardData(immList, diStats, reclStats, pubs, diList, reclList, users);
          this.loading = false;
          this.lastRefreshLabel = new Date().toLocaleString('fr-FR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          });
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.loadError = 'Impossible de charger le tableau de bord.';
          this.cdr.markForCheck();
        },
      });
  }

  go(route: string): void {
    void this.router.navigateByUrl(route);
  }

  private applyDashboardData(
    immList: any[],
    diStats: any,
    reclStats: any,
    pubsResp: any,
    diList: any,
    reclList: any,
    users: Utilisateur[]
  ): void {
    const publications = Array.isArray(pubsResp?.data) ? pubsResp.data : [];
    const pubStatsFromApi = pubsResp?.stats;
    let pubTotal = 0;
    let pubPublished = 0;
    let pubPending = 0;
    if (pubStatsFromApi) {
      pubTotal = Number(pubStatsFromApi.total) || Number(pubsResp?.pagination?.total_items) || publications.length;
      pubPublished = Number(pubStatsFromApi.published) || 0;
      pubPending = Number(pubStatsFromApi.pending) || 0;
    } else {
      pubTotal = Number(pubsResp?.pagination?.total_items) || publications.length;
      pubPublished = publications.filter((p: any) => `${p?.status || ''}`.toUpperCase() === 'PUBLISHED').length;
      pubPending = publications.filter((p: any) => `${p?.status || ''}`.toUpperCase() === 'PENDING').length;
    }

    const diTotal = Number(diStats?.total) || 0;
    const diNonTraitees = Number(diStats?.nonTraitees) || 0;
    const diUrgentes = Number(diStats?.urgentes) || 0;
    const diTraitees = Number(diStats?.traitees) || 0;

    const reclTotal = Number(reclStats?.total) || 0;
    const reclSoumis = Number(reclStats?.soumis) || 0;
    const reclEnCours = Number(reclStats?.enCours) || 0;
    const reclResolus = Number(reclStats?.resolus) || 0;

    const immTotal = immList.length;
    const immValides = immList.filter((i) => `${i?.status || ''}`.toUpperCase() === 'VALIDE').length;
    const immEnVerification = immList.filter(
      (i) => `${i?.status || ''}`.toUpperCase() === 'EN_COURS_VERIFICATION'
    ).length;
    const immSoumis = immList.filter((i) => `${i?.status || ''}`.toUpperCase() === 'SOUMIS').length;
    const immRejetes = immList.filter((i) => `${i?.status || ''}`.toUpperCase() === 'REJETE').length;

    const userList = Array.isArray(users) ? users : [];
    const nbAgents = userList.filter((u) => {
      const r = `${u?.role || ''}`.toUpperCase();
      return r === 'AGENT_DGI' || r === 'AGENT';
    }).length;
    const nbAdmins = userList.filter((u) => `${u?.role || ''}`.toUpperCase() === 'ADMIN').length;

    this.stats = [
      {
        title: 'Immatriculations',
        value: `${immTotal}`,
        delta: '—',
        trend: 'neutral',
        subtitle: `${immValides} validées · ${immEnVerification} en vérification · ${immSoumis} soumises`,
      },
      {
        title: 'Demandes d\'information',
        value: `${diTotal}`,
        delta: '—',
        trend: diNonTraitees > 5 ? 'down' : 'neutral',
        subtitle: `${diNonTraitees} non traitées · ${diUrgentes} urgentes · ${diTraitees} traitées`,
      },
      {
        title: 'Réclamations',
        value: `${reclTotal}`,
        delta: '—',
        trend: 'neutral',
        subtitle: `${reclSoumis} soumises · ${reclEnCours} en cours · ${reclResolus} résolues`,
      },
      {
        title: 'Publications',
        value: `${pubTotal}`,
        delta: '—',
        trend: 'neutral',
        subtitle: `${pubPublished} publiées · ${pubPending} en attente`,
      },
    ];

    this.heroLead = `Vue consolidée : ${immTotal} immatriculations, ${diTotal} demandes d'information, ${reclTotal} réclamations et ${pubTotal} publications. ${userList.length} comptes utilisateurs (${nbAgents} agents, ${nbAdmins} administrateurs).`;
    const aTraiter = immSoumis + immEnVerification;
    this.heroMetaPrimary = aTraiter > 0 ? `${aTraiter} dossiers immatriculation à suivre` : 'Aucun dossier immatriculation en attente critique';
    this.heroMetaSecondary =
      diNonTraitees > 0 || reclSoumis > 0
        ? `${diNonTraitees} demande(s) non traitée(s) · ${reclSoumis} réclamation(s) soumise(s)`
        : 'Files demandes et réclamations à jour';

    const buckets7 = this.immatriculationBuckets7d(immList);
    this.weekImmatriculationCreations = buckets7.reduce((a, b) => a + b, 0);
    this.sparklineBarHeightsPx = this.sparklineHeightsFromBuckets(buckets7);
    this.chartLegendSecondary =
      this.weekImmatriculationCreations > 0
        ? `${this.weekImmatriculationCreations} création(s) sur 7 jours`
        : 'Aucune création sur la fenêtre glissante';

    this.regions = this.buildStatusRegions(immList, immTotal);
    this.cases = this.buildPriorityCases(immList);
    this.tasks = this.buildOperationalTasks(diTotal, diTraitees, reclTotal, reclResolus, immTotal, immValides, pubTotal, pubPublished);
    this.alerts = this.buildAlerts(diNonTraitees, diUrgentes, reclSoumis, reclEnCours, immRejetes, pubPending);
    this.activities = this.buildRecentActivities(immList, diList, reclList, publications);
  }

  private immatriculationBuckets7d(immList: any[]): number[] {
    const days = 7;
    const buckets = new Array(days).fill(0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    for (const imm of immList) {
      const raw = imm?.dateCreation || imm?.dateSoumission;
      if (!raw) {
        continue;
      }
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) {
        continue;
      }
      d.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
      if (diffDays < 0 || diffDays >= days) {
        continue;
      }
      buckets[days - 1 - diffDays] += 1;
    }
    return buckets;
  }

  private sparklineHeightsFromBuckets(buckets: number[]): number[] {
    const max = Math.max(...buckets, 1);
    const minPx = 26;
    const maxPx = 92;
    return buckets.map((v) => minPx + Math.round((v / max) * (maxPx - minPx)));
  }

  private buildStatusRegions(immList: any[], total: number): RegionPerformance[] {
    if (!total) {
      return [{ region: 'Aucune donnée', completion: 0, amount: '0' }];
    }
    const segments: { key: string; label: string }[] = [
      { key: 'VALIDE', label: 'Validées' },
      { key: 'EN_COURS_VERIFICATION', label: 'En vérification' },
      { key: 'SOUMIS', label: 'Soumises' },
      { key: 'REJETE', label: 'Rejetées' },
      { key: 'BROUILLON', label: 'Brouillons' },
    ];
    return segments.map(({ key, label }) => {
      const n = immList.filter((i) => `${i?.status || ''}`.toUpperCase() === key).length;
      return {
        region: label,
        completion: Math.round((n / total) * 100),
        amount: `${n}`,
      };
    });
  }

  private buildPriorityCases(immList: any[]): CaseItem[] {
    const sorted = [...immList].sort((a, b) => {
      const ta = new Date(a?.dateSoumission || a?.dateCreation || 0).getTime();
      const tb = new Date(b?.dateSoumission || b?.dateCreation || 0).getTime();
      return tb - ta;
    });
    return sorted.slice(0, 5).map((imm) => {
      const st = `${imm?.status || ''}`.toUpperCase();
      const isMorale = `${imm?.typeContribuable || ''}`.toUpperCase() === 'MORALE';
      const citizen = isMorale
        ? imm?.raisonSociale || imm?.email || '—'
        : `${imm?.prenom || ''} ${imm?.nom || ''}`.trim() || imm?.email || '—';
      const { label, cls } = this.mapImmatriculationCaseStatus(st);
      const dueRaw = imm?.dateSoumission || imm?.dateCreation;
      const due = dueRaw
        ? new Date(dueRaw).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—';
      return {
        id: imm?.dossierNumber || (imm?.id != null ? `IMM-${imm.id}` : '—'),
        citizen,
        type: 'Immatriculation',
        statusLabel: label,
        statusClass: cls,
        due,
      };
    });
  }

  private mapImmatriculationCaseStatus(
    status: string
  ): { label: string; cls: CaseItem['statusClass'] } {
    switch (status) {
      case 'VALIDE':
        return { label: 'Validé', cls: 'done' };
      case 'REJETE':
        return { label: 'Rejeté', cls: 'late' };
      case 'BROUILLON':
        return { label: 'Brouillon', cls: 'draft' };
      case 'EN_COURS_VERIFICATION':
        return { label: 'En vérification', cls: 'in-progress' };
      case 'SOUMIS':
        return { label: 'Soumis', cls: 'in-progress' };
      default:
        return { label: status || '—', cls: 'in-progress' };
    }
  }

  private buildOperationalTasks(
    diTotal: number,
    diTraitees: number,
    reclTotal: number,
    reclResolus: number,
    immTotal: number,
    immValides: number,
    pubTotal: number,
    pubPublished: number
  ): TaskItem[] {
    const pct = (num: number, den: number) => (den > 0 ? Math.min(100, Math.round((num / den) * 100)) : 0);
    return [
      { label: 'Taux de traitement des demandes d\'information', progress: pct(diTraitees, diTotal) },
      { label: 'Réclamations résolues (sur total)', progress: pct(reclResolus, reclTotal) },
      { label: 'Immatriculations validées (sur total)', progress: pct(immValides, immTotal) },
      { label: 'Publications publiées (sur total)', progress: pct(pubPublished, pubTotal) },
    ];
  }

  private buildAlerts(
    diNonTraitees: number,
    diUrgentes: number,
    reclSoumis: number,
    reclEnCours: number,
    immRejetes: number,
    pubPending: number
  ): AlertItem[] {
    const out: AlertItem[] = [];
    if (diUrgentes > 0) {
      out.push({
        title: 'Demandes d\'information urgentes',
        description: `${diUrgentes} demande(s) marquée(s) urgente(s) — ${diNonTraitees} non traitée(s) au total.`,
        level: 'high',
      });
    } else if (diNonTraitees > 0) {
      out.push({
        title: 'Demandes d\'information en attente',
        description: `${diNonTraitees} demande(s) non encore traitée(s).`,
        level: 'medium',
      });
    }
    if (reclSoumis > 0 || reclEnCours > 0) {
      out.push({
        title: 'File réclamations',
        description: `${reclSoumis} soumise(s), ${reclEnCours} en cours de traitement.`,
        level: reclSoumis > 10 ? 'high' : 'medium',
      });
    }
    if (immRejetes > 0) {
      out.push({
        title: 'Immatriculations rejetées',
        description: `${immRejetes} dossier(s) au statut rejeté — vérifier les motifs et le suivi.`,
        level: 'medium',
      });
    }
    if (pubPending > 0) {
      out.push({
        title: 'Publications en attente de validation',
        description: `${pubPending} contenu(s) en attente de modération ou publication.`,
        level: 'low',
      });
    }
    if (!out.length) {
      out.push({
        title: 'Aucune alerte prioritaire',
        description: 'Les indicateurs principaux sont dans des plages habituelles.',
        level: 'low',
      });
    }
    return out.slice(0, 4);
  }

  private buildRecentActivities(
    immList: any[],
    diList: any,
    reclList: any,
    publications: any[]
  ): ActivityItem[] {
    type Row = { t: number; actor: string; action: string; severity: ActivityItem['severity'] };
    const rows: Row[] = [];

    for (const imm of immList) {
      const sortDate = imm?.dateSoumission || imm?.dateCreation;
      const t = new Date(sortDate || 0).getTime();
      if (!Number.isFinite(t) || t <= 0) {
        continue;
      }
      const isMorale = `${imm?.typeContribuable || ''}`.toUpperCase() === 'MORALE';
      const name = isMorale
        ? imm?.raisonSociale || imm?.email
        : `${imm?.prenom || ''} ${imm?.nom || ''}`.trim() || imm?.email;
      rows.push({
        t,
        actor: 'Immatriculation',
        action: `Dossier ${imm?.dossierNumber || imm?.id} — ${name} (${this.formatImmStatusFr(`${imm?.status || ''}`.toUpperCase())})`,
        severity: `${imm?.status || ''}`.toUpperCase() === 'REJETE' ? 'high' : 'low',
      });
    }

    const diItems = Array.isArray(diList?.items) ? diList.items : [];
    for (const d of diItems) {
      const t = new Date(d?.dateCreation || 0).getTime();
      if (!Number.isFinite(t) || t <= 0) {
        continue;
      }
      rows.push({
        t,
        actor: 'Demande d\'information',
        action: `${d?.sujet || 'Sans sujet'} — ${d?.nomComplet || d?.email || ''}`,
        severity: d?.urgent ? 'high' : 'medium',
      });
    }

    const recRaw = Array.isArray(reclList?.content) ? reclList.content : [];
    for (const raw of recRaw) {
      const t = new Date(raw?.dateSoumission || raw?.dateCreation || 0).getTime();
      if (!Number.isFinite(t) || t <= 0) {
        continue;
      }
      const sujet = raw?.sujet || 'Réclamation';
      const who = raw?.nomUser || raw?.emailUser || '';
      rows.push({
        t,
        actor: 'Réclamation',
        action: `${sujet} — ${who}`,
        severity: 'medium',
      });
    }

    for (const p of publications) {
      const t = new Date(p?.updated_at || p?.created_at || 0).getTime();
      if (!Number.isFinite(t) || t <= 0) {
        continue;
      }
      rows.push({
        t,
        actor: 'Publication',
        action: `${p?.title || 'Publication'} (${`${p?.status || ''}`.toUpperCase()})`,
        severity: 'low',
      });
    }

    rows.sort((a, b) => b.t - a.t);
    return rows.slice(0, 8).map((r) => ({
      actor: r.actor,
      action: r.action,
      time: this.formatRelativeTime(new Date(r.t)),
      severity: r.severity,
    }));
  }

  private formatImmStatusFr(status: string): string {
    const m: Record<string, string> = {
      EN_COURS_VERIFICATION: 'En vérification',
      SOUMIS: 'Soumis',
      VALIDE: 'Validé',
      REJETE: 'Rejeté',
      BROUILLON: 'Brouillon',
    };
    return m[status] || status || '—';
  }

  private formatRelativeTime(d: Date): string {
    if (Number.isNaN(d.getTime())) {
      return '—';
    }
    const diffMs = Date.now() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) {
      return "À l'instant";
    }
    if (diffMin < 60) {
      return `Il y a ${diffMin} min`;
    }
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) {
      return diffH <= 1 ? 'Il y a 1 h' : `Il y a ${diffH} h`;
    }
    const diffDays = Math.floor(diffH / 24);
    if (diffDays < 7) {
      return diffDays === 1 ? 'Hier' : `Il y a ${diffDays} j`;
    }
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }
}
