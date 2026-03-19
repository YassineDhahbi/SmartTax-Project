import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger';

type StatusKey = 'open' | 'in_review' | 'done' | 'blocked';

interface NavItem {
  label: string;
  icon: string;
  badge?: number;
  key: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface KpiCard {
  label: string;
  value: string;
  sub: string;
  delta: string;
  deltaUp: boolean;
  icon: string;
  tone: Tone;
}

interface QuickAction {
  title: string;
  sub: string;
  icon: string;
  tone: Tone;
}

interface RecentOp {
  ref: string;
  subject: string;
  kind: string;
  status: string;
  statusKey: StatusKey;
  updatedAt: string;
}

interface TaskItem {
  title: string;
  meta: string;
  done: boolean;
  tone: Tone;
}

interface AlertItem {
  title: string;
  meta: string;
  tone: Tone;
  icon: string;
}

@Component({
  selector: 'app-dashboard-agent',
  templateUrl: './dashboard-agent.component.html',
  styleUrls: ['./dashboard-agent.component.css']
})
export class DashboardAgentComponent implements OnInit {
  userName = 'Agent';

  greeting = getGreeting();

  sidebarOpen = false;

  activeNavKey: string = 'overview';

  activityRange: '7d' | '30d' = '7d';

  theme: 'dark' | 'light' = getInitialTheme();

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadUserName();
  }

  private loadUserName(): void {
    try {
      // Essayer de récupérer le nom depuis userInfo d'abord
      const userInfo = localStorage.getItem('userInfo');
      if (userInfo) {
        const user = JSON.parse(userInfo);
        this.userName = user.fullName || user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Agent';
        return;
      }

      // Alternative: essayer de récupérer depuis le token JWT
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Décoder le token pour obtenir les informations utilisateur
          const payload = JSON.parse(atob(token.split('.')[1]));
          console.log('JWT Payload:', payload); // Debug pour voir la structure
          
          // Extraire firstName et lastName du payload
          const firstName = payload.firstName || payload.prenom || payload.given_name || '';
          const lastName = payload.lastName || payload.nom || payload.family_name || '';
          const fullName = `${firstName} ${lastName}`.trim();
          
          console.log('Extracted firstName:', firstName);
          console.log('Extracted lastName:', lastName);
          console.log('Combined fullName:', fullName);
          
          if (fullName) {
            this.userName = fullName;
          } else {
            // Si pas de nom dans le token, faire un appel API pour récupérer les infos utilisateur
            this.fetchUserInfo();
          }
        } catch {
          // Si le décodage échoue, utiliser une valeur par défaut personnalisée
          const role = localStorage.getItem('role');
          this.userName = role === 'AGENT_DGI' ? 'Agent DGI' : 'Agent';
        }
      } else {
        // Fallback basique
        const role = localStorage.getItem('role');
        this.userName = role === 'AGENT_DGI' ? 'Agent DGI' : 'Agent';
      }
    } catch (error) {
      console.error('Erreur lors du chargement du nom d\'utilisateur:', error);
      this.userName = 'Agent';
    }
  }

  private fetchUserInfo(): void {
    const userId = localStorage.getItem('userId');
    if (userId) {
      // Appeler l'API pour récupérer les informations complètes de l'utilisateur
      this.http.get(`http://localhost:8080/api/users/${userId}`).subscribe({
        next: (user: any) => {
          console.log('User info from API:', user);
          const firstName = user.firstName || user.prenom || '';
          const lastName = user.lastName || user.nom || '';
          const fullName = `${firstName} ${lastName}`.trim() || user.fullName || user.name || 'Agent';
          this.userName = fullName;
          console.log('Final userName from API:', this.userName);
        },
        error: (error) => {
          console.error('Erreur lors de la récupération des infos utilisateur:', error);
          // Fallback: utiliser une version améliorée de l'email
          const email = localStorage.getItem('token') ? JSON.parse(atob(localStorage.getItem('token')!.split('.')[1])).sub : '';
          const emailUsername = email.split('@')[0];
          // Essayer de séparer le nom/prénom (ex: yassinedhahbi -> yassine dhahbi)
          this.userName = this.formatUsername(emailUsername);
        }
      });
    } else {
      // Fallback: utiliser l'email si pas de userId
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          this.userName = this.formatUsername(payload.sub.split('@')[0]);
        } catch {
          this.userName = 'Agent';
        }
      }
    }
  }

  private formatUsername(username: string): string {
    // Convertir en minuscules et supprimer les chiffres
    let cleanName = username.toLowerCase().replace(/[0-9]/g, '');
    
    // Cas spéciaux connus
    const knownNames: { [key: string]: string } = {
      'yassinedhahbi': 'Yassine Dhahbi',
      'mohamedali': 'Mohamed Ali',
      'jeanpierre': 'Jean Pierre',
      'paulmartin': 'Paul Martin'
    };
    
    if (knownNames[cleanName]) {
      return knownNames[cleanName];
    }
    
    // Essayer de séparer nom/prénom pour les patterns communs
    const patterns = [
      // Pattern: prénom + nom avec majuscule (johnDoe -> john Doe)
      /^([a-z]+)([A-Z][a-z]+)$/,
      // Pattern: prénom + nom avec séparation par voyelle commune
      /^([a-z]{2,8})([aeiouy][a-z]{2,8})$/,
      // Pattern: essayer de séparer au milieu pour les noms longs
      /^([a-z]{4,8})([a-z]{4,8})$/
    ];
    
    for (const pattern of patterns) {
      const match = cleanName.match(pattern);
      if (match) {
        const firstName = match[1].charAt(0).toUpperCase() + match[1].slice(1);
        const lastName = match[2].charAt(0).toUpperCase() + match[2].slice(1);
        return `${firstName} ${lastName}`;
      }
    }
    
    // Si aucun pattern ne correspond, capitaliser simplement
    return cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
  }

  nav: NavSection[] = [
    {
      title: 'Pilotage',
      items: [
        { key: 'overview', label: 'Vue d’ensemble', icon: 'fa-solid fa-grid-2' },
        { key: 'work', label: 'Dossiers', icon: 'fa-solid fa-folder-open', badge: 7 },
        { key: 'decisions', label: 'Décisions', icon: 'fa-solid fa-file-signature' },
      ],
    },
    {
      title: 'Communication',
      items: [
        { key: 'notifications', label: 'Notifications', icon: 'fa-solid fa-bell', badge: 3 },
        { key: 'support', label: 'Centre d’aide', icon: 'fa-solid fa-circle-question' },
      ],
    },
    {
      title: 'Compte',
      items: [
        { key: 'settings', label: 'Paramètres', icon: 'fa-solid fa-gear' },
        { key: 'logout', label: 'Déconnexion', icon: 'fa-solid fa-right-from-bracket' },
      ],
    },
  ];

  kpis: KpiCard[] = [
    {
      label: 'Dossiers en cours',
      value: '24',
      sub: 'Aujourd’hui',
      icon: 'fa-solid fa-folder-tree',
      delta: '+8%',
      deltaUp: true,
      tone: 'brand',
    },
    {
      label: 'À traiter',
      value: '7',
      sub: 'Priorité haute',
      icon: 'fa-solid fa-triangle-exclamation',
      delta: '-2%',
      deltaUp: false,
      tone: 'warning',
    },
    {
      label: 'Validés',
      value: '18',
      sub: 'Cette semaine',
      icon: 'fa-solid fa-circle-check',
      delta: '+12%',
      deltaUp: true,
      tone: 'success',
    },
    {
      label: 'Bloqués',
      value: '3',
      sub: 'En attente',
      icon: 'fa-solid fa-circle-xmark',
      delta: '+1',
      deltaUp: false,
      tone: 'danger',
    },
  ];

  quickActions: QuickAction[] = [
    { title: 'Créer un dossier', sub: 'Nouveau traitement', icon: 'fa-solid fa-circle-plus', tone: 'brand' },
    { title: 'Valider une demande', sub: 'Contrôle & conformité', icon: 'fa-solid fa-user-check', tone: 'success' },
    { title: 'Exporter un état', sub: 'PDF / Excel', icon: 'fa-solid fa-file-export', tone: 'neutral' },
    { title: 'Consulter procédures', sub: 'Guides & FAQ', icon: 'fa-solid fa-book-open', tone: 'warning' },
  ];

  activityBars7d: number[] = [34, 52, 41, 68, 48, 73, 59];
  activityBars30d: number[] = [22, 28, 34, 30, 38, 35, 44, 42, 50, 47, 55, 53];

  lineSeries7d: number[] = [18, 28, 22, 36, 30, 44, 40];
  lineSeries30d: number[] = [16, 18, 20, 19, 23, 25, 24, 28, 27, 31, 33, 35];

  recentOps: RecentOp[] = [
    { ref: 'DGI-2026-0142', subject: 'Société Atlas SARL', kind: 'Contrôle', status: 'En revue', statusKey: 'in_review', updatedAt: 'Il y a 12 min' },
    { ref: 'DGI-2026-0138', subject: 'M. Karim Ben Ali', kind: 'Réclamation', status: 'Ouvert', statusKey: 'open', updatedAt: 'Il y a 1 h' },
    { ref: 'DGI-2026-0130', subject: 'Entreprise Nova', kind: 'Remboursement', status: 'Terminé', statusKey: 'done', updatedAt: 'Hier' },
    { ref: 'DGI-2026-0122', subject: 'Mme Lina Trabelsi', kind: 'Vérification', status: 'Bloqué', statusKey: 'blocked', updatedAt: 'Il y a 3 j' },
  ];

  tasks: TaskItem[] = [
    { title: 'Vérifier pièces manquantes (DGI-2026-0142)', meta: 'Avant 18:00', done: false, tone: 'warning' },
    { title: 'Valider remboursement (DGI-2026-0130)', meta: 'Priorité normale', done: true, tone: 'success' },
    { title: 'Appeler contribuable — dossier en litige', meta: 'À planifier', done: false, tone: 'brand' },
    { title: 'Mettre à jour décision — contrôle terminé', meta: 'Cette semaine', done: false, tone: 'neutral' },
  ];

  alerts: AlertItem[] = [
    { title: '3 notifications non lues', meta: 'Dernière il y a 12 min', tone: 'brand', icon: 'fa-regular fa-bell' },
    { title: '1 dossier bloqué', meta: 'En attente de réponse', tone: 'danger', icon: 'fa-solid fa-circle-xmark' },
    { title: 'Audit hebdomadaire', meta: 'Rapport à générer', tone: 'warning', icon: 'fa-solid fa-shield-halved' },
  ];

  get activityBars(): number[] {
    return this.activityRange === '7d' ? this.activityBars7d : this.activityBars30d;
  }

  get lineSeries(): number[] {
    return this.activityRange === '7d' ? this.lineSeries7d : this.lineSeries30d;
  }

  get linePoints(): string {
    const series = this.lineSeries;
    const max = Math.max(...series, 1);
    const min = Math.min(...series, 0);
    const range = Math.max(max - min, 1);
    const w = 520;
    const h = 160;
    const padX = 10;
    const padY = 12;
    const innerW = w - padX * 2;
    const innerH = h - padY * 2;

    return series
      .map((v, i) => {
        const x = padX + (innerW * i) / Math.max(series.length - 1, 1);
        const y = padY + innerH - ((v - min) / range) * innerH;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  get donutStyle(): string {
    // Conic-gradient segment order: brand, success, warning, danger
    return 'conic-gradient(from 210deg, rgba(99,102,241,0.95) 0 46%, rgba(34,197,94,0.95) 46% 76%, rgba(245,158,11,0.95) 76% 92%, rgba(239,68,68,0.95) 92% 100%)';
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  setActivityRange(range: '7d' | '30d'): void {
    this.activityRange = range;
  }

  toggleTheme(): void {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem('agentdgi_theme', this.theme);
    } catch {
      // ignore storage errors (private mode, blocked, etc.)
    }
  }

  setActiveNav(key: string): void {
    this.activeNavKey = key;
  }

  toggleTask(t: TaskItem): void {
    t.done = !t.done;
  }
}

function getInitialTheme(): 'dark' | 'light' {
  try {
    const saved = localStorage.getItem('agentdgi_theme');
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // ignore
  }
  return 'dark';
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
}
