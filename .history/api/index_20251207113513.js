// api/index.js (Version corrigée : ESM + bcryptjs)

import express from 'express';
import cors from 'cors';
import { Resend } from 'resend';
import dotenv from 'dotenv';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs'; // Utilisation de la version JS pure
import os from 'os';
import mongoose from 'mongoose';

dotenv.config();
const app = express();

// --- CONFIGURATION CORS ---
app.use(cors({
  origin: [
    "https://atelier4.vercel.app", 
    "http://localhost:5173", 
    "http://localhost:3000"
  ],
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"]
}));

app.use(express.json());

// --- CONNEXION MONGODB ---
const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connecté à MongoDB");
  } catch (error) {
    console.error("❌ Erreur de connexion MongoDB:", error);
  }
};

// --- MODÈLE UTILISATEUR ---
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  nomSociete: { type: String, required: true },
  siret: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Évite l'erreur de recompilation du modèle
const User = mongoose.models.User || mongoose.model("User", userSchema);

// --- UPLOAD TEMPORAIRE ---
const upload = multer({ 
    dest: os.tmpdir(), 
    limits: { fileSize: 4 * 1024 * 1024 } 
});

const resend = new Resend(process.env.RESEND_API_KEY);
const SALT_ROUNDS = 10;

// --- ROUTE INSCRIPTION ---
app.post("/api/inscription", upload.single('pieceJointe'), async (req, res) => {
    await connectDB();
    
    const { nomSociete, email, siret, password } = req.body;
    const uploadedFile = req.file;

    if (!nomSociete || !email || !siret || !password) {
        return res.status(400).json({ success: false, message: "Champs manquants" });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
             // Nettoyage si erreur
             if (uploadedFile && fs.existsSync(uploadedFile.path)) fs.unlinkSync(uploadedFile.path);
             return res.status(409).json({ success: false, message: "Cet email est déjà enregistré." });
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        await User.create({
            email,
            password: hashedPassword,
            nomSociete,
            siret,
            isVerified: false
        });

        // Préparation email
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
            subject: `Nouvelle Inscription : ${nomSociete}`,
            html: `<p>Société: ${nomSociete}<br>SIRET: ${siret}<br>Email: ${email}</p>`,
            attachments: attachments
        });
        await resend.emails.send({
            from: "onboarding@resend.dev",
            to: email, // L'email du client récupéré du formulaire
            subject: "Bienvenue chez L'Atelier des Arts - Inscription reçue",
            html: `
                <h1>Bienvenue ${nomSociete} !</h1>
                <p>Nous avons bien reçu votre demande d'inscription.</p>
                <p>Nos équipes vont vérifier vos documents (Kbis/Identité) dans les plus brefs délais.</p>
                <p>Vous recevrez un nouvel email dès que votre compte sera activé.</p>
                <br>
                <p>Cordialement,<br>L'équipe Atelier des Arts</p>
            `
        });

        // Nettoyage final
        if (uploadedFile && fs.existsSync(uploadedFile.path)) {
            fs.unlinkSync(uploadedFile.path);
        }

        res.status(200).json({ success: true, message: "Inscription réussie." });

    } catch (error) {
        console.error("Erreur Inscription:", error);
        res.status(500).json({ success: false, message: "Erreur serveur interne" });
    }
});

// --- ROUTE LOGIN ---
app.post("/api/login", async (req, res) => {
    await connectDB();
    const { email, password } = req.body;
    
    try {
        const user = await User.findOne({ email });
        // Vérification de l'existence de l'utilisateur
        if (!user) return res.status(401).json({ success: false, message: "Identifiants invalides." });

        // Vérification du mot de passe
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ success: false, message: "Identifiants invalides." });

        // ---------------------------------------------------------
        // ✅ NOUVEAU : BLOCAGE SI LE COMPTE N'EST PAS VÉRIFIÉ
        // ---------------------------------------------------------
        if (!user.isVerified) {
             return res.status(403).json({ 
                 success: false, 
                 message: "Votre compte est en attente de validation par l'administrateur." 
             });
        }
        // ---------------------------------------------------------

        // Si tout est bon, on connecte l'utilisateur
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
// Export par défaut pour Vercel (Syntaxe Module)
export default app;