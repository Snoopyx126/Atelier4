import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, MapPin } from "lucide-react";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name || !formData.email || !formData.message) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    // Here you would typically send the form data to your backend
    toast.success("Merci ! Nous vous contacterons prochainement pour planifier une consultation.");
    
    // Reset form
    setFormData({
      name: "",
      email: "",
      phone: "",
      message: "",
    });
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
        <div className="text-center mb-12 sm:mb-16 animate-fade-in-up">
          <h2 className="font-playfair text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 sm:mb-6 leading-tight">
            Donnez vie à votre regard
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4">
          Rencontrez nos experts et imaginez une monture façonnée pour refléter votre style et votre personnalité. </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 max-w-6xl mx-auto">
          {/* Contact Form */}
          <Card className="shadow-luxury animate-scale-in">
            <CardContent className="p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2 text-right">
                    Nom *
                  </label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Votre nom complet"
                    required
                    className="w-full text-right"
                    dir="rtl"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2 text-right">
                  E-mail *
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="@email.com"
                    required
                    className="w-full"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2 text-right">
                    Téléphone
                  </label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="050-123-4567"
                    className="w-full text-right"
                    dir="rtl"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2 text-right">
                    Message *
                  </label>
                  <Textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Parlez-nous de vos préférences de style et de ce que vous recherchez..."
                    required
                    className="w-full min-h-[150px] text-right"
                    dir="rtl"
                  />
                </div>

                <Button 
                  type="submit" 
                  variant="primary" 
                  size="lg" 
                  className="w-full text-base sm:text-lg min-h-[48px] touch-manipulation"
                >
                  Planifier une consultation
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <div className="space-y-6 sm:space-y-8 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
            <div className="text-right">
              <h3 className="font-playfair text-2xl sm:text-3xl font-semibold text-foreground mb-4 sm:mb-8">
                Contactez-nous
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-6 sm:mb-8">
              Nos experts en lunettes sont là pour vous aider à trouver ou à créer la monture idéale.
Que vous recherchiez une monture audacieuse et percutante ou subtile et sophistiquée,
nous vous accompagnerons à chaque étape du processus de personnalisation. </p>
            </div>

            <div className="space-y-5 sm:space-y-6">
              <div className="flex items-start gap-3 sm:gap-4 flex-row-reverse text-right">
                <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-foreground mb-1 text-sm sm:text-base">דוא"ל</h4>
                  <a 
                    href="mailto:Opticaltzion@gmail.com" 
                    className="text-sm sm:text-base text-muted-foreground hover:text-accent transition-colors break-all"
                  >
                    Atelierdesarts.12@gmail.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-4 flex-row-reverse text-right">
                <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1 text-sm sm:text-base">ווטסאפ</h4>
                  <a 
                    href="https://wa.me/+33698409687" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm sm:text-base text-muted-foreground hover:text-accent transition-colors inline-flex items-center gap-2 min-h-[44px]"
                  >
                    +33 6 98 40 96 87
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-4 flex-row-reverse text-right">
                <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1 text-sm sm:text-base">מיקום</h4>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    178 avenue daumesnil
                    75012 Paris
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 p-6 rounded-lg bg-secondary/50 border border-border text-right">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Horaire d'ouverture:</strong><br />
                Lundi-Jeudi: 10:00 - 19:30<br/>
                Vendredi: 10:00 - 15:00<br/>
                Samedi-Dimanche: Fermeture<br/>
                   
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
