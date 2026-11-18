import React from "react";
import ReactDOM from "react-dom/client";
import "leaflet/dist/leaflet.css";
import App from "./App";
import "./index.css";
import { ensureLeafletIcons } from "./lib/leafletSetup";

ensureLeafletIcons();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
