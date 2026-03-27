import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { LogOut, Moon, Sun, Bell, Lock, User, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const SettingsPage = () => {
  const { user, signOut } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(document.documentElement.classList.contains("dark"));
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Déconnexion réussie");
  };

  const toggleDarkMode = (enabled: boolean) => {
    setDarkMode(enabled);
    document.documentElement.classList.toggle("dark", enabled);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) { toast.error("Le mot de passe doit faire au moins 6 caractères"); return; }
    if (newPassword !== confirmPassword) { toast.error("Les mots de passe ne correspondent pas"); return; }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Mot de passe modifié avec succès !");
      setNewPassword(""); setConfirmPassword(""); setShowPasswordForm(false);
    }
    setChangingPassword(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <h1 className="text-xl font-heading font-bold text-foreground">Paramètres</h1>

        <div className="bg-card rounded-lg border border-border shadow-card p-4 space-y-4">
          <div className="flex items-center gap-3">
            <User size={20} className="text-primary" />
            <h2 className="font-heading font-semibold">Profil</h2>
          </div>
          <div className="space-y-3">
            <div>
              <Label className="text-muted-foreground text-xs">Prénom</Label>
              <p className="text-sm font-medium">{user?.user_metadata?.first_name || "—"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Date de naissance</Label>
              <p className="text-sm font-medium">{user?.user_metadata?.birth_date || "—"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Email</Label>
              <p className="text-sm font-medium">{user?.email || "—"}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border shadow-card p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Lock size={20} className="text-primary" />
            <h2 className="font-heading font-semibold">Mot de passe</h2>
          </div>
          {!showPasswordForm ? (
            <Button variant="outline" size="sm" onClick={() => setShowPasswordForm(true)}>
              Changer le mot de passe
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nouveau mot de passe"
                />
                <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <Input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmer le mot de passe"
              />
              <div className="flex gap-2">
                <Button onClick={handleChangePassword} disabled={changingPassword} className="bg-gradient-primary">
                  {changingPassword ? "..." : "Confirmer"}
                </Button>
                <Button variant="outline" onClick={() => { setShowPasswordForm(false); setNewPassword(""); setConfirmPassword(""); }}>
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-card rounded-lg border border-border shadow-card p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Bell size={20} className="text-primary" />
            <h2 className="font-heading font-semibold">Notifications</h2>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">Activer les notifications</span>
            <Switch checked={notifications} onCheckedChange={setNotifications} />
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border shadow-card p-4 space-y-4">
          <div className="flex items-center gap-3">
            {darkMode ? <Moon size={20} className="text-primary" /> : <Sun size={20} className="text-primary" />}
            <h2 className="font-heading font-semibold">Apparence</h2>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">Mode sombre</span>
            <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
          </div>
        </div>

        <Separator />

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full">
              <LogOut size={18} className="mr-2" />Se déconnecter
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la déconnexion</AlertDialogTitle>
              <AlertDialogDescription>Êtes-vous sûr(e) de vouloir vous déconnecter de Paus'études ?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleSignOut}>Se déconnecter</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default SettingsPage;
