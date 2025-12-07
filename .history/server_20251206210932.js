import express from "express";
import cors from "cors";
import { Resend } from "resend";
import dotenv from "dotenv";
import multer from "multer"; // ✅ 1. Import de Multer pour gérer les fichiers
import bcrypt from "bcrypt"; // ✅ 2. Import de Bcrypt pour hacher les mots de passe

dotenv.config();

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json()); // Gardé pour la route /send-email et les routes admin avec JSON

// 👇 vérifie que la clé est bien lue
console.log("🔑 Clé Resend chargée :", process.env.RESEND_API_KEY ? "✅ OK" : "❌ Manquante");

const resend = new Resend(process.env.RESEND_API_KEY);

// ----------------------------------------------------------------------
// 🚨 CONFIGURATION MULTER & SIMULATION DE BASE DE DONNÉES
// ----------------------------------------------------------------------
// Multer : Stockage en mémoire (pour cet exemple)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // Limite à 5MB
});

// SIMULATION DB : En production, vous utiliseriez une vraie base de données (Postgres, Mongo, etc.)
const professionalRequests = []; 
const saltRounds = 10;
// ----------------------------------------------------------------------


// --- ROUTE EXISTANTE : ENVOI D'EMAIL DE CONTACT ---
app.post("/send-email", async (req, res) => {
  const { name, email, message } = req.body;
  // ... (votre logique d'envoi d'email de contact existante) ...
});

// --- NOUVELLE ROUTE : INSCRIPTION PRO ---
app.post("/inscription", upload.single("pieceJointe"), async (req, res) => {
  // req.file contient le fichier. req.body contient les champs de texte.
  const { nomSociete, email, siret, password } = req.body;
  const pieceJointe = req.file; 

  if (!email || !password || !siret || !pieceJointe) {
    return res.status(400).json({ message: "Veuillez fournir toutes les informations." });
  }

  try {
    // 1. Hachage du mot de passe (essentiel pour la sécurité)
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 2. Création de l'objet de demande (Sauvegarde simulée)
    const newRequest = {
      id: Date.now(),
      nomSociete,
      email,
      siret,
      passwordHash: hashedPassword,
      documentName: pieceJointe.originalname,
      documentBuffer: pieceJointe.buffer, // A REMPLACER par une URL de stockage sécurisée (S3, Cloudinary)
      statut: "EN_ATTENTE", // Statut initial
      dateSoumission: new Date(),
    };
    professionalRequests.push(newRequest); // Sauvegarde simulée

    console.log(`Nouvelle demande reçue de ${nomSociete}. ID: ${newRequest.id}`);
    
    // 3. Email de notification à l'administrateur
    await resend.emails.send({
      from: "notifications@tondomaine.com", 
      to: "atelierdesarts.12@gmail.com", // 📧 Votre adresse d'admin
      subject: `[ACTION REQUISE] Nouvelle inscription Pro - ${nomSociete}`,
      html: `
        <p>Une nouvelle demande d'inscription professionnelle nécessite votre validation manuelle.</p>
        <p><strong>Société :</strong> ${nomSociete}</p>
        <p><strong>Email :</strong> ${email}</p>
        <p><strong>SIRET :</strong> ${siret}</p>
        <p>Veuillez vérifier le compte ID: ${newRequest.id}.</p>
      `,
    });

    res.status(202).json({ 
        success: true, 
        message: "Demande reçue. Nous vous enverrons un email après vérification manuelle." 
    });

  } catch (error) {
    console.error("❌ Erreur lors de l'inscription :", error);
    res.status(500).json({ success: false, message: "Erreur serveur interne." });
  }
});


// ----------------------------------------------------------------------
// ⚡️ ENDPOINTS D'ADMINISTRATION POUR LA VALIDATION MANUELLE (POST-SOUMISSION)
// ----------------------------------------------------------------------

// Route de validation
// Un appel depuis votre interface admin vers cette route changera le statut et enverra l'email à l'utilisateur.
app.post("/admin/validate/:id", async (req, res) => {
    const { id } = req.params;
    const requestIndex = professionalRequests.findIndex(r => r.id === parseInt(id));

    if (requestIndex === -1) {
        return res.status(404).json({ message: "Demande non trouvée." });
    }

    const utilisateur = professionalRequests[requestIndex];
    utilisateur.statut = "ACTIF"; 
    
    // Envoi de l'email de validation à l'utilisateur
    try {
        await resend.emails.send({
            from: "contact@tondomaine.com", 
            to: utilisateur.email,
            subject: `✅ Votre compte professionnel est activé !`,
            html: `
                <p>Bonjour ${utilisateur.nomSociete},</p>
                <p>Nous vous confirmons que votre compte professionnel a été validé. Vous pouvez dès à présent vous connecter : <a href="VOTRE_URL_FRONTEND/espace-pro">Se connecter</a></p>
            `,
        });

        res.status(200).json({ success: true, message: "Compte validé et email envoyé à l'utilisateur." });
    } catch (error) {
        console.error("❌ Erreur lors de l'envoi de l'email de validation:", error);
        res.status(500).json({ success: false, message: "Erreur lors de l'envoi de l'email." });
    }
});

// Route de rejet
app.post("/admin/reject/:id", express.json(), async (req, res) => {
    const { id } = req.params;
    const { raison } = req.body; // L'admin fournit une raison via JSON
    // ... (Logique de rejet similaire à la validation) ...
});


const PORT = 3001;
app.listen(PORT, () => console.log(`🚀 Serveur sur http://localhost:${PORT}`));