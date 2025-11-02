// server.js
import express from "express";
import cors from "cors";
import { Resend } from "resend";

const app = express();
app.use(cors());
app.use(express.json());

const resend = new Resend(process.env.RESEND_API_KEY);

app.post("/send-email", async (req, res) => {
  const { name, email, message } = req.body;

  try {
    const data = await resend.emails.send({
      from: "contact@tondomaine.com", // ton domaine validé sur Resend
      to: "toimeme@example.com", // adresse de réception
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
app.listen(PORT, () => console.log(`🚀 Serveur API sur http://localhost:${PORT}`));
