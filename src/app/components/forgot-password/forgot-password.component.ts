import { Component } from '@angular/core';
import { UserService } from 'src/app/services/user/user.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent {
  email: string = '';
  successMessage: string | null = null;
  errorMessage: string | null = null;

  constructor(private userService: UserService) {}

  onSubmit(): void {
    this.successMessage = null;
    this.errorMessage = null;
    this.userService.forgotPassword(this.email).subscribe({
      next: (response) => {
        this.successMessage = response.success;
      },
      error: (err) => {
        this.errorMessage = err.error.error || 'Erreur lors de l\'envoi du lien de réinitialisation';
      }
    });
  }
}
