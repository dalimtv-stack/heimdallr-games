import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const postUrl = searchParams.get('url');
  if (!postUrl) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

  try {
    const { data } = await axios.get(postUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 20000,
    });
    const $ = cheerio.load(data);

    const title = $('h1.entry-title').text().replace(/– FitGirl Repack.*/i, '').trim();
    const cover = $('meta[property="og:image"]').attr('content') || '';

    let repackSize = 'N/A', originalSize = 'N/A', installTime = 'N/A', genres = 'N/A', company = 'N/A';
    const csrinLink = $('a[href*="cs.rin.ru"]').attr('href') || '';

    $('article p, article li').each((_, el) => {
      const text = $(el).text();
      if (text.includes('Repack Size:')) repackSize = text.split(':')[1]?.trim() || repackSize;
      if (text.includes('Original Size:')) originalSize = text.split(':')[1]?.trim() || originalSize;
      if (text.includes('Installation time:')) installTime = text.split(':')[1]?.trim() || installTime;
      if (text.includes('Genres/Tags:')) genres = text.split(':')[1]?.trim() || genres;
      if (text.includes('Company:')) company = text.split(':')[1]?.trim() || company;
    });

    const screenshots = $('article img[src*="-1024x"], article img[src*="fitgirl-repacks.site"]')
      .map((_, img) => {
        let src = $(img).attr('src') || '';
        if (src.includes('-1024x')) src = src.replace('-1024x', '');
        if (!src.startsWith('http')) src = 'https://fitgirl-repacks.site' + src;
        return src;
      })
      .get()
      .slice(0, 6);

    return NextResponse.json({ title, cover, repackSize, originalSize, installTime, genres, company, csrinLink, screenshots });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: true }, { status: 500 });
  }
}
