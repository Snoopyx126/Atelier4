import express from "express";
import cors from "cors";
import { Resend } from "resend";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs"; // Pour lire et supprimer le fichier
import path from "path"; // Pour gérer les chemins

dotenv.config();

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

// --- Configuration Multer pour le stockage local (diskStorage) ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Crée le dossier 'uploads' à la racine si nécessaire
    const uploadDir = path.join(process.cwd(), 'uploads'); 
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir); 
  },
  filename: (req, file, cb) => {
    // Nom du fichier: date-nom_original.ext
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // Limite à 5MB
});

console.log("🔑 Clé Resend chargée :", process.env.RESEND_API_KEY ? "✅ OK" : "❌ Manquante");

const resend = new Resend(process.env.RESEND_API_KEY);

// ----------------------------------------------------------------
// 1. Point de terminaison pour l'Inscription (avec fichier : /inscription)
// ----------------------------------------------------------------
app.post("/inscription", upload.single('pieceJointe'), async (req, res) => {
    const { nomSociete, email, siret, password } = req.body;
    const uploadedFile = req.file; 

    // Validation du serveur (si la validation client a échoué)
    if (!nomSociete || !email || !siret || !password || !uploadedFile) {
        if (uploadedFile) fs.unlinkSync(uploadedFile.path); // Nettoyage
        return res.status(400).json({ success: false, message: "Tous les champs et le fichier sont obligatoires." });
    }

    try {
        // Lecture du fichier pour l'attacher à l'email Resend
        const fileContent = fs.readFileSync(uploadedFile.path); 
        
        const data = await resend.emails.send({
            from: "onboarding@resend.dev", 
            to: "atelierdesarts.12@gmail.com", 
            subject: `Nouvelle demande d'inscription pro : ${nomSociete} (${siret})`,
            html: `
                <p><strong>Société :</strong> ${nomSociete}</p>
                <p><strong>Email :</strong> ${email}</p>
                <p><strong>SIRET :</strong> ${siret}</p>
                <p>Une pièce jointe (${uploadedFile.originalname}) est attachée à cet email.</p>
                <p>Le mot de passe (non envoyé pour sécurité) était : ${password}</p>
            `,
            attachments: [
                {
                    filename: uploadedFile.originalname,
                    content: fileContent,
                },
            ],
        });

        // Suppression du fichier temporaire après l'envoi réussi de l'email
        fs.unlinkSync(uploadedFile.path); 

        console.log("✅ Demande d'inscription envoyée :", data);
        res.status(200).json({ success: true, message: "Demande envoyée." });
    } catch (error) {
        console.error("❌ Erreur lors de l'inscription :", error);
        if (uploadedFile) fs.unlinkSync(uploadedFile.path); // Nettoyage en cas d'erreur
        res.status(500).json({ success: false, message: "Erreur serveur lors de l'envoi de la demande." });
    }
});


// ----------------------------------------------------------------
// 2. Point de terminaison pour le Contact simple (existant : /send-email)
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


const PORT = 3001;
app.listen(PORT, () => console.log(`🚀 Serveur sur http://localhost:${PORT}`));