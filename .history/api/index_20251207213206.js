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

// ✅ ADRESSE OFFICIELLE VALIDÉE
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

// 1. INSCRIPTION
app.post("/api/inscription", upload.single('pieceJointe'), async (req, res) => {
    await connectDB();
    const { nomSociete, email, siret, password } = req.body;
    // ... (Logique d'inscription inchangée)
    // Pour gagner de la place ici, je garde l'essentiel, mais ne supprimez pas votre logique d'inscription existante si elle marche.
    // Si vous copiez-collez tout, assurez-vous de reprendre la version complète que je vous ai donnée juste avant pour les templates email.
    
    // Version condensée pour la lisibilité de la réponse (gardez votre version complète avec templates emails)
    try {
        if (await User.findOne({ email })) return res.status(409).json({ success: false });
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        await User.create({ email, password: hashedPassword, nomSociete, siret, role: 'user' });
        
        // Email Admin et Client (Gardez vos templates HTML ici)
        await resend.emails.send({ from: EMAIL_SENDER, to: EMAIL_ADMIN, subject: `Inscription: ${nomSociete}`, html: `<p>Nouvelle inscription.</p>` });
        await resend.emails.send({ from: EMAIL_SENDER, to: email, subject: "Bienvenue", html: `<p>Compte créé.</p>` });

        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
});

// 2. LOGIN
app.post("/api/login", async (req, res) => {
    await connectDB();
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ success: false });
        if (!user.isVerified) return res.status(403).json({ success: false });
        res.json({ success: true, user: { id: user._id, email: user.email, nomSociete: user.nomSociete, role: user.role || 'user' } });
    } catch (error) { res.status(500).json({ success: false }); }
});

// 3. PASSWORD
app.post("/api/forgot-password", async (req, res) => {
    await connectDB();
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ success: false });
        const tempPassword = Math.random().toString(36).slice(-8);
        user.password = await bcrypt.hash(tempPassword, SALT_ROUNDS);
        await user.save();
        await resend.emails.send({ from: EMAIL_SENDER, to: email, subject: "Nouveau mot de passe", html: `<p>${tempPassword}</p>` });
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
});

// 4. USERS & MONTAGES
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

// ✅ ROUTE PUT AMÉLIORÉE (C'est elle qui permet la modification)
app.put("/api/montages/:id", async (req, res) => {
    await connectDB();
    const { id } = req.params;
    // On récupère tout ce qui peut être modifié
    const { statut, reference, frame, description, category, options, userId } = req.body;

    try {
        const updateData = {};
        if (statut) updateData.statut = statut;
        if (reference !== undefined) updateData.reference = reference;
        if (frame !== undefined) updateData.frame = frame;
        if (description !== undefined) updateData.description = description;
        if (category !== undefined) updateData.category = category;
        if (options !== undefined) updateData.options = options;

        // Si l'admin change le client
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

// 5. CONTACT
app.post("/api/contact", async (req, res) => {
    const { name, email, phone, message } = req.body;
    try {
        await resend.emails.send({
            from: EMAIL_SENDER,
            to: EMAIL_ADMIN,
            subject: `Contact: ${name}`,
            html: `<p>Message de ${name} (${email}): ${message}</p>`
        });
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
});

export default app;