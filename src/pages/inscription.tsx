// src/pages/inscription.tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { API_URL } from "@/lib/api";

const Inscription = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    nomSociete: "", email: "", siret: "", password: "", confirmPassword: "",
    phone: "", address: "", zipCity: "", pieceJointe: null as File | null,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, pieceJointe: e.target.files?.[0] || null }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) { toast.error("Les mots de passe ne correspondent pas."); return; }
    if (formData.siret.length !== 14) { toast.error("SIRET invalide — 14 chiffres requis."); return; }
    if (!formData.pieceJointe) { toast.error("Veuillez joindre votre carte d'identité ou Kbis."); return; }

    setIsLoading(true);
    const data = new FormData();
    Object.entries(formData).forEach(([k, v]) => { if (k !== "pieceJointe" && k !== "confirmPassword") data.append(k, v as string); });
    if (formData.pieceJointe) data.append("pieceJointe", formData.pieceJointe);

    try {
      const res = await fetch(`${API_URL}/inscription`, { method: "POST", body: data });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message || "Échec de l'inscription."); }
      toast.success("Demande envoyée — vous recevrez un email après vérification.");
      navigate("/espace-pro");
    } catch (err: any) {
      toast.error(err.message || "Une erreur est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  const Field = ({ id, label, type = "text", placeholder, required = false, pattern, minLength }: any) => (
    <div>
      <label htmlFor={id} className="font-sans-dm text-[9px] tracking-[0.2em] uppercase text-[#F7F4EE]/40 block mb-3">
        {label}{required && " *"}
      </label>
      <input
        id={id} type={type} placeholder={placeholder} required={required}
        pattern={pattern} minLength={minLength}
        onChange={handleChange}
        className="w-full bg-transparent border-b border-[#F7F4EE]/15 focus:border-[#C9A96E] outline-none text-sm font-light py-3 text-[#F7F4EE] placeholder:text-[#F7F4EE]/25 transition-colors duration-300"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0F0E0C] flex items-center justify-center px-6 py-20">
      <div className="w-full max-w-xl">

        <Link to="/" className="font-playfair text-xl italic text-[#F7F4EE] tracking-wide block mb-12">
          L'Atelier des Arts
        </Link>

        <div className="mb-10">
          <span className="font-sans-dm text-[9px] tracking-[0.3em] uppercase text-[#C9A96E] block mb-3">
            Espace professionnel
          </span>
          <h1 className="font-playfair text-3xl font-normal text-[#F7F4EE]">
            Ouvrir un compte
          </h1>
          <p className="font-sans-dm text-xs text-[#F7F4EE]/35 mt-2 font-light">
            Votre compte sera validé après vérification manuelle de votre dossier.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Société */}
          <div className="space-y-6">
            <span className="font-sans-dm text-[9px] tracking-[0.2em] uppercase text-[#C9A96E]/60 block">
              Informations société
            </span>
            <Field id="nomSociete" label="Nom de la société" placeholder="Optique Example" required />
            <Field id="email" label="Email professionnel" type="email" placeholder="contact@optique.fr" required />
            <Field id="siret" label="Numéro SIRET" placeholder="14 chiffres" required pattern="\d{14}" />
          </div>

          {/* Contact */}
          <div className="space-y-6 pt-6 border-t border-[#F7F4EE]/8">
            <span className="font-sans-dm text-[9px] tracking-[0.2em] uppercase text-[#C9A96E]/60 block">
              Contact & Livraison
            </span>
            <Field id="phone" label="Téléphone" type="tel" placeholder="06 XX XX XX XX" />
            <Field id="address" label="Adresse complète" placeholder="12 Rue de l'Optique" />
            <Field id="zipCity" label="Code postal et ville" placeholder="75001 Paris" />
          </div>

          {/* Mot de passe */}
          <div className="space-y-6 pt-6 border-t border-[#F7F4EE]/8">
            <span className="font-sans-dm text-[9px] tracking-[0.2em] uppercase text-[#C9A96E]/60 block">
              Mot de passe
            </span>
            <Field id="password" label="Mot de passe" type="password" placeholder="8 caractères minimum" required minLength={8} />
            <Field id="confirmPassword" label="Confirmer le mot de passe" type="password" placeholder="••••••••" required />
          </div>

          {/* Pièce jointe */}
          <div className="pt-6 border-t border-[#F7F4EE]/8">
            <label className="font-sans-dm text-[9px] tracking-[0.2em] uppercase text-[#F7F4EE]/40 block mb-3">
              Carte d'identité / Kbis *
            </label>
            <label className="block border border-[#F7F4EE]/12 hover:border-[#C9A96E]/40 transition-colors cursor-pointer p-5 text-center">
              <input
                type="file" required accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange} className="hidden"
              />
              <span className="font-sans-dm text-xs text-[#F7F4EE]/40 font-light">
                {formData.pieceJointe ? formData.pieceJointe.name : "Cliquez pour choisir un fichier — PDF, JPG ou PNG"}
              </span>
            </label>
          </div>

          <button type="submit" disabled={isLoading} className="w-full btn-gold py-4 text-[10px] disabled:opacity-50">
            <span>{isLoading ? "Envoi en cours..." : "Soumettre la demande"}</span>
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#F7F4EE]/8 text-center">
          <Link to="/espace-pro" className="font-sans-dm text-[10px] tracking-[0.1em] text-[#F7F4EE]/30 hover:text-[#C9A96E] transition-colors">
            Déjà un compte — Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Inscription;
