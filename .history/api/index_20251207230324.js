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
  // Champs mis à jour
  glassType: [{ type: String, default: [] }], // ✅ Nouveau : Type de verre (Array)
  urgency: { type: String, default: 'Standard' }, // ✅ Nouveau : Urgence
  diamondCutType: { type: String, default: 'Standard' }, // ✅ Nouveau : Type de Diamond Cut
  engravingCount: { type: Number, default: 0 }, // ✅ Nouveau : Nombre de gravures
  // Le champ 'options' est supprimé car remplacé par les nouveaux champs structurés.
  statut: { type: String, default: 'En attente' },
  dateReception: { type: Date, default: Date.now }
});
const Montage = mongoose.models.Montage || mongoose.model("Montage", montageSchema);

const upload = multer({ dest: os.tmpdir(), limits: { fileSize: 4 * 1024 * 1024 } });
const resend = new Resend(process.env.RESEND_API_KEY);
const SALT_ROUNDS = 10;

// --- ROUTES ---

// ... (Routes 1, 2, 3, 4, GET /api/users, 6. CONTACT inchangées)

// 5. POST /api/montages (CRÉATION)
app.post("/api/montages", async (req, res) => {
    await connectDB();
    // ✅ On récupère tous les nouveaux champs
    const { userId, description, category, reference, frame, glassType, urgency, diamondCutType, engravingCount } = req.body; 
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "Client introuvable" });
        
        const newMontage = await Montage.create({ 
            userId, 
            clientName: user.nomSociete, 
            reference: reference || "Sans ref", 
            frame: frame || "Monture inconnue", 
            description: description || "", 
            category: category || "Cerclé", 
            // ✅ Enregistrement des nouveaux champs
            glassType: glassType || [],
            urgency: urgency || 'Standard',
            diamondCutType: diamondCutType || 'Standard',
            engravingCount: engravingCount || 0,
            
            statut: 'En attente', 
            dateReception: Date.now() 
        });

        res.json({ success: true, montage: newMontage });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// 5. PUT /api/montages/:id (MODIFICATION)
app.put("/api/montages/:id", async (req, res) => {
    await connectDB();
    const { id } = req.params;
    // ✅ On récupère tous les champs y compris les nouveaux
    const { statut, reference, frame, description, category, glassType, urgency, diamondCutType, engravingCount, userId } = req.body;

    try {
        const updateData = {};
        if (statut) updateData.statut = statut;
        if (reference !== undefined) updateData.reference = reference;
        if (frame !== undefined) updateData.frame = frame;
        if (description !== undefined) updateData.description = description;
        if (category !== undefined) updateData.category = category;
        // ✅ Mise à jour des nouveaux champs
        if (glassType !== undefined) updateData.glassType = glassType;
        if (urgency !== undefined) updateData.urgency = urgency;
        if (diamondCutType !== undefined) updateData.diamondCutType = diamondCutType;
        if (engravingCount !== undefined) updateData.engravingCount = engravingCount;
        
        if (userId) {
            const user = await User.findById(userId);
            if (user) { updateData.userId = userId; updateData.clientName = user.nomSociete; }
        }

        const updatedMontage = await Montage.findByIdAndUpdate(id, updateData, { new: true });
        if (!updatedMontage) return res.status(404).json({ success: false });
        res.json({ success: true, montage: updatedMontage });
    } catch (error) { res.status(500).json({ success: false }); }
});

// ... (GET /api/montages et DELETE /api/montages/:id inchangés)

export default app;