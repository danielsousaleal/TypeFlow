import type { DeviceType } from "@/lib/types";

const STORAGE_KEY = "typeflow_device_type";

type NavigatorWithUserAgentData = Navigator & {
  userAgentData?: {
    mobile?: boolean;
  };
};

export function getPersistentDeviceType(): DeviceType {
  if (typeof window === "undefined") return "desktop";

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "desktop" || saved === "mobile") return saved;
  } catch {
    // O ranking ainda funciona quando o navegador bloqueia localStorage.
  }

  const navigatorWithHints = navigator as NavigatorWithUserAgentData;
  const mobileUserAgent =
    navigatorWithHints.userAgentData?.mobile === true ||
    /Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );
  const mobileHardwareFallback =
    navigator.maxTouchPoints > 0 &&
    window.matchMedia("(pointer: coarse)").matches &&
    Math.min(window.screen.width, window.screen.height) <= 600;
  const detected: DeviceType =
    mobileUserAgent || mobileHardwareFallback ? "mobile" : "desktop";

  try {
    window.localStorage.setItem(STORAGE_KEY, detected);
  } catch {
    // Sem persistência, a detecção será refeita no próximo acesso.
  }

  return detected;
}
