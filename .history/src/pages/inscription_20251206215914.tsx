// src/pages/Inscription.tsx

import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom"; // ✅ Ajout de useNavigate

// Assurez-vous d'avoir bien importé 'toast' si vous utilisez 'sonner' ou un autre système de notification
// Si vous n'avez pas de toast, vous pouvez utiliser un simple alert()
// import { toast } from "sonner"; 

const Inscription = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false); // ✅ État pour le bouton de chargement

  const [formData, setFormData] = useState({
    nomSociete: "",
    email: "",
    siret: "",
    password: "",
    confirmPassword: "",
    pieceJointe: null as File | null, // Pour le fichier
  });
  
  // Gère la mise à jour des champs de texte
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  // Gère la mise à jour du champ fichier (carte d'identité)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFormData(prev => ({ ...prev, pieceJointe: e.target.files![0] }));
    } else {
      setFormData(prev => ({ ...prev, pieceJointe: null }));
    }
  };

  // ✅ Fonction de soumission asynchrone pour l'API
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validation côté client
    if (formData.password !== formData.confirmPassword) {
      alert("Les mots de passe ne correspondent pas.");
      // toast.error("Les mots de passe ne correspondent pas.");
      return;
    }
    if (!formData.siret || formData.siret.length !== 14) {
      alert("Veuillez entrer un numéro SIRET valide (14 chiffres).");
      // toast.error("Veuillez entrer un numéro SIRET valide (14 chiffres).");
      return;
    }
    if (!formData.pieceJointe) {
      alert("Veuillez joindre une copie de votre carte d'identité ou Kbis.");
      // toast.error("Veuillez joindre une copie de votre carte d'identité ou Kbis.");
      return;
    }
    
    setIsLoading(true);

    // 2. Création de l'objet FormData pour envoyer les données et le fichier
    const dataToSend = new FormData();
    dataToSend.append("nomSociete", formData.nomSociete);
    dataToSend.append("email", formData.email);
    dataToSend.append("siret", formData.siret);
    dataToSend.append("password", formData.password);
    
    // Ajout du fichier
    if (formData.pieceJointe) {
      dataToSend.append("pieceJointe", formData.pieceJointe);
    }
    
    // 3. Appel de l'API Backend
    try {
      const response = await fetch("VOTRE_URL_API/inscription", { // ⚠️ À REMPLACER PAR VOTRE VRAIE URL API
        method: "POST",
        // L'entête Content-Type n'est PAS nécessaire pour FormData.
        body: dataToSend, 
      });

      if (!response.ok) {
        // Gérer les erreurs spécifiques de l'API (ex: email déjà utilisé)
        const errorData = await response.json();
        throw new Error(errorData.message || "Échec de l'inscription. Veuillez réessayer.");
      }

      // 4. Succès : Informer l'utilisateur et rediriger
      alert("✅ Demande envoyée ! Vous recevrez un email après vérification.");
      // toast.success("✅ Demande envoyée ! Vous recevrez un email après vérification.");
      
      navigate("/espace-pro"); // Redirection vers la page de connexion
      
    } catch (error) {
      console.error("Erreur d'inscription:", error);
      alert(error.message || "Une erreur est survenue lors de l'envoi.");
      // toast.error(error.message || "Une erreur est survenue lors de l'envoi.");
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
          </div>

          <Card className="shadow-lg border-gray-200">
            <CardHeader>
              <CardTitle className="text-center text-xl">Inscription</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* IMPORTANT: Retirer l'attribut enctype=\"multipart/form-data\" car FormData le gère */}
              <form onSubmit={handleSubmit} className="space-y-6"> 
                
                {/* Nom de la société */}
                <div>
                  <Label htmlFor="nomSociete">Nom de la Société</Label>
                  <Input id="nomSociete" type="text" required onChange={handleChange} />
                </div>
                
                {/* Email */}
                <div>
                  <Label htmlFor="email">Email Professionnel</Label>
                  <Input id="email" type="email" required onChange={handleChange} />
                </div>

                {/* Numéro SIRET (Obligatoire) */}
                <div>
                  <Label htmlFor="siret">Numéro SIRET (14 chiffres)</Label>
                  {/* Utilisation de pattern pour l'interface utilisateur, la validation complète reste côté serveur */}
                  <Input id="siret" type="text" required title="Le SIRET doit contenir 14 chiffres." onChange={handleChange} />
                </div>

                {/* Mot de passe */}
                <div>
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input id="password" type="password" required onChange={handleChange} />
                </div>

                {/* Confirmation Mot de passe */}
                <div>
                  <Label htmlFor="confirmPassword">Confirmer le Mot de passe</Label>
                  <Input id="confirmPassword" type="password" required onChange={handleChange} />
                </div>

                {/* Pièce jointe (Carte d'identité / Kbis) */}
                <div className="pt-2">
                  <Label htmlFor="pieceJointe">
                    Carte d'identité / Kbis (Obligatoire)
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
                
                {/* ✅ Bouton avec état de chargement */}
                <Button 
                  className="w-full bg-accent text-white hover:bg-accent/90" 
                  type="submit"
                  disabled={isLoading} // Désactive le bouton pendant l'envoi
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