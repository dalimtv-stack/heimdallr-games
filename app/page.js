import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('s') || '';
  const tab = searchParams.get('tab') || 'novedades';

  const baseUrls = {
    novedades: 'https://fitgirl-repacks.site/',
    populares_mes: 'https://fitgirl-repacks.site/pop-repacks/',
    populares_ano: 'https://fitgirl-repacks.site/popular-repacks-of-the-year/',
    todos_az: 'https://fitgirl-repacks.site/all-my-repacks-a-z/',
  };

  let url = baseUrls[tab] || baseUrls.novedades;

  // Construcción de URL con paginación y búsqueda
  if (search) {
    const q = encodeURIComponent(search.trim().replace(/\s+/g, '+'));
    if (tab === 'todos_az') {
      url = page > 1
        ? `https://fitgirl-repacks.site/all-my-repacks-a-z/?lcp_page0=${page}#lcp_instance_0&s=${q}`
        : `https://fitgirl-repacks.site/all-my-repacks-a-z/?s=${q}`;
    } else {
      url = page > 1 ? `${baseUrls[tab]}page/${page}/?s=${q}` : `${baseUrls[tab]}?s=${q}`;
    }
  } else if (page > 1) {
    url = tab === 'todos_az'
      ? `https://fitgirl-repacks.site/all-my-repacks-a-z/?lcp_page0=${page}#lcp_instance_0`
      : `${baseUrls[tab]}page/${page}/`;
  }

  try {
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 20000,
    });
    const $ = cheerio.load(data);

    const games = [];

    // RECORREMOS DIRECTAMENTE CADA ARTICLE (así título e imagen están en el mismo bloque)
    $('article.post, article.type-post').each((_, el) => {
      const article = $(el);

      // Título y enlace
      const linkEl = article.find('h1.entry-title a, h2.entry-title a').first();
      if (!linkEl.length) return;

      const rawTitle = linkEl.text().trim();
      if (/upcoming repacks|updates digest/i.test(rawTitle)) return;

      const title = rawTitle.replace(/–\s*FitGirl Repack.*/i, '').trim();
      const postUrl = linkEl.attr('href');

      const idMatch = postUrl.match(/#(\d+)$/);
      const id = idMatch ? idMatch[1] : Date.now() + Math.random();

      // COVER: dentro del mismo article siempre está la imagen correcta
      let cover = 'https://via.placeholder.com/300x450/222/fff?text=No+Image';
      const img = article.find('.post-thumbnail img, img.wp-post-image, img[src*="imageban.ru"]').first();
      if (img.length) {
        let src = img.attr('src') || img.attr('data-src') || img.attr('data-lazy-src');
        if (src) {
          if (!src.startsWith('http')) src = 'https://fitgirl-repacks.site' + src;
          cover = src;
        }
      }

      games.push({ id, title, cover, postUrl });
    });

    const hasMore = games.length >= 10; // FitGirl suele tener 10-12 por página

    return NextResponse.json({ games: games.slice(0, 30), hasMore });
  } catch (error) {
    console.error('Scrape error:', error.message);
    return NextResponse.json({ games: [], hasMore: false });
  }
}
