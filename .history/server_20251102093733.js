import express from "express";
import cors from "cors";
import { Resend } from "resend";
import dotenv from "dotenv"; // <-- ajoute ceci

dotenv.config(); // <-- charge les variables depuis .env

const app = express();
app.use(cors());
app.use(express.json());

const resend = new Resend(process.env.RESEND_API_KEY); // <-- clé récupérée ici

app.post("/send-email", async (req, res) => {
  const { name, email, message } = req.body;

  try {
    const data = await resend.emails.send({
      from: "onboarding@resend.dev", // ou ton domaine validé
      to: "tonemail@example.com",
      subject: `Nouveau message de ${name}`,
      html: `<p><strong>Nom:</strong> ${name}</p>
             <p><strong>Email:</strong> ${email}</p>
             <p><strong>Message:</strong><br>${message}</p>`,
    });

    console.log("✅ Email envoyé :", data);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Erreur:", error);
    res.status(500).json({ success: false, error });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`🚀 Serveur sur http://localhost:${PORT}`));
