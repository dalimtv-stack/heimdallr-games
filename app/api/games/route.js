import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

// Función para obtener la carátula real desde la página individual del juego
async function getRealCover(postUrl) {
  try {
    const { data } = await axios.get(postUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 12000,
    });
    const $ = cheerio.load(data);

    // 1. og:image → siempre está y es la carátula perfecta
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage) return ogImage;

    // 2. Imagen destacada del post
    const featured = $('article img.wp-post-image, article img.size-full').first().attr('src');
    if (featured) {
      return featured.startsWith('http') ? featured : `https://fitgirl-repacks.site${featured}`;
    }

    // 3. Fallback riotpixels/cover.jpg
    const riotLink = $('a[href*="riotpixels.com"]').first().attr('href');
    if (riotLink) return riotLink.replace(/\/$/, '') + '/cover.jpg';

    return null;
  } catch (err) {
    return null;
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('s') || '';
  const tab = searchParams.get('tab') || 'novedades'; // Novedades por defecto

  // URLs base por pestaña
  const baseUrls = {
    novedades: 'https://fitgirl-repacks.site/',
    populares_mes: 'https://fitgirl-repacks.site/pop-repacks/',
    populares_ano: 'https://fitgirl-repacks.site/popular-repacks-of-the-year/',
    todos_az: 'https://fitgirl-repacks.site/all-my-repacks-a-z/',
  };

  let url = baseUrls[tab] || baseUrls.novedades;

  if (search) {
    const encodedSearch = encodeURIComponent(search.trim().replace(/\s+/g, '+'));
    if (tab === 'todos_az') {
      // Paginación especial para A-Z: ?lcp_page0=N#s
      if (page > 1) {
        url = `https://fitgirl-repacks.site/all-my-repacks-a-z/?lcp_page0=${page}#lcp_instance_0&s=${encodedSearch}`;
      } else {
        url = `https://fitgirl-repacks.site/all-my-repacks-a-z/?s=${encodedSearch}`;
      }
    } else {
      if (page > 1) {
        url = `${baseUrls[tab]}page/${page}/?s=${encodedSearch}`;
      } else {
        url = `${baseUrls[tab]}?s=${encodedSearch}`;
      }
    }
  } else if (page > 1) {
    if (tab === 'todos_az') {
      url = `https://fitgirl-repacks.site/all-my-repacks-a-z/?lcp_page0=${page}#lcp_instance_0`;
    } else {
      url = `${baseUrls[tab]}page/${page}/`;
    }
  }

  try {
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 20000,
    });
    const $ = cheerio.load(data);
    const tempGames = [];

    // FIXED: Selectores actualizados para HTML de noviembre 2025 (h2.entry-title para títulos, img en post-thumbnail)
    $('article.post, div.post-item').each((i, el) => {
      const linkEl = $(el).find('h1.entry-title a, h2.entry-title a').first();
      if (!linkEl.length) return;

      const rawTitle = linkEl.text().trim();
      if (rawTitle.toLowerCase().includes('upcoming repacks')) return;
      if (rawTitle.toLowerCase().startsWith('updates digest')) return;

      const title = rawTitle.replace(/\s*–\s*FitGirl Repack.*/i, '');
      const postUrl = linkEl.attr('href');
      const idMatch = postUrl.match(/#(\d+)$/);
      const id = idMatch ? idMatch[1] : String(i + 1);

      tempGames.push({ id, title, postUrl });
    });

    const games = [];
    const isSearch = !!search;

    for (const game of tempGames) {
      let cover = 'https://via.placeholder.com/300x450/333/fff?text=' + encodeURIComponent(game.title.slice(0, 10));

      if (isSearch) {
        // En búsqueda → sacamos la carátula real del post individual
        const realCover = await getRealCover(game.postUrl);
        if (realCover) cover = realCover;
      } else {
        // En página principal → miniatura rápida (como siempre)
        const article = $(`a[href="${game.postUrl}"]`).closest('article, div.post-item');
        const imgEl = article.find('img[src*="imageban.ru"], img[src*="riotpixels.com"], img.wp-post-image').first();
        if (imgEl.length) {
          let src = imgEl.attr('src');
          if (src && !src.startsWith('http')) src = 'https://fitgirl-repacks.site' + src;
          cover = src;
        }
      }

      if (isSearch && !game.title.toLowerCase().includes(search.toLowerCase().trim())) continue;

      games.push({ id: game.id, title: game.title, cover, postUrl: game.postUrl });
    }

    const hasMore = games.length >= 5;

    return NextResponse.json({ games: games.slice(0, 20), hasMore });
  } catch (error) {
    console.error('Scrape error:', error.message);
    return NextResponse.json({ games: [], hasMore: false });
  }
}
