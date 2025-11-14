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

    // FIXED: $('h3') para "#ID Updated/Title" (HTML real FitGirl)
    $('h3').each((i, el) => {
      const text = $(el).text().trim();
      // FIXED: Regex exacto: #\d+ (Updated\s+)? Title
      const match = text.match(/^#(\d+)\s*(Updated\s+)?(.+)$/);
      if (!match) return;

      const id = match[1];
      const title = match[3].trim().replace(/\s*–\s*FitGirl Repack.*/i, '');

      // FIXED: Primer <a href="https://en.riotpixels.com/games/nombre/"> después del h3 → usa src de <img> dentro
      const riotLink = $(el).nextAll('a[href*="riotpixels.com"]').first();
      let cover = 'https://via.placeholder.com/300x450/333/fff?text=' + encodeURIComponent(title.slice(0,12));

      if (riotLink.length) {
        const imgSrc = riotLink.find('img').attr('src');
        cover = imgSrc || riotLink.attr('href');
        if (imgSrc && !imgSrc.startsWith('http')) cover = 'https://fitgirl-repacks.site/' + imgSrc;
      }

      games.push({ id, title, cover });
    });

    // FIXED: hasMore si encuentra >=10 juegos (FitGirl ~10-15/página)
    const hasMore = games.length >= 10;

    return NextResponse.json({ games: games.slice(0, 20), hasMore });
  } catch (error) {
    console.error('Scrape error:', error.message);
    return NextResponse.json({ games: [], hasMore: false });
  }
}
