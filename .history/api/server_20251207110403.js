// api/index.js (Code final pour la production)

const express = require("express");
const cors = require("cors");
const { Resend } = require("resend");
const dotenv = require("dotenv");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const bcrypt = require('bcrypt');
const os = require("os");
const mongoose = require("mongoose");

dotenv.config();
const app = express();

// --- CONFIGURATION CORS ---
app.use(cors({
  // Ajoutez ici toutes les URLs qui ont le droit de se connecter
  origin: [
    "https://atelier4.vercel.app", 
    "http://localhost:5173", 
    "http://localhost:3000"
  ],
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"]
}));

app.use(express.json());

// --- CONNEXION MONGODB (La mémoire permanente du site) ---
const connectDB = async () => {
  // Si on est déjà connecté, on ne refait pas la connexion
  if (mongoose.connection.readyState >= 1) return;
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connecté à MongoDB");
  } catch (error) {
    console.error("❌ Erreur de connexion MongoDB:", error);
  }
};

// --- DÉFINITION DU MODÈLE UTILISATEUR ---
// C'est le plan qui définit à quoi ressemble un utilisateur dans la base de données
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  nomSociete: { type: String, required: true },
  siret: { type: String, required: true },
  isVerified: { type: Boolean, default: false }, // Par défaut, le compte n'est pas validé
  createdAt: { type: Date, default: Date.now }
});

// Cette ligne évite de créer le modèle deux fois si le serveur redémarre
const User = mongoose.models.User || mongoose.model("User", userSchema);


// --- CONFIGURATION DE L'UPLOAD TEMPORAIRE ---
// On utilise /tmp juste pour stocker le fichier le temps de l'envoyer par mail
const upload = multer({ 
    dest: os.tmpdir(), 
    limits: { fileSize: 4 * 1024 * 1024 } // 4MB max
});

const resend = new Resend(process.env.RESEND_API_KEY);
const SALT_ROUNDS = 10;


// ============================================================
// ROUTE 1 : INSCRIPTION
// ============================================================
app.post("/api/inscription", upload.single('pieceJointe'), async (req, res) => {
    // 1. Connexion à la base de données
    await connectDB();
    
    const { nomSociete, email, siret, password } = req.body;
    const uploadedFile = req.file;

    if (!nomSociete || !email || !siret || !password) {
        return res.status(400).json({ success: false, message: "Champs manquants" });
    }

    try {
        // 2. Vérifier si l'email existe déjà dans MongoDB
        const existingUser = await User.findOne({ email });
        if (existingUser) {
             // Nettoyage du fichier si erreur
             if (uploadedFile && fs.existsSync(uploadedFile.path)) fs.unlinkSync(uploadedFile.path);
             return res.status(409).json({ success: false, message: "Cet email est déjà enregistré." });
        }

        // 3. Hasher (protéger) le mot de passe
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // 4. Créer l'utilisateur dans MongoDB
        const newUser = await User.create({
            email,
            password: hashedPassword,
            nomSociete,
            siret,
            isVerified: false // Il sera false tant que vous ne l'avez pas validé manuellement dans MongoDB
        });

        // 5. Envoyer l'email avec la pièce jointe
        let attachments = [];
        if (uploadedFile && fs.existsSync(uploadedFile.path)) {
            const fileContent = fs.readFileSync(uploadedFile.path);
            attachments.push({ 
                filename: uploadedFile.originalname, 
                content: fileContent 
            });
        }

        await resend.emails.send({
            from: "onboarding@resend.dev",
            to: "atelierdesarts.12@gmail.com",
            subject: `Nouvelle Inscription (À VALIDER) : ${nomSociete}`,
            html: `
                <h1>Nouvelle demande d'inscription</h1>
                <p><strong>Société:</strong> ${nomSociete}</p>
                <p><strong>SIRET:</strong> ${siret}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p>⚠️ Vérifiez la pièce jointe. Si tout est OK, passez "isVerified" à TRUE dans MongoDB Atlas.</p>
            `,
            attachments: attachments
        });

        // 6. Nettoyage du fichier temporaire
        if (uploadedFile && fs.existsSync(uploadedFile.path)) {
            fs.unlinkSync(uploadedFile.path);
        }

        res.status(200).json({ success: true, message: "Inscription réussie. Compte en attente de validation." });

    } catch (error) {
        console.error("Erreur Inscription:", error);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
});


// ============================================================
// ROUTE 2 : CONNEXION (LOGIN)
// ============================================================
app.post("/api/login", async (req, res) => {
    await connectDB();

    const { email, password } = req.body;
    
    try {
        // 1. Chercher l'utilisateur dans MongoDB
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({ success: false, message: "Email ou mot de passe incorrect." });
        }

        // 2. Vérifier le mot de passe
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ success: false, message: "Email ou mot de passe incorrect." });
        }

        // 3. (OPTIONNEL) Vérifier si le compte est validé
        // Si vous voulez bloquer l'accès tant que vous n'avez pas vérifié le Kbis, décommentez ces lignes :
        /*
        if (!user.isVerified) {
             return res.status(403).json({ success: false, message: "Votre compte est en cours de validation par nos équipes." });
        }
        */

        // 4. Succès ! On renvoie les infos
        res.json({ 
            success: true, 
            user: { 
                email: user.email, 
                nomSociete: user.nomSociete, 
                siret: user.siret 
            } 
        });
    } catch (error) {
        console.error("Erreur Login:", error);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
});

// Export pour Vercel
module.exports = app;