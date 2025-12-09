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

// Configuration CORS
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
  role: { type: String, default: 'user', enum: ['user', 'admin','manager'] },
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

// ✅ 1. INSCRIPTION (ROBUSTE)
app.post("/api/inscription", upload.single('pieceJointe'), async (req, res) => {
  await connectDB();
  const { nomSociete, email, siret, password, phone, address, zipCity } = req.body;

  // Validation de base
  if (!nomSociete || !email || !siret || !password) {
    return res.status(400).json({ success: false, message: "Champs manquants" });
  }

  try {
    // Vérification existence
    if (await User.findOne({ email })) {
      return res.status(409).json({ success: false, message: "Email déjà utilisé." });
    }

    // Création Utilisateur (ÉTAPE CRITIQUE)
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
      role: 'user'
    });

    // --- À PARTIR D'ICI, L'INSCRIPTION EST RÉUSSIE ---
    // Les erreurs d'emails ou de fichiers ne doivent plus bloquer la réponse "succès"

    let attachments = [];
    if (req.file) {
        try {
            const fileContent = fs.readFileSync(req.file.path);
            attachments.push({ filename: req.file.originalname, content: fileContent });
        } catch (readError) {
            console.error("⚠️ Erreur lecture fichier (non critique):", readError);
        }
    }

    // Tentative envoi Email Admin
    try {
        await resend.emails.send({
            from: EMAIL_SENDER,
            to: EMAIL_ADMIN,
            subject: `🔔 Nouvelle inscription : ${nomSociete}`,
            attachments: attachments,
            html: `
                <h1>Nouvelle demande d'inscription</h1>
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <tr><td><strong>Société :</strong></td><td>${nomSociete}</td></tr>
                <tr><td><strong>Email :</strong></td><td>${email}</td></tr>
                <tr><td><strong>SIRET :</strong></td><td>${siret}</td></tr>
                <tr><td><strong>Téléphone :</strong></td><td>${phone || 'Non renseigné'}</td></tr>
                <tr><td><strong>Adresse :</strong></td><td>${address || ''} ${zipCity || ''}</td></tr>
                </table>
            `
        });
    } catch (mailError) {
        console.error("⚠️ Erreur Email Admin:", mailError);
    }

    // Tentative envoi Email Client
    try {
        await resend.emails.send({
            from: EMAIL_SENDER,
            to: email,
            subject: `Confirmation d'inscription - L'Atelier des Arts`,
            html: `
                <div style="font-family: Arial, sans-serif; color: #333;">
                <h1 style="color: #000;">Bienvenue, ${nomSociete}.</h1>
                <p>Nous avons bien reçu votre demande d'inscription.</p>
                <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
                    <strong style="color: #856404;">Statut : En attente de validation</strong>
                    <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">
                    Notre équipe va vérifier vos informations professionnelles (SIRET). 
                    Vous recevrez un email de confirmation dès que votre compte sera activé.
                    </p>
                </div>
                </div>
            `
        });
    } catch (mailError) {
        console.error("⚠️ Erreur Email Client:", mailError);
    }

    // Nettoyage fichier (Safe delete)
    if (req.file && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (e) { console.error("Erreur suppression fichier temp"); }
    }

    // ✅ RÉPONSE FINALE : SUCCÈS (Quoi qu'il arrive aux mails)
    res.status(200).json({ success: true });

  } catch (error) {
    console.error("ERREUR CRITIQUE INSCRIPTION:", error);
    // Nettoyage en cas de crash critique
    if (req.file && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    res.status(500).json({ success: false, message: "Erreur serveur lors de l'inscription." });
  }
});

// ✅ ROUTE CONTACT (Admin + Confirmation Client)
app.post("/api/contact", upload.none(), async (req, res) => {
    const { name, email, message, phone, objet } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ success: false, message: "Tous les champs requis sont obligatoires." });
    }

    try {
        // Email Admin
        try {
            await resend.emails.send({
                from: EMAIL_SENDER,
                to: EMAIL_ADMIN,
                reply_to: email, 
                subject: `📩 Nouveau message : ${objet || 'Sans objet'}`,
                html: `
                    <div style="font-family: Arial, sans-serif;">
                        <h2>Nouveau message reçu depuis le site</h2>
                        <p><strong>De :</strong> ${name}</p>
                        <p><strong>Email :</strong> ${email}</p>
                        <p><strong>Téléphone :</strong> ${phone || 'Non renseigné'}</p>
                        <hr />
                        <h3>Message :</h3>
                        <p style="white-space: pre-wrap;">${message}</p>
                    </div>
                `
            });
        } catch (e) { console.error("Erreur mail admin contact", e); }

        // Email Client
        try {
            await resend.emails.send({
                from: EMAIL_SENDER,
                to: email,
                subject: "Nous avons bien reçu votre message - L'Atelier des Arts",
                html: `
                    <div style="font-family: Arial, sans-serif; color: #333;">
                        <h2 style="color: #000;">Bonjour ${name},</h2>
                        <p>Nous accusons bonne réception de votre message.</p>
                        <p>Notre équipe va en prendre connaissance et reviendra vers vous <strong>dans les plus brefs délais</strong>.</p>
                        <br/>
                        <p>Merci de votre confiance,</p>
                        <p><strong>L'Atelier des Arts</strong></p>
                    </div>
                `
            });
        } catch (e) { console.error("Erreur mail client contact", e); }

        res.json({ success: true, message: "Messages envoyés." });
    } catch (error) {
        console.error("Erreur contact:", error);
        res.status(500).json({ success: false, message: "Erreur lors de l'envoi." });
    }
});

// LOGIN
app.post("/api/login", async (req, res) => {
  await connectDB();
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, message: "Identifiants invalides." });
    }
    if (!user.isVerified) {
      return res.status(403).json({ success: false, message: "Votre compte est en attente de validation." });
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
        role: user.role || 'user'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// MISE À JOUR & VALIDATION
app.put("/api/users/:id", async (req, res) => {
  await connectDB();
  const { id } = req.params;
  const { nomSociete, email, siret, phone, address, zipCity, currentPassword, newPassword, isVerified } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false });

    if ((email && email !== user.email || newPassword) && !currentPassword) {
       return res.status(400).json({ success: false, message: "Mot de passe actuel requis." });
    }
    
    // Notification validation
    if (isVerified === true && user.isVerified === false) {
       try {
           await resend.emails.send({
            from: EMAIL_SENDER,
            to: user.email,
            subject: `🎉 Votre compte est validé !`,
            html: `
              <div style="font-family: Arial, sans-serif; color: #333;">
                <h1 style="color: #000;">Félicitations ${user.nomSociete} !</h1>
                <p>Votre compte est validé.</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://atelier4.vercel.app/espace-pro" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Accéder à mon Espace Pro</a>
                </div>
              </div>
            `
          });
       } catch (e) { console.error("Erreur mail validation", e); }
    }

    if (isVerified !== undefined) user.isVerified = isVerified;
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

    if (newPassword && currentPassword) {
       const isMatch = await bcrypt.compare(currentPassword, user.password);
       if (!isMatch) return res.status(401).json({ success: false });
       user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    }

    await user.save();
    res.json({ success: true, user: { id: user._id, email: user.email, nomSociete: user.nomSociete, siret: user.siret, role: user.role, isVerified: user.isVerified }});
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// LISTE UTILISATEURS
app.get("/api/users", async (req, res) => {
  await connectDB();
  try {
    const users = await User.find({ role: { $ne: 'admin' } }).select('-password');
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- AUTRES ROUTES (MONTAGES/FACTURES) ---
// (Je garde vos routes existantes telles quelles car elles fonctionnaient)

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
app.post("/api/montages", async (req, res) => {
    await connectDB();
    // On récupère 'createdBy'
    const { userId, description, category, reference, frame, glassType, urgency, diamondCutType, engravingCount, shapeChange, createdBy } = req.body; 
    try {
        const user = await User.findById(userId); // userId est celui du magasin CIBLE
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
            createdBy: createdBy || "Client", // ✅ On enregistre qui a fait l'action
            dateReception: Date.now() 
        });
        res.json({ success: true, montage: newMontage });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});
app.get("/api/montages", async (req, res) => {
    await connectDB();
    const { userId, role } = req.query;
    try {
        let montages;
        if (role === 'admin') { montages = await Montage.find().sort({ dateReception: -1 }); } else { montages = await Montage.find({ userId }).sort({ dateReception: -1 }); }
        res.json({ success: true, montages });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

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
app.put("/api/montages/:id", async (req, res) => {
    await connectDB();
    const { id } = req.params;
    const updateData = req.body;
    try {
        // 1. Récupérer l'ancien pour comparer le statut
        const oldMontage = await Montage.findById(id);
        if (!oldMontage) return res.status(404).json({ success: false, message: "Montage non trouvé." });

        // 2. Mise à jour
        const updatedMontage = await Montage.findByIdAndUpdate(id, updateData, { new: true });

        // 3. Email si changement de statut
        if (updateData.statut && updateData.statut !== oldMontage.statut) {
            try {
                const client = await User.findById(updatedMontage.userId);
                if (client && client.email) {
                    await resend.emails.send({
                        from: EMAIL_SENDER,
                        to: client.email,
                        subject: `Mise à jour dossier ${updatedMontage.reference} - ${updateData.statut}`,
                        html: `
                            <div style="font-family: Arial, sans-serif; color: #333;">
                                <h2>Mise à jour de votre montage</h2>
                                <p>Bonjour ${client.nomSociete},</p>
                                <p>Le statut de votre dossier <strong>Ref: ${updatedMontage.reference}</strong> (Monture: ${updatedMontage.frame}) a évolué.</p>
                                <div style="padding: 15px; background-color: #f4f4f4; border-left: 4px solid #000; margin: 20px 0;">
                                    <p style="margin:0;">Nouveau statut : <strong>${updateData.statut}</strong></p>
                                </div>
                                <p>Connectez-vous à votre espace pro pour plus de détails.</p>
                                <p>L'Atelier des Arts</p>
                            </div>
                        `
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

app.post("/api/factures", async (req, res) => { 
  await connectDB(); 
  const { userId, invoiceNumber, totalHT, totalTTC, montagesReferences, clientName, dateEmission, pdfUrl, invoiceData, pdfBase64, sendEmail } = req.body; 
  if (!userId || !invoiceNumber) { return res.status(400).json({ success: false, message: "Incomplet." }); } 
  try { 
    if (await Facture.findOne({ invoiceNumber })) { return res.status(409).json({ success: false, message: "Existe déjà." }); } 
    const newFacture = await Facture.create({ userId, invoiceNumber, totalHT, totalTTC, montagesReferences, clientName, dateEmission, pdfUrl, invoiceData: invoiceData || [], amountPaid: 0, paymentStatus: 'Non payé' }); 
    if (sendEmail && pdfBase64) { 
        try {
            const user = await User.findById(userId); 
            if (user && user.email) { 
                const pdfBuffer = Buffer.from(pdfBase64.split('base64,')[1], 'base64'); 
                await resend.emails.send({ from: EMAIL_SENDER, to: user.email, cc: EMAIL_ADMIN, subject: `Facture ${invoiceNumber}`, html: `<p>Bonjour,</p><p>Ci-joint votre facture.</p>`, attachments: [{ filename: `Facture_${invoiceNumber}.pdf`, content: pdfBuffer }], }); 
            }
        } catch(e) { console.error("Erreur mail facture", e); }
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