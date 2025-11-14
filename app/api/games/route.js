// app/api/games/route.js
import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';  // FIXED: * as cheerio

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('s') || '';

  let url = 'https://fitgirl-repacks.site/';
  if (search) {
    url = `https://fitgirl-repacks.site/?s=${encodeURIComponent(search.replace(/\s+/g, '+'))}`;  // FIXED: Espacios a +
  } else if (page > 1) {
    url = `https://fitgirl-repacks.site/page/${page}/`;
  }

  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Steam Deck) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 15000  // FIXED: Más tiempo para scrape
    });

    const $ = cheerio.load(data);
    const games = [];

    $('h1, h2').each((i, el) => {
      const text = $(el).text().trim();
      const match = text.match(/^#(\d+)\s*[––-]\s*(.+)$/);  // FIXED: Mejor regex para – o -
      if (!match) return;

      const id = match[1];
      const title = match[2].trim();

      // Carátula: Busca mejor
      let cover = $(el).nextAll('a[href*="riotpixels.com"]').first().find('img').attr('src') || 
                  $(el).nextAll('img.wp-post-image').first().attr('src') ||
                  $(el).nextAll('img').first().attr('src');
      if (cover && !cover.startsWith('http')) cover = 'https://fitgirl-repacks.site/' + cover;
      if (!cover || !cover.startsWith('http')) {
        cover = 'https://via.placeholder.com/300x450/1a1a1a/ffffff?text=No+Cover';
      }

      games.push({ id, title, cover });
    });

    const hasMore = games.length >= 20;  // FIXED: Ajuste realista

    return NextResponse.json({ games, hasMore });
  } catch (error) {
    console.error('Scrape error:', error.message);  // FIXED: Log para Vercel
    return NextResponse.json({ games: [], hasMore: false, error: error.message }, { status: 500 });
  }
}
