import { Component, OnInit, AfterViewInit } from '@angular/core';
import { UserService } from 'src/app/services/user/user.service';
import { Utilisateur } from 'src/app/models/utilisateur';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import * as bootstrap from 'bootstrap';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit, AfterViewInit {
  user: Utilisateur | null = null;
  error: string | null = null;
  isEditing: boolean = false;
  profileForm: FormGroup;
  passwordForm: FormGroup;
  toasts: { title: string; message: string; type: string; action?: { label: string; callback: () => void } }[] = [];
  private passwordModal: bootstrap.Modal | undefined;
  selectedFile: File | null = null;
  timestamp: number = Date.now();

  constructor(
    private userService: UserService,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.profileForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[a-zA-Z\s]*$/)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[a-zA-Z\s]*$/)]],
      email: ['', [Validators.required, Validators.email]],
      dateNaissance: ['', [Validators.required, this.minimumAgeValidator(18)]]
    });

    this.passwordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.loadUserDetails();
  }

  ngAfterViewInit(): void {
    const modalElement = document.getElementById('changePasswordModal');
    if (modalElement) {
      this.passwordModal = new bootstrap.Modal(modalElement, {
        backdrop: true,
        keyboard: true
      });
      modalElement.addEventListener('hidden.bs.modal', () => {
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
          backdrop.remove();
        }
        const body = document.body;
        body.classList.remove('modal-open');
        body.style.overflow = '';
        body.style.paddingRight = '';
      });
    }
    this.initializeToasts();
  }

  loadUserDetails(): void {
    this.userService.getUserDetails().subscribe({
      next: (data) => {
        this.user = data || new Utilisateur();
        if (this.user) {
          this.profileForm.patchValue({
            firstName: this.user.firstName,
            lastName: this.user.lastName,
            email: this.user.email,
            dateNaissance: this.user.dateNaissance
          });
        }
        this.error = null;
        this.timestamp = Date.now();
      },
      error: (err) => {
        this.error = err.status === 401 ? 'Session expirée, veuillez vous reconnecter' : 'Erreur lors de la récupération des données';
        this.user = null;
      }
    });
  }

  editProfile(): void {
    this.isEditing = true;
  }

  saveProfile(): void {
    if (this.profileForm.valid && this.user) {
      const updatedUser = new Utilisateur({
        idUtilisateur: this.user.idUtilisateur,
        firstName: this.profileForm.value.firstName,
        lastName: this.profileForm.value.lastName,
        email: this.profileForm.value.email,
        dateNaissance: this.profileForm.value.dateNaissance,
        password: this.user.password,
        photo: this.user.photo,
        role: this.user.role,
        status: this.user.status,
        dateInscription: this.user.dateInscription
      });

      this.userService.updateUserDetails(updatedUser).subscribe({
        next: (data) => {
          this.user = data;
          this.isEditing = false;
          this.addToast('Succès', 'Profil mis à jour avec succès !', 'toast-success');
          this.timestamp = Date.now();
        },
        error: (err) => {
          this.addToast('Erreur', 'Échec de la mise à jour du profil. Veuillez réessayer.', 'toast-error');
        }
      });
    } else {
      Object.keys(this.profileForm.controls).forEach(field => {
        const control = this.profileForm.get(field);
        control?.markAsTouched();
        this.validateField(field);
      });
    }
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.loadUserDetails();
  }

  changePhoto(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        this.selectedFile = file;
        this.uploadPhoto();
      }
    };
    input.click();
  }

  uploadPhoto(): void {
    if (this.selectedFile) {
      this.userService.uploadPhoto(this.selectedFile).subscribe({
        next: (photoPath) => {
          if (this.user) {
            this.user.photo = photoPath;
            this.addToast('Succès', 'Photo de profil mise à jour avec succès !', 'toast-success');
            this.timestamp = Date.now();
            this.loadUserDetails();
          }
        },
        error: (err) => {
          this.addToast('Erreur', err.message || 'Échec du téléchargement de la photo. Veuillez réessayer.', 'toast-error');
        }
      });
    }
  }

  deleteAccount(): void {
    this.addToast(
      'Confirmation',
      'Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.',
      'toast-warning',
      {
        label: 'Oui',
        callback: () => {
          this.userService.deleteUser().subscribe({
            next: () => {
              localStorage.removeItem('token');
              this.addToast('Succès', 'Compte supprimé avec succès !', 'toast-success');
              this.router.navigate(['/login']);
            },
            error: (err) => {
              this.addToast('Erreur', 'Échec de la suppression du compte. Veuillez réessayer.', 'toast-error');
            }
          });
          this.removeToast(this.toasts.length - 1);
        }
      },
      {
        label: 'Non',
        callback: () => {
          this.removeToast(this.toasts.length - 1);
        }
      }
    );
  }

  openChangePasswordModal(): void {
    this.passwordForm.reset();
    this.passwordModal?.show();
  }

  changePasswordSubmit(): void {
    if (this.passwordForm.valid && this.user) {
      const newPassword = this.passwordForm.get('newPassword')?.value;
      const updatedUser = new Utilisateur({
        idUtilisateur: this.user.idUtilisateur,
        firstName: this.user.firstName,
        lastName: this.user.lastName,
        email: this.user.email,
        dateNaissance: this.user.dateNaissance,
        password: newPassword,
        photo: this.user.photo,
        role: this.user.role,
        status: this.user.status,
        dateInscription: this.user.dateInscription
      });

      this.userService.updateUserDetails(updatedUser).subscribe({
        next: (data) => {
          this.user = data;
          this.passwordModal?.hide();
          this.addToast('Succès', 'Mot de passe mis à jour avec succès !', 'toast-success');
          this.passwordForm.reset();
          setTimeout(() => {
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
              backdrop.remove();
            }
            const body = document.body;
            body.classList.remove('modal-open');
            body.style.overflow = '';
            body.style.paddingRight = '';
          }, 100);
        },
        error: (err) => {
          console.error('Erreur lors de la mise à jour du mot de passe:', err);
          this.addToast('Erreur', 'Échec de la mise à jour du mot de passe. Veuillez réessayer.', 'toast-error');
          this.passwordModal?.hide();
        }
      });
    } else {
      Object.keys(this.passwordForm.controls).forEach(field => {
        const control = this.passwordForm.get(field);
        control?.markAsTouched();
      });
    }
  }

  minimumAgeValidator(minAge: number) {
    return (control: any) => {
      if (!control.value) return null;
      const today = new Date();
      const birthDate = new Date(control.value);
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        return age - 1 >= minAge ? null : { underage: true };
      }
      return age >= minAge ? null : { underage: true };
    };
  }

  validateField(field: string): void {
    const control = this.profileForm.get(field);
    if (control?.invalid && (control.touched || control.dirty)) {
      let message = '';
      let title = 'Erreur de validation';
      switch (field) {
        case 'firstName':
          if (control.errors?.['required']) message = 'Le prénom est requis.';
          else if (control.errors?.['minlength']) message = 'Le prénom doit contenir au moins 2 caractères.';
          else if (control.errors?.['pattern']) message = 'Le prénom ne doit contenir que des lettres.';
          break;
        case 'lastName':
          if (control.errors?.['required']) message = 'Le nom de famille est requis.';
          else if (control.errors?.['minlength']) message = 'Le nom de famille doit contenir au moins 2 caractères.';
          else if (control.errors?.['pattern']) message = 'Le nom de famille ne doit contenir que des lettres.';
          break;
        case 'email':
          if (control.errors?.['required']) message = 'L\'email est requis.';
          else if (control.errors?.['email']) message = 'Veuillez entrer un email valide.';
          break;
        case 'dateNaissance':
          if (control.errors?.['required']) message = 'La date de naissance est requise.';
          else if (control.errors?.['underage']) message = 'Vous devez avoir au moins 18 ans.';
          break;
      }
      if (message) {
        this.addToast(title, message, 'toast-error');
      }
    }
  }

  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { mismatch: true };
  }

  addToast(title: string, message: string, type: string, ...actions: { label: string; callback: () => void }[]): void {
    this.toasts.push({ title, message, type, action: actions.length > 0 ? actions[0] : undefined });
    setTimeout(() => {
      const toastElement = document.querySelectorAll('.toast')[this.toasts.length - 1];
      if (toastElement) {
        const toast = new bootstrap.Toast(toastElement, { delay: 10000 });
        toast.show();
      }
    }, 0);
    setTimeout(() => {
      this.toasts.shift();
    }, 10000);
  }

  removeToast(index: number): void {
    this.toasts.splice(index, 1);
  }

  initializeToasts(): void {
    document.querySelectorAll('.toast').forEach(toastElement => {
      const toast = new bootstrap.Toast(toastElement, { delay: 5000 });
      toast.show();
    });
  }
}
