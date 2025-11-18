import { NextResponse } from 'next/server';

// ── Helpers mejorados ─────────────────────────────────────
function textOrNull(str) {
  const s = (str || '').trim();
  return s && s !== 'N/A' && s !== '' ? s : null;
}

function matchOne(html, patterns) {
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

function matchAll(html, pattern, groupIndex = 1) {
  const results = [];
  let m;
  const re = new RegExp(pattern, 'gi');
  while ((m = re.exec(html)) !== null) {
    const value = (m[groupIndex] || '').trim();
    if (value) results.push(value);
  }
  return results;
}

function decodeEntities(str) {
  if (!str) return '';
  const entities = {
    '&amp;': '&',
    '&quot;': '"',
    '&#039;': "'',
    '&lt;': '<',
    '&gt;': '>',
    '&nbsp;': ' ',
    '&hellip;': '…',
    '&ndash;': '–',
    '&mdash;': '—',
    '&#8211;': '–',
    '&#8212;': '—',
    '&#038;': '&',
  };
  return str
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(code))
    .replace(/&[a-z]+;/gi, m => entities[m] || m);
}

// ── Ruta GET ──────────────────────────────────────────────
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const postUrl = searchParams.get('url');
    if (!postUrl) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    const res = await fetch(postUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ error: `HTTP ${res.status}` }, { status: 502 });
    }

    const rawHtml = await res.text();
    const html = decodeEntities(rawHtml);

    // ── Título ───────────────────────────────────────────
    let title = matchOne(html, [
      /<h1[^>]+class=["']post-title[^>]+>([\s\S]*?)<\/h1>/i,
      /<h1[^>]*>([\s\S]*?)<\/h1>/i,
      /<title>([\s\S]*?)<\/title>/i,
    ])?.replace(/\s*[-–—]\s*FitGirl Repacks?.*$/i, '').trim();

    // ── Carátula ───────────────────────────────────────────
    const cover = matchOne(html, [
      /<img[^>]+class=["']cover[^>]+src=["']([^"']+)/i,
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i,
      /<img[^>]+itemprop=["']image["'][^>]+src=["']([^"']+)/i,
      /<a[^>]+class=["']fancybox[^>]+href=["']([^"']+)/i,
    ]);

    // ── Géneros ───────────────────────────────────────────
    const genresBlock = matchOne(html, [
      /Genres\/Tags:[\s\S]*?(<br|<p|<\/p|<ul|<\/div)/i,
      /Genres\/Tags:([^<]+(<br|<\/p))/i,
    ]) || '';

    const genres = genresBlock
      ? genresBlock
          .replace(/<[^>]+>/g, '')
          .replace(/Genres\/Tags:?\s*/i, '')
          .replace(/\s+/g, ' ')
          .trim()
          .split(/,\s*|\s+\/\s+/)
          .filter(Boolean)
          .join(', ')
      : null;

    // ── Compañía ───────────────────────────────────────────
    const company = matchOne(html, [
      /Companies:[\s\S]*?<strong>([\s\S]*?)<\/strong>/i,
      /Company:[\s\S]*?<strong>([\s\S]*?)<\/strong>/i,
      /Publisher:[\s\S]*?<strong>([\s\S]*?)<\/strong>/i,
      /Developer:[\s\S]*?<strong>([\s\S]*?)<\/strong>/i,
      /Companies:\s*([^<\n\r]+)/i,
      /Company:\s*([^<\n\r]+)/i,
    ])?.replace(/<[^>]+>/g, '').trim() || null;

    // ── Idiomas ───────────────────────────────────────────
    const languages = matchOne(html, [
      /Languages?:\s*([^<\n\r]+)/i,
      /Idiomas?:\s*([^<\n\r]+)/i,
    ])?.trim() || null;

    // ── Tamaños ───────────────────────────────────────────
    const originalSize = matchOne(html, [
      /Original\s+Size[:\s]+([\d.,\s]+(?:GB|MB))/i,
      /Tamaño original[:\s]+([\d.,\s]+(?:GB|MB))/i,
    ])?.trim() || null;

    const repackSize = matchOne(html, [
      /Repack\s+Size[:\s]+((?:from\s*)?[\d.,\s]+(?:GB|MB)(?:\s*\/\s*[\d.,]+GB)?[^<\n]*)/i,
      /Tamaño del repack[:\s]+((?:from\s*)?[\d.,\s]+(?:GB|MB)[^<\n]*)/i,
    ])?.trim() || null;

    // ── Mirrors ───────────────────────────────────────────
    const magnets = matchAll(html, /href=["'](magnet:\?xt=urn:btih:[^"']+)["']/i);
    const httpMirrors = matchAll(html, /<a[^>]+href=["'](https?:\/\/[^"']+(?:1337x|rutracker|cs\.rin\.ru|fitgirl-repacks\.site)[^"']*)["'][^>]*>(?:Download|Mirror|Torrent|CS\.RIN)/i);
    const csrinLinks = matchAll(html, /href=["'](https?:\/\/csrin\.ru[^"']+)["']/i);

    const mirrors = [...new Set([...magnets, ...httpMirrors, ...csrinLinks])]
      .map(decodeEntities)
      .filter(Boolean);

    const csrinLink = magnets[0] || mirrors.find(m => m.startsWith('magnet:')) || null;

    // ── Screenshots ───────────────────────────────────────
    const allImgs = [
      ...matchAll(html, /<img[^>]+src=["']([^"']+\.(?:jpg|jpeg|png|webp))["']/i),
      ...matchAll(html, /<a[^>]+class=["']fancybox[^>]+href=["']([^"']+\.(?:jpg|jpeg|png))["']/i),
    ];

    const screenshots = allImgs
      .filter(url => /\/(screens?|shots?|gallery|cdn|imgur|postimg)\//i.test(url) || /\d{4,}\.(jpg|png)/i.test(url))
      .filter(url => !/torrent-stats\.info|logo|banner|avatar/i.test(url))
      .slice(0, 8);

    // ── Torrent-stats ─────────────────────────────────────
    const torrentStatsImage = matchOne(html, /(https?:\/\/torrent-stats\.info\/[^\s"']+\.png)/i);

    // ── Repack Features ───────────────────────────────────
    const repackFeaturesRaw = matchOne(html, /<h3[^>]*>Repack Features<\/h3>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i);
    const repackFeatures = repackFeaturesRaw
      ? decodeEntities(
          repackFeaturesRaw
            .replace(/<li[^>]*>/gi, '\n• ')
            .replace(/<\/li>/gi, '')
            .replace(/<[^>]+>/g, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim()
        )
      : null;

    // ── Game Description ──────────────────────────────────
    const gameInfoRaw = matchOne(html, /<strong>Game Description<\/strong>[\s\S]*?(?=<h3|<div class=["']download|<p><strong>)/i)
                     || matchOne(html, /<h2[^>]*>Description<\/h2>[\s\S]*?(?=<h3|<div)/i);

    const gameInfo = gameInfoRaw
      ? decodeEntities(
          gameInfoRaw
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/^Game Description[:\s]*/i, '')
            .trim()
        )
      : null;

    // ── Respuesta final (¡paréntesis bien cerrados!) ──────
    return NextResponse.json({
      title: textOrNull(title),
      cover: textOrNull(cover),
      genres: textOrNull(genres),
      company: textOrNull(company),
      languages: textOrNull(languages),
      originalSize: textOrNull(originalSize),
      repackSize: textOrNull(repackSize),
      mirrors,
      csrinLink,
      screenshots,
      torrentStatsImage: textOrNull(torrentStatsImage),
      repackFeatures,
      gameInfo,
    }, { status: 200 });

  } catch (err) {
    console.error('FitGirl scraper error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
