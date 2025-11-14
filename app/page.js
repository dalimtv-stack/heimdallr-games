'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function Home() {
  const [games, setGames] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);  // FIXED: Error state

  const fetchGames = async (reset = false) => {
    setLoading(true);
    setError(null);
    try {
      const p = reset ? 1 : page;
      const url = search
        ? `/api/games?s=${encodeURIComponent(search.replace(/\s+/g, '+'))}&page=${p}`  // FIXED: Espacios a +
        : `/api/games?page=${p}`;

      console.log('Fetching:', url);  // FIXED: Debug log

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      console.log('Data received:', data);  // FIXED: Debug

      setGames(reset ? data.games : [...games, ...data.games]);
      setHasMore(data.hasMore);
      if (reset) setPage(2);
    } catch (err) {
      console.error('Fetch error:', err);  // FIXED: Log error
      setError(err.message);
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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-6 text-center">
        <h1 className="text-2xl">Error: {error}</h1>
        <button onClick={() => fetchGames(true)} className="mt-4 px-4 py-2 bg-red-600 rounded">Reintentar</button>
      </div>
    );  // FIXED: Muestra error
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-yellow-400">
          Heimdallr Games
        </h1>

        {/* Buscador */}
        <form onSubmit={handleSearch} className="mb-10 flex gap-3 max-w-2xl mx-auto">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar juego..."
            className="flex-1 px-5 py-3 bg-gray-800 rounded-xl text-white placeholder-gray-400 border border-gray-700 focus:border-yellow-500 focus:outline-none"
          />
          <button
            type="submit"
            className="px-8 py-3 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition"
          >
            Buscar
          </button>
        </form>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
          {games.map((game) => (
            <div
              key={game.id}
              className="group cursor-pointer transform transition duration-200 hover:scale-105"
            >
              <div className="relative overflow-hidden rounded-xl shadow-2xl bg-gray-900">
                <Image
                  src={game.cover}
                  alt={game.title}
                  width={300}
                  height={450}
                  className="w-full h-auto object-cover"
                  unoptimized  // FIXED: Para external images
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/300x450?text=Error'; }}  // FIXED: Fallback image
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition">
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-sm font-semibold text-white line-clamp-2">
                      {game.title}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Loading / Cargar más */}
        {loading && <div className="text-center mt-8">Cargando juegos...</div>}
        {hasMore && !loading && (
          <div className="text-center mt-12">
            <button
              onClick={() => { setPage(p => p + 1); fetchGames(); }}
              className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold rounded-full hover:from-yellow-400 hover:to-orange-400 transition"
            >
              Cargar más juegos
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
