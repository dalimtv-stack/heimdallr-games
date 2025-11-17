'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import axios from 'axios';
import * as cheerio from 'cheerio';

export default function Home() {
  const [games, setGames] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [tab, setTab] = useState('novedades');
  const [expandedId, setExpandedId] = useState(null);
  const [expandedDetails, setExpandedDetails] = useState({});

  const fetchGames = async (reset = false) => {
    setLoading(true);
    const p = reset ? 1 : page;
    const params = new URLSearchParams();
    params.set('tab', tab);
    if (search) params.set('s', search.trim());
    params.set('page', p);

    try {
      const res = await fetch(`/api/games?${params.toString()}`);
      const data = await res.json();

      const newGames = Array.isArray(data.games) ? data.games : [];
      for (const game of newGames) {
        game.postUrl = game.postUrl || `https://fitgirl-repacks.site/#${game.id}`;
      }

      if (reset) {
        setGames(newGames);
        setPage(2);
      } else {
        setGames(prev => [...prev, ...newGames]);
        setPage(p + 1);
      }
      setHasMore(data.hasMore);
    } catch (err) {
      console.error('Error cargando juegos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    setExpandedId(null);
    fetchGames(true);
  }, [tab, search]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setExpandedId(null);
    fetchGames(true);
  };

  const loadMore = () => fetchGames();

  const toggleExpand = async (game) => {
    if (expandedId === game.id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(game.id);
    if (expandedDetails[game.id]) return;

    setExpandedDetails(prev => ({ ...prev, [game.id]: { loading: true } }));

    try {
      const { data } = await axios.get(game.postUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        timeout: 15000,
      });
      const $ = cheerio.load(data);

      const title = $('h1.entry-title').text().trim().replace(/– FitGirl Repack.*/i, '') || game.title;
      const cover = $('meta[property="og:image"]').attr('content') || game.cover;

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

      const screenshots = [];
      $('article img[src*="-1024x"], article img[src*="fitgirl-repacks.site"]').each((_, el) => {
        let src = $(el).attr('src') || '';
        if (src.includes('-1024x')) src = src.replace('-1024x', '');
        if (!src.startsWith('http')) src = 'https://fitgirl-repacks.site' + src;
        if (src) screenshots.push(src);
      });

      setExpandedDetails(prev => ({
        ...prev,
        [game.id]: { title, cover, repackSize, originalSize, installTime, genres, company, csrinLink, screenshots: screenshots.slice(0, 6) }
      }));
    } catch (err) {
      setExpandedDetails(prev => ({ ...prev, [game.id]: { error: true } }));
    }
  };

  const resetToHome = () => {
    setSearch('');
    setTab('novedades');
    setPage(1);
    setExpandedId(null);
    fetchGames(true);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1
          onClick={resetToHome}
          className="text-5xl font-bold text-center mb-8 text-yellow-400 cursor-pointer hover:text-yellow-300 transition select-none"
        >
          Heimdallr Games
        </h1>

        <form onSubmit={handleSearch} className="mb-8 flex gap-4 max-w-2xl mx-auto">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar juegos..."
            className="flex-1 px-6 py-4 bg-gray-800 rounded-xl text-lg"
          />
          <button type="submit" className="px-10 py-4 bg-yellow-500 text-black font-bold rounded-xl">
            Buscar
          </button>
        </form>

        {/* Pestañas */}
        <div className="mb-8 flex justify-center gap-2">
          {[
            { key: 'novedades', label: 'Novedades' },
            { key: 'populares_mes', label: 'Populares (mes)' },
            { key: 'populares_ano', label: 'Populares (año)' },
            { key: 'todos_az', label: 'Todos (A-Z)' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-6 py-3 rounded-lg font-bold transition ${tab === key ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8">
          {games.map((game) => (
            <div key={game.id} className="space-y-4">
              <div
                onClick={() => toggleExpand(game)}
                className="cursor-pointer group transform hover:scale-105 transition-all duration-300"
              >
                <div className="relative overflow-hidden rounded-xl bg-gray-900 shadow-2xl">
                  <Image
                    src={game.cover}
                    alt={game.title}
                    width={300}
                    height={450}
                    className="w-full h-auto object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition">
                    <p className="absolute bottom-3 left-3 right-3 text-sm font-bold line-clamp-3">
                      {game.title}
                    </p>
                  </div>
                </div>
              </div>

              {expandedId === game.id && (
                <div className="bg-gray-900 rounded-xl p-6 border-4 border-yellow-500 shadow-2xl">
                  {expandedDetails[game.id]?.loading && (
                    <p className="text-center text-yellow-400">Cargando detalles...</p>
                  )}
                  {expandedDetails[game.id]?.error && (
                    <p className="text-center text-red-400">Error al cargar detalles</p>
                  )}
                  {expandedDetails[game.id] && !expandedDetails
