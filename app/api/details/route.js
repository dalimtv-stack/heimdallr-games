// app/api/details/route.js
import { NextResponse } from 'next/server';

function textOrNull(str) {
  const s = (str || '').trim();
  return s && s !== 'N/A' && s !== '' ? s : null;
}

function matchOne(html, patterns) {
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

function decodeEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n));
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const postUrl = searchParams.get('url');
    if (!postUrl) return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });

    // Headers que pasan Cloudflare 2025 sin problemas
    const res = await fetch(postUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0',
      },
      redirect: 'follow',
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ error: `HTTP ${res.status} – Cloudflare o sitio caído` }, { status: 502 });
    }

    const html = decodeEntities(await res.text());

    // 1. Título (nuevo diseño 2025)
    const title = textOrNull(
      html.match(/<h1[^>]+class=["']post-title[^>]+>([\s\S]*?)<\/h1>/i)?.[1]
      || html.match(/<title>([^<|–—-]+?)(?:[\||–—]|FitGirl Repacks)/i)?.[1]
    );

    // 2. Carátula
    const cover = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i)?.[1]
               || html.match(/<img[^>]+class=["'][^"']*cover[^"']*["'][^>]+src=["']([^"']+)/i)?.[1]
               || null;

    // 3. Géneros (funciona con y sin <a>)
    const genres = textOrNull(
      (html.match(/Genres\/Tags:[\s\S]*?<\/p>/i)?.[0] || '')
        .replace(/<[^>]+>/g, '')
        .replace(/Genres\/Tags:?/gi, '')
        .replace(/\s+/g, ' ')
        .trim()
        .split(/[,\/]/)
        .map(s => s.trim())
        .filter(Boolean)
        .join(', ')
    );

    // 4. Compañía / Publisher
    const company = textOrNull(
      html.match(/Companies?:?[\s\S]*?<strong>([\s\S]*?)<\/strong>/i)?.[1]
      || html.match(/Publisher:?\s*<strong>([^<]+)<\/strong>/i)?.[1]
      || html.match(/Developer:?\s*<strong>([^<]+)<\/strong>/i)?.[1]
      || html.match(/Companies?:?\s*([^<\n\r]+)/i)?.[1]
    );

    // 5. Idiomas
    const languages = textOrNull(html.match(/Languages?:?\s*([^<\n\r]+)/i)?.[1]);

    // 6. Tamaños (soporta "from X GB", rangos, etc.)
    const originalSize = textOrNull(html.match(/Original\s+Size[:\s]*([\d.,\s]+ ?(?:GB|MB))/i)?.[1]);
    const repackSize   = textOrNull(html.match(/Repack\s+Size[:\s]*((?:from )?[\d.,\s]+ ?(?:GB|MB)[^<\n]*)/i)?.[1]);

    // 7. Magnet + mirrors
    const magnets = [...html.matchAll(/href=["'](magnet:\?xt=urn:btih:[^"']+)["']/gi)].map(m => m[1]);
    const mirrors = [
      ...new Set([
        ...magnets,
        ...[...html.matchAll(/href=["'](https?:\/\/(?:cs\.rin\.ru|fitgirl-repacks\.site|1337x\.to|rutracker\.org)[^"']+)["']/gi)].map(m => m[1])
      ])
    ];

    // 8. Screenshots (máx 8)
    const screenshots = [...new Set([
      ...html.matchAll(/<img[^>]+src=["']([^"']+\.(?:jpe?g|png|webp))["']/gi),
      ...html.matchAll(/<a[^>]+class=["']fancybox[^>]+href=["']([^"']+\.(?:jpe?g|png))["']/gi)
    ])]
      .map(m => m[1])
      .filter(url => !/torrent-stats|logo|banner|avatar/i.test(url))
      .slice(0, 8);

    // 9. Torrent-stats
    const torrentStatsImage = html.match(/(https?:\/\/torrent-stats\.info\/[^"']+\.png)/i)?.[1] || null;

    // 10. Repack Features
    const repackFeatures = textOrNull(
      (html.match(/<h3[^>]*>Repack Features<\/h3>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i)?.[1] || '')
        .replace(/<li[^>]*>/gi, '• ')
        .replace(/<\/li>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    );

    // 11. Descripción
    const gameInfo = textOrNull(
      (html.match(/<strong>Game Description<\/strong>[\s\S]*?(?=<h3|<div class=["']download)/i)?.[0] || '')
        .replace(/<[^>]+>/g, '')
        .replace(/^Game Description[:\s]*/i, '')
        .trim()
    );

    return NextResponse.json({
      title,
      cover,
      genres,
      company,
      languages,
      originalSize,
      repackSize,
      mirrors,
      csrinLink: magnets[0] || null,
      screenshots,
      torrentStatsImage,
      repackFeatures,
      gameInfo,
    });

  } catch (err) {
    console.error('FitGirl scraper error:', err.message);
    return NextResponse.json({ 
      error: 'No se pudieron cargar los detalles. Posibles causas: bloqueo Cloudflare, cambio en el sitio o URL inválida.' 
    }, { status: 500 });
  }
}
