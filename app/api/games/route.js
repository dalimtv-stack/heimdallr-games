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

    // FIXED: h1 para títulos (real FitGirl HTML)
    $('h1').each((i, el) => {
      const text = $(el).text().trim();
      if (!text) return;

      // FIXED: ID de link o metadata (si no, usa index como ID)
      const id = i + 1;  // Fallback ID secuencial
      const title = text.replace(/^\s*#?\d+\s*[–\-]?\s*/, '').trim();  // Limpia #ID si hay

      // FIXED: Cover de a[href*="riotpixels"] (en.riotpixels real)
      let coverLink = $(el).nextAll('a[href*="riotpixels.com"]').first().attr('href');
      let cover = 'https://via.placeholder.com/300x450/333/fff?text=' + encodeURIComponent(title.slice(0, 10));

      if (coverLink) {
        // FIXED: en.riotpixels.com/games/nombre/ → cover.jpg
        const base = coverLink.replace('en.', 'www.').split('/').slice(0, 5).join('/');
        cover = `${base}/cover.jpg`;
      }

      games.push({ id: String(id), title, cover });
    });

    const hasMore = games.length >= 10;  // FitGirl ~10 por página

    return NextResponse.json({ games: games.slice(0, 20), hasMore });
  } catch (error) {
    console.error('Scrape error:', error.message);
    return NextResponse.json({ games: [], hasMore: false });
  }
}
