import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useAppLock } from "@/hooks/useAppLock";
import { AppLockScreen } from "@/components/AppLockScreen";

interface AppLockGateProps {
  children: ReactNode;
}

export const AppLockGate = ({ children }: AppLockGateProps) => {
  const { isLocked, unlock } = useAppLock();
  const location = useLocation();

  // Don't lock on auth pages
  const isAuthPage = location.pathname === "/" || location.pathname === "/auth";

  if (isLocked && !isAuthPage) {
    return <AppLockScreen onUnlock={unlock} />;
  }

  return <>{children}</>;
};
