import type { ReactNode } from "react";

import type { AppServices } from "../services";
import { AppServicesContext } from "./servicesContext";

interface AppServicesProviderProps {
  children: ReactNode;
  services: AppServices;
}

export function AppServicesProvider({
  children,
  services,
}: AppServicesProviderProps) {
  return (
    <AppServicesContext.Provider value={services}>
      {children}
    </AppServicesContext.Provider>
  );
}
