#!/usr/bin/env python3
"""
Script de démarrage pour le service OCR avec Groq
Extraction intelligente des CIN tunisiennes avec Llama 3.3
"""

import sys
import os

def check_requirements():
    """Vérifier les dépendances"""
    print("🤖 SmartTax OCR Service (Groq Enhanced)")
    print("=" * 60)
    
    # Vérifier les bibliothèques requises
    required_modules = [
        ('fastapi', 'FastAPI'),
        ('uvicorn', 'Uvicorn'),
        ('requests', 'Requests'),
        ('cv2', 'OpenCV'),
        ('numpy', 'NumPy'),
        ('pydantic', 'Pydantic')
    ]
    
    missing_modules = []
    
    for module_name, display_name in required_modules:
        try:
            __import__(module_name)
            print(f"✅ {display_name} détecté")
        except ImportError:
            print(f"❌ {display_name} manquant")
            missing_modules.append(module_name)
    
    if missing_modules:
        print(f"\n⚠️  Modules manquants: {', '.join(missing_modules)}")
        print("💡 Installation: pip install -r requirements_groq.txt")
        return False
    
    return True

def check_groq_api():
    """Vérifier la clé API Groq"""
    api_key = ""
    
    if api_key:
        print(f"✅ Clé API Groq configurée: {api_key[:10]}...")
        return True
    else:
        print(f"❌ Clé API Groq non configurée")
        print("\n📋 CONFIGURATION GROQ:")
        print("1. Créez un compte sur https://groq.com/")
        print("2. Obtenez votre clé API")
        print("3. Mettez à jour la clé dans groq_enhanced_ocr.py")
        return False

def main():
    """Fonction principale"""
    print("🚀 Démarrage du service OCR avec Groq")
    
    # Vérifier les dépendances
    if not check_requirements():
        print("\n❌ Veuillez installer les dépendances manquantes")
        sys.exit(1)
    
    # Vérifier la clé API
    if not check_groq_api():
        print("\n❌ Veuillez configurer la clé API Groq")
        sys.exit(1)
    
    print(f"\n📍 URL: http://localhost:8002")
    print(f"📚 Documentation: http://localhost:8002/docs")
    print(f"🏥 Health check: http://localhost:8002/health")
    print(f"🤖 Moteur OCR: Groq + Llama 3.3 70B")
    print(f"🎯 Spécialisation: CIN tunisiennes")
    print(f"🧠 Intelligence: Interprétation IA")
    print(f"⚡ Performance: Extraction précise")
    
    print(f"\n⚡ Service en cours de démarrage...")
    print(f"   (Ctrl+C pour arrêter)")
    print("=" * 60)
    
    # Importer et démarrer l'application
    try:
        from groq_enhanced_ocr import app
        import uvicorn
        
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=8002,
            log_level="info"
        )
    except ImportError as e:
        print(f"❌ Erreur d'importation: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n👋 Service arrêté par l'utilisateur")
    except Exception as e:
        print(f"❌ Erreur de démarrage: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
