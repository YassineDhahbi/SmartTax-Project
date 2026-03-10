import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/auth/auth.service';
import { UserService } from 'src/app/services/user/user.service';
import { Utilisateur } from 'src/app/models/utilisateur';
import { Router } from '@angular/router';
import * as bootstrap from 'bootstrap';

@Component({
  selector: 'app-utilisateur',
  templateUrl: './utilisateur.component.html',
  styleUrls: ['./utilisateur.component.css']
})
export class UtilisateurComponent implements OnInit {
  utilisateurs: Utilisateur[] = [];
  toasts: { title: string; message: string; type: string }[] = [];

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadUtilisateurs();
  }

  loadUtilisateurs(): void {
    this.userService.getAllUtilisateurs().subscribe({
      next: (data) => {
        this.utilisateurs = data;
        console.log('Utilisateurs chargés:', this.utilisateurs);
      },
      error: (err) => {
        console.error('Erreur lors du chargement des utilisateurs:', err);
        if (err.status === 403) {
          this.router.navigate(['/login']);
        }
        this.addToast('Erreur', 'Échec du chargement des utilisateurs.', 'toast-error');
      }
    });
  }

  deleteUtilisateur(id: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      this.userService.deleteUser1(id).subscribe({
        next: () => {
          this.loadUtilisateurs(); // Recharger la liste
          this.addToast('Succès', 'Utilisateur supprimé avec succès !', 'toast-success');
        },
        error: (err) => {
          console.error('Erreur lors de la suppression:', err);
          this.addToast('Erreur', 'Échec de la suppression de l\'utilisateur. Statut : ' + err.status, 'toast-error');
        }
      });
    }
  }

  updateRole(id: number, newRole: string): void {
    const updatedUser: Partial<Utilisateur> = { role: newRole };
    this.userService.updateUserDetails({ idUtilisateur: id, ...updatedUser }).subscribe({
      next: () => {
        this.loadUtilisateurs(); // Recharger la liste après mise à jour
        this.addToast('Succès', 'Rôle mis à jour avec succès !', 'toast-success');
      },
      error: (err) => {
        console.error('Erreur lors de la mise à jour du rôle:', err);
        this.addToast('Erreur', 'Échec de la mise à jour du rôle. Statut : ' + err.status, 'toast-error');
      }
    });
  }

  addToast(title: string, message: string, type: string): void {
    this.toasts.push({ title, message, type });
    setTimeout(() => {
      const toastElement = document.querySelectorAll('.toast')[this.toasts.length - 1];
      if (toastElement) {
        const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
        toast.show();
      }
    }, 0);
    setTimeout(() => {
      this.toasts.shift();
    }, 3000);
  }
}
