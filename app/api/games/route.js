// app/api/game-details/route.js
import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Falta ID' }, { status: 400 });

  const postUrl = `https://fitgirl-repacks.site/#${id}`;

  try {
    const { data } = await axios.get(postUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 15000,
    });
    const $ = cheerio.load(data);

    const title = $('h1.entry-title').text().trim().replace(/– FitGirl Repack.*/i, '') || 'Sin título';
    const cover = $('meta[property="og:image"]').attr('content') || '';

    let genres = 'N/A', company = 'N/A', repackSize = 'N/A', originalSize = 'N/A', installTime = 'N/A';

    $('article p, article li').each((_, el) => {
      const text = $(el).text();
      if (text.includes('Genres/Tags:')) genres = text.split(':')[1]?.trim() || genres;
      if (text.includes('Company:') || text.includes('Companies:')) company = text.split(':')[1]?.trim() || company;
      if (text.includes('Repack Size:')) repackSize = text.split(':')[1]?.trim() || repackSize;
      if (text.includes('Original Size:')) originalSize = text.split(':')[1]?.trim() || originalSize;
      if (text.includes('Installation time:')) installTime = text.split(':')[1]?.trim() || installTime;
    });

    const csrinLink = $('a[href*="cs.rin.ru"]').attr('href') || '';
    const screenshots = [];
    $('article img[src*="-1024x"], article img[src*="fitgirl-repacks.site"]').each((_, el) => {
      let src = $(el).attr('src') || '';
      if (src.includes('-1024x')) src = src.replace('-1024x', '');
      if (src && !src.startsWith('http')) src = 'https://fitgirl-repacks.site' + src;
      if (src) screenshots.push(src);
    });

    return NextResponse.json({
      title,
      cover,
      genres,
      company,
      repackSize,
      originalSize,
      installTime,
      csrinLink,
      screenshots: screenshots.slice(0, 8),
    });
  } catch (error) {
    console.error('Error details:', error.message);
    return NextResponse.json({ error: 'Fallo' });
  }
}
