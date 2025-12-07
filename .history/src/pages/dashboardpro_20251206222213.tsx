// src/pages/DashboardPro.tsx

import React from 'react';

const DashboardPro = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center p-8 bg-white shadow-lg rounded-lg">
        <h1 className="text-3xl font-bold text-green-600 mb-4">
          ✅ Connexion Réussie !
        </h1>
        <p className="text-gray-700">
          Bienvenue dans l'Espace Professionnel. Ceci est la page affichée après une connexion validée.
        </p>
        <p className="mt-4 text-sm text-gray-500">
          (Vous devrez développer cette page pour afficher les informations spécifiques au compte pro).
        </p>
      </div>
    </div>
  );
};

export default DashboardPro;