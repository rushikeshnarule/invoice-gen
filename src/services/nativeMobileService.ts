import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { toast } from '@/components/base/toast/toast';

export type BackButtonHandler = () => boolean | void | Promise<boolean | void>;

interface RegisteredHandler {
  id: string;
  priority: number;
  handler: BackButtonHandler;
}

let handlers: RegisteredHandler[] = [];
let isListenerAttached = false;
let lastBackPressTime = 0;

/**
 * Returns true if running inside a native mobile container (Android / iOS).
 */
export const isNativeMobile = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Returns true if running on Android (native).
 */
export const isAndroid = (): boolean => {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
};

/**
 * Returns true if running on iOS (native).
 */
export const isIOS = (): boolean => {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
};

/**
 * Register a handler for the native Android hardware back button.
 * Handlers with higher priority are executed first.
 * If a handler returns `true` (or does not return `false`), it consumes the event.
 * Returns an unregister cleanup function.
 */
export const registerBackButtonHandler = (
  id: string,
  handler: BackButtonHandler,
  priority: number = 100
): (() => void) => {
  // Remove existing with same id if any
  handlers = handlers.filter((h) => h.id !== id);
  handlers.push({ id, priority, handler });
  handlers.sort((a, b) => b.priority - a.priority);

  ensureBackListener();

  return () => {
    handlers = handlers.filter((h) => h.id !== id);
  };
};

/**
 * Ensure the Capacitor App backButton listener is wired up.
 */
const ensureBackListener = () => {
  if (isListenerAttached || !Capacitor.isNativePlatform()) return;
  isListenerAttached = true;

  App.addListener('backButton', async () => {
    // 1. Check registered stack handlers
    for (const item of [...handlers]) {
      try {
        const result = await item.handler();
        // If handler didn't explicitly return false, consider it handled
        if (result !== false) {
          return;
        }
      } catch (err) {
        console.error(`Error in back button handler [${item.id}]:`, err);
      }
    }

    // 2. No handler consumed the event. Double tap to exit on Android root.
    const now = Date.now();
    if (now - lastBackPressTime < 2000) {
      App.exitApp();
    } else {
      lastBackPressTime = now;
      toast.info('Press back again to exit Invoice Gen', { duration: 2000 });
      haptics.light();
    }
  });
};

/**
 * Haptic feedback helpers that safely fall back to no-op on desktop / web.
 */
export const haptics = {
  light: async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {}
  },
  medium: async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {}
  },
  heavy: async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch {}
  },
  success: async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch {}
  },
  warning: async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await Haptics.notification({ type: NotificationType.Warning });
    } catch {}
  },
  error: async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await Haptics.notification({ type: NotificationType.Error });
    } catch {}
  },
  selection: async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await Haptics.selectionStart();
    } catch {}
  },
};

/**
 * Initialize all native platform configurations on application mount.
 */
export const initNativeMobilePlatform = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;

  ensureBackListener();

  // Status bar styling
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#ffffff' });
    }
  } catch (err) {
    console.warn('Native status bar styling not available:', err);
  }

  // Keyboard avoidance
  try {
    await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
  } catch (err) {
    console.warn('Native keyboard resize mode not available:', err);
  }
};
