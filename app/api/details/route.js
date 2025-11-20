import { NextResponse } from 'next/server';

// Helpers (iguales)
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
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Failed to fetch: ${res.status}` }, { status: 502 });
    }

    const rawHtml = await res.text();
    const html = decodeEntities(rawHtml);

    // ====== TÍTULO, CARÁTULA, GÉNEROS, etc. (todo igual que antes) ======
    let title = matchOne(html, [
      /<h1[^>]*class="post-title"[^>]*>(.*?)<\/h1>/is,
      /<h1[^>]*>(.*?)<\/h1>/is,
      /<title[^>]*>(.*?)<\/title>/is,
    ]) || matchOne(html, [/itemprop="name"[^>]*content="(.*?)"/is]);
    if (title && title.includes('FitGirl Repacks')) title = null;

    const cover = matchOne(html, [
      /<img[^>]*class="cover"[^>]*src="(.*?)"/is,
      /<img[^>]*itemprop="image"[^>]*src="(.*?)"/is,
      /<a[^>]*class="fancybox"[^>]*href="(.*?)"/is,
    ]) || matchOne(html, [
      /<meta[^>]*property="og:image"[^>]*content="(.*?)"/is,
      /<meta[^>]*name="twitter:image"[^>]*content="(.*?)"/is,
    ]);

    const genresRaw = matchOne(html, [
      /Genres\/Tags:\s*([^<]+?)(?=\s*Companies:)/i,
      /Genres\/Tags:\s*([\s\S]*?)(?=\s*Companies:)/i,
      /Genres\/Tags:\s*([^<]+?)(?=\s*Languages:)/i
    ]);
    const genres = genresRaw
      ? decodeEntities(
          genresRaw
            .replace(/Genres\/Tags:?\s*/gi, '')
            .replace(/<a[^>]*>(.*?)<\/a>/gi, '$1')
            .replace(/<[^>]+>/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .split(/,\s*|\s+\/\s+/)
            .map(s => s.trim())
            .filter(Boolean)
            .join(', ')
        )
      : null;

    const company = textOrNull(matchOne(html, [
      /Companies:\s*<strong>([\s\S]*?)<\/strong>/i,
      /Company:\s*<strong>([\s\S]*?)<\/strong>/i,
      /Publisher:\s*<strong>([\s\S]*?)<\/strong>/i,
      /Developer:\s*<strong>([\s\S]*?)<\/strong>/i,
      /Companies:\s*([^<\r\n]+)/i
    ]));

    const languages = textOrNull(matchOne(html, [
      /Languages:\s*<strong>([\s\S]*?)<\/strong>/i,
      /Languages?:\s*([^<\r\n]+)/i
    ]));

    const originalSize = textOrNull(matchOne(html, [
      /Original\s+Size:\s*<strong>([\d.,\s]+ ?(?:GB|MB))<\/strong>/i,
      /Original\s+Size:\s*([\d.,\s]+ ?(?:GB|MB))/i
    ]));

    const repackSize = textOrNull(matchOne(html, [
      /Repack\s+Size:\s*<strong>((?:from )?[\d.,\s]+ ?(?:GB|MB)[^<]*)<\/strong>/i,
      /Repack\s+Size:\s*((?:from )?[\d.,\s]+ ?(?:GB|MB)[^<\r\n]*)/i
    ]));

    const installedSize = textOrNull(matchOne(html, [
      /[•·]\s*HDD space after installation[:\s]*([^\n\r<]+)/i,
      /HDD space after installation[:\s]*up to\s+([^\n\r<]+)/i,
      /HDD space after installation[:\s]*([^\n\r<]+)/i,
      /HDD space after installation[:\s]*([\d.,\s–~]+ ?(?:GB|MB))/i,
      /up to ([\d.,\s–~]+ ?(?:GB|MB)).*?(?:installation|HDD)/i,
      /HDD space after installation[^•]*?([\d.,\s–~]+ ?(?:GB|MB))/i
    ]));

    const mirrors = [...new Set([
      ...matchAll(html, /<a[^>]*href="(magnet:\?xt=urn:[^"]+)"[^>]*>/i),
      ...matchAll(html, /<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>(?:Download|Mirror|CS\.RIN|Torrent)/i),
      ...matchAll(html, /href="(https?:\/\/csrinru\.xyz[^"]+)"/i),
    ])].map(decodeEntities);

    const csrinLink = matchOne(html, [/href="(magnet:\?xt=urn:[^"]+)"/i]) ||
      mirrors.find(m => m.startsWith('magnet:')) || null;

    const torrentStatsImage = matchOne(html, [/(https?:\/\/torrent-stats\.info\/[A-Za-z0-9/_-]+\.png)/i]);

    // ====== CAPTURAS + TRÁILER (sin cambios) ======
    const screenshotsSection = matchOne(html, [
      /<h3[^>]*>Screenshots\s*\(Click to enlarge\)\s*<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/i,
      /<h3[^>]*>Screenshots\s*\(Click to enlarge\)\s*<\/h3>[\s\S]*?(?=<h3|Repack Features|Game Features)/i
    ]);
    let screenshots = [];
    let trailerVideo = null;
    if (screenshotsSection) {
      const imgMatches = screenshotsSection.matchAll(/src="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp))"/gi);
      for (const m of imgMatches) if (m[1]) screenshots.push(m[1]);
      const videoMatch = screenshotsSection.match(/<source[^>]+src="(https?:\/\/[^"]+\.webm)"/i);
      if (videoMatch?.[1]) trailerVideo = videoMatch[1];
    }

    // ====== REPACK FEATURES (sin cambios) ======
    const repackFeaturesRaw = matchOne(html, [
      /<h3[^>]*>Repack Features<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/i,
      /<h3[^>]*>Repack Features<\/h3>\s*<ul[^>]*>([\s\S]*?)<\/ul>/i,
      /<h3[^>]*>Repack Features<\/h3>\s*[\s\S]*?(?:<h3|<div class="idc-)/i,
      /<h3[^>]*>Repack Features<\/h3>\s*([\s\S]*?)(?=<h3|Download Mirrors|<\/div>)/i
    ]);
    const repackFeatures = repackFeaturesRaw
      ? decodeEntities(
          repackFeaturesRaw
            .replace(/<[^>]+>/g, '')
            .replace(/[•·•]\s*/g, '\n• ')
            .replace(/^\s*|\s*$/gm, '')
            .replace(/\n+/g, '\n')
            .trim()
        )
      : null;

    // ====== GAME INFO (sin cambios) ======
    const gameDescriptionRaw = matchOne(html, [
      /<div[^>]*class="su-spoiler-title"[^>]*>Game Description[\s\S]*?<div[^>]*class="su-spoiler-content[^>]*>([\s\S]*?)<\/div>/i,
      />Game Description<\/div>\s*<div[^>]*class="su-spoiler-content[^>]*>([\s\S]*?)<\/div>/i
    ]);
    const gameInfo = gameDescriptionRaw
      ? decodeEntities(
          gameDescriptionRaw
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n\n')
            .replace(/<\/?(strong|b)[^>]*>/gi, '||')
            .replace(/<\/?ul[^>]*>/gi, '')
            .replace(/<\/?li[^>]*>/gi, '• ')
            .replace(/<[^>]+>/g, '')
            .replace(/\|\|/g, '**')
            .replace(/\n{3,}/g, '\n\n')
            .trim()
        )
      : null;

    // ====== NUEVO: ACTUALIZACIONES (Game Updates – Direct Links only) ======
    const updatesHtml = matchOne(html, [
      /<h3[^>]*>Game Updates\s*–\s*Direct Links only<\/h3>\s*<div[^>]*style="[^"]*background-color:\s*#9aff612e[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<h3[^>]*>Game Updates[^<]*<\/h3>\s*<div[^>]*background[^>]*>([\s\S]*?)<\/div>/i,
      /<h3[^>]*>Game Updates[^<]*<\/h3>[\s\S]*?(?=<h3|\s*<\/div>|\s*Repack Features)/i
    ]);

    return NextResponse.json({
      title: textOrNull(title),
      cover: textOrNull(cover),
      genres: textOrNull(genres),
      company: textOrNull(company),
      languages: textOrNull(languages),
      originalSize: textOrNull(originalSize),
      repackSize: textOrNull(repackSize),
      installedSize: textOrNull(installedSize),
      mirrors,
      screenshots,
      trailerVideo,
      repackFeatures,
      gameInfo,
      csrinLink,
      torrentStatsImage,
      updatesHtml: updatesHtml ? `<h3>Game Updates – Direct Links only</h3>${updatesHtml}` : null, // ← bonito y limpio
    });

  } catch (err) {
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
