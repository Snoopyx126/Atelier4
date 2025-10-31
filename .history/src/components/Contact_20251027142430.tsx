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
            Commencez votre voyage
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4">
          Prêt à créer la paire idéale ? Prenez rendez-vous avec nos experts en lunettes et concrétisons votre vision. </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 max-w-6xl mx-auto">
          {/* Contact Form */}
          <Card className="shadow-luxury animate-scale-in">
            <CardContent className="p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2 text-right">
                    שם מלא *
                  </label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="השם המלא שלך"
                    required
                    className="w-full text-right"
                    dir="rtl"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2 text-right">
                    דוא"ל *
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
                    טלפון
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
                    הודעה *
                  </label>
                  <Textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="ספרו לנו על העדפות הסגנון שלכם ומה אתם מחפשים..."
                    required
                    className="w-full min-h-[150px] text-right"
                    dir="rtl"
                  />
                </div>

                <Button 
                  type="submit" 
                  variant="luxury" 
                  size="lg" 
                  className="w-full text-base sm:text-lg min-h-[48px] touch-manipulation"
                >
                  קביעת פגישת ייעוץ
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <div className="space-y-6 sm:space-y-8 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
            <div className="text-right">
              <h3 className="font-playfair text-2xl sm:text-3xl font-semibold text-foreground mb-4 sm:mb-8">
                צרו קשר
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-6 sm:mb-8">
                מומחי המשקפיים שלנו כאן כדי לעזור לכם למצוא או ליצור את המסגרות המושלמות.
                בין אם אתם מחפשים משהו נועז ובולט או עדין ומתוחכם,
                אנו נדריך אתכם בכל שלב של תהליך ההתאמה האישית.
              </p>
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
                    Opticaltzion@gmail.com
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
                    href="https://wa.me/33782548362" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm sm:text-base text-muted-foreground hover:text-accent transition-colors inline-flex items-center gap-2 min-h-[44px]"
                  >
                    ‭+33 7 82 54 83 62‬
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
                    תל אביב, ישראל
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 p-6 rounded-lg bg-secondary/50 border border-border text-right">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">שעות פגישות ייעוץ:</strong><br />
                ראשון - חמישי: 10:00 - 18:00<br/>
                שבת: לפי תיאום מראש בלבד
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
