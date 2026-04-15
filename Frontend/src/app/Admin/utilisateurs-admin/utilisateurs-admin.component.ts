import { Component, OnInit } from '@angular/core';
import { Utilisateur } from 'src/app/models/utilisateur';
import { UserService } from 'src/app/services/user/user.service';

interface UserStatCard {
  title: string;
  value: string;
  subtitle: string;
  delta: string;
  trend: 'up' | 'down' | 'neutral';
}

@Component({
  selector: 'app-utilisateurs-admin',
  templateUrl: './utilisateurs-admin.component.html',
  styleUrls: ['./utilisateurs-admin.component.css']
})
export class UtilisateursAdminComponent implements OnInit {
  users: Utilisateur[] = [];
  filteredUsers: Utilisateur[] = [];
  stats: UserStatCard[] = [];
  searchTerm = '';
  selectedRole: 'ALL' | 'CONTRIBUABLE' | 'AGENT' | 'ADMIN' = 'ALL';
  loading = true;
  errorMessage = '';

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.errorMessage = '';

    this.userService.getAllUtilisateurs().subscribe({
      next: (data) => {
        this.users = data;
        this.updateStats(data);
        this.applyFilter();
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = error?.message || 'Impossible de charger les utilisateurs.';
        this.loading = false;
      }
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm = value;
    this.applyFilter();
  }

  onRoleFilterChange(role: 'ALL' | 'CONTRIBUABLE' | 'AGENT' | 'ADMIN'): void {
    this.selectedRole = role;
    this.applyFilter();
  }

  getUserInitials(user: Utilisateur): string {
    const first = user.firstName?.charAt(0) ?? '';
    const last = user.lastName?.charAt(0) ?? '';
    return `${first}${last}`.toUpperCase() || 'U';
  }

  private updateStats(data: Utilisateur[]): void {
    const total = data.length;
    const active = data.filter((user) => {
      const status = (user.status || '').toLowerCase();
      return status === 'actif' || status === 'active';
    }).length;
    const admins = data.filter((user) => (user.role || '').toUpperCase() === 'ADMIN').length;
    const agents = data.filter((user) => (user.role || '').toUpperCase() === 'AGENT').length;

    this.stats = [
      {
        title: 'Total utilisateurs',
        value: `${total}`,
        subtitle: 'Comptes enregistrés',
        delta: 'Global',
        trend: 'neutral'
      },
      {
        title: 'Comptes actifs',
        value: `${active}`,
        subtitle: 'Statut actif',
        delta: total > 0 ? `${Math.round((active / total) * 100)}%` : '0%',
        trend: 'up'
      },
      {
        title: 'Administrateurs',
        value: `${admins}`,
        subtitle: 'Role ADMIN',
        delta: total > 0 ? `${Math.round((admins / total) * 100)}%` : '0%',
        trend: 'neutral'
      },
      {
        title: 'Agents DGI',
        value: `${agents}`,
        subtitle: 'Role AGENT',
        delta: total > 0 ? `${Math.round((agents / total) * 100)}%` : '0%',
        trend: 'neutral'
      }
    ];
  }

  private applyFilter(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.filteredUsers = this.users.filter((user) => {
      const role = (user.role || '').toUpperCase();
      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
      const email = (user.email || '').toLowerCase();
      const roleLower = role.toLowerCase();
      const status = (user.status || '').toLowerCase();
      const matchesRole = this.selectedRole === 'ALL' || role === this.selectedRole;
      const matchesSearch =
        !term || fullName.includes(term) || email.includes(term) || roleLower.includes(term) || status.includes(term);

      return matchesRole && matchesSearch;
    });
  }
}
