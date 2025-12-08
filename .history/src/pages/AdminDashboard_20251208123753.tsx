import React, { useEffect, useState } from 'react';
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import { LayoutDashboard, Glasses, Users, Package, AlertCircle, CheckCircle2, Trash2, Mail, FileText, Calendar, PlusCircle, Pencil, Search, Phone, Receipt, Printer, Send } from "lucide-react";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf'; 

// Interfaces Mises à Jour
interface Montage {
  _id: string; clientName: string; reference?: string; frame?: string; description: string; category?: string;
  glassType?: string[]; urgency?: string; diamondCutType?: string; engravingCount?: number; shapeChange?: boolean; statut: string; dateReception: string; userId: string;
}

interface Client { 
  _id: string; nomSociete: string; email: string; siret: string; phone?: string; 
  address?: string; zipCity?: string; createdAt: string; 
}

interface FactureData { 
    id: string;
    userId: string;
    clientName: string;
    invoiceNumber: string;
    totalTTC: number;
    dateEmission: string;
    pdfUrl: string;
    montagesReferences?: string[]; 
}

const statusPriority: Record<string, number> = {
  'En attente': 1, 'Reçu': 2, 'En cours': 3, 'Terminé': 4, 'Expédié': 5
};

const normalize = (text: string | undefined): string => {
    if (!text) return "";
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
};

// --- DÉFINITION DES PRIX FACTURE (inchangée) ---
const CATEGORY_COSTS: Record<string, number> = { 'Cerclé': 7.00, 'Percé': 15.90, 'Nylor': 14.90 };
const GLASS_COSTS: Record<string, number> = { 'Verre 4 saisons': 12.00, 'Verre Dégradé': 25.00, 'Verre de stock': 0.00 };
const DIAMONDCUT_COSTS: Record<string, number> = { 'Facette Lisse': 39.80, 'Facette Twinkle': 79.80, 'Diamond Ice': 93.60, 'Standard': 0.00 };
const URGENCY_RATES: Record<string, number> = { 'Urgent -3H': 0.50, 'Urgent -24H': 0.30, 'Urgent -48H': 0.20, 'Standard': 0.00 };
const SHAPE_CHANGE_COST = 10.00;
const ENGRAVING_UNIT_COST = 12.00;

const FACTURE_INFO = {
    name: "L'Atelier des Arts", address: "178 Avenue Daumesnil", zipCity: "75012 Paris", siret: "98095501700010", email: "contact@atelierdesarts.com", tvaRate: 0.20
};

// --- COMPOSANT MODAL DE FACTURATION (Génération PDF) ---
interface InvoiceProps { client: Client; montages: Montage[]; isOpen: boolean; onClose: () => void; onInvoicePublished: (invoiceData: FactureData) => void; }

const InvoiceModal: React.FC<InvoiceProps> = ({ client, montages, isOpen, onClose, onInvoicePublished }) => {
    if (!isOpen) return null;

    const today = new Date();
    const currentYear = today.getFullYear();

    const monthlyMontages = montages.filter(m => { return m.statut === 'Terminé'; });
    
    // Logique de calcul des prix (omise pour la concision)
    const calculateTotal = (m: Montage) => {
        let totalBase = 0;
        totalBase += CATEGORY_COSTS[m.category || 'Cerclé'] || 0;
        totalBase += DIAMONDCUT_COSTS[m.diamondCutType || 'Standard'] || 0;
        totalBase += (m.engravingCount || 0) * ENGRAVING_UNIT_COST;
        if (m.glassType) { m.glassType.forEach(type => { totalBase += GLASS_COSTS[type] || 0; }); }
        if (m.shapeChange) { totalBase += SHAPE_CHANGE_COST; }
        const urgencyRate = URGENCY_RATES[m.urgency || 'Standard'] || 0;
        const urgencySurcharge = totalBase * urgencyRate;
        const finalTotal = totalBase + urgencySurcharge;
        return { total: finalTotal, surcharge: urgencySurcharge };
    };
    
    const getMontagePriceDetails = (m: Montage) => {
        const { total, surcharge } = calculateTotal(m);
        let details: string[] = [];

        const montagePrice = CATEGORY_COSTS[m.category || 'Cerclé'] || 0;
        details.push(`${m.category} (${montagePrice.toFixed(2)}€)`);

        const dcPrice = DIAMONDCUT_COSTS[m.diamondCutType || 'Standard'] || 0;
        if (dcPrice > 0) details.push(`Diamond Cut ${m.diamondCutType} (+${dcPrice.toFixed(2)}€)`);

        const engravingPrice = (m.engravingCount || 0) * ENGRAVING_UNIT_COST;
        if (engravingPrice > 0) details.push(`${m.engravingCount} Gravure(s) (+${engravingPrice.toFixed(2)}€)`);

        if (m.glassType) {
            m.glassType.forEach(type => {
                const price = GLASS_COSTS[type] || 0;
                if (price > 0) details.push(`${type.replace('Verre ', '')} (+${price.toFixed(2)}€)`);
            });
        }
        
        if (m.shapeChange) details.push(`Changement de forme (+${SHAPE_CHANGE_COST.toFixed(2)}€)`);

        if (surcharge > 0) {
             const rate = URGENCY_RATES[m.urgency || 'Standard'] * 100;
             details.push(`Urgence (${rate.toFixed(0)}% Surcharge: +${surcharge.toFixed(2)}€)`);
        }

        return { total, details };
    };


    const totalHT = monthlyMontages.reduce((sum, m) => sum + getMontagePriceDetails(m).total, 0);
    const tva = totalHT * FACTURE_INFO.tvaRate;
    const totalTTC = totalHT + tva;
    const invoiceNumber = `FCT-${currentYear}${today.getMonth() + 1}-${client._id.substring(0, 4)}`.toUpperCase();
    const montagesReferences = monthlyMontages.map(m => m.reference).filter(ref => ref) as string[];

    // Fonction de PUBLICATION et TÉLÉCHARGEMENT PDF
    const handleDownloadPDF = async () => {
        const input = document.getElementById('invoice-content');
        if (!input) { toast.error("Contenu de facture introuvable."); return; }
        
        // 1. Définition des données à enregistrer
        const invoiceDataToSave = {
            userId: client._id,
            clientName: client.nomSociete,
            invoiceNumber: invoiceNumber,
            totalHT: parseFloat(totalHT.toFixed(2)),
            totalTTC: parseFloat(totalTTC.toFixed(2)),
            montagesReferences: montagesReferences,
            dateEmission: new Date().toISOString(),
            pdfUrl: '#' 
        };

        toast.loading("Génération du PDF et publication...", { id: 'pdf-gen' });
        let isPublishedSuccessfully = false;

        // 2. ENREGISTRER LA FACTURE CÔTÉ SERVEUR
        try {
            const res = await fetch("https://atelier4.vercel.app/api/factures", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(invoiceDataToSave)
            });
            const data = await res.json();

            if (!data.success) {
                 toast.warning(`Facture déjà publiée ou erreur d'enregistrement (${data.message || 'Doublon/Erreur'}). Téléchargement en cours...`, { id: 'pdf-gen' });
            } else {
                 toast.success("Facture enregistrée et publiée chez le client !", { id: 'pdf-gen' });
                 onInvoicePublished(data.facture); 
                 isPublishedSuccessfully = true;
            }
        } catch (e) {
            toast.error("Échec de la connexion pour enregistrer la facture.", { id: 'pdf-gen' });
        }


        // 3. GÉNÉRATION ET TÉLÉCHARGEMENT DU PDF
        html2canvas(input, { scale: 2, allowTaint: true, useCORS: true }).then((canvas) => {
            const imgData = canvas.toDataURL('image/jpeg', 1.0); 
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const imgWidth = 210;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
            pdf.save(`Facture_${client.nomSociete}_${today.toLocaleDateString('fr-CA')}.pdf`);
            
             if (isPublishedSuccessfully) {
                 toast.success("Facture téléchargée localement!", { id: 'pdf-gen' });
            }
        }).catch(err => {
            console.error("Erreur html2canvas:", err);
            toast.error("Erreur critique lors de la création du PDF.", { id: 'pdf-gen' });
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            {/* ... (Styles pour l'impression) ... */}
            <div className="invoice-wrapper"> 
                <DialogContent className="DialogContent max-w-4xl bg-white p-8 print:p-0 max-h-[90vh] overflow-y-auto">
                    {/* ... (Contenu de la facture) ... */}

                    <div className="flex justify-end mt-4 gap-3 print-hidden">
                        <Button variant="outline" className="flex items-center gap-2" disabled={monthlyMontages.length === 0}><Send className="w-4 h-4" /> Envoyer par E-mail (Pro)</Button>
                        <Button onClick={handleDownloadPDF} className="flex items-center gap-2" disabled={monthlyMontages.length === 0}>
                            <Printer className="w-4 h-4" /> Publier & Télécharger PDF
                        </Button>
                    </div>
                </DialogContent>
            </div>
        </Dialog>
    );
};

// --- MODALE : AFFICHAGE DES FACTURES CLIENTS ---
interface ClientInvoicesModalProps { client: Client | null; invoices: FactureData[]; isOpen: boolean; onClose: () => void; }

const ClientInvoicesModal: React.FC<ClientInvoicesModalProps> = ({ client, invoices, isOpen, onClose }) => {
    if (!isOpen || !client) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-white p-6 max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle className="text-2xl font-bold">Factures de {client.nomSociete}</DialogTitle></DialogHeader>
                
                {invoices.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">
                        Aucune facture émise pour ce client pour le moment.
                    </div>
                ) : (
                    <div className="space-y-3 pt-4">
                        {invoices.map(invoice => (
                            <Card key={invoice.invoiceNumber} className="flex justify-between items-center p-3">
                                <div>
                                    <p className="font-semibold">{invoice.invoiceNumber}</p>
                                    <p className="text-xs text-gray-500">Émis le: {new Date(invoice.dateEmission).toLocaleDateString('fr-FR')}</p>
                                    <p className="text-xs text-gray-400">Réf. Montages: {invoice.montagesReferences ? invoice.montagesReferences.join(', ') : 'N/A'}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-extrabold text-xl">{invoice.totalTTC.toFixed(2)} € TTC</span>
                                    <Button size="sm" variant="outline" onClick={() => window.open(invoice.pdfUrl || '#', '_blank')}>
                                        <FileText className="w-4 h-4" />
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};


const AdminDashboard = () => {
  const navigate = useNavigate();
  const [montages, setMontages] = useState<Montage[]>([]);
  const [clients, setClients] = useState<Client[]>([]); 
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [newClient, setNewClient] = useState("");
  const [newRef, setNewRef] = useState("");
  const [newFrame, setNewFrame] = useState("");
  const [newCategory, setNewCategory] = useState("Cerclé");
  const [newGlassType, setNewGlassType] = useState<string[]>([]);
  const [newUrgency, setNewUrgency] = useState("Standard");
  const [newDiamondCutType, setNewDiamondCutType] = useState("Standard");
  const [newEngravingCount, setNewEngravingCount] = useState(0);
  const [newShapeChange, setNewShapeChange] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // États de la Modale de Facture (Génération PDF)
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [currentClientToInvoice, setCurrentClientToInvoice] = useState<Client | null>(null);
  const [montagesToInvoice, setMontagesToInvoice] = useState<Montage[]>([]);
  
  // États pour la MODALE LISTE DES FACTURES
  const [isClientInvoicesModalOpen, setIsClientInvoicesModalOpen] = useState(false);
  const [currentClientInvoices, setCurrentClientInvoices] = useState<FactureData[]>([]); 
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  // Nouvel état pour stocker toutes les factures (pour la liste Admin)
  const [allInvoices, setAllInvoices] = useState<FactureData[]>([]);


  // Constantes de choix
  const URGENCY_OPTIONS = ['Standard', 'Urgent -48H', 'Urgent -24H', 'Urgent -3H'];
  const DIAMONDCUT_OPTIONS = ['Standard', 'Facette Lisse', 'Diamond Ice', 'Facette Twinkle'];
  const GLASS_OPTIONS = ['Verre 4 saisons', 'Verre Dégradé', 'Verre de stock'];

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) { navigate("/"); return; }
    try {
        const user = JSON.parse(userStr);
        if (user.role !== 'admin') { navigate("/dashboardpro"); return; }
        // Fetch Factures Admin
        Promise.all([fetchMontages(), fetchClients(), fetchAllInvoices()]).finally(() => setLoading(false));
    } catch (e) { navigate("/"); }
  }, [navigate]);

  // Logique de Fetch stabilisée
  const fetchMontages = async () => {
    try {
        const res = await fetch("https://atelier4.vercel.app/api/montages?role=admin");
        const data = await res.json();
        if (data.success && Array.isArray(data.montages)) { setMontages(data.montages); } else { setMontages([]); console.error("Échec récupération montages:", data.message); }
    } catch (e) { setMontages([]); console.error("Erreur de connexion API montages:", e); }
  };

  const fetchClients = async () => {
    try {
        const res = await fetch("https://atelier4.vercel.app/api/users");
        const data = await res.json();
        if (data.success && Array.isArray(data.users)) { 
            const clientsWithAddress = data.users.map((c: Client) => ({
                ...c,
                address: c.address || "12 Rue de la Monture", 
                zipCity: c.zipCity || "75001 Optique Ville" 
            }));
            setClients(clientsWithAddress); 
            
            if (data.users.length > 0) {
                 setNewClient(data.users[0]._id);
            }

        } else {
             setClients([]); console.error("Échec récupération clients:", data.message);
        }
    } catch (e) { setClients([]); console.error("Erreur de connexion API clients:", e); }
  };

  const fetchAllInvoices = async () => {
      try {
           const res = await fetch("https://atelier4.vercel.app/api/factures"); // Sans userId pour toutes les factures
           const data = await res.json();
           if (data.success && Array.isArray(data.factures)) {
               setAllInvoices(data.factures.map((f: any) => ({
                   id: f._id,
                   userId: f.userId,
                   clientName: f.clientName,
                   invoiceNumber: f.invoiceNumber,
                   totalTTC: f.totalTTC,
                   dateEmission: f.dateEmission,
                   pdfUrl: f.pdfUrl,
                   montagesReferences: f.montagesReferences
               })));
           } else {
               setAllInvoices([]);
           }
      } catch (e) {
          setAllInvoices([]);
          console.error("Erreur fetch all invoices:", e);
      }
  };
  
  // Fonction de callback après la publication de la facture
  const handleInvoicePublished = (newInvoice: FactureData) => {
      // Ajout de la nouvelle facture à la liste locale des factures
      setAllInvoices(prev => [newInvoice, ...prev]);
  };
  
  // Fonction pour ouvrir la modale des factures client (au clic sur le client)
    const openClientInvoices = async (client: Client) => {
        // Filtrer les factures stockées localement (allInvoices)
        const clientInvoices = allInvoices.filter(f => f.userId === client._id);
        
        setSelectedClient(client);
        setCurrentClientInvoices(clientInvoices);
        setIsClientInvoicesModalOpen(true);
    };


  // --- Logiques de Formulaire et de Statut ---

  const openCreateDialog = () => { 
      setEditingId(null);
      setNewClient(clients.length > 0 ? clients[0]._id : ""); 
      setNewRef("");
      setNewFrame("");
      setNewCategory("Cerclé");
      setNewGlassType([]);
      setNewUrgency("Standard");
      setNewDiamondCutType("Standard");
      setNewEngravingCount(0);
      setNewShapeChange(false);
      setNewDesc("");
      setIsDialogOpen(true);
  };
  
  const openEditDialog = (m: Montage) => { /* ... */ };

  const handleSaveMontage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient || !newRef || !newFrame) { toast.error("Veuillez remplir les champs obligatoires (Client, Référence, Monture)."); return; }
    setIsSubmitting(true);
    const method = editingId ? "PUT" : "POST";
    const url = editingId ? `https://atelier4.vercel.app/api/montages/${editingId}` : "https://atelier4.vercel.app/api/montages";
    
    const montageData = {
        userId: newClient, 
        reference: newRef,
        frame: newFrame,
        description: newDesc,
        category: newCategory,
        glassType: newGlassType,
        urgency: newUrgency,
        diamondCutType: newDiamondCutType,
        engravingCount: newEngravingCount,
        shapeChange: newShapeChange,
    };

    try {
        const res = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(montageData)
        });
        const data = await res.json();
        if (data.success) {
            toast.success(editingId ? "Dossier modifié !" : "Dossier créé !");
            setIsDialogOpen(false);
            fetchMontages(); 
        } else {
            toast.error(`Échec: ${data.message || "Erreur inconnue."}`);
        }
    } catch (error) { 
        toast.error(`Erreur de connexion API: ${error instanceof Error ? error.message : String(error)}`); 
    }
    finally { setIsSubmitting(false); }
  };
  
  const handleGlassTypeChange = (type: string, checked: boolean) => { /* ... */ };

  const handleStatusChange = async (id: string, newStatus: string) => { 
      const oldMontages = [...montages];
      setMontages(prev => prev.map(m => m._id === id ? { ...m, statut: newStatus } : m));
      try {
          const res = await fetch(`https://atelier4.vercel.app/api/montages/${id}`, { 
              method: 'PUT', 
              headers: { 'Content-Type': 'application/json' }, 
              body: JSON.stringify({ statut: newStatus }) 
          });
          const data = await res.json();
          if (data.success) {
               toast.success(`Statut mis à jour: ${newStatus}`);
          } else {
               setMontages(oldMontages);
               toast.error(`Échec mise à jour du statut: ${data.message || 'Erreur serveur.'}`);
          }
      } catch (e) { 
          setMontages(oldMontages);
          toast.error("Échec de la connexion pour la mise à jour.");
      }
  };
  
  const handleDelete = async (id: string) => { /* ... */ };
  
  const getStatusColor = (statut: string) => { /* ... */ return 'border-gray-500'; };
  
  // FILTRAGE ET GROUPEMENT (Mois > Client)
  const filteredMontages = montages.filter(m => {
    const term = normalize(searchTerm);
    const dateStr = new Date(m.dateReception).toLocaleDateString('fr-FR');
    if (!term) return true;
    return [m.clientName, m.reference, m.frame, m.description, m.category, m.statut, dateStr].some(field => normalize(field).includes(term));
  });

  const groupedByMonthAndShop = filteredMontages.reduce((monthGroups: Record<string, Record<string, Montage[]>>, montage: Montage) => {
    const date = new Date(montage.dateReception);
    const monthYear = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const shop = montage.clientName || "Client Inconnu";

    if (!monthGroups[monthYear]) { monthGroups[monthYear] = {}; }
    if (!monthGroups[monthYear][shop]) { monthGroups[monthYear][shop] = []; }

    monthGroups[monthYear][shop].push(montage);
    return monthGroups;
  }, {} as Record<string, Record<string, Montage[]>>);


  const filteredClients = clients.filter(c => {
    const term = normalize(searchTerm);
    if (!term) return true;
    return [c.nomSociete, c.email, c.siret, c.phone, c.address, c.zipCity].some(field => normalize(field).includes(term));
  });

  const pendingCount = montages.filter(m => m.statut === 'En attente').length;
  const inProgressCount = montages.filter(m => m.statut === 'En cours' || m.statut === 'Reçu').length;

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  
  // Fonction d'aide pour afficher les badges Urgence/DC/Verre
  const renderMontageDetails = (m: Montage) => (
    <div className="flex flex-wrap items-center gap-2">
        {m.urgency !== 'Standard' && <Badge className="bg-red-100 text-red-800 border-red-200">🚨 {m.urgency?.replace('Urgent -', '')}</Badge>}
        {m.diamondCutType !== 'Standard' && <Badge className="bg-blue-100 text-blue-800">{m.diamondCutType}</Badge>}
        {m.engravingCount && m.engravingCount > 0 && <Badge className="bg-purple-100 text-purple-800">✍️ {m.engravingCount} Gravure(s)</Badge>}
        {m.glassType && m.glassType.map(g => <Badge key={g} className="bg-green-100 text-green-800">{g.replace('Verre ', '')}</Badge>)}
        {m.shapeChange && <Badge className="bg-yellow-100 text-yellow-800">📐 Changement Forme</Badge>}
    </div>
  );

  const handleGenerateInvoice = (client: Client, clientMontages: Montage[]) => {
      setCurrentClientToInvoice(client);
      setMontagesToInvoice(clientMontages);
      setIsInvoiceOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-100/50 flex flex-col">
      <Navigation />
      
      <div className="flex-grow pt-24 pb-10 px-6 container mx-auto max-w-7xl">
        {/* --- HEADER & BOUTONS --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div><h1 className="text-3xl font-bold text-gray-900 tracking-tight">Tableau de Bord</h1><p className="text-gray-500">Gestion de l'atelier et suivi de production.</p></div>
            <div className="flex gap-3">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <Button onClick={openCreateDialog} className="bg-black hover:bg-gray-800 text-white gap-2"><PlusCircle className="w-4 h-4" /> Créer un dossier</Button>
                    <DialogContent className="max-w-3xl bg-white">
                        <DialogHeader><DialogTitle>{editingId ? "Modifier le dossier" : "Ajouter un nouveau dossier"}</DialogTitle></DialogHeader>
                        <form onSubmit={handleSaveMontage} className="space-y-4 pt-4">
                            
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2 col-span-3">
                                    <Label>Client</Label>
                                    <Select onValueChange={setNewClient} value={newClient}>
                                        <SelectTrigger className="bg-white"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                                        <SelectContent className="bg-white">{clients.map(c => (<SelectItem key={c._id} value={c._id}>{c.nomSociete}</SelectItem>))}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2"><Label>Référence</Label><Input value={newRef} onChange={e => setNewRef(e.target.value)} required /></div>
                                <div className="space-y-2"><Label>Monture</Label><Input value={newFrame} onChange={e => setNewFrame(e.target.value)} required /></div>
                                <div className="space-y-2">
                                    <Label>Urgence</Label>
                                    <Select onValueChange={setNewUrgency} value={newUrgency}>
                                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                        <SelectContent className="bg-white">{URGENCY_OPTIONS.map(opt => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}</SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <hr />
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Type de Montage</Label>
                                    <Select onValueChange={setNewCategory} value={newCategory}>
                                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                        <SelectContent className="bg-white"><SelectItem value="Cerclé">Cerclé</SelectItem><SelectItem value="Percé">Percé</SelectItem><SelectItem value="Nylor">Nylor</SelectItem></SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Diamond Cut</Label>
                                    <Select onValueChange={setNewDiamondCutType} value={newDiamondCutType}>
                                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                        <SelectContent className="bg-white">{DIAMONDCUT_OPTIONS.map(opt => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Gravure (Qté)</Label>
                                    <Input type="number" min={0} max={2} value={newEngravingCount} onChange={e => setNewEngravingCount(parseInt(e.target.value))} />
                                </div>
                            </div>
                            <hr />
                            <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
                                <Label className="text-lg block font-bold">Options Spécifiques</Label>
                                <div className="flex flex-col gap-3">
                                    <div className="flex gap-6">
                                        {GLASS_OPTIONS.map(opt => (
                                            <div key={opt} className="flex items-center space-x-2"><Checkbox id={`glass-${opt}`} checked={newGlassType.includes(opt)} onCheckedChange={(checked) => handleGlassTypeChange(opt, checked as boolean)} /><label htmlFor={`glass-${opt}`}>{opt}</label></div>
                                        ))}
                                    </div>
                                    <hr className="border-gray-200"/>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="shapeChange" checked={newShapeChange} onCheckedChange={(checked) => setNewShapeChange(checked as boolean)} />
                                        <label htmlFor="shapeChange" className="font-semibold text-gray-700">Changement de Forme</label>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2"><Label>Note / Commentaire</Label><Input value={newDesc} onChange={e => setNewDesc(e.target.value)} /></div>
                            <Button type="submit" className="w-full" disabled={isSubmitting}>{editingId ? "Modifier" : "Créer"}</Button>
                        </form>
                    </DialogContent>
                </Dialog>
                <Button variant="outline" className="bg-white border-red-200 text-red-600 hover:bg-red-50" onClick={() => { localStorage.clear(); navigate("/"); }}>Déconnexion</Button>
            </div>
        </div>

        {/* --- KPI et RECHERCHE --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="shadow-sm border-l-4 border-l-red-500"><CardHeader><CardTitle>À traiter</CardTitle></CardHeader><CardContent><div className="2xl font-bold">{pendingCount}</div></CardContent></Card>
            <Card className="shadow-sm border-l-4 border-l-blue-500"><CardHeader><CardTitle>En Production</CardTitle></CardHeader><CardContent><div className="2xl font-bold">{inProgressCount}</div></CardContent></Card>
            <Card className="shadow-sm border-l-4 border-l-green-500"><CardHeader><CardTitle>Clients</CardTitle></CardHeader><CardContent><div className="2xl font-bold">{clients.length}</div></CardContent></Card>
        </div>
        <div className="mb-6 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input className="pl-10 bg-white shadow-sm h-12" placeholder="Rechercher par référence, client, date, monture, statut..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>

        {/* --- ONGLET ATELIER/CLIENTS --- */}
        <Tabs defaultValue="atelier" className="space-y-6">
            <TabsList className="bg-white p-1 shadow-sm border h-auto w-full md:w-auto">
                <TabsTrigger value="atelier" className="px-6 py-2"><Glasses className="w-4 h-4 mr-2" /> Atelier ({filteredMontages.length})</TabsTrigger>
                <TabsTrigger value="clients" className="px-6 py-2"><Users className="w-4 h-4 mr-2" /> Fiches Clients ({filteredClients.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="atelier">
                <Card className="shadow-md border-0">
                    <CardHeader className="bg-white border-b"><CardTitle>Flux de Production</CardTitle></CardHeader>
                    <CardContent className="p-6 bg-gray-50/50 min-h-[400px]">
                        {Object.keys(groupedByMonthAndShop).length === 0 ? (<div className="text-center py-20 text-gray-400">Aucun montage trouvé.</div>) : (
                            <Accordion type="multiple" className="space-y-4"> {/* Outer Accordion: Month */}
                                {Object.entries(groupedByMonthAndShop)
                                    .sort(([monthA], [monthB]) => monthB.localeCompare(monthA))
                                    .map(([monthName, shopGroups]) => {
                                    const totalMontagesInMonth = Object.values(shopGroups).flat().length;
                                    
                                    return (
                                        <AccordionItem key={monthName} value={monthName} className="bg-white border rounded-lg shadow-xl px-4">
                                            <AccordionTrigger className="hover:no-underline py-4 bg-gray-100/70 hover:bg-gray-100 rounded-lg -mx-4 px-4">
                                                <div className="flex items-center gap-4 w-full pr-4">
                                                    <Calendar className="w-5 h-5 text-blue-600" />
                                                    <span className="text-xl font-extrabold text-gray-900 capitalize">{monthName}</span>
                                                    <span className="text-sm text-gray-500">({totalMontagesInMonth} dossiers)</span>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="pt-4 pb-6 space-y-4">
                                                <Accordion type="multiple" className="space-y-2"> {/* Inner Accordion: Shop */}
                                                    {Object.entries(shopGroups).sort().map(([shopName, items]) => {
                                                        const client = clients.find(c => c.nomSociete === shopName) || { _id: '', nomSociete: shopName, email: '', siret: '', createdAt: '' };
                                                        return (
                                                            <AccordionItem key={shopName} value={shopName} className="bg-white border rounded-lg shadow-sm px-4">
                                                                <AccordionTrigger className="hover:no-underline py-4">
                                                                    <div className="flex items-center gap-4 w-full pr-4">
                                                                        <span className="text-lg font-bold text-gray-800">{shopName}</span>
                                                                        <span className="text-xs text-gray-400">({items.length})</span>
                                                                        
                                                                        {/* BOUTON FACTURE */}
                                                                        <Button 
                                                                            variant="outline" size="sm" className="ml-auto flex items-center gap-1 text-xs bg-black text-white hover:bg-gray-800"
                                                                            onClick={(e) => { e.stopPropagation(); handleGenerateInvoice(client as Client, items); }}
                                                                            disabled={items.length === 0}
                                                                        >
                                                                            <Receipt className="w-4 h-4" /> Facturer
                                                                        </Button>

                                                                        {items.some(i => i.statut === 'En attente') && <Badge variant="destructive">Action requise</Badge>}
                                                                    </div>
                                                                </AccordionTrigger>
                                                                <AccordionContent className="pt-2 pb-6 space-y-3">
                                                                    {items.sort((a, b) => (statusPriority[String(a.statut)] || 99) - (statusPriority[String(b.statut)] || 99)).map((m) => (
                                                                        <div key={m._id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-gray-50 rounded-lg border border-gray-100 gap-4 transition-all hover:bg-white hover:shadow-md">
                                                                            <div className="flex-1">
                                                                                <div className="mb-2">
                                                                                    <span className="font-bold text-xl text-gray-900">{m.reference || "N/A"}</span>
                                                                                    <span className="text-gray-400 mx-2">|</span>
                                                                                    <span className="font-semibold text-gray-700 text-lg">{m.frame || "Monture"}</span>
                                                                                    {m.urgency !== 'Standard' && <Badge className="ml-2 bg-red-100 text-red-800 border-red-200">🚨 {m.urgency}</Badge>}
                                                                                </div>
                                                                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                                                                    <Badge variant="outline">{m.category}</Badge>
                                                                                    {renderMontageDetails(m)}
                                                                                </div>
                                                                                {m.description && <p className="text-sm text-gray-500 italic">"{m.description}"</p>}
                                                                            </div>
                                                                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                                                                <Select defaultValue={m.statut} onValueChange={(val) => handleStatusChange(m._id, val)}>
                                                                                    <SelectTrigger className={`w-[160px] bg-white border-2 ${getStatusColor(m.statut)}`}><SelectValue /></SelectTrigger>
                                                                                    <SelectContent className="bg-white"><SelectItem value="En attente">🔴 En attente</SelectItem><SelectItem value="Reçu">🔵 Reçu</SelectItem><SelectItem value="En cours">🟠 En cours</SelectItem><SelectItem value="Terminé">🟢 Terminé</SelectItem><SelectItem value="Expédié">🟣 Expédié</SelectItem></SelectContent>
                                                                                </Select>
                                                                                <Button variant="outline" size="icon" className="text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => openEditDialog(m)}><Pencil className="w-4 h-4" /></Button>
                                                                                <Button variant="outline" size="icon" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleDelete(m._id)}><Trash2 className="w-4 h-4" /></Button>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </AccordionContent>
                                                            </AccordionItem>
                                                        );
                                                    })}
                                                </Accordion>
                                            </AccordionContent>
                                        </AccordionItem>
                                    );
                                })}
                            </Accordion>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>

            {/* CONTENU CLIENTS : CLIC POUR VOIR LES FACTURES */}
            <TabsContent value="clients">
                <Card className="shadow-md border-0">
                    <CardHeader className="bg-white border-b"><CardTitle>Fiches Clients & Facturation</CardTitle></CardHeader>
                    <CardContent className="p-6">
                        {filteredClients.length === 0 ? <p className="text-center text-gray-500 italic">Aucun client trouvé.</p> : (
                            filteredClients.map(c => (
                                <div key={c._id} 
                                     className="p-4 border-b last:border-0 flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                                     onClick={() => openClientInvoices(c)} 
                                >
                                    <div>
                                        <p className="font-bold text-lg">{c.nomSociete}</p>
                                        <p className="text-sm text-gray-500">{c.email} - {c.siret}</p>
                                        {(c.address || c.zipCity) && (
                                            <p className="text-xs text-gray-700 mt-1">
                                                {c.address}, {c.zipCity}
                                            </p>
                                        )}
                                    </div>
                                    <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50">
                                        <Receipt className="w-4 h-4 mr-2" /> Voir les Factures ({allInvoices.filter(f => f.userId === c._id).length})
                                    </Button>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      </div>

      {/* Rendu du Composant Modale Génération PDF (Facturer ce mois) */}
      {currentClientToInvoice && (
          <InvoiceModal
              client={currentClientToInvoice}
              montages={montagesToInvoice}
              isOpen={isInvoiceOpen}
              onClose={() => setIsInvoiceOpen(false)}
              onInvoicePublished={handleInvoicePublished}
          />
      )}
      
      {/* Rendu du Composant Modale Liste des Factures (Clic sur Client) */}
      <ClientInvoicesModal 
          client={selectedClient} 
          invoices={currentClientInvoices} 
          isOpen={isClientInvoicesModalOpen} 
          onClose={() => setIsClientInvoicesModalOpen(false)}
      />

    </div>
  );
};

export default AdminDashboard;