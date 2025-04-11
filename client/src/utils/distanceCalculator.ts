/**
 * Utility functions for calculating distances between coordinates
 */

/**
 * Calculate the distance between two points on Earth using the Haversine formula.
 * 
 * @param lat1 Latitude of the first point in decimal degrees
 * @param lon1 Longitude of the first point in decimal degrees
 * @param lat2 Latitude of the second point in decimal degrees
 * @param lon2 Longitude of the second point in decimal degrees
 * @returns Distance in kilometers
 */
export function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  // Earth radius in kilometers
  const R = 6371;
  
  // Convert latitude and longitude from degrees to radians
  const dLat = degToRad(lat2 - lat1);
  const dLon = degToRad(lon2 - lon1);
  
  // Calculate haversine formula
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degToRad(lat1)) * Math.cos(degToRad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  // Calculate the distance
  const distance = R * c;
  
  // Round to 2 decimal places
  return Math.round(distance);
}

/**
 * Convert degrees to radians
 * 
 * @param degrees Angle in degrees
 * @returns Angle in radians
 */
function degToRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate straight-line distance between two points using Euclidean distance.
 * This is less accurate than Haversine for geographic coordinates but simpler.
 * 
 * @param lat1 Latitude of the first point
 * @param lon1 Longitude of the first point
 * @param lat2 Latitude of the second point
 * @param lon2 Longitude of the second point
 * @returns Approximate distance
 */
export function calculateEuclideanDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  // This is a very rough approximation
  // 1 degree of latitude = ~111 km
  // 1 degree of longitude = ~111 km * cos(latitude)
  
  const latDiff = (lat2 - lat1) * 111;
  const avgLat = (lat1 + lat2) / 2;
  const lonDiff = (lon2 - lon1) * 111 * Math.cos(degToRad(avgLat));
  
  return Math.sqrt(latDiff * latDiff + lonDiff * lonDiff);
}

/**
 * Adjust straight-line distance to account for road networks.
 * 
 * @param directDistance The straight-line distance
 * @param terrainType The type of terrain (urban, rural, mixed)
 * @returns Adjusted distance accounting for roads
 */
export function adjustDistanceForRoads(directDistance: number, terrainType: 'urban' | 'rural' | 'mixed' = 'mixed'): number {
  // Adjustment factors based on terrain type
  const factors = {
    urban: 1.5,    // Cities have more winding roads
    rural: 1.3,    // Rural areas are more direct but still not straight
    mixed: 1.4     // A mix of urban and rural
  };
  
  return directDistance * factors[terrainType];
}

/**
 * Format a distance value for display
 * 
 * @param distanceKm Distance in kilometers
 * @param format Display format ('short' or 'long')
 * @returns Formatted distance string
 */
export function formatDistance(distanceKm: number, format: 'short' | 'long' = 'long'): string {
  if (format === 'short') {
    return `${distanceKm.toFixed(0)} km`;
  } else {
    return `${distanceKm.toFixed(0)} quilômetros`;
  }
}