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
  allowedHeaders: ["Content-Type", "Authorization", "x-user-id", "x-user-role"]
}));

app.options(/(.*)/, cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-user-id", "x-user-role"]
}));
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
  dateReception: { type: Date, default: Date.now },
  statusHistory: [{ statut: { type: String }, date: { type: Date, default: Date.now } }]
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
                    ${buttonUrl ? `
                        <div style="text-align:center;margin-top:35px;">
                            <a href="${buttonUrl}" style="background-color:#000;color:#fff;padding:14px 28px;text-decoration:none;border-radius:4px;font-weight:bold;">${buttonText}</a>
                        </div>
                        <div style="margin-top:20px;padding:16px 20px;background-color:#FFF8EE;border-left:4px solid #C9A96E;border-radius:0 6px 6px 0;">
                            <p style="margin:0 0 6px;font-size:13px;font-weight:bold;color:#92600A;">🔑 Première connexion ?</p>
                            <p style="margin:0;font-size:13px;color:#92600A;line-height:1.5;">
                                Si c'est votre première connexion, rendez-vous sur 
                                <a href="https://l-atelier-des-arts.com/mot-de-passe-oublie" style="color:#92600A;font-weight:bold;text-decoration:underline;">Mot de passe oublié</a>
                                pour recevoir un mot de passe temporaire par email. Vous pourrez le modifier dans votre profil.
                            </p>
                        </div>
                    ` : ''}
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
    // Extraire les champs sensibles — ne pas les passer directement à MongoDB
    const { role, password, newPassword, currentPassword, pricingTier, assignedShops, isVerified, ...safeUpdate } = req.body;

    // Changement de mot de passe
    if (newPassword && currentPassword) {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ success: false, message: "Utilisateur introuvable" });
      const match = await bcrypt.compare(currentPassword, user.password);
      if (!match) return res.status(401).json({ success: false, message: "Mot de passe actuel incorrect" });
      safeUpdate.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    }

    // Champs réservés aux admins
    if (req.headers['x-user-role'] === 'admin') {
      if (role) safeUpdate.role = role;
      if (pricingTier !== undefined) safeUpdate.pricingTier = pricingTier;
      if (assignedShops !== undefined) safeUpdate.assignedShops = assignedShops;
      if (isVerified !== undefined) safeUpdate.isVerified = isVerified;
    }

    const updated = await User.findByIdAndUpdate(req.params.id, safeUpdate, { new: true })
      .select('-password')
      .populate('assignedShops', 'nomSociete _id zipCity');
    res.json({ success: true, user: updated });
  } catch (error) { console.error(error); res.status(500).json({ success: false }); }
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

        // ✅ CORRECTION : On écoute le statut envoyé par la modale, sinon on met "En attente"
        const statutFinal = req.body.statut ? req.body.statut : 'En attente';

        const m = await Montage.create({ 
            ...req.body, 
            dateReception: Date.now(), 
            statut: statutFinal 
        });
        
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
        const existing = await Montage.findById(req.params.id);
        if (!existing) return res.status(404).json({ success: false, message: "Dossier introuvable" });

        const statutChanged = req.body.statut && req.body.statut !== existing.statut;

        const update = { ...req.body };
        if (statutChanged) {
            update.$push = { statusHistory: { statut: req.body.statut, date: new Date() } };
            delete update.statusHistory;
        }

        const m = await Montage.findByIdAndUpdate(req.params.id, update, { new: true });

        if (statutChanged) {
            try {
                const user = await User.findById(m.userId);
                if (user && user.email) {
                    const statusEmoji = { 'En attente': '⏳', 'Reçu': '📦', 'En cours': '🔧', 'Terminé': '✅' };
                    const emoji = statusEmoji[req.body.statut] || '📋';
                    const title = `${emoji} Dossier ${m.reference} — ${req.body.statut}`;
                    const body = `<p>Bonjour <strong>${user.nomSociete}</strong>,</p>
                        <p>Le statut de votre dossier a été mis à jour.</p>
                        <table style="margin:20px 0;width:100%;border-collapse:collapse">
                          <tr><td style="padding:10px;background:#F7F4EE;border-radius:8px 0 0 8px;color:#666;font-size:13px;width:40%">Référence</td><td style="padding:10px;background:#F7F4EE;font-weight:bold;color:#0F0E0C">${m.reference}</td></tr>
                          <tr><td style="padding:10px;color:#666;font-size:13px">Nouveau statut</td><td style="padding:10px;font-weight:bold;color:#C9A96E">${req.body.statut}</td></tr>
                        </table>`;
                    await resend.emails.send({
                        from: EMAIL_SENDER,
                        to: user.email,
                        subject: title,
                        html: getEmailTemplate(title, body, "https://l-atelier-des-arts.com/mes-commandes", "Voir mon dossier")
                    });
                }
            } catch(e) { console.error("Erreur mail statut:", e); }
        }

        res.json({ success: true, montage: m });
    } catch (e) { console.error(e); res.status(500).json({ success: false }); }
});

// 5. SUPPRESSION (DELETE)
app.delete("/api/montages/:id", async (req, res) => {
    try { await Montage.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (e) { res.status(500).json({ success: false }); }
});
// ✅ ROUTE DE RÉPARATION TOTALE (À mettre dans index.js)
app.get("/api/fix", async (req, res) => {
    if (req.headers["x-user-role"] !== "admin") return res.status(403).json({ success: false, message: "Accès refusé" });
    try {
        // 1. On récupère tous les montages qui ont des verres
        const montages = await Montage.find({ glassType: { $exists: true, $ne: [] } });
        let updatedCount = 0;

        for (let m of montages) {
            let hasChanged = false;
            
            // 2. On transforme chaque élément de la liste des verres
            const fixedGlassType = m.glassType.map(g => {
                const name = g.toLowerCase();
                // Si le nom contient '4' et 'saison', on force le bon nom propre
                if (name.includes('4') || name.includes('saison')) {
                    if (g !== "Verre Dégradé 4 saisons") {
                        hasChanged = true;
                        return "Verre Dégradé 4 saisons";
                    }
                }
                return g;
            });

            // 3. Si on a trouvé une erreur, on met à jour la base de données
            if (hasChanged) {
                await Montage.findByIdAndUpdate(m._id, { glassType: fixedGlassType });
                updatedCount++;
            }
        }

        res.json({ 
            success: true, 
            message: `${updatedCount} anciens dossiers ont été mis à jour avec le nom correct.` 
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
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
        
        if (req.body.sendEmail) {
            const user = await User.findById(req.body.userId);
            if (!user || !user.email) throw new Error("Client introuvable.");

            // Préparation de la base de l'email
            let emailOptions = {
                from: EMAIL_SENDER,
                to: user.email,
                cc: EMAIL_ADMIN,
                subject: `Facture ${req.body.invoiceNumber}`,
            };

            // SCÉNARIO 1 : Petite facture (<= 20 dossiers) -> On attache le PDF
            if (req.body.pdfBase64) {
                let base64Data = req.body.pdfBase64;
                if (base64Data.includes('base64,')) base64Data = base64Data.split('base64,')[1];
                
                emailOptions.html = `<p>Bonjour,</p><p>Veuillez trouver ci-joint votre nouvelle facture de L'Atelier des Arts.</p>`;
                emailOptions.attachments = [{
                    filename: `Facture_${req.body.invoiceNumber}.pdf`,
                    content: base64Data
                }];
            } 
            // SCÉNARIO 2 : Grosse facture (> 20 dossiers) -> Email avec bouton sans pièce jointe
            else {
                emailOptions.html = `
                    <div style="font-family: sans-serif; color: #333;">
                        <p>Bonjour,</p>
                        <p>Votre nouvelle facture <strong>${req.body.invoiceNumber}</strong> d'un montant de <strong>${req.body.totalTTC} €</strong> est disponible.</p>
                        <p>En raison du volume de montages, elle a été générée directement sur votre Espace Pro.</p>
                        <br>
                        <a href="https://l-atelier-des-arts.com/login" style="background-color:#000; color:#fff; padding:12px 24px; text-decoration:none; border-radius:5px; font-weight:bold; display:inline-block;">Consulter ma facture</a>
                        <br><br>
                        <p>L'équipe de L'Atelier des Arts.</p>
                    </div>
                `;
            }

            await resend.emails.send(emailOptions);
        }
        res.json({ success: true, facture: f });
    } catch (e) { 
        console.error("❌ Erreur Envoi Facture :", e.message); 
        res.status(500).json({ success: false, message: e.message }); 
    }
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
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const tempPassword = Array.from({length: 8}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        user.password = await bcrypt.hash(tempPassword, SALT_ROUNDS);
        await user.save();

        const body = `<p>Bonjour <strong>${user.nomSociete || user.email}</strong>,</p>
            <p>Voici votre mot de passe temporaire pour vous connecter :</p>
            <div style="margin:24px 0;padding:24px;background:#F7F4EE;border-radius:12px;text-align:center;border:2px dashed #C9A96E">
                <p style="margin:0 0 8px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:3px">Mot de passe temporaire</p>
                <p style="margin:0;font-size:32px;font-weight:bold;color:#0F0E0C;letter-spacing:6px;font-family:Courier,monospace">${tempPassword}</p>
            </div>
            <p style="color:#888;font-size:13px">Une fois connecté, changez votre mot de passe dans votre profil.</p>
            <p style="color:#e53e3e;font-size:12px;margin-top:16px">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`;

        await resend.emails.send({
            from: EMAIL_SENDER,
            to: user.email,
            subject: "Votre mot de passe temporaire — L'Atelier des Arts",
            html: getEmailTemplate("Réinitialisation du mot de passe", body, "https://l-atelier-des-arts.com/espace-pro", "Se connecter")
        });
        console.log(`✅ Email mot de passe envoyé à ${user.email}`);
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Erreur forgot-password:", error);
    res.status(500).json({ success: false });
  }
});
// --- ROUTE DE NETTOYAGE D'URGENCE ---
// Cette route va supprimer les photos "lourdes" (Base64) mais GARDER les liens Cloudinary
app.get("/api/clean-database", async (req, res) => {
    if (req.headers["x-user-role"] !== "admin") return res.status(403).json({ success: false, message: "Accès refusé" });
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