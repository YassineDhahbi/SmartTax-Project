import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { NotificationService } from '../../services/notification.service';
import { ReclamationService } from '../../services/reclamation.service';
import { ReclamationChatStompService, ReclamationInboxEvent } from '../../services/reclamation-chat-stomp.service';
import { AuthService } from '../../services/auth/auth.service';
import { Subscription } from 'rxjs';
import { environment } from 'src/environments/environment';


export interface Reclamation {
  id?: number;
  type: any;
  categorie: string;
  sujet: string;
  description: string;
  urgence: any;
  reference?: string;
  statut: any;
  etatReclamation?: any;
  dateCreation: Date;
  dateSoumission?: Date;
  dateResolution?: Date;
  emailUser?: string;
  nomUser?: string;
  telephoneUser?: string;
  piecesJointes: string[];
  messages: Message[];
  unreadAgentMessageCount?: number;
}

export interface Message {
  id?: number;
  contenu: string;
  auteur: 'contribuable' | 'agent';
  date: Date;
  lu: boolean;
  pieceJointe?: {
    nom?: string;
    taille?: number;
    type?: string;
    url?: string;
  };
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
export class ReclamationComponent implements OnInit, OnDestroy {
  reclamationForm!: FormGroup;
  currentStep: number = 1;
  totalSteps: number = 4;
  activeView: 'list' | 'form' = 'list';
  
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
  selectedMessageFile: File | null = null;
  private reclamationChatStompSub?: Subscription;
  private reclamationInboxSub?: Subscription;
  
  // Réclamations existantes
  reclamations: Reclamation[] = [];
  selectedReclamation: Reclamation | null = null;
  showHistorique: boolean = false;
  editingDraftId: number | null = null;
  showDeleteConfirmModal: boolean = false;
  draftToDelete: Reclamation | null = null;

  // Gestion d'authentification
  currentUser: any = null;
  userRole: string = '';
  isLoggedIn: boolean = false;
  hasAccess: boolean = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private reclamationService: ReclamationService,
    private reclamationChatStomp: ReclamationChatStompService,
    private notificationService: NotificationService,
    private authService: AuthService
  ) {}

  ngOnDestroy(): void {
    this.reclamationChatStompSub?.unsubscribe();
    this.reclamationInboxSub?.unsubscribe();
    this.reclamationChatStomp.stop();
  }

  ngOnInit(): void {
    this.checkUserStatus();
    this.initForm();
    this.initMessageForm();
    if (this.hasAccess) {
      this.loadReclamations();
      this.startContribuableInboxIfNeeded();
    }
  }

  /** Notifications temps réel : nouveau message agent sur une autre réclamation. */
  private startContribuableInboxIfNeeded(): void {
    const email = this.resolveUserEmail();
    if (!email) {
      return;
    }
    this.reclamationInboxSub?.unsubscribe();
    this.reclamationInboxSub = this.reclamationChatStomp.watchContribuableInbox(email).subscribe((evt: ReclamationInboxEvent) => {
      if (evt.type !== 'NEW_AGENT_MESSAGE' || !Number.isFinite(evt.reclamationId)) {
        return;
      }
      if (this.selectedReclamation?.id === evt.reclamationId) {
        return;
      }
      const rec = this.reclamations.find((r) => r.id === evt.reclamationId);
      if (rec) {
        rec.unreadAgentMessageCount = (rec.unreadAgentMessageCount ?? 0) + 1;
      }
    });
  }

  private clearUnreadBadgeForReclamation(reclamationId: number): void {
    const rec = this.reclamations.find((r) => r.id === reclamationId);
    if (rec) {
      rec.unreadAgentMessageCount = 0;
    }
  }

  checkUserStatus(): void {
    this.isLoggedIn = this.authService.isLoggedIn();
    
    if (this.isLoggedIn) {
      // Récupérer les informations utilisateur depuis localStorage
      const userInfo = localStorage.getItem('userInfo');
      if (userInfo) {
        try {
          this.currentUser = JSON.parse(userInfo);
        } catch {
          this.currentUser = {
            id: localStorage.getItem('userId'),
            email: localStorage.getItem('email'),
            role: localStorage.getItem('role'),
            firstName: localStorage.getItem('firstName'),
            lastName: localStorage.getItem('lastName')
          };
        }
      } else {
        this.currentUser = {
          id: localStorage.getItem('userId'),
          email: localStorage.getItem('email'),
          role: localStorage.getItem('role'),
          firstName: localStorage.getItem('firstName'),
          lastName: localStorage.getItem('lastName')
        };
      }
      this.userRole = this.currentUser?.role || '';
      this.hasAccess = true;
    } else {
      this.currentUser = null;
      this.userRole = '';
      this.hasAccess = false;
    }
  }

  navigateToImmatriculation(): void {
    this.router.navigate(['/immatriculation']);
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  private initForm(): void {
    this.reclamationForm = this.fb.group({
      type: ['', Validators.required],
      typeAutre: [''],
      categorie: ['', Validators.required],
      sujet: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(1000)]],
      urgence: ['MOYENNE', Validators.required],
      reference: [''],
      piecesJointes: this.fb.array([])
    });

    // Mettre à jour les catégories quand le type change
    this.reclamationForm.get('type')?.valueChanges.subscribe(type => {
      const categorieControl = this.reclamationForm.get('categorie');
      categorieControl?.setValue('');

      if (type === 'AUTRE') {
        categorieControl?.clearValidators();
      } else {
        categorieControl?.setValidators([Validators.required]);
      }
      categorieControl?.updateValueAndValidity();

      const typeAutreControl = this.reclamationForm.get('typeAutre');
      if (!typeAutreControl) {
        return;
      }

      if (type === 'AUTRE') {
        typeAutreControl.setValidators([Validators.required, Validators.minLength(3), Validators.maxLength(100)]);
      } else {
        typeAutreControl.clearValidators();
        typeAutreControl.setValue('');
      }
      typeAutreControl.updateValueAndValidity();
    });
  }

  private initMessageForm(): void {
    this.messageForm = this.fb.group({
      contenu: ['', [Validators.maxLength(500)]]
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
               (this.reclamationForm.get('type')?.value === 'AUTRE' || (this.reclamationForm.get('categorie')?.valid || false)) &&
               (this.reclamationForm.get('type')?.value !== 'AUTRE' || (this.reclamationForm.get('typeAutre')?.valid || false));
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

  submitReclamation(statut: string = 'SOUMIS'): void {
    if (!this.validateCurrentStep()) {
      this.notificationService.showError('Veuillez compléter toutes les étapes obligatoires');
      return;
    }

    this.isSubmitting = true;
    
    // Préparer les données pour la nouvelle méthode
    const data = {
      type: this.reclamationForm.get('type')?.value === 'AUTRE'
        ? this.reclamationForm.get('typeAutre')?.value
        : this.reclamationForm.get('type')?.value,
      categorie: this.reclamationForm.get('categorie')?.value,
      sujet: this.reclamationForm.get('sujet')?.value,
      description: this.reclamationForm.get('description')?.value,
      urgence: this.reclamationForm.get('urgence')?.value,
      reference: this.reclamationForm.get('reference')?.value || '',
      emailUser: this.resolveUserEmail(),
      nom: this.resolveUserFullName(),
      telephone: this.resolveUserPhone(),
      statut: statut
    };

    if (this.editingDraftId) {
      const draftId = this.editingDraftId;
      this.reclamationService.updateReclamationWithForm(draftId, data, this.files).subscribe({
        next: () => {
          if (statut === 'SOUMIS') {
            this.reclamationService.submitDraft(draftId).subscribe({
              next: (updated) => {
                this.isSubmitting = false;
                this.editingDraftId = null;
                this.reclamationId = updated.reference || this.getDraftReferenceById(draftId);
                this.showSuccessModal = true;
                this.notificationService.showSuccess('Réclamation modifiée et soumise avec succès');
                this.loadReclamations();
              },
              error: (error: any) => {
                this.isSubmitting = false;
                console.error('Erreur détaillée:', error);
                this.notificationService.showError('Réclamation modifiée, mais erreur lors de la soumission: ' + (error.error?.message || error.message));
              }
            });
            return;
          }

          this.isSubmitting = false;
          this.notificationService.showSuccess('Brouillon modifié avec succès');
          this.editingDraftId = null;
          this.showReclamationsView();
        },
        error: (error: any) => {
          this.isSubmitting = false;
          console.error('Erreur détaillée:', error);
          this.notificationService.showError('Erreur lors de la modification du brouillon: ' + (error.error?.message || error.message));
        }
      });
      return;
    }

    this.reclamationService.createReclamationWithForm(data, this.files).subscribe({
      next: (response: any) => {
        this.isSubmitting = false;
        this.editingDraftId = null;
        this.reclamationId = response.reference;
        this.showSuccessModal = true;
        this.notificationService.showSuccess(`Réclamation ${statut === 'BROUILLON' ? 'enregistrée en brouillon' : 'soumise avec succès'}`);
        
        if (statut === 'SOUMIS') {
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
    if (!this.selectedReclamation || !this.canContribuableSendMessage() || !this.messageForm.valid) {
      return;
    }
    const text = (this.messageForm.get('contenu')?.value || '').trim();
    if (!text && !this.selectedMessageFile) {
      return;
    }

    const message: Message = {
      contenu: text,
      auteur: 'contribuable',
      date: new Date(),
      lu: false
    };

    this.reclamationService.sendMessage(this.selectedReclamation.id!, message, this.selectedMessageFile).subscribe({
      next: (response: Message) => {
        this.mergeIncomingChatMessage(response);
        this.messageForm.reset();
        this.selectedMessageFile = null;
        this.notificationService.showSuccess('Message envoyé');
      },
      error: (error: any) => {
        const msg = error?.error?.message || error?.message || 'Erreur lors de l\'envoi du message';
        this.notificationService.showError(msg);
      }
    });
  }

  onMessageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length > 0 ? input.files[0] : null;
    if (!file) {
      this.selectedMessageFile = null;
      return;
    }
    const validation = this.reclamationService.validateFile(file);
    if (!validation.isValid) {
      this.notificationService.showError(validation.error || 'Fichier invalide');
      input.value = '';
      this.selectedMessageFile = null;
      return;
    }
    this.selectedMessageFile = file;
  }

  clearSelectedMessageFile(): void {
    this.selectedMessageFile = null;
  }

  messageAttachmentHref(msg: Message): string {
    const rawUrl = msg?.pieceJointe?.url;
    if (!rawUrl) return '';
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) return rawUrl;
    const origin = environment.apiUrl.replace(/\/?api\/?$/, '').replace(/\/$/, '');
    return rawUrl.startsWith('/') ? `${origin}${rawUrl}` : `${origin}/${rawUrl}`;
  }

  loadMessages(reclamationId: number): void {
    if (!reclamationId) {
      this.notificationService.showError('Identifiant de réclamation invalide');
      return;
    }

    this.reclamationService.getMessages(reclamationId).subscribe({
      next: (messages: Message[]) => {
        this.messages = messages;
        this.clearUnreadBadgeForReclamation(reclamationId);
        this.startReclamationChatRealtime(reclamationId);
      },
      error: (error: any) => {
        this.notificationService.showError('Erreur lors du chargement des messages');
        this.startReclamationChatRealtime(reclamationId);
      }
    });
  }

  private startReclamationChatRealtime(reclamationId: number): void {
    this.reclamationChatStompSub?.unsubscribe();
    this.reclamationChatStomp.stopChat();
    this.reclamationChatStompSub = this.reclamationChatStomp.watch(reclamationId).subscribe((msg) => {
      this.mergeIncomingChatMessage(msg, reclamationId);
    });
  }

  private mergeIncomingChatMessage(msg: Message, reclamationIdForOpenChat?: number): void {
    if (msg.id != null && this.messages.some((m) => m.id === msg.id)) {
      return;
    }
    this.messages = [...this.messages, msg].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    if (msg.auteur === 'agent' && reclamationIdForOpenChat != null) {
      this.clearUnreadBadgeForReclamation(reclamationIdForOpenChat);
    }
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
    this.reclamationChatStompSub?.unsubscribe();
    this.reclamationChatStomp.stopChat();
    this.selectedReclamation = reclamation;
    this.messages = [];
    if (!this.showsMessageriePanel(reclamation)) {
      return;
    }
    this.loadMessages(reclamation.id!);
  }

  closeReclamationDetail(): void {
    this.reclamationChatStompSub?.unsubscribe();
    this.reclamationChatStomp.stopChat();
    this.selectedReclamation = null;
    this.messages = [];
  }

  /** Réclamations soumises, en traitement ou résolues : messagerie (lecture ou échange). */
  showsMessageriePanel(rec: Reclamation): boolean {
    const s = this.getEnumValue(rec.statut);
    return s === 'SOUMIS' || s === 'EN_COURS' || s === 'RESOLU';
  }

  agentHasStartedChat(): boolean {
    return this.messages.some(m => m.auteur === 'agent');
  }

  isSelectedReclamationResolved(): boolean {
    if (!this.selectedReclamation) {
      return false;
    }
    return this.getEnumValue(this.selectedReclamation.statut) === 'RESOLU';
  }

  canContribuableSendMessage(): boolean {
    if (this.isSelectedReclamationResolved()) {
      return false;
    }
    return this.agentHasStartedChat();
  }

  isDraft(reclamation: Reclamation): boolean {
    return this.getEnumValue(reclamation.statut) === 'BROUILLON';
  }

  editDraft(reclamation: Reclamation, event: Event): void {
    event.stopPropagation();
    const rawType = this.getEnumValue(reclamation.type);
    const knownType = this.typesReclamation.some(t => t.value === rawType) ? rawType : 'AUTRE';
    const isOtherType = knownType === 'AUTRE';

    this.reclamationForm.patchValue({
      type: knownType,
      typeAutre: isOtherType ? (this.getTypeDisplay(reclamation.type) || '') : '',
      categorie: isOtherType ? '' : (reclamation.categorie || ''),
      sujet: reclamation.sujet || '',
      description: reclamation.description || '',
      urgence: this.getEnumValue(reclamation.urgence) || 'MOYENNE',
      reference: reclamation.reference || ''
    });

    this.files = [];
    const piecesArray = this.reclamationForm.get('piecesJointes') as FormArray;
    while (piecesArray.length) {
      piecesArray.removeAt(0);
    }

    this.editingDraftId = reclamation.id || null;
    this.activeView = 'form';
    this.currentStep = 1;
    this.closeReclamationDetail();
    this.notificationService.showInfo('Brouillon chargé. Modifiez puis enregistrez.');
  }

  deleteDraft(reclamation: Reclamation, event: Event): void {
    event.stopPropagation();
    if (!reclamation.id) {
      this.notificationService.showError('Impossible de supprimer ce brouillon');
      return;
    }
    this.draftToDelete = reclamation;
    this.showDeleteConfirmModal = true;
  }

  confirmDeleteDraft(): void {
    if (!this.draftToDelete?.id) {
      this.closeDeleteModal();
      this.notificationService.showError('Impossible de supprimer ce brouillon');
      return;
    }

    this.reclamationService.deleteReclamation(this.draftToDelete.id).subscribe({
      next: () => {
        this.closeDeleteModal();
        this.notificationService.showSuccess('Brouillon supprimé avec succès');
        this.loadReclamations();
      },
      error: (error: any) => {
        this.closeDeleteModal();
        this.notificationService.showError(error?.message || 'Erreur lors de la suppression du brouillon');
      }
    });
  }

  closeDeleteModal(): void {
    this.showDeleteConfirmModal = false;
    this.draftToDelete = null;
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
    const normalizedType = this.getEnumValue(type);
    const typeObj = this.typesReclamation.find(t => t.value === normalizedType);
    return typeObj?.icon || 'fa-question-circle';
  }

  getStatutColor(statut: string): string {
    switch (this.getEnumValue(statut)) {
      case 'BROUILLON': return 'bg-gray-100 text-gray-800';
      case 'SOUMIS': return 'bg-blue-100 text-blue-800';
      case 'EN_COURS': return 'bg-yellow-100 text-yellow-800';
      case 'RESOLU': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getStatutIcon(statut: string): string {
    switch (this.getEnumValue(statut)) {
      case 'BROUILLON': return 'fa-edit';
      case 'SOUMIS': return 'fa-paper-plane';
      case 'EN_COURS': return 'fa-spinner';
      case 'RESOLU': return 'fa-check-circle';
      default: return 'fa-question-circle';
    }
  }

  getEnumValue(field: any): string {
    if (!field) return '';
    if (typeof field === 'string') return field;
    return field.value || field.label || '';
  }

  getTypeDisplay(type: any): string {
    if (!type) return '';
    if (typeof type === 'string') return type;
    return type.label || type.value || '';
  }

  getStatutDisplay(statut: any): string {
    if (!statut) return '';
    if (typeof statut === 'string') return statut;
    return statut.label || statut.value || '';
  }

  getEtatDisplay(etat: any): string {
    if (!etat) return '';
    if (typeof etat === 'string') {
      if (etat === 'EN_COURS') return 'En cours';
      if (etat === 'TRAITE') return 'Traite';
      return etat;
    }
    return etat.label || etat.value || '';
  }

  getEtatColor(etat: any): string {
    const normalized = this.getEnumValue(etat);
    switch (normalized) {
      case 'TRAITE':
        return 'bg-green-100 text-green-800';
      case 'EN_COURS':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  }

  private cleanValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    const normalized = String(value).trim();
    if (!normalized || normalized.toLowerCase() === 'undefined' || normalized.toLowerCase() === 'null') {
      return '';
    }
    return normalized;
  }

  private resolveUserEmail(): string {
    return this.cleanValue(
      localStorage.getItem('email') ||
      localStorage.getItem('userEmail') ||
      this.currentUser?.email ||
      this.currentUser?.mail ||
      localStorage.getItem('mail')
    );
  }

  private resolveUserFullName(): string {
    const fromStorage = `${this.cleanValue(localStorage.getItem('firstName'))} ${this.cleanValue(localStorage.getItem('lastName'))}`.trim();
    const fullNameFromCurrentUser = `${this.cleanValue(this.currentUser?.firstName)} ${this.cleanValue(this.currentUser?.lastName)}`.trim();
    return this.cleanValue(
      fromStorage ||
      fullNameFromCurrentUser ||
      this.currentUser?.nomComplet ||
      this.currentUser?.name ||
      localStorage.getItem('fullName') ||
      localStorage.getItem('username')
    );
  }

  private resolveUserPhone(): string {
    return this.cleanValue(
      localStorage.getItem('telephone') ||
      localStorage.getItem('phone') ||
      this.currentUser?.telephone ||
      this.currentUser?.phone ||
      this.currentUser?.numeroTelephone
    );
  }

  private getDraftReferenceById(id: number): string {
    const match = this.reclamations.find(r => r.id === id);
    return match?.reference || `#${id}`;
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
    }
  }

  // Progression
  get progressPercentage(): number {
    return (this.currentStep / this.totalSteps) * 100;
  }

  // Navigation
  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.showReclamationsView();
  }

  toggleHistorique(): void {
    this.showHistorique = !this.showHistorique;
  }

  showNewReclamationForm(): void {
    this.editingDraftId = null;
    this.reclamationForm.reset({
      type: '',
      typeAutre: '',
      categorie: '',
      sujet: '',
      description: '',
      urgence: 'MOYENNE',
      reference: ''
    });
    this.files = [];
    const piecesArray = this.reclamationForm.get('piecesJointes') as FormArray;
    while (piecesArray.length) {
      piecesArray.removeAt(0);
    }
    this.activeView = 'form';
    this.currentStep = 1;
    this.closeReclamationDetail();
  }

  showReclamationsView(): void {
    this.activeView = 'list';
    this.showHistorique = true;
    this.closeReclamationDetail();
    this.loadReclamations();
  }
}
