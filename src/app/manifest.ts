import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ED LUX GIFTS',
    short_name: 'ED LUX',
    description: 'Paniers-cadeaux élégants à Pointe-Claire / Elegant gift baskets in Pointe-Claire',
    start_url: '/',
    display: 'standalone',
    background_color: '#FAF5EC',
    theme_color: '#06271E',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
