import { NextResponse } from 'next/server';

// Helpers
function textOrNull(str) {
  const s = (str || '').trim();
  return s.length ? s : null;
}

function matchOne(html, patterns) {
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1]) return textOrNull(m[1]);
  }
  return null;
}

function matchAll(html, pattern, groupIndex = 1, limit = 50) {
  const out = [];
  let m;
  const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
  while ((m = re.exec(html)) && out.length < limit) {
    const v = textOrNull(m[groupIndex]);
    if (v) out.push(v);
  }
  return out;
}

function decodeEntities(str) {
  if (!str) return null;
  return str
    .replace(/&#(\d+);/g, (m, code) => String.fromCharCode(code))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
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

    const html = await res.text();

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

    // Géneros y compañía directos
    const genres =
      matchOne(html, [/Genres:\s*([^<\n]+)/i]) ||
      matchOne(html, [/Géneros:\s*([^<\n]+)/i]) ||
      null;

    const company =
      matchOne(html, [/Company:\s*([^<\n]+)/i]) ||
      matchOne(html, [/Developer:\s*([^<\n]+)/i]) ||
      matchOne(html, [/Compañía:\s*([^<\n]+)/i]) ||
      null;

    const languages =
      matchOne(html, [/Languages:\s*([^<\n]+)/i]) ||
      matchOne(html, [/Idiomas:\s*([^<\n]+)/i]) ||
      null;

    const originalSize =
      matchOne(html, [/Original Size:\s*([^<\n]+)/i]) ||
      matchOne(html, [/Tamaño original:\s*([^<\n]+)/i]) ||
      null;

    const repackSize =
      matchOne(html, [/Repack Size:\s*([^<\n]+)/i]) ||
      matchOne(html, [/Tamaño del repack:\s*([^<\n]+)/i]) ||
      null;
    // Mirrors (decodificados)
    const mirrors = [
      ...new Set([
        ...matchAll(html, /<a[^>]*href="(magnet:\?xt=urn:[^"]+)"[^>]*>/i),
        ...matchAll(html, /<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>(?:Download|Mirror|CS.RIN|Torrent)/i),
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

    // Características del repack (captura directa del bloque)
    const repackFeaturesRaw =
      matchOne(html, [
        /<b[^>]*>\s*Features Repack\s*<\/b>([\s\S]*?)(?=<(?:h2|h3|b|strong)[^>]*>)/i,
        /<strong[^>]*>\s*Features Repack\s*<\/strong>([\s\S]*?)(?=<(?:h2|h3|b|strong)[^>]*>)/i,
      ]) || null;

    let repackFeatures = null;
    if (repackFeaturesRaw) {
      repackFeatures = decodeEntities(
        repackFeaturesRaw
          .replace(/<li[^>]*>\s*/gi, '• ')
          .replace(/<\/li>/gi, '\n')
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/p>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .trim()
      );
    }

    // Información del juego
    const gameInfoRaw =
      matchOne(html, [/Game Description\s*:?([\s\S]*?)(?=<(?:h2|h3|b|strong)[^>]*>)/i]) ||
      extractSectionByHeading(html, 'Game Info') ||
      extractSectionByHeading(html, 'Información del juego') ||
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
