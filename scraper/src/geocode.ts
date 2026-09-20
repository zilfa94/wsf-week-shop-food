/**
 * Géocodage d'un code postal → commune + coordonnées, via la Base Adresse Nationale (service public,
 * licence ouverte, sans clé). Géoplateforme IGN d'abord, ancien point d'entrée data.gouv en repli.
 * Une seule requête par code postal et par exécution ; rien n'est deviné : sans réponse, pas de magasin.
 */
import { fetchText } from './http.ts';

export interface Place {
  postalCode: string;
  city: string;
  latitude: number;
  longitude: number;
}

const GEOCODERS = ['https://data.geopf.fr/geocodage/search', 'https://api-adresse.data.gouv.fr/search/'];

interface GeoFeature {
  geometry?: { coordinates?: unknown };
  properties?: { postcode?: unknown; city?: unknown; label?: unknown };
}

/** Première commune dont le code postal est exactement celui demandé (GeoJSON de la BAN). */
export function placeFromGeocoding(json: unknown, postalCode: string): Place | null {
  const features = (json as { features?: GeoFeature[] } | null)?.features;
  if (!Array.isArray(features)) return null;
  for (const f of features) {
    const coords = f.geometry?.coordinates;
    const props = f.properties;
    if (!props || props.postcode !== postalCode || !Array.isArray(coords) || coords.length < 2) continue;
    const [longitude, latitude] = coords as [unknown, unknown];
    const city = typeof props.city === 'string' ? props.city : typeof props.label === 'string' ? props.label : '';
    if (typeof latitude !== 'number' || typeof longitude !== 'number' || !city) continue;
    return { postalCode, city, latitude, longitude };
  }
  return null;
}

export const isPostalCode = (s: string): boolean => /^\d{5}$/.test(s);

export async function geocodePostalCode(postalCode: string): Promise<Place | null> {
  if (!isPostalCode(postalCode)) return null;
  const query = `?q=${postalCode}&postcode=${postalCode}&type=municipality&limit=3`;
  for (const base of GEOCODERS) {
    try {
      const body = await fetchText(base + query, { attempts: 2 });
      const place = body ? placeFromGeocoding(JSON.parse(body), postalCode) : null;
      if (place) return place;
    } catch {
      // Service suivant.
    }
  }
  return null;
}
