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
  selectedStatus: 'ALL' | 'actif' | 'inactif' = 'ALL';
  selectedDateFilter: 'ALL' | 'today' | 'week' | 'month' | 'year' = 'ALL';
  showAdvancedSearch = false;
  loading = true;
  errorMessage = '';

  selectedUser: Utilisateur | null = null;
  showDetailsModal = false;
  showEditModal = false;
  showImageModal = false;
  showAddUserModal = false;
  showDeleteModal = false;
  userToDelete: Utilisateur | null = null;
  editForm: FormGroup;
  addUserForm: FormGroup;

  constructor(private userService: UserService, private fb: FormBuilder) {
    this.editForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      role: ['', [Validators.required]],
      status: ['']
    });

    this.addUserForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['CONTRIBUABLE', [Validators.required]],
      status: ['actif', [Validators.required]]
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

  applyFilter(): void {
    this.filteredUsers = this.users.filter(user => {
      const matchesSearch = !this.searchTerm || 
        user.firstName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        user.lastName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        user.role?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        user.status?.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesRole = this.selectedRole === 'ALL' || user.role === this.selectedRole;
      const matchesStatus = this.selectedStatus === 'ALL' || user.status === this.selectedStatus;
      const matchesDate = this.matchesDateFilter(user);
      
      return matchesSearch && matchesRole && matchesStatus && matchesDate;
    });
  }

  matchesDateFilter(user: Utilisateur): boolean {
    if (this.selectedDateFilter === 'ALL') return true;
    
    if (!user.dateInscription) return false;
    
    const userDate = new Date(user.dateInscription);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (this.selectedDateFilter) {
      case 'today':
        const todayStart = new Date(today);
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        return userDate >= todayStart && userDate <= todayEnd;
        
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return userDate >= weekStart;
        
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return userDate >= monthStart;
        
      case 'year':
        const yearStart = new Date(today.getFullYear(), 0, 1);
        return userDate >= yearStart;
        
      default:
        return true;
    }
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.applyFilter();
  }

  toggleAdvancedSearch(): void {
    this.showAdvancedSearch = !this.showAdvancedSearch;
  }

  onStatusFilterChange(status: string): void {
    this.selectedStatus = status as 'ALL' | 'actif' | 'inactif';
    this.applyFilter();
  }

  onDateFilterChange(dateFilter: string): void {
    this.selectedDateFilter = dateFilter as 'ALL' | 'today' | 'week' | 'month' | 'year';
    this.applyFilter();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedRole = 'ALL';
    this.selectedStatus = 'ALL';
    this.selectedDateFilter = 'ALL';
    this.showAdvancedSearch = false;
    this.applyFilter();
  }

  exportUsers(): void {
    const csvContent = this.generateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `utilisateurs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  generateCSV(): string {
    const headers = ['ID', 'Prénom', 'Nom', 'Email', 'Rôle', 'Statut', 'Date d\'inscription'];
    const rows = this.filteredUsers.map(user => [
      user.idUtilisateur || '',
      user.firstName || '',
      user.lastName || '',
      user.email || '',
      user.role || '',
      user.status || '',
      user.dateInscription ? new Date(user.dateInscription).toLocaleDateString('fr-FR') : ''
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    return csvContent;
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

  openAddUserModal(): void {
    this.showAddUserModal = true;
    this.showEditModal = false;
    this.showDetailsModal = false;
    this.addUserForm.reset({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: 'CONTRIBUABLE',
      status: 'actif'
    });
  }

  closeAddUserModal(): void {
    this.showAddUserModal = false;
  }

  saveNewUser(): void {
    if (this.addUserForm.invalid) {
      this.markFormGroupTouched(this.addUserForm);
      return;
    }

    const newUser = {
      firstName: this.addUserForm.value.firstName,
      lastName: this.addUserForm.value.lastName,
      email: this.addUserForm.value.email,
      password: this.addUserForm.value.password,
      role: this.addUserForm.value.role,
      status: this.addUserForm.value.status
    };

    this.userService.createUser(newUser).subscribe({
      next: (response) => {
        this.showAddUserModal = false;
        this.loadUsers();
        // Afficher un message de succès (vous pourriez ajouter un toast ici)
        console.log('Utilisateur créé avec succès:', response);
      },
      error: (error) => {
        console.error('Erreur lors de la création de l\'utilisateur:', error);
        // Afficher un message d'erreur
      }
    });
  }

  markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched({ onlySelf: true });
    });
  }

  saveUserEdit(): void {
    if (!this.selectedUser) return;

    if (this.editForm.invalid) {
      this.markFormGroupTouched(this.editForm);
      return;
    }

    const updatedUser: Partial<Utilisateur> = {
      firstName: this.editForm.value.firstName,
      lastName: this.editForm.value.lastName,
      email: this.editForm.value.email,
      role: this.editForm.value.role,
      status: this.editForm.value.status || null
    };

    this.userService.updateUserById(this.selectedUser.idUtilisateur, updatedUser).subscribe({
      next: () => {
        this.showEditModal = false;
        this.selectedUser = null;
        this.loadUsers();
      },
      error: (err) => {
        this.errorMessage = err?.message || 'Échec de la mise à jour de l\'utilisateur.';
      }
    });
  }

  confirmDeleteUser(user: Utilisateur): void {
    this.userToDelete = user;
    this.showDeleteModal = true;
  }

  openDeleteModal(user: Utilisateur): void {
    this.userToDelete = user;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.userToDelete = null;
  }

  deleteUser(): void {
    if (!this.userToDelete) return;

    this.userService.deleteUser1(this.userToDelete.idUtilisateur).subscribe({
      next: () => {
        this.selectedUser = null;
        this.showDetailsModal = false;
        this.showEditModal = false;
        this.showDeleteModal = false;
        this.userToDelete = null;
        this.loadUsers();
      },
      error: (err) => {
        this.errorMessage = err?.message || 'Échec de la suppression de l\'utilisateur.';
        this.closeDeleteModal();
      }
    });
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
}
