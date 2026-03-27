import AppHeader from "@/components/layout/AppHeader";
import { MessageSquarePlus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const MessagesPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-heading font-bold text-foreground">Messages</h1>
          <Button size="sm" className="bg-gradient-primary hover:opacity-90">
            <MessageSquarePlus size={16} className="mr-2" />
            Nouveau message
          </Button>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Rechercher un message..." className="pl-9" />
        </div>

        <div className="bg-card rounded-lg border border-border shadow-card p-8 text-center">
          <p className="text-muted-foreground text-sm">Aucun message pour le moment</p>
          <p className="text-muted-foreground text-xs mt-1">Les messages apparaîtront ici</p>
        </div>
      </main>
    </div>
  );
};

export default MessagesPage;
