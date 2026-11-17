import { useEffect } from 'react';
import { registerBackButtonHandler, type BackButtonHandler } from '../services/nativeMobileService';

/**
 * Hook to register a back-button action for a specific component or modal.
 * Automatically unregisters when the component unmounts or when `enabled` becomes false.
 *
 * @param id Unique identifier for the handler
 * @param handler Callback to execute. Return false if the event should bubble to lower handlers.
 * @param enabled Whether this back button listener is currently active
 * @param priority Execution priority (higher executes before lower; modals should use 200+, screens 100)
 */
export function useNativeBackButton(
  id: string,
  handler: BackButtonHandler,
  enabled: boolean = true,
  priority: number = 100
) {
  useEffect(() => {
    if (!enabled) return;
    return registerBackButtonHandler(id, handler, priority);
  }, [id, handler, enabled, priority]);
}
