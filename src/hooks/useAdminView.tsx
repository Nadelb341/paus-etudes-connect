import { createContext, useContext, useState, ReactNode } from "react";

type AdminViewMode = "élève" | "parent";

interface AdminViewContextType {
  viewMode: AdminViewMode;
  setViewMode: (mode: AdminViewMode) => void;
  toggleViewMode: () => void;
}

const AdminViewContext = createContext<AdminViewContextType>({
  viewMode: "élève",
  setViewMode: () => {},
  toggleViewMode: () => {},
});

export function AdminViewProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewMode] = useState<AdminViewMode>("élève");

  const toggleViewMode = () => {
    setViewMode((prev) => (prev === "élève" ? "parent" : "élève"));
  };

  return (
    <AdminViewContext.Provider value={{ viewMode, setViewMode, toggleViewMode }}>
      {children}
    </AdminViewContext.Provider>
  );
}

export const useAdminView = () => useContext(AdminViewContext);
