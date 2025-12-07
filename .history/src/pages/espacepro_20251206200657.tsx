import React from 'react';
import { Link } from "react-router-dom"; // 👈 Ajoutez cet import
// Vous utiliserez probablement votre composant Button et des inputs stylisés ici
// import { Button } from "@/components/ui/button"; 
// import { Input } from "@/components/ui/input"; 

const LoginSignupPage = () => {
  return (
    <div className="container mx-auto py-20 px-4 sm:px-6 lg:px-8 max-w-md">
      <h1 className="text-3xl font-bold mb-8 text-center">
        Connexion ou Création de Compte
      </h1>

      <div className="bg-white p-8 rounded-lg shadow-xl">
        {/* Formulaire de Connexion */}
        <h2 className="text-2xl font-semibold mb-6 border-b pb-2">Connexion</h2>
        <form className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input 
              type="email" 
              id="email" 
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
              placeholder="votre.email@exemple.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Mot de passe</label>
            <input 
              type="password" 
              id="password" 
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
              placeholder="********"
            />
          </div>
          {/* Remplacez par votre composant Button si vous le souhaitez */}
          <button 
            type="submit" 
            className="w-full bg-black text-white py-2 rounded-md hover:bg-gray-800 transition duration-150"
          >
            Se connecter
          </button>
        </form>

        {/* Section Création de Compte */}
        <div className="mt-8 pt-6 border-t text-center">
          <p className="mb-4">
            Vous n'avez pas encore de compte ?
          </p>
          <a href="/signup" 
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Créer un compte
          </a>
        </div>
      </div>
    </div>
  );
};

export default LoginSignupPage;