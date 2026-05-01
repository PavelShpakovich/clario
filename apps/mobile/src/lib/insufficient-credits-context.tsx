import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { InsufficientCreditsModal } from '@/components/InsufficientCreditsModal';

interface ModalState {
  visible: boolean;
  required?: number;
  balance?: number;
}

interface InsufficientCreditsContextValue {
  showInsufficientCredits: (opts?: { required?: number; balance?: number }) => void;
}

const InsufficientCreditsContext = createContext<InsufficientCreditsContextValue>({
  showInsufficientCredits: () => {},
});

export function InsufficientCreditsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ModalState>({ visible: false });

  const showInsufficientCredits = useCallback((opts?: { required?: number; balance?: number }) => {
    setState({ visible: true, required: opts?.required, balance: opts?.balance });
  }, []);

  function handleClose() {
    setState((prev) => ({ ...prev, visible: false }));
  }

  return (
    <InsufficientCreditsContext.Provider value={{ showInsufficientCredits }}>
      {children}
      <InsufficientCreditsModal
        visible={state.visible}
        required={state.required}
        balance={state.balance}
        onClose={handleClose}
      />
    </InsufficientCreditsContext.Provider>
  );
}

export function useInsufficientCredits() {
  return useContext(InsufficientCreditsContext);
}
