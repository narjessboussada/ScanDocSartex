# ScanDoc — Système de scan et d'extraction intelligente de factures

ScanDoc est une application multiplateforme (**Web + Android**) qui automatise l'extraction des données des factures fournisseurs. Elle combine un **backend Node.js + Express**, une base **SQL Server**, une reconnaissance de texte (**OCR**) et une **IA locale** (n8n + Ollama) afin de structurer les données sans les envoyer vers un service externe.

> Projet de stage réalisé chez **Sartex Group** (Tunisie) — EPI Digital School 2026.

---

## Fonctionnalités

- Authentification sécurisée par **JWT**
- Scan et import de factures (image ou PDF) depuis le Web ou le mobile
- Extraction du texte par **OCR** puis structuration en JSON par l'**IA locale**
- Consultation, **correction et validation** manuelles des champs extraits
- Historique des documents traités et de leurs statuts
- **Export Excel** des informations générales et des lignes d'articles
- Rôles **Opérateur** et **Administrateur** (consultation de tous les scans)

L'IA propose, l'utilisateur vérifie et valide : le service IA ne remplace jamais la validation finale.

---

## Structure du dépôt

```
├── backend/                # API Node.js + Express
├── frontend/               # Application web Angular 17
└── README.md
```

| Chemin      | Rôle                                                        |
| ----------- | ----------------------------------------------------------- |
| `backend/`  | API REST, authentification, OCR, appel au pipeline IA, base |
| `frontend/` | Interface web (import, correction, historique, export)      |
| `mobile/`   | Client Android (prise de photo, import, consultation)       |

---

## Stack technique

### Backend (`backend/`)

- **Node.js + Express**
- **SQL Server** — persistance
- **JWT** — authentification, mots de passe hachés
- Architecture en couches : `Controller → DTO → Service → Repository → Entity`

### Frontend Web (`frontend/`)

- **Angular 17**

### Mobile

- **Android (Java)**

### IA et OCR

- **Tesseract.js** — reconnaissance de texte (OCR)
- **n8n** — orchestration du pipeline de traitement
- **Ollama (phi3)** — structuration du texte en données de facture, exécutée en local

---

## Architecture

```
Client Web / Android
        │  HTTP / JSON
        ▼
   API Express (Controller → Service → Repository)
        │
        ├── OCR (Tesseract.js) ──► texte brut
        │
        ├── n8n + Ollama (phi3) ──► données structurées (JSON)
        │
        └── SQL Server  (users, scans, extracted_data)
```

---

## Modèle de données

| Table            | Rôle                                                                 |
| ---------------- | -------------------------------------------------------------------- |
| `users`          | Comptes utilisateurs (email, mot de passe haché, nom, prénom)        |
| `scans`          | Documents importés (fichier, statut, texte OCR, date)                |
| `extracted_data` | Champs extraits (nom, valeur, valeur corrigée, état de validation)   |

Relations : un utilisateur possède plusieurs scans ; un scan possède plusieurs données extraites.

---

## Prérequis

- **Node.js** 18 ou supérieur et **npm**
- **Angular CLI** (`npm install -g @angular/cli`)
- **SQL Server** accessible (local ou distant)
- **n8n** et **Ollama** installés en local, avec le modèle `phi3` (`ollama pull phi3`)
- **Android Studio** pour le client mobile

---

## Installation et lancement

### Backend

```
cd backend
npm install
npm start
```

### Frontend web

```
cd frontend
npm install
ng serve
```

L'application web est alors disponible sur `http://localhost:4200`.

### Mobile

Ouvrir le dossier du projet Android dans **Android Studio**, puis lancer le build sur un émulateur ou un appareil.

---

## Configuration

Créer un fichier `.env` dans `backend/` (à adapter à votre configuration) :

```
PORT=3000
DB_SERVER=localhost
DB_NAME=scandoc
DB_USER=<utilisateur>
DB_PASSWORD=<mot_de_passe>
JWT_SECRET=<secret>
N8N_WEBHOOK_URL=<url_du_webhook_n8n>
```

Ne jamais versionner le fichier `.env` ni de secrets.

---

## Flux principal

1. L'utilisateur s'authentifie.
2. Il importe une facture (image ou PDF).
3. L'API lance l'OCR et envoie le texte au pipeline n8n / Ollama.
4. Les données structurées sont enregistrées avec le statut du scan.
5. L'utilisateur vérifie, corrige et valide les champs.
6. Il exporte le résultat au format Excel.

---

## Bonnes pratiques

- Garder les documents financiers et le traitement IA sur l'infrastructure locale.
- Protéger toutes les routes de l'API par authentification.
- En cas d'échec OCR ou IA, retourner un statut explicite plutôt qu'un résultat présenté comme complet.
- Ne pas versionner `node_modules/`, `.env` ni les builds.

---

## Licence

Projet de fin d'études — réalisé dans un cadre académique chez Sartex Group.
