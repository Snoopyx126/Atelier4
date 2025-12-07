import React, { useEffect, useState } from 'react';
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [description, setDescription] = useState("");
  const [statut, setStatut] = useState("Reçu");
  const [montages, setMontages] = useState<any[]>([]);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) { navigate("/"); return; }
    
    const user = JSON.parse(userStr);
    if (user.role !== 'admin') { 
        navigate("/dashboardpro"); 
        return; 
    }

    fetchUsers();
    fetchMontages(user);
  }, [navigate]);

  const fetchUsers = async () => {
    try {
        const res = await fetch("https://atelier4.vercel.app/api/users");
        const data = await res.json();
        if (data.success) setUsers(data.users);
    } catch (e) { console.error(e); }
  };

  const fetchMontages = async (user: any) => {
    try {
        const res = await fetch(`https://atelier4.vercel.app/api/montages?userId=${user.id}&role=${user.role}`);
        const data = await res.json();
        if (data.success) setMontages(data.montages);
    } catch (e) { console.error(e); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !description) return alert("Veuillez sélectionner un client et entrer une description.");

    try {
        const res = await fetch("https://atelier4.vercel.app/api/montages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: selectedUser, description, statut })
        });

        if (res.ok) {
            alert("✅ Montage ajouté !");
            setDescription("");
            const user = JSON.parse(localStorage.getItem("user") || "{}");
            fetchMontages(user);
        }
    } catch (error) {
        alert("Erreur lors de l'ajout.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />
      
      <div className="flex-grow pt-24 px-4 container mx-auto max-w-5xl">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-playfair font-bold text-gray-900">Administration Atelier</h1>
            <Button variant="destructive" onClick={() => { localStorage.clear(); navigate("/"); }}>Déconnexion</Button>
        </div>

        <Card className="mb-10 shadow-lg border-accent/20">
            <CardHeader className="bg-gray-100/50">
                <CardTitle>Nouveau Montage Client</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label>Sélectionner le Client</Label>
                        <Select onValueChange={setSelectedUser}>
                            <SelectTrigger>
                                <SelectValue placeholder="Choisir un opticien..." />
                            </SelectTrigger>
                            <SelectContent>
                                {users.map((u) => (
                                    <SelectItem key={u._id} value={u._id}>
                                        {u.nomSociete} <span className="text-gray-400 text-xs ml-2">({u.siret})</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Statut Initial</Label>
                        <Select value={statut} onValueChange={setStatut}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Reçu">Reçu (En attente)</SelectItem>
                                <SelectItem value="En cours">En cours de montage</SelectItem>
                                <SelectItem value="Terminé">Terminé</SelectItem>
                                <SelectItem value="Expédié">Expédié</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <Label>Détails du montage</Label>
                        <Input 
                            placeholder="Ex: Monture Cartier Bois - Verres Varilux Physio..." 
                            value={description} 
                            onChange={e => setDescription(e.target.value)} 
                        />
                    </div>

                    <div className="md:col-span-2">
                        <Button type="submit" className="w-full bg-black text-white hover:bg-gray-800">
                            + Ajouter le dossier
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>

        <h2 className="text-2xl font-bold mb-6 font-playfair">Historique Global des Montages</h2>
        <div className="grid gap-4">
            {montages.length === 0 && <p className="text-gray-500 italic">Aucun montage enregistré.</p>}
            
            {montages.map((m) => (
                <Card key={m._id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h3 className="font-bold text-lg text-accent">{m.clientName}</h3>
                            <p className="text-gray-700 font-medium">{m.description}</p>
                            <p className="text-xs text-gray-400 mt-1">
                                Reçu le {new Date(m.dateReception).toLocaleDateString()}
                            </p>
                        </div>
                        
                        <div className={`px-4 py-2 rounded-full text-sm font-semibold border
                            ${m.statut === 'Reçu' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                            ${m.statut === 'En cours' ? 'bg-orange-50 text-orange-700 border-orange-200' : ''}
                            ${m.statut === 'Terminé' ? 'bg-green-50 text-green-700 border-green-200' : ''}
                            ${m.statut === 'Expédié' ? 'bg-gray-100 text-gray-700 border-gray-300' : ''}
                        `}>
                            {m.statut}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;