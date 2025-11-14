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

    // FIXED: h3 para ID ( "### #5236 Updated Title" ), h1 para title link
    $('h3').each((i, h3El) => {
      const idText = $(h3El).text().trim();
      // FIXED: Regex para "### #\d+ (Updated )?Title"
      const idMatch = idText.match(/^###\s*#(\d+)\s*(Updated\s+)?(.+)$/);
      if (!idMatch) return;

      const id = idMatch[1];
      let title = idMatch[3].trim().replace(/\s*–\s*FitGirl Repack.*/i, '');

      // FIXED: Siguiente h1 para confirmar title (opcional, usa del h3 si no)
      const h1El = $(h3El).next('h1').find('a').first();
      if (h1El.length) title = h1El.text().trim();

      // FIXED: Cover de img src con riotpixels (o link base + /cover.jpg)
      let cover = 'https://via.placeholder.com/300x450/333/fff?text=' + encodeURIComponent(title.slice(0,12));
      const riotImg = $(h3El).nextAll('img[src*="riotpixels.com"]').first();
      if (riotImg.length) {
        cover = riotImg.attr('src');
      } else {
        const riotLink = $(h3El).nextAll('a[href*="riotpixels.com"]').first().attr('href');
        if (riotLink) {
          // FIXED: Base URL + /cover.jpg
          cover = riotLink.replace(/\/$/, '') + '/cover.jpg';
        }
      }

      // FIXED: Filtro búsqueda en title
      if (search && !title.toLowerCase().includes(search.toLowerCase().trim())) return;

      games.push({ id, title, cover });
    });

    // FIXED: hasMore si >=3 juegos (FitGirl latest ~3-5 en portada)
    const hasMore = games.length >= 3;

    return NextResponse.json({ games: games.slice(0, 20), hasMore });
  } catch (error) {
    console.error('Scrape error:', error.message);
    return NextResponse.json({ games: [], hasMore: false });
  }
}
