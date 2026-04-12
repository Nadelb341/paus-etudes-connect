import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, LogIn, KeyRound } from "lucide-react";
import { toast } from "sonner";

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

const LoginForm = ({ onSwitchToRegister }: LoginFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      if (error.message.includes("Email not confirmed")) {
        toast.error("Vous devez d'abord confirmer votre adresse email. Vérifiez votre boîte mail.", { duration: 6000 });
        setEmailNotConfirmed(true);
      } else {
        toast.error("Identifiants incorrects. Veuillez réessayer.");
        setEmailNotConfirmed(false);
      }
    }
  };

  const handleResendConfirmation = async () => {
    if (!email.trim()) {
      toast.error("Veuillez saisir votre email");
      return;
    }
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Email de confirmation renvoyé !");
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast.error("Veuillez d'abord saisir votre email");
      return;
    }
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotLoading(false);
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Un lien de réinitialisation a été envoyé à votre email !");
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          type="email"
          placeholder="votre@email.fr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="login-password">Mot de passe</Label>
        <div className="relative">
          <Input
            id="login-password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90 transition-opacity" disabled={loading}>
        <LogIn size={18} className="mr-2" />
        {loading ? "Connexion..." : "Se connecter"}
      </Button>

      {emailNotConfirmed && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 space-y-2">
          <p>Votre adresse email n'est pas encore confirmée.</p>
          <button
            type="button"
            onClick={handleResendConfirmation}
            className="text-amber-700 font-medium underline hover:text-amber-900"
          >
            Renvoyer l'email de confirmation
          </button>
        </div>
      )}

      <div className="text-center">
        <button
          type="button"
          onClick={handleForgotPassword}
          className="text-sm text-primary hover:underline font-medium inline-flex items-center gap-1"
        >
          <KeyRound size={14} />
          Mot de passe oublié ?
        </button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Pas encore inscrit ?{" "}
        <button type="button" onClick={onSwitchToRegister} className="text-primary hover:underline font-medium">
          Créer un compte
        </button>
      </p>
    </form>
  );
};

export default LoginForm;
