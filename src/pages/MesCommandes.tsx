import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navigation from "@/components/Navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, FileText, ShoppingCart, Receipt, Calendar, PlusCircle, Image as ImageIcon, X, UserCog, Store, RefreshCw, Loader2, Clock, ChevronRight } from "lucide-react";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { authFetch, API_URL } from "@/lib/api";

const getBase = () => API_URL.replace('/api','');

interface UserData { id:string;nomSociete:string;address?:string;zipCity?:string;siret:string;role?:string;assignedShops?:any[];pricingTier?:1|2; }
interface Montage { _id:string;reference:string;frame:string;description:string;category:string;glassType?:string[];urgency?:string;diamondCutType?:string;engravingCount?:number;shapeChange?:boolean;statut:string;dateReception:string;photoUrl?:string;createdBy?:string;clientName?:string;userId?:string;statusHistory?:{statut:string;date:string}[]; }
interface Facture { id:string;invoiceNumber:string;montageReference:string;dateEmission:string;totalHT:number;totalTTC:number;invoiceData:any[];amountPaid?:number;paymentStatus?:string; }

const normalize=(t:string|undefined)=>t?t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim():"";

const CC: Record<string,{1:number,2:number}> = {'Sans Montage':{1:0,2:0},'Cerclé':{1:7,2:3.6},'Percé':{1:15.9,2:12},'Nylor':{1:14.9,2:12}};
const GC: Record<string,{1:number,2:number}> = {'Verre Dégradé 4 saisons':{1:28.8,2:28.8},'Verre Dégradé':{1:50,2:43},'Verre de stock':{1:0,2:0}};
const DC: Record<string,{1:number,2:number}> = {'Facette Lisse':{1:39.8,2:21.5},'Facette Twinkle':{1:79.8,2:60},'Diamond Ice':{1:93.6,2:60},'Standard':{1:0,2:0}};
const UR: Record<string,number> = {'Urgent -3H':0.5,'Urgent -24H':0.3,'Urgent -48H':0.2,'Standard':0};
const calcP=(m:Montage,tier=1):number=>{const t=(tier===1||tier===2)?tier as 1|2:1 as 1|2;let b=(CC[m.category||'Cerclé']?.[t]||0)+(DC[m.diamondCutType||'Standard']?.[t]||0)+(m.engravingCount||0)*((t===1)?12:10);m.glassType?.forEach(g=>{b+=GC[g]?.[t]||0;});if(m.shapeChange)b+=(t===1)?10:3.5;if(tier===3)b*=0.9;else if(tier===4)b*=0.85;return b+b*(UR[m.urgency||'Standard']||0);};

const URGENCY_OPTIONS=['Standard','Prioritaire -48H','Express -24H','Urgent -3H'];
const DIAMONDCUT_OPTIONS=['Standard','Facette Lisse','Diamond Ice','Facette Twinkle'];
const GLASS_OPTIONS=['Verre Dégradé 4 saisons','Verre Dégradé','Verre de stock'];

// Ordre logique des statuts pour la timeline
const STATUS_ORDER=['En attente','Reçu','En cours','Terminé'];
const statusCfg: Record<string,{dot:string;cls:string;line:string}> = {
  'En attente':{dot:'bg-amber-400',   cls:'bg-amber-50 text-amber-700 border-amber-200',   line:'border-amber-300'},
  'Reçu':      {dot:'bg-blue-400',    cls:'bg-blue-50 text-blue-700 border-blue-200',       line:'border-blue-300'},
  'En cours':  {dot:'bg-orange-400',  cls:'bg-orange-50 text-orange-700 border-orange-200', line:'border-orange-300'},
  'Terminé':   {dot:'bg-emerald-400', cls:'bg-emerald-50 text-emerald-700 border-emerald-200', line:'border-emerald-300'},
  'Expédié':   {dot:'bg-purple-400',  cls:'bg-purple-50 text-purple-700 border-purple-200', line:'border-purple-300'},
};
const StatusPill=({s}:{s:string})=>{const c=statusCfg[s]||{dot:'bg-gray-300',cls:'bg-gray-50 text-gray-600 border-gray-200'};return <span className={`inline-flex items-center gap-1.5 text-xs font-medium tracking-wide rounded-full px-3 py-1 border ${c.cls}`}><span className={`w-2 h-2 rounded-full ${c.dot}`}/>{s}</span>;};

const S={
  card:"bg-white rounded-2xl border border-[#EDE8DF] shadow-sm",
  label:"text-[9px] font-normal tracking-[0.22em] uppercase text-[#C9A96E] block mb-1.5",
  inp:"bg-white border border-[#EDE8DF] rounded-xl text-sm focus:ring-1 focus:ring-[#C9A96E] focus:border-[#C9A96E] transition-all",
  btnP:"inline-flex items-center justify-center gap-2 bg-[#0F0E0C] text-[#F7F4EE] hover:bg-[#1C1A17] rounded-xl text-[10px] tracking-widest uppercase font-normal transition-all px-5 h-10 cursor-pointer border-0",
  btnO:"inline-flex items-center justify-center gap-2 bg-white border border-[#EDE8DF] text-[#0F0E0C] hover:bg-[#F7F4EE] rounded-xl text-[10px] font-normal transition-all px-4 h-9 cursor-pointer",
  btnG:"inline-flex items-center justify-center gap-2 border border-[#C9A96E] text-[#C9A96E] bg-transparent hover:bg-[#C9A96E] hover:text-[#0F0E0C] rounded-xl text-[10px] uppercase tracking-widest font-normal transition-all px-4 h-9 cursor-pointer",
};

// ---- MODALE APERÇU RAPIDE ----
const QuickView=({m,tier,onClose}:{m:Montage|null;tier:number;onClose:()=>void})=>{
  if(!m)return null;
  const price=calcP(m,tier);
  const cfg=statusCfg[m.statut]||{dot:'bg-gray-300',cls:'bg-gray-50 text-gray-600 border-gray-200',line:'border-gray-200'};

  // Timeline : statuts passés déduits de l'ordre logique
  const currentIdx=STATUS_ORDER.indexOf(m.statut);
  const history=m.statusHistory||[];

  // Barre de progression visuelle
  const progressPct=currentIdx>=0?((currentIdx)/(STATUS_ORDER.length-1))*100:0;

  return(
    <Dialog open={!!m} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-white rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-[#EDE8DF]">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[9px] tracking-[0.22em] uppercase text-[#C9A96E] block mb-1">Dossier</span>
              <DialogTitle className="font-playfair text-xl font-normal text-[#0F0E0C]">{m.reference}</DialogTitle>
              <p className="text-sm text-gray-400 mt-0.5">{m.frame}</p>
            </div>
            <StatusPill s={m.statut}/>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5">

          {/* Barre de progression statut */}
          <div>
            <div className="flex justify-between mb-2">
              {STATUS_ORDER.map((s,i)=>{
                const done=i<=currentIdx;
                const c=statusCfg[s];
                return(
                  <div key={s} className="flex flex-col items-center gap-1 flex-1">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${done?`${c.dot} border-transparent`:'bg-white border-[#EDE8DF]'}`}>
                      {done&&<span className="w-2 h-2 rounded-full bg-white"/>}
                    </div>
                    <span className={`text-[10px] tracking-wide text-center leading-tight ${done?'text-[#0F0E0C] font-medium':'text-gray-400'}`}>{s}</span>
                  </div>
                );
              })}
            </div>
            <div className="relative h-1 bg-[#EDE8DF] rounded-full -mt-7 mx-2.5" style={{zIndex:0}}>
              <div className="h-full rounded-full bg-[#C9A96E] transition-all duration-500" style={{width:`${progressPct}%`}}/>
            </div>
          </div>

          {/* Détails du dossier */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#F7F4EE] rounded-xl p-3">
              <span className="text-[9px] tracking-[0.2em] uppercase text-[#C9A96E] block mb-1">Prix HT estimé</span>
              <span className="font-playfair text-lg text-[#0F0E0C]">{price.toFixed(2)} €</span>
            </div>
            <div className="bg-[#F7F4EE] rounded-xl p-3">
              <span className="text-[9px] tracking-[0.2em] uppercase text-[#C9A96E] block mb-1">Envoyé le</span>
              <span className="text-sm text-[#0F0E0C]">{new Date(m.dateReception).toLocaleDateString('fr-FR')}</span>
            </div>
          </div>

          {/* Options */}
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] rounded-full px-2.5 py-1 bg-[#F7F4EE] border border-[#EDE8DF] text-gray-500">{m.category}</span>
            {m.urgency!=='Standard'&&<span className="text-[10px] rounded-full px-2.5 py-1 bg-red-50 border border-red-100 text-red-500">{m.urgency}</span>}
            {m.diamondCutType!=='Standard'&&<span className="text-[10px] rounded-full px-2.5 py-1 bg-blue-50 border border-blue-100 text-blue-600">{m.diamondCutType}</span>}
            {m.glassType?.map(g=><span key={g} className="text-[10px] rounded-full px-2.5 py-1 bg-emerald-50 border border-emerald-100 text-emerald-600">{g.replace('Verre ','')}</span>)}
            {(m.engravingCount||0)>0&&<span className="text-[10px] rounded-full px-2.5 py-1 bg-purple-50 border border-purple-100 text-purple-600">{m.engravingCount} gravure(s)</span>}
            {m.shapeChange&&<span className="text-[10px] rounded-full px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700">Changement forme</span>}
          </div>

          {m.description&&(
            <p className="text-xs text-gray-500 italic border-l-2 border-[#EDE8DF] pl-3">{m.description}</p>
          )}

          {/* Timeline historique des statuts */}
          {history.length>0&&(
            <div>
              <span className="text-[9px] tracking-[0.22em] uppercase text-[#C9A96E] block mb-3">Historique</span>
              <div className="space-y-2">
                {[...history].reverse().map((h,i)=>{
                  const hcfg=statusCfg[h.statut]||{dot:'bg-gray-300',cls:''};
                  return(
                    <div key={i} className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${hcfg.dot}`}/>
                      <span className="text-xs text-[#0F0E0C] font-medium w-24 flex-shrink-0">{h.statut}</span>
                      <span className="text-[10px] text-gray-400">{new Date(h.date).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Si pas d'historique : afficher juste la date de réception */}
          {history.length===0&&(
            <div>
              <span className="text-[9px] tracking-[0.22em] uppercase text-[#C9A96E] block mb-3">Historique</span>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0"/>
                <span className="text-xs text-[#0F0E0C] font-medium w-24 flex-shrink-0">Créé</span>
                <span className="text-[10px] text-gray-400">{new Date(m.dateReception).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})}</span>
              </div>
              {m.statut!=='En attente'&&(
                <div className="flex items-center gap-3 mt-2">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`}/>
                  <span className="text-xs text-[#0F0E0C] font-medium w-24 flex-shrink-0">{m.statut}</span>
                  <span className="text-[10px] text-gray-400 italic">Date non enregistrée</span>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default function MesCommandes(){
  const navigate=useNavigate();
  const location=useLocation();
  const[user,setUser]=useState<UserData|null>(null);
  const[montages,setMontages]=useState<Montage[]>([]);
  const[factures,setFactures]=useState<Facture[]>([]);
  const[loading,setLoading]=useState(true);
  const[search,setSearch]=useState("");
  const[statusFilter,setStatusFilter]=useState<string|null>(null);
  const[photoUrl,setPhotoUrl]=useState<string|null>(null);
  const[quickView,setQuickView]=useState<Montage|null>(null);
  const[clientsList,setClientsList]=useState<any[]>([]);
  const[targetClient,setTargetClient]=useState("");
  const[ref,setRef]=useState("");const[frame,setFrame]=useState("");const[desc,setDesc]=useState("");
  const[cat,setCat]=useState("Cerclé");const[glass,setGlass]=useState<string[]>([]);
  const[urg,setUrg]=useState("Standard");const[dc,setDc]=useState("Standard");
  const[eng,setEng]=useState(0);const[sc,setSc]=useState(false);
  const[submitting,setSubmitting]=useState(false);
  const[refreshing,setRefreshing]=useState(false);
  const initialTab=new URLSearchParams(location.search).get('tab')==='factures'?'factures':'commandes';
  const[tab,setTab]=useState(initialTab);
  const[openTimeline,setOpenTimeline]=useState<string|null>(null);

  useEffect(()=>{
    const str=localStorage.getItem("user");if(!str){navigate("/espace-pro");return;}
    try{
      const u:UserData=JSON.parse(str);setUser(u);
      let q=`?userId=${u.id}`;if(u.role==='manager')q=`?role=manager&managerId=${u.id}`;
      authFetch(`${getBase()}/api/montages${q}`).then(r=>r.json()).then(d=>{if(d.success)setMontages(d.montages);});
      authFetch(`${getBase()}/api/factures?userId=${u.id}`).then(r=>r.json()).then(d=>{if(d.success)setFactures(d.factures.map((f:any)=>({id:f._id,invoiceNumber:f.invoiceNumber,montageReference:f.montagesReferences?.join(', ')||'N/A',dateEmission:f.dateEmission,totalHT:f.totalHT,totalTTC:f.totalTTC,invoiceData:f.invoiceData||[],amountPaid:f.amountPaid,paymentStatus:f.paymentStatus})));});
      if(u.role==='manager'){authFetch(`${getBase()}/api/users`).then(r=>r.json()).then(d=>{if(d.success){setClientsList(d.users);if(u.assignedShops?.length){const id=typeof u.assignedShops[0]==='string'?u.assignedShops[0]:u.assignedShops[0]._id;setTargetClient(id);}}});}
      else setTargetClient(u.id);
    }catch{navigate("/");}
    setLoading(false);
  },[navigate]);

  const fetchM=async(silent=false)=>{
    if(!user)return;if(!silent)setRefreshing(true);
    try{let q=`?userId=${user.id}`;if(user.role==='manager')q=`?role=manager&managerId=${user.id}`;const r=await authFetch(`${getBase()}/api/montages${q}`);const d=await r.json();if(d.success)setMontages(d.montages);}
    catch{}finally{setRefreshing(false);}
  };

  const handleAdd=async(e:React.FormEvent)=>{
    e.preventDefault();if(!user)return;
    const tid=user.role==='manager'?targetClient:user.id;if(!tid){toast.error("Veuillez sélectionner un magasin.");return;}
    setSubmitting(true);
    try{const r=await authFetch(`${getBase()}/api/montages`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:tid,reference:ref,frame,description:desc,category:cat,glassType:glass,urgency:urg,diamondCutType:dc,engravingCount:eng,shapeChange:sc,createdBy:user.role==='manager'?`Manager (${user.nomSociete})`:'Client'})});const d=await r.json();if(d.success){toast.success("Dossier envoyé à l'atelier !");setRef("");setFrame("");setDesc("");setCat("Cerclé");setGlass([]);setUrg("Standard");setDc("Standard");setEng(0);setSc(false);fetchM(true);}}
    catch{toast.error("Erreur lors de l'envoi.");}
    finally{setSubmitting(false);}
  };

  const downloadPDF=async(f:Facture)=>{
    if(!user)return;toast.loading("Génération...",{id:'dl'});
    const div=document.createElement('div');div.style.cssText='width:800px;padding:40px;background:white;position:absolute;top:-9999px;left:-9999px;font-family:sans-serif;color:#000';
    div.innerHTML=`<div style="display:flex;justify-content:space-between;margin-bottom:36px"><div><h1 style="font-size:26px;font-weight:bold;margin-bottom:6px">DÉTAIL DE FACTURATION</h1><p style="color:#999;font-size:11px">Date : ${new Date(f.dateEmission).toLocaleDateString('fr-FR')}</p></div><div style="text-align:right"><p style="font-weight:bold">L'Atelier des Arts</p><p style="font-size:11px;color:#666">178 Avenue Daumesnil, 75012 Paris</p></div></div><div style="border-top:1px solid #eee;padding-top:16px;margin-bottom:24px"><p style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#C9A96E;margin-bottom:4px">Facturé à</p><p style="font-size:16px;font-weight:bold">${user.nomSociete}</p><p style="font-size:11px;color:#666">${user.address||''} ${user.zipCity||''}</p></div><table style="width:100%;border-collapse:collapse;margin-bottom:24px"><thead><tr style="border-bottom:1px solid #eee"><th style="text-align:left;padding:8px 0;font-size:10px;color:#999;font-weight:normal;text-transform:uppercase">Référence</th><th style="text-align:left;padding:8px 0;font-size:10px;color:#999;font-weight:normal;text-transform:uppercase">Détails</th><th style="text-align:right;padding:8px 0;font-size:10px;color:#999;font-weight:normal;text-transform:uppercase">Prix HT</th></tr></thead><tbody>${f.invoiceData.map((i:any)=>`<tr style="border-bottom:1px solid #f5f5f5"><td style="padding:8px 0;font-weight:500;font-size:12px">${i.reference||'-'}</td><td style="padding:8px 0;font-size:10px;color:#666">${i.details.join('<br/>')}</td><td style="padding:8px 0;text-align:right;font-weight:bold;font-size:12px">${i.price.toFixed(2)} €</td></tr>`).join('')}</tbody></table><div style="display:flex;justify-content:space-between;align-items:flex-end"><div style="background:#F7F4EE;border:1px solid #EDE8DF;padding:14px;width:44%;border-radius:8px"><p style="font-weight:bold;font-size:10px;text-transform:uppercase;margin-bottom:6px">Coordonnées bancaires</p><p style="font-size:10px;color:#666">IBAN : FR76 1820 6002 0065 1045 3419 297</p><p style="font-size:10px;color:#666">BIC : AGRIFRPP882</p></div><div style="text-align:right"><p style="color:#666;font-size:12px">Total HT : ${f.totalHT?.toFixed(2)} €</p><p style="color:#666;font-size:12px">TVA 20% : ${(f.totalTTC-(f.totalHT||0)).toFixed(2)} €</p><p style="font-size:20px;font-weight:bold;margin-top:6px">Net à payer : ${f.totalTTC.toFixed(2)} €</p></div></div>`;
    document.body.appendChild(div);
    try{const canvas=await html2canvas(div,{scale:2,windowWidth:div.scrollWidth,windowHeight:div.scrollHeight});const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});const w=pdf.internal.pageSize.getWidth(),h=pdf.internal.pageSize.getHeight();const ih=(canvas.height*w)/canvas.width;let left=ih,pos=0;pdf.addImage(canvas.toDataURL('image/jpeg',1),'JPEG',0,pos,w,ih);left-=h;while(left>0){pos=left-ih;pdf.addPage();pdf.addImage(canvas.toDataURL('image/jpeg',1),'JPEG',0,pos,w,ih);left-=h;}pdf.save(`Facturation_${f.invoiceNumber}.pdf`);toast.success("PDF téléchargé !",{id:'dl'});}
    catch{toast.error("Erreur téléchargement.",{id:'dl'});}
    finally{document.body.removeChild(div);}
  };

  // Filtrage : recherche + filtre statut
  const fm=montages.filter(m=>{
    const matchSearch=normalize(m.reference+m.frame).includes(normalize(search));
    const matchStatus=!statusFilter||m.statut===statusFilter;
    return matchSearch&&matchStatus;
  });

  const grouped=fm.reduce((acc:any,m)=>{
    let mo="?";try{mo=new Date(m.dateReception).toLocaleDateString('fr-FR',{month:'long',year:'numeric'});}catch{}
    if(!acc[mo])acc[mo]=user?.role==='manager'?{}:[];
    if(user?.role==='manager'){const shop=m.clientName||"Inconnu";if(!acc[mo][shop])acc[mo][shop]=[];acc[mo][shop].push(m);}
    else acc[mo].push(m);
    return acc;
  },{});

  // Compteurs par statut pour les filtres
  const statusCounts=Object.fromEntries(
    ['En attente','Reçu','En cours','Terminé'].map(s=>[s,montages.filter(m=>m.statut===s).length])
  );

  const isManager=user?.role==='manager';
  const getTier=(m:Montage)=>isManager?(clientsList.find((c:any)=>c._id===m.userId)?.pricingTier||1):(user?.pricingTier||1);

  const renderCard=(m:Montage)=>{
    const price=calcP(m,getTier(m));
    const cfg=statusCfg[m.statut]||{dot:'bg-gray-300',cls:'',line:''};
    const tlOpen=openTimeline===m._id;
    const history=m.statusHistory||[];
    const statusColor=m.statut==='En attente'?'#FCD34D':m.statut==='Reçu'?'#60A5FA':m.statut==='En cours'?'#FB923C':m.statut==='Terminé'?'#34D399':'#E5E7EB';
    return(
      <div key={m._id} className="bg-white border border-[#EDE8DF] rounded-xl overflow-hidden hover:shadow-sm transition-all group">
        {/* Corps principal — cliquable pour QuickView */}
        <div className="flex items-stretch cursor-pointer" onClick={()=>setQuickView(m)}>
          <div className="w-1 flex-shrink-0" style={{background:statusColor}}/>
          <div className="flex-1 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className="font-bold text-base text-[#0F0E0C] tracking-wide">{m.reference}</span>
                <span className="text-gray-400">·</span>
                <span className="text-sm font-medium text-gray-600">{m.frame}</span>
                <StatusPill s={m.statut}/>
                <span className="ml-auto text-sm font-semibold text-[#9A7A45]">{price.toFixed(2)} € HT</span>
              </div>
              {isManager&&m.createdBy?.includes("Manager")&&<div className="inline-flex items-center gap-1.5 text-[10px] text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-2.5 py-0.5 mb-1.5"><UserCog className="w-2.5 h-2.5"/>{m.createdBy}</div>}
              <div className="flex flex-wrap gap-1.5">
                <span className="text-xs rounded-full px-2.5 py-0.5 bg-[#F7F4EE] border border-[#D5CFC6] text-gray-600 font-medium">{m.category}</span>
                {m.urgency!=='Standard'&&<span className="text-xs rounded-full px-2.5 py-0.5 bg-red-50 border border-red-200 text-red-600 font-medium">{m.urgency}</span>}
                {m.diamondCutType!=='Standard'&&<span className="text-xs rounded-full px-2.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-600 font-medium">{m.diamondCutType}</span>}
                {m.glassType?.map(g=><span key={g} className="text-xs rounded-full px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">{g.replace('Verre ','')}</span>)}
                {(m.engravingCount||0)>0&&<span className="text-xs rounded-full px-2.5 py-0.5 bg-purple-50 border border-purple-200 text-purple-700 font-medium">{m.engravingCount} gravure(s)</span>}
                {m.shapeChange&&<span className="text-xs rounded-full px-2.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 font-medium">Changement forme</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {m.photoUrl&&(
                <button className="h-8 w-8 flex items-center justify-center rounded-xl border border-[#EDE8DF] hover:border-[#C9A96E] transition-colors" onClick={e=>{e.stopPropagation();setPhotoUrl(m.photoUrl!);}}>
                  <ImageIcon className="w-3.5 h-3.5 text-[#C9A96E]"/>
                </button>
              )}
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#C9A96E] transition-colors"/>
            </div>
          </div>
        </div>

        {/* Pied de carte — bouton horloge pour timeline */}
        <div
          className="px-4 py-2 flex items-center justify-between border-t border-[#F7F4EE] cursor-pointer hover:bg-[#F7F4EE] transition-colors"
          onClick={e=>{e.stopPropagation();setOpenTimeline(tlOpen?null:m._id);}}
        >
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-gray-400"/>
            <span className="text-xs text-gray-500">Envoyé le {new Date(m.dateReception).toLocaleDateString('fr-FR')}</span>
          </div>
          <div className={`flex items-center gap-1 text-xs font-medium transition-colors ${tlOpen?'text-[#C9A96E]':'text-gray-500 hover:text-gray-700'}`}>
            <span className="tracking-[0.1em] uppercase text-xs font-medium">Historique</span>
            <svg className={`w-2.5 h-2.5 transition-transform ${tlOpen?'rotate-180':''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
          </div>
        </div>

        {/* Timeline dépliable — inline, discrète */}
        {tlOpen&&(
          <div className="px-5 pb-4 pt-1 bg-[#FAFAF8] border-t border-[#F0EDE7]">
            <div className="relative pl-4">
              {/* Ligne verticale */}
              <div className="absolute left-1.5 top-1 bottom-1 w-px bg-[#EDE8DF]"/>
              <div className="space-y-3">
                {/* Entrée de création toujours présente */}
                <div className="flex items-start gap-3 relative">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#EDE8DF] border-2 border-white absolute -left-3.5 top-0.5"/>
                  <div>
                    <span className="text-xs font-semibold text-gray-600">Dossier créé</span>
                    <span className="text-xs text-gray-400 ml-2">{new Date(m.dateReception).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})}</span>
                  </div>
                </div>
                {/* Historique réel si disponible */}
                {history.length>0
                  ? [...history].map((h,i)=>{
                      const hcfg=statusCfg[h.statut]||{dot:'bg-gray-300'};
                      const isLast=i===history.length-1;
                      return(
                        <div key={i} className="flex items-start gap-3 relative">
                          <div className={`w-2.5 h-2.5 rounded-full border-2 border-white absolute -left-3.5 top-0.5 ${isLast?hcfg.dot:'bg-gray-200'}`}/>
                          <div>
                            <span className={`text-[10px] font-medium ${isLast?'text-[#0F0E0C]':'text-gray-400'}`}>{h.statut}</span>
                            <span className="text-xs text-gray-400 ml-2">
                              {new Date(h.date).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})}
                              {' · '}
                              {new Date(h.date).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  : m.statut!=='En attente'&&(
                      <div className="flex items-start gap-3 relative">
                        <div className={`w-2.5 h-2.5 rounded-full border-2 border-white absolute -left-3.5 top-0.5 ${cfg.dot}`}/>
                        <div>
                          <span className="text-[10px] font-medium text-[#0F0E0C]">{m.statut}</span>
                          <span className="text-xs text-gray-400 ml-2 italic">date non enregistrée</span>
                        </div>
                      </div>
                    )
                }
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if(loading)return(<div className="min-h-screen bg-[#F7F4EE] flex items-center justify-center"><div className="flex flex-col items-center gap-3"><Loader2 className="w-7 h-7 animate-spin text-[#C9A96E]"/><span className="text-[10px] tracking-[0.25em] uppercase text-gray-400">Chargement</span></div></div>);
  if(!user)return null;

  return(
    <div className="min-h-screen bg-[#F7F4EE] flex flex-col">
      <Navigation/>
      <div className="flex-grow pt-24 pb-12 px-6 container mx-auto max-w-5xl">

        <div className="flex justify-between items-end mb-10">
          <div>
            <span className="text-[9px] font-normal tracking-[0.22em] uppercase text-[#C9A96E] block mb-1.5">{isManager?'Espace Manager':'Espace Professionnel'}</span>
            <h1 className="font-playfair text-3xl font-normal text-[#0F0E0C] tracking-tight">{user.nomSociete}</h1>
          </div>
          <button onClick={()=>fetchM()} className={S.btnO} disabled={refreshing}><RefreshCw className={`w-3.5 h-3.5 ${refreshing?'animate-spin':''}`}/> Actualiser</button>
        </div>

        {/* Tabs */}
        <div className="bg-white border border-[#EDE8DF] rounded-2xl p-1 inline-flex shadow-sm mb-6">
          {([['commandes',`Commandes (${montages.length})`],['factures',`Factures (${factures.length})`]] as const).map(([t,label])=>(
            <button key={t} onClick={()=>setTab(t)}
              className={`rounded-xl px-6 py-2.5 text-[10px] tracking-[0.15em] uppercase transition-all flex items-center gap-2 ${tab===t?'bg-[#0F0E0C] text-[#F7F4EE]':'text-gray-400 hover:text-[#0F0E0C]'}`}>
              {t==='commandes'?<ShoppingCart className="w-3.5 h-3.5"/>:<Receipt className="w-3.5 h-3.5"/>}{label}
            </button>
          ))}
        </div>

        {tab==='commandes'&&(
          <div className="space-y-6">
            {/* Formulaire */}
            <div className={S.card+" overflow-hidden"}>
              <div className="px-6 py-4 border-b border-[#EDE8DF]">
                <p className="text-[9px] font-normal tracking-[0.22em] uppercase text-[#C9A96E] mb-1">{isManager?'Nouveau dossier':'Nouvelle demande'}</p>
                <h2 className="font-playfair text-lg font-normal text-[#0F0E0C] flex items-center gap-2"><PlusCircle className="w-4 h-4 text-[#C9A96E]"/>{isManager?'Dossier pour un magasin':'Nouvelle demande de montage'}</h2>
              </div>
              <div className="p-6">
                <form onSubmit={handleAdd} className="space-y-5">
                  {isManager&&(
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                      <Label className="text-[9px] tracking-[0.2em] uppercase text-blue-600 font-normal block mb-2">Pour le compte de quel magasin ?</Label>
                      <Select onValueChange={setTargetClient} value={targetClient}><SelectTrigger className={S.inp+" h-10"}><SelectValue placeholder="Choisir un client..."/></SelectTrigger><SelectContent className="bg-white rounded-xl max-h-60">{clientsList.map((c:any)=><SelectItem key={c._id} value={c._id}>{c.nomSociete}</SelectItem>)}</SelectContent></Select>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><Label className="text-[9px] tracking-[0.22em] uppercase text-[#C9A96E] block mb-1.5">Référence *</Label><Input placeholder="Ex : REF-123" value={ref} onChange={e=>setRef(e.target.value)} required className={S.inp+" h-10"}/></div>
                    <div><Label className="text-[9px] tracking-[0.22em] uppercase text-[#C9A96E] block mb-1.5">Monture *</Label><Input placeholder="Ex : RayBan 450" value={frame} onChange={e=>setFrame(e.target.value)} required className={S.inp+" h-10"}/></div>
                    <div><Label className="text-[9px] tracking-[0.22em] uppercase text-[#C9A96E] block mb-1.5">Urgence</Label><Select onValueChange={setUrg} value={urg}><SelectTrigger className={S.inp+" h-10"}><SelectValue/></SelectTrigger><SelectContent className="bg-white rounded-xl">{URGENCY_OPTIONS.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><Label className="text-[9px] tracking-[0.22em] uppercase text-[#C9A96E] block mb-1.5">Type</Label><Select onValueChange={setCat} value={cat}><SelectTrigger className={S.inp+" h-10"}><SelectValue/></SelectTrigger><SelectContent className="bg-white rounded-xl"><SelectItem value="Cerclé">Cerclé</SelectItem><SelectItem value="Percé">Percé</SelectItem><SelectItem value="Nylor">Nylor</SelectItem><SelectItem value="Sans Montage">Sans Montage</SelectItem></SelectContent></Select></div>
                    <div><Label className="text-[9px] tracking-[0.22em] uppercase text-[#C9A96E] block mb-1.5">Diamond Cut</Label><Select onValueChange={setDc} value={dc}><SelectTrigger className={S.inp+" h-10"}><SelectValue/></SelectTrigger><SelectContent className="bg-white rounded-xl">{DIAMONDCUT_OPTIONS.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label className="text-[9px] tracking-[0.22em] uppercase text-[#C9A96E] block mb-1.5">Gravures (qté)</Label><Input type="number" min={0} max={2} value={eng} onChange={e=>setEng(parseInt(e.target.value)||0)} className={S.inp+" h-10"}/></div>
                  </div>
                  <div className="p-4 bg-[#F7F4EE] rounded-xl border border-[#EDE8DF]">
                    <p className="text-[9px] tracking-[0.22em] uppercase text-[#C9A96E] block mb-3">Options verres & autres</p>
                    <div className="flex flex-wrap gap-5">
                      {GLASS_OPTIONS.map(o=><div key={o} className="flex items-center gap-2"><Checkbox id={o} checked={glass.includes(o)} onCheckedChange={c=>setGlass(p=>(c as boolean)?[...p,o]:p.filter(t=>t!==o))}/><label htmlFor={o} className="text-sm cursor-pointer text-[#0F0E0C] font-light">{o}</label></div>)}
                      <div className="flex items-center gap-2 border-l border-[#EDE8DF] pl-5"><Checkbox id="sc" checked={sc} onCheckedChange={c=>setSc(c as boolean)}/><label htmlFor="sc" className="text-sm cursor-pointer font-light">Changement de forme</label></div>
                    </div>
                  </div>
                  <div><Label className="text-[9px] tracking-[0.22em] uppercase text-[#C9A96E] block mb-1.5">Note</Label><Input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Informations supplémentaires..." className={S.inp+" h-10"}/></div>
                  <button type="submit" disabled={submitting} className={S.btnP+" w-full md:w-auto"}>
                    {submitting?<><Loader2 className="w-3.5 h-3.5 animate-spin"/>Envoi...</>:"Valider et envoyer à l'atelier"}
                  </button>
                </form>
              </div>
            </div>

            {/* Filtres statut */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={()=>setStatusFilter(null)}
                className={`text-[10px] tracking-[0.12em] uppercase px-4 py-2 rounded-xl border transition-all ${!statusFilter?'bg-[#0F0E0C] text-[#F7F4EE] border-[#0F0E0C]':'bg-white text-gray-400 border-[#EDE8DF] hover:bg-[#F7F4EE]'}`}>
                Tous ({montages.length})
              </button>
              {Object.entries(statusCfg).slice(0,4).map(([s,cfg])=>(
                <button key={s} onClick={()=>setStatusFilter(statusFilter===s?null:s)}
                  className={`text-[10px] tracking-[0.12em] uppercase px-4 py-2 rounded-xl border transition-all flex items-center gap-1.5
                    ${statusFilter===s?`${cfg.cls} border-current`:'bg-white text-gray-400 border-[#EDE8DF] hover:bg-[#F7F4EE]'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}/>
                  {s} {statusCounts[s]>0&&<span className="opacity-60">({statusCounts[s]})</span>}
                </button>
              ))}
            </div>

            {/* Recherche */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"/>
              <input className="w-full pl-11 pr-4 py-3 bg-white border border-[#EDE8DF] rounded-2xl text-sm placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#C9A96E] focus:border-[#C9A96E] transition-all" placeholder="Rechercher un dossier..." value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>

            {/* Dossiers */}
            {Object.keys(grouped).length===0
              ? <div className="text-center py-16 text-gray-400 text-sm">Aucune commande{statusFilter?` "${statusFilter}"`:''} trouvée.</div>
              : (
              <Accordion type="multiple" className="space-y-3" defaultValue={[Object.keys(grouped)[0]]}>
                {Object.entries(grouped).sort().reverse().map(([mo,content]:any)=>(
                  <AccordionItem key={mo} value={mo} className="bg-white border border-[#EDE8DF] rounded-2xl overflow-hidden">
                    <AccordionTrigger className="hover:no-underline px-5 py-4 hover:bg-[#F7F4EE] transition-colors">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-[#C9A96E]"/>
                        <span className="font-playfair text-lg font-normal text-[#0F0E0C] capitalize">{mo}</span>
                        <span className="text-xs text-gray-400 ml-2 font-medium">({(Array.isArray(content)?content:Object.values(content).flat()).length} dossiers)</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-5 pb-5 pt-2">
                      {isManager?(
                        <Accordion type="multiple" className="space-y-2">
                          {Object.entries(content).map(([shop,items]:any)=>(
                            <AccordionItem key={shop} value={shop} className="bg-[#F7F4EE] border border-[#EDE8DF] rounded-xl overflow-hidden">
                              <AccordionTrigger className="hover:no-underline px-4 py-3 hover:bg-[#EDE8DF] transition-colors">
                                <div className="flex items-center gap-2"><Store className="w-3.5 h-3.5 text-[#C9A96E]"/><span className="text-sm font-medium text-[#0F0E0C]">{shop}</span><span className="text-xs text-gray-400">({items.length})</span></div>
                              </AccordionTrigger>
                              <AccordionContent className="px-4 pb-4 pt-2 space-y-2">{items.map((m:Montage)=>renderCard(m))}</AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      ):(
                        <div className="space-y-2">{[...content].sort((a:Montage,b:Montage)=>new Date(b.dateReception).getTime()-new Date(a.dateReception).getTime()).map((m:Montage)=>renderCard(m))}</div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
        )}

        {tab==='factures'&&(
          factures.length===0?<div className="text-center py-16 text-gray-400 text-sm">Aucune facture disponible.</div>:(
            <div className="space-y-3">
              {factures.map(f=>{
                const isPaid=f.paymentStatus==='Payé';const isPartial=f.paymentStatus==='Partiellement payé';const rem=f.totalTTC-(f.amountPaid||0);
                return(
                  <div key={f.invoiceNumber} className="bg-white border border-[#EDE8DF] rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-sm transition-all">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-medium text-[#0F0E0C] flex items-center gap-2"><Receipt className="w-3.5 h-3.5 text-[#C9A96E]"/> {f.invoiceNumber}</p>
                        {isPaid&&<span className="text-[10px] rounded-full px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700">Réglé</span>}
                        {isPartial&&<span className="text-[10px] rounded-full px-2.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-700">Reste : {rem.toFixed(2)} €</span>}
                        {!isPaid&&!isPartial&&<span className="text-[10px] rounded-full px-2.5 py-0.5 bg-red-50 border border-red-200 text-red-700">À régler</span>}
                      </div>
                      <p className="text-xs text-gray-400">Émis le {new Date(f.dateEmission).toLocaleDateString('fr-FR')}</p>
                      <p className="text-[10px] text-gray-300 mt-0.5">Dossiers : {f.montageReference}</p>
                    </div>
                    <div className="flex items-center gap-5">
                      <div className="text-right">
                        <p className="text-[9px] tracking-[0.22em] uppercase text-[#C9A96E] mb-0.5">Montant TTC</p>
                        <span className="font-playfair text-2xl font-normal text-[#0F0E0C]">{f.totalTTC.toFixed(2)} €</span>
                      </div>
                      <button onClick={()=>downloadPDF(f)} className={S.btnG}><FileText className="w-3.5 h-3.5"/> Télécharger</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Aperçu rapide */}
        <QuickView m={quickView} tier={quickView?getTier(quickView):1} onClose={()=>setQuickView(null)}/>

        {/* Photo */}
        <Dialog open={!!photoUrl} onOpenChange={()=>setPhotoUrl(null)}>
          <DialogContent className="bg-[#0F0E0C]/95 border-[#C9A96E]/20 p-0 flex items-center justify-center max-w-4xl rounded-2xl overflow-hidden">
            <div className="relative p-4">
              <button className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors" onClick={()=>setPhotoUrl(null)}><X className="w-4 h-4"/></button>
              {photoUrl&&<img src={photoUrl} alt="Montage" className="max-w-full max-h-[85vh] object-contain rounded-xl"/>}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
