// src/pages/RendezVous.tsx
const RendezVous = () => {
  return (
    <section className="py-20 bg-background text-foreground">
      <div className="container mx-auto text-center">
        <h2 className="text-3xl font-bold mb-6">Planifiez votre consultation</h2>
        <iframe
          src="https://calendly.com/rubens-leturque/30min"
          width="100%"
          height="700"
          frameBorder="0"
          title="Prendre rendez-vous"
        ></iframe>
      </div>
    </section>
  );
};

export default RendezVous;
