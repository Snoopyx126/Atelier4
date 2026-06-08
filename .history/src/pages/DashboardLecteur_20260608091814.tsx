// src/pages/DashboardLecteur.tsx
// Rôle "lecteur" : recherche de montages en lecture seule, magasins assignés uniquement

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from "@/components/Navigation";
import { Search, LogOut, Clock, Store } from "lucide-react";
import { authFetch, API_URL } from "@/lib/api";

interface UserData {
  id: string;
  nomSociete: string;
  email: string;
  role: string;
  assignedShops?: string[];
}

interface Montage {
  _id: string;
  reference: string;
  frame?: string;
  description?: string;
  category?: string;
  glassType?: string[];
  urgency?: string;
  diamondCutType?: string;
  engravingCount?: number;
  shapeChange?: boolean;
  statut: string;
  dateReception: string;
  clientName?: string;
  userId?: string;
  statusHistory?: { statut: string; date: string }[];
}

interface Shop {
  _id: string;
  nomSociete: string;
  zipCity?: string;
}

const normalize = (t?: string) =>
  t ? t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : "";

const statusCfg: Record<string, { dot: string; cls: string }> = {
  'En attente': { dot: 'bg-amber-400',   cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  'Reçu':       { dot: 'bg-blue-400',    cls: 'bg-blue-50 text-blue-800 border-blue-200' },
  'En cours':   { dot: 'bg-orange-400',  cls: 'bg-orange-50 text-orange-800 border-orange-200' },
  'Terminé':    { dot: 'bg-emerald-400', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
};

const StatusPill = ({ s }: { s: string }) => {
  const c = statusCfg[s] || { dot: 'bg-gray-300', cls: 'bg-gray-50 text-gray-600 border-gray-200' };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1 border ${c.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
      {s}
    </span>
  );
};

const TimelinePanel = ({ m }: { m: Montage }) => {
  const hist = m.statusHistory || [];
  const scfg = statusCfg[m.statut] || { dot: 'bg-gray-300' };
  return (
    <div className="px-5 pb-4 pt-3 bg-[#FAFAF8] border-t border-[#F0EDE7]">
      <div className="relative pl-4">
        <div className="absolute left-1.5 top-1 bottom-1 w-px bg-[#EDE8DF]" />
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 relative">
            <div className="w-2.5 h-2.5 rounded-full bg-[#EDE8DF] border-2 border-white absolute -left-3.5" />
            <span className="text-xs font-semibold text-gray-500 w-24 flex-shrink-0">Créé</span>
            <span className="text-xs text-gray-400">
              {new Date(m.dateReception).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
          {hist.length > 0
            ? hist.map((h, i) => {
                const hcfg = statusCfg[h.statut] || { dot: 'bg-gray-300' };
                const isLast = i === hist.length - 1;
                return (
                  <div key={i} className="flex items-center gap-2 relative">
                    <div className={`w-2.5 h-2.5 rounded-full border-2 border-white absolute -left-3.5 ${isLast ? hcfg.dot : 'bg-gray-200'}`} />
                    <span className={`text-xs font-semibold w-24 flex-shrink-0 ${isLast ? 'text-[#0F0E0C]' : 'text-gray-500'}`}>{h.statut}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(h.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · {new Date(h.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })
            : m.statut !== 'En attente' && (
                <div className="flex items-center gap-2 relative">
                  <div className={`w-2.5 h-2.5 rounded-full border-2 border-white absolute -left-3.5 ${scfg.dot}`} />
                  <span className="text-xs font-semibold text-[#0F0E0C] w-24 flex-shrink-0">{m.statut}</span>
                  <span className="text-[9px] text-gray-300 italic">date non enregistrée</span>
                </div>
              )}
        </div>
      </div>
    </div>
  );
};

const S = {
  card: "bg-white rounded-2xl border border-[#EDE8DF] shadow-sm",
  label: "text-[9px] font-normal tracking-[0.22em] uppercase text-[#C9A96E] block mb-1.5",
};

export default function DashboardLecteur() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [montages, setMontages] = useState<Montage[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [search, setSearch] = useState("");
  const [selectedShop, setSelectedShop] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [openTimeline, setOpenTimeline] = useState<string | null>(null);

  useEffect(() => {
    const str = localStorage.getItem("user");
    if (!str) { navigate("/espace-pro"); return; }
    try {
      const u: UserData = JSON.parse(str);
      if (u.role !== "lecteur") { navigate("/dashboardpro"); return; }
      setUser(u);

      const assignedIds: string[] = u.assignedShops || [];

      Promise.all([
        authFetch(`${API_URL}/montages`).then(r => r.json()),
        authFetch(`${API_URL}/users`).then(r => r.json()),
      ]).then(([mData, uData]) => {
        if (mData.success) {
          const filtered = assignedIds.length > 0
            ? mData.montages.filter((m: Montage) => assignedIds.includes(m.userId || ""))
            : [];
          setMontages(filtered);
        }
        if (uData.success) {
          const assignedShops: Shop[] = uData.users.filter((c: any) =>
            assignedIds.includes(c._id)
          );
          setShops(assignedShops.sort((a: Shop, b: Shop) =>
            a.nomSociete.localeCompare(b.nomSociete, 'fr', { sensitivity: 'base' })
          ));
        }
        setLoading(false);
      });
    } catch {
      localStorage.removeItem("user");
      navigate("/espace-pro");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const filtered = montages.filter(m => {
    const q = normalize(search);
    const matchSearch = q === "" ||
      normalize(m.reference).includes(q) ||
      normalize(m.clientName).includes(q) ||
      normalize(m.frame).includes(q);
    const matchShop = selectedShop === "all" || m.userId === selectedShop;
    return matchSearch && matchShop;
  });

  if (loading) return (
    <div className="min-h-screen bg-[#F7F4EE] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-[#C9A96E] border-t-transparent rounded-full animate-spin" />
        <span className="text-[10px] tracking-[0.25em] uppercase text-gray-400">Chargement</span>
      </div>
    </div>
  );

  if (!user) return null;

  const shopName = (userId?: string) =>
    shops.find(s => s._id === userId)?.nomSociete || "—";

  return (
    <div className="min-h-screen bg-[#F7F4EE] flex flex-col">
      <Navigation />
      <div className="flex-grow pt-24 pb-12 px-4 sm:px-6 container mx-auto max-w-5xl">

        {/* En-tête */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-10 gap-4">
          <div>
            <span className={S.label}>Consultation</span>
            <h1 className="font-playfair text-3xl font-normal text-[#0F0E0C] tracking-tight">
              Suivi de Production
            </h1>
            <p className="text-sm text-gray-400 mt-1 font-light">
              {filtered.length} dossier{filtered.length > 1 ? 's' : ''} · lecture seule
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 border border-[#EDE8DF] text-gray-500 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-500 rounded-xl text-[10px] font-normal transition-all px-4 h-9 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Déconnexion
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {(['En attente', 'Reçu', 'En cours', 'Terminé'] as const).map(s => {
            const count = montages.filter(m => m.statut === s).length;
            const cfg = statusCfg[s];
            return (
              <div key={s} className={`${S.card} p-5`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <span className={S.label} style={{ marginBottom: 0 }}>{s}</span>
                </div>
                <p className="font-playfair text-3xl font-normal text-[#0F0E0C]">{count}</p>
              </div>
            );
          })}
        </div>

        {/* Filtres */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4" />
            <input
              className="w-full pl-11 pr-4 py-3 bg-white border border-[#EDE8DF] rounded-2xl text-sm placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#C9A96E] focus:border-[#C9A96E] transition-all"
              placeholder="Référence, monture..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {shops.length > 1 && (
            <div className="relative">
              <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4 pointer-events-none" />
              <select
                value={selectedShop}
                onChange={e => setSelectedShop(e.target.value)}
                className="pl-9 pr-8 py-3 bg-white border border-[#EDE8DF] rounded-2xl text-sm text-[#0F0E0C] focus:outline-none focus:ring-1 focus:ring-[#C9A96E] transition-all appearance-none cursor-pointer"
              >
                <option value="all">Tous les magasins</option>
                {shops.map(s => (
                  <option key={s._id} value={s._id}>{s.nomSociete}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Chips magasins */}
        {shops.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {shops.map(s => (
              <button
                key={s._id}
                onClick={() => setSelectedShop(selectedShop === s._id ? "all" : s._id)}
                className={`inline-flex items-center gap-1.5 text-[10px] tracking-wide rounded-full px-4 py-1.5 border transition-colors ${
                  selectedShop === s._id
                    ? 'bg-[#0F0E0C] text-[#F7F4EE] border-[#0F0E0C]'
                    : 'bg-white text-gray-500 border-[#EDE8DF] hover:border-[#C9A96E]'
                }`}
              >
                <Store className="w-3 h-3" />
                {s.nomSociete}
                {s.zipCity && <span className="opacity-50">· {s.zipCity}</span>}
              </button>
            ))}
          </div>
        )}

        {/* Liste */}
        <div className={S.card + " overflow-hidden"}>
          <div className="px-6 py-4 border-b border-[#EDE8DF]">
            <p className={S.label}>Dossiers</p>
            <h2 className="font-playfair text-xl font-normal text-[#0F0E0C]">Montages</h2>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-300 text-sm">
              {shops.length === 0
                ? "Aucun magasin ne vous a été assigné. Contactez l'administrateur."
                : search
                ? "Aucun résultat pour cette recherche."
                : "Aucun dossier disponible."}
            </div>
          ) : (
            <div className="divide-y divide-[#EDE8DF]">
              {filtered.map(m => (
                <React.Fragment key={m._id}>
                  <div className="bg-white hover:bg-[#FAFAF8] transition-colors">
                    <div className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        {shops.length > 1 && (
                          <p className="text-[9px] tracking-[0.2em] uppercase text-[#C9A96E] mb-1.5 flex items-center gap-1">
                            <Store className="w-2.5 h-2.5" />
                            {shopName(m.userId)}
                          </p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="font-bold text-base text-[#0F0E0C] tracking-wide">{m.reference}</span>
                          {m.frame && <><span className="text-gray-300">·</span><span className="text-sm font-medium text-gray-600">{m.frame}</span></>}
                          <StatusPill s={m.statut} />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {m.category && (
                            <span className="text-xs rounded-full px-3 py-1 bg-[#F7F4EE] border border-[#D5CFC6] text-gray-600 font-medium">{m.category}</span>
                          )}
                          {m.urgency && m.urgency !== 'Standard' && (
                            <span className="text-xs rounded-full px-3 py-1 bg-red-50 border border-red-200 text-red-600 font-medium">{m.urgency}</span>
                          )}
                          {m.diamondCutType && m.diamondCutType !== 'Standard' && (
                            <span className="text-xs rounded-full px-3 py-1 bg-blue-50 border border-blue-200 text-blue-600 font-medium">{m.diamondCutType}</span>
                          )}
                          {m.glassType?.map(g => (
                            <span key={g} className="text-xs rounded-full px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-600">{g.replace('Verre ', '')}</span>
                          ))}
                          {(m.engravingCount || 0) > 0 && (
                            <span className="text-xs rounded-full px-3 py-1 bg-purple-50 border border-purple-200 text-purple-700 font-medium">{m.engravingCount} gravure(s)</span>
                          )}
                        </div>
                        {m.description && (
                          <p className="text-xs text-gray-500 mt-2 border-l-2 border-[#D5CFC6] pl-2.5">{m.description}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-[9px] tracking-[0.2em] uppercase text-gray-400">Reçu le</p>
                        <p className="text-sm font-medium text-[#0F0E0C]">
                          {new Date(m.dateReception).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    {/* Timeline toggle */}
                    <div
                      className="px-5 py-2 flex items-center justify-between border-t border-[#F7F4EE] cursor-pointer hover:bg-[#F7F4EE] transition-colors"
                      onClick={() => setOpenTimeline(openTimeline === m._id ? null : m._id)}
                    >
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-300" />
                        <span className="text-xs text-gray-400">Historique d'avancement</span>
                      </div>
                      <svg
                        className={`w-2.5 h-2.5 text-gray-400 transition-transform ${openTimeline === m._id ? 'rotate-180 text-[#C9A96E]' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    {openTimeline === m._id && <TimelinePanel m={m} />}
                  </div>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
