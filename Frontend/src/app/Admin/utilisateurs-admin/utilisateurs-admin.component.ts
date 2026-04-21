import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Utilisateur } from 'src/app/models/utilisateur';
import { UserService } from 'src/app/services/user/user.service';
import { ChartOptions, ChartType, ChartData } from 'chart.js';

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

  // Propriétés de pagination
  currentPage = 1;
  itemsPerPage = 5;
  totalItems = 0;
  totalPages = 0;
  paginationPages: number[] = [];

  // Propriétés pour les statistiques totales
  totalActiveUsers = 0;
  totalAdminUsers = 0;
  totalAgentUsers = 0;

  // Propriétés pour les graphiques
  monthlyInscriptionsData: ChartData<'bar'> = {
    labels: [],
    datasets: [{
      label: 'Inscriptions',
      data: [],
      backgroundColor: 'rgba(34, 211, 238, 0.6)',
      borderColor: 'rgba(34, 211, 238, 1)',
      borderWidth: 2,
      borderRadius: 8
    }]
  };

  roleDistributionData: ChartData<'doughnut'> = {
    labels: ['Contribuables', 'Agents DGI', 'Admins'],
    datasets: [{
      data: [0, 0, 0],
      backgroundColor: [
        'rgba(34, 211, 238, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(251, 146, 60, 0.8)'
      ],
      borderColor: [
        'rgba(34, 211, 238, 1)',
        'rgba(16, 185, 129, 1)',
        'rgba(251, 146, 60, 1)'
      ],
      borderWidth: 2
    }]
  };

  barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Inscriptions par mois',
        color: '#e5e7eb',
        font: {
          size: 16,
          weight: 'bold'
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(148, 163, 184, 0.2)'
        },
        ticks: {
          color: '#94a3b8'
        }
      },
      x: {
        grid: {
          color: 'rgba(148, 163, 184, 0.2)'
        },
        ticks: {
          color: '#94a3b8'
        }
      }
    }
  };

  doughnutChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#e5e7eb',
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      title: {
        display: true,
        text: 'Répartition des rôles',
        color: '#e5e7eb',
        font: {
          size: 16,
          weight: 'bold'
        }
      }
    }
  };

  selectedUser: Utilisateur | null = null;
  showDetailsModal = false;
  showEditModal = false;
  showImageModal = false;
  showAddUserModal = false;
  showDeleteModal = false;
  isStatsModalOpen = false;
  userToDelete: Utilisateur | null = null;
  editForm: FormGroup;
  addUserForm: FormGroup;

  constructor(private userService: UserService, private fb: FormBuilder, private router: Router) {
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
    this.loadAllUsersForStats();
  }

  loadUsers(): void {
    this.loading = true;
    this.errorMessage = '';

    this.userService.getUsersPaginated(this.currentPage, this.itemsPerPage).subscribe({
      next: (response) => {
        this.users = response.users;
        this.totalItems = response.total;
        this.calculateTotalPages();
        this.updateStats();
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
      return matchesSearch && matchesRole && matchesStatus;
    });
  }

  calculateTotalPages(): void {
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    this.updatePaginationPages();
  }

  updatePaginationPages(): void {
    this.paginationPages = [];
    const maxPagesToShow = 5;
    const startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    const endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);
    
    for (let i = startPage; i <= endPage; i++) {
      this.paginationPages.push(i);
    }
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadUsers();
    }
  }

  onItemsPerPageChange(itemsPerPage: number): void {
    this.itemsPerPage = itemsPerPage;
    this.currentPage = 1;
    this.loadUsers();
  }

  getDisplayedUsers(): Utilisateur[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredUsers.slice(start, end);
  }

  getEndRange(): number {
    const end = this.currentPage * this.itemsPerPage;
    return Math.min(end, this.totalItems);
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
      next: () => {
        this.closeAddUserModal();
        this.loadUsers();
        this.loadAllUsersForStats();
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
        this.loadAllUsersForStats();
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
        this.loadAllUsersForStats();
      },
      error: (err) => {
        this.errorMessage = err?.message || 'Échec de la suppression de l\'utilisateur.';
        this.closeDeleteModal();
      }
    });
  }

  private loadAllUsersForStats(): void {
    this.userService.getAllUtilisateurs().subscribe({
      next: (users) => {

        this.totalActiveUsers =
          users.filter(x => x.status === 'actif').length;
        this.totalAdminUsers =
          users.filter(x => x.role === 'ADMIN').length;
        this.totalAgentUsers =
          users.filter(x => x.role === 'AGENT').length;

        this.generateChartData(users);
        this.updateStats();
      },
      error: (error: any) => {
        console.error('Erreur lors du chargement des statistiques:', error);
      }
    });
  }

  generateChartData(users: Utilisateur[]): void {
    // Générer les données pour le graphique des inscriptions par mois
    this.generateMonthlyInscriptionsData(users);
    
    // Générer les données pour le graphique de répartition des rôles
    this.generateRoleDistributionData(users);
  }

  generateMonthlyInscriptionsData(users: Utilisateur[]): void {
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const currentYear = new Date().getFullYear();
    const monthlyCounts = new Array(12).fill(0);

    users.forEach(user => {
      if (user.dateInscription) {
        const inscriptionDate = new Date(user.dateInscription);
        if (inscriptionDate.getFullYear() === currentYear) {
          const month = inscriptionDate.getMonth();
          monthlyCounts[month]++;
        }
      }
    });

    this.monthlyInscriptionsData = {
      labels: monthNames,
      datasets: [{
        label: 'Inscriptions',
        data: monthlyCounts,
        backgroundColor: 'rgba(34, 211, 238, 0.6)',
        borderColor: 'rgba(34, 211, 238, 1)',
        borderWidth: 2,
        borderRadius: 8
      }]
    };
  }

  generateRoleDistributionData(users: Utilisateur[]): void {
    const contribuableCount = users.filter(x => x.role === 'CONTRIBUABLE').length;
    const agentCount = users.filter(x => x.role === 'AGENT').length;
    const adminCount = users.filter(x => x.role === 'ADMIN').length;

    this.roleDistributionData = {
      labels: ['Contribuables', 'Agents DGI', 'Admins'],
      datasets: [{
        data: [contribuableCount, agentCount, adminCount],
        backgroundColor: [
          'rgba(34, 211, 238, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(251, 146, 60, 0.8)'
        ],
        borderColor: [
          'rgba(34, 211, 238, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(251, 146, 60, 1)'
        ],
        borderWidth: 2
      }]
    };
  }

  private updateStats(): void {
    const total = this.totalItems;
    const active = this.totalActiveUsers;
    const admins = this.totalAdminUsers;
    const agents = this.totalAgentUsers;

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

  
  showStatsModal(): void {
    this.isStatsModalOpen = true;
  }

  closeStatsModal(): void {
    this.isStatsModalOpen = false;
  }

  getStatIcon(title: string): string {
    switch (title) {
      case 'Total utilisateurs':
        return 'fa-users';
      case 'Comptes actifs':
        return 'fa-user-check';
      case 'Administrateurs':
        return 'fa-user-shield';
      case 'Agents DGI':
        return 'fa-user-tie';
      default:
        return 'fa-chart-bar';
    }
  }

  getTrendIcon(trend: string): string {
    switch (trend) {
      case 'up':
        return 'fa-arrow-up';
      case 'down':
        return 'fa-arrow-down';
      case 'neutral':
        return 'fa-minus';
      default:
        return 'fa-minus';
    }
  }
}
