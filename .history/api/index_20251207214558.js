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

const EMAIL_SENDER = "ne-pas-repondre@l-atelier-des-arts.com"; 
const EMAIL_ADMIN = "atelierdesarts.12@gmail.com"; 

app.use(cors({
  origin: [
    "https://atelier4.vercel.app", 
    "http://localhost:5173", 
    "http://localhost:3000"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
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
  phone: { type: String }, // ✅ Nouveau champ Téléphone
  isVerified: { type: Boolean, default: false },
  role: { type: String, default: 'user', enum: ['user', 'admin'] },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.models.User || mongoose.model("User", userSchema);

const montageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  clientName: String,
  reference: String,
  frame: String,
  description: String,
  category: { type: String, default: 'Cerclé' },
  options: { type: [String], default: [] },
  statut: { type: String, default: 'En attente' },
  dateReception: { type: Date, default: Date.now }
});
const Montage = mongoose.models.Montage || mongoose.model("Montage", montageSchema);

const upload = multer({ dest: os.tmpdir(), limits: { fileSize: 4 * 1024 * 1024 } });
const resend = new Resend(process.env.RESEND_API_KEY);
const SALT_ROUNDS = 10;

// --- ROUTES ---

// 1. INSCRIPTION (+ PHONE)
app.post("/api/inscription", upload.single('pieceJointe'), async (req, res) => {
    await connectDB();
    // ✅ On récupère le téléphone ici
    const { nomSociete, email, siret, password, phone } = req.body;
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
        // ✅ On sauvegarde le téléphone
        await User.create({ email, password: hashedPassword, nomSociete, siret, phone, isVerified: false, role: 'user' });

        let attachments = [];
        if (uploadedFile && fs.existsSync(uploadedFile.path)) {
            const fileContent = fs.readFileSync(uploadedFile.path);
            attachments.push({ filename: uploadedFile.originalname, content: fileContent });
        }
        
        await resend.emails.send({
            from: EMAIL_SENDER,
            to: EMAIL_ADMIN,
            subject: `🔔 Nouvelle Inscription : ${nomSociete}`,
            html: `<p><strong>Société :</strong> ${nomSociete}<br><strong>SIRET :</strong> ${siret}<br><strong>Email :</strong> ${email}<br><strong>Tél :</strong> ${phone || "Non renseigné"}</p>`,
            attachments: attachments
        });

        await resend.emails.send({
            from: EMAIL_SENDER,
            to: email,
            subject: "Bienvenue à L'Atelier des Arts",
            html: `<h1>Bienvenue ${nomSociete} !</h1><p>Compte en cours de validation.</p>`
        });

        if (uploadedFile && fs.existsSync(uploadedFile.path)) fs.unlinkSync(uploadedFile.path);
        res.status(200).json({ success: true });

    } catch (error) {
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
});

// 2. LOGIN (+ PHONE)
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
        // ✅ On renvoie le téléphone au frontend
        res.json({ success: true, user: { id: user._id, email: user.email, nomSociete: user.nomSociete, siret: user.siret, phone: user.phone, role: user.role || 'user' } });
    } catch (error) { res.status(500).json({ success: false, message: "Erreur serveur" }); }
});

// 3. PASSWORD
app.post("/api/forgot-password", async (req, res) => {
    await connectDB();
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ success: false, message: "Email introuvable." });

        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(tempPassword, SALT_ROUNDS);
        user.password = hashedPassword;
        await user.save();

        await resend.emails.send({
            from: EMAIL_SENDER,
            to: email,
            subject: "Réinitialisation de mot de passe",
            html: `<p>Nouveau mot de passe temporaire : <strong>${tempPassword}</strong></p>`
        });
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
});

// 4. UPDATE USER (+ PHONE)
app.put("/api/users/:id", async (req, res) => {
    await connectDB();
    const { id } = req.params;
    const { nomSociete, email, siret, phone, currentPassword, newPassword } = req.body; // ✅ phone ajouté
    try {
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ success: false });

        if ((email !== user.email || newPassword) && !currentPassword) {
             return res.status(400).json({ success: false, message: "Mot de passe actuel requis." });
        }
        if (currentPassword) {
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) return res.status(401).json({ success: false });
        }
        if (nomSociete) user.nomSociete = nomSociete;
        if (siret) user.siret = siret;
        if (phone) user.phone = phone; // ✅ Mise à jour téléphone
        
        if (email && email !== user.email) {
            const exists = await User.findOne({ email });
            if (exists) return res.status(409).json({ success: false, message: "Email pris." });
            user.email = email;
        }
        if (newPassword) user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);

        await user.save();
        res.json({ success: true, message: "Profil mis à jour", user: { id: user._id, email: user.email, nomSociete: user.nomSociete, siret: user.siret, phone: user.phone, role: user.role } });
    } catch (error) { res.status(500).json({ success: false, message: "Erreur serveur." }); }
});

// 5. MONTAGES & USERS
app.get("/api/users", async (req, res) => {
    await connectDB();
    try {
        const users = await User.find({ role: { $ne: 'admin' } }).select('-password'); 
        res.json({ success: true, users });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.post("/api/montages", async (req, res) => {
    await connectDB();
    const { userId, description, category, options, reference, frame } = req.body; 
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "Client introuvable" });
        const newMontage = await Montage.create({ 
            userId, clientName: user.nomSociete, reference: reference || "Sans ref", frame: frame || "Inconnue", 
            description: description || "", category: category || "Cerclé", options: options || [], statut: 'En attente', dateReception: Date.now() 
        });
        res.json({ success: true, montage: newMontage });
    } catch (error) { res.status(500).json({ success: false }); }
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

app.put("/api/montages/:id", async (req, res) => {
    await connectDB();
    const { id } = req.params;
    const { statut, reference, frame, description, category, options, userId } = req.body;

    try {
        const updateData = {};
        if (statut) updateData.statut = statut;
        if (reference !== undefined) updateData.reference = reference;
        if (frame !== undefined) updateData.frame = frame;
        if (description !== undefined) updateData.description = description;
        if (category !== undefined) updateData.category = category;
        if (options !== undefined) updateData.options = options;

        if (userId) {
            const user = await User.findById(userId);
            if (user) {
                updateData.userId = userId;
                updateData.clientName = user.nomSociete;
            }
        }

        const updatedMontage = await Montage.findByIdAndUpdate(id, updateData, { new: true });
        if (!updatedMontage) return res.status(404).json({ success: false });
        res.json({ success: true, montage: updatedMontage });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.delete("/api/montages/:id", async (req, res) => {
    await connectDB();
    try {
        await Montage.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
});

// 6. CONTACT
app.post("/api/contact", async (req, res) => {
    const { name, email, phone, message } = req.body;
    try {
        await resend.emails.send({
            from: EMAIL_SENDER,
            to: EMAIL_ADMIN,
            subject: `Contact: ${name}`,
            html: `<p>Nom: ${name}<br>Email: ${email}<br>Tel: ${phone}<br>Message: ${message}</p>`
        });
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
});

export default app;