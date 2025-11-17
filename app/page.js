'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function Home() {
  const [games, setGames] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Estado para vista detalle
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
      const newGames = Array.isArray(data.games) ? data.games : [];

      if (reset) {
        setGames(newGames);
        setPage(2);
      } else {
        setGames(prev => [...prev, ...newGames]);
        setPage(p + 1);
      }
      setHasMore(data.hasMore);
    } catch (err) {
      console.error(err);
      setGames([]);
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
    fetchGames(true);
  };

  const loadMore = () => fetchGames();

  const resetToHome = () => {
    setSearch('');
    setPage(1);
    setSelectedGame(null);
    setGameDetails(null);
    fetchGames(true);
  };

  // Abrir detalles del juego (vista full)
  const openGameDetails = async (game) => {
    setSelectedGame(game);
    setDetailsLoading(true);
    setGameDetails(null);
    window.scrollTo(0, 0);

    try {
      const res = await fetch(`/api/game-details?id=${game.id}`);
      if (res.ok) {
        const data = await res.json();
        setGameDetails(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDetailsLoading(false);
    }
  };

  // Si estamos en vista detalle
  if (selectedGame) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <div className="max-w-6xl mx-auto p-6">
          <button
            onClick={resetToHome}
            className="mb-6 text-yellow-400 hover:text-yellow-300 font-bold flex items-center gap-2"
          >
            ← Volver a la lista
          </button>

          {detailsLoading ? (
            <p className="text-center text-yellow-400 text-2xl">Cargando detalles del juego...</p>
          ) : gameDetails ? (
            <div className="grid md:grid-cols-2 gap-10">
              <div>
                <Image
                  src={gameDetails.cover || selectedGame.cover}
                  alt={gameDetails.title}
                  width={600}
                  height={900}
                  className="rounded-xl shadow-2xl w-full"
                  unoptimized
                />
              </div>
              <div className="space-y-6">
                <h1 className="text-4xl font-bold text-yellow-400">{gameDetails.title}</h1>

                <div className="bg-gray-900 rounded-xl p-6 space-y-4">
                  <h2 className="text-2xl font-bold text-yellow-300">Información</h2>
                  <ul className="space-y-3 text-lg">
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
                    className="inline-block px-8 py-4 bg-green-600 hover:bg-green-500 text-xl font-bold rounded-xl"
                  >
                    Abrir en CS.RIN.RU (Magnet)
                  </a>
                )}

                {gameDetails.screenshots && gameDetails.screenshots.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold text-yellow-300 mb-4">Capturas</h2>
                    <div className="grid grid-cols-2 gap-4">
                      {gameDetails.screenshots.slice(0, 6).map((src, i) => (
                        <Image
                          key={i}
                          src={src}
                          alt={`Screenshot ${i + 1}`}
                          width={600}
                          height={340}
                          className="rounded-lg shadow-lg"
                          unoptimized
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-red-400 text-xl">No se pudieron cargar los detalles del juego</p>
              <button onClick={resetToHome} className="mt-6 text-yellow-400 underline">
                Volver a la lista
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Vista normal: lista de juegos
  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1
          onClick={resetToHome}
          className="text-4xl font-bold text-center mb-8 text-yellow-400 cursor-pointer hover:text-yellow-300 select-none"
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
            <div
              key={game.id}
              onClick={() => openGameDetails(game)}
              className="group cursor-pointer transform hover:scale-105 transition"
            >
              <div className="relative overflow-hidden rounded-xl bg-gray-900 shadow-lg">
                <Image
                  src={game.cover}
                  alt={game.title}
                  width={300}
                  height={450}
                  className="w-full h-auto object-cover"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition">
                  <p className="absolute bottom-3 left-3 right-3 text-sm font-bold line-clamp-3">
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
