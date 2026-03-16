# Integration Frontend-Backend SmartTax

## 📋 Vue d'ensemble

Ce document décrit l'intégration complète entre le frontend Angular (SmartTax-Frontend) et le backend Spring Boot (ArabSoftBack) pour le module d'immatriculation fiscale.

## 🏗️ Architecture

### Backend (ArabSoftBack)
- **Framework**: Spring Boot 3.x
- **Base de données**: MySQL avec Flyway pour les migrations
- **Sécurité**: Spring Security avec JWT
- **API REST**: Exposée sur `http://localhost:8080/api`

### Frontend (SmartTax-Frontend)
- **Framework**: Angular 17
- **HTTP Client**: HttpClientModule avec intercepteurs
- **Formulaires**: Reactive Forms avec validation
- **Notifications**: Service de notification personnalisé

## 🔌 Connexion API

### Configuration de base
```typescript
// src/app/config/api.config.ts
export const API_CONFIG = {
  BASE_URL: 'http://localhost:8080/api',
  IMMATRICULATION: {
    CREATE: '/immatriculation/create',
    CREATE_WITH_FILES: '/immatriculation/create-with-files',
    // ... autres endpoints
  }
};
```

### Service d'immatriculation
```typescript
// src/app/services/immatriculation.service.ts
@Injectable({
  providedIn: 'root'
})
export class ImmatriculationService {
  constructor(private http: HttpClient) {}
  
  createImmatriculation(dto: CreateImmatulationDto): Observable<Immatriculation> {
    return this.http.post<Immatriculation>(`${this.apiUrl}/create`, dto);
  }
  
  createImmatriculationWithFiles(
    dto: CreateImmatulationDto,
    files?: File[]
  ): Observable<Immatriculation> {
    const formData = new FormData();
    formData.append('data', JSON.stringify(dto));
    // Ajouter les fichiers...
    return this.http.post<Immatriculation>(`${this.apiUrl}/create-with-files`, formData);
  }
}
```

## 📊 Modèles de données

### Entité Backend (Java)
```java
@Entity
public class Immatriculation {
    private Long id;
    private String dossierNumber;
    private TypeContribuable typeContribuable; // PHYSIQUE, MORALE
    private String nom, prenom, cin;
    private LocalDate dateNaissance;
    // ... autres champs
    private DossierStatus status; // BROUILLON, SOUMIS, EN_COURS_VERIFICATION, VALIDE, REJETE
}
```

### Modèle Frontend (TypeScript)
```typescript
export interface Immatriculation {
  id?: number;
  dossierNumber: string;
  typeContribuable: TypeContribuable;
  nom?: string;
  prenom?: string;
  cin?: string;
  dateNaissance?: string;
  status: DossierStatus;
  // ... autres champs
}

export enum TypeContribuable {
  PHYSIQUE = 'PHYSIQUE',
  MORALE = 'MORALE'
}

export enum DossierStatus {
  BROUILLON = 'BROUILLON',
  SOUMIS = 'SOUMIS',
  EN_COURS_VERIFICATION = 'EN_COURS_VERIFICATION',
  VALIDE = 'VALIDE',
  REJETE = 'REJETE'
}
```

## 🔄 Workflow d'Immatriculation

### 1. Création du dossier
```typescript
// Frontend
const dto: CreateImmatulationDto = {
  typeContribuable: TypeContribuable.PHYSIQUE,
  nom: 'Mohamed',
  prenom: 'Ben Ali',
  email: 'mohamed@email.com',
  // ... autres champs
  submissionMode: SubmissionMode.DRAFT
};

this.immatriculationService.createImmatriculation(dto)
  .subscribe(response => {
    this.notificationService.showCreationSuccess('Dossier', response.dossierNumber);
  });
```

### 2. Soumission pour validation
```typescript
// Backend
@PostMapping("/{id}/submit")
public ResponseEntity<ImmatriculationDto> submitDossier(@PathVariable Long id) {
    Immatriculation submitted = immatriculationService.submitDossier(id);
    return ResponseEntity.ok(immatriculationMapper.toDto(submitted));
}

// Frontend
this.immatriculationService.submitDossier(dossierId)
  .subscribe(response => {
    this.notificationService.showSuccess('Dossier soumis avec succès');
  });
```

## 📁 Gestion des fichiers

### Upload avec FormData
```typescript
createImmatriculationWithFiles(
  dto: CreateImmatulationDto,
  identiteFile?: File,
  activiteFile?: File,
  photoFile?: File,
  autresFiles?: File[]
): Observable<Immatriculation> {
  const formData = new FormData();
  formData.append('data', JSON.stringify(dto));
  
  if (identiteFile) formData.append('identiteFile', identiteFile);
  if (activiteFile) formData.append('activiteFile', activiteFile);
  if (photoFile) formData.append('photoFile', photoFile);
  if (autresFiles) {
    autresFiles.forEach(file => formData.append('autresFiles', file));
  }

  return this.http.post<Immatriculation>(`${this.apiUrl}/create-with-files`, formData);
}
```

### Conversion Base64
```typescript
// Service utilitaire
convertFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.toString().split(',')[1];
      resolve(base64);
    };
    reader.readAsDataURL(file);
  });
}
```

## 🔧 Gestion des erreurs

### Intercepteur HTTP
```typescript
@Injectable()
export class HttpErrorInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        let errorMessage = 'Une erreur est survenue';
        
        switch (error.status) {
          case 400:
            errorMessage = 'Données invalides';
            break;
          case 409:
            errorMessage = 'Doublon détecté';
            break;
          // ... autres cas
        }
        
        this.notificationService.showError(errorMessage);
        return throwError(() => new Error(errorMessage));
      })
    );
  }
}
```

### Validation frontend
```typescript
// Validation des champs
validateCIN(cin: string): boolean {
  return /^\d{8}$/.test(cin);
}

validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

validateTelephone(telephone: string): boolean {
  return /^(?:\+216|216)?\d{8}$/.test(telephone.replace(/\s/g, ''));
}
```

## 🔔 Système de notifications

### Service de notification
```typescript
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  showSuccess(message: string, title?: string): void {
    this.addNotification({ type: 'success', message, title });
  }
  
  showError(message: string, title?: string): void {
    this.addNotification({ type: 'error', message, title });
  }
  
  // ... autres méthodes
}
```

### Composant de notification
```html
<!-- notification.component.html -->
<div class="notification-container">
  <div *ngFor="let notification of notifications" 
       class="notification"
       [class.notification-success]="notification.type === 'success'">
    <div class="notification-icon">
      <i class="fas fa-check-circle"></i>
    </div>
    <div class="notification-content">
      <div class="notification-title">{{ notification.title }}</div>
      <div class="notification-message">{{ notification.message }}</div>
    </div>
  </div>
</div>
```

## 🧪 Tests et Développement

### Mode développement
```typescript
// Service avec simulation
simulateCreateImmatriculation(dto: CreateImmatulationDto): Observable<Immatriculation> {
  const simulated: Immatriculation = {
    id: Math.floor(Math.random() * 1000),
    dossierNumber: this.generateDossierNumber(),
    ...dto,
    status: DossierStatus.BROUILLON
  };
  
  return of(simulated).pipe(delay(1000));
}
```

### Tests API
```bash
# Backend
curl -X POST http://localhost:8080/api/immatriculation/create \
  -H "Content-Type: application/json" \
  -d '{"typeContribuable":"PHYSIQUE","nom":"Mohamed","email":"test@test.com"}'

# Frontend
ng serve --configuration=development
```

## 🚀 Déploiement

### Configuration environnement
```typescript
// src/app/config/api.config.ts
export const ENV_CONFIG = {
  DEVELOPMENT: {
    API_URL: 'http://localhost:8080/api',
    ENABLE_LOGGING: true
  },
  PRODUCTION: {
    API_URL: 'https://api.smarttax.tn/api',
    ENABLE_LOGGING: false
  }
};
```

### Build production
```bash
# Frontend
ng build --configuration=production

# Backend
mvn clean package -Pprod
```

## 🔐 Sécurité

### CORS Configuration
```java
// Backend
@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("http://localhost:4200")
                .allowedMethods("GET", "POST", "PUT", "DELETE")
                .allowedHeaders("*");
    }
}
```

### Validation des entrées
```java
// Backend
@Valid
@RequestBody CreateImmatriculationDto dto

// Frontend
this.immatriculationForm = this.fb.group({
  email: ['', [Validators.required, Validators.email]],
  cin: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
  // ... autres validateurs
});
```

## 📈 Monitoring

### Logs
```typescript
// Frontend
console.log('API Request:', req.url);
console.error('API Error:', error);

// Backend
@Slf4j
@RestController
public class ImmatriculationController {
    @PostMapping("/create")
    public ResponseEntity<ImmatriculationDto> create(@Valid @RequestBody CreateImmatriculationDto dto) {
        log.info("Création dossier pour: {}", dto.getEmail());
        // ...
    }
}
```

## 🐛 Débugage

### Outils
- **Frontend**: Angular DevTools, Redux DevTools (si utilisé)
- **Backend**: Spring Boot Actuator, logs détaillés
- **Réseau**: Outils de développement navigateur, Postman

### Points de vérification
1. **Connectivité**: Vérifier que le backend est accessible
2. **CORS**: Confirmer la configuration CORS
3. **Formats**: Valider les formats de données échangés
4. **Validation**: Vérifier les validations des deux côtés

## 📝 Checklist de déploiement

### Backend
- [ ] Base de données configurée et migrée
- [ ] Variables d'environnement définies
- [ ] Logs configurés
- [ ] Sécurité activée (HTTPS, authentification)
- [ ] API testée avec Postman/curl

### Frontend
- [ ] Variables d'environnement de production
- [ ] Build optimisé (AOT, compression)
- [ ] Routes configurées
- [ ] Service workers (si PWA)
- [ ] Tests E2E passants

### Intégration
- [ ] Communication API fonctionnelle
- [ ] Gestion des erreurs implémentée
- [ ] Notifications utilisateur actives
- [ ] Performance optimisée
- [ ] Sécurité validée

---

**Dernière mise à jour**: Mars 2024  
**Version**: 1.0.0  
**Auteur**: Équipe SmartTax
