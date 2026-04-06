import { Component, EventEmitter, Output, Input } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { OcrService, CINData, OCRResponse } from '../../services/ocr.service';

@Component({
  selector: 'app-cin-ocr-extractor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="cin-ocr-extractor">
      <div class="upload-section" [class.drag-over]="isDragOver" 
           (dragover)="onDragOver($event)" 
           (dragleave)="onDragLeave($event)" 
           (drop)="onDrop($event)">
        
        <div class="upload-area" (click)="fileInput.click()">
          <div class="upload-icon">
            <i class="fas fa-camera" *ngIf="!isProcessing"></i>
            <div class="spinner" *ngIf="isProcessing"></div>
          </div>
          
          <div class="upload-text">
            <h3 *ngIf="!isProcessing">
              <i class="fas fa-id-card"></i>
              Scanner votre CIN
            </h3>
            <p *ngIf="!isProcessing">
              Cliquez ou glissez votre carte d'identité tunisienne ici
            </p>
            <p *ngIf="isProcessing" class="processing-text">
              <i class="fas fa-spinner fa-spin"></i>
              Extraction en cours...
            </p>
          </div>
          
          <input type="file" 
                 #fileInput 
                 accept="image/*" 
                 (change)="onFileSelected($event)"
                 style="display: none;">
        </div>
      </div>

      <div class="preview-section" *ngIf="selectedFile">
        <img [src]="imagePreview" alt="Aperçu CIN" class="preview-image">
        <button type="button" class="btn-clear" (click)="clearFile()">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="result-section" *ngIf="ocrResult">
        <div class="result-header">
          <h4>
            <i class="fas fa-check-circle" [class.success]="ocrResult.success"></i>
            Résultat de l'extraction
          </h4>
          <div class="confidence-badge">
            Confiance: {{(ocrResult.confidence * 100).toFixed(1)}}%
          </div>
        </div>

        <div class="result-data" *ngIf="ocrResult.success && ocrResult.data">
          <div class="data-grid">
            <div class="data-item" [class.valid]="ocrResult.data.cin">
              <label>CIN:</label>
              <span>{{ocrResult.data.cin || 'Non détecté'}}</span>
            </div>
            
            <div class="data-item" [class.valid]="ocrResult.data.nom">
              <label>Nom:</label>
              <span>{{ocrResult.data.nom || 'Non détecté'}}</span>
            </div>
            
            <div class="data-item" [class.valid]="ocrResult.data.prenom">
              <label>Prénom:</label>
              <span>{{ocrResult.data.prenom || 'Non détecté'}}</span>
            </div>
            
            <div class="data-item" [class.valid]="ocrResult.data.date_naissance">
              <label>Date de naissance:</label>
              <span>{{ocrResult.data.date_naissance || 'Non détectée'}}</span>
            </div>
            
            <div class="data-item" [class.valid]="ocrResult.data.lieu_naissance">
              <label>Lieu de naissance:</label>
              <span>{{ocrResult.data.lieu_naissance || 'Non détecté'}}</span>
            </div>
            
            <div class="data-item" [class.valid]="ocrResult.data.sexe">
              <label>Sexe:</label>
              <span>{{ocrResult.data.sexe || 'Non détecté'}}</span>
            </div>
          </div>

          <div class="actions">
            <button type="button" class="btn-primary" (click)="applyData()">
              <i class="fas fa-check"></i>
              Appliquer ces données
            </button>
            <button type="button" class="btn-secondary" (click)="retryExtraction()">
              <i class="fas fa-redo"></i>
              Réessayer
            </button>
          </div>
        </div>

        <div class="error-message" *ngIf="!ocrResult.success">
          <i class="fas fa-exclamation-triangle"></i>
          {{ocrResult.message || 'Erreur lors de l\'extraction'}}
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./cin-ocr-extractor.component.css']
})
export class CinOcrExtractorComponent {
  @Output() dataExtracted = new EventEmitter<CINData>();
  @Input() autoApply = false;
  @Input() showDebug = false;

  selectedFile: File | null = null;
  imagePreview: string | null = null;
  isProcessing = false;
  isDragOver = false;
  ocrResult: OCRResponse | null = null;

  constructor(private http: HttpClient, private ocrService: OcrService) {}

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  private handleFile(file: File): void {
    if (!file.type.startsWith('image/')) {
      this.showError('Veuillez sélectionner une image valide');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      this.showError('L\'image est trop volumineuse (max 10MB)');
      return;
    }

    this.selectedFile = file;
    this.createImagePreview(file);
    this.extractCINData(file);
  }

  private createImagePreview(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.imagePreview = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  private extractCINData(file: File): void {
    this.isProcessing = true;
    this.ocrResult = null;

    this.ocrService.extractCINInformation(file).subscribe({
      next: (response) => {
        this.isProcessing = false;
        this.ocrResult = response;
        
        if (response.success && this.autoApply && response.data) {
          this.dataExtracted.emit(response.data);
        }
      },
      error: (error) => {
        this.isProcessing = false;
        this.ocrResult = {
          success: false,
          data: this.getEmptyCINData(),
          method: 'Error',
          confidence: 0,
          real_text: null,
          message: 'Erreur de communication avec le service OCR',
          timestamp: Date.now()
        };
        console.error('OCR Error:', error);
      }
    });
  }

  applyData(): void {
    if (this.ocrResult?.success && this.ocrResult.data) {
      this.dataExtracted.emit(this.ocrResult.data);
    }
  }

  retryExtraction(): void {
    if (this.selectedFile) {
      this.extractCINData(this.selectedFile);
    }
  }

  clearFile(): void {
    this.selectedFile = null;
    this.imagePreview = null;
    this.ocrResult = null;
  }

  private getEmptyCINData(): CINData {
    return {
      cin: null,
      nom: null,
      prenom: null,
      date_naissance: null,
      lieu_naissance: null,
      sexe: null,
      date_expiration: null,
      nationalite: 'Tunisienne'
    };
  }

  private showError(message: string): void {
    this.ocrResult = {
      success: false,
      data: this.getEmptyCINData(),
      method: 'Error',
      confidence: 0,
      real_text: null,
      message: message,
      timestamp: Date.now()
    };
  }
}
