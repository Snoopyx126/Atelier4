
import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom"; // ✅ Import des composants de routage
import Index from "@/pages/Index";
import EspacePro from "@/pages/espacepro"; // Assurez-vous d'avoir bien créé ce fichier
import Inscription from "@/pages/inscription";
import { Toaster } from "@/components/ui/sonner";
import DashboardPro from "./pages/dashboardpro";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <TooltipProvider>
          {/* ✅ DÉBUT DU ROUTER : Tout composant enfant aura accès aux fonctions de navigation (Link, useNavigate) */}
          <BrowserRouter>
            <Routes>
              {/* 1. Route pour la page d'accueil. L'Index est rendu UNIQUEMENT ici. */}
              <Route path="/" element={<Index />} />
              
              {/* 2. Route pour la page de connexion Espace Pro. */}
              <Route path="/espace-pro" element={<EspacePro />} />

              <Route path="/inscription" element={<Inscription />} />
              <Route path="/dashboard-pro" element={<DashboardPro />} /> // Page après connexion
            </Routes>
          </BrowserRouter>
          {/* ❌ L'appel d'Index a été supprimé ici car il était en double et hors du routeur. */}
          <Toaster />
        </TooltipProvider>
      </ToastProvider>
      <Toaster />
    </QueryClientProvider>
  );
};

export default App;