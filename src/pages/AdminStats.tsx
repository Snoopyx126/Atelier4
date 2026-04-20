import { useEffect, useState } from 'react';
import Navigation from "@/components/Navigation";
import { useNavigate } from 'react-router-dom';
import { Loader2, ChevronLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { authFetch, API_URL } from "@/lib/api";

interface Montage {
  _id: string; clientName: string; reference?: string; category?: string;
  glassType?: string[]; urgency?: string; diamondCutType?: string;
  engravingCount?: number; shapeChange?: boolean; statut: string;
  dateReception: string; userId: string;
}
interface Client {
  _id: string; nomSociete: string; email: string; siret: string;
  isVerified?: boolean; role: string; pricingTier?: number; zipCity?: string;
}
interface Facture {
  _id: string; userId: string; clientName: string; totalTTC: number;
  totalHT: number; dateEmission: string; paymentStatus?: string; amountPaid?: number;
}

const CATEGORY_COSTS: Record<string, {1:number,2:number}> = {
  'Sans Montage':{1:0,2:0},'Cerclé':{1:7,2:3.6},'Percé':{1:15.9,2:12},'Nylor':{1:14.9,2:12}
};
const GLASS_COSTS: Record<string,{1:number,2:number}> = {
  'Verre Dégradé 4 saisons':{1:28.8,2:28.8},'Verre Dégradé':{1:50,2:43},'Verre de stock':{1:0,2:0}
};
const DIAMONDCUT_COSTS: Record<string,{1:number,2:number}> = {
  'Facette Lisse':{1:39.8,2:21.5},'Facette Twinkle':{1:79.8,2:60},'Diamond Ice':{1:93.6,2:60},'Standard':{1:0,2:0}
};
const URGENCY_RATES: Record<string,number> = {'Urgent -3H':0.5,'Express -24H':0.3,'Prioritaire -48H':0.2,'Standard':0};
const calcPrice = (m: Montage, tier=1): number => {
  const t = (tier===1||tier===2) ? tier as 1|2 : 1 as 1|2;
  let b = (CATEGORY_COSTS[m.category||'Cerclé']?.[t]||0)
        + (DIAMONDCUT_COSTS[m.diamondCutType||'Standard']?.[t]||0)
        + (m.engravingCount||0)*((t===1)?12:10);
  m.glassType?.forEach(g=>{b+=GLASS_COSTS[g]?.[t]||0;});
  if(m.shapeChange) b+=(t===1)?10:3.5;
  if(tier===3) b*=0.9; else if(tier===4) b*=0.85;
  return b + b*(URGENCY_RATES[m.urgency||'Standard']||0);
};

const S = {
  card: "bg-white rounded-2xl border border-[#EDE8DF] shadow-sm",
  label: "text-[9px] font-normal tracking-[0.22em] uppercase text-[#C9A96E] block mb-2",
};

const DonutChart = ({ data }: { data: {name:string;pct:number;color:string}[] }) => {
  let acc = 0;
  const r=36, circ=2*Math.PI*r;
  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 100 100" className="w-28 h-28 flex-shrink-0">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#F7F4EE" strokeWidth="14"/>
        {data.map((d,i)=>{
          const dash=(d.pct/100)*circ, offset=-acc*circ/100;
          acc+=d.pct;
          return <circle key={i} cx="50" cy="50" r={r} fill="none" stroke={d.color} strokeWidth="14"
            strokeDasharray={`${dash} ${circ-dash}`} strokeDashoffset={offset}
            style={{transform:'rotate(-90deg)',transformOrigin:'50% 50%'}}/>;
        })}
      </svg>
      <div className="space-y-2 flex-1">
        {data.map((d,i)=>(
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{background:d.color}}/>
              <span className="text-xs text-gray-500">{d.name}</span>
            </div>
            <span className="text-xs font-medium text-[#0F0E0C]">{d.pct.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProgressBar = ({label,value,max,sub,color='#C9A96E'}:{label:string;value:number;max:number;sub?:string;color?:string}) => (
  <div>
    <div className="flex justify-between mb-1.5">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-medium text-[#0F0E0C]">{sub||value}</span>
    </div>
    <div className="h-1.5 bg-[#F7F4EE] rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{width:`${max>0?(value/max)*100:0}%`,background:color}}/>
    </div>
  </div>
);

export default function AdminStats() {
  const navigate = useNavigate();
  const [montages, setMontages]   = useState<Montage[]>([]);
  const [clients,  setClients]    = useState<Client[]>([]);
  const [factures, setFactures]   = useState<Facture[]>([]);
  const [loading,  setLoading]    = useState(true);
  const [period,   setPeriod]     = useState<'30'|'90'|'365'|'all'>('30');
  const base = API_URL.replace('/api','');

  useEffect(()=>{
    const str=localStorage.getItem("user");
    if(!str){navigate("/");return;}
    const u=JSON.parse(str);
    if(u.role!=='admin'){navigate("/dashboardpro");return;}
    Promise.all([
      authFetch(`${base}/api/montages`).then(r=>r.json()),
      authFetch(`${base}/api/users`).then(r=>r.json()),
      authFetch(`${base}/api/factures`).then(r=>r.json()),
    ]).then(([m,c,f])=>{
      if(m.success) setMontages(m.montages);
      if(c.success) setClients(c.users);
      if(f.success) setFactures(f.factures);
      setLoading(false);
    });
  },[navigate]);

  const cutoff = period==='all' ? new Date(0) : new Date(Date.now()-parseInt(period)*86400000);
  const fm  = montages.filter(m=>new Date(m.dateReception)>=cutoff);
  const ff  = factures.filter(f=>new Date(f.dateEmission)>=cutoff);
  const getTier = (uid:string) => clients.find(c=>c._id===uid)?.pricingTier||1;

  // ---- CA ----
  const totalCA    = fm.reduce((s,m)=>s+calcPrice(m,getTier(m.userId)),0);
  const totalTTC   = ff.reduce((s,f)=>s+f.totalTTC,0);
  const totalImpayé= ff.filter(f=>f.paymentStatus!=='Payé').reduce((s,f)=>s+(f.totalTTC-(f.amountPaid||0)),0);

  // ---- CATÉGORIES (donut) ----
  const catCount: Record<string,number>={};
  fm.forEach(m=>{const c=m.category||'Cerclé';catCount[c]=(catCount[c]||0)+1;});
  const catTotal=Object.values(catCount).reduce((s,v)=>s+v,0);
  const catColors=['#C9A96E','#0F0E0C','#9A7A45','#EDE8DF'];
  const donutData=Object.entries(catCount).sort((a,b)=>b[1]-a[1]).map(([name,count],i)=>({
    name, count, pct:catTotal>0?(count/catTotal)*100:0, color:catColors[i%catColors.length]
  }));

  // ---- MONTAGES PAR MOIS ----
  const monthlyMap: Record<string,number>={};
  fm.forEach(m=>{
    let k='?';
    try{k=new Date(m.dateReception).toLocaleDateString('fr-FR',{month:'short',year:'2-digit'});}catch{}
    monthlyMap[k]=(monthlyMap[k]||0)+1;
  });
  const months=Object.entries(monthlyMap).slice(-8).reverse();
  const maxMonthly=Math.max(...months.map(([,v])=>v),1);

  // ---- URGENCES ----
  const urgCount: Record<string,number>={};
  fm.forEach(m=>{const u=m.urgency||'Standard';urgCount[u]=(urgCount[u]||0)+1;});
  const maxUrg=Math.max(...Object.values(urgCount),1);
  const urgColors: Record<string,string>={'Urgent -3H':'#E24B4A','Express -24H':'#F97316','Prioritaire -48H':'#FBBF24','Standard':'#C9A96E'};

  // ---- CLIENTS ----
  const clientVol: Record<string,{name:string;count:number;ca:number;last?:string}> = {};
  fm.forEach(m=>{
    const c=clients.find(cl=>cl._id===m.userId);
    const name=c?.nomSociete||m.clientName||'?';
    if(!clientVol[m.userId]) clientVol[m.userId]={name,count:0,ca:0};
    clientVol[m.userId].count++;
    clientVol[m.userId].ca+=calcPrice(m,getTier(m.userId));
    const d=m.dateReception;
    if(!clientVol[m.userId].last||d>clientVol[m.userId].last!) clientVol[m.userId].last=d;
  });
  const sortedClients=Object.entries(clientVol).sort((a,b)=>b[1].count-a[1].count);

  if(loading) return (
    <div className="min-h-screen bg-[#F7F4EE] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-[#C9A96E]"/>
        <span className="text-[10px] tracking-[0.25em] uppercase text-gray-400">Chargement</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F4EE] flex flex-col">
      <Navigation/>
      <div className="flex-grow pt-24 pb-16 px-6 container mx-auto max-w-6xl">

        {/* En-tête */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
          <div>
            <span className={S.label}>Admin</span>
            <h1 className="font-playfair text-3xl font-normal text-[#0F0E0C] tracking-tight">Statistiques</h1>
            <p className="text-sm text-gray-400 mt-1 font-light">{fm.length} montages sur la période</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['30','90','365','all'] as const).map(v=>(
              <button key={v} onClick={()=>setPeriod(v)}
                className={`text-[10px] tracking-[0.15em] uppercase px-4 py-2 rounded-xl border transition-all
                  ${period===v?'bg-[#0F0E0C] text-[#F7F4EE] border-[#0F0E0C]':'bg-white text-gray-400 border-[#EDE8DF] hover:bg-[#F7F4EE]'}`}>
                {v==='30'?'30 j':v==='90'?'90 j':v==='365'?'1 an':'Tout'}
              </button>
            ))}
          </div>
        </div>

        {/* CA TOTAL */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            {label:'CA estimé HT',value:`${totalCA.toFixed(0)} €`,sub:'Tous tarifs confondus'},
            {label:'Facturé TTC',value:`${totalTTC.toFixed(0)} €`,sub:`${ff.length} factures émises`},
            {label:'Impayés',value:`${totalImpayé.toFixed(0)} €`,sub:'Soldes restants dus'},
          ].map(m=>(
            <div key={m.label} className={S.card+" p-6"}>
              <p className={S.label}>{m.label}</p>
              <p className="font-playfair text-3xl font-normal text-[#0F0E0C]">{m.value}</p>
              <p className="text-[10px] text-gray-400 mt-2">{m.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* DONUT types de montage */}
          <div className={S.card+" p-6"}>
            <p className={S.label}>Répartition</p>
            <h2 className="font-playfair text-lg font-normal text-[#0F0E0C] mb-5">Types de montage</h2>
            {catTotal>0
              ? <DonutChart data={donutData}/>
              : <p className="text-sm text-gray-300">Aucune donnée</p>
            }
            {catTotal>0 && (
              <div className="grid grid-cols-2 gap-2 mt-5 pt-4 border-t border-[#EDE8DF]">
                {donutData.map(d=>(
                  <div key={d.name} className="bg-[#F7F4EE] rounded-xl px-3 py-2 flex justify-between items-center">
                    <span className="text-[10px] text-gray-500">{d.name}</span>
                    <span className="text-sm font-medium text-[#0F0E0C]">{d.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* MONTAGES PAR MOIS */}
          <div className={S.card+" p-6"}>
            <p className={S.label}>Tendance</p>
            <h2 className="font-playfair text-lg font-normal text-[#0F0E0C] mb-5">Montages par mois</h2>
            {months.length===0
              ? <p className="text-sm text-gray-300">Aucune donnée</p>
              : (
                <div className="flex items-end gap-2 h-36">
                  {months.map(([month,v])=>(
                    <div key={month} className="flex-1 flex flex-col items-center gap-1.5">
                      <span className="text-[9px] text-gray-400">{v}</span>
                      <div className="w-full rounded-t-lg bg-[#C9A96E]"
                        style={{height:`${(v/maxMonthly)*100}%`,minHeight:'4px',opacity:0.75+0.25*(v/maxMonthly)}}/>
                      <span className="text-[9px] text-gray-400 capitalize truncate w-full text-center">{month}</span>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        </div>

        {/* URGENCES */}
        <div className={S.card+" p-6 mb-6"}>
          <p className={S.label}>Production</p>
          <h2 className="font-playfair text-lg font-normal text-[#0F0E0C] mb-5">Répartition des urgences</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(urgCount).sort((a,b)=>b[1]-a[1]).map(([u,n])=>(
              <ProgressBar key={u} label={u} value={n} max={maxUrg}
                sub={`${n} dossier${n>1?'s':''} — ${fm.length>0?((n/fm.length)*100).toFixed(0):0}%`}
                color={urgColors[u]||'#C9A96E'}/>
            ))}
          </div>
        </div>

        {/* TABLEAU CLIENTS */}
        <div className={S.card+" overflow-hidden"}>
          <div className="px-6 py-4 border-b border-[#EDE8DF]">
            <p className={S.label}>Détail</p>
            <h2 className="font-playfair text-lg font-normal text-[#0F0E0C]">Activité par client</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F7F4EE] border-b border-[#EDE8DF]">
                  {['Client','Dossiers','CA HT estimé','Dernière activité','Tarif','Statut'].map(h=>(
                    <th key={h} className="text-left px-5 py-3 text-[9px] tracking-[0.2em] uppercase text-[#C9A96E] font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDE8DF]">
                {sortedClients.map(([id,data])=>{
                  const client=clients.find(c=>c._id===id);
                  return (
                    <tr key={id} className="hover:bg-[#F7F4EE] transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium text-[#0F0E0C]">{data.name}</p>
                        <p className="text-[10px] text-gray-400">{client?.email}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-playfair text-2xl font-normal text-[#0F0E0C]">{data.count}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-medium text-[#9A7A45]">{data.ca.toFixed(0)} €</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[10px] text-gray-400">{data.last?new Date(data.last).toLocaleDateString('fr-FR'):'—'}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[10px] rounded-full px-2.5 py-1 bg-[#F7F4EE] border border-[#EDE8DF] text-gray-500">
                          Tarif {client?.pricingTier||1}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {client?.isVerified
                          ? <span className="text-[10px] rounded-full px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 inline-flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5"/>Validé</span>
                          : <span className="text-[10px] rounded-full px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 inline-flex items-center gap-1"><AlertCircle className="w-2.5 h-2.5"/>En attente</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <button onClick={()=>navigate('/admin')}
            className="inline-flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-gray-400 hover:text-[#0F0E0C] transition-colors">
            <ChevronLeft className="w-3 h-3"/> Retour au tableau de bord
          </button>
        </div>
      </div>
    </div>
  );
}
