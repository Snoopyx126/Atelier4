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
  role: { type: String, default: 'user', enum: ['user', 'admin', 'manager'] },
  // ✅ NOUVEAU : Liste des magasins assignés à ce manager (stocke les IDs des users)
  assignedShops: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
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
    paymentStatus: { type: String, default: 'Non payé', enum: ['Non payé', 'Partiellement payé', 'Payé'] },
    montagesReferences: [{ type: String }],
    invoiceData: { type: Array, default: [] }, 
    pdfUrl: { type: String, default: '#' }, 
    isPublished: { type: Boolean, default: true }
});
const Facture = mongoose.models.Facture || mongoose.model("Facture", factureSchema);

const upload = multer({ dest: os.tmpdir(), limits: { fileSize: 5 * 1024 * 1024 } });
const resend = new Resend(process.env.RESEND_API_KEY);
const SALT_ROUNDS = 10;

// --- ROUTES ---

// INSCRIPTION
app.post("/api/inscription", upload.single('pieceJointe'), async (req, res) => {
  await connectDB();
  const { nomSociete, email, siret, password, phone, address, zipCity } = req.body;

  if (!nomSociete || !email || !siret || !password) {
    return res.status(400).json({ success: false, message: "Champs manquants" });
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
      assignedShops: [] // Init vide
    });

    let attachments = [];
    if (req.file) {
        try {
            const fileContent = fs.readFileSync(req.file.path);
            attachments.push({ filename: req.file.originalname, content: fileContent });
        } catch (readError) {
            console.error("⚠️ Erreur lecture fichier:", readError);
        }
    }

    try {
        await resend.emails.send({
            from: EMAIL_SENDER,
            to: EMAIL_ADMIN,
            subject: `🔔 Nouvelle inscription : ${nomSociete}`,
            attachments: attachments,
            html: `<h1>Nouvelle demande</h1><p>Société: ${nomSociete}</p><p>Email: ${email}</p>`
        });
    } catch (e) {}

    try {
        await resend.emails.send({
            from: EMAIL_SENDER,
            to: email,
            subject: `Confirmation d'inscription`,
            html: `<h1>Bienvenue, ${nomSociete}.</h1><p>Compte en attente de validation.</p>`
        });
    } catch (e) {}

    if (req.file && fs.existsSync(req.file.path)) { try { fs.unlinkSync(req.file.path); } catch (e) {} }
    res.status(200).json({ success: true });

  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) { try { fs.unlinkSync(req.file.path); } catch (e) {} }
    res.status(500).json({ success: false, message: "Erreur serveur." });
  }
});

// LOGIN (Renvoie aussi assignedShops)
app.post("/api/login", async (req, res) => {
  await connectDB();
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email }).populate('assignedShops', 'nomSociete _id zipCity'); // On peuple pour avoir les noms directement
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
        assignedShops: user.assignedShops || [] // Renvoie la liste des magasins assignés
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// MISE À JOUR USER (Gère assignedShops)
app.put("/api/users/:id", async (req, res) => {
  await connectDB();
  const { id } = req.params;
  const { nomSociete, email, siret, phone, address, zipCity, currentPassword, newPassword, isVerified, assignedShops } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false });

    // Validation compte
    if (isVerified === true && user.isVerified === false) {
       try {
           await resend.emails.send({
            from: EMAIL_SENDER,
            to: user.email,
            subject: `🎉 Compte validé !`,
            html: `<h1>Félicitations ${user.nomSociete} !</h1><p>Votre compte est validé.</p>`
          });
       } catch (e) {}
    }

    if (assignedShops !== undefined) user.assignedShops = assignedShops; // ✅ Mise à jour des magasins assignés
    if (isVerified !== undefined) user.isVerified = isVerified;
    if (nomSociete !== undefined) user.nomSociete = nomSociete;
    if (siret !== undefined) user.siret = siret;
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;
    if (zipCity !== undefined) user.zipCity = zipCity;

    if (email && email !== user.email) {
      if (await User.findOne({ email })) return res.status(409).json({ success: false, message: "Email pris." });
      user.email = email;
    }
    if (newPassword && currentPassword) {
       if (!(await bcrypt.compare(currentPassword, user.password))) return res.status(401).json({ success: false });
       user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    }

    await user.save();
    
    // On repopule pour renvoyer les objets complets
    const populatedUser = await User.findById(id).populate('assignedShops', 'nomSociete _id zipCity');
    
    res.json({ success: true, user: { 
        id: populatedUser._id, 
        email: populatedUser.email, 
        nomSociete: populatedUser.nomSociete, 
        siret: populatedUser.siret, 
        role: populatedUser.role, 
        isVerified: populatedUser.isVerified,
        assignedShops: populatedUser.assignedShops 
    }});
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// LISTE UTILISATEURS
app.get("/api/users", async (req, res) => {
  await connectDB();
  try {
    // On renvoie tout sauf l'admin principal, et on peuple les assignedShops pour l'affichage admin
    const users = await User.find({ role: { $ne: 'admin' } }).select('-password').populate('assignedShops', 'nomSociete');
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- MONTAGES ---

app.post("/api/montages", async (req, res) => {
    await connectDB();
    const { userId, description, category, reference, frame, glassType, urgency, diamondCutType, engravingCount, shapeChange, createdBy } = req.body; 
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
            createdBy: createdBy || "Client",
            dateReception: Date.now() 
        });
        res.json({ success: true, montage: newMontage });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ✅ GET MONTAGES : Logique avancée pour Manager
app.get("/api/montages", async (req, res) => {
    await connectDB();
    const { userId, role, managerId } = req.query; // managerId envoyé si c'est un manager qui demande
    try {
        let montages;
        
        if (role === 'admin') {
            // Admin voit tout
            montages = await Montage.find().sort({ dateReception: -1 });
        } else if (role === 'manager' && managerId) {
            // Manager : Récupère ses magasins assignés
            const manager = await User.findById(managerId);
            if (!manager) return res.status(404).json({ success: false, message: "Manager non trouvé" });
            
            // On cherche les montages appartenant aux magasins assignés
            montages = await Montage.find({ 
                userId: { $in: manager.assignedShops } 
            }).sort({ dateReception: -1 });
            
        } else {
            // User normal : voit ses propres montages
            montages = await Montage.find({ userId }).sort({ dateReception: -1 });
        }
        
        res.json({ success: true, montages });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// PUT MONTAGE (Notification statut)
app.put("/api/montages/:id", async (req, res) => {
    await connectDB();
    const { id } = req.params;
    const updateData = req.body;
    try {
        const oldMontage = await Montage.findById(id);
        if (!oldMontage) return res.status(404).json({ success: false, message: "Montage non trouvé." });

        const updatedMontage = await Montage.findByIdAndUpdate(id, updateData, { new: true });

        // Email si changement statut
        if (updateData.statut && updateData.statut !== oldMontage.statut) {
            try {
                const client = await User.findById(updatedMontage.userId);
                if (client && client.email) {
                    await resend.emails.send({
                        from: EMAIL_SENDER,
                        to: client.email,
                        subject: `Mise à jour dossier ${updatedMontage.reference} - ${updateData.statut}`,
                        html: `<p>Bonjour ${client.nomSociete},</p><p>Votre dossier ${updatedMontage.reference} est passé en statut : <strong>${updateData.statut}</strong>.</p>`
                    });
                }
            } catch (e) { console.error("Erreur mail statut", e); }
        }

        res.json({ success: true, montage: updatedMontage });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

app.post("/api/montages/:id/photo", upload.single('photo'), async (req, res) => {
    await connectDB();
    const { id } = req.params;
    if (!req.file) { return res.status(400).json({ success: false, message: "Aucun fichier." }); }
    try {
        const imgBuffer = fs.readFileSync(req.file.path);
        const base64Image = `data:${req.file.mimetype};base64,${imgBuffer.toString('base64')}`;
        const updatedMontage = await Montage.findByIdAndUpdate(id, { photoUrl: base64Image }, { new: true });
        fs.unlinkSync(req.file.path);
        res.json({ success: true, montage: updatedMontage });
    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); 
        res.status(500).json({ success: false, message: error.message });
    }
});

app.delete("/api/montages/:id", async (req, res) => {
    await connectDB();
    try { await Montage.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// --- FACTURES & CONTACT ---
app.post("/api/contact", upload.none(), async (req, res) => {
    const { name, email, message, phone, objet } = req.body;
    if (!name || !email || !message) return res.status(400).json({ success: false });
    try {
        try { await resend.emails.send({ from: EMAIL_SENDER, to: EMAIL_ADMIN, reply_to: email, subject: `Contact: ${objet}`, html: `<p>${name} (${phone}) a écrit : ${message}</p>` }); } catch (e) {}
        try { await resend.emails.send({ from: EMAIL_SENDER, to: email, subject: "Bien reçu", html: `<p>Bonjour ${name}, nous avons bien reçu votre message.</p>` }); } catch (e) {}
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.post("/api/factures", async (req, res) => { 
  await connectDB(); 
  const { userId, invoiceNumber, totalHT, totalTTC, montagesReferences, clientName, dateEmission, pdfUrl, invoiceData, pdfBase64, sendEmail } = req.body; 
  if (!userId || !invoiceNumber) { return res.status(400).json({ success: false }); } 
  try { 
    if (await Facture.findOne({ invoiceNumber })) { return res.status(409).json({ success: false }); } 
    const newFacture = await Facture.create({ userId, invoiceNumber, totalHT, totalTTC, montagesReferences, clientName, dateEmission, pdfUrl, invoiceData: invoiceData || [], amountPaid: 0, paymentStatus: 'Non payé' }); 
    if (sendEmail && pdfBase64) { 
        try {
            const user = await User.findById(userId); 
            if (user && user.email) { 
                const pdfBuffer = Buffer.from(pdfBase64.split('base64,')[1], 'base64'); 
                await resend.emails.send({ from: EMAIL_SENDER, to: user.email, cc: EMAIL_ADMIN, subject: `Facture ${invoiceNumber}`, html: `<p>Ci-joint votre facture.</p>`, attachments: [{ filename: `Facture_${invoiceNumber}.pdf`, content: pdfBuffer }], }); 
            }
        } catch(e) {}
    } 
    res.json({ success: true, facture: newFacture }); 
  } catch (error) { res.status(500).json({ success: false, message: error.message }); } 
});

app.get("/api/factures", async (req, res) => { 
  await connectDB(); 
  const { userId } = req.query; 
  try { 
    let query = {}; 
    if (userId) { query = { userId: userId }; } 
    const factures = await Facture.find(query).sort({ dateEmission: -1 }); 
    res.json({ success: true, factures }); 
  } catch (error) { res.status(500).json({ success: false, message: error.message }); } 
});

app.put("/api/factures/:id", async (req, res) => { 
  await connectDB(); 
  const { id } = req.params; 
  const { amountPaid } = req.body; 
  try { 
    const facture = await Facture.findById(id); 
    if (!facture) return res.status(404).json({ success: false }); 
    if (amountPaid !== undefined) { facture.amountPaid = amountPaid; } 
    if (facture.amountPaid >= facture.totalTTC - 0.1) { facture.paymentStatus = 'Payé'; } 
    else if (facture.amountPaid > 0) { facture.paymentStatus = 'Partiellement payé'; } 
    else { facture.paymentStatus = 'Non payé'; } 
    await facture.save(); 
    res.json({ success: true, facture }); 
  } catch (error) { res.status(500).json({ success: false, message: error.message }); } 
});

app.delete("/api/factures/:id", async (req, res) => { 
  await connectDB(); 
  try { await Facture.findByIdAndDelete(req.params.id); res.json({ success: true }); } 
  catch (error) { res.status(500).json({ success: false, message: error.message }); } 
});

export default app;