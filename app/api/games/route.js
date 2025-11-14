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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 20000
    });

    const $ = cheerio.load(data);
    const games = [];

    // FIXED: h3 para ID (#5236), siguiente h1 a para title
    $('h3').each((i, idEl) => {
      const idText = $(idEl).text().trim();
      const idMatch = idText.match(/^#(\d+)$/);
      if (!idMatch) return;
      const id = idMatch[1];

      // Siguiente h1 a para title
      const titleEl = $(idEl).next('h1').find('a').first();
      if (!titleEl.length) return;
      let title = titleEl.text().trim().replace(/\s*–\s*FitGirl Repack.*/i, '');

      // FIXED: Cover de a[href*="riotpixels"] después del h1
      const riotLink = titleEl.closest('article').find('a[href*="riotpixels.com"]').first();
      let cover = 'https://via.placeholder.com/300x450/333/fff?text=' + encodeURIComponent(title.slice(0,12));

      if (riotLink.length) {
        let coverLink = riotLink.attr('href');
        if (coverLink) {
          // FIXED: en.riotpixels.com/games/slug/ → en.riotpixels.com/games/slug/cover.jpg
          cover = coverLink.replace(/\/$/, '') + '/cover.jpg';
        }
      }

      // Filtro búsqueda (si search, check title)
      if (search && !title.toLowerCase().includes(search.toLowerCase())) return;

      games.push({ id, title, cover });
    });

    const hasMore = games.length >= 10;

    return NextResponse.json({ games: games.slice(0, 20), hasMore });
  } catch (error) {
    console.error('Scrape error:', error.message);
    return NextResponse.json({ games: [], hasMore: false });
  }
}
