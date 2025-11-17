// app/api/game-details/route.js
import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

  // URL real del repack (la que ya usamos en el scraper principal)
  const postUrl = `https://fitgirl-repacks.site/#${id}`;

  try {
    const { data } = await axios.get(postUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 15000,
    });
    const $ = cheerio.load(data);

    const title = $('h1.entry-title').text().trim().replace(/– FitGirl Repack.*/i, '') || 'Sin título';

    const cover = $('meta[property="og:image"]').attr('content') || '';

    let genres = 'N/A';
    let company = 'N/A';
    let repackSize = 'N/A';
    let originalSize = 'N/A';
    let installTime = 'N/A';

    $('article p, article li').each((i, el) => {
      const text = $(el).text();
      if (text.includes('Genres/Tags:')) genres = text.replace('Genres/Tags:', '').trim();
      if (text.includes('Company:') || text.includes('Companies:')) company = text.replace(/Compan(y|ies):/g, '').trim();
      if (text.includes('Repack Size:')) repackSize = text.replace('Repack Size:', '').trim();
      if (text.includes('Original Size:')) originalSize = text.replace('Original Size:', '').trim();
      if (text.includes('Installation time:')) installTime = text.replace('Installation time:', '').trim();
    });

    const csrinLink = $('a[href*="cs.rin.ru"]').attr('href') || '';

    const screenshots = [];
    $('article img[src*="-1024x"]').each((i, el) => {
      let src = $(el).attr('src');
      if (src) {
        src = src.replace('-1024x', '').replace('-scaled', '');
        if (src.startsWith('/')) src = 'https://fitgirl-repacks.site' + src;
        screenshots.push(src);
      }
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
      screenshots: screenshots.slice(0, 6),
    });
  } catch (error) {
    console.error('Error details:', error.message);
    return NextResponse.json({ error: 'Fallo al cargar' }, { status: 500 });
  }
}
