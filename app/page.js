'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';

async function sendMagnetToQB(magnet) {
  try {
    const form = new FormData();
    form.append('urls', magnet);
    form.append('paused', 'false');
    const res = await fetch('http://localhost:8080/api/v2/torrents/add', {
      method: 'POST',
      body: form,
      credentials: 'include',
    });
    if (!res.ok) throw new Error('qBittorrent add failed');
    alert('Magnet enviado a qBittorrent');
  } catch (err) {
    alert('Error enviando magnet: ' + err.message);
  }
}

export default function Home() {
  const [games, setGames] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [tab, setTab] = useState('novedades');
  const [viewMode, setViewMode] = useState('list'); // 'list' o 'detail'
  const [selectedGame, setSelectedGame] = useState(null);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [showRepack, setShowRepack] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const fetchGames = async (reset = false) => {
    setLoading(true);
    const p = reset ? 1 : page;
    const params = new URLSearchParams();
    params.set('tab', tab);
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
    setSelectedGame(null);
    setSelectedDetails(null);
    setViewMode('list');
    fetchGames(true);
  }, [tab]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSelectedGame(null);
    setSelectedDetails(null);
    setViewMode('list');
    fetchGames(true);
  };

  const loadMore = () => fetchGames();

  const handleSelect = async (game) => {
    setSelectedGame(game);
    setSelectedDetails({ loading: true });
    setViewMode('detail');
    try {
      const res = await fetch(`/api/details?url=${encodeURIComponent(game.postUrl)}`);
      const data = await res.json();
      setSelectedDetails(data);
    } catch (err) {
      setSelectedDetails({ error: true });
    }
  };

  const resetToHome = () => {
    setSearch('');
    setTab('novedades');
    setPage(1);
    setSelectedGame(null);
    setSelectedDetails(null);
    setViewMode('list');
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

        <div className="mb-8 flex justify-center gap-2 flex-wrap">
          {[
            { key: 'novedades', label: 'Novedades' },
            { key: 'populares_mes', label: 'Populares (mes)' },
            { key: 'populares_ano', label: 'Populares (año)' },
            { key: 'todos_az', label: 'Todos (A-Z)' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-6 py-3 rounded-lg font-bold transition ${
                tab === key ? 'bg-yellow-500 text-black' : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {viewMode === 'list' && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8">
              {games.map((game) => (
                <div key={game.id} className="space-y-4">
                  <div
                    onClick={() => handleSelect(game)}
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
                </div>
              ))}
            </div>

            {loading && games.length === 0 && (
              <p className="text-center text-3xl text-yellow-400 mt-20">Cargando juegos...</p>
            )}

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
          </>
        )}

        {viewMode === 'detail' && selectedGame && (
          <div className="mt-12 bg-gray-900 rounded-xl p-6 border-4 border-yellow-500 shadow-2xl">
            {/* Botón arriba */}
            <button
              onClick={() => setViewMode('list')}
              className="mb-6 px-6 py-3 bg-yellow-500 text-black font-bold rounded-lg"
            >
              Volver al listado
            </button>

            {selectedDetails?.loading && (
              <p className="text-center text-yellow-400">Cargando detalles...</p>
            )}
            {selectedDetails?.error && (
              <p className="text-center text-red-400">Error al cargar detalles</p>
            )}
            {selectedDetails && !selectedDetails.loading && !selectedDetails.error && (
              <div className="space-y-6">
                {/* Carátula + título con fallback */}
                <div className="flex gap-6 items-start">
                  <Image
                    src={selectedDetails.cover || selectedGame.cover}
                    alt={selectedDetails.title || selectedGame.title}
                    width={200}
                    height={300}
                    className="rounded-lg"
                    unoptimized
                  />
                  <h3 className="text-3xl font-bold text-yellow-400">
                    {selectedDetails.title && !selectedDetails.title.includes('FitGirl Repacks')
                      ? selectedDetails.title
                      : selectedGame.title}
                  </h3>
                </div>

                {/* Campos principales */}
                <div className="text-sm space-y-2">
                  <p><strong>Géneros:</strong> {selectedDetails.genres || 'N/A'}</p>
                  <p><strong>Compañía:</strong> {selectedDetails.company || 'N/A'}</p>
                  <p><strong>Idiomas:</strong> {selectedDetails.languages || 'N/A'}</p>
                  <p><strong>Tamaño Original:</strong> {selectedDetails.originalSize || 'N/A'}</p>
                  <p><strong>Tamaño del Repack:</strong> {selectedDetails.repackSize || 'N/A'}</p>
                  <p><strong>Tamaño de la instalación:</strong> {selectedDetails.installedSize || 'N/A'}</p>

                  {/* Mirrors como lista */}
                  <div className="space-y-2">
                    <p className="font-bold">Download Mirrors:</p>
                    {selectedDetails.mirrors?.length > 0 ? (
                      <ul className="list-disc list-inside text-sm">
                        {selectedDetails.mirrors.map((url, i) => (
                          <li key={i}>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:underline break-all"
                            >
                              {url.startsWith('magnet:') ? 'Magnet Link' : url}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>N/A</p>
                    )}
                  </div>
                </div>

                {/* Capturas más compactas */}
                <div className="grid grid-cols-2 gap-2">
                  {selectedDetails.screenshots?.slice(0, 4).map((src, i) => (
                    <Image
                      key={i}
                      src={src}
                      alt=""
                      width={300}
                      height={169}
                      className="rounded-lg"
                      unoptimized
                    />
                  ))}
                </div>

                {/* Secciones plegables con estilo clickable */}
                <div>
                  <button
                    onClick={() => setShowRepack(!showRepack)}
                    className="w-full text-left py-3 px-4 font-bold text-yellow-400 bg-gray-800 rounded-lg hover:bg-gray-700 transition flex justify-between items-center"
                  >
                    Características del repack
                    <span>{showRepack ? '▲' : '▼'}</span>
                  </button>
                  {showRepack && (
                    <p className="mt-2 text-sm bg-gray-900 p-4 rounded-lg">{selectedDetails.repackFeatures || 'N/A'}</p>
                  )}
                </div>

                <div>
                  <button
                    onClick={() => setShowInfo(!showInfo)}
                    className="w-full text-left py-3 px-4 font-bold text-yellow-400 bg-gray-800 rounded-lg hover:bg-gray-700 transition flex justify-between items-center"
                  >
                    Información del juego
                    <span>{showInfo ? '▲' : '▼'}</span>
                  </button>
                  {showInfo && (
                    <p className="mt-2 text-sm bg-gray-900 p-4 rounded-lg">{selectedDetails.gameInfo || 'N/A'}</p>
                  )}
                </div>

                {selectedDetails.csrinLink && (
                  <>
                    <button
                      onClick={() => sendMagnetToQB(selectedDetails.csrinLink)}
                      className="mt-6 block w-full text-center py-4 bg-green-600 hover:bg-green-500 rounded-lg font-bold"
                    >
                      Instalar en qBittorrent
                    </button>
                    {/* Imagen torrent-stats solo abajo */}
                    {selectedDetails.torrentStatsImage && (
                      <Image
                        src={selectedDetails.torrentStatsImage}
                        alt="Torrent stats"
                        width={800}
                        height={200}
                        className="w-full mt-4 rounded-lg border border-gray-700"
                        unoptimized
                      />
                    )}
                  </>
                )}

                {/* Botón abajo */}
                <button
                  onClick={() => setViewMode('list')}
                  className="mt-8 px-6 py-3 bg-yellow-500 text-black font-bold rounded-lg"
                >
                  Volver al listado
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
