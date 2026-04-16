import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { UserService } from '../../services/user/user.service';

@Component({
  selector: 'app-profile-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './profile-admin.component.html',
  styleUrls: ['./profile-admin.component.css']
})
export class ProfileAdminComponent implements OnInit {
  profileForm: FormGroup;
  currentUser: any = null;
  loading = false;
  successMessage = '';
  errorMessage = '';
  showPasswordModal = false;
  passwordForm: FormGroup;
  selectedFile: File | null = null;
  imagePreview: string | null = null;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private router: Router
  ) {
    this.profileForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      telephone: [''],
      departement: [''],
      adresse: [''],
      cin: [''],
      dateNaissance: ['']
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadUserProfile();
  }

  loadUserProfile(): void {
    this.loading = true;
    this.userService.getUserDetails().subscribe({
      next: (user) => {
        this.currentUser = user;
        this.profileForm.patchValue({
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email || '',
          telephone: user.telephone || '',
          departement: user.departement || '',
          adresse: user.adresse || '',
          cin: user.cin || '',
          dateNaissance: user.dateNaissance ? new Date(user.dateNaissance).toISOString().split('T')[0] : ''
        });
        
        if (user.photo) {
          this.imagePreview = user.photo;
        }
        
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = 'Erreur lors du chargement du profil';
        this.loading = false;
        console.error('Error loading profile:', error);
      }
    });
  }

  onSubmit(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';

    const updatedProfile = this.profileForm.value;
    
    this.userService.updateUserProfile(updatedProfile).subscribe({
      next: (response) => {
        this.currentUser = response;
        this.successMessage = 'Profil mis à jour avec succès!';
        this.loading = false;
        
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        this.errorMessage = 'Erreur lors de la mise à jour du profil';
        this.loading = false;
        console.error('Error updating profile:', error);
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview = e.target?.result as string;
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  uploadPhoto(): void {
    if (!this.selectedFile) {
      this.errorMessage = 'Veuillez sélectionner une photo';
      return;
    }

    this.loading = true;
    this.userService.uploadProfilePhoto(this.selectedFile).subscribe({
      next: (response) => {
        if (this.currentUser) {
          this.currentUser.photo = response.photoPath;
        }
        this.successMessage = 'Photo mise à jour avec succès!';
        this.loading = false;
        this.selectedFile = null;
        
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        this.errorMessage = 'Erreur lors du téléchargement de la photo';
        this.loading = false;
        console.error('Error uploading photo:', error);
      }
    });
  }

  openPasswordModal(): void {
    this.showPasswordModal = true;
    this.passwordForm.reset();
    this.errorMessage = '';
  }

  closePasswordModal(): void {
    this.showPasswordModal = false;
    this.passwordForm.reset();
  }

  changePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.value;

    if (newPassword !== confirmPassword) {
      this.errorMessage = 'Les mots de passe ne correspondent pas';
      return;
    }

    this.loading = true;
    this.userService.changePassword({
      currentPassword,
      newPassword
    }).subscribe({
      next: () => {
        this.successMessage = 'Mot de passe changé avec succès!';
        this.closePasswordModal();
        this.loading = false;
        
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        this.errorMessage = 'Erreur lors du changement de mot de passe';
        this.loading = false;
        console.error('Error changing password:', error);
      }
    });
  }

  getRoleDisplayName(role: string): string {
    const roleMap: { [key: string]: string } = {
      'ADMIN': 'Administrateur',
      'AGENT': 'Agent',
      'CONTRIBUABLE': 'Contribuable'
    };
    return roleMap[role] || role;
  }

  getStatusDisplayName(status: string): string {
    const statusMap: { [key: string]: string } = {
      'actif': 'Actif',
      'inactif': 'Inactif'
    };
    return statusMap[status] || status;
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'Non spécifié';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
}
