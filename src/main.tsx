import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import { createAppHashRouter } from "./app/router";
import "./styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Unable to find the application root");
}

const router = createAppHashRouter();

createRoot(rootElement).render(
  <StrictMode>
    <App router={router} />
  </StrictMode>,
);
