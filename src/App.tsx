import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AdminViewProvider } from "@/hooks/useAdminView";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Settings from "./pages/Settings";
import Messages from "./pages/Messages";
import Dashboard from "./pages/Dashboard";
import SwitchAccount from "./pages/SwitchAccount";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import NotificationPoller from "./components/NotificationPoller";
import ErrorBoundary from "./components/shared/ErrorBoundary";

const queryClient = new QueryClient();

const AuthRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <Auth />;
};

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AdminViewProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <NotificationPoller />
          <BrowserRouter>
            {/* 🛟 Un filet d'erreur par page (clé = page : il repart à zéro quand on change de page) */}
            <Routes>
              <Route path="/auth" element={<ErrorBoundary key="/auth" scope="page"><AuthRedirect /></ErrorBoundary>} />
              <Route path="/reset-password" element={<ErrorBoundary key="/reset-password" scope="page"><ResetPassword /></ErrorBoundary>} />
              <Route path="/" element={<ErrorBoundary key="/" scope="page"><ProtectedRoute><Index /></ProtectedRoute></ErrorBoundary>} />
              <Route path="/settings" element={<ErrorBoundary key="/settings" scope="page"><ProtectedRoute><Settings /></ProtectedRoute></ErrorBoundary>} />
              <Route path="/messages" element={<ErrorBoundary key="/messages" scope="page"><ProtectedRoute><Messages /></ProtectedRoute></ErrorBoundary>} />
              <Route path="/dashboard" element={<ErrorBoundary key="/dashboard" scope="page"><ProtectedRoute><Dashboard /></ProtectedRoute></ErrorBoundary>} />
              <Route path="/switch-account" element={<ErrorBoundary key="/switch-account" scope="page"><ProtectedRoute><SwitchAccount /></ProtectedRoute></ErrorBoundary>} />
              <Route path="*" element={<ErrorBoundary key="*" scope="page"><NotFound /></ErrorBoundary>} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AdminViewProvider>
    </AuthProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
