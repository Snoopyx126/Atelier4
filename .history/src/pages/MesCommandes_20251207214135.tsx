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
import { Search } from "lucide-react"; // ✅ Import de l'icône loupe

interface UserData {
  id: string;      
  nomSociete: string;
}

interface Montage {
  _id: string;
  reference: string;
  frame: string;
  description: string;
  category: string;
  options: string[];
  statut: string;
  dateReception: string;
}

const MesCommandes = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [montages, setMontages] = useState<Montage[]>([]); 
  const [loading, setLoading] = useState(true);
  
  // ✅ État Recherche
  const [searchTerm, setSearchTerm] = useState("");

  // États Formulaire
  const [reference, setReference] = useState("");
  const [frame, setFrame] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Cerclé");
  const [options, setOptions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (checked) setOptions([...options, option]);
    else setOptions(options.filter((o) => o !== option));
  };

  const handleAddMontage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!reference || !frame) { toast.error("La référence et la monture sont obligatoires."); return; }

    setIsSubmitting(true);
    try {
        const res = await fetch("https://atelier4.vercel.app/api/montages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user.id, reference, frame, description, category, options })
        });
        const data = await res.json();
        if (data.success) {
            toast.success("Dossier créé avec succès !");
            setReference(""); setFrame(""); setDescription(""); setCategory("Cerclé"); setOptions([]);
            fetchMontages(user.id); 
        }
    } catch (error) { toast.error("Erreur lors de l'envoi."); } 
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

  // ✅ FILTRAGE DES COMMANDES
  const filteredMontages = montages.filter(m => 
    (m.reference?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (m.frame?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (m.description?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (m.category?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  const groupedMontages = filteredMontages.reduce((groups, montage) => {
    const date = new Date(montage.dateReception);
    const monthYear = date.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
    if (!groups[monthYear]) groups[monthYear] = [];
    groups[monthYear].push(montage);
    return groups;
  }, {} as Record<string, Montage[]>);

  if (loading) return <div className="p-10 text-center">Chargement...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />
      
      <div className="flex-grow pt-24 pb-12 px-4 max-w-5xl mx-auto w-full">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-playfair font-bold text-gray-900">Mes Commandes</h1>
            <Button variant="outline" onClick={() => navigate("/dashboardpro")}>
                ← Retour au Dashboard
            </Button>
        </div>

        <Card className="mb-10 shadow-md border-blue-100">
            <CardHeader>
            <CardTitle>Nouveau dossier de montage</CardTitle>
            <CardDescription>Remplissez les détails du dossier envoyé.</CardDescription>
            </CardHeader>
            <CardContent>
            <form onSubmit={handleAddMontage} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="space-y-2">
                        <Label>Référence Client *</Label>
                        <Input placeholder="Ex: Ref 12345 / Mr Dupont" value={reference} onChange={(e) => setReference(e.target.value)} required className="bg-white" />
                    </div>
                    <div className="space-y-2">
                        <Label>Monture envoyée *</Label>
                        <Input placeholder="Ex: Cartier Panthère Or" value={frame} onChange={(e) => setFrame(e.target.value)} required className="bg-white" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>Type de Montage</Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Cerclé">Cerclé</SelectItem>
                                <SelectItem value="Percé">Percé</SelectItem>
                                <SelectItem value="Nylor">Nylor</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-3">
                        <Label>Options</Label>
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center space-x-2"><Checkbox id="gravure" checked={options.includes("Gravure")} onCheckedChange={(c) => handleOptionChange("Gravure", c as boolean)} /><label htmlFor="gravure">Gravure</label></div>
                            <div className="flex items-center space-x-2"><Checkbox id="diamond" checked={options.includes("Diamond Cut")} onCheckedChange={(c) => handleOptionChange("Diamond Cut", c as boolean)} /><label htmlFor="diamond">Diamond Cut</label></div>
                        </div>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Instructions (Facultatif)</Label>
                    <Input placeholder="Précisions..." value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">{isSubmitting ? "Envoi..." : "Valider le dossier"}</Button>
            </form>
            </CardContent>
        </Card>

        {/* ✅ BARRE DE RECHERCHE */}
        <div className="mb-6 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input 
                className="pl-10 bg-white shadow-sm border-gray-300 h-12" 
                placeholder="Rechercher une commande (Ref, Monture)..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>

        <div className="space-y-6">
            <h2 className="text-2xl font-playfair font-bold text-gray-800 mb-4">Historique</h2>
            {Object.keys(groupedMontages).length === 0 ? <p className="text-center text-gray-500">Aucun dossier trouvé.</p> : (
                <Accordion type="single" collapsible className="w-full space-y-2">
                    {Object.entries(groupedMontages).map(([month, items]) => (
                        <AccordionItem key={month} value={month} className="bg-white border rounded-lg px-4 shadow-sm">
                            <AccordionTrigger className="text-lg font-medium capitalize hover:no-underline">
                                {month} <span className="ml-2 text-sm text-gray-400">({items.length})</span>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-4">
                                <div className="space-y-3">
                                    {items.map((montage) => (
                                        <div key={montage._id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-gray-50 rounded-md border border-gray-100 gap-4">
                                            <div>
                                                <div className="mb-1">
                                                    <span className="font-bold text-gray-900 text-lg">{montage.reference || "Sans Ref"}</span>
                                                    <span className="text-gray-500 mx-2">-</span>
                                                    <span className="font-semibold text-gray-700">{montage.frame || "Monture"}</span>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                                    <Badge variant="outline" className="text-xs">{montage.category}</Badge>
                                                    {montage.options && montage.options.map(opt => <span key={opt} className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full border border-yellow-100">{opt}</span>)}
                                                </div>
                                                {montage.description && <p className="text-sm text-gray-500 italic mb-1">"{montage.description}"</p>}
                                                <p className="text-xs text-gray-400">Envoyé le {new Date(montage.dateReception).toLocaleDateString('fr-FR')}</p>
                                            </div>
                                            <Badge className={`${getStatusColor(montage.statut)} text-white border-none`}>{montage.statut}</Badge>
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