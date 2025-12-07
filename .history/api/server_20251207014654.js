import express from "express";
import cors from "cors";
import { Resend } from "resend";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs"; 
import path from "path"; 
import bcrypt from 'bcrypt'; // ✅ Import de bcrypt pour hacher les mots de passe

dotenv.config();
const app = express();
app.use(express.json());

// --- Configuration Fichiers Locaux ---
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

// --- Configuration Multer (Stockage Local) ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads'); 
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
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

console.log("🔑 Clé Resend chargée :", process.env.RESEND_API_KEY ? "✅ OK" : "❌ Manquante");

const resend = new Resend(process.env.RESEND_API_KEY);

// ----------------------------------------------------------------
// 1. Point de terminaison pour l'Inscription (avec fichier : /inscription)
// ----------------------------------------------------------------
app.post("/inscription", upload.single('pieceJointe'), async (req, res) => {
    const { nomSociete, email, siret, password } = req.body;
    const uploadedFile = req.file; 
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
        
        // Hachage du mot de passe
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // Enregistrement de la demande en attente
        const newUser = {
            id: Date.now(),
            email,
            password: hashedPassword,
            nomSociete,
            siret,
            isVerified: false, // CLÉ CRITIQUE : Compte non validé
            documentPath: uploadedFilePath, // Stockage du chemin du fichier local
            documentName: uploadedFile.originalname,
        };

        users.push(newUser);
        saveUsers(users);
        
        // Envoi d'email avec pièce jointe (Kbis)
        const fileContent = fs.readFileSync(uploadedFilePath); 
        
        await resend.emails.send({
            from: "onboarding@resend.dev", 
            to: "atelierdesarts.12@gmail.com", 
            subject: `Nouvelle demande d'inscription (EN ATTENTE) : ${nomSociete}`,
            html: `<p>Demande reçue. Veuillez vérifier le Kbis/C.I. ci-joint pour valider le compte.</p>`,
            attachments: [{ filename: uploadedFile.originalname, content: fileContent }],
        });

        // Le fichier n'est PAS supprimé ici, il est conservé dans 'uploads' pour vérification.

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

    // Vérification du mot de passe haché
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
        return res.status(401).json({ success: false, message: "Identifiants invalides." });
    }

    // Vérification de l'état de validation du compte
    if (!user.isVerified) {
        return res.status(403).json({ success: false, message: "Compte en attente de validation par l'administrateur." });
    }

    res.status(200).json({ success: true, message: "Connexion réussie.", user: { email: user.email, nomSociete: user.nomSociete } });
});


// ----------------------------------------------------------------
// 3. Point de terminaison de Validation Manuelle du Compte (Admin)
// ----------------------------------------------------------------
// Permet de valider un compte après vérification manuelle du Kbis.
app.post("/validate-account", (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: "Email manquant." });
    }

    let users = getUsers();
    const userIndex = users.findIndex(user => user.email === email);

    if (userIndex === -1) {
        return res.status(404).json({ success: false, message: "Utilisateur non trouvé." });
    }

    if (users[userIndex].isVerified) {
        return res.status(200).json({ success: true, message: "Compte déjà vérifié." });
    }

    // Basculer l'état sur VÉRIFIÉ
    users[userIndex].isVerified = true;
    
    // Nettoyage : Supprimer le fichier Kbis local une fois que vous l'avez vérifié
    const documentPath = users[userIndex].documentPath;
    if (documentPath && fs.existsSync(documentPath)) {
        fs.unlinkSync(documentPath);
        users[userIndex].documentPath = null;
        users[userIndex].documentName = null;
    }

    saveUsers(users);

    res.status(200).json({ success: true, message: `Compte ${email} validé avec succès. Le document a été supprimé.` });
});


// ----------------------------------------------------------------
// 4. Point de terminaison pour le Contact simple (existant : /send-email)
// ----------------------------------------------------------------
app.post("/send-email", async (req, res) => {
  const { name, email, message } = req.body;
  // ... (le code de votre send-email actuel) ...
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

const FRONTEND_URL = 'https://atelier4.vercel.app'; 

app.use(cors({
  origin: FRONTEND_URL, 
  credentials: true // Si vous utilisez des cookies/sessions
}));

// Assurez-vous d'exporter l'application pour Vercel
module.exports = app;