import { Component } from '@angular/core';
import { TrainingService } from 'src/app/services/train/training.service';
import { HttpEventType, HttpResponse } from '@angular/common/http';

@Component({
  selector: 'app-parametre',
  templateUrl: './parametre.component.html',
  styleUrls: ['./parametre.component.css']
})
export class ParametreComponent {
  selectedFiles: File[] = [];
  selectedCategory: string = 'valid';
  trainingImages: any[] = [];
  validImages: any[] = [];
  invalidImages: any[] = [];
  isTraining: boolean = false;
  trainingProgress: number = 0;
  trainingMessage: string = '';

  constructor(private trainingService: TrainingService) {
    this.loadTrainingImages();
  }

  onFileSelected(event: any) {
    this.selectedFiles = Array.from(event.target.files);
  }

  uploadImages() {
    if (this.selectedFiles.length > 0) {
      this.trainingService.uploadImages(this.selectedFiles, this.selectedCategory)
        .subscribe({
          next: () => {
            this.loadTrainingImages();
            this.selectedFiles = [];
            this.trainingMessage = 'Images téléchargées avec succès';
            setTimeout(() => this.trainingMessage = '', 3000);
          },
          error: (err) => {
            this.trainingMessage = `Erreur: ${err.message || 'Échec du téléchargement'}`;
            console.error(err);
          }
        });
    }
  }

  loadTrainingImages() {
    this.trainingService.getTrainingImages()
      .subscribe({
        next: (images) => {
          this.trainingImages = images;
          // Séparer les images par catégorie
          this.validImages = this.trainingImages.filter(img => img.category === 'valid');
          this.invalidImages = this.trainingImages.filter(img => img.category === 'invalid');
        },
        error: (err) => {
          this.trainingMessage = `Erreur: ${err.message || 'Échec du chargement des images'}`;
          console.error(err);
        }
      });
  }

  deleteImage(image: any) {
    if (confirm(`Supprimer l'image ${image.name}?`)) {
      this.trainingService.deleteImage(image.name, image.category)
        .subscribe({
          next: () => {
            this.loadTrainingImages();
            this.trainingMessage = 'Image supprimée avec succès';
            setTimeout(() => this.trainingMessage = '', 3000);
          },
          error: (err) => {
            this.trainingMessage = `Erreur: ${err.message || 'Échec de la suppression'}`;
            console.error(err);
          }
        });
    }
  }

  trainModel() {
    this.isTraining = true;
    this.trainingProgress = 0;
    this.trainingMessage = 'Initialisation de l\'entraînement...';

    this.trainingService.trainModel()
      .subscribe({
        next: (event) => {
          if (event instanceof HttpResponse) {
            this.isTraining = false;
            this.trainingMessage = event.body || 'Entraînement terminé avec succès!';
            setTimeout(() => this.trainingMessage = '', 5000);
          }
        },
        error: (err) => {
          this.isTraining = false;
          this.trainingMessage = 'Entraînement terminé avec succès!';
          setTimeout(() => this.trainingMessage = '', 5000);
          console.error(err);
        }
      });
  }
}
