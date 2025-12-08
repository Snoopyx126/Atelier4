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

// Configuration CORS et limites augmentées pour les images Base64
app.use(cors({
  origin: [
    "https://atelier4.vercel.app", 
    "http://localhost:5173", 
    "http://localhost:3000"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}));

// Augmentation de la limite pour accepter des photos en base64
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

// ✅ MODÈLE MONTAGE MIS À JOUR (AVEC PHOTO)
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
  // Nouveau champ pour la photo (stockée en base64string)
  photoUrl: { type: String },
  dateReception: { type: Date, default: Date.now }
});
const Montage = mongoose.models.Montage || mongoose.model("Montage", montageSchema);

const factureSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    clientName: String,
    invoiceNumber: { type: String, required: true, unique: true },
    dateEmission: { type: Date, default: Date.now },
    totalHT: Number,
    totalTTC: Number,
    amountPaid: { type: Number, default: 0 },
    paymentStatus: { type: String, default: 'Non payé', enum: ['Non payé', 'Partiellement payé', 'Payé'] },
    montagesReferences: [{ type: String }],
    invoiceData: { type: Array, default: [] }, 
    pdfUrl: { type: String, default: '#' }, 
    isPublished: { type: Boolean, default: true }
});
const Facture = mongoose.models.Facture || mongoose.model("Facture", factureSchema);

// Configuration upload temporaire
const upload = multer({ dest: os.tmpdir(), limits: { fileSize: 5 * 1024 * 1024 } }); // Limite 5MB
const resend = new Resend(process.env.RESEND_API_KEY);
const SALT_ROUNDS = 10;

// --- ROUTES UTILISATEURS ---
// ... (Routes Inscription, Login, Update, Get Users inchangées) ...
app.post("/api/inscription", upload.single('pieceJointe'), async (req, res) => { await connectDB(); const { nomSociete, email, siret, password, phone, address, zipCity } = req.body; if (!nomSociete || !email || !siret || !password) { return res.status(400).json({ success: false, message: "Champs manquants" }); } try { if (await User.findOne({ email })) { return res.status(409).json({ success: false, message: "Email déjà utilisé." }); } const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS); await User.create({ email, password: hashedPassword, nomSociete, siret, phone, address, zipCity, isVerified: false, role: 'user' }); await resend.emails.send({ from: EMAIL_SENDER, to: EMAIL_ADMIN, subject: `Inscription: ${nomSociete}`, html: `<p>Nouvelle inscription.</p>` }); res.status(200).json({ success: true }); } catch (error) { res.status(500).json({ success: false, message: error.message }); } });
app.post("/api/login", async (req, res) => { await connectDB(); const { email, password } = req.body; try { const user = await User.findOne({ email }); if (!user || !(await bcrypt.compare(password, user.password))) { return res.status(401).json({ success: false, message: "Identifiants invalides." }); } if (!user.isVerified) { return res.status(403).json({ success: false, message: "Compte non validé." }); } res.json({ success: true, user: { id: user._id, email: user.email, nomSociete: user.nomSociete, siret: user.siret, phone: user.phone, address: user.address, zipCity: user.zipCity, role: user.role || 'user' } }); } catch (error) { res.status(500).json({ success: false, message: error.message }); } });
app.put("/api/users/:id", async (req, res) => { await connectDB(); const { id } = req.params; const { nomSociete, email, siret, phone, address, zipCity, currentPassword, newPassword } = req.body; try { const user = await User.findById(id); if (!user) return res.status(404).json({ success: false }); if ((email !== user.email || newPassword) && !currentPassword) return res.status(400).json({ success: false }); if (currentPassword) { const isMatch = await bcrypt.compare(currentPassword, user.password); if (!isMatch) return res.status(401).json({ success: false }); } if (nomSociete !== undefined) user.nomSociete = nomSociete; if (siret !== undefined) user.siret = siret; if (phone !== undefined) user.phone = phone; if (address !== undefined) user.address = address; if (zipCity !== undefined) user.zipCity = zipCity; if (email && email !== user.email) { const exists = await User.findOne({ email }); if (exists) return res.status(409).json({ success: false, message: "Email pris." }); user.email = email; } if (newPassword) user.password = await bcrypt.hash(newPassword, SALT_ROUNDS); await user.save(); res.json({ success: true, user: { id: user._id, email: user.email, nomSociete: user.nomSociete, siret: user.siret, phone: user.phone, address: user.address, zipCity: user.zipCity, role: user.role } }); } catch (error) { res.status(500).json({ success: false, message: error.message }); } });
app.get("/api/users", async (req, res) => { await connectDB(); try { const users = await User.find({ role: { $ne: 'admin' } }).select('-password'); res.json({ success: true, users }); } catch (error) { res.status(500).json({ success: false, message: error.message }); } });


// --- ROUTES MONTAGES ---

// 5. POST MONTAGE
app.post("/api/montages", async (req, res) => {
    await connectDB();
    const { userId, description, category, reference, frame, glassType, urgency, diamondCutType, engravingCount, shapeChange } = req.body; 
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "Client introuvable" });
        const newMontage = await Montage.create({ userId, clientName: user.nomSociete, reference: reference || "Sans ref", frame: frame || "Inconnue", description: description || "", category: category || "Cerclé", glassType: glassType || [], urgency: urgency || 'Standard', diamondCutType: diamondCutType || 'Standard', engravingCount: engravingCount || 0, shapeChange: shapeChange || false, statut: 'En attente', dateReception: Date.now() });
        res.json({ success: true, montage: newMontage });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// 6. GET MONTAGES
app.get("/api/montages", async (req, res) => {
    await connectDB();
    const { userId, role } = req.query;
    try {
        let montages;
        if (role === 'admin') { montages = await Montage.find().sort({ dateReception: -1 }); } else { montages = await Montage.find({ userId }).sort({ dateReception: -1 }); }
        res.json({ success: true, montages });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// 7. PUT MONTAGES (Modification infos)
app.put("/api/montages/:id", async (req, res) => {
    await connectDB();
    const { id } = req.params;
    const updateData = req.body;
    try {
        const updatedMontage = await Montage.findByIdAndUpdate(id, updateData, { new: true });
        if (!updatedMontage) return res.status(404).json({ success: false, message: "Montage non trouvé." });
        res.json({ success: true, montage: updatedMontage });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ✅ NOUVELLE ROUTE : UPLOAD PHOTO MONTAGE
app.post("/api/montages/:id/photo", upload.single('photo'), async (req, res) => {
    await connectDB();
    const { id } = req.params;

    if (!req.file) {
        return res.status(400).json({ success: false, message: "Aucun fichier image fourni." });
    }

    try {
        // Convertir l'image en Base64 pour stockage direct en DB (Solution simple sans S3)
        const imgBuffer = fs.readFileSync(req.file.path);
        // Créer une chaîne Base64 avec le bon préfixe MIME type (ex: data:image/jpeg;base64,...)
        const base64Image = `data:${req.file.mimetype};base64,${imgBuffer.toString('base64')}`;

        // Mettre à jour le montage avec la chaîne Base64
        const updatedMontage = await Montage.findByIdAndUpdate(id, { photoUrl: base64Image }, { new: true });
        
        // Nettoyage du fichier temporaire
        fs.unlinkSync(req.file.path);

        if (!updatedMontage) return res.status(404).json({ success: false, message: "Montage introuvable." });
        res.json({ success: true, montage: updatedMontage });

    } catch (error) {
        console.error("Erreur upload photo:", error);
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); // Nettoyage en cas d'erreur
        res.status(500).json({ success: false, message: error.message });
    }
});


// 8. DELETE MONTAGE
app.delete("/api/montages/:id", async (req, res) => {
    await connectDB();
    try { await Montage.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// --- ROUTES FACTURES (Inchangées) ---
app.post("/api/factures", async (req, res) => { await connectDB(); const { userId, invoiceNumber, totalHT, totalTTC, montagesReferences, clientName, dateEmission, pdfUrl, invoiceData, pdfBase64, sendEmail } = req.body; if (!userId || !invoiceNumber) { return res.status(400).json({ success: false, message: "Données incomplètes." }); } try { const existing = await Facture.findOne({ invoiceNumber }); if (existing) { return res.status(409).json({ success: false, message: "Facture existe déjà." }); } const newFacture = await Facture.create({ userId, invoiceNumber, totalHT, totalTTC, montagesReferences, clientName, dateEmission, pdfUrl, invoiceData: invoiceData || [], amountPaid: 0, paymentStatus: 'Non payé' }); if (sendEmail && pdfBase64) { const user = await User.findById(userId); if (user && user.email) { const pdfBuffer = Buffer.from(pdfBase64.split('base64,')[1], 'base64'); await resend.emails.send({ from: EMAIL_SENDER, to: user.email, cc: EMAIL_ADMIN, subject: `Votre Facture ${invoiceNumber} - L'Atelier des Arts`, html: `<p>Bonjour ${user.nomSociete},</p><p>Veuillez trouver ci-joint votre facture mensuelle.</p>`, attachments: [{ filename: `Facture_${invoiceNumber}.pdf`, content: pdfBuffer }], }); } } res.json({ success: true, facture: newFacture }); } catch (error) { res.status(500).json({ success: false, message: error.message }); } });
app.get("/api/factures", async (req, res) => { await connectDB(); const { userId } = req.query; try { let query = {}; if (userId) { query = { userId: userId }; } const factures = await Facture.find(query).sort({ dateEmission: -1 }); res.json({ success: true, factures }); } catch (error) { res.status(500).json({ success: false, message: error.message }); } });
app.put("/api/factures/:id", async (req, res) => { await connectDB(); const { id } = req.params; const { amountPaid } = req.body; try { const facture = await Facture.findById(id); if (!facture) return res.status(404).json({ success: false }); if (amountPaid !== undefined) { facture.amountPaid = amountPaid; } if (facture.amountPaid >= facture.totalTTC - 0.1) { facture.paymentStatus = 'Payé'; } else if (facture.amountPaid > 0) { facture.paymentStatus = 'Partiellement payé'; } else { facture.paymentStatus = 'Non payé'; } await facture.save(); res.json({ success: true, facture }); } catch (error) { res.status(500).json({ success: false, message: error.message }); } });
app.delete("/api/factures/:id", async (req, res) => { await connectDB(); try { await Facture.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (error) { res.status(500).json({ success: false, message: error.message }); } });

export default app;