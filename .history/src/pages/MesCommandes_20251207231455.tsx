import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from "@/components/Navigation"; 
import { Button } from "@/components/ui/button"; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; 
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Search } from "lucide-react";

interface UserData { id: string; nomSociete: string; }
interface Montage { 
    _id: string; reference: string; frame: string; description: string; category: string; 
    glassType?: string[]; urgency?: string; diamondCutType?: string; engravingCount?: number;
    options: string[]; statut: string; dateReception: string; 
}

const MesCommandes = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [montages, setMontages] = useState<Montage[]>([]); 
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Constantes de choix
  const URGENCY_OPTIONS = ['Standard', 'Urgent -48H', 'Urgent -24H', 'Urgent -3H'];
  const DIAMONDCUT_OPTIONS = ['Aucun', 'Facette Lisse', 'Diamond Ice', 'Facette Twinkle'];
  const GLASS_OPTIONS = ['Verre 4 saisons', 'Verre Dégradé', 'Verre de stock'];

  useEffect(() => {
    const userDataString = localStorage.getItem("user");
    if (userDataString) {
      try {
        const userData: UserData = JSON.parse(userDataString);
        setUser(userData);
        fetchMontages(userData.id);
      } catch (e) { navigate("/"); }
    } else { navigate("/espace-pro"); }
    setLoading(false);
  }, [navigate]);

  const fetchMontages = async (userId: string) => {
    try {
      const response = await fetch(`https://atelier4.vercel.app/api/montages?userId=${userId}`);
      const data = await response.json();
      if (data.success) setMontages(data.montages);
    } catch (error) { console.error("Erreur API:", error); }
  };

  const handleOptionChange = (option: string, checked: boolean) => {
    // Note: Utilisation de `options` pour les extras de base si besoin, mais ici on gère les types de verre.
  };

  const handleGlassTypeChange = (type: string, checked: boolean) => {
    setGlassType(prev => checked ? [...prev, type] : prev.filter(t => t !== type));
  };

  const handleAddMontage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!reference || !frame) { toast.error("Champs requis."); return; }

    setIsSubmitting(true);
    try {
        const res = await fetch("https://atelier4.vercel.app/api/montages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                userId: user.id, reference, frame, description, category, 
                glassType, urgency, diamondCutType, engravingCount 
            })
        });
        const data = await res.json();
        if (data.success) {
            toast.success("Dossier créé !");
            setReference(""); setFrame(""); setDescription(""); setCategory("Cerclé"); 
            setGlassType([]); setUrgency("Standard"); setDiamondCutType("Standard"); setEngravingCount(0);
            fetchMontages(user.id); 
        }
    } catch (error) { toast.error("Erreur envoi."); } 
    finally { setIsSubmitting(false); }
  };

  const getStatusColor = (statut: string) => {
    switch(statut) {
        case 'En attente': return 'bg-gray-400';
        case 'Reçu': return 'bg-blue-500';
        case 'En cours': return 'bg-orange-500';
        case 'Terminé': return 'bg-green-500';
        case 'Expédié': return 'bg-purple-500';
        default: return 'bg-gray-500';
    }
  };

  const normalize = (text: string | undefined): string => {
    if (!text) return "";
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  };

  const filteredMontages = montages.filter(m => {
    const term = normalize(searchTerm);
    const dateStr = new Date(m.dateReception).toLocaleDateString('fr-FR');
    if (!term) return true;
    return [
        m.reference, m.frame, m.description, m.category, m.statut, 
        m.urgency, m.diamondCutType, dateStr
    ].some(field => normalize(field).includes(term));
  });

  // ✅ CORRECTION REDUCE : Ajout du 'return groups' explicite
  const groupedMontages = filteredMontages.reduce((groups: Record<string, Montage[]>, montage: Montage) => {
    const date = new Date(montage.dateReception);
    const monthYear = date.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
    if (!groups[monthYear]) groups[monthYear] = [];
    groups[monthYear].push(montage);
    return groups; // <-- Fix: Retourne l'accumulateur
  }, {} as Record<string, Montage[]>);

  if (loading) return <div className="p-10 text-center">Chargement...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />
      <div className="flex-grow pt-24 pb-12 px-4 max-w-5xl mx-auto w-full">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-playfair font-bold text-gray-900">Mes Commandes</h1>
            <Button variant="outline" onClick={() => navigate("/dashboardpro")}>← Retour</Button>
        </div>

        <Card className="mb-10 shadow-md border-blue-100">
            <CardHeader><CardTitle>Nouveau dossier de montage</CardTitle><CardDescription>Spécifications du verre et de la finition.</CardDescription></CardHeader>
            <CardContent>
            <form onSubmit={handleAddMontage} className="space-y-6">
                
                {/* Ligne 1: Référence / Monture / Urgence */}
                <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg bg-gray-50">
                    <div className="space-y-2"><Label>Référence *</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} required className="bg-white" /></div>
                    <div className="space-y-2"><Label>Monture *</Label><Input value={frame} onChange={(e) => setFrame(e.target.value)} required className="bg-white" /></div>
                    <div className="space-y-2">
                        <Label>Urgence</Label>
                        <Select onValueChange={setUrgency} value={urgency}>
                            <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-white">
                                {URGENCY_OPTIONS.map(opt => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Ligne 2: Type Montage / Diamond Cut / Gravure */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label>Type de Montage</Label>
                        <Select onValueChange={setCategory} value={category}>
                            <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-white">
                                <SelectItem value="Cerclé">Cerclé</SelectItem><SelectItem value="Percé">Percé</SelectItem><SelectItem value="Nylor">Nylor</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <div className="space-y-2">
                        <Label>Diamond Cut</Label>
                        <Select onValueChange={setDiamondCutType} value={diamondCutType}>
                            <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-white">
                                {DIAMONDCUT_OPTIONS.map(opt => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <div className="space-y-2">
                        <Label>Gravure (Qté)</Label>
                        <Input type="number" min={0} max={2} value={engravingCount} onChange={e => setEngravingCount(parseInt(e.target.value))} />
                    </div>
                </div>

                {/* Ligne 3: TYPE DE VERRE (Checkboxes) */}
                <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
                    <Label className="block font-bold text-sm">Options Verre</Label>
                    <div className="flex gap-6">
                        {GLASS_OPTIONS.map(opt => (
                            <div key={opt} className="flex items-center space-x-2">
                                <Checkbox 
                                    id={`glass-client-${opt}`} 
                                    checked={glassType.includes(opt)} 
                                    onCheckedChange={(checked) => handleGlassTypeChange(opt, checked as boolean)}
                                />
                                <label htmlFor={`glass-client-${opt}`}>{opt}</label>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="space-y-2"><Label>Instructions (Facultatif)</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
                
                <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">{isSubmitting ? "Envoi..." : "Valider le dossier"}</Button>
            </form>
            </CardContent>
        </Card>

        <div className="mb-6 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input className="pl-10 bg-white shadow-sm h-12" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>

        <div className="space-y-6">
            <h2 className="text-2xl font-playfair font-bold text-gray-800 mb-4">Historique</h2>
            {Object.keys(groupedMontages).length === 0 ? <p className="text-center text-gray-500">Aucun dossier trouvé.</p> : (
                <Accordion type="single" collapsible className="w-full space-y-2">
                    {Object.entries(groupedMontages).map(([month, items]) => (
                        <AccordionItem key={month} value={month} className="bg-white border rounded-lg px-4 shadow-sm">
                            <AccordionTrigger className="text-lg font-medium capitalize hover:no-underline">{month} <span className="ml-2 text-sm text-gray-400">({items.length})</span></AccordionTrigger>
                            <AccordionContent className="pt-2 pb-4">
                                <div className="space-y-3">
                                    {items.map((m) => (
                                        <div key={m._id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-gray-50 rounded-md border border-gray-100 gap-4">
                                            <div>
                                                <div className="mb-1">
                                                    <span className="font-bold text-gray-900 text-lg">{m.reference || "Sans Ref"}</span>
                                                    <span className="text-gray-500 mx-2">-</span>
                                                    <span className="font-semibold text-gray-700">{m.frame || "Monture"}</span>
                                                    {m.urgency !== 'Standard' && <Badge className="ml-2 bg-red-100 text-red-800 border-red-200">🚨 {m.urgency}</Badge>}
                                                </div>
                                                
                                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                                    <Badge variant="outline" className="text-xs">{m.category}</Badge>
                                                    
                                                    {m.diamondCutType !== 'Standard' && <Badge className="bg-blue-100 text-blue-800">{m.diamondCutType}</Badge>}
                                                    {m.engravingCount > 0 && <Badge className="bg-purple-100 text-purple-800">✍️ {m.engravingCount} Gravure(s)</Badge>}
                                                    {m.glassType && m.glassType.map(g => <Badge key={g} className="bg-green-100 text-green-800">{g.replace('Verre ', '')}</Badge>)}
                                                </div>

                                                {m.description && <p className="text-sm text-gray-500 italic mb-1">"{m.description}"</p>}
                                                <p className="text-xs text-gray-400">Envoyé le {new Date(m.dateReception).toLocaleDateString('fr-FR')}</p>
                                            </div>
                                            <Badge className={`${getStatusColor(m.statut)} text-white border-none`}>{m.statut}</Badge>
                                        </div>
                                    ))}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            )}
        </div>
      </div>
    </div>
  );
};

export default MesCommandes;