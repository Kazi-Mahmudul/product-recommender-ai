import { useState, useCallback, useEffect } from 'react';

interface TooltipPinState {
  isPinned: boolean;
  pinnedPayload: any;
  pinnedLabel: string;
}

/**
 * Hook to manage tooltip pinning for touch devices
 * @returns Object containing pin state and handlers
 */
export const useTooltipPin = () => {
  const [pinState, setPinState] = useState<TooltipPinState>({
    isPinned: false,
    pinnedPayload: null,
    pinnedLabel: '',
  });

  // Pin tooltip with current payload and label
  const pinTooltip = useCallback((payload: any, label: string) => {
    setPinState({
      isPinned: true,
      pinnedPayload: payload,
      pinnedLabel: label,
    });
  }, []);

  // Unpin tooltip
  const unpinTooltip = useCallback(() => {
    setPinState({
      isPinned: false,
      pinnedPayload: null,
      pinnedLabel: '',
    });
  }, []);

  // Toggle pin state
  const togglePin = useCallback((payload: any, label: string) => {
    if (pinState.isPinned) {
      unpinTooltip();
    } else {
      pinTooltip(payload, label);
    }
  }, [pinState.isPinned, pinTooltip, unpinTooltip]);

  // Add escape key handler to unpin tooltip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && pinState.isPinned) {
        unpinTooltip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pinState.isPinned, unpinTooltip]);

  return {
    ...pinState,
    pinTooltip,
    unpinTooltip,
    togglePin,
  };
};

export default useTooltipPin;