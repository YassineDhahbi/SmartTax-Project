import { Component, OnInit, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import * as bootstrap from 'bootstrap';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit, AfterViewInit {
  registerForm: FormGroup;
  errorMessage: string | null = null;
  isLoading: boolean = false;
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;
  passwordStrength: { label: string; class: string; width: string } = {
    label: '',
    class: '',
    width: '0%'
  };
  toasts: { title: string; message: string; type: string }[] = [];
  
  // Propriétés pour le TIN
  tin: string = '';
  tinVerificationMessage: string = '';
  tinVerificationSuccess: boolean = false;
  tinVerified: boolean = false;
  
  // Propriétés pour le code de sécurité (gardé pour compatibilité)
  securityCode: string = '';
  showSecurityCodeInput: boolean = false;
  isFromValidationEmail: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.registerForm = this.fb.group({
      cin: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]], // CIN : 8 chiffres obligatoires
      telephone: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]], // Téléphone : 8 chiffres obligatoires
      adresse: ['', [Validators.required, Validators.minLength(10)]], // Adresse : obligatoire, minimum 10 caractères
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[a-zA-Z\s]*$/)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[a-zA-Z\s]*$/)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      dateNaissance: ['', [Validators.required, this.minimumAgeValidator(18)]],
      photo: ['', Validators.pattern(/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/)],
      role: ['CONTRIBUABLE', Validators.required],
      tin: ['', [Validators.required, Validators.pattern(/^[12]\d{7}[A-Z]{2}$/)]], // Champ pour le TIN (obligatoire)
      securityCode: [''] // Champ pour le code de sécurité (gardé pour compatibilité)
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    // Vérifier s'il y a des paramètres dans l'URL (pour pré-remplissage automatique)
    this.route.queryParams.subscribe(params => {
      if (params['code']) {
        this.securityCode = params['code'];
        this.isFromValidationEmail = true;
        this.showSecurityCodeInput = true;
        
        // Pré-remplir le formulaire avec le code
        this.registerForm.patchValue({
          securityCode: this.securityCode
        });
        
        console.log(' Code de sécurité détecté:', this.securityCode);
        this.addToast('Information', 'Code de sécurité détecté. Veuillez compléter le formulaire pour créer votre compte.', 'info');
      }
      
      // Pré-remplir automatiquement les champs depuis l'email de validation TIN
      if (params['nom'] || params['prenom'] || params['email'] || params['tin'] || params['dateNaissance'] || params['cin'] || params['telephone'] || params['adresse']) {
        const formData: any = {};
        
        if (params['nom']) {
          formData.lastName = decodeURIComponent(params['nom']);
        }
        if (params['prenom']) {
          formData.firstName = decodeURIComponent(params['prenom']);
        }
        if (params['email']) {
          formData.email = decodeURIComponent(params['email']);
        }
        if (params['tin']) {
          formData.tin = decodeURIComponent(params['tin']);
        }
        if (params['dateNaissance']) {
          formData.dateNaissance = decodeURIComponent(params['dateNaissance']);
        }
        // Ajout des nouveaux champs depuis les paramètres URL
        if (params['cin']) {
          formData.cin = decodeURIComponent(params['cin']);
        }
        if (params['telephone']) {
          formData.telephone = decodeURIComponent(params['telephone']);
        }
        if (params['adresse']) {
          formData.adresse = decodeURIComponent(params['adresse']);
        }
        
        this.registerForm.patchValue(formData);
        
        console.log(' Formulaire pré-rempli avec:', formData);
        console.log(' Email de validation TIN détecté');
      }
    });
  }

  ngAfterViewInit(): void {
    // Initialiser les toasts après le rendu de la vue
    this.initializeToasts();
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  minimumAgeValidator(minAge: number) {
    return (control: any) => {
      if (!control.value) return null;
      const today = new Date();
      const birthDate = new Date(control.value);
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        return age - 1 >= minAge ? null : { underage: true };
      }
      return age >= minAge ? null : { underage: true };
    };
  }

  updatePasswordStrength(): void {
    const password = this.registerForm.get('password')?.value || '';
    let strength = 0;

    if (password.length > 0) strength += 1;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;

    switch (strength) {
      case 0:
      case 1:
        this.passwordStrength = { label: 'Faible', class: 'bg-danger', width: '33%' };
        break;
      case 2:
      case 3:
        this.passwordStrength = { label: 'Moyenne', class: 'bg-warning', width: '66%' };
        break;
      case 4:
      case 5:
        this.passwordStrength = { label: 'Forte', class: 'bg-success', width: '100%' };
        break;
    }
  }

  validateField(field: string): void {
    const control = this.registerForm.get(field);
    if (control?.invalid && (control.touched || control.dirty)) {
      let message = '';
      let title = 'Erreur de validation';
      switch (field) {
        case 'cin':
          if (control.errors?.['required']) message = 'Le CIN est requis.';
          else if (control.errors?.['pattern']) message = 'Le CIN doit contenir 8 chiffres.';
          break;
        case 'telephone':
          if (control.errors?.['required']) message = 'Le numéro de téléphone est requis.';
          else if (control.errors?.['pattern']) message = 'Le numéro de téléphone doit contenir 8 chiffres.';
          break;
        case 'adresse':
          if (control.errors?.['required']) message = 'L\'adresse est requise.';
          else if (control.errors?.['minlength']) message = 'L\'adresse doit contenir au moins 10 caractères.';
          break;
        case 'firstName':
          if (control.errors?.['required']) message = 'Le prénom est requis.';
          else if (control.errors?.['minlength']) message = 'Le prénom doit contenir au moins 2 caractères.';
          else if (control.errors?.['pattern']) message = 'Le prénom ne doit contenir que des lettres.';
          break;
        case 'lastName':
          if (control.errors?.['required']) message = 'Le nom de famille est requis.';
          else if (control.errors?.['minlength']) message = 'Le nom de famille doit contenir au moins 2 caractères.';
          else if (control.errors?.['pattern']) message = 'Le nom de famille ne doit contenir que des lettres.';
          break;
        case 'email':
          if (control.errors?.['required']) message = 'L\'email est requis.';
          else if (control.errors?.['email']) message = 'Veuillez entrer un email valide.';
          break;
        case 'password':
          if (control.errors?.['required']) message = 'Le mot de passe est requis.';
          else if (control.errors?.['minlength']) message = 'Le mot de passe doit contenir au moins 6 caractères.';
          break;
        case 'confirmPassword':
          if (control.errors?.['required']) message = 'La confirmation du mot de passe est requise.';
          else if (this.registerForm.errors?.['mismatch']) message = 'Les mots de passe ne correspondent pas.';
          break;
        case 'dateNaissance':
          if (control.errors?.['required']) message = 'La date de naissance est requise.';
          else if (control.errors?.['underage']) message = 'Vous devez avoir au moins 18 ans.';
          break;
        case 'photo':
          if (control.errors?.['pattern']) message = 'Veuillez entrer une URL valide pour la photo.';
          break;
        case 'tin':
          if (control.errors?.['required']) message = 'Le TIN est requis pour créer un compte.';
          else if (control.errors?.['pattern']) message = 'Format TIN invalide. Exemple: 22600001PU';
          break;
      }
      if (message) {
        this.addToast(title, message, 'toast-error');
      }
    }
  }

  onSubmit(): void {
    // Marquer tous les champs comme touchés pour déclencher les validations
    Object.keys(this.registerForm.controls).forEach(field => {
      const control = this.registerForm.get(field);
      control?.markAsTouched({ onlySelf: true });
      this.validateField(field);
    });

    // Validation spéciale pour le code de sécurité si requis
    if (this.isFromValidationEmail && !this.registerForm.value.securityCode) {
      this.addToast('Erreur', 'Le code de sécurité est requis pour créer votre compte.', 'toast-error');
      return;
    }

    // Vérifier que le TIN est valide avant de permettre l'inscription
    if (!this.tinVerificationSuccess) {
      this.addToast('Erreur', 'Veuillez vérifier votre TIN avant de créer votre compte.', 'toast-error');
      return;
    }

    if (this.registerForm.valid) {
      this.isLoading = true;
      this.toasts = []; // Réinitialiser les toasts

      const user = {
        cin: this.registerForm.value.cin,
        telephone: this.registerForm.value.telephone,
        adresse: this.registerForm.value.adresse,
        firstName: this.registerForm.value.firstName,
        lastName: this.registerForm.value.lastName,
        email: this.registerForm.value.email,
        password: this.registerForm.value.password,
        dateNaissance: new Date(this.registerForm.value.dateNaissance).toISOString().split('T')[0],
        photo: this.registerForm.value.photo || null,
        role: this.registerForm.value.role,
        matricule: this.registerForm.value.tin, // TIN sera enregistré dans le champ matricule
        securityCode: this.registerForm.value.securityCode || null // Inclure le code de sécurité
      };

      this.authService.register(user).subscribe({
        next: () => {
          this.isLoading = false;
          this.addToast('Succès', 'Inscription réussie ! Redirection vers la connexion...', 'toast-success');
          setTimeout(() => this.router.navigate(['/login']), 2000);
        },
        error: (error) => {
          this.isLoading = false;
          let errorMessage = 'Échec de l\'inscription. Veuillez réessayer.';
          
          // Message d'erreur spécifique pour le code de sécurité invalide
          if (error.error?.error?.includes('code de sécurité') || error.error?.error?.includes('security code')) {
            errorMessage = 'Code de sécurité invalide. Veuillez vérifier le code reçu par email.';
          } else if (error.error?.error) {
            errorMessage = error.error.error;
          }
          
          this.addToast('Erreur', errorMessage, 'toast-error');
        }
      });
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  addToast(title: string, message: string, type: string): void {
    this.toasts.push({ title, message, type });
    // Attendre que le DOM soit mis à jour
    setTimeout(() => {
      const toastElement = document.querySelectorAll('.toast')[this.toasts.length - 1];
      if (toastElement) {
        const toast = new bootstrap.Toast(toastElement, { delay: 5000 });
        toast.show();
      }
    }, 0);
    // Supprimer le toast après 5 secondes
    setTimeout(() => {
      this.toasts.shift();
    }, 5000);
  }

  removeToast(index: number): void {
    this.toasts.shift();
  }

  // Méthode de validation du TIN
  validateTIN(): void {
    const tinValue = this.registerForm.get('tin')?.value;
    
    if (!tinValue || tinValue.trim().length === 0) {
      // Si le champ TIN est vide, on cache le message de vérification
      this.tinVerificationMessage = '';
      this.tinVerified = false;
      return;
    }

    // Valider le format du TIN (ex: 22600001PU)
    const tinPattern = /^[12]\d{7}[A-Z]{2}$/;
    if (!tinPattern.test(tinValue)) {
      this.tinVerificationMessage = 'TIN non trouvé. Veuillez vérifier votre numéro ou contacter le support.';
      this.tinVerificationSuccess = false;
      this.tinVerified = false;
      return;
    }

    // Appeler le backend pour vérifier le TIN
    this.isLoading = true;
    this.authService.verifyTIN(tinValue).subscribe({
      next: (response) => {
        this.isLoading = false;
        
        if (response.success && response.exists) {
          // TIN trouvé - pré-remplir automatiquement tous les champs
          this.tinVerificationMessage = `TIN valide !`;
          this.tinVerificationSuccess = true;
          this.tinVerified = true;
          
          // Debug : Afficher toutes les données retournées par le backend
          console.log('🔍 Réponse complète du backend:', response);
          console.log('📋 Données disponibles pour pré-remplissage:', {
            email: response.email,
            nom: response.nom,
            prenom: response.prenom,
            dateNaissance: response.dateNaissance,
            cin: response.cin,
            telephone: response.telephone,
            adresse: response.adresse
          });
          
          // Pré-remplir tous les champs disponibles
          const formData: any = {};
          
          if (response.email && !this.registerForm.get('email')?.value) {
            formData.email = response.email;
          }
          if (response.nom && !this.registerForm.get('lastName')?.value) {
            formData.lastName = response.nom;
          }
          if (response.prenom && !this.registerForm.get('firstName')?.value) {
            formData.firstName = response.prenom;
          }
          if (response.dateNaissance && !this.registerForm.get('dateNaissance')?.value) {
            formData.dateNaissance = response.dateNaissance;
          }
          // Ajout des nouveaux champs CIN, téléphone et adresse
          if (response.cin && !this.registerForm.get('cin')?.value) {
            formData.cin = response.cin;
          }
          if (response.telephone && !this.registerForm.get('telephone')?.value) {
            formData.telephone = response.telephone;
          }
          if (response.adresse && !this.registerForm.get('adresse')?.value) {
            formData.adresse = response.adresse;
          }
          
          // Appliquer les pré-remplissages
          if (Object.keys(formData).length > 0) {
            console.log('📝 FormData avant patchValue:', formData);
            console.log('🔍 État actuel du formulaire avant patchValue:', {
              cin: this.registerForm.get('cin')?.value,
              telephone: this.registerForm.get('telephone')?.value,
              adresse: this.registerForm.get('adresse')?.value,
              email: this.registerForm.get('email')?.value,
              lastName: this.registerForm.get('lastName')?.value,
              firstName: this.registerForm.get('firstName')?.value,
              dateNaissance: this.registerForm.get('dateNaissance')?.value
            });
            
            this.registerForm.patchValue(formData);
            
            console.log('✅ Champs pré-remplis depuis le TIN:', formData);
            console.log('🔍 État du formulaire après patchValue:', {
              cin: this.registerForm.get('cin')?.value,
              telephone: this.registerForm.get('telephone')?.value,
              adresse: this.registerForm.get('adresse')?.value,
              email: this.registerForm.get('email')?.value,
              lastName: this.registerForm.get('lastName')?.value,
              firstName: this.registerForm.get('firstName')?.value,
              dateNaissance: this.registerForm.get('dateNaissance')?.value
            });
          }
        } else {
          // TIN non trouvé
          this.tinVerificationMessage = 'TIN non trouvé. Veuillez vérifier votre numéro ou contacter le support.';
          this.tinVerificationSuccess = false;
          this.tinVerified = false;
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.tinVerificationMessage = 'Erreur lors de la vérification du TIN. Veuillez réessayer.';
        this.tinVerificationSuccess = false;
        this.tinVerified = false;
      }
    });
  }

  initializeToasts(): void {
    // Initialiser les toasts existants
    document.querySelectorAll('.toast').forEach(toastElement => {
      const toast = new bootstrap.Toast(toastElement, { delay: 5000 });
      toast.show();
    });
  }
}
