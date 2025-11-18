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

function normalizeLabelValue(line) {
  const m = line.match(/^\s*([A-Za-zÀ-ÿ0-9\s\/\-\(\)]+)\s*:\s*(.+)$/);
  if (!m) return null;
  return { label: m[1].trim(), value: m[2].trim() };
}

function extractSectionByHeading(html, headingText) {
  const idx = html.toLowerCase().indexOf(headingText.toLowerCase());
  if (idx === -1) return null;
  const tail = html.slice(idx);
  const cutIdx = tail.search(/<(h2|h3|h4|b)[^>]*>/i);
  if (cutIdx > 0) {
    return textOrNull(tail.slice(0, cutIdx));
  }
  return textOrNull(tail);
}

function cleanHtmlToText(html) {
  return textOrNull(
    (html || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
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
      title = null; // descartar título genérico
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

    // Bloque de info
    const infoBlockText =
      cleanHtmlToText(
        matchOne(html, [/class="entry-content"[^>]*>([\s\S]*?)<\/div>/is]) ||
          matchOne(html, [/class="post-content"[^>]*>([\s\S]*?)<\/div>/is]) ||
          matchOne(html, [/class="content"[^>]*>([\s\S]*?)<\/div>/is]) ||
          html
      ) || '';

    const lines = infoBlockText.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    const kv = {};
    for (const line of lines) {
      const pair = normalizeLabelValue(line);
      if (!pair) continue;
      const key = pair.label.toLowerCase();
      kv[key] = pair.value;
    }

    const genres = kv['genres'] || kv['géneros'] || null;
    const company = kv['company'] || kv['compañía'] || kv['developer'] || null;
    const languages = kv['languages'] || kv['idiomas'] || null;
    const originalSize = kv['original size'] || kv['tamaño original'] || null;
    const repackSize = kv['repack size'] || kv['tamaño del repack'] || null;

    // Mirrors
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

    // Imagen torrent-stats explícita (fix: usar grupo de captura)
    const torrentStatsImage = matchOne(html, [/(https?:\/\/torrent-stats\.info\/[A-Za-z0-9/_-]+\.png)/i]);

    // Secciones: Features Repack (fix: patrones más amplios)
    const repackFeaturesRaw =
      extractSectionByHeading(html, 'Features Repack') ||
      extractSectionByHeading(html, 'Características del repack') ||
      matchOne(
        html,
        [
          /<b[^>]*>\s*Features[^<]*<\/b>([\s\S]*?)(?:<(?:h2|h3|b)[^>]*>)/is,
          /<strong[^>]*>\s*Features[^<]*<\/strong>([\s\S]*?)(?:<(?:h2|h3|b)[^>]*>)/is,
          /Features\s*:?\s*([\s\S]*?)(?:<(?:h2|h3|b)[^>]*>)/is,
        ]
      ) ||
      null;

    const gameInfoRaw =
      extractSectionByHeading(html, 'Game Description') ||
      extractSectionByHeading(html, 'Game Info') ||
      extractSectionByHeading(html, 'Información del juego') ||
      null;

    const repackFeatures = cleanHtmlToText(repackFeaturesRaw);
    const gameInfo = cleanHtmlToText(gameInfoRaw);

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
