import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import * as bootstrap from 'bootstrap';

declare const grecaptcha: any;

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('recaptcha') recaptchaElement!: ElementRef;
  loginForm: FormGroup;
  isLoading: boolean = false;
  showPassword: boolean = false;
  toasts: { title: string; message: string; type: string }[] = [];
  recaptchaToken: string = '';
  private widgetId: number | null = null;
  private isRecaptchaInitialized: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
      remember: [false],
      recaptcha: ['']
    });
  }

  ngOnInit(): void {
    console.log('Login component initialized');
    if (this.authService.isLoggedIn()) {
      const role = localStorage.getItem('role');
      if (role === 'admin') {
        this.router.navigate(['/admin']);
      } else if (role === 'CONTRIBUABLE') {
        this.router.navigate(['/home']);
      }
    }
    this.loadRecaptchaScript();
  }

  ngAfterViewInit(): void {
    console.log('Login component after view init');
    this.initializeToasts();
    this.setupRecaptcha();
  }

  ngOnDestroy(): void {
    if (this.widgetId !== null && typeof grecaptcha !== 'undefined' && typeof grecaptcha.reset === 'function') {
      grecaptcha.reset(this.widgetId);
      this.widgetId = null;
      this.isRecaptchaInitialized = false;
    }
    console.log('Login component destroyed');
  }

  loadRecaptchaScript(): void {
    if (typeof grecaptcha === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log('reCAPTCHA script loaded successfully');
        this.setupRecaptcha();
      };
      script.onerror = () => {
        console.error('Failed to load reCAPTCHA script');
        this.addToast('Erreur', 'Impossible de charger le CAPTCHA. Vérifiez votre connexion.', 'toast-error');
      };
      document.head.appendChild(script);
    } else {
      console.log('reCAPTCHA API already available');
      this.setupRecaptcha();
    }
  }

  setupRecaptcha(): void {
    if (this.recaptchaElement) {
      if (typeof grecaptcha === 'undefined' || typeof grecaptcha.render !== 'function') {
        console.warn('reCAPTCHA API not fully available, retrying...');
        setTimeout(() => this.setupRecaptcha(), 1000);
        return;
      }
      this.renderRecaptcha();
    }
  }

  renderRecaptcha(): void {
    if (this.recaptchaElement) {
      try {
        this.recaptchaElement.nativeElement.innerHTML = '';
        if (this.widgetId !== null && typeof grecaptcha.reset === 'function') {
          grecaptcha.reset(this.widgetId);
        }
        this.widgetId = grecaptcha.render(this.recaptchaElement.nativeElement, {
          sitekey: '6LeTs3grAAAAAFCb19B7xWiDl80s5a9QL9CciIa1',
          callback: (token: string) => {
            this.recaptchaToken = token;
            this.loginForm.patchValue({ recaptcha: token });
            console.log('reCAPTCHA token generated:', token);
          },
          'expired-callback': () => {
            this.recaptchaToken = '';
            this.loginForm.patchValue({ recaptcha: '' });
            console.log('reCAPTCHA token expired');
            if (this.widgetId !== null && typeof grecaptcha.reset === 'function') {
              grecaptcha.reset(this.widgetId);
            }
          }
        });
        this.isRecaptchaInitialized = true;
        console.log('reCAPTCHA rendered with widget ID:', this.widgetId);
      } catch (error) {
        console.error('Error rendering reCAPTCHA:', error);
        this.addToast('Erreur', 'Erreur lors du chargement du CAPTCHA. Veuillez réessayer.', 'toast-error');
      }
    }
  }

  validateField(field: string): void {
    const control = this.loginForm.get(field);
    if (control?.invalid && (control.touched || control.dirty)) {
      let message = '';
      let title = 'Erreur de validation';
      switch (field) {
        case 'email':
          if (control.errors?.['required']) message = 'L\'email est requis.';
          else if (control.errors?.['email']) message = 'Veuillez entrer un email valide.';
          break;
        case 'password':
          if (control.errors?.['required']) message = 'Le mot de passe est requis.';
          break;
      }
      if (message) {
        this.addToast(title, message, 'toast-error');
      }
    }
  }

  onSubmit(): void {
    Object.keys(this.loginForm.controls).forEach(field => {
      const control = this.loginForm.get(field);
      control?.markAsTouched({ onlySelf: true });
      if (field !== 'remember') {
        this.validateField(field);
      }
    });

    if (this.loginForm.valid && this.recaptchaToken) {
      this.isLoading = true;
      this.toasts = [];

      const credentials = this.loginForm.value;
      console.log('Submitting credentials:', credentials);
      this.authService.login(credentials).subscribe({
        next: (response) => {
          console.log('Login response:', response);
          this.isLoading = false;
          if (response.token) {
            localStorage.setItem('token', response.token);
            localStorage.setItem('userId', response.idUtilisateur);
            localStorage.setItem('role', response.role);
            this.addToast('Succès', 'Connexion réussie ! Redirection...', 'toast-success');
            // Redirection basée sur le rôle
            if (response.role === 'ADMIN') {
              setTimeout(() => this.router.navigate(['/admin']), 2000);
            } else if (response.role === 'CONTRIBUABLE') {
              setTimeout(() => this.router.navigate(['/home']), 2000);
            } else {
              this.addToast('Erreur', 'Rôle non reconnu. Veuillez contacter un administrateur.', 'toast-error');
            }
          } else {
            this.addToast('Erreur', 'Aucun token reçu. Veuillez réessayer.', 'toast-error');
          }
        },
        error: (error) => {
          console.error('Login error:', error);
          this.isLoading = false;
          if (this.widgetId !== null && typeof grecaptcha.reset === 'function') {
            grecaptcha.reset(this.widgetId);
          }
          this.addToast('Erreur', error.error?.error || 'Échec de la connexion. Veuillez réessayer.', 'toast-error');
        }
      });
    } else if (!this.recaptchaToken) {
      this.addToast('Erreur', 'Veuillez valider le CAPTCHA.', 'toast-error');
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onLogout(): void {
    this.authService.logout();
  }

  addToast(title: string, message: string, type: string): void {
    this.toasts.push({ title, message, type });
    setTimeout(() => {
      const toastElement = document.querySelectorAll('.toast')[this.toasts.length - 1];
      if (toastElement) {
        const toast = new bootstrap.Toast(toastElement, { delay: 5000 });
        toast.show();
      }
    }, 0);
    setTimeout(() => {
      this.toasts.shift();
    }, 5000);
  }

  removeToast(index: number): void {
    this.toasts.splice(index, 1);
  }

  initializeToasts(): void {
    document.querySelectorAll('.toast').forEach(toastElement => {
      const toast = new bootstrap.Toast(toastElement, { delay: 5000 });
      toast.show();
    });
  }
}
