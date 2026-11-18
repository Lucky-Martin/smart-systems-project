import { Walkthrough } from "./components/Walkthrough";
import { useSmartSystem } from "./hooks/useSmartSystem";

export default function App() {
  const system = useSmartSystem();
  return <Walkthrough system={system} />;
}
