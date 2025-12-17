import { Resend } from "resend";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Méthode non autorisée" });
  }

  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, error: "Champs manquants" });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const data = await resend.emails.send({
      from: "onboarding@resend.dev", // ou ton domaine validé
      to: "atelierdesarts.12@gmail.com",
      subject: `Nouveau message de ${name}`,
      html: `
        <p><strong>Nom :</strong> ${name}</p>
        <p><strong>Email :</strong> ${email}</p>
        <p><strong>Message :</strong><br>${message}</p>
      `,
    });

    console.log("✅ Email envoyé :", data);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi :", error);
    return res.status(500).json({ success: false, error });
  }
}
