// api/index.js
import express from 'express';
import cors from 'cors';
import { Resend } from 'resend';
import dotenv from 'dotenv';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
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

// --- MODÈLES (Schémas de données) ---

// 1. Utilisateur (avec Rôle et Vérification)
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  nomSociete: { type: String, required: true },
  siret: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  role: { type: String, default: 'user', enum: ['user', 'admin'] }, // Nouveau : Rôle
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.models.User || mongoose.model("User", userSchema);

// 2. Montage (Les lunettes envoyées)
const montageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Lien vers le client
  clientName: String, // Pour afficher facilement le nom dans le tableau admin
  description: String, // Ex: "Monture Dior Or - Verres Progressifs"
  statut: { type: String, default: 'Reçu' }, // Reçu, En cours, Terminé, Expédié
  dateReception: { type: Date, default: Date.now }
});
const Montage = mongoose.models.Montage || mongoose.model("Montage", montageSchema);

// --- CONFIGURATION FICHIERS ---
const upload = multer({ 
    dest: os.tmpdir(), 
    limits: { fileSize: 4 * 1024 * 1024 } 
});

const resend = new Resend(process.env.RESEND_API_KEY);
const SALT_ROUNDS = 10;

// ================= ROUTES =================

// --- 1. INSCRIPTION ---
app.post("/api/inscription", upload.single('pieceJointe'), async (req, res) => {
    await connectDB();
    const { nomSociete, email, siret, password } = req.body;
    const uploadedFile = req.file;

    if (!nomSociete || !email || !siret || !password) {
        return res.status(400).json({ success: false, message: "Tous les champs sont obligatoires." });
    }

    try {
        if (await User.findOne({ email })) {
             if (uploadedFile && fs.existsSync(uploadedFile.path)) fs.unlinkSync(uploadedFile.path);
             return res.status(409).json({ success: false, message: "Cet email est déjà utilisé." });
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        
        // Création de l'utilisateur (Rôle 'user' par défaut)
        await User.create({
            email,
            password: hashedPassword,
            nomSociete,
            siret,
            isVerified: false, 
            role: 'user'
        });

        // Email Admin (Notification)
        let attachments = [];
        if (uploadedFile && fs.existsSync(uploadedFile.path)) {
            const fileContent = fs.readFileSync(uploadedFile.path);
            attachments.push({ filename: uploadedFile.originalname, content: fileContent });
        }
        await resend.emails.send({
            from: "onboarding@resend.dev",
            to: "atelierdesarts.12@gmail.com",
            subject: `Nouvelle Inscription : ${nomSociete}`,
            html: `<p>Société: ${nomSociete}<br>SIRET: ${siret}<br>Email: ${email}</p>`,
            attachments: attachments
        });

        // Email Client (Confirmation)
        await resend.emails.send({
            from: "onboarding@resend.dev",
            to: email,
            subject: "Inscription reçue - Atelier des Arts",
            html: `<h1>Bienvenue ${nomSociete} !</h1><p>Nous avons bien reçu votre demande. Votre compte est en cours de validation par nos équipes.</p>`
        });

        if (uploadedFile && fs.existsSync(uploadedFile.path)) fs.unlinkSync(uploadedFile.path);
        res.status(200).json({ success: true, message: "Inscription réussie." });

    } catch (error) {
        console.error("Erreur Inscription:", error);
        res.status(500).json({ success: false, message: "Erreur serveur." });
    }
});

// --- 2. LOGIN ---
app.post("/api/login", async (req, res) => {
    await connectDB();
    const { email, password } = req.body;
    
    try {
        const user = await User.findOne({ email });
        
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ success: false, message: "Identifiants invalides." });
        }

        if (!user.isVerified) {
             return res.status(403).json({ success: false, message: "Votre compte est en attente de validation par l'administrateur." });
        }

        // On renvoie les infos complètes (ID, Rôle, etc.)
        res.json({ 
            success: true, 
            user: { 
                id: user._id, 
                email: user.email, 
                nomSociete: user.nomSociete, 
                siret: user.siret,
                role: user.role || 'user' // Par sécurité
            } 
        });
    } catch (error) {
        console.error("Erreur Login:", error);
        res.status(500).json({ success: false, message: "Erreur serveur." });
    }
});

// --- 3. GESTION DES MONTAGES (ADMIN & CLIENT) ---

// A. Récupérer la liste des clients (Pour l'Admin, dans le menu déroulant)
app.get("/api/users", async (req, res) => {
    await connectDB();
    try {
        // On récupère tout le monde sauf les admins
        const users = await User.find({ role: { $ne: 'admin' } }).select('-password'); 
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// B. Ajouter un montage (Pour l'Admin)
app.post("/api/montages", async (req, res) => {
    await connectDB();
    const { userId, description, statut } = req.body;
    
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "Client introuvable" });

        const newMontage = await Montage.create({
            userId,
            clientName: user.nomSociete,
            description,
            statut: statut || 'Reçu'
        });
        
        res.json({ success: true, montage: newMontage });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// C. Voir les montages (Admin voit tout, Client voit les siens)
app.get("/api/montages", async (req, res) => {
    await connectDB();
    const { userId, role } = req.query; // On lit les paramètres dans l'URL

    try {
        let montages;
        if (role === 'admin') {
            // L'admin voit tout, du plus récent au plus ancien
            montages = await Montage.find().sort({ dateReception: -1 });
        } else {
            // Le client ne voit que SES montages
            montages = await Montage.find({ userId }).sort({ dateReception: -1 });
        }
        res.json({ success: true, montages });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

export default app;