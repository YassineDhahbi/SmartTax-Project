import { Component, OnInit, ViewChild, ElementRef, HostListener, Renderer2, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { ImmatriculationService } from '../../services/immatriculation.service';
import { ValidationService } from '../../services/validation.service';
import { NotificationService } from '../../services/notification.service';
import { CinValidatorService } from '../../services/cin/cin-validator.service';
import { OcrService, CINData } from '../../services/ocr.service';
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
export class ImmatriculationComponent implements OnInit, AfterViewInit {
  @ViewChild('ocrFileInput') ocrFileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('canvas') canvas!: ElementRef;
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;

  // Liste des gouvernorats de Tunisie
  gouvernoratsTunisie = [
    'Tunis',
    'Ariana',
    'Ben Arous',
    'Manouba',
    'Nabeul',
    'Zaghouan',
    'Bizerte',
    'Béja',
    'Jendouba',
    'Le Kef',
    'Siliana',
    'Sousse',
    'Monastir',
    'Mahdia',
    'Sfax',
    'Kairouan',
    'Kasserine',
    'Sidi Bouzid',
    'Gabès',
    'Médenine',
    'Tataouine',
    'Gafsa',
    'Tozeur',
    'Kébili'
  ];

  // Liste des villes par gouvernorat
  villesParGouvernorat: { [key: string]: string[] } = {
    'Tunis': ['Tunis', 'Le Bardo', 'La Marsa', 'Carthage', 'Sidi Bou Said', 'El Menzah', 'El Manar'],
    'Ariana': ['Ariana', 'Ettadhamen', 'Kalaat El Andalous', 'Mnihla', 'Raoued', 'Sidi Thabet'],
    'Ben Arous': ['Ben Arous', 'Mornag', 'Ezzahra', 'Rades', 'Bou Mhel el-Bassatine', 'Fouchana', 'Mégrine'],
    'Manouba': ['Manouba', 'Den Den', 'Douar Hicher', 'El Menara', 'Oued Ellil', 'Tebourba'],
    'Nabeul': ['Nabeul', 'Hammamet', 'Kelibia', 'Dar Chichan', 'Menzel Temime', 'Soliman', 'Korba', 'Takelsa'],
    'Zaghouan': ['Zaghouan', 'Zriba', 'Fahs', 'Bir Mcherga', 'Nadhour'],
    'Bizerte': ['Bizerte', 'Menzel Bourguiba', 'Mateur', 'Jefna', 'Sejnane', 'El Alia', 'Ras Jebel'],
    'Béja': ['Béja', 'Testour', 'Nefza', 'Téboursouk', 'Amdoun', 'Ghardimaou'],
    'Jendouba': ['Jendouba', 'Tabarka', 'Aïn Draham', 'Fernana', 'Bou Salem', 'Ghardimaou'],
    'Le Kef': ['Le Kef', 'Sakiet Sidi Youssef', 'Tajerouine', 'Meknassy', 'Kalaa Khasba', 'Nebeur'],
    'Siliana': ['Siliana', 'Bou Arada', 'El Ksar', 'Maktar', 'Rouhia', 'Kesra'],
    'Sousse': ['Sousse', 'Hammam Sousse', 'Msaken', 'Ksibet Thameur', 'Enfidha', 'Sidi Bou Ali', 'Akouda'],
    'Monastir': ['Monastir', 'Ksar Hellal', 'Sahline', 'Jemmel', 'Bembla', 'Bekalta', 'Moknine'],
    'Mahdia': ['Mahdia', 'Bou Mhel el-Bassatine', 'Chorbane', 'El Jem', 'Ksour Essef', 'Ouled Chamekh', 'Sidi Alouane'],
    'Sfax': ['Sfax', 'Sakiet Ezzit', 'Sakiet Eddaier', 'Mahrès', 'Kerkennah', 'Thyna', 'El Hencha'],
    'Kairouan': ['Kairouan', 'Chebika', 'Sbikha', 'Oueslatia', 'Echrarda', 'Nasrallah', 'Haffouz'],
    'Kasserine': ['Kasserine', 'Sbeitla', 'Thala', 'Fériana', 'Foussana', 'Sidi Bou Zid'],
    'Sidi Bouzid': ['Sidi Bouzid', 'Meknassy', 'Menzel Bouzaiane', 'Regueb', 'Ouled Haffouz', 'Bir El Hafey'],
    'Gabès': ['Gabès', 'Mareth', 'Métouia', 'Ghannouch', 'El Hamma', 'Matmata', 'Nouvelle Matmata'],
    'Médenine': ['Médenine', 'Djerba', 'Zarzis', 'Ben Gardane', 'Tataouine', 'Sidi Makhlouf'],
    'Tataouine': ['Tataouine', 'Ghomrassen', 'Bir Lahmar', 'Dehiba', 'Remada'],
    'Gafsa': ['Gafsa', 'Métlaoui', 'Redeyef', 'Moularès', 'El Guettar', 'Sidi Aïch'],
    'Tozeur': ['Tozeur', 'Degache', 'Hamma', 'Nefta', 'Tamerza'],
    'Kébili': ['Kébili', 'Douz', 'Souk Lahad', 'El Faouar', 'Jemna']
  };

  // Propriétés pour la gestion de la sélection en cascade
  villesDisponibles: string[] = [];
  showAutreVille: boolean = false;
  villeSelectionnee: string = '';
  autreVille: string = '';

  // Méthode pour gérer le changement de gouvernorat
  onGouvernoratChange(event: any): void {
    const gouvernorat = event.target.value;
    
    if (gouvernorat) {
      // Récupérer les villes du gouvernorat sélectionné
      this.villesDisponibles = this.villesParGouvernorat[gouvernorat] || [];
      this.showAutreVille = false;
      this.villeSelectionnee = '';
      this.autreVille = '';
      
      // Réinitialiser le champ ville dans le formulaire
      this.immatriculationForm.get('ville')?.setValue('');
      this.immatriculationForm.get('autreVille')?.setValue('');
    } else {
      // Réinitialiser tout si aucun gouvernorat n'est sélectionné
      this.villesDisponibles = [];
      this.showAutreVille = false;
      this.villeSelectionnee = '';
      this.autreVille = '';
      this.immatriculationForm.get('ville')?.setValue('');
      this.immatriculationForm.get('autreVille')?.setValue('');
    }
  }

  // Méthode pour gérer le changement de ville
  onVilleChange(event: any): void {
    const ville = event.target.value;
    
    if (ville === 'autre') {
      this.showAutreVille = true;
      this.villeSelectionnee = '';
      this.immatriculationForm.get('ville')?.setValue('autre');
    } else {
      this.showAutreVille = false;
      this.villeSelectionnee = ville;
      this.autreVille = '';
      this.immatriculationForm.get('ville')?.setValue(ville);
      this.immatriculationForm.get('autreVille')?.setValue('');
    }
  }

  // Formulaire
  immatriculationForm!: FormGroup;
  currentStep: number = 1;
  totalSteps: number = 7; // Augmenté pour inclure l'étape de nationalité
  
  // Étape de nationalité
  showNationalityModal: boolean = false;
  isForeigner: boolean = false;
  nationalityDocument: File | null = null;
  nationalityDocumentPreview: string = '';

  // Getter pour détecter si l'utilisateur est étranger à partir du formulaire
  get isUserForeigner(): boolean {
    const nationalite = this.immatriculationForm.get('nationalite')?.value;
    return nationalite === 'etrangere';
  }

  // Liste des pays du monde
  paysListe = [
    'Afghanistan', 'Afrique du Sud', 'Albanie', 'Algérie', 'Allemagne', 'Andorre', 'Angola', 'Antigua-et-Barbuda',
    'Arabie Saoudite', 'Argentine', 'Arménie', 'Australie', 'Autriche', 'Azerbaïdjan', 'Bahamas', 'Bangladesh',
    'Barbade', 'Belgique', 'Belize', 'Bénin', 'Bhoutan', 'Biélorussie', 'Bolivie', 'Bosnie-Herzégovine',
    'Botswana', 'Brésil', 'Brunei', 'Bulgarie', 'Burkina Faso', 'Burundi', 'Cambodge', 'Cameroun', 'Canada',
    'Cap-Vert', 'République centrafricaine', 'Tchad', 'Chili', 'Chine', 'Chypre', 'Colombie', 'Comores',
    'République du Congo', 'République démocratique du Congo', 'Corée du Nord', 'Corée du Sud', 'Costa Rica',
    'Côte d\'Ivoire', 'Croatie', 'Cuba', 'Danemark', 'Djibouti', 'Dominique', 'Égypte', 'Émirats arabes unis',
    'Équateur', 'Érythrée', 'Estonie', 'Eswatini', 'États-Unis', 'Éthiopie', 'Fidji', 'Finlande', 'France',
    'Gabon', 'Gambie', 'Géorgie', 'Ghana', 'Grèce', 'Grenade', 'Guatemala', 'Guinée', 'Guinée équatoriale',
    'Guinée-Bissau', 'Guyana', 'Haïti', 'Honduras', 'Hongrie', 'Islande', 'Inde', 'Indonésie', 'Iran',
    'Iraq', 'Irlande', 'Israël', 'Italie', 'Jamaïque', 'Japon', 'Jordanie', 'Kazakhstan', 'Kenya', 'Kiribati',
    'Koweït', 'Kyrgyzstan', 'Laos', 'Lesotho', 'Lettonie', 'Liban', 'Libéria', 'Libye', 'Liechtenstein',
    'Lituanie', 'Luxembourg', 'Madagascar', 'Malawi', 'Malaisie', 'Maldives', 'Mali', 'Malte', 'Îles Marshall',
    'Mauritanie', 'Maurice', 'Mexique', 'Micronésie', 'Moldavie', 'Monaco', 'Mongolie', 'Monténégro', 'Maroc',
    'Mozambique', 'Myanmar', 'Namibie', 'Nauru', 'Népal', 'Nicaragua', 'Niger', 'Nigeria', 'Niue', 'Norvège',
    'Nouvelle-Zélande', 'Oman', 'Ouganda', 'Ouzbékistan', 'Pakistan', 'Palaos', 'Panama', 'Papouasie-Nouvelle-Guinée',
    'Paraguay', 'Pays-Bas', 'Pérou', 'Philippines', 'Pologne', 'Portugal', 'Qatar', 'Roumanie', 'Royaume-Uni',
    'Russie', 'Rwanda', 'Saint-Christophe-et-Niévès', 'Sainte-Lucie', 'Saint-Marin', 'Saint-Vincent-et-les-Grenadines',
    'Samoa', 'Saint-Marin', 'Sao Tomé-et-Principe', 'Arabie Saoudite', 'Sénégal', 'Serbie', 'Seychelles',
    'Sierra Leone', 'Singapour', 'Slovaquie', 'Slovénie', 'Somalie', 'Soudan du Sud', 'Soudan', 'Espagne', 'Sri Lanka',
    'Soudan', 'Suriname', 'Suède', 'Suisse', 'Syrie', 'Tadjikistan', 'Tanzanie', 'Thaïlande', 'Timor-Leste',
    'Togo', 'Tonga', 'Trinité-et-Tobago', 'Tunisie', 'Turquie', 'Turkménistan', 'Tuvalu', 'Ukraine', 'Uruguay',
    'Vanuatu', 'Vatican', 'Venezuela', 'Vietnam', 'Yémen', 'Zambie', 'Zimbabwe'
  ];
  
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
  capturedPhotoDataUrl: string = '';
  tempPhotoFile: File | null = null;

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
    [key: string]: string;
  } = {
    cin: '',
    email: '',
    telephone: '',
    registreCommerce: ''
  };

  // États de validation en cours
  validationInProgress: {
    cin?: boolean;
    email?: boolean;
    registreCommerce?: boolean;
  } = {};

  // Vérification par email
  emailVerification: {
    isVerified: boolean;
    isVerificationSent: boolean;
    verificationCode: string;
    enteredCode: string;
    showVerificationModal: boolean;
    emailToVerify: string;
    verificationAttempts: number;
    maxAttempts: number;
    isCodeExpired: boolean;
    codeExpiryTime: Date | null;
    debounceTimer: any;
    lastEmailChecked: string;
  } = {
    isVerified: false,
    isVerificationSent: false,
    verificationCode: '',
    enteredCode: '',
    showVerificationModal: false,
    emailToVerify: '',
    verificationAttempts: 0,
    maxAttempts: 3,
    isCodeExpired: false,
    codeExpiryTime: null,
    debounceTimer: null,
    lastEmailChecked: ''
  };

  // Vérification par SMS
  smsVerification: {
    isVerified: boolean;
    isVerificationSent: boolean;
    verificationCode: string;
    enteredCode: string;
    showVerificationModal: boolean;
    phoneNumberToVerify: string;
    verificationAttempts: number;
    maxAttempts: number;
    isCodeExpired: boolean;
    codeExpiryTime: Date | null;
    debounceTimer: any;
    lastPhoneChecked: string;
  } = {
    isVerified: false,
    isVerificationSent: false,
    verificationCode: '',
    enteredCode: '',
    showVerificationModal: false,
    phoneNumberToVerify: '',
    verificationAttempts: 0,
    maxAttempts: 3,
    isCodeExpired: false,
    codeExpiryTime: null,
    debounceTimer: null,
    lastPhoneChecked: ''
  };

  // Validation de la pièce d'identité
  identityValidation: {
    status: string;
    confidence: number;
    valid: boolean;
    adjusted: boolean;
  } | null = null;

  identityValidationInProgress: boolean = false;
  identityValidationError: string = '';

  // OCR Integration (simplifié)
  ocrData: any = null;
  ocrExtracted: Partial<CINData> = {};
  ocrProcessing: boolean = false;
  analysisStage: 'idle' | 'swin' | 'ocr' = 'idle';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private immatriculationService: ImmatriculationService,
    private validationService: ValidationService,
    private notificationService: NotificationService,
    private cinValidator: CinValidatorService,
    private ocrService: OcrService,
    private renderer: Renderer2
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.generateDossierNumber();
  }

  ngAfterViewInit(): void {
    console.log('ngAfterViewInit - Éléments ViewChild initialisés');
    console.log('videoElement:', this.videoElement);
    console.log('canvas:', this.canvas);
  }

  // Gestion du modal de nationalité
  openNationalityModal(): void {
    this.showNationalityModal = true;
  }

  closeNationalityModal(): void {
    this.showNationalityModal = false;
    this.isForeigner = false;
    this.nationalityDocument = null;
    this.nationalityDocumentPreview = '';
  }

  selectNationality(isForeigner: boolean): void {
    this.isForeigner = isForeigner;
    
    // Mettre à jour le champ nationalite dans le formulaire
    const nationaliteValue = isForeigner ? 'etrangere' : 'tunisienne';
    this.immatriculationForm.get('nationalite')?.setValue(nationaliteValue);
  }

  validateNationalityStep(): void {
    if (this.isForeigner && !this.nationalityDocument) {
      this.notificationService.showError('Veuillez télécharger votre passeport');
      return;
    }
    
    if (!this.isForeigner && !this.nationalityDocument && !this.files.identite) {
      this.notificationService.showError('Veuillez télécharger votre Carte d\'Identité Nationale (CIN)');
      return;
    }
    
    // Si l'utilisateur est tunisien et a téléchargé le CIN via le modal
    if (!this.isForeigner && this.nationalityDocument) {
      this.files.identite = this.nationalityDocument;
    }
    
    this.closeNationalityModal();
    this.currentStep = 2; // Passer à l'étape 2 (Informations Personnelles)
  }

  // Gestion des fichiers de nationalité
  onNationalityDocumentChange(event: any): void {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    if (this.isForeigner) {
      this.nationalityDocument = file;
      this.previewNationalityDocument(file);
      this.files.identite = file;
      this.closeNationalityModal();
      this.currentStep = 2;
      this.updateProgress();
      this.notificationService.showSuccess(
        'Votre passeport a été téléchargé avec succès. Vous pouvez maintenant remplir vos informations personnelles.',
        'Document téléchargé'
      );
      return;
    }

    // Cas tunisien: vérifier que le document est bien une CIN via SWIN, puis lancer OCR.
    this.validateCinAndProcessOcr(file);
  }

  previewNationalityDocument(file: File): void {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.nationalityDocumentPreview = e.target.result;
    };
    reader.readAsDataURL(file);
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
      formeJuridique: ['', [
        Validators.required
      ]],
      actionnaire: ['', [
        Validators.pattern(/^[A-Za-z\u00C0-\u017F\s'-]{3,50}$/),
        Validators.minLength(3),
        Validators.maxLength(50),
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
        Validators.minLength(2),
        Validators.maxLength(200)
      ]],
      ville: [''],
      autreVille: [''],
      nationalite: ['tunisienne'], // Par défaut tunisien
      
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
    if (this.validateCurrentStep()) {
      // Cas spécial pour l'étape 1 (Type Contribuable)
      if (this.currentStep === 1) {
        const typeContribuable = this.immatriculationForm.get('typeContribuable')?.value;
        if (typeContribuable === 'physique') {
          // Ouvrir le modal de nationalité pour les personnes physiques
          this.openNationalityModal();
          return;
        }
      }
      
      // Navigation normale pour les autres étapes
      if (this.currentStep < this.totalSteps) {
        this.currentStep++;
        this.updateProgress();
        
        // Lancer la vérification automatique à l'étape 6 (anciennement 5)
        if (this.currentStep === 6) {
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
        return this.validateActiviteStep(); // Les champs d'activité sont à l'étape 3
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
    
    if (type === 'PHYSIQUE' || type === 'physique') {
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
      
      // Vérifier les erreurs de validation personnalisées (doublons CIN)
      if (this.validationErrors['cin']) {
        this.notificationService.showError(this.validationErrors['cin'], 'CIN déjà utilisé');
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
      const formeJuridique = this.immatriculationForm.get('formeJuridique');
      const actionnaire = this.immatriculationForm.get('actionnaire');
      const registreCommerce = this.immatriculationForm.get('registreCommerce');
      const representantLegal = this.immatriculationForm.get('representantLegal');
      
      if (!raisonSociale?.value) {
        this.notificationService.showError('La raison sociale est obligatoire', 'Champ manquant');
        return false;
      }
      
      if (!formeJuridique?.value) {
        this.notificationService.showError('La forme juridique est obligatoire', 'Champ manquant');
        return false;
      }
      
      if (!actionnaire?.value) {
        this.notificationService.showError('Le nom de l\'actionnaire est obligatoire', 'Champ manquant');
        return false;
      }
      
      if (!registreCommerce?.value) {
        this.notificationService.showError('Le registre de commerce est obligatoire', 'Champ manquant');
        return false;
      }
      
      if (!representantLegal?.value) {
        this.notificationService.showError('Le représentant légal est obligatoire', 'Champ manquant');
        return false;
      }
      
      if (actionnaire?.invalid) {
        if (actionnaire?.errors?.['pattern']) {
          this.notificationService.showError('Le nom de l\'actionnaire contient des caractères invalides', 'Format invalide');
        } else if (actionnaire?.errors?.['minlength']) {
          this.notificationService.showError('Le nom de l\'actionnaire doit contenir au moins 3 caractères', 'Format invalide');
        } else {
          this.notificationService.showError('Le nom de l\'actionnaire est invalide', 'Erreur de format');
        }
        return false;
      }
      
      // Le matricule fiscal a été remplacé par forme juridique, donc plus de validation nécessaire
      
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
    
    // Vérifier les erreurs de validation personnalisées (doublons)
    if (this.validationErrors['email']) {
      this.notificationService.showError(this.validationErrors['email'], 'Email déjà utilisé');
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
  openWebcamModal(): void {
    this.showWebcamModal = true;
    // Attendre que le modal soit visible avant d'initialiser la webcam
    setTimeout(() => {
      this.initializeWebcam();
    }, 100);
  }

  async initializeWebcam(): Promise<void> {
    try {
      console.log('Tentative d\'initialisation de la webcam...');
      console.log('showWebcamModal:', this.showWebcamModal);
      
      // Attendre un peu plus pour s'assurer que le DOM est prêt
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Vérifier si l'élément vidéo existe
      if (!this.videoElement || !this.videoElement.nativeElement) {
        console.error('Erreur: Élément vidéo non trouvé');
        console.log('videoElement:', this.videoElement);
        alert('Erreur: Élément vidéo non disponible. Veuillez réessayer.');
        return;
      }

      // Vérifier si le navigateur supporte la webcam
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('Erreur: Webcam non supportée par le navigateur');
        alert('Votre navigateur ne supporte pas la webcam. Veuillez utiliser Chrome ou Firefox.');
        return;
      }

      console.log('Demande d\'accès à la webcam...');
      
      // Demander l'accès à la webcam
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });

      // Assigner le stream à l'élément vidéo
      const video = this.videoElement.nativeElement;
      video.srcObject = this.stream;
      
      // Attendre que la vidéo soit chargée
      video.onloadedmetadata = () => {
        console.log('Webcam initialisée avec succès');
        video.play().catch(err => {
          console.error('Erreur lors de la lecture de la vidéo:', err);
        });
      };

      video.onerror = (error) => {
        console.error('Erreur vidéo:', error);
        alert('Erreur lors de l\'initialisation de la webcam.');
      };

    } catch (error: any) {
      console.error('Erreur webcam:', error);
      
      // Messages d'erreur spécifiques
      if (error.name === 'NotAllowedError') {
        alert('Accès à la webcam refusé. Veuillez autoriser l\'utilisation de la webcam dans les paramètres de votre navigateur.');
      } else if (error.name === 'NotFoundError') {
        alert('Aucune webcam détectée. Veuillez vérifier que votre webcam est bien connectée.');
      } else if (error.name === 'NotReadableError') {
        alert('La webcam est déjà utilisée par une autre application.');
      } else {
        alert('Impossible d\'accéder à la webcam. Veuillez vérifier les permissions et votre matériel.');
      }
    }
  }

  closeWebcam(): void {
    console.log('Fermeture de la webcam...');
    
    // Arrêter tous les tracks du stream
    if (this.stream) {
      this.stream.getTracks().forEach((track: MediaStreamTrack) => {
        track.stop();
        console.log('Track arrêté:', track.kind);
      });
      this.stream = null;
    }

    // Nettoyer l'élément vidéo
    if (this.videoElement && this.videoElement.nativeElement) {
      const video = this.videoElement.nativeElement;
      video.srcObject = null;
      video.pause();
      console.log('Élément vidéo nettoyé');
    }

    this.showWebcamModal = false;
  }

  capturePhoto(): void {
    try {
      // Vérifier si les éléments existent
      if (!this.videoElement || !this.videoElement.nativeElement) {
        console.error('Erreur: Élément vidéo non trouvé pour la capture');
        alert('Erreur: Impossible de capturer la photo. Élément vidéo non disponible.');
        return;
      }

      if (!this.canvas || !this.canvas.nativeElement) {
        console.error('Erreur: Élément canvas non trouvé pour la capture');
        alert('Erreur: Impossible de capturer la photo. Canvas non disponible.');
        return;
      }

      const video = this.videoElement.nativeElement;
      const canvas = this.canvas.nativeElement;
      const context = canvas.getContext('2d');
      
      if (!context) {
        console.error('Erreur: Impossible d\'obtenir le contexte 2D du canvas');
        alert('Erreur: Impossible de capturer la photo.');
        return;
      }
      
      // Vérifier si la vidéo est prête
      if (video.readyState !== 4) { // HAVE_FUTURE_DATA = 4
        console.error('Erreur: La vidéo n\'est pas encore chargée');
        alert('Veuillez attendre que la webcam soit correctement initialisée.');
        return;
      }
      
      // Configurer les dimensions du canvas
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      // Dessiner l'image de la vidéo sur le canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Sauvegarder la capture dans une variable temporaire
      this.capturedPhotoDataUrl = canvas.toDataURL('image/jpeg');
      
      // Convertir le canvas en blob
      canvas.toBlob((blob: Blob | null) => {
        if (blob) {
          // Créer un fichier temporaire
          this.tempPhotoFile = new File([blob], 'photo-personnelle.jpg', { type: 'image/jpeg' });
          
          // Indiquer que la photo a été capturée
          this.capturedPhoto = true;
          
          // Afficher le canvas et cacher la vidéo
          video.style.display = 'none';
          canvas.style.display = 'block';
          
          console.log('Photo capturée avec succès:', this.tempPhotoFile);
        } else {
          console.error('Erreur: Impossible de créer le blob de l\'image');
          alert('Erreur lors de la capture de la photo.');
        }
      }, 'image/jpeg', 0.9);
      
    } catch (error) {
      console.error('Erreur lors de la capture de la photo:', error);
      alert('Erreur lors de la capture de la photo. Veuillez réessayer.');
    }
  }

  retakePhoto(): void {
    this.capturedPhoto = false;
    this.capturedPhotoDataUrl = '';
    this.tempPhotoFile = null;
    
    // Réafficher la vidéo et cacher le canvas
    if (this.videoElement && this.videoElement.nativeElement) {
      this.videoElement.nativeElement.style.display = 'block';
    }
    if (this.canvas && this.canvas.nativeElement) {
      this.canvas.nativeElement.style.display = 'none';
    }
  }

  usePhoto(): void {
    if (this.tempPhotoFile && this.capturedPhotoDataUrl) {
      // Enregistrer la photo dans files.photo et photoPreview
      this.files.photo = this.tempPhotoFile;
      this.photoPreview = this.capturedPhotoDataUrl;
      
      // Fermer la webcam
      this.closeWebcam();
      
      // Réinitialiser les variables temporaires
      this.capturedPhoto = false;
      this.capturedPhotoDataUrl = '';
      this.tempPhotoFile = null;
      
      console.log('Photo personnelle enregistrée avec succès!');
      alert('Photo personnelle enregistrée avec succès!');
    }
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
      
      // Logs de débogage pour les nouveaux champs
      console.log('🔍 Valeurs des champs adresse:', {
        adresse: this.immatriculationForm.get('adresse')?.value,
        ville: this.immatriculationForm.get('ville')?.value,
        autreVille: this.immatriculationForm.get('autreVille')?.value,
        nationalite: this.immatriculationForm.get('nationalite')?.value,
        isForeigner: this.isForeigner
      });
      
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
        formeJuridique: this.immatriculationForm.get('formeJuridique')?.value || undefined,
        actionnaire: this.immatriculationForm.get('actionnaire')?.value || undefined,
        registreCommerce: this.immatriculationForm.get('registreCommerce')?.value || undefined,
        representantLegal: this.immatriculationForm.get('representantLegal')?.value || undefined,
        email: this.immatriculationForm.get('email')?.value || '',
        telephone: this.immatriculationForm.get('telephone')?.value || '',
        adresse: this.immatriculationForm.get('adresse')?.value || '',
        ville: this.immatriculationForm.get('ville')?.value || undefined,
        autreVille: this.immatriculationForm.get('autreVille')?.value || undefined,
        nationalite: this.immatriculationForm.get('nationalite')?.value || 'tunisienne',
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
    const year = now.getFullYear().toString().slice(-2); // 2 derniers chiffres
    const random = Math.floor(Math.random() * 99999).toString().padStart(5, '0'); // 5 chiffres avec zéros
    
    // Générer le TIN : Status(1) + Year(2) + Sequence(5) + LegalForm(1) + CheckLetter(1)
    // Pour l'instant, on utilise "2" pour nouveau contribuable et "P" pour personne physique
    this.dossierNumber = `2${year}${random}P`; // Exemple: 22600045PK
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
    delete this.validationErrors['cin'];
    
    if (!cin) {
      return;
    }
    
    // Valider le format d'abord
    if (!this.validationService.validateCinFormat(cin)) {
      this.validationErrors['cin'] = 'Le CIN doit contenir exactement 8 chiffres';
      return;
    }
    
    // Vérifier le doublon dans la base de données
    this.validationInProgress.cin = true;
    this.validationService.checkCinExists(cin).subscribe({
      next: (exists) => {
        this.validationInProgress.cin = false;
        if (exists) {
          this.validationErrors['cin'] = 'Un dossier existe déjà avec ce CIN: ' + cin;
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
    delete this.validationErrors['email'];
    
    // Annuler le timer précédent
    if (this.emailVerification.debounceTimer) {
      clearTimeout(this.emailVerification.debounceTimer);
    }
    
    if (!email) {
      return;
    }
    
    // Valider le format d'abord
    if (!this.validationService.validateEmailFormat(email)) {
      this.validationErrors['email'] = 'Veuillez entrer une adresse email valide (ex: nom@domaine.com)';
      return;
    }
    
    // Ne vérifier que si l'email est différent du dernier vérifié
    if (email === this.emailVerification.lastEmailChecked) {
      return;
    }
    
    // Ajouter un délai de 2 secondes avant de vérifier
    this.emailVerification.debounceTimer = setTimeout(() => {
      this.emailVerification.lastEmailChecked = email;
      
      // Vérifier le doublon dans la base de données
      this.validationInProgress.email = true;
      this.validationService.checkEmailExists(email).subscribe({
        next: (exists) => {
          this.validationInProgress.email = false;
          if (exists) {
            this.validationErrors['email'] = 'Un dossier existe déjà avec cet email: ' + email;
          } else {
            // Si l'email est valide et n'existe pas, envoyer le code de vérification
            this.sendEmailVerificationCode(email);
          }
        },
        error: () => {
          this.validationInProgress.email = false;
          // En cas d'erreur, on ne bloque pas la saisie
        }
      });
    }, 2000); // 2 secondes de délai
  }

  onTelephoneChange(event: any): void {
    const telephone = event.target.value;
    
    // Effacer l'erreur précédente
    delete this.validationErrors['telephone'];
    
    // Annuler le timer précédent
    if (this.smsVerification.debounceTimer) {
      clearTimeout(this.smsVerification.debounceTimer);
    }
    
    if (!telephone) {
      return;
    }
    
    // Valider le format du téléphone
    if (!this.validationService.validatePhoneFormat(telephone)) {
      this.validationErrors['telephone'] = 'Veuillez entrer un numéro de téléphone valide (ex: 22xxxxxx ou +21622xxxxxx)';
      return;
    }
    
    // Ne vérifier que si le téléphone est différent du dernier vérifié
    if (telephone === this.smsVerification.lastPhoneChecked) {
      return;
    }
    
    // Ajouter un délai de 2 secondes avant de vérifier
    this.smsVerification.debounceTimer = setTimeout(() => {
      this.smsVerification.lastPhoneChecked = telephone;
      
      // Envoyer le code de vérification par SMS
      this.sendSMSVerificationCode(telephone);
    }, 2000); // 2 secondes de délai
  }

  onRegistreCommerceChange(event: any): void {
    const rc = event.target.value;
    
    // Effacer l'erreur précédente
    delete this.validationErrors['registreCommerce'];
    
    if (!rc) {
      return;
    }
    
    // Validation simple du format
    const rcControl = this.immatriculationForm.get('registreCommerce');
    if (rcControl && rcControl.invalid) {
      if (rcControl.errors?.['pattern']) {
        this.validationErrors['registreCommerce'] = 'Le registre de commerce doit contenir uniquement des caractères alphanumériques (1-20 caractères)';
      } else if (rcControl.errors?.['required']) {
        this.validationErrors['registreCommerce'] = 'Le registre de commerce est obligatoire';
      }
    }
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

  // ===== Méthodes OCR Simplifiées =====
  
  /**
   * Déclenche le clic sur l'input file OCR
   */
  triggerOcrFileInput(): void {
    this.ocrFileInput.nativeElement.click();
  }

  /**
   * Gestion de la sélection de fichier OCR
   */
  onOcrFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleOcrFile(input.files[0]);
    }
  }

  /**
   * Traite le fichier OCR
   */
  private handleOcrFile(file: File): void {
    if (!file.type.startsWith('image/')) {
      this.notificationService.showError('Veuillez sélectionner une image valide', 'Format invalide');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      this.notificationService.showError('L\'image est trop volumineuse (max 10MB)', 'Fichier trop volumineux');
      return;
    }

    if (!this.isForeigner) {
      this.validateCinAndProcessOcr(file);
      return;
    }

    // Sauvegarder le fichier CIN pour les pièces jointes
    this.saveCINFileForAttachments(file);
    
    this.extractCINData(file);
  }

  /**
   * Vérifie via SWIN que le document est une CIN, puis lance OCR.
   * Si le document n'est pas une CIN, il est refusé.
   */
  private validateCinAndProcessOcr(file: File): void {
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      this.notificationService.showError(
        'Pour un contribuable tunisien, veuillez télécharger une image CIN (JPG ou PNG).',
        'Format invalide'
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.notificationService.showError('La taille du fichier CIN ne doit pas dépasser 5MB.', 'Fichier trop volumineux');
      return;
    }

    this.identityValidationInProgress = true;
    this.identityValidationError = '';
    this.analysisStage = 'swin';

    this.cinValidator.validateCin(file).subscribe({
      next: (response) => {
        this.identityValidation = {
          status: response.status,
          confidence: response.confidence,
          valid: response.valid,
          adjusted: response.adjusted
        };
        this.identityValidationScore = response.confidence || 0;
        this.identityValidationInProgress = false;
        this.updateDocumentScore();

        if (!response.valid) {
          this.identityValidationError = 'Document invalide: ce fichier n\'est pas reconnu comme une CIN.';
          this.nationalityDocument = null;
          this.nationalityDocumentPreview = '';
          this.notificationService.showError(
            'Document refusé: ce fichier n\'est pas une CIN valide. Veuillez télécharger uniquement votre CIN.',
            'Vérification SWIN échouée'
          );
          this.analysisStage = 'idle';
          return;
        }

        this.nationalityDocument = file;
        this.previewNationalityDocument(file);
        this.saveCINFileForAttachments(file);
        this.extractCINData(file);
      },
      error: (err) => {
        this.identityValidationInProgress = false;
        this.analysisStage = 'idle';
        this.identityValidation = null;
        this.identityValidationScore = 0;
        this.identityValidationError = 'Erreur lors de la validation SWIN: ' + (err?.error?.message || err?.message || 'Erreur inconnue');
        this.notificationService.showError(
          'Impossible de vérifier le document CIN. Veuillez réessayer.',
          'Erreur validation SWIN'
        );
      }
    });
  }

  /**
   * Sauvegarde le fichier CIN pour les pièces jointes
   */
  private saveCINFileForAttachments(file: File): void {
    // Créer une copie du fichier pour les pièces jointes
    const cinFile = new File([file], `CIN_${file.name}`, { type: file.type });
    
    // Ajouter le fichier CIN aux pièces jointes
    this.files.identite = cinFile;
    
    console.log('📁 Fichier CIN sauvegardé pour les pièces jointes:', cinFile);
  }

  /**
   * Extrait les données CIN via OCR
   */
  private extractCINData(file: File): void {
    this.ocrProcessing = true;
    this.analysisStage = 'ocr';
    
    this.ocrService.extractCINInformation(file).subscribe({
      next: (response) => {
        this.ocrProcessing = false;
        this.analysisStage = 'idle';
        this.ocrData = response;
        
        if (response.success && response.data) {
          this.ocrExtracted = {
            cin: response.data.cin,
            nom: response.data.nom,
            prenom: response.data.prenom,
            date_naissance: response.data.date_naissance,
            lieu_naissance: response.data.lieu_naissance,
            sexe: response.data.sexe
          };
          
          // Appliquer automatiquement les données au formulaire
          this.applyOcrDataToForm(response.data);
          
          this.notificationService.showSuccess(
            `✅ Informations extraites avec succès ! (${(response.confidence * 100).toFixed(1)}% de confiance)\n\n🎯 Les champs "Informations Personnelles" ont été automatiquement remplis\n📁 Votre CIN a été sauvegardée dans la section "Pièces Jointes"`,
            '🎯 OCR Réussi - CIN sauvegardée'
          );
          
          // Fermer le modal de nationalité et naviguer vers la section Informations Personnelles
          this.closeNationalityModal();
          this.currentStep = 2; // Naviguer vers l'étape 2 (Informations Personnelles)
        } else {
          this.notificationService.showError(
            response.message || 'Erreur lors de l\'extraction',
            'OCR échoué'
          );
        }
      },
      error: (error) => {
        this.ocrProcessing = false;
        this.analysisStage = 'idle';
        console.error('❌ Erreur OCR:', error);
        this.notificationService.showError(
          'Erreur de communication avec le service OCR',
          'Erreur technique'
        );
      }
    });
  }

  isDocumentAnalysisInProgress(): boolean {
    return this.identityValidationInProgress || this.ocrProcessing;
  }

  getDocumentAnalysisMessage(): string {
    if (this.analysisStage === 'swin') {
      return 'Vérification SWIN en cours...';
    }
    if (this.analysisStage === 'ocr') {
      return 'Analyse OCR en cours...';
    }
    if (this.isDocumentAnalysisInProgress()) {
      return 'Analyse du document en cours...';
    }
    return '';
  }

  /**
   * Applique les données OCR au formulaire
   */
  private applyOcrDataToForm(data: CINData): void {
    console.log('🔍 Application des données OCR:', data);
    
    // Préparer toutes les données à appliquer
    const formData: any = {};
    
    // Appliquer CIN
    if (data.cin) {
      formData.cin = data.cin;
      this.ocrExtracted.cin = data.cin;
    }
    
    // Appliquer Nom
    if (data.nom) {
      formData.nom = data.nom;
      this.ocrExtracted.nom = data.nom;
    }
    
    // Appliquer Prénom
    if (data.prenom) {
      formData.prenom = data.prenom;
      this.ocrExtracted.prenom = data.prenom;
    }
    
    // Appliquer Date de naissance
    if (data.date_naissance) {
      const convertedDate = this.ocrService.convertDateForInput(data.date_naissance);
      if (convertedDate) {
        formData.dateNaissance = convertedDate;
        this.ocrExtracted.date_naissance = data.date_naissance;
      }
    }
    
    // Appliquer Lieu de naissance
    if (data.lieu_naissance && this.immatriculationForm.get('lieuNaissance')) {
      formData.lieuNaissance = data.lieu_naissance;
      this.ocrExtracted.lieu_naissance = data.lieu_naissance;
    }
    
    // Appliquer Sexe
    if (data.sexe && this.immatriculationForm.get('sexe')) {
      formData.sexe = data.sexe;
      this.ocrExtracted.sexe = data.sexe;
    }
    
    // Appliquer toutes les données en une seule fois
    if (Object.keys(formData).length > 0) {
      console.log('📋 Formulaire avant patchValue:', this.immatriculationForm.value);
      console.log('📝 Données à appliquer:', formData);
      
      // Petit délai pour s'assurer que le formulaire est prêt
      setTimeout(() => {
        this.immatriculationForm.patchValue(formData);
        console.log('✅ Données OCR appliquées au formulaire:', formData);
        console.log('📋 Formulaire après patchValue:', this.immatriculationForm.value);
      }, 100);
    }
    
    console.log('✅ Données OCR appliquées au formulaire - Les informations apparaîtront dans la section "Informations Personnelles"');
  }

  // Méthodes de vérification par email
  sendEmailVerificationCode(email: string): void {
    // Générer un code à 6 chiffres
    this.emailVerification.verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    this.emailVerification.emailToVerify = email;
    this.emailVerification.isCodeExpired = false;
    this.emailVerification.codeExpiryTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    console.log('Code de vérification généré:', this.emailVerification.verificationCode);
    
    // Appeler le backend pour envoyer l'email
    const emailRequest = {
      to: email,
      subject: 'Code de Vérification - SmartTax',
      body: `
        <h2 style="color: #2c3e50;">Vérification de votre adresse email</h2>
        <p>Bonjour,</p>
        <p>Vous avez demandé la vérification de votre adresse email pour votre dossier d'immatriculation fiscale sur SmartTax.</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <h3 style="color: #007bff; margin-bottom: 10px;">Votre code de vérification est:</h3>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #28a745; background-color: #d4edda; padding: 15px; border-radius: 5px; display: inline-block;">
            ${this.emailVerification.verificationCode}
          </div>
        </div>
        <p><strong>Ce code expirera dans 10 minutes.</strong></p>
        <p>Si vous n'avez pas demandé cette vérification, veuillez ignorer cet email.</p>
        <hr style="margin: 30px 0;">
        <p style="color: #6c757d; font-size: 14px;">
          Cordialement,<br>
          L'équipe SmartTax<br>
          Direction Générale des Impôts
        </p>
      `,
      securityCode: this.emailVerification.verificationCode,
      registrationLink: 'http://localhost:4200/register'
    };
    
    // Appel au backend pour envoyer l'email
    fetch('http://localhost:8080/api/email/send-validation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailRequest)
    })
    .then(response => response.json())
    .then(data => {
      console.log('Réponse du backend:', data);
      
      if (data.success && data.emailSent) {
        this.notificationService.showSuccess(`Code de vérification envoyé à ${email}`);
        this.emailVerification.isVerificationSent = true;
      } else {
        this.notificationService.showError(`Échec de l'envoi: ${data.message}`);
        console.error('Erreur envoi email:', data.message);
      }
    })
    .catch(error => {
      console.error('Erreur appel backend:', error);
      this.notificationService.showError('Erreur technique lors de l\'envoi du code');
      
      // En cas d'erreur, on garde le code généré localement pour les tests
      this.notificationService.showWarning(`Mode test: Code généré localement - ${this.emailVerification.verificationCode}`);
      this.emailVerification.isVerificationSent = true;
    });
  }

  showEmailVerificationModal(): void {
    this.emailVerification.showVerificationModal = true;
    this.emailVerification.verificationAttempts = 0;
    this.emailVerification.enteredCode = '';
  }

  // Méthodes de vérification par SMS
  sendSMSVerificationCode(phoneNumber: string): void {
    // Générer un code à 6 chiffres
    this.smsVerification.verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    this.smsVerification.phoneNumberToVerify = phoneNumber;
    this.smsVerification.isCodeExpired = false;
    this.smsVerification.codeExpiryTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    console.log('Code SMS généré:', this.smsVerification.verificationCode);
    
    // Appeler le backend pour envoyer le SMS
    const params = new URLSearchParams({
      phoneNumber: phoneNumber,
      verificationCode: this.smsVerification.verificationCode
    });
    
    fetch(`http://localhost:8080/api/sms/send-verification?${params}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    .then(response => response.json())
    .then(data => {
      console.log('Réponse du backend SMS:', data);
      
      if (data.success && data.smsSent) {
        this.notificationService.showSuccess(`Code de vérification envoyé par SMS à ${phoneNumber}`);
        this.smsVerification.isVerificationSent = true;
      } else {
        this.notificationService.showError(`Échec de l'envoi SMS: ${data.message}`);
        console.error('Erreur envoi SMS:', data.message);
        
        // En cas d'erreur, on garde le code généré localement pour les tests
        this.notificationService.showWarning(`Mode test: Code SMS généré localement - ${this.smsVerification.verificationCode}`);
        this.smsVerification.isVerificationSent = true;
      }
    })
    .catch(error => {
      console.error('Erreur appel backend SMS:', error);
      this.notificationService.showError('Erreur technique lors de l\'envoi du SMS');
      
      // En cas d'erreur, on garde le code généré localement pour les tests
      this.notificationService.showWarning(`Mode test: Code SMS généré localement - ${this.smsVerification.verificationCode}`);
      this.smsVerification.isVerificationSent = true;
    });
  }

  showSMSVerificationModal(): void {
    this.smsVerification.showVerificationModal = true;
    this.smsVerification.verificationAttempts = 0;
    this.smsVerification.enteredCode = '';
  }

  verifySMSCode(): void {
    if (this.smsVerification.enteredCode === this.smsVerification.verificationCode) {
      if (this.smsVerification.isCodeExpired) {
        this.notificationService.showError('Le code SMS a expiré. Veuillez demander un nouveau code.');
        return;
      }
      
      this.smsVerification.isVerified = true;
      this.smsVerification.showVerificationModal = false;
      this.notificationService.showSuccess('Numéro de téléphone vérifié avec succès!');
    } else {
      this.smsVerification.verificationAttempts++;
      
      if (this.smsVerification.verificationAttempts >= this.smsVerification.maxAttempts) {
        this.notificationService.showError('Nombre maximum de tentatives atteint. Veuillez demander un nouveau code.');
        this.smsVerification.showVerificationModal = false;
      } else {
        const remainingAttempts = this.smsVerification.maxAttempts - this.smsVerification.verificationAttempts;
        this.notificationService.showError(`Code SMS incorrect. ${remainingAttempts} tentative(s) restante(s).`);
      }
    }
  }

  resendSMSVerificationCode(): void {
    const phoneNumber = this.smsVerification.phoneNumberToVerify;
    this.sendSMSVerificationCode(phoneNumber);
    this.notificationService.showInfo('Un nouveau code de vérification a été envoyé par SMS.');
  }

  closeSMSVerificationModal(): void {
    this.smsVerification.showVerificationModal = false;
    this.smsVerification.enteredCode = '';
  }

  checkSMSCodeExpiry(): void {
    if (this.smsVerification.codeExpiryTime && new Date() > this.smsVerification.codeExpiryTime) {
      this.smsVerification.isCodeExpired = true;
    }
  }

  // Vérifier si le téléphone est vérifié avant de soumettre
  isPhoneVerified(): boolean {
    return this.smsVerification.isVerified;
  }

  verifyEmailCode(): void {
    if (this.emailVerification.enteredCode === this.emailVerification.verificationCode) {
      if (this.emailVerification.isCodeExpired) {
        this.notificationService.showError('Le code a expiré. Veuillez demander un nouveau code.');
        return;
      }
      
      this.emailVerification.isVerified = true;
      this.emailVerification.showVerificationModal = false;
      this.notificationService.showSuccess('Email vérifié avec succès!');
      
      // Ajouter une indication visuelle dans le formulaire
      this.immatriculationForm.get('email')?.setErrors(null);
    } else {
      this.emailVerification.verificationAttempts++;
      
      if (this.emailVerification.verificationAttempts >= this.emailVerification.maxAttempts) {
        this.notificationService.showError('Nombre maximum de tentatives atteint. Veuillez demander un nouveau code.');
        this.emailVerification.showVerificationModal = false;
      } else {
        const remainingAttempts = this.emailVerification.maxAttempts - this.emailVerification.verificationAttempts;
        this.notificationService.showError(`Code incorrect. ${remainingAttempts} tentative(s) restante(s).`);
      }
    }
  }

  resendVerificationCode(): void {
    const email = this.emailVerification.emailToVerify;
    this.sendEmailVerificationCode(email);
    this.notificationService.showInfo('Un nouveau code de vérification a été envoyé.');
  }

  closeEmailVerificationModal(): void {
    this.emailVerification.showVerificationModal = false;
    this.emailVerification.enteredCode = '';
  }

  checkCodeExpiry(): void {
    if (this.emailVerification.codeExpiryTime && new Date() > this.emailVerification.codeExpiryTime) {
      this.emailVerification.isCodeExpired = true;
    }
  }

  // Vérifier si l'email est vérifié avant de soumettre
  isEmailVerified(): boolean {
    return this.emailVerification.isVerified;
  }
}
