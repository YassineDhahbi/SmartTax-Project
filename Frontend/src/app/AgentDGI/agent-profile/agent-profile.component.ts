import { Component, OnInit, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { UserService } from '../../services/user/user.service';
import { Utilisateur } from '../../models/utilisateur';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-agent-profile',
  templateUrl: './agent-profile.component.html',
  styleUrls: ['./agent-profile.component.css']
})
export class AgentProfileComponent implements OnInit {
  agentInfo: Utilisateur | null = null;
  isLoading = false;
  error: string | null = null;
  isEditing = false;
  isSaving = false;
  editForm: FormGroup;
  saveSuccess = false;
  saveError: string | null = null;
  selectedPhoto: File | null = null;
  photoPreview: string | null = null;
  isUploadingPhoto = false;

  agentAdditionalInfo = {
   
    competences: [
      'Traitement des immatriculations',
      'Validation des dossiers fiscaux',
      'Contrôle de conformité',
      'Support contribuables',
      'Traitement des publication'
    ],
   
  };

  // Liste des villes tunisiennes pour la liste déroulante
  villesTunisie = [
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
    'Medenine',
    'Tataouine',
    'Gafsa',
    'Tozeur',
    'Kebili'
  ];
  
  theme: 'dark' | 'light' = 'dark';

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private userService: UserService,
    private fb: FormBuilder,
    private http: HttpClient
  ) {
    this.editForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      dateNaissance: [''],
      telephone: [''],
      adresse: ['']
    });
  }

  ngOnInit(): void {
    this.detectTheme();
    this.loadAgentInfo();
  }

  loadAgentInfo(): void {
    this.isLoading = true;
    this.error = null;
    
    this.userService.getUserDetails().subscribe({
      next: (user) => {
        // Vérifier si l'utilisateur est un agent
        if (user.role === 'AGENT_DGI' || user.role === 'AGENT') {
          this.agentInfo = user;
        } else {
          this.error = 'Cet utilisateur n\'est pas un agent DGI';
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des informations de l\'agent:', err);
        this.error = 'Impossible de charger les informations de l\'agent';
        this.isLoading = false;
      }
    });
  }

  private detectTheme(): void {
    // Détecter le thème depuis le dashboard parent
    const daElement = this.document.querySelector('.da');
    if (daElement) {
      this.theme = daElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    }
  }

  editProfile(): void {
    if (this.agentInfo) {
      this.isEditing = true;
      this.saveSuccess = false;
      this.saveError = null;
      
      // Remplir le formulaire avec les données actuelles
      this.editForm.patchValue({
        firstName: this.agentInfo.firstName,
        lastName: this.agentInfo.lastName,
        dateNaissance: this.agentInfo.dateNaissance,
        telephone: this.agentInfo.telephone || '',
        adresse: this.agentInfo.adresse || ''
      });
    }
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editForm.reset();
    this.saveSuccess = false;
    this.saveError = null;
  }

  saveProfile(): void {
    if (this.editForm.invalid || !this.agentInfo) {
      return;
    }

    this.isSaving = true;
    this.saveSuccess = false;
    this.saveError = null;

    const formValues = this.editForm.value;
    const updatedData = {
      firstName: formValues.firstName,
      lastName: formValues.lastName,
      dateNaissance: formValues.dateNaissance,
      telephone: formValues.telephone && formValues.telephone.trim() ? formValues.telephone.trim() : null,
      adresse: formValues.adresse && formValues.adresse.trim() ? formValues.adresse.trim() : null
    };

    console.log('=== DEBUG SAVE PROFILE ===');
    console.log('Form values:', this.editForm.value);
    console.log('Updated data being sent:', updatedData);
    console.log('Telephone value:', this.editForm.value.telephone);
    console.log('Adresse value:', this.editForm.value.adresse);

    this.userService.updateUserDetails(updatedData).subscribe({
      next: (updatedUser) => {
        console.log('=== RESPONSE FROM API ===');
        console.log('Updated user received:', updatedUser);
        console.log('Updated user telephone:', updatedUser.telephone);
        console.log('Updated user adresse:', updatedUser.adresse);
        
        this.agentInfo = updatedUser;
        this.isEditing = false;
        this.isSaving = false;
        this.saveSuccess = true;
        
        // Masquer le message de succès après 3 secondes
        setTimeout(() => {
          this.saveSuccess = false;
        }, 3000);
      },
      error: (err) => {
        console.error('Erreur lors de la sauvegarde du profil:', err);
        this.saveError = 'Impossible de sauvegarder les modifications. Veuillez réessayer.';
        this.isSaving = false;
      }
    });
  }

  changePassword(): void {
    // TODO: Implémenter la fonction de changement de mot de passe
    console.log('Changement de mot de passe');
  }

  exportData(): void {
    // TODO: Implémenter la fonction d'export des données
    console.log('Export des données');
  }

  goBack(): void {
    window.history.back();
  }

  onPhotoSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Vérifier si c'est une image
      if (!file.type.startsWith('image/')) {
        this.saveError = 'Veuillez sélectionner une image valide (JPG, PNG, etc.)';
        setTimeout(() => {
          this.saveError = null;
        }, 3000);
        return;
      }

      // Vérifier la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.saveError = 'La taille de l\'image ne doit pas dépasser 5MB';
        setTimeout(() => {
          this.saveError = null;
        }, 3000);
        return;
      }

      this.selectedPhoto = file;
      
      // Créer une prévisualisation
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.photoPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removePhoto(): void {
    this.selectedPhoto = null;
    this.photoPreview = null;
  }

  uploadPhoto(): void {
    if (!this.selectedPhoto || !this.agentInfo) {
      return;
    }

    this.isUploadingPhoto = true;
    this.saveError = null;

    console.log('=== UPLOAD PHOTO DEBUG ===');
    console.log('Using UserService.uploadPhoto method');
    console.log('Selected photo:', this.selectedPhoto.name);

    // Utiliser la méthode uploadPhoto existante du UserService
    this.userService.uploadPhoto(this.selectedPhoto).subscribe({
      next: (photoPath) => {
        console.log('=== UPLOAD SUCCESS ===');
        console.log('Photo path received:', photoPath);
        
        if (this.agentInfo) {
          this.agentInfo.photo = photoPath;
          this.selectedPhoto = null;
          this.photoPreview = null;
          
          console.log('Photo updated in agentInfo:', this.agentInfo.photo);
          
          // Afficher un message de succès
          this.saveSuccess = true;
          setTimeout(() => {
            this.saveSuccess = false;
          }, 3000);
        }
      },
      error: (error) => {
        console.log('=== UPLOAD ERROR ===');
        console.log('Error:', error);
        
        this.saveError = error.message || 'Impossible d\'uploader la photo. Veuillez réessayer.';
        this.isUploadingPhoto = false;
      },
      complete: () => {
        this.isUploadingPhoto = false;
        console.log('Upload process finished');
      }
    });
  }

  getPhotoUrl(): string {
    if (this.photoPreview) {
      return this.photoPreview;
    }
    
    if (this.agentInfo?.photo) {
      // Si la photo est une URL complète
      if (this.agentInfo.photo.startsWith('http')) {
        return this.agentInfo.photo;
      }
      // Si c'est un chemin relatif, construire l'URL complète
      return `http://localhost:8080/${this.agentInfo.photo}`;
    }
    
    // Photo par défaut
    return 'assets/images/default-avatar.png';
  }
}
