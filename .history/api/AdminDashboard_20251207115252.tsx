import { useEffect, useState } from 'react';
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [description, setDescription] = useState("");
  const [statut, setStatut] = useState("Reçu");
  const [montages, setMontages] = useState([]);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) { navigate("/"); return; }
    const user = JSON.parse(userStr);
    if (user.role !== 'admin') { navigate("/dashboardpro"); return; } // Sécurité simple

    fetchUsers();
    fetchMontages(user);
  }, []);

  const fetchUsers = async () => {
    const res = await fetch("https://atelier4.vercel.app/api/users");
    const data = await res.json();
    if (data.success) setUsers(data.users);
  };

  const fetchMontages = async (user: any) => {
    const res = await fetch(`https://atelier4.vercel.app/api/montages?userId=${user.id}&role=${user.role}`);
    const data = await res.json();
    if (data.success) setMontages(data.montages);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !description) return alert("Sélectionnez un client et une description");

    const res = await fetch("https://atelier4.vercel.app/api/montages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUser, description, statut })
    });

    if (res.ok) {
        alert("Montage ajouté !");
        setDescription("");
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        fetchMontages(user);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />
      <div className="flex-grow pt-24 px-4 container mx-auto">
        <h1 className="text-3xl font-playfair font-bold mb-8">Administration - Gestion des Montages</h1>

        {/* Formulaire d'ajout */}
        <Card className="mb-8">
            <CardHeader><CardTitle>Ajouter un nouveau montage</CardTitle></CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label>Client</Label>
                        <Select onValueChange={setSelectedUser}>
                            <SelectTrigger><SelectValue placeholder="Sélectionner un client" /></SelectTrigger>
                            <SelectContent>
                                {users.map((u: any) => (
                                    <SelectItem key={u._id} value={u._id}>{u.nomSociete} ({u.email})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Description du montage (ex: Monture Dior, Verres Progressifs)</Label>
                        <Input value={description} onChange={e => setDescription(e.target.value)} />
                    </div>
                    <div>
                        <Label>Statut</Label>
                        <Select value={statut} onValueChange={setStatut}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Reçu">Reçu</SelectItem>
                                <SelectItem value="En cours">En cours</SelectItem>
                                <SelectItem value="Terminé">Terminé</SelectItem>
                                <SelectItem value="Expédié">Expédié</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button type="submit" className="w-full">Ajouter le montage</Button>
                </form>
            </CardContent>
        </Card>

        {/* Liste des montages */}
        <h2 className="text-2xl font-bold mb-4">Historique Global</h2>
        <div className="grid gap-4">
            {montages.map((m: any) => (
                <Card key={m._id}>
                    <CardContent className="p-4 flex justify-between items-center">
                        <div>
                            <p className="font-bold">{m.clientName}</p>
                            <p>{m.description}</p>
                            <p className="text-sm text-gray-500">{new Date(m.dateReception).toLocaleDateString()}</p>
                        </div>
                        <span className="px-3 py-1 bg-black text-white rounded-full text-sm">{m.statut}</span>
                    </CardContent>
                </Card>
            ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;