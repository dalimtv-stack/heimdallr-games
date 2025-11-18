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
    '&larr;': '←',
    '&ndash;': '–',
    '&mdash;': '—',
    '&#8211;': '–',
    '&#8212;': '—',
  };
  return str
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/(&[a-zA-Z]+;|&#\d+;)/g, (m) => named[m] ?? m);
}

function sanitizeValue(v) {
  if (!v) return null;
  const cutMarkers = [
    'Download Mirrors',
    'Filehoster',
    'Continue reading',
    'Selective Download',
    '<',
  ];
  let out = v;
  for (const mk of cutMarkers) {
    const i = out.indexOf(mk);
    if (i > -1) out = out.slice(0, i);
  }
  return textOrNull(decodeEntities(out).replace(/\s+/g, ' ').trim());
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

    // Campos principales con límites (evita contaminación de mirrors/filehosters)
    const genres = sanitizeValue(
      matchOne(html, [
        /(?:<[^>]*>)*\s*(?:Genres|Géneros)\s*:\s*([\s\S]*?)(?=\s*(?:Company|Developer|Compañía|Languages|Idiomas|Original Size|Tamaño original|Repack Size|Tamaño del repack|Download Mirrors|Filehoster|<))/i,
      ])
    );

    const company = sanitizeValue(
      matchOne(html, [
        /(?:<[^>]*>)*\s*(?:Company|Compañía|Developer)\s*:\s*([\s\S]*?)(?=\s*(?:Genres|Géneros|Languages|Idiomas|Original Size|Tamaño original|Repack Size|Tamaño del repack|Download Mirrors|Filehoster|<))/i,
      ])
    );

    const languages = sanitizeValue(
      matchOne(html, [
        /(?:<[^>]*>)*\s*(?:Languages|Idiomas)\s*:\s*([\s\S]*?)(?=\s*(?:Genres|Géneros|Company|Compañía|Developer|Original Size|Tamaño original|Repack Size|Tamaño del repack|Download Mirrors|Filehoster|<))/i,
      ])
    );

    const originalSize = sanitizeValue(
      matchOne(html, [
        /(?:<[^>]*>)*\s*(?:Original Size|Tamaño original)\s*:\s*([\s\S]*?)(?=\s*(?:Repack Size|Tamaño del repack|Download Mirrors|Filehoster|<))/i,
      ])
    );

    const repackSize = sanitizeValue(
      matchOne(html, [
        /(?:<[^>]*>)*\s*(?:Repack Size|Tamaño del repack)\s*:\s*([\s\S]*?)(?=\s*(?:Download Mirrors|Filehoster|<))/i,
      ])
    );
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

    // Características del repack: entre el encabezado y el siguiente bloque/heading
    const repackFeaturesRaw =
      matchOne(html, [
        /<b[^>]*>\s*Features Repack\s*<\/b>\s*([\s\S]*?)(?=\s*(?:<b|<strong|<h2|<h3|Download Mirrors|Selective Download))/i,
        /<strong[^>]*>\s*Features Repack\s*<\/strong>\s*([\s\S]*?)(?=\s*(?:<b|<strong|<h2|<h3|Download Mirrors|Selective Download))/i,
      ]) || null;

    let repackFeatures = null;
    if (repackFeaturesRaw) {
      const withBullets = repackFeaturesRaw
        .replace(/<li[^>]*>\s*/gi, '• ')
        .replace(/<\/li>/gi, '\n');

      repackFeatures = textOrNull(
        decodeEntities(
          withBullets
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n')
            .replace(/<[^>]+>/g, '')
        )
          .replace(/\n{3,}/g, '\n\n')
          .trim()
      );
    }

    // Información del juego (limpia encabezado)
    const gameInfoRaw =
      matchOne(html, [/Game Description\s*:?([\s\S]*?)(?=\s*(?:<b|<strong|<h2|<h3|Download Mirrors))/i]) ||
      null;

    const gameInfo = textOrNull(
      gameInfoRaw
        ? decodeEntities(
            gameInfoRaw
              .replace(/^(Game Description\s*:?\s*)/i, '')
              .replace(/<br\s*\/?>/gi, '\n')
              .replace(/<\/p>/gi, '\n')
              .replace(/<[^>]+>/g, '')
          ).trim()
        : null
    );

    return NextResponse.json({
      title: textOrNull(title),
      cover: textOrNull(cover),
      genres,
      company,
      languages,
      originalSize,
      repackSize,
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
