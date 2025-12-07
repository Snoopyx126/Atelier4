import React from "react";

const Rdv = () => {
  return (
    <section className="py-20 bg-background text-foreground">
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-4xl font-bold mb-6">Planifiez votre consultation</h1>
        <p className="text-muted-foreground mb-8">
          Choisissez un créneau qui vous convient pour rencontrer nos experts.
        </p>

        <div className="flex justify-center">
          <iframe
            src="https://calendly.com/rubens-leturque/30min" // 👉 Mets ici ton vrai lien Calendly
            width="100%"
            height="700"
            frameBorder="0"
            title="Prendre rendez-vous"
            className="rounded-lg shadow-lg max-w-4xl w-full"
          ></iframe>
        </div>
      </div>
    </section>
  );
};

export default Rdv;
