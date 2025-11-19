import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  if (!url) return NextResponse.json({ isAdult: false });

  try {
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 15000,
    });
    const $ = cheerio.load(data);
    const genresText = $('span:contains("Genres/Tags:")').next('p').text();
    const isAdult = /adult|eroge|nsfw|hentai|sexual content/i.test(genresText);
    return NextResponse.json({ isAdult });
  } catch {
    return NextResponse.json({ isAdult: false });
  }
}
