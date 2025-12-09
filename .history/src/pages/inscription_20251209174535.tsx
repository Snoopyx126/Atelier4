// src/pages/Inscription.tsx

import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom"; 
// Assurez-vous d'avoir bien importé 'toast' si vous utilisez 'sonner'
// import { toast } from "sonner"; 

const Inscription = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    nomSociete: "",
    email: "",
    siret: "",
    password: "",
    confirmPassword: "",
    // ✅ AJOUT DES CHAMPS MANQUANTS POUR LE BACKEND (phone, address, zipCity)
    phone: "", 
    address: "", 
    zipCity: "", 
    pieceJointe: null as File | null,
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFormData(prev => ({ ...prev, pieceJointe: e.target.files![0] }));
    } else {
      setFormData(prev => ({ ...prev, pieceJointe: null }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validation côté client
    if (formData.password !== formData.confirmPassword) {
      alert("Les mots de passe ne correspondent pas.");
      return;
    }
    if (!formData.siret || formData.siret.length !== 14) {
      alert("Veuillez entrer un numéro SIRET valide (14 chiffres).");
      return;
    }
    if (!formData.pieceJointe) {
      alert("Veuillez joindre une copie de votre carte d'identité ou Kbis.");
      return;
    }
    
    setIsLoading(true);

    // 2. Création de l'objet FormData
    const dataToSend = new FormData();
    dataToSend.append("nomSociete", formData.nomSociete);
    dataToSend.append("email", formData.email);
    dataToSend.append("siret", formData.siret);
    dataToSend.append("password", formData.password);
    // ✅ INCLUSION DES NOUVEAUX CHAMPS DANS L'ENVOI
    dataToSend.append("phone", formData.phone);
    dataToSend.append("address", formData.address);
    dataToSend.append("zipCity", formData.zipCity);
    
    if (formData.pieceJointe) {
      // Le nom du champ 'pieceJointe' doit correspondre à celui attendu par multer sur le serveur (index.js: upload.single('pieceJointe'))
      dataToSend.append("pieceJointe", formData.pieceJointe); 
    }
    
    // 3. Appel de l'API Backend
    try {
      // URL tirée du fichier index.js et des autres composants :
      const API_BASE_URL = window.location.hostname === "localhost" 
  ? "http://localhost:3000/api" 
  : "/api";
      
      const response = await fetch(`${API_BASE_URL}/inscription`, { 
        method: "POST",
        // Ne PAS spécifier le Content-Type, le navigateur le gère automatiquement avec FormData
        body: dataToSend, 
      });

      if (!response.ok) {
        // Tente de lire le message d'erreur du backend
        const errorData = await response.json();
        throw new Error(errorData.message || "Échec de l'inscription. Veuillez réessayer.");
      }

      // 4. Succès : Informer l'utilisateur et rediriger
      // Si vous utilisez Sonner (toast), remplacez 'alert' par 'toast.success'
      alert("✅ Demande envoyée ! Vous recevrez un email après vérification.");
      navigate("/espace-pro");
      
    } catch (error: any) {
      console.error("Erreur d'inscription:", error);
      // Si vous utilisez Sonner, remplacez 'alert' par 'toast.error'
      alert(error.message || "Une erreur est survenue lors de l'envoi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navigation />
      
      <div className="flex-grow flex items-center justify-center pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-lg space-y-8">
          
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-playfair font-bold text-gray-900">
              Créer votre Compte Professionnel
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Veuillez remplir le formulaire. Votre compte sera validé après vérification manuelle.
            </p>
          </div>

          <Card className="shadow-lg border-gray-200">
            <CardHeader>
              <CardTitle className="text-center text-xl">Inscription</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6"> 
                
                {/* Infos de base */}
                <div>
                  <Label htmlFor="nomSociete">Nom de la Société *</Label>
                  <Input id="nomSociete" type="text" required onChange={handleChange} />
                </div>
                
                <div>
                  <Label htmlFor="email">Email Professionnel *</Label>
                  <Input id="email" type="email" required onChange={handleChange} /> 
                </div>

                <div>
                  <Label htmlFor="siret">Numéro SIRET (14 chiffres) *</Label>
                  <Input id="siret" type="text" required pattern="\d{14}" title="Le SIRET doit contenir 14 chiffres." onChange={handleChange} />
                </div>

                {/* ✅ Nouveaux champs d'adresse et contact */}
                <div className="pt-2 border-t border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Informations de Contact et Livraison</h3>
                  
                  <div>
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input id="phone" type="tel" onChange={handleChange} />
                  </div>

                  <div>
                    <Label htmlFor="address">Adresse Complète</Label>
                    <Input id="address" type="text" onChange={handleChange} />
                  </div>
                  
                  <div>
                    <Label htmlFor="zipCity">Code Postal et Ville</Label>
                    <Input id="zipCity" type="text" onChange={handleChange} />
                  </div>
                </div>


                {/* Mot de passe */}
                <div className="pt-2 border-t border-gray-100">
                   <h3 className="text-sm font-semibold text-gray-700 mb-3">Mot de passe</h3>
                  <div>
                    <Label htmlFor="password">Mot de passe *</Label>
                    <Input id="password" type="password" required minLength={8} onChange={handleChange} />
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">Confirmer le Mot de passe *</Label>
                    <Input id="confirmPassword" type="password" required onChange={handleChange} />
                  </div>
                </div>

                {/* Pièce jointe (Carte d'identité / Kbis) */}
                <div className="pt-2 border-t border-gray-100">
                  <Label htmlFor="pieceJointe">
                    Carte d'identité / Kbis (Obligatoire) *
                  </Label>
                  <Input 
                    id="pieceJointe" 
                    type="file" 
                    required 
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="cursor-pointer"
                    onChange={handleFileChange} 
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Format : PDF, JPG ou PNG.
                  </p>
                </div>
                
                {/* Bouton avec état de chargement */}
                <Button 
                  className="w-full bg-blue-500 text-white hover:bg-blue-600" 
                  type="submit"
                  disabled={isLoading} 
                >
                  {isLoading ? "Envoi en cours..." : "Soumettre la demande d'ouverture de compte"}
                </Button>
              </form>
            </CardContent>
          </Card>
          
          <div className="text-center">
             <Link to="/espace-pro" className="text-sm text-gray-500 hover:text-black transition-colors">
               ← Déjà un compte ? Connectez-vous ici.
             </Link>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Inscription;