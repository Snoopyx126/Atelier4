import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, MapPin, MessageCircle } from "lucide-react";
import { toast } from "sonner"; // ✅ Indispensable pour la notification

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.message) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    setLoading(true);

    try {
      // ✅ On appelle votre fichier api/send-email.js
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // ✅ C'est ICI que la notification de succès est déclenchée
        toast.success("Message envoyé avec succès ! Nous vous répondrons bientôt.");
        setFormData({ name: "", email: "", phone: "", message: "" });
      } else {
        throw new Error(data.error || "Erreur lors de l'envoi");
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Impossible d'envoyer le message. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <section id="contact" className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* ... (Le haut de votre design reste identique) ... */}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 max-w-6xl mx-auto">
          <Card className="shadow-luxury animate-scale-in">
            <CardContent className="p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* ... (Vos champs Inputs restent identiques) ... */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2 text-left">Nom *</label>
                  <Input id="name" name="name" type="text" value={formData.name} onChange={handleChange} required className="w-full text-left" dir="rtl" />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2 text-left">E-mail *</label>
                  <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required className="w-full" />
                </div>
                <div>
                   <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2 text-left">Téléphone</label>
                   <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} className="w-full text-left" dir="rtl" />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2 text-left">Message *</label>
                  <Textarea id="message" name="message" value={formData.message} onChange={handleChange} required className="w-full min-h-[150px] text-left" dir="rtl" />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={loading}
                  className="w-full text-base sm:text-lg min-h-[48px] touch-manipulation"
                >
                  {loading ? "Envoi en cours..." : "Contactez-nous"}
                </Button>
              </form>
            </CardContent>
          </Card>
          
          {/* ... (La partie infos de contact reste identique) ... */}
          
        </div>
      </div>
    </section>
  );
};

export default Contact;