import React, { useEffect, useState, useRef } from 'react';
import Navigation from "@/components/Navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import { Users, AlertCircle, CheckCircle2, Trash2, FileText, Calendar, PlusCircle, Pencil, Search, Receipt, Loader2, CreditCard, Camera, Image as ImageIcon, X, Store, BarChart2 } from "lucide-react";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { authFetch, API_URL } from "@/lib/api";

const getBase = () => API_URL.replace('/api','');

interface Montage { _id:string;clientName:string;reference?:string;frame?:string;description:string;category?:string;glassType?:string[];urgency?:string;diamondCutType?:string;engravingCount?:number;shapeChange?:boolean;statut:string;dateReception:string;userId:string;photoUrl?:string;createdBy?:string; }
interface Client { _id:string;nomSociete:string;email:string;siret:string;phone?:string;address?:string;zipCity?:string;createdAt:string;isVerified?:boolean;role:string;assignedShops?:any[];pricingTier?:number; }
interface FactureData { id:string;userId:string;clientName:string;invoiceNumber:string;totalTTC:number;dateEmission:string;pdfUrl:string;montagesReferences?:string[];amountPaid?:number;paymentStatus?:string; }

const normalize = (t:string|undefined) => t?t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim():"";

const CC: Record<string,{1:number,2:number}> = {'Sans Montage':{1:0,2:0},'Cerclé':{1:7,2:3.6},'Percé':{1:15.9,2:12},'Nylor':{1:14.9,2:12}};
const GC: Record<string,{1:number,2:number}> = {'Verre Dégradé 4 saisons':{1:28.8,2:28.8},'Verre Dégradé':{1:50,2:43},'Verre de stock':{1:0,2:0}};
const DC: Record<string,{1:number,2:number}> = {'Facette Lisse':{1:39.8,2:21.5},'Facette Twinkle':{1:79.8,2:60},'Diamond Ice':{1:93.6,2:60},'Standard':{1:0,2:0}};
const UR: Record<string,number> = {'Urgent -3H':0.5,'Express -24H':0.3,'Prioritaire -48H':0.2,'Standard':0};
const calcP = (m:Montage,tier=1):number=>{const t=(tier===1||tier===2)?tier as 1|2:1 as 1|2;let b=(CC[m.category||'Cerclé']?.[t]||0)+(DC[m.diamondCutType||'Standard']?.[t]||0)+(m.engravingCount||0)*((t===1)?12:10);m.glassType?.forEach(g=>{b+=GC[g]?.[t]||0;});if(m.shapeChange)b+=(t===1)?10:3.5;if(tier===3)b*=0.9;else if(tier===4)b*=0.85;return b+b*(UR[m.urgency||'Standard']||0);};

const FACTURE_INFO = {name:"L'Atelier des Arts",address:"178 Avenue Daumesnil",zipCity:"75012 Paris",siret:"98095501700010",tvaRate:0.20};
const URGENCY_OPTIONS=['Standard','Prioritaire -48H','Express -24H','Urgent -3H'];
const DIAMONDCUT_OPTIONS=['Standard','Facette Lisse','Diamond Ice','Facette Twinkle'];
const GLASS_OPTIONS=['Verre Dégradé 4 saisons','Verre Dégradé','Verre de stock'];

const statusCfg: Record<string,{dot:string;cls:string}> = {
  'En attente':{dot:'bg-amber-400',cls:'bg-amber-50 text-amber-700 border-amber-200'},
  'Reçu':      {dot:'bg-blue-400', cls:'bg-blue-50 text-blue-700 border-blue-200'},
  'En cours':  {dot:'bg-orange-400',cls:'bg-orange-50 text-orange-700 border-orange-200'},
  'Terminé':   {dot:'bg-emerald-400',cls:'bg-emerald-50 text-emerald-700 border-emerald-200'},
};
const StatusPill=({s}:{s:string})=>{const c=statusCfg[s]||{dot:'bg-gray-300',cls:'bg-gray-50 text-gray-600 border-gray-200'};return <span className={`inline-flex items-center gap-1.5 text-[10px] tracking-wide rounded-full px-2.5 py-1 border ${c.cls}`}><span className={`w-1.5 h-1.5 rounded-full ${c.dot}`}/>{s}</span>;};

const S={
  card:"bg-white rounded-2xl border border-[#EDE8DF] shadow-sm",
  label:"text-[9px] font-normal tracking-[0.22em] uppercase text-[#C9A96E] block mb-1.5",
  inp:"bg-white border border-[#EDE8DF] rounded-xl text-sm focus:ring-1 focus:ring-[#C9A96E] focus:border-[#C9A96E] transition-all",
  btnP:"inline-flex items-center justify-center gap-2 bg-[#0F0E0C] text-[#F7F4EE] hover:bg-[#1C1A17] rounded-xl text-[10px] tracking-widest uppercase font-normal transition-all px-4 h-9 cursor-pointer border-0",
  btnO:"inline-flex items-center justify-center gap-2 bg-white border border-[#EDE8DF] text-[#0F0E0C] hover:bg-[#F7F4EE] rounded-xl text-[10px] font-normal transition-all px-4 h-9 cursor-pointer",
  btnG:"inline-flex items-center justify-center gap-2 border border-[#C9A96E] text-[#C9A96E] bg-transparent hover:bg-[#C9A96E] hover:text-[#0F0E0C] rounded-xl text-[10px] uppercase tracking-widest font-normal transition-all px-3 h-8 cursor-pointer",
  btnD:"inline-flex items-center justify-center gap-2 border border-red-200 text-red-500 bg-white hover:bg-red-50 rounded-xl text-[10px] font-normal transition-all h-8 w-8 cursor-pointer",
};

/* ---- MODALE FACTURE ---- */
const InvoiceModal=({client,montages,isOpen,onClose,onPublished}:{client:Client;montages:Montage[];isOpen:boolean;onClose:()=>void;onPublished:(f:FactureData)=>void})=>{
  const [busy,setBusy]=useState(false);
  if(!isOpen)return null;
  const tier=client.pricingTier||1;
  const today=new Date();
  const getDetails=(m:Montage)=>{
    const t=(tier===1||tier===2)?tier as 1|2:1 as 1|2;
    let base=0;const details:string[]=[];
    const cp=CC[m.category||'Cerclé']?.[t]||0;base+=cp;details.push(`${m.category||'Standard'} (${cp.toFixed(2)}€)`);
    const dp=DC[m.diamondCutType||'Standard']?.[t]||0;if(dp>0){base+=dp;details.push(`${m.diamondCutType} (+${dp.toFixed(2)}€)`);}
    const ep=(m.engravingCount||0)*((t===1)?12:10);if(ep>0){base+=ep;details.push(`${m.engravingCount} gravure(s) (+${ep.toFixed(2)}€)`);}
    m.glassType?.forEach(g=>{const gp=GC[g]?.[t]||0;if(gp>0){base+=gp;details.push(`${g} (+${gp.toFixed(2)}€)`);}});
    if(m.shapeChange){const sc=(t===1)?10:3.5;base+=sc;details.push(`Changement forme (+${sc.toFixed(2)}€)`);}
    if(tier===3)base*=0.9;else if(tier===4)base*=0.85;
    const uc=base*(UR[m.urgency||'Standard']||0);if(uc>0){base+=uc;details.push(`Urgence (+${uc.toFixed(2)}€)`);}
    return{total:base,details};
  };
  const totalHT=montages.reduce((s,m)=>s+getDetails(m).total,0);
  const tva=totalHT*FACTURE_INFO.tvaRate;
  const totalTTC=totalHT+tva;
  const invNum=`FA-${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}-${client.nomSociete.substring(0,4).toUpperCase()}-${Date.now().toString().slice(-4)}`;

  const publish=async()=>{
    setBusy(true);const tid=toast.loading("Génération...");
    try{
      const el=document.getElementById('inv-content');if(!el)throw new Error();
      const canvas=await html2canvas(el,{scale:1,useCORS:true,scrollY:0});
      const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
      const w=pdf.internal.pageSize.getWidth();
      const ip=pdf.getImageProperties(canvas.toDataURL('image/jpeg',0.3));
      pdf.addImage(canvas.toDataURL('image/jpeg',0.3),'JPEG',0,0,w,(ip.height*w)/ip.width);
      const raw=pdf.output('datauristring');
      const b64=raw.includes('base64,')?raw.split('base64,')[1]:raw;
      const payload={userId:client._id,clientName:client.nomSociete,invoiceNumber:invNum,totalHT:parseFloat(totalHT.toFixed(2)),totalTTC:parseFloat(totalTTC.toFixed(2)),montagesReferences:montages.map(m=>m.reference||m._id),dateEmission:new Date().toISOString(),invoiceData:montages.map(m=>({reference:m.reference,...getDetails(m)})),pdfUrl:'#',sendEmail:true,pdfBase64:montages.length<=20?b64:null};
      const res=await authFetch(`${getBase()}/api/factures`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const d=await res.json();
      if(d.success){toast.success("Facture enregistrée !",{id:tid});pdf.save(`${invNum}.pdf`);onPublished(d.facture);onClose();}
      else toast.error(d.message||"Erreur",{id:tid});
    }catch{toast.error("Erreur technique.",{id:tid});}
    finally{setBusy(false);}
  };

  return(
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-white p-0 overflow-hidden flex flex-col max-h-[95vh] rounded-2xl">
        <DialogHeader className="p-5 border-b border-[#EDE8DF]"><DialogTitle className="font-playfair font-normal text-lg">Détail facturation</DialogTitle></DialogHeader>
        <div className="overflow-y-auto p-5 bg-[#F7F4EE] flex-grow">
          <div id="inv-content" className="p-10 bg-white border border-[#EDE8DF] rounded-xl mx-auto max-w-[210mm] min-h-[297mm] flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-8"><div><h1 className="text-2xl font-bold text-gray-900 mb-1">DÉTAIL DE FACTURATION</h1><p className="text-xs text-gray-400">Date : {today.toLocaleDateString('fr-FR')}</p></div><div className="text-right"><p className="font-bold text-gray-800">{FACTURE_INFO.name}</p><p className="text-xs text-gray-500">{FACTURE_INFO.address}, {FACTURE_INFO.zipCity}</p><p className="text-xs text-gray-500">SIRET : {FACTURE_INFO.siret}</p></div></div>
              <div className="border-t border-[#EDE8DF] py-4 mb-6"><p className="text-[9px] tracking-[0.2em] uppercase text-[#C9A96E] mb-1">Facturé à</p><p className="text-lg font-bold">{client.nomSociete}</p><p className="text-xs text-gray-500">{client.address} {client.zipCity}</p></div>
              <table className="w-full mb-6"><thead><tr className="border-b border-[#EDE8DF]"><th className="text-left py-2 text-xs text-gray-400 font-normal uppercase tracking-wider">Référence</th><th className="text-left py-2 text-xs text-gray-400 font-normal uppercase tracking-wider">Détails</th><th className="text-right py-2 text-xs text-gray-400 font-normal uppercase tracking-wider">HT</th></tr></thead>
                <tbody className="divide-y divide-[#EDE8DF]">{montages.map(m=>{const{total,details}=getDetails(m);return(<tr key={m._id}><td className="py-3 text-sm font-medium">{m.reference}</td><td className="py-3 text-xs text-gray-500">{details.map((d,i)=><div key={i}>{d}</div>)}</td><td className="py-3 text-sm font-semibold text-right">{total.toFixed(2)} €</td></tr>);})}</tbody>
              </table>
            </div>
            <div><div className="flex justify-between items-end"><div className="bg-[#F7F4EE] border border-[#EDE8DF] p-4 rounded-xl w-5/12"><p className="text-xs font-bold mb-2 uppercase tracking-wider">Coordonnées bancaires</p><p className="text-xs text-gray-500">IBAN : FR76 1820 6002 0065 1045 3419 297</p><p className="text-xs text-gray-500">BIC : AGRIFRPP882</p></div><div className="text-right space-y-1"><p className="text-sm text-gray-500">Total HT : {totalHT.toFixed(2)} €</p><p className="text-sm text-gray-500">TVA 20% : {tva.toFixed(2)} €</p><p className="text-xl font-bold mt-2">Net à payer : {totalTTC.toFixed(2)} €</p></div></div></div>
          </div>
        </div>
        <div className="p-4 border-t border-[#EDE8DF] bg-white flex justify-end gap-3">
          <button onClick={onClose} disabled={busy} className={S.btnO}>Annuler</button>
          <button onClick={publish} disabled={busy||montages.length===0} className={S.btnP+" px-6"}>Télécharger PDF</button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ---- MODALE FACTURES CLIENT ---- */
const ClientInvoicesModal=({client,invoices,isOpen,onClose,onDelete,onPaymentUpdate}:{client:Client|null;invoices:FactureData[];isOpen:boolean;onClose:()=>void;onDelete:(id:string)=>void;onPaymentUpdate:(id:string,amount:number)=>void})=>{
  const [payInv,setPayInv]=useState<FactureData|null>(null);const[amt,setAmt]=useState(0);
  if(!isOpen||!client)return null;
  const badge=(s:string|undefined,rem:number)=>{
    if(s==='Payé')return <span className="text-[10px] rounded-full px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700">Payé</span>;
    if(s==='Partiellement payé')return <span className="text-[10px] rounded-full px-2.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-700">Reste : {rem.toFixed(2)} €</span>;
    return <span className="text-[10px] rounded-full px-2.5 py-0.5 bg-red-50 border border-red-200 text-red-700">Non payé</span>;
  };
  return(
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-white p-6 max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader><DialogTitle className="font-playfair font-normal text-xl">Factures — {client.nomSociete}</DialogTitle></DialogHeader>
        {invoices.length===0?<div className="text-center py-10 text-sm text-gray-300">Aucune facture.</div>:(
          <div className="space-y-3 pt-4">{invoices.map(inv=>{const paid=inv.amountPaid||0;const rem=inv.totalTTC-paid;return(
            <div key={inv.id} className="flex flex-col md:flex-row justify-between items-center p-4 gap-4 bg-[#F7F4EE] rounded-xl border border-[#EDE8DF]">
              <div className="flex-1"><div className="flex items-center gap-2 mb-1"><p className="font-semibold text-sm">{inv.invoiceNumber}</p>{badge(inv.paymentStatus,rem)}</div><p className="text-xs text-gray-400">{new Date(inv.dateEmission).toLocaleDateString()}</p></div>
              <div className="flex items-center gap-4"><div className="text-right"><div className="font-bold">{inv.totalTTC.toFixed(2)} €</div>{paid>0&&paid<inv.totalTTC&&<div className="text-xs text-gray-400">Payé : {paid.toFixed(2)} €</div>}</div>
                <div className="flex gap-2">
                  <button className={S.btnO+" h-8 w-8 p-0"} onClick={()=>{setPayInv(inv);setAmt(inv.amountPaid||0);}}><CreditCard className="w-3.5 h-3.5"/></button>
                  <button className={S.btnD} onClick={()=>{if(confirm("Supprimer ?"))onDelete(inv.id);}}><Trash2 className="w-3.5 h-3.5"/></button>
                </div>
              </div>
            </div>
          );})}
          </div>
        )}
      </DialogContent>
      {payInv&&(<Dialog open={!!payInv} onOpenChange={()=>setPayInv(null)}><DialogContent className="max-w-sm bg-white rounded-2xl"><DialogHeader><DialogTitle className="font-playfair font-normal">Enregistrer un paiement</DialogTitle></DialogHeader><div className="space-y-4 py-4"><p className="text-sm text-gray-500">Facture {payInv.invoiceNumber} — Total : <strong>{payInv.totalTTC.toFixed(2)} €</strong></p><div><Label className={S.label}>Montant réglé (€)</Label><Input type="number" step="0.01" value={amt} onChange={e=>setAmt(parseFloat(e.target.value))} className={S.inp}/></div><button className={S.btnO+" text-xs"} onClick={()=>setAmt(payInv.totalTTC)}>Tout régler</button><button className={S.btnP+" w-full h-10"} onClick={()=>{onPaymentUpdate(payInv.id,amt);setPayInv(null);}}>Valider</button></div></DialogContent></Dialog>)}
    </Dialog>
  );
};

/* ---- DASHBOARD PRINCIPAL ---- */
export default function AdminDashboard(){
  const navigate=useNavigate();
  const[montages,setMontages]=useState<Montage[]>([]);
  const[clients,setClients]=useState<Client[]>([]);
  const[loading,setLoading]=useState(true);
  const[search,setSearch]=useState("");
  const[dlgOpen,setDlgOpen]=useState(false);
  const[editId,setEditId]=useState<string|null>(null);
  const[allInvoices,setAllInvoices]=useState<FactureData[]>([]);
  const[statusFilter,setStatusFilter]=useState<string|null>(null);
  const[showAll,setShowAll]=useState(false);
  const[invOpen,setInvOpen]=useState(false);
  const[invClient,setInvClient]=useState<Client|null>(null);
  const[invMontages,setInvMontages]=useState<Montage[]>([]);
  const[cliInvOpen,setCliInvOpen]=useState(false);
  const[cliInvClient,setCliInvClient]=useState<Client|null>(null);
  const[cliInvList,setCliInvList]=useState<FactureData[]>([]);
  const[photoUrl,setPhotoUrl]=useState<string|null>(null);
  const[shopOpen,setShopOpen]=useState(false);
  const[shopMgr,setShopMgr]=useState<Client|null>(null);
  const[tmpShops,setTmpShops]=useState<string[]>([]);
  const fileRefs=useRef<Record<string,HTMLInputElement|null>>({});
  const[isSubmitting,setIsSubmitting]=useState(false);

  const[nClient,setNClient]=useState("");const[nRef,setNRef]=useState("");const[nFrame,setNFrame]=useState("");
  const[nCat,setNCat]=useState("Cerclé");const[nGlass,setNGlass]=useState<string[]>([]);
  const[nUrg,setNUrg]=useState("Standard");const[nDC,setNDC]=useState("Standard");
  const[nEng,setNEng]=useState(0);const[nSC,setNSC]=useState(false);
  const[nDesc,setNDesc]=useState("");const[nStatut,setNStatut]=useState("En attente");

  useEffect(()=>{
    const str=localStorage.getItem("user");if(!str){navigate("/");return;}
    try{
      const u=JSON.parse(str);if(u.role!=='admin'){navigate("/dashboardpro");return;}
      Promise.all([
        authFetch(`${getBase()}/api/montages`).then(r=>r.json()),
        authFetch(`${getBase()}/api/users`).then(r=>r.json()),
        authFetch(`${getBase()}/api/factures`).then(r=>r.json()),
      ]).then(([m,c,f])=>{
        if(m.success)setMontages(m.montages);
        if(c.success){setClients(c.users);if(c.users.length)setNClient(c.users[0]._id);}
        if(f.success)setAllInvoices(f.factures.map((x:any)=>({id:x._id,userId:x.userId,clientName:x.clientName,invoiceNumber:x.invoiceNumber,totalTTC:x.totalTTC,dateEmission:x.dateEmission,pdfUrl:x.pdfUrl,montagesReferences:x.montagesReferences,amountPaid:x.amountPaid,paymentStatus:x.paymentStatus})));
        setLoading(false);
      });
    }catch{navigate("/");}
  },[navigate]);

  const fetchM=async()=>{const r=await authFetch(`${getBase()}/api/montages`);const d=await r.json();if(d.success)setMontages(d.montages);};
  const delInvoice=async(id:string)=>{const r=await authFetch(`${getBase()}/api/factures/${id}`,{method:'DELETE'});const d=await r.json();if(d.success){toast.success("Facture supprimée");setAllInvoices(p=>p.filter(f=>f.id!==id));setCliInvList(p=>p.filter(f=>f.id!==id));}else toast.error("Erreur suppression");};
  const updatePay=async(id:string,amount:number)=>{try{const r=await authFetch(`${getBase()}/api/factures/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({amountPaid:amount})});const d=await r.json();if(d.success){toast.success("Paiement mis à jour !");setAllInvoices(p=>p.map(f=>f.id===id?{...f,amountPaid:d.facture.amountPaid,paymentStatus:d.facture.paymentStatus}:f));setCliInvList(p=>p.map(f=>f.id===id?{...f,amountPaid:d.facture.amountPaid,paymentStatus:d.facture.paymentStatus}:f));}}catch{toast.error("Erreur paiement");}};
  const uploadPhoto=async(id:string,file:File)=>{const fd=new FormData();fd.append('photo',file);toast.loading("Envoi...",{id:'ph'});try{const r=await authFetch(`${getBase()}/api/montages/${id}/photo`,{method:'POST',body:fd});const d=await r.json();if(d.success){toast.success("Photo ajoutée !",{id:'ph'});fetchM();}else toast.error("Erreur upload",{id:'ph'});}catch{toast.error("Erreur connexion",{id:'ph'});}};
  const saveMontage=async(e:React.FormEvent)=>{e.preventDefault();setIsSubmitting(true);const method=editId?"PUT":"POST";const url=editId?`${getBase()}/api/montages/${editId}`:`${getBase()}/api/montages`;const base={reference:nRef,frame:nFrame,description:nDesc,category:nCat,glassType:nGlass,urgency:nUrg,diamondCutType:nDC,engravingCount:nEng,shapeChange:nSC,createdBy:"Admin",statut:nStatut};const payload=method==="POST"?{...base,userId:nClient}:base;try{const r=await authFetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const d=await r.json();if(d.success){toast.success(editId?"Modifié !":"Créé !");setDlgOpen(false);fetchM();}}catch{toast.error("Erreur API");}finally{setIsSubmitting(false);};};
  const openCreate=()=>{setEditId(null);setNRef("");setNFrame("");setNCat("Cerclé");setNGlass([]);setNUrg("Standard");setNDC("Standard");setNEng(0);setNSC(false);setNDesc("");setNStatut("En attente");setDlgOpen(true);};
  const openEdit=(m:Montage)=>{setEditId(m._id);setNRef(m.reference||"");setNFrame(m.frame||"");setNCat(m.category||"Cerclé");setNGlass(m.glassType||[]);setNUrg(m.urgency||"Standard");setNDC(m.diamondCutType||"Standard");setNEng(m.engravingCount||0);setNSC(m.shapeChange||false);setNDesc(m.description||"");setNStatut(m.statut||"En attente");setNClient(m.userId);setDlgOpen(true);};
  const changeStatus=async(id:string,s:string)=>{await authFetch(`${getBase()}/api/montages/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({statut:s})});fetchM();toast.success(`Statut : ${s}`);};
  const deleteMontage=async(id:string)=>{if(confirm("Supprimer ce dossier ?")){await authFetch(`${getBase()}/api/montages/${id}`,{method:'DELETE'});fetchM();toast.success("Supprimé");}};
  const exportCSV=()=>{const h=["Date","Client","Référence","Monture","Catégorie","Statut","Prix HT","Créé par"];const rows=montages.map(m=>{const c=clients.find(cl=>cl._id===m.userId);return[new Date(m.dateReception).toLocaleDateString(),`"${c?.nomSociete||''}"`,`"${m.reference||''}"`,`"${m.frame||''}"`,m.category,m.statut,calcP(m,c?.pricingTier||1).toFixed(2).replace('.',','),`"${m.createdBy||''}"`].join(";");});const blob=new Blob([[h.join(";"),...rows].join("\n")],{type:'text/csv;charset=utf-8;'});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`export_${new Date().toISOString().slice(0,10)}.csv`;document.body.appendChild(a);a.click();document.body.removeChild(a);};
  const saveShops=async()=>{if(!shopMgr)return;try{const r=await authFetch(`${getBase()}/api/users/${shopMgr._id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({assignedShops:tmpShops})});const d=await r.json();if(d.success){toast.success("Magasins assignés !");setClients(p=>p.map(c=>c._id===shopMgr._id?{...c,assignedShops:d.user.assignedShops}:c));setShopOpen(false);}else toast.error("Erreur sauvegarde.");}catch{toast.error("Erreur technique.");}};

  const fm=montages.filter(m=>{const s=normalize(search);const ok=(normalize(m.reference)+normalize(m.clientName)).includes(s);let st=true;if(statusFilter==='En production')st=m.statut==='En cours'||m.statut==='Reçu';else if(statusFilter)st=m.statut===statusFilter;return ok&&st;});
  const sorted=[...fm].sort((a,b)=>new Date(b.dateReception).getTime()-new Date(a.dateReception).getTime());
  const cnts: Record<string,number>={};
  const displayed=showAll?sorted:sorted.filter(m=>{cnts[m.userId]=(cnts[m.userId]||0)+1;return cnts[m.userId]<=20;});
  const hidden=fm.length-displayed.length;
  const grouped=fm.reduce((acc:any,m)=>{const c=clients.find(cl=>cl._id===m.userId);const cn=c?.nomSociete||m.clientName||`?`;let mo="?";try{if(m.dateReception)mo=new Date(m.dateReception).toLocaleDateString('fr-FR',{month:'long',year:'numeric'});}catch{}if(!acc[mo])acc[mo]={};if(!acc[mo][cn])acc[mo][cn]=[];acc[mo][cn].push(m);return acc;},{});
  const filteredClients=clients.filter(c=>normalize(c.nomSociete).includes(normalize(search)));
  const pending=montages.filter(m=>m.statut==='En attente').length;
  const inProd=montages.filter(m=>m.statut==='En cours'||m.statut==='Reçu').length;

  if(loading)return(<div className="min-h-screen bg-[#F7F4EE] flex items-center justify-center"><div className="flex flex-col items-center gap-3"><Loader2 className="w-7 h-7 animate-spin text-[#C9A96E]"/><span className="text-[10px] tracking-[0.25em] uppercase text-gray-400">Chargement</span></div></div>);

  return(
    <div className="min-h-screen bg-[#F7F4EE] flex flex-col">
      <Navigation/>
      <div className="flex-grow pt-24 pb-12 px-6 container mx-auto max-w-7xl">

        {/* En-tête */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
          <div>
            <span className={S.label}>Administration</span>
            <h1 className="font-playfair text-3xl font-normal text-[#0F0E0C] tracking-tight">Tableau de Bord</h1>
            <p className="text-sm text-gray-400 mt-1 font-light">{montages.length} montages chargés</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button onClick={()=>navigate('/stats')} className={S.btnO}><BarChart2 className="w-3.5 h-3.5 text-[#C9A96E]"/> Statistiques</button>
            <button onClick={exportCSV} className={S.btnO}><FileText className="w-3.5 h-3.5"/> Export CSV</button>
            <button onClick={openCreate} className={S.btnP}><PlusCircle className="w-3.5 h-3.5"/> Créer un dossier</button>
            <button onClick={()=>{localStorage.clear();navigate("/");}} className="inline-flex items-center gap-2 border border-red-200 text-red-500 bg-white hover:bg-red-50 rounded-xl text-[10px] font-normal transition-all px-4 h-9 cursor-pointer">Déconnexion</button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {[{label:"À traiter",val:pending,filter:'En attente',dot:'bg-amber-400'},{label:"En production",val:inProd,filter:'En production',dot:'bg-orange-400'},{label:"Clients",val:clients.length,filter:null,dot:'bg-[#C9A96E]'}].map(({label,val,filter,dot})=>(
            <div key={label} onClick={()=>filter&&setStatusFilter(statusFilter===filter?null:filter)}
              className={`${S.card} p-6 transition-all duration-300 ${filter?'cursor-pointer hover:shadow-md hover:-translate-y-0.5':''} ${statusFilter===filter&&filter?'ring-2 ring-[#C9A96E]':''}`}>
              <div className="flex items-center gap-2 mb-3"><span className={`w-2 h-2 rounded-full ${dot}`}/><span className={S.label} style={{marginBottom:0}}>{label}</span></div>
              <p className="font-playfair text-4xl font-normal text-[#0F0E0C]">{val}</p>
            </div>
          ))}
        </div>

        {/* Filtre actif */}
        {statusFilter&&(<div className="mb-5"><button onClick={()=>setStatusFilter(null)} className="inline-flex items-center gap-2 text-[10px] tracking-wide bg-white border border-[#EDE8DF] rounded-full px-4 py-2 text-[#0F0E0C] hover:bg-[#F7F4EE] transition-colors">Filtre : {statusFilter} <X className="w-3 h-3"/></button></div>)}

        {/* Recherche */}
        <div className="relative mb-7">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4"/>
          <input className="w-full pl-11 pr-4 py-3 bg-white border border-[#EDE8DF] rounded-2xl text-sm placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#C9A96E] focus:border-[#C9A96E] transition-all" placeholder="Rechercher un dossier, un client..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>

        {/* Tabs manuels */}
        {(()=>{
          const[tab,setTab]=useState<'atelier'|'clients'>('atelier');
          return(
            <div className="space-y-6">
              <div className="bg-white border border-[#EDE8DF] rounded-2xl p-1 inline-flex shadow-sm">
                {(['atelier','clients'] as const).map(t=>(
                  <button key={t} onClick={()=>setTab(t)}
                    className={`rounded-xl px-6 py-2.5 text-[10px] tracking-[0.15em] uppercase transition-all ${tab===t?'bg-[#0F0E0C] text-[#F7F4EE]':'text-gray-400 hover:text-[#0F0E0C]'}`}>
                    {t==='atelier'?`Atelier (${fm.length})`:`Clients (${filteredClients.length})`}
                  </button>
                ))}
              </div>

              {tab==='atelier'&&(
                <div className={S.card+" overflow-hidden"}>
                  <div className="px-6 py-4 border-b border-[#EDE8DF]">
                    <p className={S.label}>Production</p>
                    <h2 className="font-playfair text-xl font-normal text-[#0F0E0C]">Flux de Production</h2>
                  </div>
                  <div className="p-6 min-h-64">
                    {Object.keys(grouped).length===0?<div className="text-center py-16 text-gray-300 text-sm">Aucun montage avec les filtres actuels.</div>:(
                      <Accordion type="multiple" className="space-y-3">
                        {Object.entries(grouped).sort().reverse().map(([mo,shops]:any)=>(
                          <AccordionItem key={mo} value={mo} className="bg-white border border-[#EDE8DF] rounded-2xl overflow-hidden">
                            <AccordionTrigger className="hover:no-underline px-5 py-4 hover:bg-[#F7F4EE] transition-colors">
                              <div className="flex items-center gap-3"><Calendar className="w-4 h-4 text-[#C9A96E]"/><span className="font-playfair text-base font-normal text-[#0F0E0C] capitalize">{mo}</span></div>
                            </AccordionTrigger>
                            <AccordionContent className="px-5 pb-5 pt-2">
                              <Accordion type="multiple" className="space-y-2">
                                {Object.entries(shops).map(([shopName,items]:any)=>{
                                  const first=items[0] as Montage;
                                  const client=clients.find(c=>c._id===first.userId);
                                  return(
                                    <AccordionItem key={shopName} value={shopName} className="bg-[#F7F4EE] border border-[#EDE8DF] rounded-xl overflow-hidden">
                                      <AccordionTrigger className="hover:no-underline px-4 py-3 hover:bg-[#EDE8DF] transition-colors">
                                        <div className="flex items-center gap-3 w-full pr-3">
                                          <span className="font-medium text-[#0F0E0C] text-sm">{shopName}</span>
                                          <span className="text-xs text-gray-400">({items.length})</span>
                                          <button onClick={e=>{e.stopPropagation();if(client){setInvClient(client);setInvMontages(items);setInvOpen(true);}}} disabled={!client}
                                            className={S.btnG+" ml-auto"}>
                                            <Receipt className="w-3 h-3"/> Facturer
                                          </button>
                                        </div>
                                      </AccordionTrigger>
                                      <AccordionContent className="px-4 pb-4 pt-2 space-y-2">
                                        {items.map((m:Montage)=>{
                                          const price=calcP(m,client?.pricingTier||1);
                                          return(
                                            <div key={m._id} className="bg-white border border-[#EDE8DF] rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:shadow-sm transition-all">
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap mb-2">
                                                  <span className="font-semibold text-[#0F0E0C]">{m.reference}</span>
                                                  <span className="text-gray-300">·</span>
                                                  <span className="text-sm text-gray-500">{m.frame}</span>
                                                  <StatusPill s={m.statut}/>
                                                  <span className="ml-auto text-xs font-medium text-[#9A7A45]">{price.toFixed(2)} € HT</span>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                  <span className="text-[10px] rounded-full px-2 py-0.5 bg-[#F7F4EE] border border-[#EDE8DF] text-gray-500">{m.category}</span>
                                                  {m.urgency!=='Standard'&&<span className="text-[10px] rounded-full px-2 py-0.5 bg-red-50 border border-red-100 text-red-500">{m.urgency}</span>}
                                                  {m.diamondCutType!=='Standard'&&<span className="text-[10px] rounded-full px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-500">{m.diamondCutType}</span>}
                                                  {m.glassType?.map(g=><span key={g} className="text-[10px] rounded-full px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-600">{g.replace('Verre ','')}</span>)}
                                                  {(m.engravingCount||0)>0&&<span className="text-[10px] rounded-full px-2 py-0.5 bg-purple-50 border border-purple-100 text-purple-600">{m.engravingCount} gravure(s)</span>}
                                                </div>
                                                {m.description&&<p className="text-xs text-gray-400 mt-1.5 italic">{m.description}</p>}
                                              </div>
                                              <div className="flex items-center gap-2 flex-shrink-0">
                                                <Select defaultValue={m.statut} onValueChange={v=>changeStatus(m._id,v)}>
                                                  <SelectTrigger className="w-[130px] h-8 text-[10px] bg-white border border-[#EDE8DF] rounded-xl focus:ring-1 focus:ring-[#C9A96E]"><SelectValue/></SelectTrigger>
                                                  <SelectContent className="bg-white rounded-xl">
                                                    {Object.entries(statusCfg).map(([v,c])=>(
                                                      <SelectItem key={v} value={v}><span className="flex items-center gap-2 text-xs"><span className={`w-1.5 h-1.5 rounded-full ${c.dot}`}/>{v}</span></SelectItem>
                                                    ))}
                                                  </SelectContent>
                                                </Select>
                                                {m.photoUrl?(
                                                  <button className={S.btnO+" h-8 w-8 p-0"} onClick={async e=>{e.stopPropagation();toast.loading("Chargement...",{id:'p'});try{const r=await authFetch(`${getBase()}/api/montages/${m._id}`);const d=await r.json();if(d.success&&d.montage.photoUrl){setPhotoUrl(d.montage.photoUrl);toast.dismiss('p');}else toast.error("Image introuvable",{id:'p'});}catch{toast.error("Erreur",{id:'p'});}}}>
                                                    <ImageIcon className="w-3.5 h-3.5 text-[#C9A96E]"/>
                                                  </button>
                                                ):(
                                                  <>
                                                    <input type="file" accept="image/*" style={{display:'none'}} ref={el=>fileRefs.current[m._id]=el} onChange={e=>{if(e.target.files?.[0])uploadPhoto(m._id,e.target.files[0]);}}/>
                                                    <button className={S.btnO+" h-8 w-8 p-0"} onClick={e=>{e.stopPropagation();fileRefs.current[m._id]?.click();}}><Camera className="w-3.5 h-3.5"/></button>
                                                  </>
                                                )}
                                                <button className={S.btnO+" h-8 w-8 p-0"} onClick={()=>openEdit(m)}><Pencil className="w-3.5 h-3.5"/></button>
                                                <button className={S.btnD} onClick={()=>deleteMontage(m._id)}><Trash2 className="w-3.5 h-3.5"/></button>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </AccordionContent>
                                    </AccordionItem>
                                  );
                                })}
                              </Accordion>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    )}
                    {!showAll&&hidden>0&&(<div className="mt-8 flex justify-center"><button onClick={()=>setShowAll(true)} className="text-xs tracking-wide text-[#C9A96E] border border-[#C9A96E]/30 rounded-full px-6 py-2.5 hover:bg-[#C9A96E]/5 transition-colors">Charger l'historique ({hidden} dossiers masqués)</button></div>)}
                  </div>
                </div>
              )}

              {tab==='clients'&&(
                <div className={S.card+" overflow-hidden"}>
                  <div className="px-6 py-4 border-b border-[#EDE8DF]">
                    <p className={S.label}>Gestion</p>
                    <h2 className="font-playfair text-xl font-normal text-[#0F0E0C]">Fiches Clients & Facturation</h2>
                  </div>
                  <div className="divide-y divide-[#EDE8DF]">
                    {filteredClients.map(c=>(
                      <div key={c._id} className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-white transition-colors">
                        <div className="flex-1 cursor-pointer" onClick={()=>{setCliInvClient(c);setCliInvList(allInvoices.filter(f=>f.userId===c._id));setCliInvOpen(true);}}>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-medium text-[#0F0E0C]">{c.nomSociete}</p>
                            {c.role==='manager'&&<span className="text-[10px] rounded-full px-2.5 py-0.5 bg-blue-50 border border-blue-100 text-blue-600">Manager</span>}
                            {c.isVerified?<span className="text-[10px] rounded-full px-2.5 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5"/>Validé</span>:<span className="text-[10px] rounded-full px-2.5 py-0.5 bg-amber-50 border border-amber-100 text-amber-600 flex items-center gap-1"><AlertCircle className="w-2.5 h-2.5"/>En attente</span>}
                          </div>
                          <p className="text-xs text-gray-400">{c.email} · SIRET : {c.siret}</p>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className={S.label} style={{marginBottom:0}}>Tarif</span>
                            <Select value={c.pricingTier?.toString()||"1"} onValueChange={async v=>{const t=parseInt(v);await authFetch(`${getBase()}/api/users/${c._id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({pricingTier:t})});toast.success(`Tarif ${t} appliqué`);setClients(p=>p.map(cl=>cl._id===c._id?{...cl,pricingTier:t as 1|2}:cl));}}>
                              <SelectTrigger className="w-28 h-8 text-xs bg-white border border-[#EDE8DF] rounded-xl"><SelectValue/></SelectTrigger>
                              <SelectContent className="bg-white rounded-xl"><SelectItem value="1">Tarif 1 — Std</SelectItem><SelectItem value="2">Tarif 2 — VIP</SelectItem><SelectItem value="3">Tarif — 10%</SelectItem><SelectItem value="4">Tarif — 15%</SelectItem></SelectContent>
                            </Select>
                          </div>
                          {c.role==='manager'&&<button className={S.btnO+" text-[10px] gap-1 h-8 px-3"} onClick={e=>{e.stopPropagation();setShopMgr(c);setTmpShops(c.assignedShops?.map((s:any)=>typeof s==='string'?s:s._id)||[]);setShopOpen(true);}}><Store className="w-3 h-3"/> Magasins</button>}
                          {!c.isVerified&&<button className={S.btnP+" text-[10px] gap-1 h-8 px-3"} onClick={async e=>{e.stopPropagation();if(confirm(`Valider ${c.nomSociete} ?`)){await authFetch(`${getBase()}/api/users/${c._id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({isVerified:true})});setClients(p=>p.map(cl=>cl._id===c._id?{...cl,isVerified:true}:cl));}}}>Valider</button>}
                          <button className={S.btnG+" text-[10px] gap-1"} onClick={e=>{e.stopPropagation();setCliInvClient(c);setCliInvList(allInvoices.filter(f=>f.userId===c._id));setCliInvOpen(true);}}><Receipt className="w-3 h-3"/> Factures</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Modales */}
        <Dialog open={shopOpen} onOpenChange={setShopOpen}>
          <DialogContent className="bg-white max-w-lg rounded-2xl">
            <DialogHeader><DialogTitle className="font-playfair font-normal">Magasins — {shopMgr?.nomSociete}</DialogTitle></DialogHeader>
            <div className="py-4 space-y-2 max-h-[60vh] overflow-y-auto">
              {clients.filter(c=>c.role==='user').map(shop=>(
                <div key={shop._id} className="flex items-center gap-3 p-3 border border-[#EDE8DF] rounded-xl hover:bg-[#F7F4EE] transition-colors">
                  <Checkbox id={shop._id} checked={tmpShops.includes(shop._id)} onCheckedChange={chk=>setTmpShops(p=>chk?[...p,shop._id]:p.filter(id=>id!==shop._id))}/>
                  <label htmlFor={shop._id} className="flex-1 cursor-pointer text-sm font-medium text-[#0F0E0C]">{shop.nomSociete} <span className="text-gray-400 text-xs ml-1">{shop.zipCity}</span></label>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={()=>setShopOpen(false)} className={S.btnO+" h-9"}>Annuler</button>
              <button onClick={saveShops} className={S.btnP+" h-9 px-5"}>Enregistrer</button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={dlgOpen} onOpenChange={setDlgOpen}>
          <DialogContent className="max-w-2xl bg-white rounded-2xl">
            <DialogHeader><DialogTitle className="font-playfair font-normal text-xl">{editId?"Modifier le dossier":"Nouveau dossier"}</DialogTitle></DialogHeader>
            <form onSubmit={saveMontage} className="space-y-5 pt-2">
              <div><Label className={S.label}>Client</Label><Select onValueChange={setNClient} value={nClient}><SelectTrigger className={S.inp+" w-full h-10"}><SelectValue/></SelectTrigger><SelectContent className="bg-white rounded-xl">{clients.map(c=><SelectItem key={c._id} value={c._id}>{c.nomSociete}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label className={S.label}>Réf.</Label><Input value={nRef} onChange={e=>setNRef(e.target.value)} required className={S.inp+" h-10"}/></div>
                <div><Label className={S.label}>Monture</Label><Input value={nFrame} onChange={e=>setNFrame(e.target.value)} required className={S.inp+" h-10"}/></div>
                <div><Label className={S.label}>Urgence</Label><Select onValueChange={setNUrg} value={nUrg}><SelectTrigger className={S.inp+" h-10"}><SelectValue/></SelectTrigger><SelectContent className="bg-white rounded-xl">{URGENCY_OPTIONS.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div><Label className={S.label}>Statut</Label><Select onValueChange={setNStatut} value={nStatut}><SelectTrigger className={S.inp+" h-10 w-full"}><SelectValue/></SelectTrigger><SelectContent className="bg-white rounded-xl">{Object.entries(statusCfg).map(([v,c])=><SelectItem key={v} value={v}><span className="flex items-center gap-2 text-sm"><span className={`w-2 h-2 rounded-full ${c.dot}`}/>{v}</span></SelectItem>)}</SelectContent></Select></div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label className={S.label}>Type</Label><Select onValueChange={setNCat} value={nCat}><SelectTrigger className={S.inp+" h-10"}><SelectValue/></SelectTrigger><SelectContent className="bg-white rounded-xl"><SelectItem value="Cerclé">Cerclé</SelectItem><SelectItem value="Percé">Percé</SelectItem><SelectItem value="Nylor">Nylor</SelectItem><SelectItem value="Sans Montage">Sans Montage</SelectItem></SelectContent></Select></div>
                <div><Label className={S.label}>Diamond Cut</Label><Select onValueChange={setNDC} value={nDC}><SelectTrigger className={S.inp+" h-10"}><SelectValue/></SelectTrigger><SelectContent className="bg-white rounded-xl">{DIAMONDCUT_OPTIONS.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
                <div><Label className={S.label}>Gravures</Label><Input type="number" value={nEng} onChange={e=>setNEng(parseInt(e.target.value)||0)} className={S.inp+" h-10"}/></div>
              </div>
              <div className="p-4 bg-[#F7F4EE] rounded-xl border border-[#EDE8DF]">
                <Label className={S.label}>Options verres & autres</Label>
                <div className="flex flex-wrap gap-5 mt-2">
                  {GLASS_OPTIONS.map(o=><div key={o} className="flex items-center gap-2"><Checkbox id={o} checked={nGlass.includes(o)} onCheckedChange={c=>setNGlass(p=>(c as boolean)?[...p,o]:p.filter(t=>t!==o))}/><label htmlFor={o} className="text-sm cursor-pointer text-[#0F0E0C] font-light">{o}</label></div>)}
                  <div className="flex items-center gap-2 border-l border-[#EDE8DF] pl-5"><Checkbox id="sc" checked={nSC} onCheckedChange={c=>setNSC(c as boolean)}/><label htmlFor="sc" className="text-sm cursor-pointer font-light">Changement de forme</label></div>
                </div>
              </div>
              <div><Label className={S.label}>Commentaire</Label><Textarea value={nDesc} onChange={e=>setNDesc(e.target.value)} placeholder="Information spécifique..." className={S.inp+" min-h-[70px] resize-none"}/></div>
              <button type="submit" disabled={isSubmitting} className={S.btnP+" w-full h-11"}>{isSubmitting?"Enregistrement...":(editId?"Modifier":"Créer")}</button>
            </form>
          </DialogContent>
        </Dialog>

        {invClient&&<InvoiceModal client={invClient} montages={invMontages} isOpen={invOpen} onClose={()=>setInvOpen(false)} onPublished={f=>{setAllInvoices(p=>[f,...p]);}}/>}
        <ClientInvoicesModal client={cliInvClient} invoices={cliInvList} isOpen={cliInvOpen} onClose={()=>setCliInvOpen(false)} onDelete={delInvoice} onPaymentUpdate={updatePay}/>

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
