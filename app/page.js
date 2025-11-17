'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';

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
      ? `/api/games?s=${encodeURIComponent(search.trim())}&page=${p}`
      : `/api/games?page=${p}`;

    try {
      const res = await fetch(url);
      const data = await res.json();

      if (reset) {
        setGames(data.games);
        setPage(2);
      } else {
        setGames(prev => [...prev, ...data.games]);
        setPage(p + 1);
      }
      setHasMore(data.hasMore);
    } catch (err) {
      console.error('Fetch error:', err);
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

  const loadMore = () => {
    fetchGames();
  };

  // FIXED: Reset limpio sin tocar el input
  const resetToHome = () => {
    setSearch('');      // Limpia el campo de búsqueda
    setPage(1);         // Vuelve a página 1
    fetchGames(true);   // Recarga desde cero
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Título clicable – ahora funciona perfecto */}
        <h1 
          className="text-4xl font-bold text-center mb-8 text-yellow-400 cursor-pointer hover:text-yellow-300 transition select-none"
          onClick={resetToHome}
        >
          Heimdallr Games
        </h1>

        <form onSubmit={handleSearch} className="mb-10 flex gap-3 max-w-2xl mx-auto">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar juegos..."
            className="flex-1 px-5 py-3 bg-gray-800 rounded-xl text-white"
          />
          <button type="submit" className="px-8 py-3 bg-yellow-500 text-black font-bold rounded-xl">
            Buscar
          </button>
        </form>

        {/* Resto del código igual */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
          {games.map((game) => (
            <div key={game.id} className="group">
              <div className="relative overflow-hidden rounded-xl bg-gray-900 shadow-lg">
                <Image
                  src={game.cover}
                  alt={game.title}
                  width={300}
                  height={450}
                  className="w-full h-auto object-cover"
                  unoptimized={true}
                  onError={(e) => {
                    e.currentTarget.src = 'https://via.placeholder.com/300x450/333/fff?text=No+Cover';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-0 group-hover:opacity-100 transition">
                  <p className="absolute bottom-3 left-3 text-sm font-bold text-white line-clamp-2">
                    {game.title}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {loading && <p className="text-center mt-8 text-yellow-400">Cargando...</p>}

        {hasMore && !loading && (
          <div className="text-center mt-12">
            <button
              onClick={loadMore}
              className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold rounded-full"
            >
              Cargar más
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
