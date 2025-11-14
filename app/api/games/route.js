// app/api/games/route.js
import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('s') || '';

  let url = 'https://fitgirl-repacks.site/';
  if (search) {
    url = `https://fitgirl-repacks.site/?s=${encodeURIComponent(search.trim().replace(/\s+/g, '+'))}`;
  } else if (page > 1) {
    url = `https://fitgirl-repacks.site/page/${page}/`;
  }

  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000
    });

    const $ = cheerio.load(data);
    const games = [];

    // FIXED: h3 + clase .entry-title (FitGirl actual)
    $('h3.entry-title, h3').each((i, el) => {
      const text = $(el).text().trim();
      const match = text.match(/^#(\d+)\s*(Updated\s*)?(.+)$/);
      if (!match) return;

      const id = match[1];
      let title = match[3].trim();

      // FIXED: Quitar "Repack" si está al final
      title = title.replace(/\s*–\s*FitGirl Repack.*$/i, '').trim();

      // FIXED: Cover - busca link riotpixels y fuerza /cover.jpg
      let coverLink = $(el).nextAll('a[href*="riotpixels.com"]').first().attr('href');
      let cover = 'https://via.placeholder.com/300x450/1a1a1a/ffffff?text=' + encodeURIComponent(title.slice(0, 15));

      if (coverLink) {
        // Convertir en.riotpixels.com → www.riotpixels.com/cover.jpg
        const base = coverLink.replace('en.', 'www.').split('/').slice(0, 5).join('/');
        cover = `${base}/cover.jpg`;
      }

      games.push({ id, title, cover });
    });

    const hasMore = games.length >= 12; // 12 por página en FitGirl

    return NextResponse.json({
      games: games.slice(0, 24),
      hasMore
    });
  } catch (error) {
    console.error('Scrape error:', error.message);
    return NextResponse.json({ games: [], hasMore: false });
  }
}
