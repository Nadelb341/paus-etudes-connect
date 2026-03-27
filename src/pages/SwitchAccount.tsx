import { useState, useEffect } from "react";
import AppHeader from "@/components/layout/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, Lock, UserPlus, LogIn } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface FamilyMember {
  member_email: string;
  member_name: string;
  member_user_id: string;
}

const SwitchAccountPage = () => {
  const { user } = useAuth();
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [switchEmail, setSwitchEmail] = useState("");
  const [switchPassword, setSwitchPassword] = useState("");
  const [switching, setSwitching] = useState(false);
  const [addEmail, setAddEmail] = useState("");

  useEffect(() => {
    fetchFamilyMembers();
  }, [user]);

  const fetchFamilyMembers = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("family_accounts")
      .select("*")
      .or(`family_email.eq.${user.email},member_email.eq.${user.email}`);
    if (data) {
      // Filter out current user
      const others = data.filter(f => f.member_email !== user.email);
      setFamilyMembers(others);
    }
  };

  const switchToAccount = async (email: string) => {
    if (!switchPassword) { toast.error("Entrez le mot de passe"); return; }
    setSwitching(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: switchPassword });
      if (error) throw error;
      toast.success("Compte changé !");
      setSwitchPassword("");
      setSwitchEmail("");
    } catch (err: any) {
      toast.error(err.message || "Erreur de connexion");
    }
    setSwitching(false);
  };

  const addFamilyMember = async () => {
    if (!addEmail.trim()) return;
    // Check if user exists in profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, first_name, email")
      .eq("email", addEmail.trim())
      .maybeSingle();
    
    if (!profile) { toast.error("Aucun compte trouvé avec cet email"); return; }
    
    await supabase.from("family_accounts").insert({
      family_email: user?.email || "",
      member_user_id: profile.user_id,
      member_email: profile.email,
      member_name: profile.first_name,
    });
    toast.success("Membre ajouté à la famille !");
    setAddEmail("");
    fetchFamilyMembers();
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-2">
          <Users size={24} className="text-primary" />
          <h1 className="text-xl font-heading font-bold text-foreground">Changer de compte</h1>
        </div>

        <p className="text-sm text-muted-foreground">
          Changez d'élève au sein de la même famille sans quitter l'application.
        </p>

        {/* Add family member */}
        <div className="bg-card rounded-lg border border-border shadow-card p-4 space-y-3">
          <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
            <UserPlus size={16} className="text-primary" />
            Ajouter un membre de la famille
          </h3>
          <div className="flex gap-2">
            <Input value={addEmail} onChange={e => setAddEmail(e.target.value)} placeholder="Email de l'élève..." className="flex-1" />
            <Button onClick={addFamilyMember} size="sm" className="bg-gradient-primary">Ajouter</Button>
          </div>
        </div>

        {/* Family members */}
        <div className="space-y-3">
          {familyMembers.length === 0 ? (
            <div className="bg-card rounded-lg border border-border shadow-card p-6 text-center">
              <p className="text-muted-foreground text-sm">Aucun autre compte familial enregistré.</p>
            </div>
          ) : (
            familyMembers.map((member) => (
              <div key={member.member_email} className="bg-card rounded-lg border border-border shadow-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{member.member_name}</p>
                    <p className="text-xs text-muted-foreground">{member.member_email}</p>
                  </div>
                </div>
                {switchEmail === member.member_email ? (
                  <div className="flex gap-2">
                    <Input type="password" value={switchPassword} onChange={e => setSwitchPassword(e.target.value)} placeholder="Mot de passe" className="flex-1" />
                    <Button onClick={() => switchToAccount(member.member_email)} disabled={switching} size="sm" className="bg-gradient-primary">
                      <LogIn size={14} className="mr-1" />{switching ? "..." : "OK"}
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setSwitchEmail(member.member_email)}>
                    <Lock size={14} className="mr-1" />Se connecter
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default SwitchAccountPage;
