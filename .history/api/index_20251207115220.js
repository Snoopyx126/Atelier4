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

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connecté à MongoDB");
  } catch (error) {
    console.error("❌ Erreur MongoDB:", error);
  }
};

// --- MODÈLES ---

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  nomSociete: { type: String, required: true },
  siret: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  role: { type: String, default: 'user', enum: ['user', 'admin'] }, // Nouveau champ rôle
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.models.User || mongoose.model("User", userSchema);

const montageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Lien vers le client
  clientName: String, // Nom pour affichage facile
  description: String,
  statut: { type: String, default: 'Reçu' }, // Reçu, En cours, Expédié...
  dateReception: { type: Date, default: Date.now }
});
const Montage = mongoose.models.Montage || mongoose.model("Montage", montageSchema);

const upload = multer({ dest: os.tmpdir(), limits: { fileSize: 4 * 1024 * 1024 } });
const resend = new Resend(process.env.RESEND_API_KEY);
const SALT_ROUNDS = 10;

// --- ROUTES AUTH ---

app.post("/api/inscription", upload.single('pieceJointe'), async (req, res) => {
    await connectDB();
    const { nomSociete, email, siret, password } = req.body;
    const uploadedFile = req.file;

    if (!nomSociete || !email || !siret || !password) {
        return res.status(400).json({ success: false, message: "Champs manquants" });
    }

    try {
        if (await User.findOne({ email })) {
             if (uploadedFile && fs.existsSync(uploadedFile.path)) fs.unlinkSync(uploadedFile.path);
             return res.status(409).json({ success: false, message: "Email déjà utilisé." });
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        await User.create({ email, password: hashedPassword, nomSociete, siret, isVerified: false, role: 'user' });

        // Email Admin
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

        // Email Client
        await resend.emails.send({
            from: "onboarding@resend.dev",
            to: email,
            subject: "Inscription reçue - Atelier des Arts",
            html: `<h1>Bienvenue ${nomSociete} !</h1><p>Votre compte est en cours de validation.</p>`
        });

        if (uploadedFile && fs.existsSync(uploadedFile.path)) fs.unlinkSync(uploadedFile.path);
        res.status(200).json({ success: true });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
});

app.post("/api/login", async (req, res) => {
    await connectDB();
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ success: false, message: "Identifiants invalides." });
        }
        if (!user.isVerified) {
             return res.status(403).json({ success: false, message: "Compte en attente de validation." });
        }

        // On renvoie aussi l'ID et le Rôle
        res.json({ 
            success: true, 
            user: { 
                id: user._id, // Important pour lier les montages
                email: user.email, 
                nomSociete: user.nomSociete, 
                siret: user.siret,
                role: user.role || 'user'
            } 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
});

// --- ROUTES MONTAGES (NOUVEAU) ---

// 1. Récupérer tous les clients (Pour l'Admin)
app.get("/api/users", async (req, res) => {
    await connectDB();
    try {
        const users = await User.find({ role: { $ne: 'admin' } }).select('-password');
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// 2. Créer un montage pour un client (Pour l'Admin)
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

// 3. Récupérer les montages (Admin = tous, User = les siens)
app.get("/api/montages", async (req, res) => {
    await connectDB();
    const { userId, role } = req.query; // On passe l'ID et le rôle en paramètre

    try {
        let montages;
        if (role === 'admin') {
            montages = await Montage.find().sort({ dateReception: -1 });
        } else {
            montages = await Montage.find({ userId }).sort({ dateReception: -1 });
        }
        res.json({ success: true, montages });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

export default app;