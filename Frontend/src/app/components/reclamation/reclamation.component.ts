import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { NotificationService } from '../../services/notification.service';
import { ReclamationService } from '../../services/reclamation.service';


export interface Reclamation {
  id?: number;
  type: string;
  categorie: string;
  sujet: string;
  description: string;
  urgence: string;
  reference?: string;
  statut: 'BROUILLON' | 'SOUmis' | 'EN_COURS' | 'RESOLU';
  dateCreation: Date;
  dateSoumission?: Date;
  dateResolution?: Date;
  piecesJointes: string[];
  messages: Message[];
}

export interface Message {
  id?: number;
  contenu: string;
  auteur: 'contribuable' | 'agent';
  date: Date;
  lu: boolean;
}

@Component({
  selector: 'app-reclamation',
  templateUrl: './reclamation.component.html',
  styleUrls: ['./reclamation.component.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('500ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(-100%)' }),
        animate('300ms ease-out', style({ transform: 'translateX(0)' }))
      ])
    ])
  ]
})
export class ReclamationComponent implements OnInit {
  reclamationForm!: FormGroup;
  currentStep: number = 1;
  totalSteps: number = 4;
  
  // Types et catégories
  typesReclamation = [
    { value: 'TECHNIQUE', label: 'Problème Technique', icon: 'fa-cog' },
    { value: 'FISCAL', label: 'Question Fiscale', icon: 'fa-file-invoice-dollar' },
    { value: 'COMPTE', label: 'Problème de Compte', icon: 'fa-user-circle' },
    { value: 'DOCUMENT', label: 'Document Manquant', icon: 'fa-file-alt' },
    
    { value: 'AUTRE', label: 'Autre', icon: 'fa-question-circle' }
  ];

  categories = {
    TECHNIQUE: ['Erreur de connexion', 'Page non accessible', 'Problème d\'affichage', 'Autre'],
    FISCAL: ['Impôt sur le revenu', 'TVA', 'Taxe professionnelle', 'Autre'],
    COMPTE: ['Mot de passe oublié', 'Informations personnelles', 'Accès bloqué', 'Autre'],
    DOCUMENT: ['Facture manquante', 'Déclaration perdue', 'Certificat requis', 'Autre'],
    PAIEMENT: ['Paiement échoué', 'Remboursement', 'Facturation incorrecte', 'Autre'],
    AUTRE: ['Demande d\'information', 'Réclamation générale', 'Autre']
  };

  // État
  isSubmitting: boolean = false;
  showSuccessModal: boolean = false;
  reclamationId: string = '';
  
  // Fichiers
  files: File[] = [];
  maxFileSize: number = 5 * 1024 * 1024; // 5MB
  allowedTypes: string[] = ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  
  // Messages
  messageForm!: FormGroup;
  messages: Message[] = [];
  showMessages: boolean = false;
  
  // Réclamations existantes
  reclamations: Reclamation[] = [];
  selectedReclamation: Reclamation | null = null;
  showHistorique: boolean = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private reclamationService: ReclamationService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.initMessageForm();
    this.loadReclamations();
  }

  private initForm(): void {
    this.reclamationForm = this.fb.group({
      type: ['', Validators.required],
      categorie: ['', Validators.required],
      sujet: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(1000)]],
      urgence: ['MOYENNE', Validators.required],
      reference: [''],
      piecesJointes: this.fb.array([])
    });

    // Mettre à jour les catégories quand le type change
    this.reclamationForm.get('type')?.valueChanges.subscribe(type => {
      this.reclamationForm.get('categorie')?.setValue('');
    });
  }

  private initMessageForm(): void {
    this.messageForm = this.fb.group({
      contenu: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(500)]]
    });
  }

  // Navigation entre étapes
  nextStep(): void {
    if (this.validateCurrentStep()) {
      if (this.currentStep < this.totalSteps) {
        this.currentStep++;
      }
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  goToStep(step: number): void {
    if (step <= this.currentStep || this.validateCurrentStep()) {
      this.currentStep = step;
    }
  }

  public validateCurrentStep(): boolean {
    switch (this.currentStep) {
      case 1:
        return (this.reclamationForm.get('type')?.valid || false) && 
               (this.reclamationForm.get('categorie')?.valid || false);
      case 2:
        return (this.reclamationForm.get('sujet')?.valid || false) && 
               (this.reclamationForm.get('description')?.valid || false);
      case 3:
        return true; // Les pièces jointes sont optionnelles
      case 4:
        return true; // Validation finale
      default:
        return false;
    }
  }

  // Gestion des fichiers
  onFileSelect(event: any): void {
    const files: FileList = event.target.files;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (!this.allowedTypes.includes(file.type)) {
        this.notificationService.showError(`Type de fichier non autorisé: ${file.type}`);
        continue;
      }
      
      if (file.size > this.maxFileSize) {
        this.notificationService.showError(`Fichier trop volumineux: ${file.name} (max 5MB)`);
        continue;
      }
      
      if (!this.files.some(f => f.name === file.name)) {
        this.files.push(file);
        this.addPieceJointe(file);
      }
    }
    
    // Vider l'input
    event.target.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    const files = event.dataTransfer?.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (!this.allowedTypes.includes(file.type)) {
          this.notificationService.showError(`Type de fichier non autorisé: ${file.type}`);
          continue;
        }
        
        if (file.size > this.maxFileSize) {
          this.notificationService.showError(`Fichier trop volumineux: ${file.name} (max 5MB)`);
          continue;
        }
        
        if (!this.files.some(f => f.name === file.name)) {
          this.files.push(file);
          this.addPieceJointe(file);
        }
      }
    }
  }

  addPieceJointe(file: File): void {
    const piecesArray = this.reclamationForm.get('piecesJointes') as FormArray;
    piecesArray.push(this.fb.group({
      nom: [file.name],
      taille: [file.size],
      type: [file.type]
    }));
  }

  removeFile(index: number): void {
    this.files.splice(index, 1);
    const piecesArray = this.reclamationForm.get('piecesJointes') as FormArray;
    piecesArray.removeAt(index);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileIcon(type: string): string {
    if (type.includes('image')) return 'fa-image';
    if (type.includes('pdf')) return 'fa-file-pdf';
    if (type.includes('word')) return 'fa-file-word';
    return 'fa-file';
  }

  // Soumission
  saveAsDraft(): void {
    this.submitReclamation('BROUILLON');
  }

  submitReclamation(statut: string = 'SOUmis'): void {
    if (!this.validateCurrentStep()) {
      this.notificationService.showError('Veuillez compléter toutes les étapes obligatoires');
      return;
    }

    this.isSubmitting = true;
    
    // Préparer les données pour la nouvelle méthode
    const data = {
      type: this.reclamationForm.get('type')?.value,
      categorie: this.reclamationForm.get('categorie')?.value,
      sujet: this.reclamationForm.get('sujet')?.value,
      description: this.reclamationForm.get('description')?.value,
      urgence: this.reclamationForm.get('urgence')?.value,
      reference: this.reclamationForm.get('reference')?.value || '',
      nom: 'Test User', // À adapter avec les vraies données utilisateur
      telephone: '21612345678', // À adapter avec les vraies données utilisateur
      statut: statut
    };

    this.reclamationService.createReclamationWithForm(data, this.files).subscribe({
      next: (response: any) => {
        this.isSubmitting = false;
        this.reclamationId = response.reference;
        this.showSuccessModal = true;
        this.notificationService.showSuccess(`Réclamation ${statut === 'BROUILLON' ? 'enregistrée en brouillon' : 'soumise avec succès'}`);
        
        if (statut === 'SOUmis') {
          this.loadReclamations();
        }
      },
      error: (error: any) => {
        this.isSubmitting = false;
        console.error('Erreur détaillée:', error);
        this.notificationService.showError('Erreur lors de la soumission de la réclamation: ' + (error.error?.message || error.message));
      }
    });
  }

  // Messages
  sendMessage(): void {
    if (!this.messageForm.valid || !this.selectedReclamation) {
      return;
    }

    const message: Message = {
      contenu: this.messageForm.get('contenu')?.value,
      auteur: 'contribuable',
      date: new Date(),
      lu: false
    };

    this.reclamationService.sendMessage(this.selectedReclamation.id!, message).subscribe({
      next: (response: Message) => {
        this.messages.push(response);
        this.messageForm.reset();
        this.notificationService.showSuccess('Message envoyé');
      },
      error: () => {
        this.notificationService.showError('Erreur lors de l\'envoi du message');
      }
    });
  }

  loadMessages(reclamationId: number): void {
    this.reclamationService.getMessages(reclamationId).subscribe({
      next: (messages: Message[]) => {
        this.messages = messages;
        this.showMessages = true;
      },
      error: (error: any) => {
        this.notificationService.showError('Erreur lors du chargement des messages');
      }
    });
  }

  // Historique
  loadReclamations(): void {
    this.reclamationService.getReclamations().subscribe({
      next: (reclamations: Reclamation[]) => {
        this.reclamations = reclamations;
      },
      error: (error: any) => {
        this.notificationService.showError('Erreur lors du chargement des réclamations');
      }
    });
  }

  selectReclamation(reclamation: Reclamation): void {
    this.selectedReclamation = reclamation;
    this.loadMessages(reclamation.id!);
  }

  // Utilitaires
  getCategoriesForType(type: string): string[] {
    return this.categories[type as keyof typeof this.categories] || [];
  }

  formatDate(date: Date): string {
    const now = new Date();
    const messageDate = new Date(date);
    const diffTime = Math.abs(now.getTime() - messageDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        return diffMinutes === 0 ? 'À l\'instant' : `Il y a ${diffMinutes} min`;
      }
      return `Il y a ${diffHours}h`;
    } else if (diffDays === 1) {
      return 'Hier';
    } else if (diffDays < 7) {
      return `Il y a ${diffDays} jours`;
    } else {
      return messageDate.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: messageDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  }

  getTypeIcon(type: string): string {
    const typeObj = this.typesReclamation.find(t => t.value === type);
    return typeObj?.icon || 'fa-question-circle';
  }

  getStatutColor(statut: string): string {
    switch (statut) {
      case 'BROUILLON': return 'bg-gray-100 text-gray-800';
      case 'SOUmis': return 'bg-blue-100 text-blue-800';
      case 'EN_COURS': return 'bg-yellow-100 text-yellow-800';
      case 'RESOLU': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getStatutIcon(statut: string): string {
    switch (statut) {
      case 'BROUILLON': return 'fa-edit';
      case 'SOUmis': return 'fa-paper-plane';
      case 'EN_COURS': return 'fa-spinner';
      case 'RESOLU': return 'fa-check-circle';
      default: return 'fa-question-circle';
    }
  }

  // Méthode pour tester la messagerie
  toggleMessagerie(): void {
    if (this.reclamations.length > 0) {
      this.selectReclamation(this.reclamations[0]);
    } else {
      // Créer une réclamation de test
      const testReclamation: Reclamation = {
        id: 1,
        type: 'TECHNIQUE',
        categorie: 'Problème connexion',
        sujet: 'Test de messagerie',
        description: 'Ceci est une réclamation de test pour la messagerie',
        urgence: 'MOYENNE',
        statut: 'EN_COURS',
        dateCreation: new Date(),
        piecesJointes: [],
        messages: [
          {
            id: 1,
            contenu: 'Bonjour, j\'ai un problème technique avec ma connexion.',
            auteur: 'contribuable',
            date: new Date(Date.now() - 3600000),
            lu: true
          },
          {
            id: 2,
            contenu: 'Bonjour, nous avons bien reçu votre demande et nous la traitons actuellement.',
            auteur: 'agent',
            date: new Date(Date.now() - 1800000),
            lu: true
          }
        ]
      };
      this.selectedReclamation = testReclamation;
      this.messages = testReclamation.messages;
      this.showMessages = true;
    }
  }

  // Progression
  get progressPercentage(): number {
    return (this.currentStep / this.totalSteps) * 100;
  }

  // Navigation
  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.router.navigate(['/dashboard']);
  }

  toggleHistorique(): void {
    this.showHistorique = !this.showHistorique;
  }
}
