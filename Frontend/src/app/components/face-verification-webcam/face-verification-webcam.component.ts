import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { Subject } from 'rxjs';
import { WebcamImage, WebcamInitError } from 'ngx-webcam';
import { FaceVerificationResponse, FaceVerificationService } from '../../services/face-verification.service';

@Component({
  selector: 'app-face-verification-webcam',
  templateUrl: './face-verification-webcam.component.html',
  styleUrls: ['./face-verification-webcam.component.css']
})
export class FaceVerificationWebcamComponent implements OnChanges {
  @Input() identityDocument: File | null = null;
  @Output() photoCaptured = new EventEmitter<File>();
  @Output() verificationCompleted = new EventEmitter<FaceVerificationResponse>();

  trigger: Subject<void> = new Subject<void>();
  webcamImage: WebcamImage | null = null;
  capturedFile: File | null = null;
  webcamError = '';
  isVerifying = false;
  verificationResult: FaceVerificationResponse | null = null;

  constructor(private faceVerificationService: FaceVerificationService) {}

  triggerSnapshot(): void {
    this.trigger.next();
  }

  handleImage(webcamImage: WebcamImage): void {
    this.webcamImage = webcamImage;
    this.capturedFile = this.dataUrlToFile(webcamImage.imageAsDataUrl, `selfie_${Date.now()}.jpg`);
    this.photoCaptured.emit(this.capturedFile);
    this.webcamError = '';
    this.verificationResult = null;

    // Lancer automatiquement la verification apres capture si le document est deja disponible.
    if (this.identityDocument) {
      this.verifyIdentity();
    }
  }

  handleInitError(error: WebcamInitError): void {
    this.webcamError = error.message || 'Impossible d\'initialiser la webcam.';
  }

  verifyIdentity(): void {
    if (this.isVerifying) {
      return;
    }

    if (!this.capturedFile || !this.identityDocument) {
      this.webcamError = 'Veuillez capturer un selfie et fournir un document d\'identit�.';
      return;
    }

    this.isVerifying = true;
    this.verificationResult = null;
    this.webcamError = '';

    this.faceVerificationService.verifyFace(this.capturedFile, this.identityDocument).subscribe({
      next: (res) => {
        this.verificationResult = res;
        this.verificationCompleted.emit(res);
        this.isVerifying = false;
      },
      error: (err) => {
        this.isVerifying = false;
        this.verificationResult = null;
        this.webcamError = err?.error?.message || 'Erreur lors de la v�rification faciale.';
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Si le selfie est deja capture et que le document vient d'etre ajoute, verifier automatiquement.
    if (changes['identityDocument'] && this.identityDocument && this.capturedFile && !this.verificationResult) {
      this.verifyIdentity();
    }
  }

  private dataUrlToFile(dataUrl: string, filename: string): File {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    return new File([u8arr], filename, { type: mime });
  }
}
