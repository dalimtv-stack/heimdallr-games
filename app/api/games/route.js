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
    const allGames = [];  // FIXED: Scrapea todo primero

    // FIXED: Scrapea TODOS los article.post (main y search tienen misma estructura)
    $('article.post').each((i, el) => {
      const linkEl = $(el).find('h1.entry-title a').first();
      if (!linkEl.length) return;

      const postUrl = linkEl.attr('href');
      const title = linkEl.text().trim().replace(/\s*–\s*FitGirl Repack.*/i, '');

      // ID desde # en URL
      const idMatch = postUrl.match(/#(\d+)$/);
      const id = idMatch ? idMatch[1] : String(i + 1);

      // TU LÓGICA DE IMÁGENES (sin cambios — funciona en main y search)
      let cover = 'https://via.placeholder.com/300x450/333/fff?text=' + encodeURIComponent(title.slice(0, 10));
      const imgEl = $(el).find('a[href*="riotpixels.com"] img').first();
      if (imgEl.length) {
        let src = imgEl.attr('src');
        if (src && !src.startsWith('http')) {
          src = 'https://fitgirl-repacks.site' + src;
        }
        cover = src;
      }

      // FIXED: Añade a lista temporal (sin filtro aún)
      allGames.push({ id, title, cover });
    });

    // FIXED: Filtro búsqueda DESPUÉS de scrape (ahora extrae covers ANTES)
    const games = search ? allGames.filter(game => 
      game.title.toLowerCase().includes(search.toLowerCase().trim())
    ) : allGames;

    const hasMore = games.length >= 5;

    return NextResponse.json({ games: games.slice(0, 20), hasMore });
  } catch (error) {
    console.error('Scrape error:', error.message);
    return NextResponse.json({ games: [], hasMore: false });
  }
}
