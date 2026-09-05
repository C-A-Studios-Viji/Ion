import { createRoot } from "react-dom/client";
import IonGame from "../app/IonGame";
import "../app/globals.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("ION could not find its game container.");
}

createRoot(root).render(<IonGame />);
