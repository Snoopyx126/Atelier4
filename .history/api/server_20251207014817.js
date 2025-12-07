// api/index.js (Nouveau point d'entrée pour Vercel)

const express = require("express");
const cors = require("cors"); // Import de CORS
const { Resend } = require("resend");
const dotenv = require("dotenv");
const multer = require("multer");
const fs = require("fs"); 
const path = require("path"); 
const bcrypt = require('bcrypt'); 

dotenv.config();
const app = express(); // Initialisation d'Express

// --- Configuration Vercel et CORS ---
// L'URL de votre Front-End déployé
const FRONTEND_URL = 'https://atelier4.vercel.app'; 

// CRITIQUE : Configuration CORS (Doit être en premier avant les routes)
app.use(cors({
  origin: FRONTEND_URL, 
  credentials: true // Important si vous utilisez des cookies
}));

// Middleware essentiel pour parser les corps de requêtes JSON (login)
app.use(express.json());
// ------------------------------------

// --- Configuration Fichiers Locaux ---
// ATTENTION : Vercel est un environnement Serverless. 
// Les fichiers uploadés et users.json ne sont PAS persistants entre les requêtes.
// Pour un usage PROD, vous devriez utiliser une BDD externe (MongoDB, PostgreSQL) et un service de stockage de fichiers (S3, Cloudinary).
const USERS_FILE = path.join(process.cwd(), 'users.json');
const SALT_ROUNDS = 10; 

// --- Fonctions de Gestion de la "Base de Données" (users.json) ---
const getUsers = () => {
    if (!fs.existsSync(USERS_FILE)) {
        return [];
    }
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error("Erreur de lecture de users.json. Retour d'un tableau vide.", e);
        return [];
    }
};

const saveUsers = (users) => {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
};

// --- Configuration Multer (Stockage Local Temporaire) ---
const uploadDir = path.join(process.cwd(), 'uploads'); 

// Création du dossier 'uploads' au démarrage (nécessaire pour Vercel, mais le contenu est perdu)
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); 
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } 
});

const resend = new Resend(process.env.RESEND_API_KEY);

// ----------------------------------------------------------------
// 1. Point de terminaison pour l'Inscription (avec fichier : /inscription)
// ----------------------------------------------------------------
app.post("/inscription", upload.single('pieceJointe'), async (req, res) => {
    const { nomSociete, email, siret, password } = req.body;
    const uploadedFile = req.file; 
    // IMPORTANT : Sur Vercel, ce fichier sera PERDU après l'exécution de cette fonction.
    let uploadedFilePath = uploadedFile ? uploadedFile.path : null; 

    if (!nomSociete || !email || !siret || !password || !uploadedFile) {
        if (uploadedFilePath) fs.unlinkSync(uploadedFilePath);
        return res.status(400).json({ success: false, message: "Tous les champs et le fichier sont obligatoires." });
    }

    try {
        const users = getUsers();
        if (users.some(user => user.email === email)) {
            if (uploadedFilePath) fs.unlinkSync(uploadedFilePath);
            return res.status(409).json({ success: false, message: "Cet email est déjà enregistré." });
        }
        
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // Enregistrement de la demande en attente
        const newUser = {
            id: Date.now(),
            email,
            password: hashedPassword,
            nomSociete,
            siret,
            isVerified: false, 
            // documentPath et documentName ne sont plus pertinents en Serverless
        };

        users.push(newUser);
        saveUsers(users);
        
        // Envoi d'email avec pièce jointe (lecture du fichier temporaire)
        const fileContent = fs.readFileSync(uploadedFilePath); 
        
        await resend.emails.send({
            from: "onboarding@resend.dev", 
            to: "atelierdesarts.12@gmail.com", 
            subject: `Nouvelle demande d'inscription (EN ATTENTE) : ${nomSociete}`,
            html: `<p>Demande reçue. Veuillez vérifier le Kbis/C.I. ci-joint pour valider le compte.</p>`,
            attachments: [{ filename: uploadedFile.originalname, content: fileContent }],
        });

        // Nettoyage immédiat du fichier temporaire
        if (uploadedFilePath && fs.existsSync(uploadedFilePath)) fs.unlinkSync(uploadedFilePath);

        res.status(200).json({ success: true, message: "Demande enregistrée et email de notification envoyé." });
    } catch (error) {
        console.error("❌ Erreur lors de l'inscription/stockage :", error);
        if (uploadedFilePath && fs.existsSync(uploadedFilePath)) fs.unlinkSync(uploadedFilePath);
        res.status(500).json({ success: false, message: "Erreur serveur lors de l'envoi de la demande ou du stockage." });
    }
});

// ----------------------------------------------------------------
// 2. Point de terminaison de Connexion (/login)
// ----------------------------------------------------------------
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: "Email et mot de passe requis." });
    }

    const users = getUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
        return res.status(401).json({ success: false, message: "Identifiants invalides." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
        return res.status(401).json({ success: false, message: "Identifiants invalides." });
    }

    if (!user.isVerified) {
        return res.status(403).json({ success: false, message: "Compte en attente de validation par l'administrateur." });
    }

    res.status(200).json({ success: true, message: "Connexion réussie.", user: { email: user.email, nomSociete: user.nomSociete } });
});


// ----------------------------------------------------------------
// 3. Point de terminaison de Validation Manuelle du Compte (Admin)
// ----------------------------------------------------------------
app.post("/validate-account", (req, res) => {
    // Ce point d'accès n'est pas fonctionnel sur Vercel Serverless
    // car il s'appuie sur la présence locale du fichier Kbis/users.json
    return res.status(501).json({ success: false, message: "Cette fonctionnalité (gestion locale des fichiers) n'est pas supportée par Vercel." });
});


// ----------------------------------------------------------------
// 4. Point de terminaison pour le Contact simple (existant : /send-email)
// ----------------------------------------------------------------
app.post("/send-email", async (req, res) => {
  const { name, email, message } = req.body;
  
  try {
    const data = await resend.emails.send({
      from: "onboarding@resend.dev", 
      to: "atelierdesarts.12@gmail.com",
      subject: `Nouveau message de ${name}`,
      html: `
        <p><strong>Nom :</strong> ${name}</p>
        <p><strong>Email :</strong> ${email}</p>
        <p><strong>Message :</strong><br>${message}</p>
      `,
    });

    console.log("✅ Email envoyé :", data);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Erreur lors de l’envoi :", error);
    res.status(500).json({ success: false, error });
  }
});


// CRITIQUE : Export de l'application Express pour Vercel (Doit être la dernière ligne)
module.exports = app;