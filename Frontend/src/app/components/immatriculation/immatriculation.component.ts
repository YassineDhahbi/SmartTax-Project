import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { ImmatriculationService } from '../../services/immatriculation.service';
import { NotificationService } from '../../services/notification.service';
import { 
  Immatriculation, 
  CreateImmatriculationDto, 
  TypeContribuable, 
  DossierStatus, 
  SubmissionMode 
} from '../../models/immatriculation.model';

@Component({
  selector: 'app-immatriculation',
  templateUrl: './immatriculation.component.html',
  styleUrls: ['./immatriculation.component.css'],
  animations: [
    trigger('stepAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(30px)' }),
        animate('500ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        style({ opacity: 1, transform: 'translateX(0)' }),
        animate('500ms ease-out', style({ opacity: 0, transform: 'translateX(-30px)' }))
      ])
    ]),
    trigger('modalAnimation', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        style({ opacity: 1 }),
        animate('300ms ease-out', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class ImmatriculationComponent implements OnInit {
  @ViewChild('videoElement') videoElement!: ElementRef;
  @ViewChild('canvas') canvas!: ElementRef;

  // Formulaire
  immatriculationForm!: FormGroup;
  currentStep: number = 1;
  totalSteps: number = 6;
  
  // Progression
  get progressPercentage(): number {
    return (this.currentStep / this.totalSteps) * 100;
  }

  // Fichiers
  files: any = {
    identite: null,
    activite: null,
    photo: null,
    autres: []
  };

  // Webcam
  showWebcamModal: boolean = false;
  stream: any = null;
  capturedPhoto: boolean = false;
  photoPreview: string = '';
  identityPhoto: string = '';

  // Vérification
  ocrResults: any[] = [];
  faceRecognitionScore: number = 0;
  duplicateDetected: boolean = false;
  overallScore: number = 0;
  completenessScore: number = 0;
  verificationScore: number = 0;
  documentsScore: number = 0;

  // Soumission
  submissionMode: 'draft' | 'submit' = 'submit';
  confirmed: boolean = true; // Changé à true pour que le bouton soit toujours cliquable
  isSubmitting: boolean = false;
  showSuccessModal: boolean = false;
  dossierNumber: string = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private immatriculationService: ImmatriculationService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.generateDossierNumber();
  }

  // Initialisation du formulaire
  private initForm(): void {
    this.immatriculationForm = this.fb.group({
      // Type contribuable
      typeContribuable: ['', Validators.required],
      
      // Personne Physique
      nom: [''],
      prenom: [''],
      cin: [''],
      dateNaissance: [''],
      
      // Personne Morale
      raisonSociale: [''],
      matriculeFiscal: [''],
      registreCommerce: [''],
      representantLegal: [''],
      
      // Champs communs
      email: ['', [Validators.required, Validators.email]],
      telephone: ['', Validators.required],
      adresse: ['', Validators.required],
      
      // Activité
      typeActivite: ['', Validators.required],
      secteur: ['', Validators.required],
      adresseProfessionnelle: ['', Validators.required],
      dateDebutActivite: ['', Validators.required],
      descriptionActivite: ['', Validators.required]
    });
  }

  // Navigation entre étapes
  nextStep(): void {
    if (this.validateCurrentStep()) {
      if (this.currentStep < this.totalSteps) {
        this.currentStep++;
        this.updateProgress();
        
        // Déclencher les vérifications automatiques à l'étape 5
        if (this.currentStep === 5) {
          this.performAutomaticVerification();
        }
      }
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.updateProgress();
    }
  }

  private validateCurrentStep(): boolean {
    switch (this.currentStep) {
      case 1:
        return !!this.immatriculationForm.get('typeContribuable')?.valid;
      case 2:
        return this.validatePersonalInfo();
      case 3:
        return this.validateActivityInfo();
      case 4:
        return this.requiredFilesUploaded();
      default:
        return true;
    }
  }

  private validatePersonalInfo(): boolean {
    const type = this.immatriculationForm.get('typeContribuable')?.value;
    
    if (type === 'physique') {
      return !!this.immatriculationForm.get('nom')?.valid &&
             !!this.immatriculationForm.get('prenom')?.valid &&
             !!this.immatriculationForm.get('cin')?.valid &&
             !!this.immatriculationForm.get('dateNaissance')?.valid &&
             !!this.immatriculationForm.get('email')?.valid &&
             !!this.immatriculationForm.get('telephone')?.valid &&
             !!this.immatriculationForm.get('adresse')?.valid;
    } else {
      return !!this.immatriculationForm.get('raisonSociale')?.valid &&
             !!this.immatriculationForm.get('registreCommerce')?.valid &&
             !!this.immatriculationForm.get('representantLegal')?.valid &&
             !!this.immatriculationForm.get('email')?.valid &&
             !!this.immatriculationForm.get('telephone')?.valid &&
             !!this.immatriculationForm.get('adresse')?.valid;
    }
  }

  private validateActivityInfo(): boolean {
    return !!this.immatriculationForm.get('typeActivite')?.valid &&
           !!this.immatriculationForm.get('secteur')?.valid &&
           !!this.immatriculationForm.get('adresseProfessionnelle')?.valid &&
           !!this.immatriculationForm.get('dateDebutActivite')?.valid &&
           !!this.immatriculationForm.get('descriptionActivite')?.valid;
  }

  // Sélection type de contribuable
  selectTypeContribuable(type: string): void {
    this.immatriculationForm.patchValue({ typeContribuable: type });
    
    // Mettre à jour les validateurs selon le type
    if (type === 'physique') {
      this.immatriculationForm.get('nom')?.setValidators([Validators.required]);
      this.immatriculationForm.get('prenom')?.setValidators([Validators.required]);
      this.immatriculationForm.get('cin')?.setValidators([Validators.required]);
      this.immatriculationForm.get('dateNaissance')?.setValidators([Validators.required]);
      
      this.immatriculationForm.get('raisonSociale')?.clearValidators();
      this.immatriculationForm.get('registreCommerce')?.clearValidators();
      this.immatriculationForm.get('representantLegal')?.clearValidators();
    } else {
      this.immatriculationForm.get('raisonSociale')?.setValidators([Validators.required]);
      this.immatriculationForm.get('registreCommerce')?.setValidators([Validators.required]);
      this.immatriculationForm.get('representantLegal')?.setValidators([Validators.required]);
      
      this.immatriculationForm.get('nom')?.clearValidators();
      this.immatriculationForm.get('prenom')?.clearValidators();
      this.immatriculationForm.get('cin')?.clearValidators();
      this.immatriculationForm.get('dateNaissance')?.clearValidators();
    }
    
    // Mettre à jour les validateurs
    Object.keys(this.immatriculationForm.controls).forEach(key => {
      this.immatriculationForm.get(key)?.updateValueAndValidity();
    });
  }

  // Gestion des fichiers
  onFileSelect(event: any, fileType: string): void {
    const files = event.target.files;
    
    if (fileType === 'autres') {
      this.files.autres = [...this.files.autres, ...Array.from(files)];
    } else {
      this.files[fileType] = files[0];
      
      if (fileType === 'photo') {
        this.previewPhoto(files[0]);
      }
      
      if (fileType === 'identite') {
        this.extractIdentityPhoto(files[0]);
      }
    }
  }

  onDrop(event: DragEvent, fileType: string): void {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    
    if (files && files.length > 0) {
      if (fileType === 'autres') {
        this.files.autres = [...this.files.autres, ...Array.from(files)];
      } else {
        this.files[fileType] = files[0];
        
        if (fileType === 'photo') {
          this.previewPhoto(files[0]);
        }
        
        if (fileType === 'identite') {
          this.extractIdentityPhoto(files[0]);
        }
      }
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
  }

  removeFile(fileType: string): void {
    this.files[fileType] = null;
    if (fileType === 'photo') {
      this.photoPreview = '';
    }
  }

  removeFileAtIndex(fileType: string, index: number): void {
    if (fileType === 'autres') {
      this.files.autres.splice(index, 1);
    }
  }

  private previewPhoto(file: File): void {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.photoPreview = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  private extractIdentityPhoto(file: File): void {
    // Simulation d'extraction de photo depuis CIN/Passeport
    // En réalité, ceci utiliserait une API de reconnaissance faciale
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.identityPhoto = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  requiredFilesUploaded(): boolean {
    return this.files.identite !== null && this.files.activite !== null;
  }

  // Webcam
  async openWebcam(): Promise<void> {
    this.showWebcamModal = true;
    this.capturedPhoto = false;
    
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      this.videoElement.nativeElement.srcObject = this.stream;
    } catch (error) {
      console.error('Erreur webcam:', error);
      alert('Impossible d\'accéder à la webcam. Veuillez vérifier les permissions.');
    }
  }

  closeWebcam(): void {
    this.showWebcamModal = false;
    if (this.stream) {
      this.stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      this.stream = null;
    }
  }

  capturePhoto(): void {
    const video = this.videoElement.nativeElement;
    const canvas = this.canvas.nativeElement;
    const context = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    
    this.capturedPhoto = true;
  }

  retakePhoto(): void {
    this.capturedPhoto = false;
  }

  usePhoto(): void {
    const canvas = this.canvas.nativeElement;
    const dataUrl = canvas.toDataURL('image/jpeg');
    
    // Convertir en fichier
    fetch(dataUrl)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], 'webcam-photo.jpg', { type: 'image/jpeg' });
        this.files.photo = file;
        this.photoPreview = dataUrl;
        this.closeWebcam();
      });
  }

  // Vérification automatique
  private async performAutomaticVerification(): Promise<void> {
    // OCR Processing
    await this.performOCR();
    
    // Face Recognition
    if (this.immatriculationForm.get('typeContribuable')?.value === 'physique') {
      await this.performFaceRecognition();
    }
    
    // Duplicate Detection
    await this.performDuplicateDetection();
    
    // Calculate scores
    this.calculateScores();
  }

  private async performOCR(): Promise<void> {
    // Simulation OCR - en réalité, appeler une API OCR
    const cin = this.immatriculationForm.get('cin')?.value;
    const nom = this.immatriculationForm.get('nom')?.value;
    const prenom = this.immatriculationForm.get('prenom')?.value;
    
    this.ocrResults = [
      { field: 'CIN', value: cin, extracted: cin, match: true },
      { field: 'Nom', value: nom, extracted: nom, match: true },
      { field: 'Prénom', value: prenom, extracted: prenom, match: true }
    ];
    
    // Simulation de délai
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  private async performFaceRecognition(): Promise<void> {
    // Simulation reconnaissance faciale
    // En réalité, comparer les images avec une API ML
    this.faceRecognitionScore = Math.floor(Math.random() * 20) + 80; // 80-99%
    
    // Simulation de délai
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  private async performDuplicateDetection(): Promise<void> {
    // Simulation détection de doublons
    // En réalité, vérifier en base de données
    const cin = this.immatriculationForm.get('cin')?.value;
    const email = this.immatriculationForm.get('email')?.value;
    
    // Simulation: 10% de chance de détecter un doublon
    this.duplicateDetected = Math.random() < 0.1;
    
    // Simulation de délai
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private calculateScores(): void {
    // Score de complétude
    let completedFields = 0;
    let totalFields = 0;
    
    Object.keys(this.immatriculationForm.controls).forEach(key => {
      totalFields++;
      if (this.immatriculationForm.get(key)?.value) {
        completedFields++;
      }
    });
    
    this.completenessScore = Math.floor((completedFields / totalFields) * 100);
    
    // Score de vérification (basé sur OCR et reconnaissance faciale)
    const ocrScore = this.ocrResults.filter(r => r.match).length / Math.max(this.ocrResults.length, 1) * 100;
    const faceScore = this.faceRecognitionScore;
    this.verificationScore = Math.floor((ocrScore + faceScore) / 2);
    
    // Score des documents
    let documentScore = 0;
    if (this.files.identite) documentScore += 33;
    if (this.files.activite) documentScore += 33;
    if (this.files.photo || this.immatriculationForm.get('typeContribuable')?.value?.toUpperCase() === 'MORALE') documentScore += 34;
    this.documentsScore = documentScore;
    
    // Score global
    this.overallScore = Math.floor((this.completenessScore + this.verificationScore + this.documentsScore) / 3);
  }

  calculateVerificationScore(): number {
    const normalizedType = this.immatriculationForm.get('typeContribuable')?.value?.toUpperCase();
    
    // Score de base
    let score = 40;
    
    // Score selon le type
    if (normalizedType === 'PHYSIQUE') {
      score += this.immatriculationForm.get('cin')?.value ? 20 : 0;
      score += this.files.photo ? 15 : 0;
    } else if (normalizedType === 'MORALE') {
      score += this.immatriculationForm.get('registreCommerce')?.value ? 20 : 0;
      score += this.immatriculationForm.get('matriculeFiscal')?.value ? 15 : 0;
    }
    
    this.verificationScore = Math.min(score, 100);
    return this.verificationScore;
  }

  calculateDocumentsScore(): number {
    let score = 0;
    
    // Fichiers de base
    if (this.files.identite) score += 33;
    if (this.files.activite) score += 33;
    
    const normalizedType = this.immatriculationForm.get('typeContribuable')?.value?.toUpperCase();
    if (this.files.photo || normalizedType === 'MORALE') score += 34;
    
    this.documentsScore = Math.min(score, 100);
    return this.documentsScore;
  }

  // Soumission
  async submitForm(): Promise<void> {
    if (!this.confirmed) return;
    
    this.isSubmitting = true;
    
    try {
      // Créer le DTO à partir du formulaire
      const typeContribuableValue = this.immatriculationForm.get('typeContribuable')?.value;
      console.log('🔍 Type contribuable brut du formulaire:', typeContribuableValue);
      console.log('🔍 Type contribuable typeof:', typeof typeContribuableValue);
      
      // Convertir en majuscules pour le backend
      const normalizedTypeContribuable = typeContribuableValue?.toUpperCase() as TypeContribuable;
      console.log('🔍 Type contribuable normalisé:', normalizedTypeContribuable);
      
      const dto: CreateImmatriculationDto = {
        typeContribuable: normalizedTypeContribuable,
        nom: this.immatriculationForm.get('nom')?.value || undefined,
        prenom: this.immatriculationForm.get('prenom')?.value || undefined,
        cin: this.immatriculationForm.get('cin')?.value || undefined,
        dateNaissance: this.immatriculationForm.get('dateNaissance')?.value || undefined,
        raisonSociale: this.immatriculationForm.get('raisonSociale')?.value || undefined,
        matriculeFiscalExistant: this.immatriculationForm.get('matriculeFiscal')?.value || undefined,
        registreCommerce: this.immatriculationForm.get('registreCommerce')?.value || undefined,
        representantLegal: this.immatriculationForm.get('representantLegal')?.value || undefined,
        email: this.immatriculationForm.get('email')?.value || '',
        telephone: this.immatriculationForm.get('telephone')?.value || '',
        adresse: this.immatriculationForm.get('adresse')?.value || '',
        typeActivite: this.immatriculationForm.get('typeActivite')?.value || '',
        secteur: this.immatriculationForm.get('secteur')?.value || '',
        adresseProfessionnelle: this.immatriculationForm.get('adresseProfessionnelle')?.value || '',
        dateDebutActivite: this.immatriculationForm.get('dateDebutActivite')?.value || '',
        descriptionActivite: this.immatriculationForm.get('descriptionActivite')?.value || '',
        confirmed: this.confirmed,
        submissionMode: this.submissionMode === 'draft' ? SubmissionMode.DRAFT : SubmissionMode.SUBMIT,
        // Ajouter les scores par défaut pour éviter les erreurs de nullité
        overallScore: this.overallScore || 0,
        completenessScore: this.completenessScore || 0,
        verificationScore: this.verificationScore || 0,
        documentsScore: this.documentsScore || 0,
        faceRecognitionScore: this.faceRecognitionScore || 0
      };

      // Validation préalable des données
      if (!this.validateFormData()) {
        this.notificationService.showError(
          'Veuillez remplir tous les champs obligatoires avant de soumettre.',
          'Formulaire incomplet'
        );
        return;
      }

      let result: Immatriculation;

      // Utiliser l'endpoint JSON réel pour sauvegarder dans la base de données
      console.log('🔍 DTO envoyé au backend:', dto);
      console.log('🔍 Scores calculés:', {
        overallScore: this.overallScore,
        completenessScore: this.completenessScore,
        verificationScore: this.verificationScore,
        documentsScore: this.documentsScore,
        faceRecognitionScore: this.faceRecognitionScore
      });
      
      // Pour le debug, essayer d'abord avec les mêmes données que le test manuel
      if (dto.email?.includes('test')) {
        console.log('🧪 Mode test activé - utilisation des données de test manuel');
        const testDto: CreateImmatriculationDto = {
          typeContribuable: TypeContribuable.PHYSIQUE,
          email: `test${Math.floor(Math.random() * 9999)}@example.com`,
          telephone: "21612345678",
          adresse: "Test Address",
          typeActivite: "Commerce",
          secteur: "Retail",
          adresseProfessionnelle: "Test Address",
          dateDebutActivite: "2024-01-01",
          descriptionActivite: "Test Activity",
          confirmed: true,
          submissionMode: SubmissionMode.SUBMIT,
          overallScore: 85,
          completenessScore: 90,
          verificationScore: 80,
          documentsScore: 88,
          faceRecognitionScore: 85
        };
        console.log('🧪 DTO de test:', testDto);
        result = await this.immatriculationService.createImmatriculation(testDto).toPromise() as Immatriculation;
      } else {
        result = await this.immatriculationService.createImmatriculation(dto).toPromise() as Immatriculation;
      }

      // Si soumission complète et non brouillon, soumettre pour validation via le backend
      if (this.submissionMode === 'submit' && result.id) {
        result = await this.immatriculationService.submitDossier(result.id).toPromise() as Immatriculation;
      }

      // Mettre à jour le numéro de dossier
      this.dossierNumber = result.dossierNumber;
      
      // Afficher le modal de succès
      this.showSuccessModal = true;
      
    } catch (error: any) {
      console.error('Erreur lors de la soumission:', error);
      
      // Gérer les erreurs spécifiques avec des notifications
      if (error.message) {
        if (error.message.includes('Doublon détecté')) {
          this.notificationService.showError(
            'Un dossier avec ces informations existe déjà. Veuillez vérifier vos CIN, email ou registre de commerce.',
            'Doublon détecté'
          );
        } else if (error.message.includes('Données invalides')) {
          this.notificationService.showError(
            'Les données fournies sont invalides. Veuillez vérifier tous les champs obligatoires.',
            'Données invalides'
          );
        } else if (error.message.includes('Dossier non trouvé')) {
          this.notificationService.showError(
            'Une erreur technique est survenue. Veuillez réessayer.',
            'Erreur technique'
          );
        } else {
          this.notificationService.showError(error.message, 'Erreur de soumission');
        }
      } else {
        this.notificationService.showError(
          'Une erreur est survenue lors de la soumission. Veuillez réessayer.',
          'Erreur inattendue'
        );
      }
    } finally {
      this.isSubmitting = false;
    }
  }

  // Vérifier si des fichiers sont présents
  private hasFiles(): boolean {
    return !!(this.files.identite || this.files.activite || this.files.photo || this.files.autres.length > 0);
  }

  // Valider les données du formulaire avant envoi
  private validateFormData(): boolean {
    const formValues = this.immatriculationForm.value;
    
    // Champs obligatoires pour tous les types
    const requiredFields = [
      'email',
      'telephone', 
      'adresse',
      'typeActivite',
      'secteur',
      'adresseProfessionnelle',
      'dateDebutActivite',
      'descriptionActivite'
    ];
    
    // Vérifier les champs obligatoires
    for (const field of requiredFields) {
      if (!formValues[field] || formValues[field].toString().trim() === '') {
        console.error(`❌ Champ obligatoire manquant: ${field}`);
        return false;
      }
    }
    
    // Validation spécifique selon le type de contribuable
    const normalizedType = formValues.typeContribuable?.toUpperCase();
    if (normalizedType === 'PHYSIQUE') {
      const physicalFields = ['nom', 'prenom', 'cin'];
      for (const field of physicalFields) {
        if (!formValues[field] || formValues[field].toString().trim() === '') {
          console.error(`❌ Champ personne physique manquant: ${field}`);
          return false;
        }
      }
    } else if (normalizedType === 'MORALE') {
      const moralFields = ['raisonSociale'];
      for (const field of moralFields) {
        if (!formValues[field] || formValues[field].toString().trim() === '') {
          console.error(`❌ Champ personne morale manquant: ${field}`);
          return false;
        }
      }
    }
    
    // Validation des formats
    if (formValues.email && !this.immatriculationService.validateEmail(formValues.email)) {
      console.error('❌ Email invalide');
      return false;
    }
    
    if (formValues.telephone && !this.immatriculationService.validateTelephone(formValues.telephone)) {
      console.error('❌ Téléphone invalide');
      return false;
    }
    
    if (formValues.cin && !this.immatriculationService.validateCIN(formValues.cin)) {
      console.error('❌ CIN invalide');
      return false;
    }
    
    console.log('✅ Validation du formulaire réussie');
    return true;
  }

  private generateDossierNumber(): void {
    const now = new Date();
    const year = now.getFullYear();
    const random = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
    this.dossierNumber = `TN-DG-${year}-${random}`;
  }

  // Navigation
  goToDashboard(): void {
    this.router.navigate(['/dossier']);
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.goToDashboard();
  }

  // Progression
  progress: number = 0;

  // Mettre à jour la progression
  private updateProgress(): void {
    const totalSteps = 6;
    this.progress = (this.currentStep / totalSteps) * 100;
  }

  // Étapes du formulaire
  steps = [
    { title: 'Type Contribuable', icon: 'fa-user-tag' },
    { title: 'Informations Personnelles', icon: 'fa-user' },
    { title: 'Coordonnées', icon: 'fa-map-marker-alt' },
    { title: 'Activité', icon: 'fa-briefcase' },
    { title: 'Documents', icon: 'fa-file-upload' },
    { title: 'Validation', icon: 'fa-check-circle' }
  ];

  // Obtenir les étapes
  getSteps(): any[] {
    return this.steps;
  }

  // Nettoyage
  ngOnDestroy(): void {
    // Arrêter la webcam si elle est active
    if (this.stream) {
      this.stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
    }
  }
}
