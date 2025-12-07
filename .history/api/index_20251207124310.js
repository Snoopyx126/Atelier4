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
  methods: ["GET", "POST", "PUT", "OPTIONS"] // ✅ Ajout de PUT pour la modification
}));

app.use(express.json());

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connecté à MongoDB");
  } catch (error) {
    console.error("❌ Erreur de connexion MongoDB:", error);
  }
};

// --- MODÈLES ---
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  nomSociete: { type: String, required: true },
  siret: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  role: { type: String, default: 'user', enum: ['user', 'admin'] },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.models.User || mongoose.model("User", userSchema);

const montageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  clientName: String,
  description: String,
  statut: { type: String, default: 'Reçu' },
  dateReception: { type: Date, default: Date.now }
});
const Montage = mongoose.models.Montage || mongoose.model("Montage", montageSchema);

// --- UPLOAD ---
const upload = multer({ dest: os.tmpdir(), limits: { fileSize: 4 * 1024 * 1024 } });
const resend = new Resend(process.env.RESEND_API_KEY);
const SALT_ROUNDS = 10;

// ================= ROUTES =================

// 1. INSCRIPTION
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

        await resend.emails.send({
            from: "onboarding@resend.dev",
            to: email,
            subject: "Inscription reçue - Atelier des Arts",
            html: `<h1>Bienvenue ${nomSociete} !</h1><p>Compte en cours de validation.</p>`
        });

        if (uploadedFile && fs.existsSync(uploadedFile.path)) fs.unlinkSync(uploadedFile.path);
        res.status(200).json({ success: true });

    } catch (error) {
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
});

// 2. LOGIN
app.post("/api/login", async (req, res) => {
    await connectDB();
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ success: false, message: "Identifiants invalides." });
        }
        if (!user.isVerified) {
             return res.status(403).json({ success: false, message: "Compte non validé." });
        }
        res.json({ success: true, user: { id: user._id, email: user.email, nomSociete: user.nomSociete, siret: user.siret, role: user.role || 'user' } });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
});

// 3. MISE À JOUR PROFIL (C'est cette route qui vous manquait !)
app.put("/api/users/:id", async (req, res) => {
    await connectDB();
    const { id } = req.params;
    const { nomSociete, email, siret, currentPassword, newPassword } = req.body;

    try {
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ success: false, message: "Utilisateur introuvable." });

        // Vérification mot de passe pour changements sensibles
        if ((email !== user.email || newPassword) && !currentPassword) {
             return res.status(400).json({ success: false, message: "Mot de passe actuel requis." });
        }

        if (currentPassword) {
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) return res.status(401).json({ success: false, message: "Mot de passe incorrect." });
        }

        if (nomSociete) user.nomSociete = nomSociete;
        if (siret) user.siret = siret;
        
        if (email && email !== user.email) {
            const exists = await User.findOne({ email });
            if (exists) return res.status(409).json({ success: false, message: "Cet email est déjà pris." });
            user.email = email;
        }

        if (newPassword) {
            user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
        }

        await user.save();

        res.json({ 
            success: true, 
            message: "Profil mis à jour",
            user: { 
                id: user._id, 
                email: user.email, 
                nomSociete: user.nomSociete, 
                siret: user.siret, 
                role: user.role 
            } 
        });

    } catch (error) {
        console.error("Erreur Update:", error);
        res.status(500).json({ success: false, message: "Erreur serveur." });
    }
});

// 4. ADMIN & MONTAGES
app.get("/api/users", async (req, res) => {
    await connectDB();
    try {
        const users = await User.find({ role: { $ne: 'admin' } }).select('-password'); 
        res.json({ success: true, users });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.post("/api/montages", async (req, res) => {
    await connectDB();
    const { userId, description, statut } = req.body;
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "Client introuvable" });
        const newMontage = await Montage.create({ userId, clientName: user.nomSociete, description, statut: statut || 'Reçu' });
        res.json({ success: true, montage: newMontage });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

app.get("/api/montages", async (req, res) => {
    await connectDB();
    const { userId, role } = req.query;
    try {
        let montages;
        if (role === 'admin') {
            montages = await Montage.find().sort({ dateReception: -1 });
        } else {
            montages = await Montage.find({ userId }).sort({ dateReception: -1 });
        }
        res.json({ success: true, montages });
    } catch (error) { res.status(500).json({ success: false }); }
});

export default app;