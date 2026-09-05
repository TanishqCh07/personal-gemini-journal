// Source: Google Maps Platform Code Assist
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

let cachedApiKey: string | null = null;
let loaderPromise: Promise<boolean> | null = null;
let mapsAuthFailed = false;

/**
 * Global authentication failure handler for Google Maps
 */
if (typeof window !== 'undefined') {
  const existingHandler = (window as any).gm_authFailure;
  (window as any).gm_authFailure = () => {
    console.warn('[Google Maps] Authentication failed or key restricted. Gracefully disabling location features.');
    mapsAuthFailed = true;
    if (typeof existingHandler === 'function') {
      existingHandler();
    }
  };
}

/**
 * Retrieves the dedicated Maps API key from client env or server config endpoint
 */
export async function getMapsApiKey(): Promise<string> {
  if (cachedApiKey) return cachedApiKey;

  // 1. Check build-time / injected Vite variable
  const metaKey = (import.meta as any).env?.VITE_MAPS_API_KEY;
  if (typeof metaKey === 'string' && metaKey.trim()) {
    cachedApiKey = metaKey.trim();
    return cachedApiKey;
  }

  // 2. Query backend configuration endpoint (client-safe proxy for MAPS_API_KEY)
  try {
    const res = await fetch('/api/config/maps-key');
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.mapsApiKey === 'string' && data.mapsApiKey.trim()) {
        cachedApiKey = data.mapsApiKey.trim();
        return cachedApiKey;
      }
    }
  } catch (err) {
    console.warn('[Google Maps] Could not query server /api/config/maps-key:', err);
  }

  return '';
}

/**
 * Initializes and loads the Google Maps JavaScript API with the Places library.
 * Returns true if successful, or false if key is missing or script fails to load.
 */
export async function loadGoogleMapsPlaces(): Promise<boolean> {
  if (mapsAuthFailed) return false;
  if (loaderPromise) return loaderPromise;

  loaderPromise = (async () => {
    try {
      const apiKey = await getMapsApiKey();
      if (!apiKey) {
        console.info('[Google Maps] No MAPS_API_KEY detected. Location features will remain dormant.');
        return false;
      }

      // Check if google.maps already loaded
      if (typeof window !== 'undefined' && (window as any).google?.maps?.places) {
        return true;
      }

      setOptions({
        key: apiKey,
        v: 'weekly',
      });

      await importLibrary('places');
      return true;
    } catch (err) {
      console.warn('[Google Maps] Failed to load Maps JavaScript API:', err);
      return false;
    }
  })();

  return loaderPromise;
}
