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
      timeout: 20000
    });

    const $ = cheerio.load(data);
    const games = [];

    // Recorre cada h3 (donde está #ID)
    $('h3').each((i, h3El) => {
      const h3Text = $(h3El).text().trim();
      const idMatch = h3Text.match(/^#(\d+)/);
      if (!idMatch) return;

      const id = idMatch[1];

      // Título desde h1 siguiente (o fallback)
      let title = '';
      const h1El = $(h3El).nextAll('h1').first();
      if (h1El.length) {
        title = h1El.text().trim().replace(/\s*–\s*FitGirl Repack.*/i, '');
      } else {
        title = h3Text.replace(/^#\d+\s*/, '').trim().replace(/\s*–\s*FitGirl Repack.*/i, '');
      }

      // Cover: riotpixels link + /cover.jpg (SIEMPRE funciona)
      let cover = 'https://via.placeholder.com/300x450/333/fff?text=' + encodeURIComponent(title.slice(0, 10));
      const riotLink = $(h3El).nextAll('a[href*="riotpixels.com"]').first().attr('href');
      if (riotLink) {
        cover = riotLink.replace(/\/$/, '') + '/cover.jpg';
      }

      // Filtro búsqueda
      if (search && !title.toLowerCase().includes(search.toLowerCase().trim())) return;

      games.push({ id, title, cover });
    });

    const hasMore = games.length >= 5;

    return NextResponse.json({ games: games.slice(0, 20), hasMore });
  } catch (error) {
    console.error('Scrape error:', error.message);
    return NextResponse.json({ games: [], hasMore: false });
  }
}
