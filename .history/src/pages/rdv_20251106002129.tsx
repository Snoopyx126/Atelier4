import React from "react";

const Rdv = () => {
  return (
    <section className="py-20 text-center">
      <h1 className="text-4xl font-bold mb-6">Planifiez votre consultation</h1>
      <iframe
        src="https://calendly.com/latelierdesarts/consultation"
        width="100%"
        height="700"
        frameBorder="0"
        title="Calendly"
        className="rounded-lg shadow-lg max-w-4xl w-full mx-auto"
      ></iframe>
    </section>
  );
};

export default Rdv;


