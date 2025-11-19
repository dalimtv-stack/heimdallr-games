import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import crypto from 'crypto';

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

    // POPULARES DEL MES → extracción simple de enlaces directos (sin imágenes)
    if (tab === 'populares_mes') {
      $('a[href*="/"]').each((_, el) => {
        const link = $(el);
        const postUrl = link.attr('href');
        if (!postUrl || !postUrl.includes('fitgirl-repacks.site')) return;
    
        // Título: del slug del URL o texto del link
        let title = link.text().trim() || postUrl.split('/').pop() || 'Unknown Game';
        title = title.replace(/–\s*FitGirl Repack.*/i, '').replace(/-/g, ' ').trim();
    
        // Cover: placeholder (esta página no tiene imágenes, se carga en details)
        const cover = 'https://via.placeholder.com/300x450/222/fff?text=' + encodeURIComponent(title.slice(0, 15));
    
        const id = crypto.createHash('md5').update(postUrl).digest('hex');
        games.push({ id, title, cover, postUrl });
      });
    
      // No tiene paginación → siempre 50 juegos
      return NextResponse.json({ games, hasMore: false });
    }

    // TU CÓDIGO ORIGINAL SIN TOCAR (para novedades, año, A-Z, etc.)
    $('article.post').each((_, el) => {
      const article = $(el);
      const link = article.find('h1.entry-title a, h2.entry-title a').first();
      if (!link.length) return;

      const rawTitle = link.text().trim();
      if (/upcoming|digest/i.test(rawTitle)) return;

      const title = rawTitle.replace(/–\s*FitGirl Repack.*/i, '').trim();
      const postUrl = link.attr('href') || '';

      const id = postUrl
        ? crypto.createHash('md5').update(postUrl).digest('hex')
        : Date.now().toString();

      let cover = '';
      const img = article.find('img').first();
      if (img.length) {
        cover = img.attr('src') || img.attr('data-src') || img.attr('data-lazy-src') || '';
        if (cover && !cover.startsWith('http')) cover = 'https://fitgirl-repacks.site' + cover;
      }
      if (!cover) {
        cover = 'https://via.placeholder.com/300x450/222/fff?text=' + encodeURIComponent(title.slice(0, 15));
      }

      games.push({ id, title, cover, postUrl });
    });

    let hasMore = false;
    if (tab === 'todos_az') {
      hasMore = $('a[href*="lcp_page0"]').length > 0;
    } else {
      hasMore = $('.pagination .next').length > 0;
    }

    return NextResponse.json({ games, hasMore });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ games: [], hasMore: false });
  }
}
