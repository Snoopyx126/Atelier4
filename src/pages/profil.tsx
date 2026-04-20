// src/pages/profil.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { toast } from "sonner";
import { API_URL, authFetch } from "@/lib/api";

const Profil = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    id: "", nomSociete: "", email: "", siret: "",
    phone: "", address: "", zipCity: "",
    currentPassword: "", newPassword: "",
  });

  useEffect(() => {
    const str = localStorage.getItem("user");
    if (str) {
      const u = JSON.parse(str);
      setFormData(prev => ({ ...prev, id: u.id, nomSociete: u.nomSociete, email: u.email, siret: u.siret, phone: u.phone || "", address: u.address || "", zipCity: u.zipCity || "" }));
    } else {
      navigate("/espace-pro");
    }
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch(`${API_URL}/users/${formData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("user", JSON.stringify(data.user));
        toast.success("Profil mis à jour.");
        setFormData(prev => ({ ...prev, currentPassword: "", newPassword: "" }));
      } else {
        toast.error(data.message || "Erreur de mise à jour.");
      }
    } catch {
      toast.error("Erreur serveur.");
    }
  };

  const Field = ({ id, label, type = "text", placeholder }: any) => (
    <div>
      <label htmlFor={id} className="font-sans-dm text-[9px] tracking-[0.2em] uppercase text-muted-foreground block mb-3">
        {label}
      </label>
      <input
        id={id} type={type} placeholder={placeholder}
        value={(formData as any)[id]}
        onChange={handleChange}
        className="w-full bg-transparent border-b border-[#EDE8DF] focus:border-[#C9A96E] outline-none text-sm font-light py-3 text-foreground placeholder:text-muted-foreground transition-colors duration-300"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F4EE] flex flex-col">
      <Navigation />
      <div className="flex-grow pt-28 pb-16 px-6 container mx-auto max-w-xl">

        <div className="mb-10 animate-fade-up">
          <span className="section-label">Compte</span>
          <h1 className="font-playfair text-3xl font-normal text-foreground">Mon profil</h1>
          <div className="gold-divider-left" />
        </div>

        <form onSubmit={handleUpdate} className="animate-fade-up delay-100 space-y-10">

          <div className="space-y-6">
            <span className="font-sans-dm text-[9px] tracking-[0.2em] uppercase text-[#C9A96E]/70 block">
              Informations société
            </span>
            <Field id="nomSociete" label="Nom société" placeholder="Optique Example" />
            <Field id="email" label="Email" type="email" placeholder="votre@email.com" />
            <Field id="siret" label="SIRET" placeholder="14 chiffres" />
          </div>

          <div className="space-y-6 pt-6 border-t border-[#EDE8DF]">
            <span className="font-sans-dm text-[9px] tracking-[0.2em] uppercase text-[#C9A96E]/70 block">
              Contact & Livraison
            </span>
            <Field id="phone" label="Téléphone" type="tel" placeholder="06 XX XX XX XX" />
            <Field id="address" label="Adresse complète" placeholder="12 Rue de l'Optique" />
            <Field id="zipCity" label="Code postal et ville" placeholder="75001 Paris" />
          </div>

          <div className="space-y-6 pt-6 border-t border-[#EDE8DF]">
            <span className="font-sans-dm text-[9px] tracking-[0.2em] uppercase text-[#C9A96E]/70 block">
              Sécurité
            </span>
            <Field id="currentPassword" label="Mot de passe actuel" type="password" placeholder="••••••••" />
            <Field id="newPassword" label="Nouveau mot de passe" type="password" placeholder="Laisser vide si inchangé" />
          </div>

          <div className="flex gap-4 pt-4">
            <button type="submit" className="btn-dark">
              Enregistrer
            </button>
            <button type="button" onClick={() => navigate("/dashboardpro")} className="btn-ghost">
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profil;
