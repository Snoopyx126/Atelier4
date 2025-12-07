
import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom"; // ✅ Import des composants de routage
import Index from "@/pages/Index";
import EspacePro from "@/pages/espacepro"; // Assurez-vous d'avoir bien créé ce fichier
import Inscription from "@/pages/inscription";
import { Toaster } from "@/components/ui/sonner";
import DashboardPro from "./pages/dashboardpro";
import ForgotPassword from "./pages/forgotpassword";
import Profil from "./pages/profil";
import CommentCaMarche from "./pages/commentcamarche";
import AdminDashboard from "./pages/AdminDashboard";
import MesCommandes from "./pages/MesCommandes";
import Configurateur from "./pages/configurateur"; // ✅ Import

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
              <Route path="/dashboardpro" element={<DashboardPro />} /> // Page après connexion
              <Route path="/mot-de-passe-oublie" element={<ForgotPassword />} />
              <Route path="/profil" element={<Profil/>} />
              <Route path="/comment-ca-marche" element={<CommentCaMarche />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/mes-commandes" element={<MesCommandes />} />
              <Route path="/configurateur" element={<Configurateur />} /> {/* ✅ Nouvelle route */}
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