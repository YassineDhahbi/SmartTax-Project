import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
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

  selectedUser: Utilisateur | null = null;
  showDetailsModal = false;
  showEditModal = false;
  showImageModal = false;
  editForm: FormGroup;

  constructor(private userService: UserService, private fb: FormBuilder) {
    this.editForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      role: ['', [Validators.required]],
      status: ['']
    });
  }

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

  getRoleBadgeClass(role?: string): string {
    const r = (role || '').toUpperCase();
    switch (r) {
      case 'ADMIN':
        return 'role-admin';
      case 'AGENT':
        return 'role-agent';
      case 'CONTRIBUABLE':
        return 'role-contribuable';
      default:
        return 'role-unknown';
    }
  }

  getCinValidationClass(status?: string): string {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'valid':
        return 'status-valid';
      case 'invalid':
        return 'status-invalid';
      case 'pending':
        return 'status-pending';
      default:
        return 'status-unknown';
    }
  }

  onImageError(event: any): void {
    // En cas d'erreur de chargement de l'image, on cache l'image
    event.target.style.display = 'none';
  }

  openImageModal(): void {
    if (this.selectedUser?.photo) {
      this.showImageModal = true;
    }
  }

  closeImageModal(): void {
    this.showImageModal = false;
  }

  onLargeImageError(event: any): void {
    // En cas d'erreur sur l'image grand taille, on ferme le modal
    console.error('Erreur lors du chargement de l\'image en grand taille');
    this.closeImageModal();
  }

  openUserDetails(user: Utilisateur): void {
    this.selectedUser = user;
    this.showDetailsModal = true;
    this.showEditModal = false;
  }

  closeUserDetails(): void {
    this.showDetailsModal = false;
  }

  openUserEdit(user: Utilisateur): void {
    this.selectedUser = user;
    this.showEditModal = true;
    this.showDetailsModal = false;

    this.editForm.patchValue({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      role: user.role || 'CONTRIBUABLE',
      status: user.status || ''
    });
  }

  closeUserEdit(): void {
    this.showEditModal = false;
  }

  saveUserEdit(): void {
    if (!this.selectedUser) return;

    if (this.editForm.invalid) {
      this.markFormGroupTouched(this.editForm);
      return;
    }

    const updatedUser: Partial<Utilisateur> = {
      ...this.selectedUser,
      firstName: this.editForm.value.firstName,
      lastName: this.editForm.value.lastName,
      email: this.editForm.value.email,
      role: this.editForm.value.role,
      status: this.editForm.value.status || null
    };

    this.userService.updateUserDetails(updatedUser).subscribe({
      next: () => {
        this.showEditModal = false;
        this.selectedUser = null;
        this.loadUsers();
      },
      error: (err) => {
        this.errorMessage = err?.message || 'Échec de la mise à jour de l’utilisateur.';
      }
    });
  }

  confirmDeleteUser(user: Utilisateur): void {
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'cet utilisateur';
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${fullName} ?`)) return;

    this.userService.deleteUser1(user.idUtilisateur).subscribe({
      next: () => {
        this.selectedUser = null;
        this.showDetailsModal = false;
        this.showEditModal = false;
        this.loadUsers();
      },
      error: (err) => {
        this.errorMessage = err?.message || 'Échec de la suppression de l’utilisateur.';
      }
    });
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach((control) => control.markAsTouched());
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
