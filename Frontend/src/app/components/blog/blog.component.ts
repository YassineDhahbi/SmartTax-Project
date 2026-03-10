import { Component, EventEmitter, Output } from '@angular/core';
import { CinValidatorService } from 'src/app/services/cin/cin-validator.service';

@Component({
  selector: 'app-blog',
  templateUrl: './blog.component.html',
  styleUrls: ['./blog.component.css']
})
export class BlogComponent {
  @Output() validationComplete = new EventEmitter<{ status: string, confidence: number }>();

  selectedFile: File | null = null;
  previewUrl: string | ArrayBuffer | null = null;
  isLoading = false;
  errorMessage = '';
  validationResult: { status: string, confidence: number, valid: boolean, adjusted: boolean } | null = null;

  constructor(private cinValidator: CinValidatorService) {}

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && this.validateImage(file)) {
      this.selectedFile = file;
      this.previewImage(file);
      this.errorMessage = '';
      this.validationResult = null;
    }
  }

  previewImage(file: File): void {
    const reader = new FileReader();
    reader.onload = () => this.previewUrl = reader.result;
    reader.readAsDataURL(file);
  }

  validateImage(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      this.errorMessage = 'Seuls les formats JPEG et PNG sont acceptés';
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.errorMessage = 'La taille de l\'image ne doit pas dépasser 5MB';
      return false;
    }
    return true;
  }

  verifyCin(): void {
    if (!this.selectedFile) {
      this.errorMessage = 'Veuillez sélectionner une image de CIN';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.cinValidator.validateCin(this.selectedFile).subscribe({
      next: (response) => {
        if (response) {
          this.validationResult = {
            status: response.status,
            confidence: response.confidence,
            valid: response.valid,
            adjusted: response.adjusted
          };
          this.validationComplete.emit({ status: response.status, confidence: response.confidence });
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Erreur lors de la vérification: ' + (err.error?.message || err.message || 'Erreur inconnue');
        this.isLoading = false;
      }
    });
  }

  retryValidation(): void {
    this.selectedFile = null;
    this.previewUrl = null;
    this.validationResult = null;
  }
}
