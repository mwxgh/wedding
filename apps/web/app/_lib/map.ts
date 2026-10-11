/**
 * Google Maps links for a venue. Everything works from the address alone;
 * a pasted `mapUrl` (e.g. a shared pin) is preferred for "open in Maps".
 */
export interface Venue {
  venueName: string;
  address: string;
  mapUrl?: string | null;
}

// the street address geocodes to one pin; a venue name tends to turn the
// lookup into a category search ("wedding centers near …")
const query = (v: Venue) => encodeURIComponent(v.address || v.venueName);

export const mapLinks = (v: Venue) => ({
  /** Keyless embed for the modal's iframe. */
  embed: `https://www.google.com/maps?q=${query(v)}&output=embed`,
  open:
    v.mapUrl || `https://www.google.com/maps/search/?api=1&query=${query(v)}`,
  directions: `https://www.google.com/maps/dir/?api=1&destination=${query(v)}`,
});
