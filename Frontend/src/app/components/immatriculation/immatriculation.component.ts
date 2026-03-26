import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { ImmatriculationService } from '../../services/immatriculation.service';
import { ValidationService } from '../../services/validation.service';
import { NotificationService } from '../../services/notification.service';
import { CinValidatorService } from '../../services/cin/cin-validator.service';
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
  identityValidationScore: number = 0; // Score de validation SWIN Transformer

  // Soumission
  submissionMode: 'draft' | 'submit' = 'submit';
  confirmed: boolean = true; // Changé à true pour que le bouton soit toujours cliquable
  isSubmitting: boolean = false;
  showSuccessModal: boolean = false;
  dossierNumber: string = '';

  // Messages d'erreur de validation
  validationErrors: {
    cin?: string;
    email?: string;
    registreCommerce?: string;
  } = {};

  // États de validation en cours
  validationInProgress: {
    cin?: boolean;
    email?: boolean;
    registreCommerce?: boolean;
  } = {};

  // Validation de la pièce d'identité
  identityValidation: {
    status: string;
    confidence: number;
    valid: boolean;
    adjusted: boolean;
  } | null = null;

  identityValidationInProgress: boolean = false;
  identityValidationError: string = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private immatriculationService: ImmatriculationService,
    private validationService: ValidationService,
    private notificationService: NotificationService,
    private cinValidator: CinValidatorService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.generateDossierNumber();
  }

  // Initialisation du formulaire
  private initForm(): void {
    this.immatriculationForm = this.fb.group({
      // Type contribuable
      typeContribuable: ['', [Validators.required]],
      
      // Personne Physique
      nom: ['', [
        Validators.pattern(/^[A-Za-z\u00C0-\u017F\s'-]{2,50}$/), // Lettres, accents, espaces, tirets
        Validators.minLength(2),
        Validators.maxLength(50)
      ]],
      prenom: ['', [
        Validators.pattern(/^[A-Za-z\u00C0-\u017F\s'-]{2,50}$/),
        Validators.minLength(2),
        Validators.maxLength(50)
      ]],
      cin: ['', [
        Validators.pattern(/^\d{8}$/), // Exactement 8 chiffres
        Validators.required
      ]],
      dateNaissance: ['', [
        this.validateDateNaissance(), // Doit avoir entre 18 et 100 ans
        Validators.required
      ]],
      
      // Personne Morale
      raisonSociale: ['', [
        Validators.pattern(/^[A-Za-z0-9\u00C0-\u017F\s&'-]{3,100}$/),
        Validators.minLength(3),
        Validators.maxLength(100)
      ]],
      matriculeFiscal: ['', [
        Validators.pattern(/^\d{7,8}$/), // 7 ou 8 chiffres
        Validators.required
      ]],
      registreCommerce: ['', [
        Validators.pattern(/^[A-Za-z0-9]{1,20}$/), // Alphanumérique, 1-20 caractères
        Validators.required
      ]],
      representantLegal: ['', [
        Validators.pattern(/^[A-Za-z\u00C0-\u017F\s'-]{2,100}$/),
        Validators.minLength(2),
        Validators.maxLength(100)
      ]],
      
      // Champs communs
      email: ['', [
        Validators.required,
        Validators.email,
        Validators.maxLength(100)
      ]],
      telephone: ['', [
        Validators.required,
        Validators.pattern(/^(?:\+216|216)?\d{8}$/), // Format tunisien
        Validators.minLength(8),
        Validators.maxLength(12)
      ]],
      adresse: ['', [
        Validators.required,
        Validators.minLength(10),
        Validators.maxLength(200)
      ]],
      
      // Activité
      typeActivite: ['', [
        Validators.required,
        Validators.pattern(/^[A-Za-z\u00C0-\u017F\s&'-]{3,50}$/),
        Validators.minLength(3),
        Validators.maxLength(50)
      ]],
      secteur: ['', [
        Validators.required,
        Validators.pattern(/^[A-Za-z\u00C0-\u017F\s&'-]{3,50}$/),
        Validators.minLength(3),
        Validators.maxLength(50)
      ]],
      adresseProfessionnelle: ['', [
        Validators.required,
        Validators.minLength(10),
        Validators.maxLength(200)
      ]],
      dateDebutActivite: ['', [
        this.validateDateDebutActivite(), // Ne peut pas être dans le futur
        Validators.required
      ]],
      descriptionActivite: ['', [
        Validators.required,
        Validators.minLength(20),
        Validators.maxLength(1000)
      ]]
    });

    // Mettre à jour les validateurs selon le type de contribuable
    this.immatriculationForm.get('typeContribuable')?.valueChanges.subscribe(value => {
      this.updateValidatorsByType(value);
    });
  }

  // Validateurs personnalisés
  validateDateNaissance(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      
      const dateNaissance = new Date(control.value);
      const today = new Date();
      const age = today.getFullYear() - dateNaissance.getFullYear();
      const monthDiff = today.getMonth() - dateNaissance.getMonth();
      
      // Calcul précis de l'âge
      const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateNaissance.getDate()) 
        ? age - 1 
        : age;
      
      if (actualAge < 18) {
        return { tooYoung: { message: 'Vous devez avoir au moins 18 ans' } };
      }
      
      if (actualAge > 100) {
        return { tooOld: { message: 'Âge invalide' } };
      }
      
      if (dateNaissance > today) {
        return { futureDate: { message: 'La date ne peut pas être dans le futur' } };
      }
      
      return null;
    };
  }

  validateDateDebutActivite(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      
      const dateDebut = new Date(control.value);
      const today = new Date();
      
      if (dateDebut > today) {
        return { futureDate: { message: 'La date de début ne peut pas être dans le futur' } };
      }
      
      if (dateDebut.getFullYear() < 1900) {
        return { tooOld: { message: 'Date invalide' } };
      }
      
      return null;
    };
  }

  // Mettre à jour les validateurs selon le type de contribuable
  private updateValidatorsByType(type: string): void {
    const nomControl = this.immatriculationForm.get('nom');
    const prenomControl = this.immatriculationForm.get('prenom');
    const cinControl = this.immatriculationForm.get('cin');
    const dateNaissanceControl = this.immatriculationForm.get('dateNaissance');
    
    const raisonSocialeControl = this.immatriculationForm.get('raisonSociale');
    const matriculeFiscalControl = this.immatriculationForm.get('matriculeFiscal');
    const registreCommerceControl = this.immatriculationForm.get('registreCommerce');
    const representantLegalControl = this.immatriculationForm.get('representantLegal');

    if (type?.toUpperCase() === 'PHYSIQUE') {
      // Champs obligatoires pour personne physique
      nomControl?.setValidators([Validators.required, Validators.pattern(/^[A-Za-z\u00C0-\u017F\s'-]{2,50}$/), Validators.minLength(2), Validators.maxLength(50)]);
      prenomControl?.setValidators([Validators.required, Validators.pattern(/^[A-Za-z\u00C0-\u017F\s'-]{2,50}$/), Validators.minLength(2), Validators.maxLength(50)]);
      cinControl?.setValidators([Validators.required, Validators.pattern(/^\d{8}$/)]);
      dateNaissanceControl?.setValidators([Validators.required, this.validateDateNaissance()]);
      
      // Champs non obligatoires pour personne physique
      raisonSocialeControl?.clearValidators();
      matriculeFiscalControl?.clearValidators();
      registreCommerceControl?.clearValidators();
      representantLegalControl?.clearValidators();
      
    } else if (type?.toUpperCase() === 'MORALE') {
      // Champs obligatoires pour personne morale
      raisonSocialeControl?.setValidators([Validators.required, Validators.pattern(/^[A-Za-z0-9\u00C0-\u017F\s&'-]{3,100}$/), Validators.minLength(3), Validators.maxLength(100)]);
      matriculeFiscalControl?.setValidators([Validators.required, Validators.pattern(/^\d{7,8}$/)]);
      registreCommerceControl?.setValidators([Validators.required, Validators.pattern(/^[A-Za-z0-9]{1,20}$/)]);
      representantLegalControl?.setValidators([Validators.required, Validators.pattern(/^[A-Za-z\u00C0-\u017F\s'-]{2,100}$/), Validators.minLength(2), Validators.maxLength(100)]);
      
      // Champs non obligatoires pour personne morale
      nomControl?.clearValidators();
      prenomControl?.clearValidators();
      cinControl?.clearValidators();
      dateNaissanceControl?.clearValidators();
    } else {
      // Pas de type sélectionné - tout est optionnel
      nomControl?.clearValidators();
      prenomControl?.clearValidators();
      cinControl?.clearValidators();
      dateNaissanceControl?.clearValidators();
      raisonSocialeControl?.clearValidators();
      matriculeFiscalControl?.clearValidators();
      registreCommerceControl?.clearValidators();
      representantLegalControl?.clearValidators();
    }
    
    // Mettre à jour la validité des champs
    nomControl?.updateValueAndValidity();
    prenomControl?.updateValueAndValidity();
    cinControl?.updateValueAndValidity();
    dateNaissanceControl?.updateValueAndValidity();
    raisonSocialeControl?.updateValueAndValidity();
    matriculeFiscalControl?.updateValueAndValidity();
    registreCommerceControl?.updateValueAndValidity();
    representantLegalControl?.updateValueAndValidity();
  }

  // Navigation entre étapes
  nextStep(): void {
    if (this.validateCurrentStep() && !this.hasValidationErrors()) {
      if (this.currentStep < this.totalSteps) {
        this.currentStep++;
        this.updateProgress();
        
        // Déclencher les vérifications automatiques à l'étape 5
        if (this.currentStep === 5) {
          this.performAutomaticVerification();
        }
      }
    } else if (this.hasValidationErrors()) {
      // Afficher un message d'erreur s'il y a des doublons
      const firstError = Object.values(this.validationErrors)[0];
      this.notificationService.showError(firstError || 'Veuillez corriger les erreurs avant de continuer');
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.updateProgress();
    }
  }

  // Validation de l'étape actuelle
  private validateCurrentStep(): boolean {
    switch (this.currentStep) {
      case 1:
        return this.validateTypeContribuableStep();
      case 2:
        return this.validateInformationsPersonnellesStep(); // Inclut email, téléphone, adresse
      case 3:
        return this.validateActiviteStep(); // CORRIGÉ: Les champs d'activité sont à l'étape 3
      case 4:
        return this.validateDocumentsStep(); // Pièces Jointes
      case 5:
        return true; // Vérification Automatique (pas de validation spécifique)
      case 6:
        return this.validateValidationStep(); // Validation finale
      default:
        return true;
    }
  }

  // Validation étape 1: Type contribuable
  private validateTypeContribuableStep(): boolean {
    const typeControl = this.immatriculationForm.get('typeContribuable');
    
    if (!typeControl?.value) {
      this.notificationService.showError(
        'Veuillez sélectionner un type de contribuable (Personne Physique ou Personne Morale)',
        'Type obligatoire'
      );
      return false;
    }
    
    return true;
  }

  // Validation étape 2: Informations personnelles
  private validateInformationsPersonnellesStep(): boolean {
    const type = this.immatriculationForm.get('typeContribuable')?.value?.toUpperCase();
    
    if (type === 'PHYSIQUE') {
      const nom = this.immatriculationForm.get('nom');
      const prenom = this.immatriculationForm.get('prenom');
      const cin = this.immatriculationForm.get('cin');
      const dateNaissance = this.immatriculationForm.get('dateNaissance');
      
      if (!nom?.value) {
        this.notificationService.showError('Le nom est obligatoire', 'Champ manquant');
        return false;
      }
      
      if (nom?.invalid) {
        if (nom?.errors?.['minlength']) {
          this.notificationService.showError('Le nom doit contenir au moins 2 caractères', 'Nom trop court');
        } else if (nom?.errors?.['maxlength']) {
          this.notificationService.showError('Le nom ne peut pas dépasser 50 caractères', 'Nom trop long');
        } else if (nom?.errors?.['pattern']) {
          this.notificationService.showError('Le nom ne peut contenir que des lettres, espaces et tirets', 'Format invalide');
        } else {
          this.notificationService.showError('Le nom est invalide', 'Erreur de format');
        }
        return false;
      }
      
      if (!prenom?.value) {
        this.notificationService.showError('Le prénom est obligatoire', 'Champ manquant');
        return false;
      }
      
      if (prenom?.invalid) {
        if (prenom?.errors?.['minlength']) {
          this.notificationService.showError('Le prénom doit contenir au moins 2 caractères', 'Prénom trop court');
        } else if (prenom?.errors?.['maxlength']) {
          this.notificationService.showError('Le prénom ne peut pas dépasser 50 caractères', 'Prénom trop long');
        } else if (prenom?.errors?.['pattern']) {
          this.notificationService.showError('Le prénom ne peut contenir que des lettres, espaces et tirets', 'Format invalide');
        } else {
          this.notificationService.showError('Le prénom est invalide', 'Erreur de format');
        }
        return false;
      }
      
      if (!cin?.value) {
        this.notificationService.showError('Le CIN est obligatoire', 'Champ manquant');
        return false;
      }
      
      if (cin?.invalid) {
        if (cin?.errors?.['pattern']) {
          this.notificationService.showError('Le CIN doit contenir exactement 8 chiffres', 'Format invalide');
        } else {
          this.notificationService.showError('Le CIN est invalide', 'Erreur de format');
        }
        return false;
      }
      
      if (!dateNaissance?.value) {
        this.notificationService.showError('La date de naissance est obligatoire', 'Champ manquant');
        return false;
      }
      
      if (dateNaissance?.invalid) {
        const errors = dateNaissance?.errors;
        if (errors?.['tooYoung']?.message) {
          this.notificationService.showError(errors['tooYoung'].message, 'Âge invalide');
        } else if (errors?.['tooOld']?.message) {
          this.notificationService.showError(errors['tooOld'].message, 'Date invalide');
        } else if (errors?.['futureDate']?.message) {
          this.notificationService.showError(errors['futureDate'].message, 'Date invalide');
        } else {
          this.notificationService.showError('La date de naissance est invalide', 'Erreur de format');
        }
        return false;
      }
      
    } else if (type === 'MORALE') {
      const raisonSociale = this.immatriculationForm.get('raisonSociale');
      const matriculeFiscal = this.immatriculationForm.get('matriculeFiscal');
      const registreCommerce = this.immatriculationForm.get('registreCommerce');
      const representantLegal = this.immatriculationForm.get('representantLegal');
      
      if (!raisonSociale?.value) {
        this.notificationService.showError('La raison sociale est obligatoire', 'Champ manquant');
        return false;
      }
      
      if (raisonSociale?.invalid) {
        if (raisonSociale?.errors?.['minlength']) {
          this.notificationService.showError('La raison sociale doit contenir au moins 3 caractères', 'Raison sociale trop courte');
        } else if (raisonSociale?.errors?.['maxlength']) {
          this.notificationService.showError('La raison sociale ne peut pas dépasser 100 caractères', 'Raison sociale trop longue');
        } else if (raisonSociale?.errors?.['pattern']) {
          this.notificationService.showError('La raison sociale ne peut contenir que des lettres, chiffres, espaces et tirets', 'Format invalide');
        } else {
          this.notificationService.showError('La raison sociale est invalide', 'Erreur de format');
        }
        return false;
      }
      
      if (!matriculeFiscal?.value) {
        this.notificationService.showError('Le matricule fiscal est obligatoire', 'Champ manquant');
        return false;
      }
      
      if (matriculeFiscal?.invalid) {
        if (matriculeFiscal?.errors?.['pattern']) {
          this.notificationService.showError('Le matricule fiscal doit contenir 7 ou 8 chiffres', 'Format invalide');
        } else {
          this.notificationService.showError('Le matricule fiscal est invalide', 'Erreur de format');
        }
        return false;
      }
      
      if (!registreCommerce?.value) {
        this.notificationService.showError('Le registre de commerce est obligatoire', 'Champ manquant');
        return false;
      }
      
      if (registreCommerce?.invalid) {
        if (registreCommerce?.errors?.['minlength']) {
          this.notificationService.showError('Le registre de commerce doit contenir au moins 1 caractère', 'Registre commerce trop court');
        } else if (registreCommerce?.errors?.['maxlength']) {
          this.notificationService.showError('Le registre de commerce ne peut pas dépasser 20 caractères', 'Registre commerce trop long');
        } else if (registreCommerce?.errors?.['pattern']) {
          this.notificationService.showError('Le registre de commerce ne peut contenir que des lettres et chiffres', 'Format invalide');
        } else {
          this.notificationService.showError('Le registre de commerce est invalide', 'Erreur de format');
        }
        return false;
      }
      
      if (!representantLegal?.value) {
        this.notificationService.showError('Le représentant légal est obligatoire', 'Champ manquant');
        return false;
      }
      
      if (representantLegal?.invalid) {
        if (representantLegal?.errors?.['minlength']) {
          this.notificationService.showError('Le représentant légal doit contenir au moins 2 caractères', 'Nom trop court');
        } else if (representantLegal?.errors?.['maxlength']) {
          this.notificationService.showError('Le représentant légal ne peut pas dépasser 100 caractères', 'Nom trop long');
        } else if (representantLegal?.errors?.['pattern']) {
          this.notificationService.showError('Le représentant légal ne peut contenir que des lettres, espaces et tirets', 'Format invalide');
        } else {
          this.notificationService.showError('Le représentant légal est invalide', 'Erreur de format');
        }
        return false;
      }
    }
    
    // Validation des champs communs (email, téléphone, adresse) dans l'étape 2
    const email = this.immatriculationForm.get('email');
    const telephone = this.immatriculationForm.get('telephone');
    const adresse = this.immatriculationForm.get('adresse');
    
    if (!email?.value) {
      this.notificationService.showError('L\'email est obligatoire', 'Champ manquant');
      return false;
    }
    
    if (email?.invalid) {
      if (email?.errors?.['email']) {
        this.notificationService.showError('Veuillez entrer une adresse email valide (ex: nom@domaine.com)', 'Email invalide');
      } else if (email?.errors?.['maxlength']) {
        this.notificationService.showError('L\'email ne peut pas dépasser 100 caractères', 'Email trop long');
      } else {
        this.notificationService.showError('L\'email est invalide', 'Erreur de format');
      }
      return false;
    }
    
    if (!telephone?.value) {
      this.notificationService.showError('Le téléphone est obligatoire', 'Champ manquant');
      return false;
    }
    
    if (telephone?.invalid) {
      if (telephone?.errors?.['pattern']) {
        this.notificationService.showError('Le téléphone doit être au format tunisien (ex: 21612345678 ou +21612345678)', 'Format invalide');
      } else if (telephone?.errors?.['minlength']) {
        this.notificationService.showError('Le téléphone doit contenir au moins 8 chiffres', 'Téléphone trop court');
      } else if (telephone?.errors?.['maxlength']) {
        this.notificationService.showError('Le téléphone ne peut pas dépasser 12 chiffres', 'Téléphone trop long');
      } else {
        this.notificationService.showError('Le téléphone est invalide', 'Erreur de format');
      }
      return false;
    }
    
    if (!adresse?.value) {
      this.notificationService.showError('L\'adresse est obligatoire', 'Champ manquant');
      return false;
    }
    
    if (adresse?.invalid) {
      if (adresse?.errors?.['minlength']) {
        this.notificationService.showError('L\'adresse doit contenir au moins 10 caractères', 'Adresse trop courte');
      } else if (adresse?.errors?.['maxlength']) {
        this.notificationService.showError('L\'adresse ne peut pas dépasser 200 caractères', 'Adresse trop longue');
      } else {
        this.notificationService.showError('L\'adresse est invalide', 'Erreur de format');
      }
      return false;
    }
    
    return true;
  }

  // Validation étape 3: Coordonnées (maintenant vide car tous les champs sont validés à l'étape 2)
  private validateCoordonneesStep(): boolean {
    // Tous les champs de cette étape ont été déplacés vers l'étape 2 (Informations Personnelles)
    // Cette étape pourrait contenir d'autres coordonnées spécifiques à l'avenir
    return true;
  }

  // Validation étape 4: Activité
  private validateActiviteStep(): boolean {
    const typeActivite = this.immatriculationForm.get('typeActivite');
    const secteur = this.immatriculationForm.get('secteur');
    const adresseProfessionnelle = this.immatriculationForm.get('adresseProfessionnelle');
    const dateDebutActivite = this.immatriculationForm.get('dateDebutActivite');
    const descriptionActivite = this.immatriculationForm.get('descriptionActivite');
    
    if (!typeActivite?.value) {
      this.notificationService.showError('Le type d\'activité est obligatoire', 'Champ manquant');
      return false;
    }
    
    if (typeActivite?.invalid) {
      if (typeActivite?.errors?.['minlength']) {
        this.notificationService.showError('Le type d\'activité doit contenir au moins 3 caractères (ex: Commerce)', 'Type activité trop court');
      } else if (typeActivite?.errors?.['maxlength']) {
        this.notificationService.showError('Le type d\'activité ne peut pas dépasser 50 caractères', 'Type activité trop long');
      } else if (typeActivite?.errors?.['pattern']) {
        this.notificationService.showError('Le type d\'activité ne peut contenir que des lettres, espaces et tirets (pas de chiffres)', 'Format invalide');
      } else {
        this.notificationService.showError('Le type d\'activité est invalide', 'Erreur de format');
      }
      return false;
    }
    
    if (!secteur?.value) {
      this.notificationService.showError('Le secteur est obligatoire', 'Champ manquant');
      return false;
    }
    
    if (secteur?.invalid) {
      if (secteur?.errors?.['minlength']) {
        this.notificationService.showError('Le secteur doit contenir au moins 3 caractères (ex: Technologie)', 'Secteur trop court');
      } else if (secteur?.errors?.['maxlength']) {
        this.notificationService.showError('Le secteur ne peut pas dépasser 50 caractères', 'Secteur trop long');
      } else if (secteur?.errors?.['pattern']) {
        this.notificationService.showError('Le secteur ne peut contenir que des lettres, espaces et tirets (pas de chiffres)', 'Format invalide');
      } else {
        this.notificationService.showError('Le secteur est invalide', 'Erreur de format');
      }
      return false;
    }
    
    if (!adresseProfessionnelle?.value) {
      this.notificationService.showError('L\'adresse professionnelle est obligatoire', 'Champ manquant');
      return false;
    }
    
    if (adresseProfessionnelle?.invalid) {
      if (adresseProfessionnelle?.errors?.['minlength']) {
        this.notificationService.showError('L\'adresse professionnelle doit contenir au moins 10 caractères (ex: 123 Rue de la Paix)', 'Adresse trop courte');
      } else if (adresseProfessionnelle?.errors?.['maxlength']) {
        this.notificationService.showError('L\'adresse professionnelle ne peut pas dépasser 200 caractères', 'Adresse trop longue');
      } else {
        this.notificationService.showError('L\'adresse professionnelle est invalide', 'Erreur de format');
      }
      return false;
    }
    
    if (!dateDebutActivite?.value) {
      this.notificationService.showError('La date de début d\'activité est obligatoire', 'Champ manquant');
      return false;
    }
    
    if (dateDebutActivite?.invalid) {
      const errors = dateDebutActivite?.errors;
      if (errors?.['futureDate']?.message) {
        this.notificationService.showError(errors['futureDate'].message, 'Date invalide');
      } else if (errors?.['tooOld']?.message) {
        this.notificationService.showError(errors['tooOld'].message, 'Date invalide');
      } else {
        this.notificationService.showError('La date de début d\'activité est invalide', 'Erreur de format');
      }
      return false;
    }
    
    if (!descriptionActivite?.value) {
      this.notificationService.showError('La description de l\'activité est obligatoire', 'Champ manquant');
      return false;
    }
    
    if (descriptionActivite?.invalid) {
      if (descriptionActivite?.errors?.['minlength']) {
        this.notificationService.showError('La description doit contenir au moins 20 caractères (ex: Vente de produits informatiques)', 'Description trop courte');
      } else if (descriptionActivite?.errors?.['maxlength']) {
        this.notificationService.showError('La description ne peut pas dépasser 1000 caractères', 'Description trop longue');
      } else {
        this.notificationService.showError('La description de l\'activité est invalide', 'Erreur de format');
      }
      return false;
    }
    
    return true;
  }

  // Validation étape 5: Documents
  private validateDocumentsStep(): boolean {
    // Cette étape est optionnelle pour les documents
    return true;
  }

  // Validation étape 6: Validation finale
  private validateValidationStep(): boolean {
    if (!this.confirmed) {
      this.notificationService.showError(
        'Veuillez cocher la case de confirmation pour soumettre votre dossier',
        'Confirmation requise'
      );
      return false;
    }
    
    return true;
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
    
    // Lancer la validation automatique de la pièce d'identité
    this.validateIdentityDocument(file);
  }

  // Validation automatique de la pièce d'identité
  private validateIdentityDocument(file: File): void {
    if (!file) return;
    
    // Vérifier si le fichier est une image valide
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      this.identityValidationError = 'Seuls les formats JPEG, JPG et PNG sont acceptés pour la pièce d\'identité';
      this.identityValidation = null;
      this.identityValidationScore = 0;
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      this.identityValidationError = 'La taille de la pièce d\'identité ne doit pas dépasser 5MB';
      this.identityValidation = null;
      this.identityValidationScore = 0;
      return;
    }
    
    this.identityValidationInProgress = true;
    this.identityValidationError = '';
    
    this.cinValidator.validateCin(file).subscribe({
      next: (response) => {
        this.identityValidation = {
          status: response.status,
          confidence: response.confidence,
          valid: response.valid,
          adjusted: response.adjusted
        };
        this.identityValidationScore = response.confidence; // Enregistrer le score de validation
        this.identityValidationInProgress = false;
        this.identityValidationError = '';
        
        // Mettre à jour le score de documents
        this.updateDocumentScore();
        
        // Afficher un message de succès ou d'erreur
        if (response.valid) {
          this.notificationService.showSuccess('Pièce d\'identité validée avec succès !');
        } else {
          this.notificationService.showError('La pièce d\'identité n\'est pas valide. Veuillez vérifier le document.');
        }
      },
      error: (err) => {
        this.identityValidationError = 'Erreur lors de la validation: ' + (err.error?.message || err.message || 'Erreur inconnue');
        this.identityValidation = null;
        this.identityValidationScore = 0;
        this.identityValidationInProgress = false;
        this.notificationService.showError('Erreur lors de la validation de la pièce d\'identité');
      }
    });
  }

  // Mettre à jour le score des documents
  private updateDocumentScore(): void {
    // Calculer le score des documents basé sur la validation de la pièce d'identité
    const identityScore = this.identityValidationScore;
    const activityScore = this.files.activite ? 50 : 0; // 50 points si document d'activité présent
    const photoScore = this.files.photo ? 25 : 0; // 25 points si photo présente
    
    this.documentsScore = Math.round(identityScore * 0.5 + activityScore + photoScore);
    
    // Mettre à jour le score global
    this.updateOverallScore();
  }

  // Mettre à jour le score global
  private updateOverallScore(): void {
    const completenessWeight = 0.3;
    const verificationWeight = 0.4;
    const documentsWeight = 0.3;
    
    this.overallScore = Math.round(
      this.completenessScore * completenessWeight +
      this.verificationScore * verificationWeight +
      this.documentsScore * documentsWeight
    );
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

  private async convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        console.log('🔄 Conversion fichier en base64:', file.name);
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
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
      
      // Ajouter les fichiers convertis en base64
      console.log('📁 Fichiers avant conversion:', {
        identite: !!this.files.identite,
        activite: !!this.files.activite,
        photo: !!this.files.photo,
        autres: this.files.autres.length,
        autresFiles: this.files.autres.map((f: File) => f.name)
      });
      
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
        // Ajouter les fichiers convertis en base64
        identiteFile: this.files.identite ? await this.convertFileToBase64(this.files.identite) : undefined,
        activiteFile: this.files.activite ? await this.convertFileToBase64(this.files.activite) : undefined,
        photoFile: this.files.photo ? await this.convertFileToBase64(this.files.photo) : undefined,
        autresFiles: this.files.autres.length > 0 ? await Promise.all(this.files.autres.map((file: File) => this.convertFileToBase64(file))) : [],
        confirmed: this.confirmed,
        submissionMode: this.submissionMode === 'draft' ? SubmissionMode.DRAFT : SubmissionMode.SUBMIT,
        // Ajouter les scores par défaut pour éviter les erreurs de nullité
        overallScore: this.overallScore || 0,
        completenessScore: this.completenessScore || 0,
        verificationScore: this.verificationScore || 0,
        documentsScore: this.documentsScore || 0,
        faceRecognitionScore: this.faceRecognitionScore || 0,
        identityValidationScore: this.identityValidationScore || 0 // Score de validation SWIN Transformer
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
      console.log('� autresFiles dans le DTO:', {
        length: dto.autresFiles?.length || 0,
        files: dto.autresFiles || [],
        type: typeof dto.autresFiles
      });
      console.log('�🔍 Scores calculés:', {
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

      // Le dossier est déjà créé avec le statut EN_COURS_VERIFICATION
      // Plus besoin d'appeler submitDossier() pour changer le statut
      
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

  // Validation des doublons
  onCinChange(event: any): void {
    const cin = event.target.value;
    
    // Effacer l'erreur précédente
    delete this.validationErrors.cin;
    
    if (!cin) {
      return;
    }
    
    // Valider le format d'abord
    if (!this.validationService.validateCinFormat(cin)) {
      this.validationErrors.cin = this.validationService.getErrorMessage('cin', cin);
      return;
    }
    
    // Vérifier le doublon
    this.validationInProgress.cin = true;
    this.validationService.checkCinExists(cin).subscribe({
      next: (exists) => {
        this.validationInProgress.cin = false;
        if (exists) {
          this.validationErrors.cin = this.validationService.getErrorMessage('cin', cin);
        }
      },
      error: () => {
        this.validationInProgress.cin = false;
        // En cas d'erreur, on ne bloque pas la saisie
      }
    });
  }

  onEmailChange(event: any): void {
    const email = event.target.value;
    
    // Effacer l'erreur précédente
    delete this.validationErrors.email;
    
    if (!email) {
      return;
    }
    
    // Valider le format d'abord
    if (!this.validationService.validateEmailFormat(email)) {
      this.validationErrors.email = this.validationService.getErrorMessage('email', email);
      return;
    }
    
    // Vérifier le doublon
    this.validationInProgress.email = true;
    this.validationService.checkEmailExists(email).subscribe({
      next: (exists) => {
        this.validationInProgress.email = false;
        if (exists) {
          this.validationErrors.email = this.validationService.getErrorMessage('email', email);
        }
      },
      error: () => {
        this.validationInProgress.email = false;
        // En cas d'erreur, on ne bloque pas la saisie
      }
    });
  }

  onRegistreCommerceChange(event: any): void {
    const rc = event.target.value;
    
    // Effacer l'erreur précédente
    delete this.validationErrors.registreCommerce;
    
    if (!rc) {
      return;
    }
    
    // Valider le format d'abord
    if (!this.validationService.validateRegistreCommerceFormat(rc)) {
      this.validationErrors.registreCommerce = this.validationService.getErrorMessage('registreCommerce', rc);
      return;
    }
    
    // Vérifier le doublon
    this.validationInProgress.registreCommerce = true;
    this.validationService.checkRegistreCommerceExists(rc).subscribe({
      next: (exists) => {
        this.validationInProgress.registreCommerce = false;
        if (exists) {
          this.validationErrors.registreCommerce = this.validationService.getErrorMessage('registreCommerce', rc);
        }
      },
      error: () => {
        this.validationInProgress.registreCommerce = false;
        // En cas d'erreur, on ne bloque pas la saisie
      }
    });
  }

  // Vérifier s'il y a des erreurs de validation
  hasValidationErrors(): boolean {
    return Object.keys(this.validationErrors).length > 0;
  }

  // Effacer toutes les erreurs de validation
  clearValidationErrors(): void {
    this.validationErrors = {};
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
