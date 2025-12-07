import express from "express";
import cors from "cors";
import { Resend } from "resend";
import dotenv from "dotenv";
import multer from "multer"
dotenv.config(); // charge le fichier .env

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

// 👇 vérifie que la clé est bien lue
console.log("🔑 Clé Resend chargée :", process.env.RESEND_API_KEY ? "✅ OK" : "❌ Manquante");

const resend = new Resend(process.env.RESEND_API_KEY); // utilise la clé depuis .env

app.post("/send-email", async (req, res) => {
  const { name, email, message } = req.body;

  try {
    const data = await resend.emails.send({
      from: "onboarding@resend.dev", // ou ton domaine validé (ex: contact@tondomaine.com)
      to: "atelierdesarts.12@gmail.com", // <-- ton adresse pour recevoir les messages
      subject: `Nouveau message de ${name}`,
      html: `
        <p><strong>Nom :</strong> ${name}</p>
        <p><strong>Email :</strong> ${email}</p>
        <p><strong>Message :</strong><br>${message}</p>
      `,
    });

    console.log("✅ Email envoyé :", data);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Erreur lors de l’envoi :", error);
    res.status(500).json({ success: false, error });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`🚀 Serveur sur http://localhost:${PORT}`));
