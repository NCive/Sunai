import { useAssistantStatus } from './hooks/useAssistantStatus';
import { useReducedMotion } from './hooks/useReducedMotion';
import { DeckStage } from './deck/DeckStage';

export function App() {
  const { isOnline } = useAssistantStatus();
  const { reducedMotion, toggleReducedMotion } = useReducedMotion();

  return (
    <DeckStage
      isOnline={isOnline}
      reducedMotion={reducedMotion}
      onToggleReducedMotion={toggleReducedMotion}
    />
  );
}

export default App;
