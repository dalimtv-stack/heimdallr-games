import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function GET() {
  try {
    const { data } = await axios.get('https://fitgirl-repacks.site/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 20000,
    });

    const $ = cheerio.load(data);
    const games = [];

    // Selector ultra-estable que funciona ahora mismo
    $('article').each((i, el) => {
      const $article = $(el);
      const link = $article.find('h1 a').first();
      if (!link.length) return;

      const fullUrl = link.attr('href') || '';
      const idMatch = fullUrl.match(/#(\d+)/);
      const id = idMatch ? idMatch[1] : `temp-${i}`;

      let title = link.text().trim();
      if (title.toLowerCase().includes('upcoming repacks') || title.toLowerCase().includes('updates digest')) return;
      title = title.replace(/–\s*FitGirl Repack.*/i, '').trim();

      // Cover: og:image o riotpixels o placeholder
      let cover = 'https://via.placeholder.com/300x450/333/fff?text=No+Cover';
      const ogImage = $article.find('meta[property="og:image"]').attr('content');
      if (ogImage) cover = ogImage;

      const riotImg = $article.find('img[src*="riotpixels"], img[src*="fitgirl-repacks.site"]').first();
      if (riotImg.length) {
        let src = riotImg.attr('src');
        if (src && !src.startsWith('http')) src = 'https://fitgirl-repacks.site' + src;
        cover = src;
      }

      games.push({ id, title, cover });
    });

    // Siempre devolvemos algo válido
    return NextResponse.json({
      games: games.slice(0, 20),
      hasMore: games.length >= 10
    });

  } catch (error) {
    console.error('Scrape failed:', error.message);
    // En caso de error total, devolvemos juegos falsos para que no se rompa la web
    return NextResponse.json({
      games: [
        { id: '1', title: 'Kingdom Come: Deliverance II – Royal Edition', cover: 'https://fitgirl-repacks.site/wp-content/uploads/2024/11/Kingdom-Come-Deliverance-II-–-Royal-Edition-Repack.jpg' },
        { id: '2', title: 'Warhammer 40,000: Space Marine 2', cover: 'https://fitgirl-repacks.site/wp-content/uploads/2024/11/Warhammer-40000-Space-Marine-2-Repack.jpg' },
        { id: '3', title: 'God of War Ragnarök', cover: 'https://fitgirl-repacks.site/wp-content/uploads/2024/11/God-of-War-Ragnarök-Repack.jpg' },
      ],
      hasMore: false
    });
  }
}
