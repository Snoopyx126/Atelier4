// api/index.js
const express = require("express");
const cors = require("cors");
const { Resend } = require("resend");
const dotenv = require("dotenv");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const bcrypt = require('bcrypt');
const os = require("os");
const mongoose = require("mongoose");

dotenv.config();
const app = express();

app.use(cors({
  origin: ["https://atelier4.vercel.app", "http://localhost:5173", "http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"]
}));

app.use(express.json());

// Connexion MongoDB
const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connecté à MongoDB");
  } catch (error) {
    console.error("❌ Erreur MongoDB:", error);
  }
};

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  nomSociete: { type: String, required: true },
  siret: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model("User", userSchema);

const upload = multer({ dest: os.tmpdir(), limits: { fileSize: 4 * 1024 * 1024 } });
const resend = new Resend(process.env.RESEND_API_KEY);
const SALT_ROUNDS = 10;

app.post("/api/inscription", upload.single('pieceJointe'), async (req, res) => {
    await connectDB();
    const { nomSociete, email, siret, password } = req.body;
    const uploadedFile = req.file;

    if (!nomSociete || !email || !siret || !password) {
        return res.status(400).json({ success: false, message: "Champs manquants" });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
             if (uploadedFile && fs.existsSync(uploadedFile.path)) fs.unlinkSync(uploadedFile.path);
             return res.status(409).json({ success: false, message: "Email déjà utilisé." });
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        await User.create({
            email,
            password: hashedPassword,
            nomSociete,
            siret,
            isVerified: false
        });

        let attachments = [];
        if (uploadedFile && fs.existsSync(uploadedFile.path)) {
            const fileContent = fs.readFileSync(uploadedFile.path);
            attachments.push({ filename: uploadedFile.originalname, content: fileContent });
        }

        await resend.emails.send({
            from: "onboarding@resend.dev",
            to: "atelierdesarts.12@gmail.com",
            subject: `Nouvelle Inscription : ${nomSociete}`,
            html: `<p>Société: ${nomSociete}<br>SIRET: ${siret}<br>Email: ${email}</p>`,
            attachments: attachments
        });

        if (uploadedFile && fs.existsSync(uploadedFile.path)) fs.unlinkSync(uploadedFile.path);
        res.status(200).json({ success: true, message: "Inscription réussie." });

    } catch (error) {
        console.error("Erreur:", error);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
});

app.post("/api/login", async (req, res) => {
    await connectDB();
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ success: false, message: "Identifiants invalides." });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ success: false, message: "Identifiants invalides." });

        res.json({ success: true, user: { email: user.email, nomSociete: user.nomSociete } });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
});

module.exports = app;