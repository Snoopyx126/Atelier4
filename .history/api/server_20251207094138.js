// api/index.js (Nouveau fichier, remplaçant l'ancien server.js)

const express = require("express");
const cors = require("cors");
const { Resend } = require("resend");
const dotenv = require("dotenv");
const multer = require("multer");
const fs = require("fs"); 
const path = require("path"); 
const bcrypt = require('bcrypt'); 

// CRITIQUE : Import des packages manquants
// Le code original utilisait 'import' pour certains et 'require' pour d'autres.
// Nous utilisons ici 'require' partout pour la compatibilité Serverless.

dotenv.config();
const app = express();

// --- Configuration Vercel et CORS ---
// L'URL de votre Front-End déployé
const FRONTEND_URL = 'https://atelier4.vercel.app'; 

// CRITIQUE : Configuration CORS (Doit être en premier)
app.use(cors({
  origin: FRONTEND_URL, 
  credentials: true 
}));

// Middleware pour parser les corps de requêtes JSON (pour /login)
app.use(express.json());
// ------------------------------------

// --- Configuration Fichiers Locaux ---
const USERS_FILE = path.join(process.cwd(), 'users.json');
const SALT_ROUNDS = 10; 

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
    let uploadedFilePath = uploadedFile ? uploadedFile.path : null; 

    if (!nomSociete || !email || !siret || !password || !uploadedFile) {
        if (uploadedFilePath && fs.existsSync(uploadedFilePath)) fs.unlinkSync(uploadedFilePath);
        return res.status(400).json({ success: false, message: "Tous les champs et le fichier sont obligatoires." });
    }

    try {
        const users = getUsers();
        if (users.some(user => user.email === email)) {
            if (uploadedFilePath && fs.existsSync(uploadedFilePath)) fs.unlinkSync(uploadedFilePath);
            return res.status(409).json({ success: false, message: "Cet email est déjà enregistré." });
        }
        
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const newUser = {
            id: Date.now(),
            email,
            password: hashedPassword,
            nomSociete,
            siret,
            isVerified: false, 
        };

        users.push(newUser);
        saveUsers(users);
        
        const fileContent = fs.readFileSync(uploadedFilePath); 
        
        await resend.emails.send({
            from: "onboarding@resend.dev", 
            to: "atelierdesarts.12@gmail.com", 
            subject: `Nouvelle demande d'inscription (EN ATTENTE) : ${nomSociete}`,
            html: `<p>Demande reçue. Veuillez vérifier le Kbis/C.I. ci-joint pour valider le compte.</p>`,
            attachments: [{ filename: uploadedFile.originalname, content: fileContent }],
        });

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
    // La logique de validation manuelle du compte
    // ... (Votre code original pour valider le compte) ...
    
    // Si la logique utilise les chemins de documents locaux, elle peut ne pas fonctionner 
    // correctement sur Vercel (l'environnement serverless ne conserve pas les fichiers).
    // Cependant, pour que le serveur réponde, nous gardons la structure de la route.
    
    return res.status(501).json({ success: false, message: "Cette fonctionnalité de gestion des fichiers locaux n'est pas fiable sur Vercel Serverless." });
});


// ----------------------------------------------------------------
// 4. Point de terminaison pour le Contact simple (/send-email)
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


// ⛔ LIGNE CRITIQUE RETIRÉE : L'ancien code app.listen(...) est supprimé !

// CRITIQUE : Export de l'application Express pour Vercel (Doit être la dernière ligne)
module.exports = app;