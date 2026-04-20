// src/pages/espacepro.tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { API_URL } from "@/lib/api";

const EspacePro = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.error("Veuillez remplir tous les champs.");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Échec de la connexion.");
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate(data.user.role === "admin" ? "/admin" : "/dashboardpro");
    } catch (err: any) {
      toast.error(err.message || "Une erreur est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0E0C] flex">

      {/* Panneau gauche — décoratif */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-end p-16">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F0E0C] via-[#1C1A17] to-[#0F0E0C]" />
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: "linear-gradient(var(--gold) 1px, transparent 1px), linear-gradient(90deg, var(--gold) 1px, transparent 1px)",
          backgroundSize: "60px 60px"
        }} />
        <div className="relative z-10">
          <Link to="/" className="font-playfair text-2xl italic text-[#F7F4EE] tracking-wide block mb-6">
            L'Atelier des Arts
          </Link>
          <div className="w-8 h-px bg-[#C9A96E] mb-6" />
          <p className="font-cormorant text-3xl italic text-[#F7F4EE]/60 leading-relaxed">
            "Signez votre regard<br />avec élégance."
          </p>
        </div>
      </div>

      {/* Panneau droit — formulaire */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-8 py-16">
        <div className="w-full max-w-sm">

          <Link to="/" className="font-playfair text-xl italic text-[#F7F4EE] tracking-wide block mb-12 lg:hidden">
            L'Atelier des Arts
          </Link>

          <div className="mb-10">
            <span className="font-sans-dm text-[9px] tracking-[0.3em] uppercase text-[#C9A96E] block mb-3">
              Espace professionnel
            </span>
            <h1 className="font-playfair text-3xl font-normal text-[#F7F4EE]">
              Accès Pro
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label htmlFor="email" className="font-sans-dm text-[9px] tracking-[0.2em] uppercase text-[#F7F4EE]/40 block mb-3">
                Email professionnel
              </label>
              <input
                id="email"
                type="email"
                required
                onChange={handleChange}
                placeholder="votre@email.com"
                className="w-full bg-transparent border-b border-[#F7F4EE]/15 focus:border-[#C9A96E] outline-none text-sm font-light py-3 text-[#F7F4EE] placeholder:text-[#F7F4EE]/25 transition-colors duration-300"
              />
            </div>

            <div>
              <label htmlFor="password" className="font-sans-dm text-[9px] tracking-[0.2em] uppercase text-[#F7F4EE]/40 block mb-3">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                required
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full bg-transparent border-b border-[#F7F4EE]/15 focus:border-[#C9A96E] outline-none text-sm font-light py-3 text-[#F7F4EE] placeholder:text-[#F7F4EE]/25 transition-colors duration-300"
              />
              <div className="text-right mt-3">
                <Link to="/mot-de-passe-oublie" className="font-sans-dm text-[9px] tracking-[0.1em] text-[#F7F4EE]/30 hover:text-[#C9A96E] transition-colors">
                  Mot de passe oublié ?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-gold py-4 text-[10px] disabled:opacity-50"
            >
              <span>{isLoading ? "Connexion en cours..." : "Se connecter"}</span>
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-[#F7F4EE]/8 text-center">
            <Link to="/inscription" className="font-sans-dm text-[10px] tracking-[0.1em] text-[#F7F4EE]/30 hover:text-[#C9A96E] transition-colors">
              Pas encore de compte — S'inscrire
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EspacePro;
