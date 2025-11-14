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
      timeout: 20000
    });

    const $ = cheerio.load(data);
    const games = [];

    $('h3').each((i, h3El) => {
      const idText = $(h3El).text().trim();
      let id = '';
      let title = '';

      // Main page: "### #5236 Updated Title"
      const mainMatch = idText.match(/^###\s*#(\d+)\s*(Updated\s+)?(.+)$/);
      if (mainMatch) {
        id = mainMatch[1];
        title = mainMatch[3].trim().replace(/\s*–\s*FitGirl Repack.*/i, '');
      } 
      // Search page: "#5236"
      else {
        const searchMatch = idText.match(/^#(\d+)$/);
        if (searchMatch) {
          id = searchMatch[1];
          const h1El = $(h3El).next('h1').first();
          if (h1El.length) {
            title = h1El.text().trim().replace(/\s*–\s*FitGirl Repack.*/i, '');
          }
        }
      }

      if (!id || !title) return;

      // Cover: riotpixels link + /cover.jpg
      const riotLink = $(h3El).nextAll('a[href*="riotpixels.com"]').first();
      let cover = 'https://via.placeholder.com/300x450/333/fff?text=' + encodeURIComponent(title.slice(0, 10));
      if (riotLink.length) {
        const link = riotLink.attr('href');
        if (link) {
          cover = link.replace(/\/$/, '') + '/cover.jpg';
        }
      }

      // Filter after scraping
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
