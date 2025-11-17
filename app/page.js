'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function Home() {
  const [games, setGames] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [details, setDetails] = useState({});

  const fetchGames = async (reset = false) => {
    if (loading) return;
    setLoading(true);

    const p = reset ? 1 : page;
    const params = new URLSearchParams();
    if (search) params.set('s', search.trim());
    params.set('page', p);

    try {
      const res = await fetch(`/api/games?${params.toString()}`);
      const data = await res.json();

      const newGames = Array.isArray(data.games) ? data.games : [];

      if (reset) {
        setGames(newGames);
        setPage(2);
      } else {
        setGames(prev => [...prev, ...newGames]);
        setPage(prev => prev + 1);
      }
      setHasMore(!!data.hasMore);
    } catch (err) {
      console.error(err);
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

  const toggleGame = async (game) => {
    if (expandedId === game.id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(game.id);

    if (details[game.id]) return;

    setDetails(prev => ({ ...prev, [game.id]: { loading: true } }));

    try {
      const res = await fetch(`/api/game-details?id=${game.id}`);
      const data = await res.json();
      setDetails(prev => ({ ...prev, [game.id]: data }));
    } catch {
      setDetails(prev => ({ ...prev, [game.id]: { error: true } }));
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
            <div key={game.id}>
              <div
                onClick={() => toggleGame(game)}
                className="cursor-pointer group"
              >
                <Image
                  src={game.cover}
                  alt={game.title}
                  width={300}
                  height={450}
                  className="w-full rounded-xl shadow-2xl group-hover:shadow-yellow-500/50 transition-shadow"
                  unoptimized
                />
              </div>

              {expandedId === game.id && (
                <div className="mt-6 bg-gray-900 rounded-xl p-6 border-4 border-yellow-500">
                  {details[game.id]?.loading && <p className="text-center text-yellow-400">Cargando...</p>}
                  {details[game.id]?.error && <p className="text-center text-red-400">Error</p>}
                  {details[game.id] && !details[game.id].loading && (
                    <>
                      <h3 className="text-2xl font-bold text-yellow-400 mb-4">{details[game.id].title}</h3>
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        {details[game.id].screenshots?.slice(0, 4).map((s, i) => (
                          <Image key={i} src={s} alt="" width={300} height={169} className="rounded-lg" unoptimized />
                        ))}
                      </div>
                      <div className="space-y-2 text-sm">
                        <p><strong>Géneros:</strong> {details[game.id].genres || 'N/A'}</p>
                        <p><strong>Repack:</strong> {details[game.id].repackSize || 'N/A'}</p>
                        <p><strong>Original:</strong> {details[game.id].originalSize || 'N/A'}</p>
                        <p><strong>Instalación:</strong> {details[game.id].installTime || 'N/A'}</p>
                      </div>
                      {details[game.id].csrinLink && (
                        <a
                          href={details[game.id].csrinLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-6 block text-center py-4 bg-green-600 hover:bg-green-500 rounded-lg font-bold"
                        >
                          Descargar (Magnet)
                        </a>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {!loading && games.length === 0 && (
          <p className="text-center text-3xl text-yellow-400 mt-20">Cargando juegos...</p>
        )}

        {hasMore && games.length > 0 && (
          <div className="text-center mt-16">
            <button
              onClick={() => fetchGames()}
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
