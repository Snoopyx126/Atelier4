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

    // --- GESTION DE LA PIÈCE JOINTE ---
    let attachments = [];
    if (req.file) {
        try {
            const fileBuffer = fs.readFileSync(req.file.path);
            attachments.push({
                filename: req.file.originalname,
                content: fileBuffer
            });
        } catch (err) {
            console.error("Erreur lecture fichier:", err);
        }
    }

    // 1. Email Admin (AVEC PIÈCE JOINTE)
    try { 
        await resend.emails.send({ 
            from: EMAIL_SENDER, 
            to: EMAIL_ADMIN, 
            subject: `🔔 Nouvelle inscription : ${nomSociete}`, 
            html: `<p>Société: ${nomSociete}<br>Email: ${email}<br>Siret: ${siret}</p><p>Le Kbis/CNI est en pièce jointe.</p>`,
            attachments: attachments // 👈 C'est ici que la magie opère
        }); 
    } catch (e) { console.error("Erreur mail admin", e); }

    // 2. Email Client
    try {
        await resend.emails.send({
            from: EMAIL_SENDER,
            to: email,
            subject: "Bienvenue - Votre demande est en cours de traitement",
            html: `
                <h1>Bonjour ${nomSociete},</h1>
                <p>Nous avons bien reçu votre demande.</p>
                <p>Votre dossier est en attente de validation.</p>
                <br><p>Cordialement,<br>L'équipe Atelier des Arts</p>
            `
        });
    } catch (e) { console.error("Erreur mail client", e); }

    // NETTOYAGE : On supprime le fichier temporaire du serveur
    if (req.file) {
        try { fs.unlinkSync(req.file.path); } catch(e) {}
    }

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

// MISE À JOUR MONTAGE (Avec notifications email automatiques)
app.put("/api/montages/:id", async (req, res) => {
    try {
        // 1. On effectue la mise à jour en base de données
        const m = await Montage.findByIdAndUpdate(req.params.id, req.body, { new: true });

        // 2. Si la mise à jour contient un changement de "statut", on envoie un email
        if (req.body.statut) {
            // On récupère les infos du client pour avoir son email
            const user = await User.findById(m.userId);
            
            if (user) {
                let subject = `Mise à jour dossier : ${m.reference}`;
                let messageBody = "";

                // On personnalise le message selon le nouveau statut
                switch (req.body.statut) {
                    case "Reçu":
                        subject = `📦 Dossier Reçu : ${m.reference}`;
                        messageBody = `<p>Nous avons bien reçu la monture et les éléments pour le dossier <strong>${m.reference}</strong>.</p><p>Il est désormais dans notre file d'attente.</p>`;
                        break;
                    case "En cours":
                        subject = `🛠 En Production : ${m.reference}`;
                        messageBody = `<p>Le montage <strong>${m.reference}</strong> est actuellement en cours de réalisation par nos opticiens.</p>`;
                        break;
                    case "Terminé":
                        subject = `✅ Montage Terminé : ${m.reference}`;
                        messageBody = `<p>Bonne nouvelle ! Le montage <strong>${m.reference}</strong> est terminé et a passé le contrôle qualité avec succès.</p><p>Il est prêt pour l'expédition ou le retrait.</p>`;
                        break;
                    case "Expédié":
                        subject = `🚚 Dossier Expédié : ${m.reference}`;
                        messageBody = `<p>Le montage <strong>${m.reference}</strong> a été expédié ce jour.</p>`;
                        break;
                }

                // Si un message correspond, on l'envoie
                if (messageBody) {
                    try {
                        await resend.emails.send({
                            from: EMAIL_SENDER,
                            to: user.email,
                            subject: subject,
                            html: `
                                <div style="font-family: sans-serif; color: #333;">
                                    <h2>Bonjour ${user.nomSociete},</h2>
                                    ${messageBody}
                                    <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
                                        <p style="margin: 0;"><strong>Référence :</strong> ${m.reference}</p>
                                        <p style="margin: 5px 0 0 0;"><strong>Monture :</strong> ${m.frame}</p>
                                    </div>
                                    <p>Cordialement,<br>L'équipe Atelier des Arts</p>
                                </div>
                            `
                        });
                        console.log(`✉️ Email statut "${req.body.statut}" envoyé à ${user.email}`);
                    } catch (emailError) {
                        console.error("❌ Erreur envoi email statut:", emailError);
                        // On ne bloque pas la réponse si l'email échoue, c'est du bonus
                    }
                }
            }
        }

        res.json({ success: true, montage: m });
    } catch (e) { 
        console.error(e);
        res.status(500).json({ success: false }); 
    }
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
// MOT DE PASSE OUBLIÉ
app.post("/api/forgot-password", async (req, res) => {
  const { email } = req.body;
  
  if (!email) return res.status(400).json({ success: false, message: "Email requis" });

  try {
    const user = await User.findOne({ email });
    if (!user) {
        // Par sécurité, on ne dit pas si l'email n'existe pas, on fait semblant que ça a marché
        return res.status(200).json({ success: true, message: "Si ce compte existe, un email a été envoyé." });
    }

    // 1. Générer un mot de passe temporaire (8 caractères)
    const tempPassword = Math.random().toString(36).slice(-8).toUpperCase();
    
    // 2. Hasher et sauvegarder le mot de passe
    const hashedPassword = await bcrypt.hash(tempPassword, SALT_ROUNDS);
    user.password = hashedPassword;
    await user.save();

    // 3. Envoyer l'email avec le mot de passe temporaire
    const emailBody = `
        <p>Bonjour <strong>${user.nomSociete}</strong>,</p>
        <p>Une demande de réinitialisation de mot de passe a été effectuée pour votre compte.</p>
        
        <div style="background-color: #f3f4f6; border: 1px solid #e5e7eb; padding: 20px; text-align: center; margin: 25px 0; border-radius: 4px;">
            <p style="margin: 0 0 10px; color: #666; font-size: 14px;">Votre mot de passe temporaire :</p>
            <p style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #000;">${tempPassword}</p>
        </div>

        <p>Nous vous conseillons de vous connecter et de <strong>modifier ce mot de passe immédiatement</strong> dans votre profil.</p>
    `;

    try {
        await resend.emails.send({
            from: EMAIL_SENDER,
            to: user.email,
            subject: "🔐 Réinitialisation de votre mot de passe",
            html: getEmailTemplate("Mot de passe oublié", emailBody, "https://l-atelier-des-arts.com/espace-pro", "Me connecter")
        });
    } catch (e) {
        console.error("Erreur envoi mail mdp:", e);
        return res.status(500).json({ success: false, message: "Erreur d'envoi d'email." });
    }

    res.json({ success: true, message: "Email envoyé" });

  } catch (error) {
    console.error("Erreur Forgot Password:", error);
    res.status(500).json({ success: false, message: "Erreur serveur." });
  }
});

export default app;