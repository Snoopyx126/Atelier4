// src/pages/AdminUsers.tsx
// Onglet admin : créer des lecteurs, assigner leurs magasins, éditer les fiches magasins

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from "@/components/Navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus, Pencil, Trash2, Store, Eye, EyeOff, ArrowLeft, Search, Mail, Phone, MapPin, Building2, Loader2 } from "lucide-react";
import { authFetch, API_URL } from "@/lib/api";

const getBase = () => API_URL.replace('/api', '');

interface User {
  _id: string;
  nomSociete: string;
  email: string;
  siret: string;
  phone?: string;
  address?: string;
  zipCity?: string;
  role: string;
  isVerified?: boolean;
  assignedShops?: string[];
}

const S = {
  card: "bg-white rounded-2xl border border-[#EDE8DF] shadow-sm",
  label: "text-[9px] font-normal tracking-[0.22em] uppercase text-[#C9A96E] block mb-1.5",
  inp: "bg-white border border-[#EDE8DF] rounded-xl text-sm focus:ring-1 focus:ring-[#C9A96E] focus:border-[#C9A96E] transition-all h-10",
  btnP: "inline-flex items-center justify-center gap-2 bg-[#0F0E0C] text-[#F7F4EE] hover:bg-[#1C1A17] rounded-xl text-[10px] tracking-widest uppercase font-normal transition-all px-4 h-9 cursor-pointer border-0",
  btnO: "inline-flex items-center justify-center gap-2 bg-white border border-[#EDE8DF] text-[#0F0E0C] hover:bg-[#F7F4EE] rounded-xl text-[10px] font-normal transition-all px-4 h-9 cursor-pointer",
  btnD: "inline-flex items-center justify-center gap-2 border border-red-200 text-red-500 bg-white hover:bg-red-50 rounded-xl text-[10px] font-normal transition-all h-8 w-8 cursor-pointer",
};

// ─── Modale : Créer / Modifier un lecteur ────────────────────────────────────
const LecteurModal = ({
  isOpen, onClose, onSaved, shops, editUser,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  shops: User[];
  editUser: User | null;
}) => {
  const [nomSociete, setNomSociete] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [assignedShops, setAssignedShops] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (editUser) {
      setNomSociete(editUser.nomSociete);
      setEmail(editUser.email);
      setPassword("");
      setAssignedShops(editUser.assignedShops || []);
    } else {
      setNomSociete(""); setEmail(""); setPassword(""); setAssignedShops([]);
    }
  }, [editUser, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload: any = { nomSociete, email, role: "lecteur", assignedShops, isVerified: true };
      if (!editUser) {
        if (!password) { toast.error("Le mot de passe est obligatoire."); setBusy(false); return; }
        payload.password = password;
        payload.siret = "00000000000000"; // placeholder obligatoire backend
      } else {
        if (password) payload.newPassword = password;
      }
      const url = editUser
        ? `${getBase()}/api/users/${editUser._id}`
        : `${getBase()}/api/inscription`;
      const method = editUser ? "PUT" : "POST";
      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(editUser ? "Lecteur mis à jour !" : "Lecteur créé !");
        onSaved();
        onClose();
      } else {
        toast.error(data.message || "Erreur.");
      }
    } catch { toast.error("Erreur serveur."); }
    finally { setBusy(false); }
  };

  const toggleShop = (id: string) =>
    setAssignedShops(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-white rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-[#EDE8DF]">
          <DialogTitle className="font-playfair text-xl font-normal text-[#0F0E0C]">
            {editUser ? "Modifier le lecteur" : "Créer un lecteur"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          <div>
            <Label className={S.label}>Nom / Identifiant</Label>
            <Input value={nomSociete} onChange={e => setNomSociete(e.target.value)} required className={S.inp} placeholder="Ex : Représentant Paris" />
          </div>
          <div>
            <Label className={S.label}>Email de connexion</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required className={S.inp} />
          </div>
          <div>
            <Label className={S.label}>{editUser ? "Nouveau mot de passe (laisser vide = inchangé)" : "Mot de passe *"}</Label>
            <div className="relative">
              <Input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required={!editUser}
                className={S.inp + " pr-10"}
                placeholder={editUser ? "Laisser vide pour ne pas changer" : "Min. 8 caractères"}
                minLength={password ? 8 : undefined}
              />
              <button type="button" onClick={() => setShowPwd(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Assignation des magasins */}
          <div>
            <Label className={S.label}>Magasins visibles ({assignedShops.length} sélectionné{assignedShops.length > 1 ? 's' : ''})</Label>
            <div className="border border-[#EDE8DF] rounded-xl max-h-48 overflow-y-auto divide-y divide-[#F0EDE7]">
              {shops.length === 0 ? (
                <p className="text-xs text-gray-300 p-4 text-center">Aucun magasin (utilisateurs de rôle "user") disponible.</p>
              ) : shops.map(shop => (
                <div key={shop._id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#F7F4EE] transition-colors">
                  <Checkbox
                    id={`shop-${shop._id}`}
                    checked={assignedShops.includes(shop._id)}
                    onCheckedChange={() => toggleShop(shop._id)}
                  />
                  <label htmlFor={`shop-${shop._id}`} className="flex-1 cursor-pointer">
                    <span className="text-sm font-medium text-[#0F0E0C]">{shop.nomSociete}</span>
                    {shop.zipCity && <span className="text-xs text-gray-400 ml-2">{shop.zipCity}</span>}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className={S.btnO}>Annuler</button>
            <button type="submit" disabled={busy} className={S.btnP}>
              {busy ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Enregistrement...</> : (editUser ? "Mettre à jour" : "Créer")}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ─── Modale : Éditer les infos d'un magasin (rôle user) ─────────────────────
const ShopEditModal = ({
  isOpen, onClose, shop, onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  shop: User | null;
  onSaved: (updated: User) => void;
}) => {
  const [nomSociete, setNomSociete] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [zipCity, setZipCity] = useState("");
  const [siret, setSiret] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (shop) {
      setNomSociete(shop.nomSociete || "");
      setEmail(shop.email || "");
      setPhone(shop.phone || "");
      setAddress(shop.address || "");
      setZipCity(shop.zipCity || "");
      setSiret(shop.siret || "");
    }
  }, [shop, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop) return;
    setBusy(true);
    try {
      const res = await authFetch(`${getBase()}/api/users/${shop._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nomSociete, email, phone, address, zipCity, siret }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Fiche magasin mise à jour !");
        onSaved(data.user);
        onClose();
      } else {
        toast.error(data.message || "Erreur.");
      }
    } catch { toast.error("Erreur serveur."); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-[#EDE8DF]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#F7F4EE] border border-[#EDE8DF] flex items-center justify-center">
              <Store className="w-4 h-4 text-[#C9A96E]" />
            </div>
            <div>
              <span className={S.label} style={{ marginBottom: 0 }}>Modifier la fiche</span>
              <DialogTitle className="font-playfair text-lg font-normal text-[#0F0E0C]">{shop?.nomSociete}</DialogTitle>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <Label className={S.label}>Nom du magasin</Label>
            <Input value={nomSociete} onChange={e => setNomSociete(e.target.value)} required className={S.inp} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className={S.label}>Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className={S.inp} />
            </div>
            <div>
              <Label className={S.label}>Téléphone</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="06 12 34 56 78" className={S.inp} />
            </div>
          </div>
          <div>
            <Label className={S.label}>Adresse complète</Label>
            <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="12 Rue des Opticiens" className={S.inp} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className={S.label}>Code postal et ville</Label>
              <Input value={zipCity} onChange={e => setZipCity(e.target.value)} placeholder="75001 Paris" className={S.inp} />
            </div>
            <div>
              <Label className={S.label}>SIRET</Label>
              <Input value={siret} onChange={e => setSiret(e.target.value)} className={S.inp} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className={S.btnO}>Annuler</button>
            <button type="submit" disabled={busy} className={S.btnP}>
              {busy ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Enregistrement...</> : "Enregistrer"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ─── PAGE PRINCIPALE ─────────────────────────────────────────────────────────
export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<'lecteurs' | 'magasins'>('lecteurs');

  // Modales
  const [lecteurOpen, setLecteurOpen] = useState(false);
  const [editLecteur, setEditLecteur] = useState<User | null>(null);
  const [shopEditOpen, setShopEditOpen] = useState(false);
  const [editShop, setEditShop] = useState<User | null>(null);

  const fetchUsers = async () => {
    const r = await authFetch(`${getBase()}/api/users`);
    const d = await r.json();
    if (d.success) {
      setUsers(d.users.sort((a: User, b: User) =>
        a.nomSociete.localeCompare(b.nomSociete, 'fr', { sensitivity: 'base' })
      ));
    }
    setLoading(false);
  };

  useEffect(() => {
    const str = localStorage.getItem("user");
    if (!str) { navigate("/"); return; }
    try {
      const u = JSON.parse(str);
      if (u.role !== 'admin') { navigate("/"); return; }
      fetchUsers();
    } catch { navigate("/"); }
  }, [navigate]);

  const deleteUser = async (u: User) => {
    if (!confirm(`Supprimer "${u.nomSociete}" ?`)) return;
    const r = await authFetch(`${getBase()}/api/users/${u._id}`, { method: 'DELETE' });
    const d = await r.json();
    if (d.success) { toast.success("Utilisateur supprimé."); fetchUsers(); }
    else toast.error(d.message || "Erreur.");
  };

  const normalize = (t?: string) =>
    t ? t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : "";

  const lecteurs = users.filter(u => u.role === 'lecteur' &&
    normalize(u.nomSociete + u.email).includes(normalize(search)));
  const shops = users.filter(u => u.role === 'user' || u.role === 'manager');
  const filteredShops = shops.filter(u =>
    normalize(u.nomSociete + u.email + u.zipCity).includes(normalize(search)));

  if (loading) return (
    <div className="min-h-screen bg-[#F7F4EE] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-[#C9A96E]" />
        <span className="text-[10px] tracking-[0.25em] uppercase text-gray-400">Chargement</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F4EE] flex flex-col">
      <Navigation />
      <div className="flex-grow pt-24 pb-12 px-4 sm:px-6 container mx-auto max-w-5xl">

        {/* En-tête */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-10 gap-4">
          <div>
            <button onClick={() => navigate('/admin')} className="flex items-center gap-1.5 text-[9px] tracking-[0.2em] uppercase text-gray-400 hover:text-[#C9A96E] transition-colors mb-3">
              <ArrowLeft className="w-3 h-3" /> Retour au tableau de bord
            </button>
            <span className={S.label}>Administration</span>
            <h1 className="font-playfair text-3xl font-normal text-[#0F0E0C] tracking-tight">Gestion des Utilisateurs</h1>
          </div>
          {tab === 'lecteurs' && (
            <button onClick={() => { setEditLecteur(null); setLecteurOpen(true); }} className={S.btnP}>
              <UserPlus className="w-3.5 h-3.5" /> Créer un lecteur
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white border border-[#EDE8DF] rounded-2xl p-1 inline-flex shadow-sm mb-6">
          {(['lecteurs', 'magasins'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-xl px-6 py-2.5 text-[10px] tracking-[0.15em] uppercase transition-all ${tab === t ? 'bg-[#0F0E0C] text-[#F7F4EE]' : 'text-gray-400 hover:text-[#0F0E0C]'}`}>
              {t === 'lecteurs' ? `Lecteurs (${lecteurs.length})` : `Magasins (${shops.length})`}
            </button>
          ))}
        </div>

        {/* Recherche */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4" />
          <input
            className="w-full pl-11 pr-4 py-3 bg-white border border-[#EDE8DF] rounded-2xl text-sm placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#C9A96E] focus:border-[#C9A96E] transition-all"
            placeholder={tab === 'lecteurs' ? "Nom, email..." : "Magasin, ville, email..."}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* ─── ONGLET LECTEURS ─── */}
        {tab === 'lecteurs' && (
          <div className={S.card + " overflow-hidden"}>
            <div className="px-6 py-4 border-b border-[#EDE8DF]">
              <p className={S.label}>Accès restreint</p>
              <h2 className="font-playfair text-xl font-normal text-[#0F0E0C]">Comptes Lecteurs</h2>
            </div>
            {lecteurs.length === 0 ? (
              <div className="text-center py-16 text-gray-300 text-sm">
                Aucun lecteur. Créez-en un avec le bouton ci-dessus.
              </div>
            ) : (
              <div className="divide-y divide-[#EDE8DF]">
                {lecteurs.map(u => (
                  <div key={u._id} className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-[#FAFAF8] transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-medium text-[#0F0E0C]">{u.nomSociete}</p>
                        <span className="text-xs rounded-full px-3 py-1 bg-violet-50 border border-violet-100 text-violet-600 font-semibold">Lecteur</span>
                      </div>
                      <p className="text-xs text-gray-400 flex items-center gap-1"><Mail className="w-3 h-3" /> {u.email}</p>
                      {/* Magasins assignés */}
                      {(u.assignedShops || []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {(u.assignedShops || []).map(sid => {
                            const s = shops.find(x => x._id === sid);
                            return s ? (
                              <span key={sid} className="text-[9px] rounded-full px-2.5 py-1 bg-[#F7F4EE] border border-[#EDE8DF] text-gray-500 flex items-center gap-1">
                                <Store className="w-2.5 h-2.5 text-[#C9A96E]" /> {s.nomSociete}
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => { setEditLecteur(u); setLecteurOpen(true); }} className={S.btnO + " h-8 px-3 gap-1 text-[10px]"}>
                        <Pencil className="w-3.5 h-3.5" /> Modifier
                      </button>
                      <button onClick={() => deleteUser(u)} className={S.btnD}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── ONGLET MAGASINS ─── */}
        {tab === 'magasins' && (
          <div className={S.card + " overflow-hidden"}>
            <div className="px-6 py-4 border-b border-[#EDE8DF]">
              <p className={S.label}>Fiches clients</p>
              <h2 className="font-playfair text-xl font-normal text-[#0F0E0C]">Magasins & Contacts</h2>
            </div>
            {filteredShops.length === 0 ? (
              <div className="text-center py-16 text-gray-300 text-sm">Aucun résultat.</div>
            ) : (
              <div className="divide-y divide-[#EDE8DF]">
                {filteredShops.map(u => (
                  <div key={u._id} className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-[#FAFAF8] transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <p className="font-medium text-[#0F0E0C]">{u.nomSociete}</p>
                        {u.isVerified
                          ? <span className="text-xs rounded-full px-2.5 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-600">Validé</span>
                          : <span className="text-xs rounded-full px-2.5 py-0.5 bg-amber-50 border border-amber-100 text-amber-600">En attente</span>
                        }
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        <span className="text-xs text-gray-400 flex items-center gap-1"><Mail className="w-3 h-3" />{u.email}</span>
                        {u.phone && <span className="text-xs text-gray-400 flex items-center gap-1"><Phone className="w-3 h-3" />{u.phone}</span>}
                        {u.zipCity && <span className="text-xs text-gray-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{u.address ? `${u.address}, ` : ''}{u.zipCity}</span>}
                        {u.siret && <span className="text-xs text-gray-400 flex items-center gap-1"><Building2 className="w-3 h-3" />SIRET : {u.siret}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => { setEditShop(u); setShopEditOpen(true); }}
                      className={S.btnO + " h-8 px-3 gap-1 text-[10px] flex-shrink-0"}
                    >
                      <Pencil className="w-3.5 h-3.5" /> Modifier
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modales */}
      <LecteurModal
        isOpen={lecteurOpen}
        onClose={() => setLecteurOpen(false)}
        onSaved={fetchUsers}
        shops={shops}
        editUser={editLecteur}
      />
      <ShopEditModal
        isOpen={shopEditOpen}
        onClose={() => setShopEditOpen(false)}
        shop={editShop}
        onSaved={updated => setUsers(p => p.map(u => u._id === updated._id ? updated : u))}
      />
    </div>
  );
}
