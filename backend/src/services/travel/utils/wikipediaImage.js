const https = require('https');
const cacheService = require('../../cache.service');
const travelLogger = require('./travelLogger');

const WIKI_API_BASE = 'https://en.wikipedia.org/w/api.php';

/**
 * Fetch and cache Wikipedia page images for an attraction.
 * 
 * @param {string} name - Attraction name
 * @param {string} [wikiTag] - wikipedia tag from OSM e.g. "en:Hawa Mahal"
 * @returns {Promise<string|null>} The image URL or null
 */
async function fetchWikiImage(name, wikiTag) {
  if (!name) return null;

  // Try static cache first
  const cacheKey = `wiki:img:${(wikiTag || name).toLowerCase().trim()}`;
  try {
    const cached = await cacheService.getByNs('attractions:detail', cacheKey);
    if (cached) {
      travelLogger.cache('Wikipedia', 'HIT', 'attractions:detail', { key: cacheKey });
      return cached;
    }
  } catch (err) {
    // Ignore cache lookup errors
  }

  // Strict timeout to prevent search delays
  const timeoutMs = 1500;

  try {
    let title = name;
    if (wikiTag && wikiTag.includes(':')) {
      const parts = wikiTag.split(':');
      if (parts[0] === 'en' && parts[1]) {
        title = parts[1];
      }
    }

    // Step 1: Direct query by Wikipedia page title
    const imgUrl = await new Promise((resolve) => {
      const url = `${WIKI_API_BASE}?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&piprop=thumbnail&pithumbsize=500&redirects=1`;
      
      const req = https.get(url, { headers: { 'User-Agent': 'TripSetGo/1.0 (contact@tripsetgo.app)' } }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            const pages = data?.query?.pages;
            if (pages) {
              const page = Object.values(pages)[0];
              if (page?.thumbnail?.source) {
                return resolve(page.thumbnail.source);
              }
            }
            resolve(null);
          } catch {
            resolve(null);
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });
      req.on('error', () => {
        resolve(null);
      });
      req.setTimeout(timeoutMs);
    });

    if (imgUrl) {
      try {
        await cacheService.set('attractions:detail', cacheKey, imgUrl, 604800); // cache for 7 days
      } catch {}
      return imgUrl;
    }

    // Step 2: Fallback query search generator
    const fallbackUrl = `${WIKI_API_BASE}?action=query&generator=search&gsrsearch=${encodeURIComponent(name)}&gsrlimit=1&prop=pageimages&piprop=thumbnail&pithumbsize=500&format=json`;
    
    const fallbackImg = await new Promise((resolve) => {
      const req = https.get(fallbackUrl, { headers: { 'User-Agent': 'TripSetGo/1.0 (contact@tripsetgo.app)' } }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            const pages = data?.query?.pages;
            if (pages) {
              const page = Object.values(pages)[0];
              if (page?.thumbnail?.source) {
                return resolve(page.thumbnail.source);
              }
            }
            resolve(null);
          } catch {
            resolve(null);
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });
      req.on('error', () => {
        resolve(null);
      });
      req.setTimeout(timeoutMs);
    });

    if (fallbackImg) {
      try {
        await cacheService.set('attractions:detail', cacheKey, fallbackImg, 604800);
      } catch {}
      return fallbackImg;
    }
  } catch (err) {
    travelLogger.warn('Wikipedia', `Failed to fetch Wikipedia image for "${name}": ${err.message}`);
  }

  return null;
}

module.exports = { fetchWikiImage };
