import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navigation from "@/components/Navigation"; 
import { Button } from "@/components/ui/button"; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; 
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Search, FileText, ShoppingCart, Receipt } from "lucide-react"; 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; 
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf'; 

// Interfaces
interface UserData { 
    id: string; 
    nomSociete: string; 
    address?: string; 
    zipCity?: string; 
    siret: string;    
}

interface Montage { 
    _id: string; reference: string; frame: string; description: string; category: string; 
    glassType?: string[]; urgency?: string; diamondCutType?: string; engravingCount?: number;
    shapeChange?: boolean;
    options: string[]; statut: string; dateReception: string; 
}

interface Facture {
    id: string;
    invoiceNumber: string;
    montageReference: string;
    dateEmission: string;
    totalHT: number; 
    totalTTC: number; 
    invoiceData: any[]; // Données brutes pour regénération
}

const normalize = (text: string | undefined): string => {
    if (!text) return "";
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
};

const MesCommandes = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<UserData | null>(null);
  const [montages, setMontages] = useState<Montage[]>([]); 
  const searchParams = new URLSearchParams(location.search);
  const initialTab = searchParams.get('tab') === 'factures' ? 'factures' : 'commandes';
  const [factures, setFactures] = useState<Facture[]>([]); 
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Formulaire
  const [reference, setReference] = useState("");
  const [frame, setFrame] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Cerclé");
  const [glassType, setGlassType] = useState<string[]>([]);
  const [urgency, setUrgency] = useState("Standard");
  const [diamondCutType, setDiamondCutType] = useState("Standard");
  const [engravingCount, setEngravingCount] = useState(0);
  const [shapeChange, setShapeChange] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const userDataString = localStorage.getItem("user");
    if (userDataString) {
      try {
        const userData: UserData = JSON.parse(userDataString);
        setUser(userData);
        fetchMontages(userData.id);
        fetchFactures(userData.id); 
      } catch (e) { navigate("/"); }
    } else { navigate("/espace-pro"); }
    setLoading(false);
  }, [navigate]);

  const fetchMontages = async (userId: string) => {
    try {
      const response = await fetch(`https://atelier4.vercel.app/api/montages?userId=${userId}`);
      const data = await response.json();
      if (data.success && Array.isArray(data.montages)) setMontages(data.montages);
    } catch (error) { console.error(error); }
  };

  const fetchFactures = async (userId: string) => {
    try {
        const response = await fetch(`https://atelier4.vercel.app/api/factures?userId=${userId}`);
        const data = await response.json();
        if (data.success && Array.isArray(data.factures)) {
            setFactures(data.factures.map((f: any) => ({
                id: f._id,
                invoiceNumber: f.invoiceNumber,
                montageReference: f.montagesReferences?.join(', ') || 'N/A', 
                dateEmission: f.dateEmission,
                totalHT: f.totalHT,
                totalTTC: f.totalTTC,
                invoiceData: f.invoiceData || []
            })));
        }
    } catch (error) { console.error(error); }
  };

  const handleAddMontage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
        const res = await fetch("https://atelier4.vercel.app/api/montages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user.id, reference, frame, description, category, glassType, urgency, diamondCutType, engravingCount, shapeChange })
        });
        const data = await res.json();
        if (data.success) {
            toast.success("Dossier créé !");
            setReference(""); setFrame(""); fetchMontages(user.id); 
        }
    } catch (error) { toast.error("Erreur envoi."); } 
    finally { setIsSubmitting(false); }
  };

  // --- RE-GENERATION PDF CLIENT ---
  const handleDownloadClientInvoice = async (facture: Facture) => {
    if (!user) return;
    toast.loading("Téléchargement...", { id: 'download' });

    // Création d'un élément temporaire caché pour dessiner la facture
    const hiddenDiv = document.createElement('div');
    hiddenDiv.style.width = '800px';
    hiddenDiv.style.padding = '40px';
    hiddenDiv.style.background = 'white';
    hiddenDiv.style.position = 'absolute';
    hiddenDiv.style.top = '-9999px';
    hiddenDiv.style.left = '-9999px';
    document.body.appendChild(hiddenDiv);

    // Structure HTML identique à celle de l'admin pour cohérence visuelle
    hiddenDiv.innerHTML = `
        <div style="font-family: sans-serif; color: #000;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
                <div>
                    <h1 style="font-size: 30px; font-weight: bold; margin-bottom: 10px;">FACTURE</h1>
                    <p style="color: #666;">N° ${facture.invoiceNumber}</p>
                    <p style="color: #999;">Date: ${new Date(facture.dateEmission).toLocaleDateString('fr-FR')}</p>
                </div>
                <div style="text-align: right;">
                    <h2 style="font-size: 18px; font-weight: bold;">L'Atelier des Arts</h2>
                    <p style="color: #666; font-size: 12px;">178 Avenue Daumesnil, 75012 Paris</p>
                    <p style="color: #666; font-size: 12px;">SIRET: 98095501700010</p>
                </div>
            </div>

            <div style="border-top: 2px solid #eee; padding-top: 20px; margin-bottom: 30px;">
                <h3 style="font-size: 12px; font-weight: bold; color: #999; text-transform: uppercase;">Facturé à</h3>
                <p style="font-size: 18px; font-weight: bold;">${user.nomSociete}</p>
                <p style="color: #666;">${user.siret}</p>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <thead>
                    <tr style="border-bottom: 2px solid #000;">
                        <th style="text-align: left; padding: 10px 0;">Référence</th>
                        <th style="text-align: left; padding: 10px 0;">Détails</th>
                        <th style="text-align: right; padding: 10px 0;">Prix HT</th>
                    </tr>
                </thead>
                <tbody>
                    ${facture.invoiceData.map((item: any) => `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 0; vertical-align: top;">${item.reference || '-'}</td>
                            <td style="padding: 10px 0; font-size: 12px; color: #666;">${item.details.join('<br/>')}</td>
                            <td style="padding: 10px 0; text-align: right; font-weight: bold;">${item.price.toFixed(2)} €</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div style="text-align: right;">
                <p style="margin: 5px 0;">Total HT: ${facture.totalHT?.toFixed(2)} €</p>
                <p style="margin: 5px 0;">TVA (20%): ${(facture.totalTTC - (facture.totalHT || 0)).toFixed(2)} €</p>
                <h2 style="font-size: 24px; font-weight: bold; margin-top: 10px;">Net à payer: ${facture.totalTTC.toFixed(2)} €</h2>
            </div>
        </div>
    `;

    try {
        const canvas = await html2canvas(hiddenDiv, { scale: 2 });
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, (canvas.height * 210) / canvas.width);
        pdf.save(`Facture_${facture.invoiceNumber}.pdf`);
        toast.success("Facture téléchargée !", { id: 'download' });
    } catch (err) {
        toast.error("Erreur téléchargement.", { id: 'download' });
    } finally {
        document.body.removeChild(hiddenDiv);
    }
  };

  const filteredMontages = montages.filter(m => normalize(m.reference + m.frame).includes(normalize(searchTerm)));

  if (loading) return <div>Chargement...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />
      <div className="flex-grow pt-24 pb-12 px-4 max-w-5xl mx-auto w-full">
        <h1 className="text-3xl font-bold mb-4">Suivi Client: {user.nomSociete}</h1>
        
        <Tabs defaultValue={initialTab} className="space-y-6">
            <TabsList>
                <TabsTrigger value="commandes">Commandes ({montages.length})</TabsTrigger>
                <TabsTrigger value="factures">Mes Factures ({factures.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="commandes">
                <Card className="mb-6">
                    <CardHeader><CardTitle>Nouveau dossier</CardTitle></CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddMontage} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Input placeholder="Référence" value={reference} onChange={e => setReference(e.target.value)} required />
                                <Input placeholder="Monture" value={frame} onChange={e => setFrame(e.target.value)} required />
                            </div>
                            <Button type="submit" disabled={isSubmitting}>Valider</Button>
                        </form>
                    </CardContent>
                </Card>
                <div className="space-y-4">
                     {filteredMontages.map(m => (
                         <Card key={m._id} className="p-4"><p className="font-bold">{m.reference}</p><p>{m.statut}</p></Card>
                     ))}
                </div>
            </TabsContent>

            <TabsContent value="factures">
                {factures.length === 0 ? <p className="text-center py-10">Aucune facture.</p> : (
                    <div className="space-y-3">
                        {factures.map(f => (
                            <Card key={f.invoiceNumber} className="p-4 flex justify-between items-center shadow-sm">
                                <div>
                                    <p className="font-bold text-lg">{f.invoiceNumber}</p>
                                    <p className="text-sm text-gray-500">{new Date(f.dateEmission).toLocaleDateString()}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-xl font-bold">{f.totalTTC.toFixed(2)} €</span>
                                    {/* BOUTON TÉLÉCHARGER RÉGÉNÉRÉ */}
                                    <Button variant="outline" onClick={() => handleDownloadClientInvoice(f)} className="bg-blue-600 text-white hover:bg-blue-700">
                                        <FileText className="w-4 h-4 mr-2" /> Télécharger
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MesCommandes;