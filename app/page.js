'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function Home() {
  const [games, setGames] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchGames = async (reset = false) => {
    if (loading) return;
    setLoading(true);

    const p = reset ? 1 : page;
    const url = search
      ? `/api/games?s=${encodeURIComponent(search)}&page=${p}`
      : `/api/games?page=${p}`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      const newGames = Array.isArray(data.games) ? data.games : [];

      if (reset) {
        setGames(newGames);
        setPage(2);
      } else {
        setGames(prev => [...prev, ...newGames]);
        setPage(prev => prev + 1);
      }
      setHasMore(data.hasMore !== false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames(true);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchGames(true);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-yellow-400">
          Heimdallr Games
        </h1>

        <form onSubmit={handleSearch} className="mb-10 flex gap-3 max-w-xl mx-auto">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar juegos..."
            className="flex-1 px-5 py-3 bg-gray-800 rounded-xl"
          />
          <button type="submit" className="px-8 py-3 bg-yellow-500 text-black font-bold rounded-xl">
            Buscar
          </button>
        </form>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {games.map((game) => (
            <Link key={game.id} href={`/game/${game.id}`}>
              <div className="group cursor-pointer transform hover:scale-105 transition">
                <div className="relative overflow-hidden rounded-xl bg-gray-900 shadow-lg">
                  <Image
                    src={game.cover}
                    alt={game.title}
                    width={300}
                    height={450}
                    className="w-full h-auto object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition">
                    <p className="absolute bottom-3 left-3 right-3 text-sm font-bold line-clamp-3">
                      {game.title}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {loading && <p className="text-center mt-8 text-yellow-400">Cargando...</p>}

        {hasMore && !loading && (
          <div className="text-center mt-12">
            <button
              onClick={() => fetchGames()}
              className="px-8 py-4 bg-yellow-500 text-black font-bold rounded-full hover:bg-yellow-400 transition"
            >
              Cargar más
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
