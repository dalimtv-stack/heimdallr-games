import axios from 'axios';
import * as cheerio from 'cheerio';
import crypto from 'crypto';

// ──────────────────────────────────────────────────────────────
// Base URLs
// ──────────────────────────────────────────────────────────────
const baseUrls = {
    novedades: 'https://fitgirl-repacks.site/',
    populares_mes: 'https://fitgirl-repacks.site/pop-repacks/',
    populares_ano: 'https://fitgirl-repacks.site/popular-repacks-of-the-year/',
    todos_az: 'https://fitgirl-repacks.site/all-my-repacks-a-z/',
};

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
// Función interna de scraping
// ──────────────────────────────────────────────────────────────
async function scrapeFromUrl(url, tab, page) {
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
// Función de servicio principal exportable (maneja GET y POST de favoritos)
// ──────────────────────────────────────────────────────────────
/**
 * Lógica central para obtener listas de juegos.
 * @param {object} params - Parámetros de la consulta.
 * @param {string} [params.tab='novedades'] - Pestaña activa ('novedades', 'populares_mes', etc.)
 * @param {number} [params.page=1] - Número de página.
 * @param {string} [params.searchQuery=''] - Término de búsqueda.
 * @param {string[]} [params.favorites=[]] - Lista de IDs de favoritos (activa el modo POST/busqueda lenta).
 * @returns {Promise<{games: object[], hasMore: boolean}>}
 */
export async function getGamesList({ tab = 'novedades', page = 1, searchQuery = '', favorites = [] }) {
    
    // --- Lógica de Favoritos (simula el POST) ---
    if (favorites.length > 0) {
        const allGames = [];
        let currentPage = 1;
        let hasMore = true;

        // Limita la búsqueda a 3 páginas de A-Z para no tardar demasiado
        while (hasMore && currentPage <= 3) {
            const azUrl = baseUrls.todos_az + `?lcp_page0=${currentPage}#lcp_instance_0`;
            const result = await scrapeFromUrl(azUrl, 'todos_az', currentPage);
            allGames.push(...result.games);
            hasMore = result.hasMore;
            currentPage++;
        }
        
        const favoriteGames = allGames.filter(game => favorites.includes(game.id));
        return { games: favoriteGames, hasMore: false };
    }

    // --- Lógica de Listas Estándar (simula el GET) ---
    let url = baseUrls[tab] || baseUrls.novedades;

    if (tab === 'buscador' && searchQuery) {
        if (page === 1) {
            url = `https://fitgirl-repacks.site/?s=${encodeURIComponent(searchQuery)}`;
        } else {
            url = `https://fitgirl-repacks.site/page/${page}/?s=${encodeURIComponent(searchQuery)}`;
        }
    } else {
        if (page > 1 && tab !== 'todos_az') url += `page/${page}/`;
        if (page > 1 && tab === 'todos_az') url += `?lcp_page0=${page}#lcp_instance_0`;
    }

    return scrapeFromUrl(url, tab, page);
}
