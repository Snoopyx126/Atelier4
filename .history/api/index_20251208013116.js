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
  phone: { type: String },
  address: { type: String }, // Ajouté pour la facturation
  zipCity: { type: String }, // Ajouté pour la facturation
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
  glassType: [{ type: String, default: [] }], 
  urgency: { type: String, default: 'Standard' }, 
  diamondCutType: { type: String, default: 'Standard' }, 
  engravingCount: { type: Number, default: 0 },
  shapeChange: { type: Boolean, default: false },
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
    const { nomSociete, email, siret, password, phone, address, zipCity } = req.body;

    if (!nomSociete || !email || !siret || !password) { return res.status(400).json({ success: false, message: "Champs manquants" }); }
    try {
        if (await User.findOne({ email })) { return res.status(409).json({ success: false, message: "Email déjà utilisé." }); }
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        await User.create({ email, password: hashedPassword, nomSociete, siret, phone, address, zipCity, isVerified: false, role: 'user' });

        await resend.emails.send({ from: EMAIL_SENDER, to: EMAIL_ADMIN, subject: `Inscription: ${nomSociete}`, html: `<p>Nouvelle inscription.</p>` });
        res.status(200).json({ success: true });
    } catch (error) { res.status(500).json({ success: false, message: "Erreur serveur" }); }
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
        res.json({ success: true, user: { id: user._id, email: user.email, nomSociete: user.nomSociete, siret: user.siret, phone: user.phone, address: user.address, zipCity: user.zipCity, role: user.role || 'user' } });
    } catch (error) { res.status(500).json({ success: false, message: "Erreur serveur" }); }
});

// 4. UPDATE USER
app.put("/api/users/:id", async (req, res) => {
    await connectDB();
    const { id } = req.params;
    const { nomSociete, email, siret, phone, address, zipCity, currentPassword, newPassword } = req.body;
    try {
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ success: false });
        if ((email !== user.email || newPassword) && !currentPassword) return res.status(400).json({ success: false });
        
        if (currentPassword) {
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) return res.status(401).json({ success: false });
        }
        
        if (nomSociete !== undefined) user.nomSociete = nomSociete;
        if (siret !== undefined) user.siret = siret;
        if (phone !== undefined) user.phone = phone;
        if (address !== undefined) user.address = address;
        if (zipCity !== undefined) user.zipCity = zipCity;
        
        if (email && email !== user.email) {
            const exists = await User.findOne({ email });
            if (exists) return res.status(409).json({ success: false, message: "Email pris." });
            user.email = email;
        }
        if (newPassword) user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
        
        await user.save();
        res.json({ success: true, user: { id: user._id, email: user.email, nomSociete: user.nomSociete, siret: user.siret, phone: user.phone, address: user.address, zipCity: user.zipCity, role: user.role } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// 5. MONTAGES - POST (CRÉATION)
app.post("/api/montages", async (req, res) => {
    await connectDB();
    const { userId, description, category, reference, frame, glassType, urgency, diamondCutType, engravingCount, shapeChange } = req.body; 
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "Client introuvable" });
        const newMontage = await Montage.create({ 
            userId, clientName: user.nomSociete, reference: reference || "Sans ref", frame: frame || "Inconnue", 
            description: description || "", category: category || "Cerclé", 
            glassType: glassType || [], urgency: urgency || 'Standard', diamondCutType: diamondCutType || 'Standard', engravingCount: engravingCount || 0,
            shapeChange: shapeChange || false,
            statut: 'En attente', dateReception: Date.now() 
        });
        res.json({ success: true, montage: newMontage });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// 5. MONTAGES - GET
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
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// 5. MONTAGES - PUT (MODIFICATION/STATUT)
app.put("/api/montages/:id", async (req, res) => {
    await connectDB();
    const { id } = req.params;
    // Utiliser req.body directement pour récupérer tous les champs envoyés, même si un seul (statut) est présent.
    const updateData = req.body;

    try {
        // Validation que le corps de la requête n'est pas vide
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ success: false, message: "Corps de la requête vide." });
        }

        // Exécuter la mise à jour
        const updatedMontage = await Montage.findByIdAndUpdate(id, updateData, { new: true });
        
        if (!updatedMontage) return res.status(404).json({ success: false, message: "Montage non trouvé." });
        
        res.json({ success: true, montage: updatedMontage });
    } catch (error) { 
        res.status(500).json({ success: false, message: error.message }); 
    }
});

// ... (Les autres routes sont omises pour la concision) ...

export default app;