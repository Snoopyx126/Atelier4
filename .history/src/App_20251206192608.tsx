import { Toaster } from "@/components/ui/toaster";
import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Index from "@/pages/Index";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider> {/* ✅ Ici, on fournit le contexte pour les toasts */}
        <TooltipProvider>
          <Index />
          <Toaster /> {/* ✅ Ce composant peut maintenant utiliser ToastViewport */}
        </TooltipProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
};

export default App;
