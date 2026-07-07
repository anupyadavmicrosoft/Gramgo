import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || "";

// Standard coordinates for local Ghazipur villages in UP, India
export const LOCAL_VILLAGES: Record<string, { lat: number; lng: number }> = {
  "ghazipur": { lat: 25.5787, lng: 83.5772 },
  "gauspur": { lat: 25.5612, lng: 83.5912 },
  "karimpur": { lat: 25.5890, lng: 83.5412 },
  "malikpur": { lat: 25.5901, lng: 83.6521 },
  "sherpur": { lat: 25.5724, lng: 83.7824 },
  "mohammadabad": { lat: 25.6186, lng: 83.7543 },
  "reotipur": { lat: 25.5243, lng: 83.7123 },
  "suhwal": { lat: 25.5412, lng: 83.6489 },
  "bhadaura": { lat: 25.4891, lng: 83.7912 },
  "ganganpur": { lat: 25.5342, lng: 83.6212 },
};

// Simple helper to calculate distance using Haversine formula
export function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return parseFloat(d.toFixed(2));
}

// Helper to extract coordinates if string has pattern "(lat, lng)"
function extractCoords(query: string): { lat: number; lng: number } | null {
  const regex = /\((-?\d+\.\d+),\s*(-?\d+\.\d+)\)/;
  const match = query.match(regex);
  if (match && match[1] && match[2]) {
    return {
      lat: parseFloat(match[1]),
      lng: parseFloat(match[2])
    };
  }
  return null;
}

// Find closest village coordinate match
function findVillageCoords(query: string): { lat: number; lng: number } {
  const q = query.toLowerCase();
  for (const [name, coords] of Object.entries(LOCAL_VILLAGES)) {
    if (q.includes(name)) {
      return coords;
    }
  }
  // Deterministic fallback based on hash of name
  let hash = 0;
  for (let i = 0; i < query.length; i++) {
    hash = query.charCodeAt(i) + ((hash << 5) - hash);
  }
  const latOffset = ((hash % 100) / 1000) * (hash % 2 === 0 ? 1 : -1);
  const lngOffset = (((hash >> 3) % 100) / 1000) * (hash % 3 === 0 ? 1 : -1);
  return {
    lat: 25.5787 + latOffset,
    lng: 83.5772 + lngOffset
  };
}

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number }> {
  if (!address || !address.trim()) {
    return LOCAL_VILLAGES.ghazipur;
  }

  // 1. Try to extract directly from parenthesis (e.g. current location)
  const directCoords = extractCoords(address);
  if (directCoords) {
    return directCoords;
  }

  // 2. Query real Google Maps Geocoding API if key is set
  if (API_KEY && API_KEY !== "YOUR_API_KEY") {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address + ", Ghazipur, Uttar Pradesh, India")}&key=${API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === "OK" && data.results?.[0]?.geometry?.location) {
        const loc = data.results[0].geometry.location;
        return { lat: loc.lat, lng: loc.lng };
      }
    } catch (error) {
      console.error("Geocoding API failed, falling back to local database:", error);
    }
  }

  // 3. Fallback to dictionary
  return findVillageCoords(address);
}

export interface RouteSegment {
  lat: number;
  lng: number;
}

export interface DirectionsResult {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  distanceKm: number;
  durationMin: number;
  path: RouteSegment[];
}

export async function computeDirections(originStr: string, destStr: string): Promise<DirectionsResult> {
  const originCoords = await geocodeAddress(originStr);
  const destCoords = await geocodeAddress(destStr);

  const directDist = calculateHaversineDistance(originCoords.lat, originCoords.lng, destCoords.lat, destCoords.lng);
  // Account for road winding factor
  const distanceKm = parseFloat((directDist > 0 ? directDist * 1.3 + 0.5 : 0).toFixed(1));
  const durationMin = Math.ceil(distanceKm * 2.2 + 2); // roughly 2.2 mins per km plus stop overheads

  // 1. Query real Google Maps Directions API if key is set
  if (API_KEY && API_KEY !== "YOUR_API_KEY") {
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originCoords.lat},${originCoords.lng}&destination=${destCoords.lat},${destCoords.lng}&key=${API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === "OK" && data.routes?.[0]) {
        const route = data.routes[0];
        const legs = route.legs?.[0];
        
        // Decoded polyline points
        const points: RouteSegment[] = [];
        if (route.overview_polyline?.points) {
          points.push(...decodePolyline(route.overview_polyline.points));
        }

        return {
          origin: originCoords,
          destination: destCoords,
          distanceKm: parseFloat(((legs?.distance?.value || 0) / 1000).toFixed(1)) || distanceKm,
          durationMin: Math.ceil((legs?.duration?.value || 0) / 60) || durationMin,
          path: points.length > 0 ? points : generateMockPath(originCoords, destCoords)
        };
      }
    } catch (error) {
      console.error("Directions API failed, falling back to local routing generator:", error);
    }
  }

  // 2. Generate a realistic-looking path with some curves for local visualization
  const path = generateMockPath(originCoords, destCoords);

  return {
    origin: originCoords,
    destination: destCoords,
    distanceKm,
    durationMin,
    path
  };
}

// Generate an interesting mock path with curves to make it look like a road instead of a straight line
function generateMockPath(start: { lat: number; lng: number }, end: { lat: number; lng: number }): RouteSegment[] {
  const steps = 15;
  const path: RouteSegment[] = [];
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat = start.lat + (end.lat - start.lat) * t;
    const lng = start.lng + (end.lng - start.lng) * t;
    
    // Add sinusoidal road wave in the middle segments
    let waveLat = 0;
    let waveLng = 0;
    if (i > 0 && i < steps) {
      const amplitude = 0.005; // degree offset (approx 500 meters)
      const phase = Math.sin(t * Math.PI); // max curve at the midpoint (t=0.5)
      waveLat = Math.sin(t * Math.PI * 3) * amplitude * phase;
      waveLng = Math.cos(t * Math.PI * 3) * amplitude * phase;
    }
    
    path.push({
      lat: lat + waveLat,
      lng: lng + waveLng
    });
  }
  
  return path;
}

// Polyline decoder for Google Maps polylines
function decodePolyline(encoded: string): RouteSegment[] {
  const points: RouteSegment[] = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    points.push({
      lat: lat / 1E5,
      lng: lng / 1E5
    });
  }
  return points;
}
