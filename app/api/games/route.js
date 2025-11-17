// app/api/game-details/route.js
import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'No ID' }, { status: 400 });

  // Construimos la URL del post usando el ID (FitGirl usa #ID al final)
  const postUrl = `https://fitgirl-repacks.site/all-my-repacks-a-z/#${id}`;

  try {
    const { data } = await axios.get(postUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 15000,
    });

    const $ = cheerio.load(data);

    // Título
    const title = $('h1.entry-title').text().trim().replace(/– FitGirl Repack.*/i, '');

    // Carátula grande
    const cover = $('meta[property="og:image"]').attr('content') || '';

    // Info básica (Géneros, Compañía)
    let genres = '';
    let company = '';
    $('article p').each((i, el) => {
      const text = $(el).text();
      if (text.includes('Genres/Tags:')) genres = text.replace('Genres/Tags:', '').trim();
      if (text.includes('Company:') || text.includes('Companies:')) company = text.replace(/Compan(y|ies):/, '').trim();
    });

    // Tamaños
    let repackSize = 'N/A';
    let originalSize = 'N/A';
    let installTime = 'N/A';

    $('article li').each((i, el) => {
      const text = $(el).text();
      if (text.includes('Repack Size:')) repackSize = text.replace('Repack Size:', '').trim();
      if (text.includes('Original Size:')) originalSize = text.replace('Original Size:', '').trim();
      if (text.includes('Installation time:')) installTime = text.replace('Installation time:', '').trim();
    });

    // Link CS.RIN.RU (magnet)
    const csrinLink = $('a[href*="cs.rin.ru"]').attr('href') || '';

    // Capturas de pantalla
    const screenshots = [];
    $('article img').each((i, el) => {
      const src = $(el).attr('src');
      if (src && src.includes('fitgirl-repacks.site') && src.includes('-1024x')) {
        screenshots.push(src.replace('-1024x', ''));
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
    console.error('Error scraping game details:', error.message);
    return NextResponse.json({ error: 'Failed to load details' }, { status: 500 });
  }
}
