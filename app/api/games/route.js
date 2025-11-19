import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import crypto from 'crypto';

const filterAdultGames = (gamesList: any[]) => {
  return gamesList.filter(game => {
    const lowerTitle = game.title.toLowerCase();
    const adultKeywords = [
      'adult', 'hentai', 'nsfw', 'eroge', 'nude', 'sex', 'porn', 'lewd',
      'honey select', 'koikatsu', 'illusion', 'nympho', 'fuck', 'cum',
      'av director', 'lust ', 'violet + windows 7 fix', 'honeycome', 'genesis order'
    ];
    return !adultKeywords.some(keyword => lowerTitle.includes(keyword));
  });
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const tab = searchParams.get('tab') || 'novedades';

  const base = {
    novedades: 'https://fitgirl-repacks.site/',
    populares_mes: 'https://fitgirl-repacks.site/pop-repacks/',
    populares_ano: 'https://fitgirl-repacks.site/popular-repacks-of-the-year/',
    todos_az: 'https://fitgirl-repacks.site/all-my-repacks-a-z/',
  };

  let url = base[tab] || base.novedades;
  if (page > 1 && tab !== 'todos_az') url += `page/${page}/`;
  if (page > 1 && tab === 'todos_az') url += `?lcp_page0=${page}#lcp_instance_0`;

  try {
    const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 20000 });
    const $ = cheerio.load(data);
    const games: any[] = [];

    // POPULARES MES
    if (tab === 'populares_mes') {
      const monthWidget = $('h2.widgettitle:contains("Most Popular Repacks of the Month")')
        .closest('.jetpack_top_posts_widget')
        .find('div.widget-grid-view-image');

      monthWidget.each((_, el) => {
        const link = $(el).find('a').first();
        const img = $(el).find('img').first();
        if (!link.length || !img.length) return;
        const postUrl = link.attr('href');
        if (!postUrl?.includes('fitgirl-repacks.site')) return;

        let title = link.attr('title') || img.attr('alt') || 'Unknown';
        title = title.replace(/–\s*FitGirl Repack.*/i, '').trim();

        let cover = img.attr('src') || '';
        if (cover.includes('?resize=')) cover = cover.split('?resize=')[0];

        const id = crypto.createHash('md5').update(postUrl).digest('hex');
        games.push({ id, title, cover, postUrl });
      });

      return NextResponse.json({ games: filterAdultGames(games), hasMore: false });
    }

    // POPULARES AÑO
    if (tab === 'populares_ano') {
      const yearWidget = $('h2.widgettitle:contains("Top 150 Repacks of the Year")')
        .closest('.jetpack_top_posts_widget')
        .find('div.widget-grid-view-image');

      yearWidget.each((_, el) => {
        const link = $(el).find('a').first();
        const img = $(el).find('img').first();
        if (!link.length || !img.length) return;
        const postUrl = link.attr('href');
        if (!postUrl?.includes('fitgirl-repacks.site')) return;

        let title = link.attr('title') || img.attr('alt') || 'Unknown';
        title = title.replace(/–\s*FitGirl Repack.*/i, '').trim();

        let cover = img.attr('src') || '';
        if (cover.includes('?resize=')) cover = cover.split('?resize=')[0];

        const id = crypto.createHash('md5').update(postUrl).digest('hex');
        games.push({ id, title, cover, postUrl });
      });

      const hasMore = $('.pagination .next').length > 0;
      return NextResponse.json({ games: filterAdultGames(games), hasMore });
    }

    // NOVEDADES + A-Z (código original)
    $('article.post').each((_, el) => {
      const link = $(el).find('h1.entry-title a, h2.entry-title a').first();
      if (!link.length) return;
      const rawTitle = link.text().trim();
      if (/upcoming|digest/i.test(rawTitle)) return;

      const title = rawTitle.replace(/–\s*FitGirl Repack.*/i, '').trim();
      const postUrl = link.attr('href') || '';
      const id = crypto.createHash('md5').update(postUrl).digest('hex');

      let cover = '';
      const img = $(el).find('img').first();
      if (img.length) {
        cover = img.attr('src') || img.attr('data-src') || img.attr('data-lazy-src') || '';
        if (cover && !cover.startsWith('http')) cover = 'https://fitgirl-repacks.site' + cover;
      }
      if (!cover) cover = 'https://via.placeholder.com/300x450/222/fff?text=' + encodeURIComponent(title.slice(0,15));

      games.push({ id, title, cover, postUrl });
    });

    let hasMore = tab === 'todos_az' ? $('a[href*="lcp_page0"]').length > 0 : $('.pagination .next').length > 0;
    return NextResponse.json({ games: filterAdultGames(games), hasMore });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ games: [], hasMore: false });
  }
}
