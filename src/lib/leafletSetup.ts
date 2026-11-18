import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

let iconsReady = false;

/** Vite rewrites asset URLs, so Leaflet's default relative icon paths 404 unless replaced. */
export function ensureLeafletIcons(): void {
  if (iconsReady) return;
  iconsReady = true;
  const prototype = L.Icon.Default.prototype as unknown as { _getIconUrl?: string };
  delete prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
  });
}
