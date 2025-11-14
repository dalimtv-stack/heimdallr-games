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

    // FIXED: $('h3') para "### #ID Updated Title" (HTML real)
    $('h3').each((i, el) => {
      const text = $(el).text().trim();
      // FIXED: Regex exacto para "### #\d+ Updated? Title"
      const match = text.match(/^###\s*#(\d+)\s*(Updated\s+)?(.+)$/);
      if (!match) return;

      const id = match[1];
      let title = match[3].trim().replace(/\s*–\s*FitGirl Repack.*/i, '');

      // FIXED: Cover - siguiente a[href*="riotpixels"] + /cover.jpg
      const riotLink = $(el).next('a[href*="riotpixels.com"]').first();
      let cover = 'https://via.placeholder.com/300x450/333/fff?text=' + encodeURIComponent(title.slice(0,12));

      if (riotLink.length) {
        let coverLink = riotLink.attr('href');
        if (coverLink) {
          cover = coverLink.replace(/\/$/, '') + '/cover.jpg';
        }
      }

      // FIXED: Filtro búsqueda
      if (search && !title.toLowerCase().includes(search.toLowerCase().trim())) return;

      games.push({ id, title, cover });
    });

    const hasMore = games.length >= 5;  // Portada ~5 juegos

    return NextResponse.json({ games: games.slice(0, 20), hasMore });
  } catch (error) {
    console.error('Scrape error:', error.message);
    return NextResponse.json({ games: [], hasMore: false });
  }
}
