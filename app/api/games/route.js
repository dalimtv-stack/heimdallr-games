import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import crypto from 'crypto';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const tab = searchParams.get('tab') || 'novedades';
  const searchQuery = searchParams.get('search')?.trim();

  const base = {
    novedades: 'https://fitgirl-repacks.site/',
    populares_mes: 'https://fitgirl-repacks.site/pop-repacks/',
    populares_ano: 'https://fitgirl-repacks.site/popular-repacks-of-the-year/',
    todos_az: 'https://fitgirl-repacks.site/all-my-repacks-a-z/',
  };

  let url = base[tab] || base.novedades;

  // ==================== BÚSQUEDA REAL (nueva) ====================
  if (tab === 'buscador' && searchQuery) {
    if (page === 1) {
      url = `https://fitgirl-repacks.site/?s=${encodeURIComponent(searchQuery)}`;
    } else {
      url = `https://fitgirl-repacks.site/page/${page}/?s=${encodeURIComponent(searchQuery)}`;
    }
  } else {
    // Resto de pestañas (tu lógica original)
    if (page > 1 && tab !== 'todos_az') url += `page/${page}/`;
    if (page > 1 && tab === 'todos_az') url += `?lcp_page0=${page}#lcp_instance_0`;
  }

  try {
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 20000,
    });
    const $ = cheerio.load(data);
    const games = [];

    // ==================== FUNCIÓN DE FILTRADO (solo para excluir anuncios) ====================
    const isNotAGamePost = (title, postUrl = '') => {
      const lower = title.toLowerCase();
      return (
        lower.includes('call for donations') ||
        lower.includes('genesis order') ||
        lower.includes('honey select') ||
        lower.includes('site update') ||
        lower.includes('fitgirl repacks status') ||
        lower.includes('maintenance') ||
        lower.includes('digest') ||
        title.includes('→') ||
        postUrl.includes('/a-call-for-donations')
      );
    };

    // ==================== POPULARES DEL MES ====================
    if (tab === 'populares_mes') {
      const monthWidget = $('h2.widgettitle:contains("Most Popular Repacks of the Month")')
        .closest('.jetpack_top_posts_widget')
        .find('div.widget-grid-view-image');
      monthWidget.each((_, el) => {
        const container = $(el);
        const link = container.find('a').first();
        const img = container.find('img').first();
        if (!link.length || !img.length) return;
        const postUrl = link.attr('href');
        if (!postUrl?.includes('fitgirl-repacks.site')) return;
        let title = link.attr('title') || img.attr('alt') || 'Unknown Game';
        title = title.replace(/–\s*FitGirl Repack.*/i, '').trim();

        // ← FILTRO AQUÍ
        if (isNotAGamePost(title, postUrl)) return;

        let cover = img.attr('src') || '';
        if (cover.includes('?resize=')) cover = cover.split('?resize=')[0];
        const id = crypto.createHash('md5').update(postUrl).digest('hex');
        games.push({ id, title, cover, postUrl });
      });
      return NextResponse.json({ games, hasMore: false });
    }

    // ==================== POPULARES DEL AÑO ====================
    if (tab === 'populares_ano') {
      const yearWidget = $('h2.widgettitle:contains("Top 150 Repacks of the Year")')
        .closest('.jetpack_top_posts_widget')
        .find('div.widget-grid-view-image');
      yearWidget.each((_, el) => {
        const container = $(el);
        const link = container.find('a').first();
        const img = container.find('img').first();
        if (!link.length || !img.length) return;
        const postUrl = link.attr('href');
        if (!postUrl?.includes('fitgirl-repacks.site')) return;
        let title = link.attr('title') || img.attr('alt') || 'Unknown Game';
        title = title.replace(/–\s*FitGirl Repack.*/i, '').trim();

        // ← FILTRO AQUÍ
        if (isNotAGamePost(title, postUrl)) return;

        let cover = img.attr('src') || '';
        if (cover.includes('?resize=')) cover = cover.split('?resize=')[0];
        const id = crypto.createHash('md5').update(postUrl).digest('hex');
        games.push({ id, title, cover, postUrl });
      });
      const hasMore = $('.pagination .next').length > 0;
      return NextResponse.json({ games, hasMore });
    }

    // ==================== BÚSQUEDA + NOVEDADES + A-Z ====================
    if (tab === 'todos_az') {
      $('#lcp_instance_0 li a').each((_, el) => {
        const a = $(el);
        const postUrl = a.attr('href');
        if (!postUrl || !postUrl.includes('fitgirl-repacks.site')) return;
        let title = a.text().trim();
        title = title.replace(/–\s*FitGirl Repack.*/i, '').trim();

        // ← FILTRO AQUÍ
        if (isNotAGamePost(title, postUrl)) return;

        const id = crypto.createHash('md5').update(postUrl).digest('hex');
        games.push({ id, title, cover: '', postUrl });
      });
    } else {
      // NOVEDADES + BÚSQUEDA
      $('article.post').each((_, el) => {
        const article = $(el);
        const link = article.find('h1.entry-title a, h2.entry-title a').first();
        if (!link.length) return;
        const rawTitle = link.text().trim();
        if (/upcoming|digest/i.test(rawTitle)) return;
        const title = rawTitle.replace(/–\s*FitGirl Repack.*/i, '').trim();
        const postUrl = link.attr('href') || '';

        // ← FILTRO AQUÍ (principal para novedades y búsqueda)
        if (isNotAGamePost(title, postUrl)) return;

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
          cover = 'https://dummyimage.com/300x450/000000/ffffff.png&text=' + encodeURIComponent(title.slice(0, 15));
        }
        games.push({ id, title, cover, postUrl });
      });
    }

    // Paginación unificada
    let hasMore = false;
    if (tab === 'todos_az') {
      hasMore = $('a[href*="lcp_page0"]').length > 0;
    } else {
      hasMore = $('.pagination .next').length > 0;
    }

    return NextResponse.json({ games, hasMore });
  } catch (err) {
    console.error('Error en /api/games:', err.message);
    return NextResponse.json({ games: [], hasMore: false });
  }
}
