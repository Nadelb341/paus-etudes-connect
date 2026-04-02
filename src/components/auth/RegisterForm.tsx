import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { SCHOOL_LEVELS } from "@/lib/constants";

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

const RegisterForm = ({ onSwitchToLogin }: RegisterFormProps) => {
  const [formData, setFormData] = useState({
    firstName: "",
    gender: "",
    level: "",
    birthDate: "",
    email: "",
    password: "",
    confirmPassword: "",
    status: "",
    childName: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    const isParent = formData.status === "parent";
    if (!formData.firstName.trim() || !formData.gender || !formData.email.trim() || !formData.password || !formData.status) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    if (!isParent && (!formData.level || !formData.birthDate)) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          first_name: formData.firstName,
          gender: formData.gender,
          school_level: isParent ? "" : formData.level,
          birth_date: isParent ? null : formData.birthDate || null,
          status: formData.status,
          child_name: isParent ? formData.childName : "",
        },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Inscription réussie ! Votre compte est en attente de validation par l'administrateur.");
      onSwitchToLogin();
    }
  };

  return (
    <form onSubmit={handleRegister} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="reg-firstname">Prénom</Label>
        <Input
          id="reg-firstname"
          placeholder="Votre prénom"
          value={formData.firstName}
          onChange={(e) => updateField("firstName", e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Statut</Label>
          <Select value={formData.status} onValueChange={(v) => updateField("status", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="élève">Élève</SelectItem>
              <SelectItem value="parent">Parent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Genre</Label>
          <Select value={formData.gender} onValueChange={(v) => updateField("gender", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Fille">Fille</SelectItem>
              <SelectItem value="Garçon">Garçon</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formData.status !== "parent" && (
          <div className="space-y-1.5">
            <Label>Niveau scolaire</Label>
            <Select value={formData.level} onValueChange={(v) => updateField("level", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Niveau" />
              </SelectTrigger>
              <SelectContent>
                {SCHOOL_LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>{level}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {formData.status === "parent" && (
        <div className="space-y-1.5">
          <Label htmlFor="reg-childname">Prénom de l'enfant</Label>
          <Input
            id="reg-childname"
            placeholder="Prénom de votre enfant"
            value={formData.childName}
            onChange={(e) => updateField("childName", e.target.value)}
            required
          />
        </div>
      )}

      {formData.status !== "parent" && (
        <div className="space-y-1.5">
          <Label htmlFor="reg-birth">Date de naissance</Label>
          <Input
            id="reg-birth"
            type="date"
            value={formData.birthDate}
            onChange={(e) => updateField("birthDate", e.target.value)}
            required
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="reg-email">Email</Label>
        <Input
          id="reg-email"
          type="email"
          placeholder="votre@email.fr"
          value={formData.email}
          onChange={(e) => updateField("email", e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reg-password">Mot de passe</Label>
        <div className="relative">
          <Input
            id="reg-password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={formData.password}
            onChange={(e) => updateField("password", e.target.value)}
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

      <div className="space-y-1.5">
        <Label htmlFor="reg-confirm">Confirmation du mot de passe</Label>
        <div className="relative">
          <Input
            id="reg-confirm"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="••••••••"
            value={formData.confirmPassword}
            onChange={(e) => updateField("confirmPassword", e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90 transition-opacity" disabled={loading}>
        <UserPlus size={18} className="mr-2" />
        {loading ? "Inscription..." : "Valider l'inscription"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Déjà inscrit ?{" "}
        <button type="button" onClick={onSwitchToLogin} className="text-primary hover:underline font-medium">
          Se connecter
        </button>
      </p>
    </form>
  );
};

export default RegisterForm;
