import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const keyFor = (pathname: string, search: string) => `streamrate:scroll:${pathname}${search}`;

export const NavigationMemory = () => {
  const location = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    const currentKey = keyFor(location.pathname, location.search);
    let raf = 0;

    const save = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        sessionStorage.setItem(currentKey, String(window.scrollY));
      });
    };

    window.addEventListener("scroll", save, { passive: true });
    window.addEventListener("pagehide", save);

    return () => {
      save();
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", save);
      window.removeEventListener("pagehide", save);
    };
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (navigationType !== "POP") return;
    const saved = sessionStorage.getItem(keyFor(location.pathname, location.search));
    if (!saved) return;
    requestAnimationFrame(() => {
      window.scrollTo({ top: Number(saved) || 0, left: 0, behavior: "instant" as ScrollBehavior });
    });
  }, [location.pathname, location.search, navigationType]);

  return null;
};