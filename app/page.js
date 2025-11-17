'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function Home() {
  const [games, setGames] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Estado del modal
  const [selectedGame, setSelectedGame] = useState(null);
  const [gameDetails, setGameDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

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

  const resetToHome = () => {
    setSearch('');
    setPage(1);
    fetchGames(true);
  };

  // NUEVO: Abrir modal con datos del juego
  const openGameDetails = async (game) => {
    setSelectedGame(game);
    setDetailsLoading(true);
    setGameDetails(null);

    try {
      const res = await fetch(`/api/game-details?id=${game.id}`);
      const data = await res.json();
      setGameDetails(data);
    } catch (err) {
      console.error('Error loading game details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedGame(null);
    setGameDetails(null);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
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

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
          {games.map((game) => (
            <div key={game.id} className="group cursor-pointer" onClick={() => openGameDetails(game)}>
              <div className="relative overflow-hidden rounded-xl bg-gray-900 shadow-lg">
                <Image
                  src={game.cover}
                  alt={game.title}
                  width={300}
                  height={450}
                  className="w-full h-auto object-cover transition transform group-hover:scale-105"
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

        {loading && <p className="text-center mt-8 text-yellow-400">Cargando juegos...</p>}

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

      {/* MODAL */}
      {selectedGame && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl max-w-4xl w-full max-h-screen overflow-y-auto p-6 relative">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-white text-3xl hover:text-yellow-400"
            >
              ×
            </button>

            {detailsLoading ? (
              <p className="text-center text-yellow-400">Cargando detalles...</p>
            ) : gameDetails ? (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-yellow-400">{gameDetails.title}</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Image
                      src={gameDetails.cover}
                      alt={gameDetails.title}
                      width={600}
                      height={900}
                      className="rounded-xl shadow-2xl"
                      unoptimized
                    />
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-bold text-yellow-300">Información</h3>
                      <ul className="text-sm space-y-1 mt-2">
                        <li><strong>Géneros:</strong> {gameDetails.genres || 'N/A'}</li>
                        <li><strong>Compañía:</strong> {gameDetails.company || 'N/A'}</li>
                        <li><strong>Tamaño Repack:</strong> {gameDetails.repackSize || 'N/A'}</li>
                        <li><strong>Tamaño Original:</strong> {gameDetails.originalSize || 'N/A'}</li>
                        <li><strong>Tiempo instalación:</strong> {gameDetails.installTime || 'N/A'}</li>
                      </ul>
                    </div>

                    {gameDetails.csrinLink && (
                      <a
                        href={gameDetails.csrinLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-bold"
                      >
                        Abrir en CS.RIN.RU (Magnet)
                      </a>
                    )}

                    {gameDetails.screenshots.length > 0 && (
                      <div>
                        <h3 className="text-xl font-bold text-yellow-300 mt-6">Capturas</h3>
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          {gameDetails.screenshots.slice(0, 4).map((src, i) => (
                            <Image key={i} src={src} alt="screenshot" width={400} height={225} className="rounded-lg" unoptimized />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-red-400">No se pudieron cargar los detalles</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
