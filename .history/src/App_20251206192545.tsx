import { Toaster } from "@/components/ui/toaster";
import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom"; // ✅ NOUVEL IMPORT

import Index from "@/pages/Index"; // Votre page principale actuelle (Accueil/Collection/Contact...)
// ✅ NOUVEAUX IMPORTS DES FUTURES PAGES
import LoginSignupPage from "@/pages/LoginSignupPage";
import Navigation from "@/components/Navigation"; // ✅ Importez Navigation pour l'afficher partout

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <TooltipProvider>
          <BrowserRouter> {/* ✅ 1. ON ENVELOPPE TOUT DANS BROWSERROUTER */}
            {/* 2. ON PLACE LA NAVIGATION HORS DES ROUTES POUR QU'ELLE SOIT VISIBLE SUR TOUTES LES PAGES */}
            <Navigation /> 
            
            <main className="pt-20"> {/* Ajout d'un padding pour que le contenu ne soit pas masqué par le header fixe */}
              <Routes> {/* 3. ON DÉFINIT LES ROUTES */}
                
                {/* Route principale : affiche toutes les sections par défaut */}
                <Route path="/" element={<Index />} />

                {/* ✅ Route pour la connexion / inscription */}
                <Route path="/login-signup" element={<LoginSignupPage />} />

                {/* ✅ Route pour la page "Comment ça marche" */}
               

                {/* Vous pouvez ajouter d'autres routes ici, comme la route '/espace-pro' */}
                
              </Routes>
            </main>

          </BrowserRouter>
          <Toaster />
        </TooltipProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
};

export default App;