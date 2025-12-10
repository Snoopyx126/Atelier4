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
  
  if (!nomSociete || !email || !password) {
      return res.status(400).json({ success: false, message: "Champs manquants" });
  }

  try {
    if (await User.findOne({ email })) {
        return res.status(409).json({ success: false, message: "Email déjà utilisé." });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    await User.create({ email, password: hashedPassword, nomSociete, siret, phone, address, zipCity, role: 'user', assignedShops: [] });

    // 1. Email à l'ADMIN (Vous prévient)
    try { 
        await resend.emails.send({ 
            from: "ne-pas-repondre@l-atelier-des-arts.com", 
            to: "atelierdesarts.12@gmail.com", 
            subject: `🔔 Nouvelle inscription : ${nomSociete}`, 
            html: `<p>Société: ${nomSociete}<br>Email: ${email}<br>Siret: ${siret}</p>` 
        }); 
    } catch (e) { console.error("Erreur mail admin", e); }

    // 2. Email au CLIENT (Confirmation de réception) - ✅ AJOUTÉ ICI
    try {
        await resend.emails.send({
            from: "ne-pas-repondre@l-atelier-des-arts.com",
            to: email,
            subject: "Bienvenue - Votre demande est en cours de traitement",
            html: `
                <h1>Bonjour ${nomSociete},</h1>
                <p>Nous avons bien reçu votre demande d'ouverture de compte professionnel.</p>
                <p>Votre dossier est actuellement <strong>en attente de validation</strong> par notre équipe.</p>
                <p>Vous recevrez un nouvel email dès que votre compte sera activé.</p>
                <br>
                <p>Cordialement,<br>L'équipe Atelier des Arts</p>
            `
        });
    } catch (e) { console.error("Erreur mail client", e); }

    res.status(200).json({ success: true });

  } catch (error) { 
      console.error(error);
      res.status(500).json({ success: false }); 
  }
});
// USERS
app.get("/api/users", async (req, res) => {
    try {
        const users = await User.find({ role: { $ne: 'admin' } }).select('-password');
        res.json({ success: true, users });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.put("/api/users/:id", async (req, res) => {
  const { id } = req.params;
  const { nomSociete, email, siret, phone, address, zipCity, currentPassword, newPassword, isVerified, assignedShops, pricingTier } = req.body;
  
  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false });

    // ✅ DÉTECTION : Si le compte passe de "non validé" à "validé"
    if (isVerified === true && user.isVerified === false) {
       try { 
           await resend.emails.send({ 
               from: "ne-pas-repondre@l-atelier-des-arts.com", 
               to: user.email, 
               subject: "✅ Votre compte a été validé !", 
               html: `
                   <h1>Félicitations !</h1>
                   <p>Votre compte professionnel pour <strong>${user.nomSociete}</strong> est maintenant actif.</p>
                   <p>Vous pouvez dès à présent vous connecter et accéder à nos services :</p>
                   <p><a href="https://l-atelier-des-arts.com/espace-pro">Accéder à mon Espace Pro</a></p>
                   <br>
                   <p>À bientôt,<br>L'équipe Atelier des Arts</p>
               ` 
           }); 
       } catch (e) { console.error("Erreur mail validation", e); }
    }

    // Mise à jour des champs
    if (pricingTier !== undefined) user.pricingTier = pricingTier;
    if (assignedShops !== undefined) user.assignedShops = assignedShops;
    if (isVerified !== undefined) user.isVerified = isVerified;
    if (nomSociete !== undefined) user.nomSociete = nomSociete;
    if (siret !== undefined) user.siret = siret;
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;
    if (zipCity !== undefined) user.zipCity = zipCity;
    if (email && email !== user.email) user.email = email;
    
    if (newPassword && currentPassword) {
       if (await bcrypt.compare(currentPassword, user.password)) {
           user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
       }
    }

    await user.save();
    
    // On renvoie l'utilisateur mis à jour
    const updatedUser = await User.findById(id).populate('assignedShops', 'nomSociete _id zipCity');
    res.json({ success: true, user: updatedUser });

  } catch (error) { 
      console.error(error);
      res.status(500).json({ success: false }); 
  }
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