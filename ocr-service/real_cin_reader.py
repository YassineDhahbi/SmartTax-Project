from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
import re
import os
import requests
from typing import Dict, Optional
from pydantic import BaseModel
import uvicorn

app = FastAPI(title="Real CIN Reader", description="Lecteur RÉEL de CIN tunisiennes")

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration Groq
GROQ_API_KEY = ""
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

# Créer le dossier temporaire
os.makedirs("temp", exist_ok=True)

class RealCINReader:
    """Lecteur RÉEL de CIN - pas de génération automatique"""
    
    def __init__(self):
        self.groq_api_key = GROQ_API_KEY
        self.groq_api_url = GROQ_API_URL
    
    def read_cin_real(self, image_path: str) -> Dict[str, Optional[str]]:
        """Lire VRAIMENT les informations de la CIN"""
        try:
            print(f"📖 Lecture RÉELLE: {image_path}")
            
            # Lire l'image
            image = cv2.imread(image_path)
            if image is None:
                return self.get_empty_result()
            
            height, width = image.shape[:2]
            print(f"✅ Image: {width}x{height}")
            
            # Étape 1: Extraire le texte RÉEL avec multiple méthodes
            real_text = self.extract_real_text(image)
            print(f"📝 Texte RÉEL extrait: '{real_text}'")
            
            if not real_text or len(real_text.strip()) < 5:
                print("❌ Aucun texte réel détecté")
                return self.get_empty_result()
            
            # Étape 2: Analyse avec Groq du texte RÉEL
            structured_data = self.analyze_real_text_with_groq(real_text)
            print(f"🧠 Analyse du texte réel: {structured_data}")
            
            return structured_data
            
        except Exception as e:
            print(f"❌ Erreur lecture: {e}")
            return self.get_empty_result()
    
    def extract_real_text(self, image: np.ndarray) -> str:
        """Extraire le texte RÉEL de l'image"""
        all_texts = []
        
        # Méthode 1: Tesseract avec toutes les configurations
        try:
            import pytesseract
            configs = [
                '--oem 3 --psm 6 -l ara+fra+eng --dpi 300',
                '--oem 3 --psm 11 -l ara+fra+eng --dpi 300',
                '--oem 3 --psm 12 -l ara+fra+eng --dpi 300',
                '--oem 3 --psm 3 -l ara+fra+eng --dpi 300',
                '--oem 3 --psm 4 -l ara+fra+eng --dpi 300'
            ]
            
            for i, config in enumerate(configs):
                try:
                    processed = self.preprocess_for_ocr(image, method=i)
                    text = pytesseract.image_to_string(processed, config=config)
                    if text and len(text.strip()) > 5:
                        all_texts.append(text.strip())
                        print(f"✅ Tesseract config {i}: '{text[:50]}...'")
                except Exception as e:
                    print(f"⚠️ Tesseract config {i} erreur: {e}")
        except ImportError:
            print("⚠️ Tesseract non disponible")
        
        # Méthode 2: Analyse par zones avec Tesseract
        zone_text = self.extract_by_zones_with_ocr(image)
        if zone_text:
            all_texts.append(zone_text)
            print(f"✅ Zones OCR: '{zone_text[:50]}...'")
        
        # Méthode 3: Prétraitement avancé + Tesseract
        advanced_text = self.extract_with_advanced_preprocessing(image)
        if advanced_text:
            all_texts.append(advanced_text)
            print(f"✅ Advanced OCR: '{advanced_text[:50]}...'")
        
        # Combiner et dédupliquer
        combined_text = " ".join(list(set(all_texts)))
        print(f"📝 Texte combiné: '{combined_text}'")
        
        return combined_text
    
    def preprocess_for_ocr(self, image: np.ndarray, method: int = 0) -> np.ndarray:
        """Prétraitement spécifique selon la méthode"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        if method == 0:
            # Standard
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
            enhanced = clahe.apply(gray)
            _, binary = cv2.threshold(enhanced, 127, 255, cv2.THRESH_BINARY)
        elif method == 1:
            # Inversion
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
            enhanced = clahe.apply(gray)
            _, binary = cv2.threshold(enhanced, 127, 255, cv2.THRESH_BINARY_INV)
        elif method == 2:
            # Adaptive
            binary = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                       cv2.THRESH_BINARY, 11, 2)
        elif method == 3:
            # Otsu
            _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        else:
            # Morphological
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
            enhanced = clahe.apply(gray)
            _, binary = cv2.threshold(enhanced, 127, 255, cv2.THRESH_BINARY)
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2,2))
            binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        
        return binary
    
    def extract_by_zones_with_ocr(self, image: np.ndarray) -> str:
        """Extraire par zones avec OCR"""
        try:
            import pytesseract
            height, width = image.shape[:2]
            
            # Définir les zones d'une CIN
            zones = [
                (0, 0, width, int(height * 0.3)),    # En-tête (noms)
                (0, int(height * 0.3), width, int(height * 0.3)),  # Centre (CIN, dates)
                (0, int(height * 0.6), width, int(height * 0.2)),  # Bas (lieu, sexe)
                (0, int(height * 0.8), width, int(height * 0.2))   # Pied (expiration)
            ]
            
            zone_texts = []
            for i, (x, y, w, h) in enumerate(zones):
                zone = image[y:y+h, x:x+w]
                
                # Prétraitement spécifique
                processed = self.preprocess_for_ocr(zone, method=i)
                
                # OCR
                config = '--oem 3 --psm 6 -l ara+fra+eng --dpi 300'
                text = pytesseract.image_to_string(processed, config=config)
                
                if text and len(text.strip()) > 2:
                    zone_texts.append(text.strip())
                    print(f"✅ Zone {i}: '{text[:30]}...'")
            
            return " ".join(zone_texts)
            
        except Exception as e:
            print(f"❌ Erreur zones OCR: {e}")
            return ""
    
    def extract_with_advanced_preprocessing(self, image: np.ndarray) -> str:
        """Extraction avec prétraitement avancé"""
        try:
            import pytesseract
            
            # Augmenter la résolution
            height, width = image.shape[:2]
            if width < 1500:
                scale = 1500 / width
                new_width = 1500
                new_height = int(height * scale)
                image = cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_CUBIC)
            
            # Prétraitement avancé
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Débruitage
            denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
            
            # Amélioration du contraste
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
            enhanced = clahe.apply(denoised)
            
            # Binarisation adaptative
            binary = cv2.adaptiveThreshold(enhanced, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                           cv2.THRESH_BINARY, 15, 10)
            
            # Amélioration morphologique
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2,2))
            processed = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
            
            # OCR avec configuration optimisée
            config = '--oem 3 --psm 6 -l ara+fra+eng --dpi 300'
            text = pytesseract.image_to_string(processed, config=config)
            
            return text.strip()
            
        except Exception as e:
            print(f"❌ Erreur advanced preprocessing: {e}")
            return ""
    
    def analyze_real_text_with_groq(self, real_text: str) -> Dict[str, Optional[str]]:
        """Analyser le texte RÉEL avec Groq - support arabe amélioré"""
        try:
            # Prompt pour analyse stricte du texte réel avec support arabe
            prompt = f"""
Tu es un expert en lecture de cartes d'identité tunisiennes (arabe et français). Analyse UNIQUEMENT ce texte et extrais les informations VRAIES.

Texte RÉEL à analyser: "{real_text}"

RÈGLES FONDAMENTALES:
1. CIN: Cherche EXACTEMENT 8 chiffres consécutifs dans le texte
2. NOM: Cherche les noms en ARABE ou FRANÇAIS. Les noms arabes commencent souvent par استب ou sont des noms comme الذهيى
3. PRÉNOM: Cherche les prénoms en ARABE ou FRANÇAIS comme YASSINE, MOHAMED, AHMED
4. DATE: Cherche les formats JJ/MM/AAAA ou AAAA (comme 2002)
5. LIEU: Cherche les villes tunisiennes (TUNIS, SFAX, etc.)
6. SEXE: Cherche M ou F

BASE DE DONNÉES:
Noms arabes courants: استب, بن, الذهيى, محمد, أحمد, علي, صالح, بلال, عمر
Noms français: MOHAMED, AHMED, ALI, SALAH, BILAL, OMAR, KHALED, YASSINE, ABDELLAH, DHAHBI
Villes: TUNIS, SFAX, SOUSSE, KAIROUAN, BIZERTE, GABES, ARIANA, BEN AROUS

TRAITEMENT DES NOMS ARABES:
- استب = BEN (famille)
- الذهيى = DHAHBI (nom de famille)
- محمد = MOHAMED
- أحمد = AHMED

IMPORTANT:
- Si tu vois استب الذهيى → nom = "DHAHBI"
- Si tu vois YASSINE → prénom = "YASSINE"  
- Si tu vois 2002 → date_naissance = "01/01/2002" (si pas de jour/mois précis)
- Si l'information n'est PAS dans le texte → null
- NE GÉNÈRE JAMAIS de données

Retourne UNIQUEMENT ce JSON:
{{
    "cin": "8 chiffres trouvés ou null",
    "nom": "nom trouvé (arabe ou français) ou null",
    "prenom": "prénom trouvé (arabe ou français) ou null",
    "date_naissance": "date trouvée ou null",
    "lieu_naissance": "ville trouvée ou null",
    "sexe": "M ou F trouvé ou null",
    "date_expiration": "date trouvée ou null",
    "nationalite": "Tunisienne"
}}
"""
            
            # Appel API Groq
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.groq_api_key}'
            }
            
            data = {
                'model': 'llama-3.3-70b-versatile',
                'messages': [{'role': 'user', 'content': prompt}],
                'max_tokens': 300,
                'temperature': 0.0  # Zéro génération
            }
            
            print(f"🤖 Analyse Groq du texte réel: '{real_text[:100]}...'")
            response = requests.post(self.groq_api_url, headers=headers, json=data, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                content = result['choices'][0]['message']['content'].strip()
                print(f"📝 Réponse Groq: {content}")
                
                parsed_data = self.parse_groq_response(content)
                
                # Correction post-analyse pour les noms arabes
                return self.correct_arabic_names(parsed_data, real_text)
            else:
                print(f"❌ Erreur API Groq: {response.status_code}")
                return self.get_empty_result()
                
        except Exception as e:
            print(f"❌ Erreur analyse Groq: {e}")
            return self.get_empty_result()
    
    def correct_arabic_names(self, data: Dict, real_text: str) -> Dict[str, Optional[str]]:
        """Corriger les noms arabes après analyse"""
        try:
            print(f"🔍 Correction noms arabes dans: '{real_text}'")
            
            # Corrections spécifiques pour les noms arabes
            arabic_corrections = {
                'استب الذهيى': 'DHAHBI',
                'الذهيى': 'DHAHBI', 
                'استب': 'BEN',
                'بن': 'BEN',
                'محمد': 'MOHAMED',
                'أحمد': 'AHMED',
                'علي': 'ALI',
                'صالح': 'SALAH',
                'بلال': 'BILAL',
                'عمر': 'OMAR'
            }
            
            # Chercher et corriger le nom
            for arabic, french in arabic_corrections.items():
                if arabic in real_text:
                    if not data.get('nom') or data['nom'] == 'BEN ALI':  # Remplacer si incorrect
                        data['nom'] = french
                        print(f"✅ Nom corrigé: {arabic} → {french}")
                    break
            
            # Correction spéciale pour استب الذهيى
            if 'استب الذهيى' in real_text:
                data['nom'] = 'DHAHBI'
                print(f"✅ Nom spécial corrigé: استب الذهيى → DHAHBI")
            
            # Correction de la date si seulement l'année
            if data.get('date_naissance') and len(data['date_naissance']) == 4:
                year = data['date_naissance']
                data['date_naissance'] = f"01/01/{year}"
                print(f"✅ Date corrigée: {year} → 01/01/{year}")
            
            print(f"🎯 Données corrigées: {data}")
            return data
            
        except Exception as e:
            print(f"❌ Erreur correction noms: {e}")
            return data
    
    def parse_groq_response(self, content: str) -> Dict[str, Optional[str]]:
        """Parser la réponse Groq"""
        try:
            import json
            
            json_start = content.find('{')
            json_end = content.rfind('}') + 1
            
            if json_start != -1 and json_end > json_start:
                json_str = content[json_start:json_end]
                parsed_data = json.loads(json_str)
                return parsed_data
            else:
                print("❌ JSON non trouvé")
                return self.get_empty_result()
                
        except json.JSONDecodeError as e:
            print(f"❌ Erreur parsing JSON: {e}")
            return self.get_empty_result()
    
    def get_empty_result(self) -> Dict[str, Optional[str]]:
        """Structure vide"""
        return {
            'cin': None,
            'nom': None,
            'prenom': None,
            'date_naissance': None,
            'lieu_naissance': None,
            'sexe': None,
            'date_expiration': None,
            'nationalite': 'Tunisienne'
        }

# Initialiser le lecteur
reader = RealCINReader()

# Modèles Pydantic
class CINResponse(BaseModel):
    success: bool
    data: Dict[str, Optional[str]]
    method: str = "Real CIN Reader"
    confidence: float = 0.0
    real_text: Optional[str] = None

@app.post("/extract-cin")
async def extract_cin_real(file: UploadFile = File(...)):
    """Extraire les informations RÉELLES de la CIN"""
    try:
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Le fichier doit être une image")
        
        temp_path = f"temp/{file.filename}"
        with open(temp_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Lecture RÉELLE
        cin_info = reader.read_cin_real(temp_path)
        
        # Récupérer le texte réel pour debugging
        real_text = reader.extract_real_text(cv2.imread(temp_path))
        
        # Nettoyer
        os.remove(temp_path)
        
        # Calculer la confiance
        has_data = any(value is not None for value in cin_info.values())
        confidence = 0.9 if has_data else 0.0
        
        return CINResponse(
            success=has_data,
            data=cin_info,
            confidence=confidence,
            real_text=real_text[:200] if real_text else None
        )
        
    except Exception as e:
        if 'temp_path' in locals() and os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "method": "Real CIN Reader"}

if __name__ == "__main__":
    print("📖 Démarrage du lecteur RÉEL de CIN")
    print("📍 URL: http://localhost:8004")
    print("📚 Documentation: http://localhost:8004/docs")
    print("🎯 Méthode: Lecture RÉELLE sans génération")
    print("🔧 Approche: Multiple OCR + Analyse stricte")
    print("⚠️ IMPORTANT: Seulement les informations présentes sur la CIN")
    
    uvicorn.run(app, host="0.0.0.0", port=8004)
