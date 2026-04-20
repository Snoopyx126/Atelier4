import Navigation from "@/components/Navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Loader2, User, Lock, MapPin } from "lucide-react";
import { authFetch, API_URL } from "@/lib/api";

const S = {
  card: "bg-white rounded-2xl border border-[#EDE8DF] shadow-sm",
  label: "text-[9px] font-normal tracking-[0.22em] uppercase text-[#C9A96E] block mb-1.5",
  inp: "bg-white border border-[#EDE8DF] rounded-xl text-sm focus:ring-1 focus:ring-[#C9A96E] focus:border-[#C9A96E] transition-all h-10",
  btnP: "w-full h-10 bg-[#0F0E0C] text-[#F7F4EE] hover:bg-[#1C1A17] rounded-xl text-[10px] tracking-widest uppercase font-normal transition-all cursor-pointer border-0 flex items-center justify-center gap-2",
};

const Profil = () => {
  const [id,          setId]          = useState("");
  const [nomSociete,  setNomSociete]  = useState("");
  const [email,       setEmail]       = useState("");
  const [siret,       setSiret]       = useState("");
  const [phone,       setPhone]       = useState("");
  const [address,     setAddress]     = useState("");
  const [zipCity,     setZipCity]     = useState("");
  const [currentPwd,  setCurrentPwd]  = useState("");
  const [newPwd,      setNewPwd]      = useState("");
  const [submitting,  setSubmitting]  = useState(false);

  useEffect(() => {
    const str = localStorage.getItem("user");
    if (str) {
      try {
        const u = JSON.parse(str);
        setId(u.id || "");
        setNomSociete(u.nomSociete || "");
        setEmail(u.email || "");
        setSiret(u.siret || "");
        setPhone(u.phone || "");
        setAddress(u.address || "");
        setZipCity(u.zipCity || "");
      } catch {}
    }
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await authFetch(`${API_URL}/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nomSociete, email, siret, phone, address, zipCity, currentPassword: currentPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("user", JSON.stringify(data.user));
        toast.success("Profil mis à jour !");
        setCurrentPwd("");
        setNewPwd("");
      } else {
        toast.error(data.message || "Erreur de mise à jour");
      }
    } catch { toast.error("Erreur serveur"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-[#F7F4EE] flex flex-col">
      <Navigation />
      <div className="flex-grow pt-24 pb-12 px-6 max-w-xl mx-auto w-full">

        <div className="mb-8">
          <span className={S.label}>Compte</span>
          <h1 className="font-playfair text-3xl font-normal text-[#0F0E0C] tracking-tight">Mon Profil</h1>
        </div>

        <form onSubmit={handleUpdate} className="space-y-5">

          {/* Infos société */}
          <div className={S.card + " p-6"}>
            <div className="flex items-center gap-2 mb-5">
              <User className="w-4 h-4 text-[#C9A96E]"/>
              <p className={S.label} style={{marginBottom:0}}>Informations</p>
            </div>
            <div className="space-y-4">
              <div>
                <Label className={S.label}>Nom de la société</Label>
                <Input value={nomSociete} onChange={e => setNomSociete(e.target.value)} className={S.inp}/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className={S.label}>Email</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className={S.inp}/>
                </div>
                <div>
                  <Label className={S.label}>Téléphone</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="06 12 34 56 78" className={S.inp}/>
                </div>
              </div>
              <div>
                <Label className={S.label}>SIRET</Label>
                <Input value={siret} onChange={e => setSiret(e.target.value)} className={S.inp}/>
              </div>
            </div>
          </div>

          {/* Adresse */}
          <div className={S.card + " p-6"}>
            <div className="flex items-center gap-2 mb-5">
              <MapPin className="w-4 h-4 text-[#C9A96E]"/>
              <p className={S.label} style={{marginBottom:0}}>Adresse</p>
            </div>
            <div className="space-y-4">
              <div>
                <Label className={S.label}>Adresse complète</Label>
                <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="12 Rue des Opticiens" className={S.inp}/>
              </div>
              <div>
                <Label className={S.label}>Code postal et ville</Label>
                <Input value={zipCity} onChange={e => setZipCity(e.target.value)} placeholder="75001 Paris" className={S.inp}/>
              </div>
            </div>
          </div>

          {/* Mot de passe */}
          <div className={S.card + " p-6"}>
            <div className="flex items-center gap-2 mb-5">
              <Lock className="w-4 h-4 text-[#C9A96E]"/>
              <p className={S.label} style={{marginBottom:0}}>Changer le mot de passe</p>
            </div>
            <div className="space-y-4">
              <div>
                <Label className={S.label}>Mot de passe actuel</Label>
                <Input
                  type="password"
                  value={currentPwd}
                  onChange={e => setCurrentPwd(e.target.value)}
                  autoComplete="current-password"
                  className={S.inp}
                />
              </div>
              <div>
                <Label className={S.label}>Nouveau mot de passe</Label>
                <Input
                  type="password"
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  autoComplete="new-password"
                  className={S.inp}
                />
              </div>
            </div>
          </div>

          <button type="submit" disabled={submitting} className={S.btnP}>
            {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin"/> Enregistrement...</> : "Mettre à jour le profil"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profil;
