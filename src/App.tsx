import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "@/pages/Index";
import EspacePro from "@/pages/espacepro";
import Inscription from "@/pages/inscription";
import { Toaster } from "@/components/ui/sonner";
import DashboardPro from "./pages/dashboardpro";
import ForgotPassword from "./pages/forgotpassword";
import Profil from "./pages/profil";
import CommentCaMarche from "./pages/commentcamarche";
import AdminDashboard from "./pages/AdminDashboard";
import MesCommandes from "./pages/MesCommandes";
import Configurateur from "./pages/configurateur";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <TooltipProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/espace-pro" element={<EspacePro />} />
              <Route path="/inscription" element={<Inscription />} />
              <Route path="/mot-de-passe-oublie" element={<ForgotPassword />} />
              <Route path="/comment-ca-marche" element={<CommentCaMarche />} />

              {/* Routes protégées — nécessitent d'être connecté */}
              <Route path="/dashboardpro" element={
                <ProtectedRoute>
                  <DashboardPro />
                </ProtectedRoute>
              } />
              <Route path="/profil" element={
                <ProtectedRoute>
                  <Profil />
                </ProtectedRoute>
              } />
              <Route path="/mes-commandes" element={
                <ProtectedRoute>
                  <MesCommandes />
                </ProtectedRoute>
              } />
              <Route path="/configurateur" element={
                <ProtectedRoute>
                  <Configurateur />
                </ProtectedRoute>
              } />

              {/* Route admin — nécessite le rôle admin */}
              <Route path="/admin" element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } />
            </Routes>
          </BrowserRouter>
          {/* Toaster affiché une seule fois, hors du Router */}
          <Toaster />
        </TooltipProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
};

export default App;
