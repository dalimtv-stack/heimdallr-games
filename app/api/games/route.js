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
    url = `https://fitgirl-repacks.site/?s=${encodeURIComponent(search.replace(/\s+/g, '+'))}`;
  } else if (page > 1) {
    url = `https://fitgirl-repacks.site/page/${page}/`;
  }

  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 15000
    });

    const $ = cheerio.load(data);
    const games = [];

    // FIXED: h3 para títulos #ID (nuevo HTML FitGirl)
    $('h3').each((i, el) => {
      const text = $(el).text().trim();
      // FIXED: Regex maneja "Updated" / cualquier texto después de #ID
      const match = text.match(/^#(\d+)\s*(Updated\s*)?(.+)$/);
      if (!match) return;

      const id = match[1];
      const title = match[3].trim();

      // FIXED: Covers de riotpixels links (primer a[href*="riotpixels"])
      let cover = $(el).nextAll('a[href*="riotpixels.com"]').first().attr('href');
      if (cover) {
        cover = cover.replace('en.', 'www.') + '/cover.jpg';  // Añade /cover.jpg para imagen
      }
      if (!cover || !cover.startsWith('http')) {
        cover = 'https://via.placeholder.com/300x450/1a1a1a/ffffff?text=' + encodeURIComponent(title.slice(0,15));
      }

      games.push({ id, title, cover });
    });

    return NextResponse.json({ games: games.slice(0, 24), hasMore: games.length >= 24 });
  } catch (error) {
    console.error('Scrape error:', error.message);
    return NextResponse.json({ games: [], hasMore: false, error: error.message }, { status: 500 });
  }
}
