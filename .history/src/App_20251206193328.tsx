import { Toaster } from "@/components/ui/toaster";
import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "@/pages/Index";
import EspacePro from "@/pages/espacepro"

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider> {/* ✅ Ici, on fournit le contexte pour les toasts */}
        <TooltipProvider>
          <BrowserRouter>
            <Routes>
              {/* Route pour la page d'accueil */}
              <Route path="/" element={<Index />} />
              {/* Route pour l'Espace Pro (page de connexion) */}
              <Route path="/espace-pro" element={<EspacePro />} />
            </Routes>
          </BrowserRouter>
          <Index />
          <Toaster /> {/* ✅ Ce composant peut maintenant utiliser ToastViewport */}
        </TooltipProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
};

export default App;
