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

// --- 1. CONFIGURATION CORS (Revue pour éviter les crashs) ---
const allowedOrigins = [
  "https://l-atelier-des-arts.com",
  "https://www.l-atelier-des-arts.com",
  "https://atelier4.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000"
];

app.use(cors({
  origin: (origin, callback) => {
    // Autoriser les requêtes sans origine (ex: Postman ou serveur à serveur)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      // Origine autorisée
      return callback(null, true);
    } else {
      // Origine non listée : on log mais on ne crash pas
      console.log("Origine bloquée par CORS:", origin);
      return callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// ✅ CORRECTION DU CRASH ICI :
// Au lieu de app.options('*', cors()), on utilise une Regex.
// Cela force la réponse "OK" pour les pré-vérifications sans faire planter le routeur.
app.options(/(.*)/, cors());

app.use(express.json({ limit: '10mb' }));

// --- 2. GESTION BASE DE DONNÉES (Anti-Crash) ---
let isConnected = false;
const connectDB = async () => {
  if (isConnected) return;
  try {
    if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI manquant dans les variables d'environnement Vercel");
    }
    await mongoose.connect(process.env.MONGODB_URI);
    isConnected = true;
    console.log("✅ Connecté à MongoDB");
  } catch (error) {
    console.error("❌ Erreur connexion DB:", error);
  }
};

// Middleware pour connecter la DB à chaque requête
app.use(async (req, res, next) => {
    await connectDB();
    next();
});

// --- 3. VOS MODÈLES ---

// User Schema
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

// Montage Schema
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

// Facture Schema
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

// --- 4. ROUTES ---

// Route de test
app.get("/api", (req, res) => {
    res.json({ status: "En ligne", message: "API Backend Fonctionnelle" });
});

// LOGIN
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email }).populate('assignedShops', 'nomSociete _id zipCity');
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, message: "Identifiants invalides." });
    }
    if (!user.isVerified) {
      return res.status(403).json({ success: false, message: "Compte non validé." });
    }
    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        nomSociete: user.nomSociete,
        siret: user.siret,
        phone: user.phone,
        address: user.address,
        zipCity: user.zipCity,
        role: user.role || 'user',
        assignedShops: user.assignedShops || [],
        pricingTier: user.pricingTier || 1
      }
    });
  } catch (error) {
    console.error("Erreur Login:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// INSCRIPTION
app.post("/api/inscription", upload.single('pieceJointe'), async (req, res) => {
  const { nomSociete, email, siret, password, phone, address, zipCity } = req.body;
  
  if (!nomSociete || !email || !password) {
      return res.status(400).json({ success: false, message: "Champs obligatoires manquants" });
  }

  try {
    if (await User.findOne({ email })) {
      return res.status(409).json({ success: false, message: "Email déjà utilisé." });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    await User.create({
      email,
      password: hashedPassword,
      nomSociete,
      siret,
      phone,
      address,
      zipCity,
      isVerified: false, 
      role: 'user',
      assignedShops: [] 
    });

    // Envoi notification ADMIN
    try {
        await resend.emails.send({
            from: "ne-pas-repondre@l-atelier-des-arts.com",
            to: "atelierdesarts.12@gmail.com",
            subject: `🔔 Nouvelle inscription : ${nomSociete}`,
            html: `<h1>Nouvelle demande</h1><p>Société: ${nomSociete}</p><p>Email: ${email}</p>`
        });
    } catch (e) { console.error("Erreur mail admin", e); }

    res.status(200).json({ success: true });

  } catch (error) {
    console.error("Erreur Inscription:", error);
    res.status(500).json({ success: false, message: "Erreur serveur inscription." });
  }
});

// Route Contact (si nécessaire)
app.post("/api/contact", upload.none(), async (req, res) => {
    const { name, email, message, phone, objet } = req.body;
    try {
        await resend.emails.send({ 
            from: "ne-pas-repondre@l-atelier-des-arts.com", 
            to: "atelierdesarts.12@gmail.com",
            reply_to: email, 
            subject: `Contact: ${objet}`, 
            html: `<p>${name} (${phone}) a écrit : ${message}</p>` 
        });
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
});

// IMPORTANT : Vos autres routes (Montages, Factures, Users, etc.) doivent être ajoutées ici si elles manquent dans cet extrait.
// ...

// Export par défaut
export default app;