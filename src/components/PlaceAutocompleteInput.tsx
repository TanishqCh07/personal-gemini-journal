// Source: Google Maps Platform Code Assist
import React, { useEffect, useRef, useState } from 'react';
import { MapPin, X, Loader2, Navigation, Check } from 'lucide-react';
import { PlaceLocation } from '../types';
import { loadGoogleMapsPlaces } from '../lib/mapsService';

interface PlaceAutocompleteInputProps {
  selectedLocation: PlaceLocation | null;
  onSelectPlace: (location: PlaceLocation) => void;
  onClearPlace: () => void;
  onLoadError?: () => void;
  onClose?: () => void;
}

// Ensure shadowRoot is open when gmp-place-autocomplete initializes so custom styles can be injected
if (typeof Element !== 'undefined' && !(Element.prototype as any).__gmpShadowPatched) {
  const origAttachShadow = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function (init: ShadowRootInit) {
    if (this.tagName?.toLowerCase() === 'gmp-place-autocomplete') {
      return origAttachShadow.call(this, { ...init, mode: 'open' });
    }
    return origAttachShadow.call(this, init);
  };
  (Element.prototype as any).__gmpShadowPatched = true;
}

function applyThemeToAutocomplete(el: HTMLElement | null, isDark: boolean) {
  if (!el) return;
  try {
    el.style.colorScheme = isDark ? 'dark' : 'light';
    el.setAttribute('color-scheme', isDark ? 'dark' : 'light');
    el.style.backgroundColor = 'transparent';
    el.style.border = 'none';
    el.style.width = '100%';

    // Configure CSS variables on the host element for Google Places UI Kit
    if (isDark) {
      el.style.setProperty('--gmp-mat-color-surface', '#1e293b');
      el.style.setProperty('--gmp-mat-color-on-surface', '#f8fafc');
      el.style.setProperty('--gmp-mat-color-on-surface-variant', '#cbd5e1');
      el.style.setProperty('--gmp-mat-color-surface-container', '#1e293b');
      el.style.setProperty('--gmp-mat-color-surface-container-highest', '#334155');
      el.style.setProperty('--gmp-mat-color-outline', '#334155');
      el.style.setProperty('--gmp-mat-color-primary', 'var(--accent-400)');
    } else {
      el.style.setProperty('--gmp-mat-color-surface', '#ffffff');
      el.style.setProperty('--gmp-mat-color-on-surface', '#0f172a');
      el.style.setProperty('--gmp-mat-color-on-surface-variant', '#475569');
      el.style.setProperty('--gmp-mat-color-surface-container', '#ffffff');
      el.style.setProperty('--gmp-mat-color-surface-container-highest', '#f1f5f9');
      el.style.setProperty('--gmp-mat-color-outline', '#e2e8f0');
      el.style.setProperty('--gmp-mat-color-primary', 'var(--accent-600)');
    }

    const shadow = el.shadowRoot;
    if (shadow) {
      let styleTag = shadow.getElementById('gmp-theme-overrides') as HTMLStyleElement;
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'gmp-theme-overrides';
        shadow.appendChild(styleTag);
      }
      styleTag.textContent = isDark
        ? `
          :host {
            color-scheme: dark !important;
            background: transparent !important;
            width: 100% !important;
          }
          .widget-container, .input-container {
            background: transparent !important;
            background-color: transparent !important;
            color: #f8fafc !important;
          }
          input {
            background-color: transparent !important;
            color: #f8fafc !important;
            font-family: inherit !important;
            font-size: 12px !important;
          }
          input::placeholder {
            color: #64748b !important;
          }
          .dropdown, .prediction-list, ul, [role="listbox"] {
            background-color: #1e293b !important;
            border: 1px solid #334155 !important;
            border-radius: 0.75rem !important;
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.5) !important;
            color: #f8fafc !important;
            overflow: hidden !important;
          }
          .prediction-item, li, [role="option"] {
            background-color: #1e293b !important;
            color: #f8fafc !important;
          }
          .prediction-item:hover, .prediction-item[aria-selected="true"], [role="option"]:hover, [role="option"][aria-selected="true"] {
            background-color: #334155 !important;
            color: #ffffff !important;
          }
          .primary-text, .main-text, [class*="main"], [class*="primary"] {
            color: #f8fafc !important;
            font-weight: 600 !important;
          }
          .secondary-text, [class*="secondary"], [class*="address"] {
            color: #cbd5e1 !important;
          }
          svg, .icon, [class*="icon"], [class*="marker"], [class*="pin"] {
            color: var(--accent-400) !important;
            fill: var(--accent-400) !important;
          }
          .clear-button, button[aria-label*="Clear"], button[title*="Clear"], [class*="clear"] {
            color: #94a3b8 !important;
            fill: #94a3b8 !important;
          }
        `
        : `
          :host {
            color-scheme: light !important;
            background: transparent !important;
            width: 100% !important;
          }
          .widget-container, .input-container {
            background: transparent !important;
            background-color: transparent !important;
            color: #0f172a !important;
          }
          input {
            background-color: transparent !important;
            color: #0f172a !important;
            font-family: inherit !important;
            font-size: 12px !important;
          }
          input::placeholder {
            color: #94a3b8 !important;
          }
          .dropdown, .prediction-list, ul, [role="listbox"] {
            background-color: #ffffff !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 0.75rem !important;
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1) !important;
            color: #0f172a !important;
            overflow: hidden !important;
          }
          .prediction-item, li, [role="option"] {
            background-color: #ffffff !important;
            color: #0f172a !important;
          }
          .prediction-item:hover, .prediction-item[aria-selected="true"], [role="option"]:hover, [role="option"][aria-selected="true"] {
            background-color: #f1f5f9 !important;
            color: #0f172a !important;
          }
          .primary-text, .main-text, [class*="main"], [class*="primary"] {
            color: #0f172a !important;
            font-weight: 600 !important;
          }
          .secondary-text, [class*="secondary"], [class*="address"] {
            color: #475569 !important;
          }
          svg, .icon, [class*="icon"], [class*="marker"], [class*="pin"] {
            color: var(--accent-600) !important;
            fill: var(--accent-600) !important;
          }
          .clear-button, button[aria-label*="Clear"], button[title*="Clear"], [class*="clear"] {
            color: #64748b !important;
            fill: #64748b !important;
          }
        `;
    }
  } catch (err) {
    console.debug('[PlaceAutocompleteInput] Error applying theme overrides:', err);
  }
}

export const PlaceAutocompleteInput: React.FC<PlaceAutocompleteInputProps> = ({
  selectedLocation,
  onSelectPlace,
  onClearPlace,
  onLoadError,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fallbackInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [useFallback, setUseFallback] = useState(false);
  const [fallbackText, setFallbackText] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isMapsReady, setIsMapsReady] = useState(false);
  const autocompleteElementRef = useRef<any>(null);

  // Monitor document theme changes and update the autocomplete element dynamically
  useEffect(() => {
    const updateTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      if (autocompleteElementRef.current) {
        applyThemeToAutocomplete(autocompleteElementRef.current, isDark);
      }
    };

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Listen for auth failures (e.g. invalid key or missing Places API activation)
    const originalGmAuthFailure = (window as any).gm_authFailure;
    (window as any).gm_authFailure = () => {
      if (isMounted) {
        setIsMapsReady(false);
        setUseFallback(true);
        setLoading(false);
        if (typeof onLoadError === 'function') {
          onLoadError();
        }
      }
      if (typeof originalGmAuthFailure === 'function') {
        originalGmAuthFailure();
      }
    };

    async function initPlaces() {
      try {
        const loaded = await loadGoogleMapsPlaces();
        if (!isMounted) return;

        if (!loaded) {
          setIsMapsReady(false);
          setUseFallback(true);
          setLoading(false);
          if (typeof onLoadError === 'function') {
            onLoadError();
          }
          return;
        }

        const google = (window as any).google;
        if (!google?.maps?.places) {
          setIsMapsReady(false);
          setUseFallback(true);
          setLoading(false);
          if (typeof onLoadError === 'function') {
            onLoadError();
          }
          return;
        }

        // Try mounting modern PlaceAutocompleteElement web component imperatively
        if (typeof google.maps.places.PlaceAutocompleteElement === 'function' && containerRef.current) {
          containerRef.current.innerHTML = '';

          const placeAutocomplete = new google.maps.places.PlaceAutocompleteElement({
            internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
          });

          placeAutocomplete.placeholder = 'Search cafe, park, city, or venue...';
          placeAutocomplete.className = 'w-full text-xs text-slate-900 dark:text-slate-100 bg-transparent focus:outline-none';

          const isDark = document.documentElement.classList.contains('dark');
          applyThemeToAutocomplete(placeAutocomplete, isDark);

          // Apply again after short delays to catch async shadow DOM rendering by the Places SDK
          setTimeout(() => applyThemeToAutocomplete(placeAutocomplete, document.documentElement.classList.contains('dark')), 50);
          setTimeout(() => applyThemeToAutocomplete(placeAutocomplete, document.documentElement.classList.contains('dark')), 250);
          setTimeout(() => applyThemeToAutocomplete(placeAutocomplete, document.documentElement.classList.contains('dark')), 600);

          placeAutocomplete.addEventListener('gmp-select', async (event: any) => {
            try {
              const placePrediction = event.placePrediction;
              if (!placePrediction) return;

              const place = placePrediction.toPlace();
              await place.fetchFields({
                fields: ['displayName', 'formattedAddress', 'location'],
              });

              const placeName = place.displayName || 'Selected Location';
              const lat = typeof place.location?.lat === 'function'
                ? place.location.lat()
                : Number(place.location?.lat || 0);
              const lng = typeof place.location?.lng === 'function'
                ? place.location.lng()
                : Number(place.location?.lng || 0);
              const formattedAddress = place.formattedAddress || '';

              onSelectPlace({
                placeName,
                lat,
                lng,
                formattedAddress,
              });
            } catch (err) {
              console.warn('[Google Maps] Error fetching place fields:', err);
            }
          });

          containerRef.current.appendChild(placeAutocomplete);
          autocompleteElementRef.current = placeAutocomplete;
          setIsMapsReady(true);
          setLoading(false);
        } else if (fallbackInputRef.current && typeof google.maps.places.Autocomplete === 'function') {
          // Classic Autocomplete fallback
          setUseFallback(true);
          const autocomplete = new google.maps.places.Autocomplete(fallbackInputRef.current, {
            fields: ['name', 'formatted_address', 'geometry'],
          });

          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (!place) return;

            const placeName = place.name || place.formatted_address || 'Selected Location';
            const lat = place.geometry?.location?.lat() ?? 0;
            const lng = place.geometry?.location?.lng() ?? 0;
            const formattedAddress = place.formatted_address || '';

            onSelectPlace({
              placeName,
              lat,
              lng,
              formattedAddress,
            });
          });
          setIsMapsReady(true);
          setLoading(false);
        } else {
          setIsMapsReady(false);
          setUseFallback(true);
          setLoading(false);
        }
      } catch (err) {
        console.warn('[Google Maps] Failed to initialize Places Autocomplete:', err);
        if (isMounted) {
          setIsMapsReady(false);
          setUseFallback(true);
          setLoading(false);
          if (typeof onLoadError === 'function') {
            onLoadError();
          }
        }
      }
    }

    initPlaces();

    return () => {
      isMounted = false;
      if (autocompleteElementRef.current && autocompleteElementRef.current.parentNode) {
        autocompleteElementRef.current.parentNode.removeChild(autocompleteElementRef.current);
      }
    };
  }, [onLoadError, onSelectPlace]);

  // Handle manual location submission in fallback mode
  const handleManualSubmit = () => {
    const trimmed = fallbackText.trim();
    if (!trimmed) return;

    onSelectPlace({
      placeName: trimmed,
      formattedAddress: trimmed,
      lat: 0,
      lng: 0,
    });
    setFallbackText('');
  };

  // Handle browser device geolocation tag
  const handleUseCurrentLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoError('Device geolocation is not supported in this browser.');
      return;
    }

    setGeoLoading(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const latStr = latitude.toFixed(4);
        const lngStr = longitude.toFixed(4);
        onSelectPlace({
          placeName: `Current Location (${latStr}, ${lngStr})`,
          formattedAddress: `Lat: ${latStr}, Lng: ${lngStr}`,
          lat: latitude,
          lng: longitude,
        });
        setGeoLoading(false);
      },
      (err) => {
        console.warn('[Geolocation] Error getting current position:', err);
        setGeoLoading(false);
        setGeoError(
          err.code === 1
            ? 'Location permission denied by browser.'
            : 'Unable to acquire device coordinates.'
        );
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  if (selectedLocation) {
    return (
      <div 
        id="selected-location-chip"
        className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center shrink-0 text-emerald-700 dark:text-emerald-300">
            <MapPin className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate flex items-center gap-1.5">
              <span>{selectedLocation.placeName}</span>
              {(selectedLocation.lat !== 0 || selectedLocation.lng !== 0) && (
                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-mono bg-emerald-100/80 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded">
                  {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
                </span>
              )}
            </div>
            {selectedLocation.formattedAddress && (
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 truncate">
                {selectedLocation.formattedAddress}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            id="remove-location-btn"
            type="button"
            onClick={onClearPlace}
            className="p-1 rounded-lg text-emerald-700 dark:text-emerald-400 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/60 transition cursor-pointer"
            title="Remove tagged location"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
          <MapPin className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
          <span>Tag Location on Journal Entry</span>
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            {isMapsReady ? 'Google Places Active' : 'Direct Location Tag'}
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition cursor-pointer"
              title="Close location search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition min-h-[42px] flex items-center">
        {loading && (
          <div className="flex items-center gap-2 px-2 text-xs text-slate-400 dark:text-slate-500">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500 dark:text-indigo-400" />
            <span>Checking Places service...</span>
          </div>
        )}

        <div
          ref={containerRef}
          className={`w-full ${loading || useFallback ? 'hidden' : 'block'}`}
        />

        {useFallback && !loading && (
          <div className="w-full flex items-center gap-1.5">
            <input
              id="location-search-input"
              ref={fallbackInputRef}
              type="text"
              value={fallbackText}
              onChange={(e) => setFallbackText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleManualSubmit();
                }
              }}
              placeholder="Search cafe, park, city, or venue (e.g. Central Park, NY)..."
              className="w-full px-2 py-1 text-xs text-slate-900 dark:text-slate-100 bg-transparent focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
              autoFocus
            />
            {fallbackText.trim() && (
              <button
                id="apply-manual-location-btn"
                type="button"
                onClick={handleManualSubmit}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-medium shrink-0 transition cursor-pointer shadow-xs"
              >
                <Check className="w-3 h-3" />
                <span>Tag</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Geolocation shortcut & helpful status */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
        <button
          id="device-location-btn"
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={geoLoading}
          className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium transition cursor-pointer disabled:opacity-50"
          title="Detect and tag your current device GPS coordinates"
        >
          {geoLoading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Navigation className="w-3 h-3" />
          )}
          <span>{geoLoading ? 'Acquiring GPS...' : 'Use current location'}</span>
        </button>

        {geoError ? (
          <span className="text-[10px] text-amber-600 dark:text-amber-400">{geoError}</span>
        ) : (
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            Press Enter or click Tag to attach
          </span>
        )}
      </div>
    </div>
  );
};
