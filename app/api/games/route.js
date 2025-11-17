import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const tab = searchParams.get('tab') || 'novedades';

  const base = {
    novedades: 'https://fitgirl-repacks.site/',
    populares_mes: 'https://fitgirl-repacks.site/pop-repacks/',
    populares_ano: 'https://fitgirl-repacks.site/popular-repacks-of-the-year/',
    todos_az: 'https://fitgirl-repacks.site/all-my-repacks-a-z/',
  };

  let url = base[tab] || base.novedades;
  if (page > 1 && tab !== 'todos_az') url += `page/${page}/`;
  if (page > 1 && tab === 'todos_az') url += `?lcp_page0=${page}#lcp_instance_0`;

  try {
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 20000,
    });
    const $ = cheerio.load(data);

    const games = [];

    // Cada juego está en un <article class="post">
    $('article.post').each((_, el) => {
      const article = $(el);

      // Título y enlace
      const link = article.find('h1.entry-title a, h2.entry-title a').first();
      if (!link.length) return;

      const rawTitle = link.text().trim();
      if (/upcoming|digest/i.test(rawTitle)) return;

      const title = rawTitle.replace(/–\s*FitGirl Repack.*/i, '').trim();
      const postUrl = link.attr('href') || '';

      // ID desde el # del enlace
      const id = postUrl.split('#')[1] || Date.now().toString();

      // COVER: la imagen está en el thumbnail del mismo article
      let cover = '';
      const img = article.find('img[src*="imageban.ru"]').first();
      if (img.length) {
        cover = img.attr('src') || img.attr('data-src') || img.attr('data-lazy-src') || '';
        if (cover && !cover.startsWith('http')) cover = 'https://fitgirl-repacks.site' + cover;
      }

      // Fallback si por algún motivo no hay imageban (raro pero posible)
      if (!cover) {
        cover = 'https://via.placeholder.com/300x450/222/fff?text=' + encodeURIComponent(title.slice(0, 15));
      }

      games.push({ id, title, cover, postUrl });
    });

    return NextResponse.json({
      games: games.slice(0, 30),
      hasMore: games.length >= 10
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ games: [], hasMore: false });
  }
}
