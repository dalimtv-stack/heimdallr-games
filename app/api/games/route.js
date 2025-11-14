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

    $('h1').each((i, el) => {
      const text = $(el).text().trim();
      if (!text) return;

      // FIXED: Solo juegos (contiene "v" versión o "Edition"/"DLC" repack)
      if (!text.match(/v\d+\.?\d*|Edition|DLC|Bonus/)) return;

      let id = i + 1;  // FIXED: let para permitir reasignación
      let title = text.replace(/^\s*#?\d+\s*[–\-]?\s*/, '').trim();

      // FIXED: ID real de siguiente h3 si existe
      const h3El = $(el).next('h3').first();
      if (h3El.length) {
        const idMatch = h3El.text().trim().match(/^#(\d+)/);
        if (idMatch) id = idMatch[1];
      }

      // FIXED: Cover - riotpixels link + /cover.jpg (funciona en main y search)
      let coverLink = $(el).nextAll('a[href*="riotpixels.com"]').first().attr('href');
      let cover = 'https://via.placeholder.com/300x450/333/fff?text=' + encodeURIComponent(title.slice(0, 10));

      if (coverLink) {
        cover = coverLink.replace(/\/$/, '') + '/cover.jpg';
      }

      // FIXED: Filtro búsqueda DESPUÉS de scrape
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
