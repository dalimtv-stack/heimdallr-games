'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function Home() {
  const [games, setGames] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [expandedId, setExpandedId] = useState(null); // ← juego expandido
  const [expandedDetails, setExpandedDetails] = useState({});

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
      setHasMore(!!data.hasMore);
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
    setExpandedId(null);
    fetchGames(true);
  };

  const toggleExpand = async (game) => {
    if (expandedId === game.id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(game.id);
    setExpandedDetails(prev => ({ ...prev, [game.id]: { loading: true } }));

    try {
      const res = await fetch(`/api/game-details?id=${game.id}`);
      if (res.ok) {
        const data = await res.json();
        setExpandedDetails(prev => ({ ...prev, [game.id]: data }));
      }
    } catch (err) {
      setExpandedDetails(prev => ({ ...prev, [game.id]: { error: true } }));
    }
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
            className="flex-1 px-5 py-3 bg-gray-800 rounded-xl text-white"
          />
          <button type="submit" className="px-8 py-3 bg-yellow-500 text-black font-bold rounded-xl">
            Buscar
          </button>
        </form>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {games.map((game) => (
            <div key={game.id} className="space-y-4">
              {/* Tarjeta del juego */}
              <div
                onClick={() => toggleExpand(game)}
                className="group cursor-pointer transform hover:scale-105 transition-all duration-300"
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

              {/* Información expandida */}
              {expandedId === game.id && (
                <div className="bg-gray-900 rounded-xl p-6 border-2 border-yellow-500 shadow-2xl">
                  {expandedDetails[game.id]?.loading ? (
                    <p className="text-yellow-400 text-center">Cargando detalles...</p>
                  ) : expandedDetails[game.id]?.error ? (
                    <p className="text-red-400 text-center">Error al cargar</p>
                  ) : expandedDetails[game.id] ? (
                    <div className="space-y-4 text-sm">
                      <h3 className="text-xl font-bold text-yellow-400">{expandedDetails[game.id].title}</h3>
                      <Image src={expandedDetails[game.id].cover} alt="" width={600} height={900} className="rounded-lg w-full" unoptimized />
                      
                      <div className="space-y-2">
                        <p><strong>Géneros:</strong> {expandedDetails[game.id].genres || 'N/A'}</p>
                        <p><strong>Compañía:</strong> {expandedDetails[game.id].company || 'N/A'}</p>
                        <p><strong>Repack:</strong> {expandedDetails[game.id].repackSize || 'N/A'}</p>
                        <p><strong>Original:</strong> {expandedDetails[game.id].originalSize || 'N/A'}</p>
                        <p><strong>Instalación:</strong> {expandedDetails[game.id].installTime || 'N/A'}</p>
                      </div>

                      {expandedDetails[game.id].csrinLink && (
                        <a
                          href={expandedDetails[game.id].csrinLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-center py-3 bg-green-600 hover:bg-green-500 rounded-lg font-bold"
                        >
                          Descargar (Magnet)
                        </a>
                      )}

                      {expandedDetails[game.id].screenshots?.length > 0 && (
                        <div className="grid grid-cols-2 gap-3 mt-4">
                          {expandedDetails[game.id].screenshots.slice(0, 4).map((src, i) => (
                            <Image key={i} src={src} alt="" width={400} height={225} className="rounded-lg" unoptimized />
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </div>

        {loading && <p className="text-center mt-10 text-yellow-400">Cargando juegos...</p>}

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
