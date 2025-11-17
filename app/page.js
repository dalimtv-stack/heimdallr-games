'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function Home() {
  const [games, setGames] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true); // ← empieza en true
  const [hasMore, setHasMore] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [gameDetails, setGameDetails] = useState({});

  // Carga juegos (usa exactamente tu API que ya funciona)
  const fetchGames = async (reset = false) => {
    if (loading && !reset) return;
    setLoading(true);

    const currentPage = reset ? 1 : page;
    const url = search
      ? `/api/games?s=${encodeURIComponent(search.trim())}&page=${currentPage}`
      : `/api/games?page=${currentPage}`;

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

      setHasMore(data.hasMore === true);
    } catch (err) {
      console.error('Error cargando juegos:', err);
      setHasMore(false);
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
    setExpandedId(null);
    fetchGames(true);
  };

  const loadMore = () => fetchGames();

  const toggleDetails = async (game) => {
    if (expandedId === game.id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(game.id);

    if (gameDetails[game.id]) return;

    setGameDetails(prev => ({ ...prev, [game.id]: { loading: true } }));

    try {
      const res = await fetch(`/api/game-details?id=${game.id}`);
      const data = await res.json();
      setGameDetails(prev => ({ ...prev, [game.id]: data || { error: true } }));
    } catch {
      setGameDetails(prev => ({ ...prev, [game.id]: { error: true } }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-5xl font-bold text-center mb-12 text-yellow-400">
          Heimdallr Games
        </h1>

        <form onSubmit={handleSearch} className="mb-12 flex gap-4 max-w-2xl mx-auto">
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

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8">
          {games.map((game) => (
            <div key={game.id} className="space-y-4">
              <div
                onClick={() => toggleDetails(game)}
                className="cursor-pointer group transform hover:scale-105 transition-all duration-300"
              >
                <Image
                  src={game.cover}
                  alt={game.title}
                  width={300}
                  height={450}
                  className="w-full rounded-xl shadow-2xl"
                  unoptimized
                />
              </div>

              {expandedId === game.id && (
                <div className="bg-gray-900 rounded-xl p-6 border-4 border-yellow-500">
                  {gameDetails[game.id]?.loading && (
                    <p className="text-center text-yellow-400">Cargando detalles...</p>
                  )}
                  {gameDetails[game.id]?.error && (
                    <p className="text-center text-red-400">Error al cargar</p>
                  )}
                  {gameDetails[game.id] && !gameDetails[game.id].loading && !gameDetails[game.id].error && (
                    <div className="space-y-4">
                      <h3 className="text-2xl font-bold text-yellow-400">{gameDetails[game.id].title}</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {gameDetails[game.id].screenshots?.slice(0, 4).map((src, i) => (
                          <Image key={i} src={src} alt="" width={400} height={225} className="rounded-lg" unoptimized />
                        ))}
                      </div>
                      <div className="text-sm space-y-2">
                        <p><strong>Géneros:</strong> {gameDetails[game.id].genres || 'N/A'}</p>
                        <p><strong>Repack:</strong> {gameDetails[game.id].repackSize || 'N/A'}</p>
                        <p><strong>Original:</strong> {gameDetails[game.id].originalSize || 'N/A'}</p>
                        <p><strong>Instalación:</strong> {gameDetails[game.id].installTime || 'N/A'}</p>
                      </div>
                      {gameDetails[game.id].csrinLink && (
                        <a
                          href={gameDetails[game.id].csrinLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-center mt-4 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-bold"
                        >
                          Descargar (Magnet)
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Mensaje inicial */}
        {loading && games.length === 0 && (
          <p className="text-center text-3xl text-yellow-400 mt-20">Cargando juegos...</p>
        )}

        {/* Cargar más */}
        {hasMore && games.length > 0 && (
          <div className="text-center mt-16">
            <button
              onClick={loadMore}
              disabled={loading}
              className="px-12 py-5 bg-yellow-500 text-black text-xl font-bold rounded-full disabled:opacity-50"
            >
              {loading ? 'Cargando...' : 'Cargar más'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
