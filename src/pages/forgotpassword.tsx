// src/pages/forgotpassword.tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { API_URL } from "@/lib/api";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error("Veuillez entrer votre email."); return; }
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Email envoyé — vérifiez votre boîte mail et vos spams.");
        setTimeout(() => navigate("/espace-pro"), 3000);
      } else {
        toast.error(data.message || "Email introuvable.");
      }
    } catch {
      toast.error("Erreur serveur. Réessayez plus tard.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0E0C] flex items-center justify-center px-8">
      <div className="w-full max-w-sm">

        <Link to="/" className="font-playfair text-xl italic text-[#F7F4EE] tracking-wide block mb-16">
          L'Atelier des Arts
        </Link>

        <div className="mb-10">
          <span className="font-sans-dm text-[9px] tracking-[0.3em] uppercase text-[#C9A96E] block mb-3">
            Récupération
          </span>
          <h1 className="font-playfair text-3xl font-normal text-[#F7F4EE]">
            Mot de passe oublié
          </h1>
          <p className="font-sans-dm text-xs text-[#F7F4EE]/35 mt-2 font-light">
            Entrez votre email pour recevoir un mot de passe temporaire.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="font-sans-dm text-[9px] tracking-[0.2em] uppercase text-[#F7F4EE]/40 block mb-3">
              Email professionnel
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
              className="w-full bg-transparent border-b border-[#F7F4EE]/15 focus:border-[#C9A96E] outline-none text-sm font-light py-3 text-[#F7F4EE] placeholder:text-[#F7F4EE]/25 transition-colors duration-300"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-gold py-4 text-[10px] disabled:opacity-50"
          >
            <span>{isLoading ? "Envoi en cours..." : "Réinitialiser le mot de passe"}</span>
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-[#F7F4EE]/8 text-center">
          <Link to="/espace-pro" className="font-sans-dm text-[10px] tracking-[0.1em] text-[#F7F4EE]/30 hover:text-[#C9A96E] transition-colors">
            ← Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
