import { Component } from '@angular/core';
import { Router } from '@angular/router';

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
  status: 'En retard' | 'En cours' | 'Validé';
  due: string;
}

interface AlertItem {
  title: string;
  description: string;
  level: 'high' | 'medium' | 'low';
}

@Component({
  selector: 'app-dashboard-admin',
  templateUrl: './dashboard-admin.component.html',
  styleUrls: ['./dashboard-admin.component.css']
})
export class DashboardAdminComponent {
  constructor(private router: Router) {}

  readonly stats: StatCard[] = [
    {
      title: 'Contribuables actifs',
      value: '24,980',
      delta: '+12.5%',
      trend: 'up',
      subtitle: 'Depuis le mois dernier'
    },
    {
      title: 'Dossiers en attente',
      value: '318',
      delta: '-6.2%',
      trend: 'down',
      subtitle: 'Traitement amélioré'
    },
    {
      title: 'Recettes ce mois',
      value: '7.8 M TND',
      delta: '+8.9%',
      trend: 'up',
      subtitle: 'Objectif à 92%'
    },
    {
      title: 'Réclamations ouvertes',
      value: '57',
      delta: 'Stable',
      trend: 'neutral',
      subtitle: 'Niveau normal'
    }
  ];

  readonly activities: ActivityItem[] = [
    {
      actor: 'Système',
      action: 'Synchronisation des paiements terminée',
      time: 'Il y a 8 min',
      severity: 'low'
    },
    {
      actor: 'Admin Central',
      action: 'Validation de 12 dossiers en attente',
      time: 'Il y a 22 min',
      severity: 'medium'
    },
    {
      actor: 'Superviseur Nord',
      action: 'Pic de réclamations détecté dans la région 2',
      time: 'Il y a 45 min',
      severity: 'high'
    },
    {
      actor: 'Sécurité',
      action: 'Nouvelle politique d’accès activée',
      time: 'Il y a 1 h',
      severity: 'medium'
    }
  ];

  readonly tasks: TaskItem[] = [
    { label: 'Clôture des dossiers Q1', progress: 76 },
    { label: 'Revue des anomalies TVA', progress: 52 },
    { label: 'Mise à jour des paramètres fiscaux', progress: 89 },
    { label: 'Audit des permissions utilisateurs', progress: 41 }
  ];

  readonly quickActions = [
    'Créer un nouvel agent',
    'Affecter des dossiers',
    'Publier une note interne',
    'Exporter le rapport mensuel'
  ];

  readonly regions: RegionPerformance[] = [
    { region: 'Tunis', completion: 88, amount: '2.6 M TND' },
    { region: 'Sfax', completion: 73, amount: '1.8 M TND' },
    { region: 'Sousse', completion: 67, amount: '1.2 M TND' },
    { region: 'Nabeul', completion: 79, amount: '1.5 M TND' }
  ];

  readonly cases: CaseItem[] = [
    {
      id: 'DOS-2043',
      citizen: 'Société Atlas SARL',
      type: 'TVA annuelle',
      status: 'En retard',
      due: '15 avr 2026'
    },
    {
      id: 'DOS-2038',
      citizen: 'Karim Ben Salem',
      type: 'Impôt sur revenu',
      status: 'En cours',
      due: '17 avr 2026'
    },
    {
      id: 'DOS-2029',
      citizen: 'Groupe Delta',
      type: 'Contrôle fiscal',
      status: 'Validé',
      due: '11 avr 2026'
    },
    {
      id: 'DOS-2022',
      citizen: 'Nour Textile',
      type: 'Réclamation',
      status: 'En cours',
      due: '19 avr 2026'
    }
  ];

  readonly alerts: AlertItem[] = [
    {
      title: 'Pic anormal de demandes',
      description: 'Le volume des réclamations a augmenté de 27% sur 24h.',
      level: 'high'
    },
    {
      title: 'Mise à jour réglementaire',
      description: 'Nouvelle règle de calcul TVA à valider avant vendredi.',
      level: 'medium'
    },
    {
      title: 'Rappel maintenance',
      description: 'Fenêtre de maintenance programmée ce weekend.',
      level: 'low'
    }
  ];
}
