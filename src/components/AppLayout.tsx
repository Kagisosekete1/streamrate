import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { BottomNav } from "./BottomNav";
import { RightSidebar } from "./RightSidebar";
import { MobileMoreMenu } from "./MobileMoreMenu";

interface AppLayoutProps {
  children: ReactNode;
  showBottomNav?: boolean;
  showRightSidebar?: boolean;
}

export const AppLayout = ({ children, showBottomNav = true, showRightSidebar = true }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar for desktop/tablet */}
      <AppSidebar />

      {/* Right Sidebar for desktop - Hashtags */}
      {showRightSidebar && <RightSidebar />}

      {/* Main content area */}
      <main className="md:ml-60 lg:mr-72 min-h-screen transition-all duration-300">
        {children}
      </main>

      {/* Bottom nav for mobile only */}
      {showBottomNav && (
        <div className="md:hidden">
          <BottomNav />
          <MobileMoreMenu />
        </div>
      )}
    </div>
  );
};
