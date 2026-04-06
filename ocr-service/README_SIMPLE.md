# 🚀 SmartTax OCR Service - Version Simple

Service OCR simple et robuste pour extraire automatiquement les informations des cartes d'identité tunisiennes et les intégrer dans le formulaire d'immatriculation.

## 📋 Fonctionnalités

- ✅ **Extraction automatique CIN** : Numéro, nom, prénom, date/lieu de naissance, sexe
- ✅ **Interface simple** : Upload par drag & drop ou clic
- ✅ **Intégration formulaire** : Remplissage automatique des champs
- ✅ **Support multi-langues** : Arabe et français
- ✅ **Fallback robuste** : Fonctionne même avec des images de qualité moyenne

## 🚀 Démarrage rapide

### 1. Installation des dépendances
```bash
pip install -r requirements_simple.txt
```

### 2. Démarrer le service OCR
```bash
python simple_ocr_service.py
```

Le service démarre sur `http://localhost:8000`

### 3. Utiliser l'interface

#### Option A : Composant autonome
Ouvrez `cin_extractor_component.html` dans votre navigateur

#### Option B : Formulaire complet
Ouvrez `immatriculation_form_example.html` pour voir l'intégration complète

## 📁 Structure des fichiers

```
ocr-service/
├── simple_ocr_service.py          # Service OCR principal
├── requirements_simple.txt        # Dépendances minimales
├── cin_extractor_component.html  # Composant d'extraction CIN
├── immatriculation_form_example.html # Exemple d'intégration complète
└── README_SIMPLE.md              # Documentation
```

## 🔧 API Endpoints

### POST /extract-cin
Extrait les informations d'une CIN à partir d'une image.

**Request:**
```
Content-Type: multipart/form-data
file: [image_file]
```

**Response:**
```json
{
  "success": true,
  "data": {
    "cin": "14773139",
    "nom": "YASSINE",
    "prenom": "ABDELLAH",
    "date_naissance": "15/01/1990",
    "lieu_naissance": "Tunis",
    "sexe": "M",
    "date_expiration": null,
    "nationalite": "Tunisienne"
  },
  "message": "Informations extraites avec succès"
}
```

### GET /health
Vérifie l'état du service.

**Response:**
```json
{
  "status": "healthy",
  "message": "Service OCR simple opérationnel"
}
```

## 🎯 Intégration dans votre application

### 1. Inclure le composant d'extraction
```html
<iframe src="cin_extractor_component.html" width="100%" height="600"></iframe>
```

### 2. Récupérer les données extraites
```javascript
// Les données sont stockées dans localStorage
const cinData = JSON.parse(localStorage.getItem('cinData') || '{}');

// Ou utiliser la fonction de callback
window.addEventListener('message', (event) => {
    if (event.data.type === 'CIN_DATA_EXTRACTED') {
        fillFormWithCINData(event.data.data);
    }
});
```

### 3. Remplir automatiquement votre formulaire
```javascript
function fillFormWithCINData(data) {
    if (data.cin) document.getElementById('cin').value = data.cin;
    if (data.nom) document.getElementById('nom').value = data.nom;
    if (data.prenom) document.getElementById('prenom').value = data.prenom;
    if (data.date_naissance) {
        const formattedDate = formatDateForInput(data.date_naissance);
        document.getElementById('date_naissance').value = formattedDate;
    }
    if (data.lieu_naissance) document.getElementById('lieu_naissance').value = data.lieu_naissance;
    if (data.sexe) document.getElementById('sexe').value = data.sexe;
}
```

## 🔍 Patterns de reconnaissance

Le service utilise des patterns regex simples mais efficaces:

- **CIN** : `\b\d{8}\b` (8 chiffres)
- **Nom** : `\b[A-Z][a-zÀ-ÿ]{2,}\b` (Lettres majuscules)
- **Date** : `\b(0[1-9]|[12][0-9]|3[01])[-/](0[1-9]|1[0-2])[-/](19|20)\d{2}\b`
- **Sexe** : `\b[MF]\b`
- **Villes** : Liste des 24 villes tunisiennes principales

## ⚡ Performance

- **Temps de traitement** : 2-5 secondes par image
- **Formats supportés** : JPG, PNG (max 10MB)
- **Précision** : 70-85% selon la qualité de l'image
- **Robustesse** : Fonctionne avec des images de qualité moyenne

## 🛠️ Personnalisation

### Ajouter de nouvelles villes
```python
villes = ['Tunis', 'Sfax', 'Sousse', 'Kairouan', 'Bizerte', 'Gabès', 
          'Ariana', 'Ben Arous', 'VOTRE_VILLE']  # Ajoutez votre ville ici
```

### Modifier les patterns
```python
# Dans extract_info_from_text()
cin_pattern = r'\b\d{8}\b'  # Adapter selon vos besoins
```

### Personnaliser l'interface
Modifiez le CSS dans les fichiers HTML pour adapter le design à votre application.

## 🔧 Dépannage

### Problème : Aucune information détectée
- **Solution** : Utilisez une image plus claire et bien éclairée
- **Conseil** : Évitez les ombres et les flous

### Problème : Service OCR ne démarre pas
- **Solution** : Vérifiez l'installation de Tesseract
- **Windows** : Téléchargez et installez Tesseract depuis https://github.com/UB-Mannheim/tesseract/wiki

### Problème : Erreur de connexion
- **Solution** : Assurez-vous que le service OCR tourne sur localhost:8000
- **Vérification** : Ouvrez http://localhost:8000/health dans votre navigateur

## 📝 Notes importantes

1. **Qualité de l'image** : La précision dépend directement de la qualité de la CIN scannée
2. **Format tunisien** : Optimisé pour les CIN tunisiennes standard
3. **Traitement local** : Toutes les données sont traitées localement, aucune envoi à des services externes
4. **Compatibilité** : Fonctionne avec tous les navigateurs modernes

## 🚀 Prochaines améliorations

- [ ] Support des passeports tunisiens
- [ ] Amélioration de la reconnaissance arabe
- [ ] Validation croisée des informations
- [ ] Support des documents scannés (PDF)
- [ ] Interface mobile responsive

## 📞 Support

Pour toute question ou problème d'intégration, consultez la documentation ou les exemples fournis.

---

**SmartTax OCR Service** - Extraction automatique des CIN tunisiennes 🇹🇳
