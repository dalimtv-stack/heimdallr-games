import { NextResponse } from 'next/server';

// Helpers
function textOrNull(str) {
  const s = (str || '').trim();
  return s && s !== 'N/A' ? s : null;
}

function matchOne(html, patterns) {
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1]) return m[1].trim();
  }
  return null;
}

function matchAll(html, pattern, groupIndex = 1, limit = 50) {
  const out = [];
  let m;
  const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
  while ((m = re.exec(html)) && out.length < limit) {
    const v = (m[groupIndex] || '').trim();
    if (v) out.push(v);
  }
  return out;
}

function decodeEntities(str) {
  if (!str) return null;
  const named = {
    '&amp;': '&',
    '&quot;': '"',
    '&#039;': "'",
    '&lt;': '<',
    '&gt;': '>',
    '&hellip;': '…',
    '&rarr;': '→',
    '&#8211;': '–',
    '&#8212;': '—',
  };
  return str
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/(&[a-zA-Z]+;|&#\d+;)/g, (m) => named[m] ?? m);
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const postUrl = searchParams.get('url');
    if (!postUrl) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    const res = await fetch(postUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Failed to fetch: ${res.status}` }, { status: 502 });
    }

    const rawHtml = await res.text();
    const html = decodeEntities(rawHtml);

    // Título
    let title =
      matchOne(html, [
        /<h1[^>]*class="post-title"[^>]*>(.*?)<\/h1>/is,
        /<h1[^>]*>(.*?)<\/h1>/is,
        /<title[^>]*>(.*?)<\/title>/is,
      ]) || matchOne(html, [/itemprop="name"[^>]*content="(.*?)"/is]);

    if (title && title.includes('FitGirl Repacks')) {
      title = null;
    }

    // Carátula
    const cover =
      matchOne(html, [
        /<img[^>]*class="cover"[^>]*src="(.*?)"/is,
        /<img[^>]*itemprop="image"[^>]*src="(.*?)"/is,
        /<a[^>]*class="fancybox"[^>]*href="(.*?)"/is,
      ]) ||
      matchOne(html, [
        /<meta[^>]*property="og:image"[^>]*content="(.*?)"/is,
        /<meta[^>]*name="twitter:image"[^>]*content="(.*?)"/is,
      ]);

    // Géneros
    const genresRaw = matchOne(html, [/Genres\/Tags:\s*([\s\S]*?)<br>/i]);
    const genres = genresRaw
      ? decodeEntities(genresRaw.replace(/<a[^>]*>(.*?)<\/a>/gi, '$1'))
      : null;

    // Compañía
    const companyStrong = matchOne(html, [
      /Companies:\s*<strong>(.*?)<\/strong>\s*<br>/i,
      /Company:\s*<strong>(.*?)<\/strong>\s*<br>/i,
      /Compañías?:\s*<strong>(.*?)<\/strong>\s*<br>/i,
    ]);
    const companyFallback = matchOne(html, [
      /Companies:\s*([^<\n]+)\s*<br>/i,
      /Company:\s*([^<\n]+)\s*<br>/i,
      /Compañías?:\s*([^<\n]+)\s*<br>/i,
    ]);
    const company = textOrNull(companyStrong || companyFallback);

    // Idiomas
    const languagesRaw = matchOne(html, [
      /Languages:\s*([\s\S]*?)(?:<br|Download Mirrors|Filehoster)/i,
      /Idiomas:\s*([\s\S]*?)(?:<br|Download Mirrors|Filehoster)/i,
    ]);
    const languages = textOrNull(decodeEntities(languagesRaw));

    // Tamaños
    const originalSizeRaw = matchOne(html, [
      /Original Size:\s*([\s\S]*?)(?:<br|Repack Size|Download Mirrors|Filehoster)/i,
      /Tamaño original:\s*([\s\S]*?)(?:<br|Repack Size|Download Mirrors|Filehoster)/i,
    ]);
    const originalSize = textOrNull(decodeEntities(originalSizeRaw));

    const repackSizeRaw = matchOne(html, [
      /Repack Size:\s*([\s\S]*?)(?:<br|Download Mirrors|Filehoster)/i,
      /Tamaño del repack:\s*([\s\S]*?)(?:<br|Download Mirrors|Filehoster)/i,
    ]);
    const repackSize = textOrNull(decodeEntities(repackSizeRaw));
    // Mirrors (decodificados)
    const mirrors = [
      ...new Set([
        ...matchAll(html, /<a[^>]*href="(magnet:\?xt=urn:[^"]+)"[^>]*>/i),
        ...matchAll(html, /<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>(?:Download|Mirror|CS\.RIN|Torrent)/i),
        ...matchAll(html, /href="(https?:\/\/csrinru\.xyz[^"]+)"/i),
      ]),
    ].map(decodeEntities);

    const csrinLink =
      matchOne(html, [/href="(magnet:\?xt=urn:[^"]+)"/i]) ||
      mirrors.find((m) => m.startsWith('magnet:')) ||
      null;

    // Screenshots (excluyendo torrent-stats)
    const allImages = [
      ...new Set([
        ...matchAll(html, /<img[^>]*src="(https?:\/\/[^"]+)"[^>]*>/i),
        ...matchAll(html, /<a[^>]*href="(https?:\/\/[^"]+\.(?:jpg|png))"[^>]*>/i),
      ]),
    ];

    const screenshots = allImages
      .filter((url) => !/torrent-stats\.info/i.test(url))
      .filter((url) => /(screens?|ss|shot|gallery|cdn|images)/i.test(url) || /\.(jpg|png)$/i.test(url))
      .slice(0, 8);

    // Imagen torrent-stats explícita
    const torrentStatsImage = matchOne(html, [/(https?:\/\/torrent-stats\.info\/[A-Za-z0-9/_-]+\.png)/i]);

    // Características del repack (captura bloque <h3>Repack Features</h3><ul>...</ul>)
    const repackFeaturesRaw = matchOne(html, [
      /<h3>\s*Repack Features\s*<\/h3>\s*<ul>([\s\S]*?)<\/ul>/i,
    ]);

    let repackFeatures = null;
    if (repackFeaturesRaw) {
      repackFeatures = decodeEntities(
        repackFeaturesRaw
          .replace(/<li[^>]*>\s*/gi, '\n• ') // salto de línea antes de cada bullet
          .replace(/<\/li>/gi, '')
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/p>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .replace(/\n{3,}/g, '\n\n')
          .replace(/^\s*\n+/, '') // quita salto inicial si aparece
          .trim()
      );
    }

    // Información del juego
    const gameInfoRaw =
      matchOne(html, [/Game Description\s*:?([\s\S]*?)(?=\s*(?:<b|<strong|<h2|<h3|Download Mirrors))/i]) ||
      null;

    const gameInfo = gameInfoRaw
      ? decodeEntities(
          gameInfoRaw
            .replace(/^(Game Description\s*:?\s*)/i, '')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .trim()
        )
      : null;

    return NextResponse.json({
      title: textOrNull(title),
      cover: textOrNull(cover),
      genres: textOrNull(genres),
      company: textOrNull(company),
      languages: textOrNull(languages),
      originalSize: textOrNull(originalSize),
      repackSize: textOrNull(repackSize),
      mirrors,
      screenshots,
      repackFeatures,
      gameInfo,
      csrinLink,
      torrentStatsImage,
    });
  } catch (err) {
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
