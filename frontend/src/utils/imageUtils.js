export function getDestinationImage(destination = '') {
  const norm = (destination || '').trim() || 'travel'
  // Using a dynamic seed to always get a unique but consistent image for a destination
  return `https://picsum.photos/seed/${encodeURIComponent(norm.toLowerCase())}/400/300`
}
