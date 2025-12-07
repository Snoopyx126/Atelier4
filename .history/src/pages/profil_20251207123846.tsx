import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner"; // Pour les notifications jolies

const customInputClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const Profil = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState("");
  
  const [formData, setFormData] = useState({
    nomSociete: '',
    email: '',
    siret: '',
    currentPassword: '', 
    newPassword: '', // Champ pour nouveau mot de passe
  });
  
  const [originalEmail, setOriginalEmail] = useState(''); 

  useEffect(() => {
    const userDataString = localStorage.getItem("user");
    if (userDataString) {
      try {
        const userData = JSON.parse(userDataString);
        setUserId(userData.id);
        setFormData(prev => ({ 
            ...prev, 
            nomSociete: userData.nomSociete,
            email: userData.email,
            siret: userData.siret,
        }));
        setOriginalEmail(userData.email); 
      } catch (e) {
        navigate("/espace-pro");
      }
    } else {
      navigate("/espace-pro");
    }
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    if (id === 'siret') {
        const filteredValue = value.replace(/[^0-9]/g, '').slice(0, 14);
        setFormData(prev => ({ ...prev, [id]: filteredValue }));
        return;
    }
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async () => {
    // Validations
    if (!formData.nomSociete.trim()) return toast.error("Nom de société requis.");
    if (formData.siret.length !== 14) return toast.error("Le SIRET doit faire 14 chiffres.");
    
    // Si changement email ou mot de passe, on exige le mot de passe actuel
    const sensitiveChange = (formData.email !== originalEmail) || formData.newPassword;
    if (sensitiveChange && !formData.currentPassword) {
        return toast.error("Veuillez saisir votre mot de passe actuel pour valider ces changements.");
    }
    
    setIsLoading(true);

    try {
        // ✅ VRAI APPEL API
        const response = await fetch(`https://atelier4.vercel.app/api/users/${userId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.message || "Erreur lors de la mise à jour");

        // Mise à jour réussie
        toast.success("Profil mis à jour avec succès !");
        
        // On met à jour le localStorage avec les nouvelles vraies données
        localStorage.setItem("user", JSON.stringify(data.user));
        
        // Reset des champs mot de passe
        setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '' }));
        setOriginalEmail(data.user.email);

    } catch (error: any) {
        console.error("Erreur:", error);
        toast.error(error.message);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navigation />
      <div className="flex-grow flex items-center justify-center pt-20 pb-12 px-4">
        <div className="w-full max-w-lg space-y-8">
          <h2 className="mt-6 text-3xl font-playfair font-bold text-gray-900 text-center">Modifier Mon Profil</h2>

          <Card className="shadow-lg border-gray-200">
            <CardHeader><CardTitle className="text-center text-xl">Informations</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              
              <div>
                <Label htmlFor="nomSociete">Nom de la Société</Label>
                <input id="nomSociete" type="text" onChange={handleChange} value={formData.nomSociete} className={customInputClass} />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <input id="email" type="text" onChange={handleChange} value={formData.email} className={customInputClass} />
              </div>
              
              <div>
                <Label htmlFor="siret">Numéro SIRET</Label>
                <input id="siret" type="text" onChange={handleChange} value={formData.siret} maxLength={14} className={customInputClass} />
              </div>

              {/* Section Sécurité */}
              <div className="border-t pt-4 mt-4">
                <h3 className="text-sm font-semibold mb-3 text-gray-700">Sécurité (Optionnel)</h3>
                
                <div className="space-y-3">
                    <div>
                        <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                        <input id="newPassword" type="password" placeholder="Laisser vide si inchangé" onChange={handleChange} value={formData.newPassword} className={customInputClass} />
                    </div>

                    <div>
                        <Label htmlFor="currentPassword" className={formData.email !== originalEmail || formData.newPassword ? "text-red-600 font-bold" : ""}>
                            Mot de passe actuel { (formData.email !== originalEmail || formData.newPassword) ? "(Requis)" : "" }
                        </Label>
                        <input id="currentPassword" type="password" onChange={handleChange} value={formData.currentPassword} className={customInputClass} />
                    </div>
                </div>
              </div>
              
              <div className="pt-2">
                <Button onClick={handleSubmit} className="w-full bg-accent text-white hover:bg-accent/90" disabled={isLoading}>
                  {isLoading ? "Enregistrement..." : "Enregistrer les modifications"}
                </Button>
              </div>

            </CardContent>
          </Card>
          
          <div className="text-center">
             <Link to="/dashboardpro" className="text-sm text-gray-500 hover:text-black transition-colors">← Retour au tableau de bord</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profil;