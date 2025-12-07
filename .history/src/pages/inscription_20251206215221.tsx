// src/pages/Inscription.tsx

import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
// ✅ Importez emailjs pour l'envoi direct depuis le client
import emailjs from "@emailjs/browser"; 
import { toast } from "sonner"; 

const Inscription = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    nomSociete: "",
    email: "",
    siret: "",
    password: "",
    confirmPassword: "",
    pieceJointe: null as File | null,
  });
  
  // Gère la mise à jour des champs de texte
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  // Gère la mise à jour du champ fichier
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFormData(prev => ({ ...prev, pieceJointe: e.target.files![0] }));
    } else {
      setFormData(prev => ({ ...prev, pieceJointe: null }));
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }
    if (!formData.pieceJointe) {
        toast.error("Veuillez joindre la pièce justificative.");
        return;
    }

    setIsLoading(true);

    // 1. Créez un objet de données à envoyer à EmailJS
    const templateParams = {
        nomSociete: formData.nomSociete,
        email: formData.email,
        siret: formData.siret,
        // Ne jamais envoyer de mot de passe par email.
        // password: formData.password, 
        message: `Nouvelle demande d'inscription pour ${formData.nomSociete} (SIRET: ${formData.siret}).`,
        
        // 2. Ajoutez le fichier, EmailJS le convertira automatiquement en pièce jointe
        pieceJointe: formData.pieceJointe,
    };

    try {
        // ⚠️ REMPLACEZ CES CLÉS PAR VOS VRAIES CLÉS EmailJS !
        // J'utilise ici les clés de votre fichier Contact.tsx comme exemple.
        const serviceID = "service_i4qlxmo"; 
        const templateID = "template_gew7gla"; // Il vous faudra un template spécifique pour l'inscription!
        const publicKey = "-OpF_y_4ulqfUh6F-"; 

        const result = await emailjs.send(
            serviceID,
            templateID,
            templateParams,
            publicKey
        );

        console.log("EmailJS Result:", result.text);
        toast.success("✅ Demande envoyée avec succès ! Vous recevrez un email de confirmation.");
        navigate('/espace-pro'); // Redirige vers la page de connexion après succès
    } catch (error) {
        console.error("Erreur d'envoi EmailJS:", error);
        toast.error("❌ Impossible d'envoyer la demande. Vérifiez la taille du fichier.");
    } finally {
        setIsLoading(false);
    }
  };

  
};

export default Inscription;