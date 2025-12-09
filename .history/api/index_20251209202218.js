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

// --- 1. CONFIGURATION CORS SÉCURISÉE ---
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
      console.log("Origine bloquée par CORS:", origin);
      return callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// ✅ ANTI-CRASH : Regex pour les pré-vérifications (OPTIONS)
app.options(/(.*)/, cors());

app.use(express.json({ limit: '10mb' }));

// --- 2. GESTION BASE DE DONNÉES ---
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

// Middleware de connexion DB pour chaque requête
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

// --- 4. ROUTES ---

// Test
app.get("/api", (req, res) => res.json({ status: "En ligne", message: "API OK" }));

// AUTH : Login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email }).populate('assignedShops', 'nomSociete _id zipCity');
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ success: false, message: "Identifiants invalides." });
    if (!user.isVerified) return res.status(403).json({ success: false, message: "Compte non validé." });
    res.json({ success: true, user: { id: user._id, email: user.email, nomSociete: user.nomSociete, siret: user.siret, phone: user.phone, address: user.address, zipCity: user.zipCity, role: user.role, assignedShops: user.assignedShops, pricingTier: user.pricingTier } });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// AUTH : Inscription
app.post("/api/inscription", upload.single('pieceJointe'), async (req, res) => {
  const { nomSociete, email, siret, password, phone, address, zipCity } = req.body;
  if (!nomSociete || !email || !password) return res.status(400).json({ success: false });
  try {
    if (await User.findOne({ email })) return res.status(409).json({ success: false, message: "Email déjà utilisé." });
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    await User.create({ email, password: hashedPassword, nomSociete, siret, phone, address, zipCity, role: 'user', assignedShops: [] });
    // Email Admin
    try { await resend.emails.send({ from: EMAIL_SENDER, to: EMAIL_ADMIN, subject: `Inscription : ${nomSociete}`, html: `<p>${nomSociete} s'est inscrit.</p>` }); } catch (e) {}
    res.status(200).json({ success: true });
  } catch (error) { res.status(500).json({ success: false }); }
});

// USERS
app.get("/api/users", async (req, res) => {
    try {
        const users = await User.find({ role: { $ne: 'admin' } }).select('-password');
        res.json({ success: true, users });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.put("/api/users/:id", async (req, res) => {
    try {
        const updates = { ...req.body };
        // Gestion mot de passe si présent
        if (updates.newPassword && updates.currentPassword) {
            const user = await User.findById(req.params.id);
            if (await bcrypt.compare(updates.currentPassword, user.password)) {
                updates.password = await bcrypt.hash(updates.newPassword, SALT_ROUNDS);
            }
        }
        const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).populate('assignedShops', 'nomSociete _id zipCity');
        res.json({ success: true, user });
    } catch (e) { res.status(500).json({ success: false }); }
});

// MONTAGES
app.post("/api/montages", async (req, res) => {
    try {
        const m = await Montage.create({ ...req.body, dateReception: Date.now(), statut: 'En attente' });
        res.json({ success: true, montage: m });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get("/api/montages", async (req, res) => {
    try {
        const { role, userId, managerId } = req.query;
        let query = {};
        if (role === 'manager' && managerId) {
            const manager = await User.findById(managerId);
            query = { userId: { $in: manager.assignedShops } };
        } else if (role !== 'admin' && userId) {
            query = { userId };
        }
        const montages = await Montage.find(query).sort({ dateReception: -1 });
        res.json({ success: true, montages });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.put("/api/montages/:id", async (req, res) => {
    try {
        const m = await Montage.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, montage: m });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.delete("/api/montages/:id", async (req, res) => {
    try { await Montage.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (e) { res.status(500).json({ success: false }); }
});

app.post("/api/montages/:id/photo", upload.single('photo'), async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false });
    try {
        const imgBuffer = fs.readFileSync(req.file.path);
        const base64 = `data:${req.file.mimetype};base64,${imgBuffer.toString('base64')}`;
        const m = await Montage.findByIdAndUpdate(req.params.id, { photoUrl: base64 }, { new: true });
        fs.unlinkSync(req.file.path);
        res.json({ success: true, montage: m });
    } catch (e) { res.status(500).json({ success: false }); }
});

// FACTURES
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
        const f = await Facture.findById(req.params.id);
        if (req.body.amountPaid !== undefined) {
            f.amountPaid = req.body.amountPaid;
            f.paymentStatus = (f.amountPaid >= f.totalTTC - 0.1) ? 'Payé' : (f.amountPaid > 0 ? 'Partiellement payé' : 'Non payé');
        }
        await f.save();
        res.json({ success: true, facture: f });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.delete("/api/factures/:id", async (req, res) => {
    try { await Facture.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (e) { res.status(500).json({ success: false }); }
});

// CONTACT
app.post("/api/contact", upload.none(), async (req, res) => {
    try {
        await resend.emails.send({ from: EMAIL_SENDER, to: EMAIL_ADMIN, reply_to: req.body.email, subject: `Contact: ${req.body.objet}`, html: `<p>${req.body.name} (${req.body.phone}) : ${req.body.message}</p>` });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

export default app;