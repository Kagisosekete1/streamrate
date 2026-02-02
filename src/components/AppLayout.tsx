import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { BottomNav } from "./BottomNav";

interface AppLayoutProps {
  children: ReactNode;
  showBottomNav?: boolean;
}

export const AppLayout = ({ children, showBottomNav = true }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar for desktop/tablet */}
      <AppSidebar />

      {/* Main content area */}
      <main className="md:ml-60 min-h-screen transition-all duration-300">
        {children}
      </main>

      {/* Bottom nav for mobile only */}
      {showBottomNav && (
        <div className="md:hidden">
          <BottomNav />
        </div>
      )}
    </div>
  );
};
