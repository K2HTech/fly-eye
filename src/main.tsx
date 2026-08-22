import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import { createAppHashRouter } from "./app/router";
import { createLocalAppServices } from "./infrastructure/local";
import type { AuthenticatedOperator } from "./services";
import "./styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Unable to find the application root");
}

const router = createAppHashRouter();
const services = createLocalAppServices(window.localStorage);
const now = new Date().toISOString();
const developmentFallback: AuthenticatedOperator | undefined = import.meta.env
  .DEV
  ? {
      profile: {
        id: "development-operator",
        displayName: "Development Operator",
        email: "developer@fly-eye.local",
        createdAt: now,
      },
      session: {
        profileId: "development-operator",
        mode: "demo",
        startedAt: now,
      },
    }
  : undefined;

createRoot(rootElement).render(
  <StrictMode>
    <App
      router={router}
      services={services}
      developmentFallback={developmentFallback}
    />
  </StrictMode>,
);
