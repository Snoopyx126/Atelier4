// src/components/Contact.tsx
import { useState } from "react";
import { Mail, MapPin, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { API_URL } from "@/lib/api";

const Contact = () => {
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", objet: "", message: "" });
  const [sending, setSending] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`${API_URL}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        toast.success("Message envoyé avec succès.");
        setFormData({ name: "", email: "", phone: "", objet: "", message: "" });
      } else throw new Error();
    } catch {
      toast.error("Impossible d'envoyer le message. Réessayez.");
    } finally {
      setSending(false);
    }
  };

  const infos = [
    {
      icon: Mail,
      label: "Email",
      value: "Atelierdesarts.12@gmail.com",
      href: "mailto:Atelierdesarts.12@gmail.com",
    },
    {
      icon: MessageCircle,
      label: "Téléphone / WhatsApp",
      value: "+33 6 98 40 96 87",
      href: "https://wa.me/+33698409687",
    },
    {
      icon: MapPin,
      label: "Adresse",
      value: "178 avenue Daumesnil\n75012 Paris",
      href: "https://maps.app.goo.gl/W77h7dbrrhhDnLCEA",
    },
  ];

  return (
    <section id="contact" className="py-16 sm:py-28 bg-[#F7F4EE]">
      <div className="container mx-auto px-6 lg:px-10">

        {/* En-tête */}
        <div className="text-center mb-10 sm:mb-20 animate-fade-up">
          <span className="section-label">Nous contacter</span>
          <h2 className="section-title-lg">
            Donnez vie<br />
            <span className="italic text-[#9A7A45]">à votre regard</span>
          </h2>
          <div className="gold-divider" />
          <p className="font-cormorant text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed italic">
            Rencontrez nos experts et imaginez une monture façonnée pour refléter votre personnalité.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 sm:gap-16 max-w-6xl mx-auto">

          {/* Formulaire — 3 colonnes */}
          <div className="lg:col-span-3 animate-fade-up">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                  <label className="font-sans-dm text-[10px] tracking-[0.2em] uppercase text-muted-foreground block mb-2">
                    Nom *
                  </label>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Votre nom complet"
                    required
                    className="input-premium"
                  />
                </div>
                <div>
                  <label className="font-sans-dm text-[10px] tracking-[0.2em] uppercase text-muted-foreground block mb-2">
                    Email *
                  </label>
                  <input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="votre@email.com"
                    required
                    className="input-premium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                  <label className="font-sans-dm text-[10px] tracking-[0.2em] uppercase text-muted-foreground block mb-2">
                    Téléphone
                  </label>
                  <input
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="06 XX XX XX XX"
                    className="input-premium"
                  />
                </div>
                <div>
                  <label className="font-sans-dm text-[10px] tracking-[0.2em] uppercase text-muted-foreground block mb-2">
                    Objet
                  </label>
                  <input
                    name="objet"
                    value={formData.objet}
                    onChange={handleChange}
                    placeholder="Votre demande"
                    className="input-premium"
                  />
                </div>
              </div>

              <div>
                <label className="font-sans-dm text-[10px] tracking-[0.2em] uppercase text-muted-foreground block mb-2">
                  Message *
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Décrivez votre projet, vos préférences de style..."
                  required
                  rows={5}
                  className="input-premium resize-none"
                />
              </div>

              <button type="submit" disabled={sending} className="btn-dark w-full sm:w-auto">
                {sending ? "Envoi en cours..." : "Envoyer le message"}
              </button>
            </form>
          </div>

          {/* Infos — 2 colonnes */}
          <div className="lg:col-span-2 space-y-10 animate-fade-up delay-200">

            {infos.map((info, i) => {
              const Icon = info.icon;
              return (
                <div key={i} className="flex gap-5">
                  <div className="w-9 h-9 border border-[#C9A96E]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-3.5 h-3.5 text-[#C9A96E]" />
                  </div>
                  <div>
                    <span className="font-sans-dm text-[9px] tracking-[0.2em] uppercase text-[#C9A96E] block mb-1">
                      {info.label}
                    </span>
                    <a
                      href={info.href}
                      target={info.href.startsWith("http") ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      className="font-sans-dm text-sm text-foreground hover:text-[#9A7A45] transition-colors whitespace-pre-line font-light"
                    >
                      {info.value}
                    </a>
                  </div>
                </div>
              );
            })}

            <div className="border-t border-[#EDE8DF] pt-8">
              <span className="font-sans-dm text-[9px] tracking-[0.2em] uppercase text-[#C9A96E] block mb-4">
                Horaires
              </span>
              <div className="space-y-2">
                {[
                  ["Lundi – Jeudi", "10h00 – 19h30"],
                  ["Vendredi", "10h00 – 15h00"],
                  ["Samedi – Dimanche", "Fermé"],
                ].map(([day, hours]) => (
                  <div key={day} className="flex justify-between">
                    <span className="font-sans-dm text-xs text-muted-foreground font-light">{day}</span>
                    <span className="font-sans-dm text-xs text-foreground font-normal">{hours}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
