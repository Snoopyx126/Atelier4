import express from 'express';
import cors from 'cors';
import { Resend } from 'resend';
import dotenv from 'dotenv';
import multer from 'multer';
import fs from 'fs';
import os from 'os';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

dotenv.config();
const app = express();

// --- 1. CONFIGURATION CORS ---
const allowedOrigins = [
  "https://l-atelier-des-arts.com",
  "https://www.l-atelier-des-arts.com",
  "https://atelier4.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000"
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      return callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.options(/(.*)/, cors());
app.use(express.json({ limit: '10mb' }));

// --- 2. BASE DE DONNÉES ---
let isConnected = false;
const connectDB = async () => {
  if (isConnected) return;
  try {
    if (!process.env.MONGODB_URI) throw new Error("URI Manquant");
    await mongoose.connect(process.env.MONGODB_URI);
    isConnected = true;
    console.log("✅ Connecté à MongoDB");
  } catch (error) {
    console.error("❌ Erreur DB:", error);
  }
};

app.use(async (req, res, next) => {
    await connectDB();
    next();
});

// --- 3. MODÈLES ---
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  nomSociete: { type: String, required: true },
  siret: { type: String, required: true },
  phone: { type: String },
  address: { type: String }, 
  zipCity: { type: String }, 
  isVerified: { type: Boolean, default: false },
  role: { type: String, default: 'user', enum: ['user', 'admin', 'manager'] },
  assignedShops: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  pricingTier: { type: Number, default: 1 }, 
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
  glassType: [{ type: String }], 
  urgency: { type: String, default: 'Standard' }, 
  diamondCutType: { type: String, default: 'Standard' }, 
  engravingCount: { type: Number, default: 0 },
  shapeChange: { type: Boolean, default: false },
  statut: { type: String, default: 'En attente' },
  createdBy: { type: String, default: 'Client' },
  photoUrl: { type: String },
  dateReception: { type: Date, default: Date.now }
}, { collection: 'montages' });
const Montage = mongoose.models.Montage || mongoose.model("Montage", montageSchema);

const factureSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    clientName: String,
    invoiceNumber: { type: String, required: true, unique: true },
    dateEmission: { type: Date, default: Date.now },
    totalHT: Number,
    totalTTC: Number,
    amountPaid: { type: Number, default: 0 },
    paymentStatus: { type: String, default: 'Non payé' },
    montagesReferences: [{ type: String }],
    invoiceData: { type: Array, default: [] }, 
    pdfUrl: { type: String, default: '#' }
});
const Facture = mongoose.models.Facture || mongoose.model("Facture", factureSchema);

const upload = multer({ dest: os.tmpdir(), limits: { fileSize: 5 * 1024 * 1024 } });
const resend = new Resend(process.env.RESEND_API_KEY);
const SALT_ROUNDS = 10;
const EMAIL_SENDER = "ne-pas-repondre@l-atelier-des-arts.com";
const EMAIL_ADMIN = "atelierdesarts.12@gmail.com";

// --- 4. EMAILS ---
const getEmailTemplate = (title, bodyContent, buttonUrl = null, buttonText = null) => {
    return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;font-family:Helvetica,Arial,sans-serif;background-color:#f4f4f5;">
        <table style="width:100%;border-collapse:collapse;"><tr><td style="padding:40px 20px;text-align:center;">
            <div style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:8px;overflow:hidden;text-align:left;">
                <div style="background-color:#000;padding:25px;text-align:center;"><h1 style="color:#fff;margin:0;font-size:22px;">L'Atelier des Arts</h1></div>
                <div style="padding:40px 30px;color:#333;">
                    <h2 style="margin-top:0;">${title}</h2>
                    <div style="font-size:16px;color:#4b5563;">${bodyContent}</div>
                    ${buttonUrl ? `<div style="text-align:center;margin-top:35px;"><a href="${buttonUrl}" style="background-color:#000;color:#fff;padding:14px 28px;text-decoration:none;border-radius:4px;font-weight:bold;">${buttonText}</a></div>` : ''}
                </div>
            </div>
        </td></tr></table>
    </body></html>`;
};

// --- 5. ROUTES ---

app.get("/api", (req, res) => res.json({ status: "En ligne", message: "API OK" }));

// --- AUTH & USERS ---
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email }).populate('assignedShops', 'nomSociete _id zipCity');
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ success: false, message: "Identifiants invalides." });
    if (!user.isVerified) return res.status(403).json({ success: false, message: "Compte non validé." });
    res.json({ success: true, user: { id: user._id, email: user.email, nomSociete: user.nomSociete, siret: user.siret, role: user.role, assignedShops: user.assignedShops, pricingTier: user.pricingTier } });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

app.post("/api/inscription", upload.single('pieceJointe'), async (req, res) => {
  const { nomSociete, email, siret, password, phone, address, zipCity } = req.body;
  try {
    if (await User.findOne({ email })) return res.status(409).json({ success: false });
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    await User.create({ email, password: hashedPassword, nomSociete, siret, phone, address, zipCity, role: 'user' });
    try { await resend.emails.send({ from: EMAIL_SENDER, to: EMAIL_ADMIN, subject: `🔔 Inscription : ${nomSociete}`, html: `<p>Nouvelle inscription: ${nomSociete}</p>` }); } catch (e) {}
    res.status(200).json({ success: true });
  } catch (error) { res.status(500).json({ success: false }); }
});

app.get("/api/users", async (req, res) => {
    try { const users = await User.find({ role: { $ne: 'admin' } }).select('-password'); res.json({ success: true, users }); } catch (e) { res.status(500).json({ success: false }); }
});

app.put("/api/users/:id", async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('assignedShops', 'nomSociete _id zipCity');
    res.json({ success: true, user });
  } catch (error) { res.status(500).json({ success: false }); }
});

// --- MONTAGES ---

// 1. CRÉATION (POST) - SÉCURISÉ
app.post("/api/montages", async (req, res) => {
    try {
        console.log("📝 Création montage:", req.body.reference);
        
        // SÉCURITÉ : Vérifier l'ID avant de créer pour éviter le crash 500
        if (!req.body.userId || !mongoose.Types.ObjectId.isValid(req.body.userId)) {
             return res.status(400).json({ success: false, message: "ID Utilisateur invalide. Veuillez vous reconnecter." });
        }

        const m = await Montage.create({ ...req.body, dateReception: Date.now(), statut: 'En attente' });
        res.json({ success: true, montage: m });
    } catch (e) { 
        console.error("❌ Erreur Création:", e);
        res.status(500).json({ success: false, message: e.message }); 
    }
});

// 2. LISTE OPTIMISÉE (GET) - SÉCURISÉ (Anti-Crash 500)
// 2. LISTE (GET) - VERSION FINALE (On autorise l'affichage des photos)
app.get("/api/montages", async (req, res) => {
    try {
        const { role, userId, managerId } = req.query;
        let query = {};
        
        if (role === 'manager' && managerId) {
            if (mongoose.Types.ObjectId.isValid(managerId)) {
                const manager = await User.findById(managerId);
                const shopIds = (manager?.assignedShops || []).filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id));
                query = { userId: { $in: shopIds } };
            }
        } else if (role !== 'admin' && userId) {
            if (mongoose.Types.ObjectId.isValid(userId)) {
                query = { userId: new mongoose.Types.ObjectId(userId) };
            } else {
                return res.json({ success: true, montages: [] }); 
            }
        }

        // On récupère les montages normalement
        const montages = await Montage.find(query).sort({ dateReception: -1 }).lean();

        // 🚨 C'EST ICI LE CHANGEMENT :
        // On renvoie la vraie photoUrl (le lien Cloudinary) au lieu de null.
        // Le frontend pourra donc afficher l'Œil si le lien existe.
        res.json({ success: true, montages });
        
    } catch (e) { 
        console.error("❌ Erreur Liste:", e);
        res.json({ success: true, montages: [] }); 
    }
});

// 3. RECUPERATION PHOTO UNIQUE (GET /:id)
app.get("/api/montages/:id", async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ success: false });
        const m = await Montage.findById(req.params.id);
        res.json({ success: true, montage: m });
    } catch (e) { res.status(500).json({ success: false }); }
});

// 4. MISE A JOUR (PUT)
app.put("/api/montages/:id", async (req, res) => {
    try {
        const m = await Montage.findByIdAndUpdate(req.params.id, req.body, { new: true });
        
        if (req.body.statut) {
            try {
                const user = await User.findById(m.userId);
                if (user) {
                    let title = `Mise à jour : ${m.reference}`;
                    let body = `<p>Le statut de votre dossier <strong>${m.reference}</strong> est passé à : <strong>${req.body.statut}</strong></p>`;
                    await resend.emails.send({
                        from: EMAIL_SENDER,
                        to: user.email,
                        subject: title,
                        html: getEmailTemplate(title, body, "https://l-atelier-des-arts.com/espace-pro", "Voir mon dossier")
                    });
                }
            } catch(e) { console.error("Erreur mail statut", e); }
        }
        res.json({ success: true, montage: m });
    } catch (e) { res.status(500).json({ success: false }); }
});

// 5. SUPPRESSION (DELETE)
app.delete("/api/montages/:id", async (req, res) => {
    try { await Montage.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (e) { res.status(500).json({ success: false }); }
});

// 6. UPLOAD PHOTO (POST)
app.post("/api/montages/:id/photo", upload.single('photo'), async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false });
    try {
        const imgBuffer = fs.readFileSync(req.file.path);
        const base64 = `data:${req.file.mimetype};base64,${imgBuffer.toString('base64')}`;
        await Montage.findByIdAndUpdate(req.params.id, { photoUrl: base64 });
        fs.unlinkSync(req.file.path);
        res.json({ success: true, montage: { photoUrl: base64 } });
    } catch (e) { res.status(500).json({ success: false }); }
});

// --- FACTURES ---
app.post("/api/factures", async (req, res) => {
    try {
        const f = await Facture.create({ ...req.body, paymentStatus: 'Non payé' });
        if (req.body.sendEmail && req.body.pdfBase64) {
            const user = await User.findById(req.body.userId);
            const buffer = Buffer.from(req.body.pdfBase64.split('base64,')[1], 'base64');
            await resend.emails.send({ from: EMAIL_SENDER, to: user.email, cc: EMAIL_ADMIN, subject: `Facture ${req.body.invoiceNumber}`, html: `<p>Ci-joint votre facture.</p>`, attachments: [{ filename: `Facture_${req.body.invoiceNumber}.pdf`, content: buffer }] });
        }
        res.json({ success: true, facture: f });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get("/api/factures", async (req, res) => {
    try {
        const query = req.query.userId ? { userId: req.query.userId } : {};
        const factures = await Facture.find(query).sort({ dateEmission: -1 });
        res.json({ success: true, factures });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.put("/api/factures/:id", async (req, res) => {
    try {
        const f = await Facture.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, facture: f });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.delete("/api/factures/:id", async (req, res) => {
    try { await Facture.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (e) { res.status(500).json({ success: false }); }
});

// CONTACT & MDP
app.post("/api/contact", upload.none(), async (req, res) => {
    try {
        await resend.emails.send({ from: EMAIL_SENDER, to: EMAIL_ADMIN, reply_to: req.body.email, subject: `Contact: ${req.body.objet}`, html: `<p>${req.body.name} (${req.body.phone}) : ${req.body.message}</p>` });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post("/api/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user) {
        const tempPassword = Math.random().toString(36).slice(-8).toUpperCase();
        user.password = await bcrypt.hash(tempPassword, SALT_ROUNDS);
        await user.save();
        await resend.emails.send({ from: EMAIL_SENDER, to: user.email, subject: "Nouveau mot de passe", html: getEmailTemplate("Mot de passe oublié", `<p>Votre mot de passe temporaire : <strong>${tempPassword}</strong></p>`) });
    }
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false }); }
});
// --- ROUTE DE NETTOYAGE D'URGENCE ---
// Cette route va supprimer les photos "lourdes" (Base64) mais GARDER les liens Cloudinary
app.get("/api/clean-database", async (req, res) => {
    try {
        console.log("🧹 Démarrage du nettoyage...");
        
        // On met à jour tous les montages dont la photo commence par "data:image" (le vieux format lourd)
        // On ne touche PAS à ceux qui commencent par "http" (Cloudinary)
        const result = await Montage.updateMany(
            { photoUrl: { $regex: /^data:image/ } }, 
            { $set: { photoUrl: null } } 
        );

        console.log(`✅ Nettoyage terminé : ${result.modifiedCount} photos supprimées.`);
        res.json({ 
            success: true, 
            message: `Nettoyage réussi ! ${result.modifiedCount} anciennes photos lourdes ont été supprimées. Vos liens Cloudinary sont intacts.` 
        });
    } catch (e) {
        console.error("Erreur nettoyage:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

export default app;