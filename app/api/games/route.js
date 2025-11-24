import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import crypto from 'crypto';

// ──────────────────────────────────────────────────────────────
// Función de utilidad para filtrar posts no deseados (ADULTOS, ANUNCIOS)
// ──────────────────────────────────────────────────────────────
const isNotAGamePost = (title, postUrl = '') => {
  const lower = title.toLowerCase()
    .replace(/['’‘]/g, '')    // ← Elimina comillas y apóstrofes (tanto ' como ’)
    .replace(/[-–—]/g, ' ')   // ← Convierte todo tipo de guiones en espacio
    .replace(/\s+/g, ' ');    // ← Normaliza espacios
    
  return (
    // Anuncios y posts del sitio
    lower.includes('call for donations') ||
    title.includes('→') ||
    postUrl.includes('/a-call-for-donations') ||
  
    // === CONTENIDO +18 / HENTAI / EROGE (filtrado total) ===
    lower.includes('genesis order') ||
    lower.includes('honey select') ||
    lower.includes('av director life') ||
    lower.includes('one more night + windows 7 fix') ||
    lower.includes('honeycome') ||
    lower.includes('repack update') ||
    lower.includes('nymphomaniac') ||
    lower.includes('lust n dead') ||
    lower.includes('roomgirl paradise') ||
    lower.includes('house party: supporter') ||
  
    // Palabras clave genéricas de contenido adulto (muy efectivas)
    lower.includes('hentai') ||
    lower.includes('eroge') ||
    lower.includes('nude') ||
    lower.includes('sex') ||
    lower.includes('porn') ||
    lower.includes('lewd') ||
    lower.includes('nsfw') ||
    lower.includes('dojin') ||
    lower.includes('koikatsu') ||
    lower.includes('custom order maid') ||
    lower.includes('honey select 2') ||
    lower.includes('ai shoujo') ||
    lower.includes('cm3d2') ||
    lower.includes('sexy beach') ||
    lower.includes('nekopara') && lower.includes('extra') // Nekopara Extra es +18
  );
};

// ──────────────────────────────────────────────────────────────
// Función de utilidad para scrapear los datos de la lista (unificada)
// ──────────────────────────────────────────────────────────────
async function scrapeGames(url, tab, searchQuery, page) {
  try {
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 20000,
    });
    const $ = cheerio.load(data);
    const games = [];

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

        if (isNotAGamePost(title, postUrl)) return;

        let cover = img.attr('src') || '';
        if (cover.includes('?resize=')) cover = cover.split('?resize=')[0];
        const id = crypto.createHash('md5').update(postUrl).digest('hex');
        games.push({ id, title, cover, postUrl });
      });
      return { games, hasMore: false };
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

        if (isNotAGamePost(title, postUrl)) return;

        let cover = img.attr('src') || '';
        if (cover.includes('?resize=')) cover = cover.split('?resize=')[0];
        const id = crypto.createHash('md5').update(postUrl).digest('hex');
        games.push({ id, title, cover, postUrl });
      });
      const hasMore = $('.pagination .next').length > 0;
      return { games, hasMore };
    }

    // ==================== BÚSQUEDA + NOVEDADES + A-Z ====================
    if (tab === 'todos_az') {
      $('#lcp_instance_0 li a').each((_, el) => {
        const a = $(el);
        const postUrl = a.attr('href');
        if (!postUrl || !postUrl.includes('fitgirl-repacks.site')) return;
        let title = a.text().trim();
        title = title.replace(/–\s*FitGirl Repack.*/i, '').trim();

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
      // Comprobación de paginación de All Games A-Z (Lista estática, no tiene paginación real)
      // Si la lista es estática, no hay más, a menos que el lcp_page0=N lo indique.
      // Dado que el frontend solo pide una página a la vez, asumiremos que si hay más enlaces con ese patrón, es que hay más páginas.
      hasMore = $('a[href*="lcp_page0"]').length > 0 && games.length > 0;
    } else {
      hasMore = $('.pagination .next').length > 0;
    }

    return { games, hasMore };
  } catch (err) {
    console.error('Error durante el scraping:', err.message);
    return { games: [], hasMore: false };
  }
}

// ──────────────────────────────────────────────────────────────
// Endpoint GET - Recupera listas por Pestaña/Búsqueda/Paginación
// ──────────────────────────────────────────────────────────────
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

  // ==================== LÓGICA DE URL ====================
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

  const { games, hasMore } = await scrapeGames(url, tab, searchQuery, page);
  return NextResponse.json({ games, hasMore });
}

// ──────────────────────────────────────────────────────────────
// Endpoint POST - Recupera los juegos favoritos (FIX FAVORITOS)
// ──────────────────────────────────────────────────────────────
/**
 * Este endpoint recibe una lista de IDs de juegos favoritos (del localStorage del cliente)
 * y devuelve los objetos de juego correspondientes para mostrarlos en el frontend.
 * * NOTA IMPORTANTE: Ya que los IDs son hashes MD5 de las URLs de los posts, y FitGirl no tiene
 * una API de búsqueda por ID, este método es INEFICIENTE:
 * 1. Recibe los IDs (MD5).
 * 2. Necesita buscar en todas las páginas de A-Z para intentar encontrar las URLs y
 * reconstruir el objeto de juego {id, title, postUrl}.
 * * La forma eficiente es que el cliente guarde NO SOLO el ID, sino también la 'postUrl' en el localStorage.
 * Por ahora, intentaremos cargar de forma INEFICIENTE todos los juegos A-Z para mapear los IDs a URLs.
 *
 * @param {Request} request El objeto de petición HTTP
 * @returns {NextResponse} Los juegos favoritos encontrados
 */
export async function POST(request) {
  try {
    const { favorites } = await request.json();

    if (!Array.isArray(favorites) || favorites.length === 0) {
      return NextResponse.json({ games: [], hasMore: false });
    }

    // 1. Cargamos TODOS los juegos de la página A-Z (es la lista más completa)
    // El frontend espera una respuesta rápida, por lo que cargaremos la página 1 de A-Z
    // y asumiremos que, si no está ahí, el usuario tendrá que buscarlo manualmente o cargaremos más páginas.
    const allGames = [];
    let page = 1;
    let hasMore = true;

    // Lógica para iterar en la lista A-Z hasta 3 páginas (máximo)
    while (hasMore && page <= 3) {
      const azUrl = `https://fitgirl-repacks.site/all-my-repacks-a-z/?lcp_page0=${page}#lcp_instance_0`;
      const result = await scrapeGames(azUrl, 'todos_az', null, page);
      allGames.push(...result.games);
      hasMore = result.hasMore;
      page++;
      if (!hasMore || allGames.length > 500) break; // Límite de seguridad
    }
    
    // 2. Filtramos la lista A-Z por los IDs de favoritos
    const favoriteGames = allGames.filter(game => favorites.includes(game.id));

    // 3. Devolvemos los juegos favoritos encontrados
    // hasMore se establece en false para esta pestaña ya que es una búsqueda estática.
    return NextResponse.json({ games: favoriteGames, hasMore: false });

  } catch (error) {
    console.error('Error procesando favoritos (POST):', error.message);
    return NextResponse.json({ games: [], hasMore: false });
  }
}
