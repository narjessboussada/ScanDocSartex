# ScanDoc - Système de Scan et d'Extraction Intelligente

Projet de stage développé chez **Sartex Group** (Tunisie) - EPI Digital School 2026

## 📌 Description
Application multiplateforme pour automatiser l'extraction des données des factures fournisseurs en utilisant l'OCR et l'IA locale.

## 🛠️ Technologies
- **Backend** : Node.js, Express, SQL Server
- **Frontend Web** : Angular 17
- **Mobile** : Android (Java)
- **IA/OCR** : Tesseract.js, n8n, Ollama (phi3)

## ✨ Fonctionnalités
- Authentification JWT
- Scan et upload de documents (Web/Mobile)
- Extraction OCR + analyse IA
- Validation et correction des données
- Export Excel

##  Installation
```bash
# Backend
cd backend && npm install && npm start

# Frontend
cd frontend-web && npm install && ng serve

# Mobile
Ouvrir dans Android Studio et build
