// src/components/ProtectedRoute.tsx
// Composant de garde : redirige vers /espace-pro si l'utilisateur n'est pas connecté
// ou n'a pas le rôle requis.

import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "manager" | "user";
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const userStr = localStorage.getItem("user");

  if (!userStr) {
    return <Navigate to="/espace-pro" replace />;
  }

  try {
    const user = JSON.parse(userStr);

    if (requiredRole === "admin" && user.role !== "admin") {
      return <Navigate to="/dashboardpro" replace />;
    }

    return <>{children}</>;
  } catch {
    localStorage.removeItem("user");
    return <Navigate to="/espace-pro" replace />;
  }
};

export default ProtectedRoute;
