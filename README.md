# BelgoData 🇧🇪

BelgoData est un outil d'intelligence commerciale et de prospection automatisée de niche pour le marché belge. Grâce à une architecture orientée agents IA, l'application permet de rechercher, scraper et qualifier instantanément des prospects ciblés par secteur et par code postal, tout en générant des bilans de santé digitaux complets et des argumentaires de vente personnalisés.

---

## 🚀 Fonctionnalités Clés

- **Agent IA Conversationnel :** Interface de chat dynamique (style ChatGPT/Claude) avec historique persistant en local et suggestions d'actions contextuelles.
- **Orchestration Agentique (LangGraph) :** Gestion robuste des intentions de l'utilisateur structurée en 3 piliers validés :
  - `scrape` : Extraction de données géolocalisées en temps réel.
  - `list` : Structuration et affichage des entreprises trouvées.
  - `clarify` : Relance intelligente pour affiner les critères de recherche.
- **Qualification Augmentée :** Extraction automatique pour chaque prospect d'un score de maturité digitale, d'une analyse de présence en ligne, de ses points forts, de ses axes d'amélioration et d'un script d'approche commercial sur-mesure.
- **UI/UX Moderne & Fluide :** Interface développée avec soin offrant un panneau latéral de diagnostic rétractable, un défilement optimisé sans frictions et un écran d'accueil immersif lors du premier lancement.

---

## 🛠 Stack Technique

### Frontend
- **Framework :** Next.js (App Router)
- **Langage :** TypeScript
- **Styles :** Tailwind CSS
- **Icônes :** Lucide React
- **Client HTTP :** Axios

### Backend & IA
- **Orchestration IA :** LangGraph
- **Modèle de Langage (LLM) :** Groq (Inférence ultra-rapide)
- **Collecte de données :** Scripts de scraping intégrés (OpenStreetMap / Registres publics)

---

## 📦 Installation et Démarrage en Local

### Prérequis
Assurez-vous d'avoir installé **Node.js** (v18+) et **Docker** sur votre machine.

### 1. Cloner le projet
```bash
git clone [https://github.com/mouhamed-bouzidi/BelgoData.git](https://github.com/mouhamed-bouzidi/BelgoData.git)
cd BelgoData
###  3. Lancer le Backend
Bash
# Depuis le dossier backend (ou via docker-compose selon votre structure)
docker compose up --build
4. Lancer le Frontend
Bash
# Depuis le dossier frontend
npm install
npm run dev
L'application sera accessible sur http://localhost:3000.

 L'ensemble de l'architecture est containerisé via Docker, ce qui permet un déploiement instantané sur n'importe quel serveur cloud ou infrastructure d'entreprise en configurant simplement les variables d'environnement de production.

📝 Structure du Code Frontend
Plaintext
├── app/
│   ├── page.tsx          # Page d'accueil principale (Interface de l'Agent IA)
│   ├── layout.tsx        # Layout global de l'application
│   └── components/
│       └── Sidebar.tsx   # Barre de navigation latérale et profil utilisateur
├── public/               # Logos et assets statiques
└── package.json          # Dépendances et scripts de build
👥 Auteur
Mohamed Bouzidi - Développeur Full-Stack & Ingénieur IA stagiaire