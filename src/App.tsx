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
import NotFound from "./pages/NotFound";
import NotificationPoller from "./components/NotificationPoller";

const queryClient = new QueryClient();

const AuthRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <Auth />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AdminViewProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <NotificationPoller />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<AuthRedirect />} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/switch-account" element={<ProtectedRoute><SwitchAccount /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AdminViewProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
