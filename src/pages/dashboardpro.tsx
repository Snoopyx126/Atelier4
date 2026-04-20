// src/pages/dashboardpro.tsx
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Phone, Mail, FileText, ShoppingCart, Receipt, MapPin } from "lucide-react";

interface UserData {
  id: string; nomSociete: string; email: string; siret: string;
  phone?: string; address?: string; zipCity?: string;
}

const DashboardPro = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const str = localStorage.getItem("user");
    if (str) {
      try { setUser(JSON.parse(str)); }
      catch { localStorage.removeItem("user"); navigate("/espace-pro"); }
    } else {
      navigate("/espace-pro");
    }
    setLoading(false);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  if (loading) return (
    <div className="min-h-screen bg-[#F7F4EE] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-px bg-[#C9A96E] animate-pulse" />
        <span className="font-sans-dm text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Chargement</span>
      </div>
    </div>
  );
  if (!user) return null;

  const tiles = [
    {
      label: "Production",
      title: "Suivi de mes montages",
      desc: "Créez et suivez l'avancement de vos dossiers en temps réel.",
      icon: ShoppingCart,
      action: () => navigate("/mes-commandes"),
      accent: "border-[#C9A96E]/30 hover:border-[#C9A96E]",
      badge: "Commandes",
    },
    {
      label: "Documents",
      title: "Mes factures",
      desc: "Consultez et téléchargez vos documents de facturation.",
      icon: Receipt,
      action: () => navigate("/mes-commandes?tab=factures"),
      accent: "border-[#EDE8DF] hover:border-[#0F0E0C]",
      badge: "Factures",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F7F4EE] flex flex-col">
      <Navigation />

      <div className="flex-grow pt-28 pb-16 px-6 container mx-auto max-w-5xl">

        {/* En-tête */}
        <div className="mb-14 animate-fade-up">
          <span className="section-label">Espace professionnel</span>
          <h1 className="font-playfair text-4xl md:text-5xl font-normal text-foreground leading-tight">
            Bonjour,<br />
            <span className="italic text-[#9A7A45]">{user.nomSociete}</span>
          </h1>
          <div className="gold-divider-left" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Carte profil */}
          <div className="animate-fade-up delay-100">
            <div className="border border-[#EDE8DF] bg-white p-8">
              <span className="font-sans-dm text-[9px] tracking-[0.2em] uppercase text-[#C9A96E] block mb-6">
                Mon profil
              </span>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-3.5 h-3.5 text-[#C9A96E] flex-shrink-0" />
                  <span className="font-sans-dm text-xs text-foreground font-light break-all">{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-3.5 h-3.5 text-[#C9A96E] flex-shrink-0" />
                    <span className="font-sans-dm text-xs text-foreground font-light">{user.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <FileText className="w-3.5 h-3.5 text-[#C9A96E] flex-shrink-0" />
                  <span className="font-sans-dm text-xs text-muted-foreground font-light">SIRET : {user.siret}</span>
                </div>
                {(user.address || user.zipCity) && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-3.5 h-3.5 text-[#C9A96E] flex-shrink-0 mt-0.5" />
                    <span className="font-sans-dm text-xs text-muted-foreground font-light leading-relaxed">
                      {user.address}{user.address && user.zipCity && <br />}{user.zipCity}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-[#EDE8DF] space-y-3">
                <button
                  onClick={() => navigate("/profil")}
                  className="w-full btn-ghost text-[9px] py-2.5"
                >
                  Modifier le profil
                </button>
                <Link to="/comment-ca-marche" className="w-full btn-ghost text-[9px] py-2.5 block text-center tracking-[0.12em] uppercase border border-foreground/20 hover:bg-foreground hover:text-[#F7F4EE] transition-all duration-300 font-sans-dm">
                  Comment ça marche ?
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full font-sans-dm text-[9px] tracking-[0.12em] uppercase text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  Déconnexion
                </button>
              </div>
            </div>
          </div>

          {/* Tuiles actions */}
          <div className="lg:col-span-2 space-y-5">
            {tiles.map((tile, i) => {
              const Icon = tile.icon;
              return (
                <div
                  key={i}
                  onClick={tile.action}
                  className={`group border bg-white p-8 cursor-pointer transition-all duration-400 animate-fade-up ${tile.accent}`}
                  style={{ animationDelay: `${(i + 2) * 100}ms` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <span className="font-sans-dm text-[9px] tracking-[0.2em] uppercase text-[#C9A96E] block mb-2">
                        {tile.label}
                      </span>
                      <h3 className="font-playfair text-xl font-normal text-foreground mb-3">
                        {tile.title}
                      </h3>
                      <p className="font-sans-dm text-xs text-muted-foreground font-light leading-relaxed">
                        {tile.desc}
                      </p>
                    </div>
                    <div className="w-10 h-10 border border-[#EDE8DF] group-hover:border-[#C9A96E] flex items-center justify-center transition-colors duration-400 flex-shrink-0">
                      <Icon className="w-4 h-4 text-[#C9A96E]" />
                    </div>
                  </div>

                  <div className="mt-6 flex items-center gap-3 text-[#C9A96E] group-hover:gap-5 transition-all duration-400">
                    <span className="w-6 h-px bg-[#C9A96E]" />
                    <span className="font-sans-dm text-[9px] tracking-[0.2em] uppercase">
                      Accéder
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPro;
