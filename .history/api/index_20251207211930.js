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

app.use(express.json());

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
  isVerified: { type: Boolean, default: false },
  role: { type: String, default: 'user', enum: ['user', 'admin'] },
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
  options: { type: [String], default: [] },
  statut: { type: String, default: 'En attente' },
  dateReception: { type: Date, default: Date.now }
});
const Montage = mongoose.models.Montage || mongoose.model("Montage", montageSchema);

const upload = multer({ dest: os.tmpdir(), limits: { fileSize: 4 * 1024 * 1024 } });
const resend = new Resend(process.env.RESEND_API_KEY);
const SALT_ROUNDS = 10;

// --- ROUTES ---

// 1. INSCRIPTION
app.post("/api/inscription", upload.single('pieceJointe'), async (req, res) => {
    await connectDB();
    const { nomSociete, email, siret, password } = req.body;
    const uploadedFile = req.file;

    if (!nomSociete || !email || !siret || !password) {
        return res.status(400).json({ success: false, message: "Champs manquants" });
    }

    try {
        if (await User.findOne({ email })) {
             if (uploadedFile && fs.existsSync(uploadedFile.path)) fs.unlinkSync(uploadedFile.path);
             return res.status(409).json({ success: false, message: "Email déjà utilisé." });
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        await User.create({ email, password: hashedPassword, nomSociete, siret, isVerified: false, role: 'user' });

        let attachments = [];
        if (uploadedFile && fs.existsSync(uploadedFile.path)) {
            const fileContent = fs.readFileSync(uploadedFile.path);
            attachments.push({ filename: uploadedFile.originalname, content: fileContent });
        }
        
        // Email Admin (Nouveau client)
        await resend.emails.send({
            from: EMAIL_SENDER,
            to: EMAIL_ADMIN,
            subject: `🔔 Nouvelle Inscription : ${nomSociete}`,
            html: `
            <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                <h2 style="color: #000;">Nouvelle demande d'inscription</h2>
                <p>Un nouvel opticien souhaite rejoindre la plateforme.</p>
                <ul style="list-style: none; padding: 0;">
                    <li><strong>Société :</strong> ${nomSociete}</li>
                    <li><strong>SIRET :</strong> ${siret}</li>
                    <li><strong>Email :</strong> ${email}</li>
                </ul>
                <p><em>La pièce jointe (KBIS) est attachée à cet email si elle a été fournie.</em></p>
            </div>`,
            attachments: attachments
        });

        // Email Client (Bienvenue)
        await resend.emails.send({
            from: EMAIL_SENDER,
            to: email,
            subject: "Bienvenue à L'Atelier des Arts",
            html: `
            <div style="font-family: 'Playfair Display', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #000; color: #fff; padding: 30px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px;">L'ATELIER DES ARTS</h1>
                </div>
                <div style="padding: 30px; background-color: #fff; color: #333;">
                    <h2 style="color: #000; margin-top: 0;">Bienvenue, ${nomSociete} !</h2>
                    <p>Nous avons bien reçu votre demande d'inscription.</p>
                    <p>Votre compte est actuellement <strong>en cours de validation</strong> par notre équipe. Vous recevrez une confirmation dès que votre accès sera activé.</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 14px; color: #666;">À très vite,<br>L'équipe de l'Atelier des Arts</p>
                </div>
            </div>`
        });

        if (uploadedFile && fs.existsSync(uploadedFile.path)) fs.unlinkSync(uploadedFile.path);
        res.status(200).json({ success: true });

    } catch (error) {
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
});

// 2. LOGIN
app.post("/api/login", async (req, res) => {
    await connectDB();
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
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
                role: user.role || 'user'
            } 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
});

// 3. MOT DE PASSE OUBLIÉ (TEMPLATE PRO)
app.post("/api/forgot-password", async (req, res) => {
    await connectDB();
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ success: false, message: "Email introuvable." });

        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(tempPassword, SALT_ROUNDS);
        user.password = hashedPassword;
        await user.save();

        // ✅ Template HTML Professionnel
        await resend.emails.send({
            from: EMAIL_SENDER,
            to: email,
            subject: "Réinitialisation de votre mot de passe",
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; color: #333;">
                <div style="background-color: #000; padding: 20px; text-align: center;">
                    <h2 style="color: #fff; margin: 0; font-family: 'Playfair Display', serif;">L'ATELIER DES ARTS</h2>
                </div>
                <div style="padding: 40px 30px; background-color: #fff;">
                    <p style="font-size: 16px;">Bonjour,</p>
                    <p style="font-size: 16px; line-height: 1.5;">Vous avez demandé la réinitialisation de votre mot de passe. Voici votre code d'accès temporaire :</p>
                    
                    <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 15px; margin: 25px 0; text-align: center;">
                        <span style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #000;">${tempPassword}</span>
                    </div>

                    <p style="font-size: 14px; color: #555; line-height: 1.5;">
                        ⚠️ Pour votre sécurité, nous vous invitons à modifier ce mot de passe dès votre prochaine connexion dans votre espace "Profil".
                    </p>
                    
                    <p style="margin-top: 30px; font-size: 14px;">Cordialement,<br>Le support technique</p>
                </div>
                <div style="background-color: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; color: #888;">
                    &copy; ${new Date().getFullYear()} L'Atelier des Arts. Tous droits réservés.
                </div>
            </div>`
        });

        res.json({ success: true, message: "Email envoyé." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erreur serveur." });
    }
});

// 4. UPDATE USER
app.put("/api/users/:id", async (req, res) => {
    await connectDB();
    const { id } = req.params;
    const { nomSociete, email, siret, currentPassword, newPassword } = req.body;
    try {
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ success: false, message: "Utilisateur introuvable." });

        if ((email !== user.email || newPassword) && !currentPassword) {
             return res.status(400).json({ success: false, message: "Mot de passe actuel requis." });
        }
        if (currentPassword) {
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) return res.status(401).json({ success: false, message: "Mot de passe incorrect." });
        }
        if (nomSociete) user.nomSociete = nomSociete;
        if (siret) user.siret = siret;
        if (email && email !== user.email) {
            const exists = await User.findOne({ email });
            if (exists) return res.status(409).json({ success: false, message: "Email pris." });
            user.email = email;
        }
        if (newPassword) user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);

        await user.save();
        res.json({ success: true, message: "Profil mis à jour", user: { id: user._id, email: user.email, nomSociete: user.nomSociete, siret: user.siret, role: user.role } });
    } catch (error) { res.status(500).json({ success: false, message: "Erreur serveur." }); }
});

// 5. MONTAGES
app.get("/api/users", async (req, res) => {
    await connectDB();
    try {
        const users = await User.find({ role: { $ne: 'admin' } }).select('-password'); 
        res.json({ success: true, users });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.post("/api/montages", async (req, res) => {
    await connectDB();
    const { userId, description, category, options, reference, frame } = req.body; 
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "Client introuvable" });
        
        const newMontage = await Montage.create({ 
            userId, 
            clientName: user.nomSociete, 
            reference: reference || "Sans ref", 
            frame: frame || "Monture inconnue", 
            description: description || "", 
            category: category || "Cerclé", 
            options: options || [],         
            statut: 'En attente', 
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
        if (role === 'admin') {
            montages = await Montage.find().sort({ dateReception: -1 });
        } else {
            montages = await Montage.find({ userId }).sort({ dateReception: -1 });
        }
        res.json({ success: true, montages });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.put("/api/montages/:id", async (req, res) => {
    await connectDB();
    const { id } = req.params;
    const { statut } = req.body;
    try {
        const updatedMontage = await Montage.findByIdAndUpdate(id, { statut: statut }, { new: true });
        if (!updatedMontage) return res.status(404).json({ success: false });
        res.json({ success: true, montage: updatedMontage });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.delete("/api/montages/:id", async (req, res) => {
    await connectDB();
    try {
        await Montage.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
});

// 6. CONTACT (TEMPLATE PRO)
app.post("/api/contact", async (req, res) => {
    const { name, email, phone, message } = req.body;
    try {
        // ✅ Template HTML Professionnel pour vous (Admin)
        await resend.emails.send({
            from: EMAIL_SENDER,
            to: EMAIL_ADMIN,
            subject: `📩 Nouveau message : ${name}`,
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; color: #333;">
                <div style="background-color: #000; padding: 15px; text-align: center;">
                    <h2 style="color: #fff; margin: 0; font-size: 18px;">Message du Site Web</h2>
                </div>
                <div style="padding: 25px; background-color: #fff;">
                    <p style="font-size: 16px;">Vous avez reçu une nouvelle demande de contact.</p>
                    
                    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 0; font-weight: bold; width: 100px;">Nom :</td>
                            <td style="padding: 10px 0;">${name}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 0; font-weight: bold;">Email :</td>
                            <td style="padding: 10px 0;"><a href="mailto:${email}" style="color: #000; text-decoration: none;">${email}</a></td>
                        </tr>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 0; font-weight: bold;">Téléphone :</td>
                            <td style="padding: 10px 0;">${phone || "Non renseigné"}</td>
                        </tr>
                    </table>

                    <div style="margin-top: 25px;">
                        <p style="font-weight: bold; margin-bottom: 10px;">Message :</p>
                        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${message}</div>
                    </div>
                </div>
                <div style="background-color: #f1f1f1; padding: 10px; text-align: center; font-size: 11px; color: #999;">
                    Envoyé automatiquement depuis le formulaire de contact.
                </div>
            </div>`
        });
        res.json({ success: true });
    } catch (error) {
        console.error("Erreur Contact:", error);
        res.status(500).json({ success: false, message: "Erreur envoi" });
    }
});

export default app;