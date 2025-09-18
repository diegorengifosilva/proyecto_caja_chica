import React from "react";
import ReactDOM from "react-dom/client.js";
import App from "./pages/App.jsx";
import "./styles/globals.css";
import { AuthProvider } from "./context/AuthContext.jsx";
import './styles/globals.css';
import "./index.css"

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);