# Corrections Backend ArabSoftBack - SmartTax

## 🐛 Erreurs Identifiées

### 1. Erreur 500 - Content-Type non supporté

**Erreur** : `Content-Type 'application/octet-stream' is not supported`

**Cause** : L'intercepteur Angular ajoute automatiquement `Content-Type: application/json` à toutes les requêtes, y compris les FormData, ce qui entre en conflit avec le format `multipart/form-data` attendu par Spring Boot.

**Solution Frontend (déjà appliquée)** :
```typescript
// Dans l'intercepteur HTTP
if (!(req.body instanceof FormData)) {
  authReq = req.clone({
    setHeaders: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    }
  });
} else {
  // Pour FormData, ne pas définir Content-Type
  authReq = req.clone({
    setHeaders: {
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    }
  });
}
```

### 2. Erreur 500 - Endpoint create

**Erreur** : Erreur interne du serveur même avec l'endpoint JSON simple

**Cause possible** : Validation des données ou mapping DTO/Entity incorrect

**Diagnostic nécessaire** :
- Vérifier les logs du backend pour le message d'erreur détaillé
- Valider que tous les champs requis sont correctement mappés
- Vérifier les contraintes de validation dans les DTOs

## 🔧 Corrections Recommandées pour le Backend

### 1. Améliorer la gestion des erreurs

**Dans GlobalExceptionHandler.java** :
```java
@ExceptionHandler(HttpMessageNotReadableException.class)
public ResponseEntity<ErrorResponse> handleHttpMessageNotReadableException(
    HttpMessageNotReadableException ex) {
    
    String message = "Format des données invalide";
    if (ex.getMessage().contains("JSON parse error")) {
        message = "Format JSON invalide";
    }
    
    ErrorResponse error = new ErrorResponse(
        "DONNEES_INVALIDES", 
        message, 
        HttpStatus.BAD_REQUEST.value()
    );
    
    return ResponseEntity.badRequest().body(error);
}

@ExceptionHandler(MethodArgumentNotValidException.class)
public ResponseEntity<ErrorResponse> handleValidationException(
    MethodArgumentNotValidException ex) {
    
    List<String> errors = ex.getBindingResult()
        .getFieldErrors()
        .stream()
        .map(error -> error.getField() + ": " + error.getDefaultMessage())
        .collect(Collectors.toList());
    
    ErrorResponse error = new ErrorResponse(
        "VALIDATION_FAILED", 
        "Erreurs de validation: " + String.join(", ", errors), 
        HttpStatus.BAD_REQUEST.value()
    );
    
    return ResponseEntity.badRequest().body(error);
}
```

### 2. Vérifier les DTOs

**Dans ImmatriculationDto.java** :
```java
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ImmatriculationDto {
    
    // DTO pour la création
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateImmatriculationDto {
        @NotNull(message = "Le type de contribuable est requis")
        private TypeContribuable typeContribuable;
        
        @Email(message = "Email invalide")
        @NotBlank(message = "L'email est requis")
        private String email;
        
        @Pattern(regexp = "^(?:\\+216|216)?\\d{8}$", message = "Téléphone invalide")
        @NotBlank(message = "Le téléphone est requis")
        private String telephone;
        
        @NotBlank(message = "L'adresse est requise")
        private String adresse;
        
        // ... autres validations
    }
}
```

### 3. Configurer correctement MultipartFile

**Dans ImmatriculationController.java** :
```java
@PostMapping(value = "/create-with-files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
public ResponseEntity<ImmatriculationDto> createImmatriculationWithFiles(
        @RequestPart("data") @Valid CreateImmatriculationDto dto,
        @RequestPart(value = "identiteFile", required = false) MultipartFile identiteFile,
        @RequestPart(value = "activiteFile", required = false) MultipartFile activiteFile,
        @RequestPart(value = "photoFile", required = false) MultipartFile photoFile,
        @RequestPart(value = "autresFiles", required = false) MultipartFile[] autresFiles) {
    
    try {
        // Validation des fichiers
        validateFiles(identiteFile, activiteFile, photoFile, autresFiles);
        
        // Log de debug
        log.info("Création dossier avec fichiers pour: {}", dto.getEmail());
        log.info("Fichiers reçus - Identite: {}, Activite: {}, Photo: {}, Autres: {}", 
            identiteFile != null ? identiteFile.getOriginalFilename() : "null",
            activiteFile != null ? activiteFile.getOriginalFilename() : "null",
            photoFile != null ? photoFile.getOriginalFilename() : "null",
            autresFiles != null ? autresFiles.length : 0);
        
        // ... traitement
        
    } catch (Exception e) {
        log.error("Erreur lors de la création du dossier avec fichiers", e);
        throw new ImmatriculationException("Erreur lors du traitement des fichiers: " + e.getMessage());
    }
}

private void validateFiles(MultipartFile... files) {
    for (MultipartFile file : files) {
        if (file != null && !file.isEmpty()) {
            // Valider la taille (max 5MB)
            if (file.getSize() > 5 * 1024 * 1024) {
                throw new ImmatriculationException("Le fichier " + file.getOriginalFilename() + " dépasse 5MB");
            }
            
            // Valider le type
            String contentType = file.getContentType();
            if (!isValidContentType(contentType)) {
                throw new ImmatriculationException("Type de fichier non supporté: " + contentType);
            }
        }
    }
}

private boolean isValidContentType(String contentType) {
    return contentType != null && (
        contentType.startsWith("image/") || 
        contentType.equals("application/pdf") ||
        contentType.equals("application/msword") ||
        contentType.equals("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    );
}
```

### 4. Activer les logs détaillés

**Dans application.properties** :
```properties
# Logs détaillés pour le debugging
logging.level.tn.esprit.arabsoftback=DEBUG
logging.level.org.springframework.web=DEBUG
logging.level.org.springframework.http=DEBUG

# Afficher les requêtes HTTP
spring.mvc.log-request-details=true

# Logs SQL
logging.level.org.hibernate.SQL=DEBUG
logging.level.org.hibernate.type.descriptor.sql.BasicBinder=TRACE
```

## 🧪 Tests de Validation

### 1. Test avec curl (JSON)
```bash
curl -X POST http://localhost:8080/api/immatriculation/create \
  -H "Content-Type: application/json" \
  -d '{
    "typeContribuable": "PHYSIQUE",
    "email": "test@example.com",
    "telephone": "21612345678",
    "adresse": "Test Address",
    "typeActivite": "Commerce",
    "secteur": "Retail",
    "adresseProfessionnelle": "Test Address",
    "dateDebutActivite": "2024-01-01",
    "descriptionActivite": "Test Activity",
    "confirmed": true,
    "submissionMode": "SUBMIT"
  }'
```

### 2. Test avec curl (FormData)
```bash
curl -X POST http://localhost:8080/api/immatriculation/create-with-files \
  -F "data={\"typeContribuable\":\"PHYSIQUE\",\"email\":\"test@example.com\"};type=application/json" \
  -F "identiteFile=@test.pdf"
```

## 🚀 Solution Temporaire Frontend (déjà appliquée)

Pendant que le backend est corrigé, le frontend utilise le mode simulation :

```typescript
// Dans immatriculation.component.ts
result = await this.immatriculationService.simulateCreateImmatriculation(dto).toPromise() as Immatriculation;
```

## 📋 Checklist de Correction Backend

- [ ] Vérifier les logs détaillés pour l'erreur 500
- [ ] Ajouter une meilleure gestion des exceptions
- [ ] Valider les DTOs avec les bonnes annotations
- [ ] Corriger la configuration MultipartFile
- [ ] Tester avec curl les deux endpoints
- [ ] Activer les logs de debug
- [ ] Valider le mapping Entity/DTO

## 🔍 Points de Contrôle

1. **Logs du backend** : Chercher les messages d'erreur détaillés
2. **Validation DTO** : S'assurer que tous les champs requis sont validés
3. **Mapping** : Vérifier la conversion DTO → Entity
4. **Base de données** : S'assurer que la connexion fonctionne
5. **Dépendances** : Vérifier que toutes les dépendances sont présentes

---

**Note** : Le frontend est maintenant fonctionnel en mode simulation et prêt à être reconnecté au backend une fois les corrections appliquées.
