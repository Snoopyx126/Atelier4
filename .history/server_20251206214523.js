import express from "express";
import cors from "cors";
import { Resend } from "resend";
import dotenv from "dotenv";
import multer from "multer"; // ✅ Import de Multer
import fs from "fs"; // ✅ Import pour lire le fichier après upload

dotenv.config();

const app = express();
app.use(cors({ origin: "*" }));
// L'express.json() est pour les requêtes sans fichier. Pour les inscriptions (avec fichier), Multer s'en charge.
app.use(express.json()); 

// --- Configuration Multer pour les Fichiers (Inscriptions) ---
// Crée un dossier 'uploads' à la racine de votre projet si ce n'est pas déjà fait.
const upload = multer({ 
    dest: 'uploads/', // Les fichiers seront stockés temporairement ici
    limits: { fileSize: 5 * 1024 * 1024 } // Limite la taille des fichiers à 5MB
});

// 👇 vérifie que la clé est bien lue
console.log("🔑 Clé Resend chargée :", process.env.RESEND_API_KEY ? "✅ OK" : "❌ Manquante");

const resend = new Resend(process.env.RESEND_API_KEY);

// --- 1. Point de terminaison pour l'Inscription (avec fichier) ---
app.post("/inscription", upload.single('pieceJointe'), async (req, res) => {
    // Les données texte sont dans req.body
    const { nomSociete, email, siret, password } = req.body;
    // Le fichier est dans req.file
    const uploadedFile = req.file; 

    // Validation simple
    if (!nomSociete || !email || !siret || !password || !uploadedFile) {
        // Si la validation échoue, supprimer le fichier uploadé temporairement
        if (uploadedFile) fs.unlinkSync(uploadedFile.path); 
        return res.status(400).json({ success: false, message: "Tous les champs et le fichier sont obligatoires." });
    }

    try {
        // Lecture du fichier pour l'attacher à l'email Resend
        const fileContent = fs.readFileSync(uploadedFile.path); 
        
        const data = await resend.emails.send({
            from: "onboarding@resend.dev", 
            to: "atelierdesarts.12@gmail.com", // <-- Votre adresse
            subject: `Nouvelle demande d'inscription pro : ${nomSociete} (${siret})`,
            html: `
                <p><strong>Société :</strong> ${nomSociete}</p>
                <p><strong>Email :</strong> ${email}</p>
                <p><strong>SIRET :</strong> ${siret}</p>
                <p>Une pièce jointe (Carte d'identité/Kbis) est attachée.</p>
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
        // Assurez-vous de supprimer le fichier en cas d'erreur Resend aussi
        if (uploadedFile) fs.unlinkSync(uploadedFile.path);
        res.status(500).json({ success: false, message: "Erreur serveur lors de l'envoi de la demande." });
    }
});


// --- 2. Point de terminaison pour le Contact simple (existant) ---
app.post("/send-email", async (req, res) => {
  const { name, email, message } = req.body;
  // ... (le code existant pour send-email reste ici) ...
  try {
    const data = await resend.emails.send({
      from: "onboarding@resend.dev", // ou ton domaine validé (ex: contact@tondomaine.com)
      to: "atelierdesarts.12@gmail.com", // <-- ton adresse pour recevoir les messages
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