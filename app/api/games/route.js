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

    $('article.post').each((_, el) => {
      const article = $(el);

      const link = article.find('h1.entry-title a, h2.entry-title a').first();
      if (!link.length) return;

      const rawTitle = link.text().trim();
      if (/upcoming|digest/i.test(rawTitle)) return;

      const title = rawTitle.replace(/–\s*FitGirl Repack.*/i, '').trim();
      const postUrl = link.attr('href') || '';

      // ID estable basado en hash del postUrl
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

    // Detección de paginación real
    let hasMore = false;
    if (tab === 'todos_az') {
      // En el listado A-Z, el plugin usa enlaces con lcp_page
      hasMore = $('a[href*="lcp_page0"]').length > 0;
    } else {
      hasMore = $('.pagination .next').length > 0;
    }

    return NextResponse.json({
      games,
      hasMore
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ games: [], hasMore: false });
  }
}
