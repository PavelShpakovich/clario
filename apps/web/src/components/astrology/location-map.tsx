'use client';

import { useEffect, useRef, useState } from 'react';

interface LocationMapProps {
  latitude: string;
  longitude: string;
  hint?: string;
  onLocationSelect: (lat: string, lon: string, city?: string, country?: string) => void;
}

declare global {
  interface Window {
    ymaps?: {
      ready: (fn: () => void) => void;
      Map: new (
        el: HTMLElement,
        opts: { center: [number, number]; zoom: number; controls: string[] },
      ) => YMap;
      Placemark: new (
        coords: [number, number],
        props?: Record<string, unknown>,
        opts?: Record<string, unknown>,
      ) => YPlacemark;
      geocode: (
        coords: [number, number],
        opts?: { results: number },
      ) => Promise<{
        geoObjects: {
          get: (i: number) => {
            getLocalities: () => string[];
            getCountry: () => string;
          } | null;
        };
      }>;
    };
  }
}

interface YMap {
  geoObjects: { add: (p: YPlacemark) => void; removeAll: () => void };
  setCenter: (c: [number, number]) => void;
  events: {
    add: (event: string, fn: (e: { get: (k: string) => [number, number] }) => void) => void;
  };
  destroy: () => void;
}

interface YPlacemark {
  geometry: { getCoordinates: () => [number, number] };
}

const SCRIPT_ID = 'yandex-maps-script';
const API_KEY = process.env.NEXT_PUBLIC_YANDEX_MAPS_KEY;

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.ymaps) {
      resolve();
      return;
    }
    if (document.getElementById(SCRIPT_ID)) {
      const iv = setInterval(() => {
        if (window.ymaps) {
          clearInterval(iv);
          resolve();
        }
      }, 100);
      return;
    }
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${API_KEY}&lang=ru_RU`;
    script.onload = () => {
      const iv = setInterval(() => {
        if (window.ymaps) {
          clearInterval(iv);
          resolve();
        }
      }, 100);
    };
    script.onerror = () => reject(new Error('Failed to load Yandex Maps'));
    document.head.appendChild(script);
  });
}

export function LocationMap({ latitude, longitude, hint, onLocationSelect }: LocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<YMap | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Keep latest callback in a ref so the map click handler is never stale
  // without needing to destroy/recreate the map
  const onSelectRef = useRef(onLocationSelect);
  useEffect(() => {
    onSelectRef.current = onLocationSelect;
  });

  // Effect 1: load the Yandex Maps script once
  useEffect(() => {
    if (!API_KEY) return;
    loadScript()
      .then(() => setLoaded(true))
      .catch(() => {
        /* silently fail */
      });
    return () => {
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, []);

  // Effect 2: create the map once when the script is loaded
  useEffect(() => {
    if (!loaded || !window.ymaps || !containerRef.current) return;

    window.ymaps.ready(() => {
      if (!containerRef.current || !window.ymaps) return;

      const initialLat = parseFloat(latitude) || 53.9;
      const initialLon = parseFloat(longitude) || 27.57;

      const map = new window.ymaps.Map(containerRef.current, {
        center: [initialLat, initialLon],
        zoom: parseFloat(latitude) ? 10 : 4,
        controls: ['zoomControl'],
      });

      if (parseFloat(latitude) && parseFloat(longitude)) {
        map.geoObjects.add(
          new window.ymaps!.Placemark(
            [initialLat, initialLon],
            {},
            { preset: 'islands#redDotIcon' },
          ),
        );
      }

      map.events.add('click', (e) => {
        const coords = e.get('coords');
        map.geoObjects.removeAll();
        map.geoObjects.add(
          new window.ymaps!.Placemark(coords, {}, { preset: 'islands#redDotIcon' }),
        );
        map.setCenter(coords);

        window
          .ymaps!.geocode(coords, { results: 1 })
          .then((res) => {
            const obj = res.geoObjects.get(0);
            const city = obj?.getLocalities().join(', ') ?? '';
            const country = obj?.getCountry() ?? '';
            onSelectRef.current(coords[0].toFixed(6), coords[1].toFixed(6), city, country);
          })
          .catch(() => {
            onSelectRef.current(coords[0].toFixed(6), coords[1].toFixed(6));
          });
      });

      mapRef.current = map;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]); // intentionally run only when script loads — never recreate the map

  // Effect 3: sync marker + center when external lat/lon changes (city autocomplete)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.ymaps) return;
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lon)) return;

    map.geoObjects.removeAll();
    map.geoObjects.add(
      new window.ymaps.Placemark([lat, lon], {}, { preset: 'islands#redDotIcon' }),
    );
    map.setCenter([lat, lon]);
  }, [latitude, longitude]);

  if (!API_KEY) {
    return (
      <div className="grid gap-2">
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        <div className="flex h-24 items-center justify-center rounded-xl border border-dashed bg-muted/40 text-xs text-muted-foreground">
          Карта недоступна — введите координаты вручную
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <div ref={containerRef} className="h-48 w-full rounded-xl border bg-muted overflow-hidden" />
    </div>
  );
}
