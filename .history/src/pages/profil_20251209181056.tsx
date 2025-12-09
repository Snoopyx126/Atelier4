import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const Profil = () => {
  const [formData, setFormData] = useState({
    id: "",
    nomSociete: "",
    email: "",
    siret: "",
    phone: "", 
    // ✅ AJOUT DES CHAMPS D'ADRESSE
    address: "",
    zipCity: "",
    currentPassword: "",
    newPassword: ""
  });

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      setFormData(prev => ({ 
          ...prev, 
          id: user.id, 
          nomSociete: user.nomSociete, 
          email: user.email, 
          siret: user.siret,
          phone: user.phone || "",
          // ✅ INITIALISATION DES CHAMPS D'ADRESSE
          address: user.address || "",
          zipCity: user.zipCity || ""
      }));
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // ✅ CORRECTION : URL dynamique
      const API_BASE_URL = window.location.hostname === "localhost" 
        ? "http://localhost:3000/api" 
        : "https://atelier4.vercel.app/api";

      const response = await fetch(`${API_BASE_URL}/users/${formData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      // ... suite du code inchangée

      const data = await response.json();
      if (response.ok) {
        // Mettre à jour localStorage avec toutes les données, y compris les nouvelles (address/zipCity)
        localStorage.setItem("user", JSON.stringify(data.user));
        toast.success("Profil mis à jour !");
        setFormData(prev => ({ ...prev, currentPassword: "", newPassword: "" }));
      } else {
        toast.error(data.message || "Erreur de mise à jour");
      }
    } catch (error) { toast.error("Erreur serveur"); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />
      <div className="flex-grow pt-24 pb-12 px-4 max-w-lg mx-auto w-full">
        <Card>
            <CardHeader><CardTitle>Mon Profil</CardTitle></CardHeader>
            <CardContent>
                <form onSubmit={handleUpdate} className="space-y-4">
                    <div>
                        <Label htmlFor="nomSociete">Nom Société</Label>
                        <Input id="nomSociete" value={formData.nomSociete} onChange={handleChange} />
                    </div>
                    <div>
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" value={formData.email} onChange={handleChange} />
                    </div>
                    <div>
                        <Label htmlFor="siret">SIRET</Label>
                        <Input id="siret" value={formData.siret} onChange={handleChange} />
                    </div>
                    <div>
                        <Label htmlFor="phone">Téléphone</Label>
                        <Input id="phone" value={formData.phone} onChange={handleChange} placeholder="06 12 34 56 78" />
                    </div>
                    
                    {/* ✅ CHAMPS D'ADRESSE AJOUTÉS */}
                    <div>
                        <Label htmlFor="address">Adresse complète</Label>
                        <Input id="address" value={formData.address} onChange={handleChange} placeholder="12 Rue des Opticiens" />
                    </div>
                    <div>
                        <Label htmlFor="zipCity">Code Postal et Ville</Label>
                        <Input id="zipCity" value={formData.zipCity} onChange={handleChange} placeholder="75001 Paris" />
                    </div>

                    <hr className="my-4" />
                    <div>
                        <Label htmlFor="currentPassword">Mot de passe actuel (requis pour modifier)</Label>
                        <Input id="currentPassword" type="password" value={formData.currentPassword} onChange={handleChange} />
                    </div>
                    <div>
                        <Label htmlFor="newPassword">Nouveau mot de passe (optionnel)</Label>
                        <Input id="newPassword" type="password" value={formData.newPassword} onChange={handleChange} />
                    </div>
                    <Button type="submit" className="w-full">Mettre à jour</Button>
                </form>
            </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profil;