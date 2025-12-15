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

// --- 4. FONCTION DESIGN EMAIL (Celle qui manquait !) ---
const getEmailTemplate = (title, bodyContent, buttonUrl = null, buttonText = null) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="padding: 40px 20px; text-align: center;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); text-align: left;">
                        
                        <div style="background-color: #000000; padding: 25px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 300; letter-spacing: 3px; text-transform: uppercase;">L'Atelier des Arts</h1>
                        </div>

                        <div style="padding: 40px 30px; color: #333333; line-height: 1.6;">
                            <h2 style="margin-top: 0; color: #111111; font-size: 20px; font-weight: 600; margin-bottom: 20px;">${title}</h2>
                            <div style="font-size: 16px; color: #4b5563;">
                                ${bodyContent}
                            </div>

                            ${buttonUrl ? `
                                <div style="text-align: center; margin-top: 35px; margin-bottom: 10px;">
                                    <a href="${buttonUrl}" style="background-color: #000000; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 14px; display: inline-block;">${buttonText}</a>
                                </div>
                            ` : ''}
                        </div>

                        <div style="background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 5px;">L'Atelier des Arts - 178 Avenue Daumesnil, 75012 Paris</p>
                            <p style="margin: 0;">Téléphone : +33 6 98 40 96 87</p>
                        </div>
                    </div>
                    <div style="margin-top: 20px; font-size: 12px; color: #a1a1aa;">
                        © ${new Date().getFullYear()} L'Atelier des Arts. Tous droits réservés.
                    </div>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
};

// --- 5. ROUTES ---

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

// INSCRIPTION
app.post("/api/inscription", upload.single('pieceJointe'), async (req, res) => {
  const { nomSociete, email, siret, password, phone, address, zipCity } = req.body;
  
  if (!nomSociete || !email || !password) return res.status(400).json({ success: false, message: "Champs manquants" });

  try {
    if (await User.findOne({ email })) return res.status(409).json({ success: false, message: "Email déjà utilisé." });

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    await User.create({ email, password: hashedPassword, nomSociete, siret, phone, address, zipCity, role: 'user', assignedShops: [] });

    // Gestion pièce jointe
    let attachments = [];
    if (req.file) {
        try { attachments.push({ filename: req.file.originalname, content: fs.readFileSync(req.file.path) }); } catch (err) {}
    }

    // 1. Email Admin
    try { 
        const adminBody = `
            <p>Une nouvelle demande d'inscription vient d'arriver.</p>
            <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; font-weight: bold;">Société</td><td style="padding: 8px 0;">${nomSociete}</td></tr>
                <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; font-weight: bold;">Email</td><td style="padding: 8px 0;">${email}</td></tr>
                <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; font-weight: bold;">SIRET</td><td style="padding: 8px 0;">${siret}</td></tr>
                <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; font-weight: bold;">Téléphone</td><td style="padding: 8px 0;">${phone || 'Non renseigné'}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Ville</td><td style="padding: 8px 0;">${zipCity || 'Non renseigné'}</td></tr>
            </table>
            <p style="margin-top: 20px; font-style: italic;">Le justificatif est en pièce jointe.</p>
        `;
        
        await resend.emails.send({ 
            from: EMAIL_SENDER, 
            to: EMAIL_ADMIN, 
            subject: `🔔 Nouvelle inscription : ${nomSociete}`, 
            html: getEmailTemplate("Nouvelle demande d'ouverture", adminBody),
            attachments: attachments 
        }); 
    } catch (e) {}

    // 2. Email Client
    try {
        const clientBody = `
            <p>Bonjour <strong>${nomSociete}</strong>,</p>
            <p>Nous avons bien reçu votre demande d'ouverture de compte professionnel.</p>
            <p style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 15px; margin: 20px 0; color: #9a3412;">
                Votre dossier est actuellement <strong>en attente de validation</strong> par notre équipe.
            </p>
            <p>Vous recevrez un email de confirmation dès que votre accès sera activé.</p>
        `;

        await resend.emails.send({
            from: EMAIL_SENDER,
            to: email,
            subject: "Confirmation de réception de votre demande",
            html: getEmailTemplate("Demande reçue", clientBody)
        });
    } catch (e) {}

    if (req.file) try { fs.unlinkSync(req.file.path); } catch(e) {}
    res.status(200).json({ success: true });

  } catch (error) { res.status(500).json({ success: false }); }
});

// USERS (Update & Validation)
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
           const body = `
               <p>Bonjour <strong>${user.nomSociete}</strong>,</p>
               <p>Nous avons le plaisir de vous informer que votre compte professionnel a été <strong>validé</strong> !</p>
               <p>Vous pouvez désormais vous connecter à votre espace, passer vos commandes de montage et accéder à vos factures.</p>
           `;
           
           await resend.emails.send({ 
               from: EMAIL_SENDER, 
               to: user.email, 
               subject: "✅ Votre compte a été validé !", 
               html: getEmailTemplate("Bienvenue chez L'Atelier des Arts", body, "https://l-atelier-des-arts.com/espace-pro", "Accéder à mon Espace Pro") 
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
    const updatedUser = await User.findById(id).populate('assignedShops', 'nomSociete _id zipCity');
    res.json({ success: true, user: updatedUser });

  } catch (error) { res.status(500).json({ success: false }); }
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
        const montages = await Montage.find(query)
                                      .select('-photoUrl') 
                                      .sort({ dateReception: -1 });
                                      
        res.json({ success: true, montages });
    } catch (e) { 
        console.error(e);
        res.status(500).json({ success: false }); 
    }
});

// MISE À JOUR MONTAGE (Email auto)
app.put("/api/montages/:id", async (req, res) => {
    try {
        const m = await Montage.findByIdAndUpdate(req.params.id, req.body, { new: true });

        if (req.body.statut) {
            const user = await User.findById(m.userId);
            if (user) {
                let title = `Mise à jour : ${m.reference}`;
                let messageInfo = "";
                let color = "#333";

                switch (req.body.statut) {
                    case "Reçu": title = "Dossier Reçu"; messageInfo = "Dossier reçu et placé en file d'attente."; color = "#3b82f6"; break;
                    case "En cours": title = "En Production"; messageInfo = "Montage en cours de réalisation."; color = "#f97316"; break;
                    case "Terminé": title = "Montage Terminé"; messageInfo = "Montage terminé et contrôlé."; color = "#22c55e"; break;
                    case "Expédié": title = "Dossier Expédié"; messageInfo = "Votre dossier a été expédié."; color = "#a855f7"; break;
                }

                const body = `
                    <p>Bonjour <strong>${user.nomSociete}</strong>,</p>
                    <p>Le statut de votre dossier <strong>${m.reference}</strong> a évolué.</p>
                    <div style="background-color: #f3f4f6; border-left: 5px solid ${color}; padding: 20px; margin: 25px 0;">
                        <h3 style="margin:0; color:${color};">${req.body.statut}</h3>
                        <p style="margin:5px 0 0 0;">${messageInfo}</p>
                    </div>
                `;

                if (messageInfo) {
                    try {
                        await resend.emails.send({
                            from: EMAIL_SENDER,
                            to: user.email,
                            subject: `${req.body.statut} : Dossier ${m.reference}`,
                            html: getEmailTemplate(title, body, "https://l-atelier-des-arts.com/espace-pro", "Accéder")
                        });
                    } catch (e) {}
                }
            }
        }
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

// MOT DE PASSE OUBLIÉ
app.post("/api/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: "Email requis" });

  try {
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(200).json({ success: true, message: "Email envoyé si compte existe." });
    }

    // 1. Générer mot de passe temporaire
    const tempPassword = Math.random().toString(36).slice(-8).toUpperCase();
    
    // 2. Hasher et sauvegarder
    const hashedPassword = await bcrypt.hash(tempPassword, SALT_ROUNDS);
    user.password = hashedPassword;
    await user.save();

    // 3. Envoyer email
    const emailBody = `
        <p>Bonjour <strong>${user.nomSociete}</strong>,</p>
        <p>Une demande de réinitialisation de mot de passe a été effectuée.</p>
        <div style="background-color: #f3f4f6; border: 1px solid #e5e7eb; padding: 20px; text-align: center; margin: 25px 0;">
            <p style="margin: 0 0 10px; color: #666;">Mot de passe temporaire :</p>
            <p style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 2px;">${tempPassword}</p>
        </div>
        <p>Merci de modifier ce mot de passe immédiatement après connexion.</p>
    `;

    try {
        // C'EST ICI QUE CA PLANTAIT CAR getEmailTemplate N'EXISTAIT PAS
        await resend.emails.send({
            from: EMAIL_SENDER,
            to: user.email,
            subject: "🔐 Réinitialisation de votre mot de passe",
            html: getEmailTemplate("Mot de passe oublié", emailBody, "https://l-atelier-des-arts.com/espace-pro", "Me connecter")
        });
    } catch (e) {
        console.error("Erreur envoi mail mdp:", e);
        // On ne bloque pas si l'email échoue mais on le log
    }

    res.json({ success: true, message: "Email envoyé" });

  } catch (error) {
    console.error("Erreur Forgot Password:", error);
    res.status(500).json({ success: false, message: "Erreur serveur." });
  }
});

export default app;