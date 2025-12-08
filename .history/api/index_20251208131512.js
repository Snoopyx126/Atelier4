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

// ⚠️ AUGMENTATION DE LA LIMITE POUR ACCEPTER LES FICHIERS PDF EN BASE64
app.use(express.json({ limit: '10mb' }));

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
  address: { type: String }, 
  zipCity: { type: String }, 
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

// ✅ MODÈLE FACTURE MIS À JOUR
const factureSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    clientName: String,
    invoiceNumber: { type: String, required: true, unique: true },
    dateEmission: { type: Date, default: Date.now },
    totalHT: Number,
    totalTTC: Number,
    montagesReferences: [{ type: String }],
    // On stocke le détail pour que le client puisse régénérer le PDF visuellement
    invoiceData: { type: Array, default: [] }, 
    pdfUrl: { type: String, default: '#' }, // URL symbolique ou lien externe
    isPublished: { type: Boolean, default: true }
});
const Facture = mongoose.models.Facture || mongoose.model("Facture", factureSchema);


const upload = multer({ dest: os.tmpdir(), limits: { fileSize: 4 * 1024 * 1024 } });
const resend = new Resend(process.env.RESEND_API_KEY);
const SALT_ROUNDS = 10;

// --- ROUTES UTILISATEURS ---

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
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
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
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// 3. UPDATE USER
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

// 4. GET USERS (Admin)
app.get("/api/users", async (req, res) => {
    await connectDB();
    try {
        const users = await User.find({ role: { $ne: 'admin' } }).select('-password'); 
        res.json({ success: true, users });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// --- ROUTES MONTAGES ---

// 5. POST MONTAGE
app.post("/api/montages", async (req, res) => {
    await connectDB();
    const { userId, description, category, reference, frame, glassType, urgency, diamondCutType, engravingCount, shapeChange } = req.body; 
    
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "Client introuvable" });
        
        const newMontage = await Montage.create({ 
            userId, 
            clientName: user.nomSociete, 
            reference: reference || "Sans ref", 
            frame: frame || "Inconnue", 
            description: description || "", 
            category: category || "Cerclé", 
            glassType: glassType || [], 
            urgency: urgency || 'Standard', 
            diamondCutType: diamondCutType || 'Standard', 
            engravingCount: engravingCount || 0,
            shapeChange: shapeChange || false,
            statut: 'En attente', 
            dateReception: Date.now() 
        });
        res.json({ success: true, montage: newMontage });
    } catch (error) { 
        res.status(500).json({ success: false, message: error.message }); 
    }
});

// 6. GET MONTAGES
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
    } catch (error) { 
        res.status(500).json({ success: false, message: error.message }); 
    }
});

// 7. PUT MONTAGES
app.put("/api/montages/:id", async (req, res) => {
    await connectDB();
    const { id } = req.params;
    const updateData = req.body;

    try {
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ success: false, message: "Corps de la requête vide." });
        }

        const updatedMontage = await Montage.findByIdAndUpdate(id, updateData, { new: true });
        if (!updatedMontage) return res.status(404).json({ success: false, message: "Montage non trouvé." });
        
        res.json({ success: true, montage: updatedMontage });
    } catch (error) { 
        res.status(500).json({ success: false, message: error.message }); 
    }
});

// 8. DELETE MONTAGE
app.delete("/api/montages/:id", async (req, res) => {
    await connectDB();
    try {
        await Montage.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// --- ROUTES FACTURES (MISES À JOUR) ---

// 9. POST FACTURE : Crée la facture ET envoie l'email si un PDF est fourni
app.post("/api/factures", async (req, res) => {
    await connectDB();
    const { userId, invoiceNumber, totalHT, totalTTC, montagesReferences, clientName, dateEmission, pdfUrl, invoiceData, pdfBase64, sendEmail } = req.body;
    
    if (!userId || !invoiceNumber) {
        return res.status(400).json({ success: false, message: "Données de facture incomplètes." });
    }

    try {
        // 1. Vérifier doublon
        const existing = await Facture.findOne({ invoiceNumber });
        if (existing) {
             return res.status(409).json({ success: false, message: "Cette facture existe déjà." });
        }

        // 2. Créer en DB
        const newFacture = await Facture.create({ 
            userId, invoiceNumber, totalHT, totalTTC, montagesReferences, clientName, dateEmission, pdfUrl, 
            invoiceData: invoiceData || [] // Sauvegarde des données brutes
        });

        // 3. Envoi Email via Resend si demandé
        if (sendEmail && pdfBase64) {
            const user = await User.findById(userId);
            if (user && user.email) {
                // Conversion du Base64 (data:application/pdf;base64,...) en Buffer
                const pdfBuffer = Buffer.from(pdfBase64.split('base64,')[1], 'base64');
                
                await resend.emails.send({
                    from: EMAIL_SENDER,
                    to: user.email,
                    cc: EMAIL_ADMIN, // L'admin reçoit une copie
                    subject: `Votre Facture ${invoiceNumber} - L'Atelier des Arts`,
                    html: `
                        <p>Bonjour ${user.nomSociete},</p>
                        <p>Veuillez trouver ci-joint votre facture mensuelle <strong>${invoiceNumber}</strong>.</p>
                        <p>Cordialement,<br>L'équipe de l'Atelier des Arts</p>
                    `,
                    attachments: [
                        {
                            filename: `Facture_${invoiceNumber}.pdf`,
                            content: pdfBuffer,
                        },
                    ],
                });
                console.log(`✉️ Email envoyé à ${user.email}`);
            }
        }

        res.json({ success: true, facture: newFacture });
    } catch (error) {
        console.error("Erreur POST facture:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 10. GET FACTURES
app.get("/api/factures", async (req, res) => {
    await connectDB();
    const { userId } = req.query; 
    
    try {
        let query = {};
        if (userId) { query = { userId: userId }; }
        const factures = await Facture.find(query).sort({ dateEmission: -1 });
        res.json({ success: true, factures });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 11. DELETE FACTURE (NOUVEAU)
app.delete("/api/factures/:id", async (req, res) => {
    await connectDB();
    try {
        const deleted = await Facture.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ success: false, message: "Facture introuvable" });
        res.json({ success: true, message: "Facture supprimée" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default app;