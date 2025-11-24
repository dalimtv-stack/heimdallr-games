'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Heart, Star, ChevronLeft, ChevronRight } from 'lucide-react';

// ──────────────────────────────────────────────────────────────
// Componente para mostrar negritas reales (solo **texto**)
// ──────────────────────────────────────────────────────────────
function MarkdownText({ text }) {
  if (!text) return <p className="text-gray-500 italic">No hay descripción disponible.</p>;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <span key={i} className="font-bold text-yellow-400">
              {part.slice(2, -2)}
            </span>
          );
        }
        return part.split('\n').map((line, j, arr) => (
          <span key={`${i}-${j}`}>
            {line || '\u00A0'}
            {j < arr.length - 1 && <br />}
          </span>
        ));
      })}
    </>
  );
}

// ──────────────────────────────────────────────────────────────
// VISOR DE CAPTURAS + TRÁILER
// ──────────────────────────────────────────────────────────────
function MediaViewer({ media = [], startIndex = 0, onClose }) {
  const [index, setIndex] = useState(startIndex);
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIndex(prev => prev > 0 ? prev - 1 : media.length - 1);
      if (e.key === 'ArrowRight') setIndex(prev => prev < media.length - 1 ? prev + 1 : 0);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [media.length, onClose]);
  if (!media.length) return null;
  const current = media[index];
  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="relative max-w-7xl w-full h-full flex items-center justify-center px-8"
        onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-6 right-6 text-6xl text-white hover:text-yellow-400 z-10">×</button>
        {current.type === 'video' ? (
          <video controls autoPlay className="max-w-full max-h-full rounded-xl shadow-2xl">
            <source src={current.src} type="video/webm" />
          </video>
        ) : (
          <Image
            src={current.src}
            alt={`Captura ${index + 1}`}
            width={1920}
            height={1080}
            className="max-w-full max-h-full object-contain"
            unoptimized
          />
        )}
        {media.length > 1 && (
          <>
            <button onClick={() => setIndex(prev => prev > 0 ? prev - 1 : media.length - 1)}
              className="absolute left-8 text-7xl text-white hover:text-yellow-400">
                <ChevronLeft className="w-16 h-16"/>
            </button>
            <button onClick={() => setIndex(prev => prev < media.length - 1 ? prev + 1 : 0)}
              className="absolute right-8 text-7xl text-white hover:text-yellow-400">
                <ChevronRight className="w-16 h-16"/>
            </button>
          </>
        )}
        {media.length > 1 && (
          <div className="absolute bottom-8 bg-black/70 px-6 py-3 rounded-full text-xl font-bold text-white">
            {index + 1} / {media.length}
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Componente principal
// ──────────────────────────────────────────────────────────────
async function sendMagnetToQB(magnet) {
  try {
    window.location.href = magnet;
    alert('Magnet abierto en qBittorrent');
  } catch (err) {
    alert('Error abriendo magnet: ' + err.message);
  }
}

export default function Home() {
  const [games, setGames] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [tab, setTab] = useState('novedades');
  const [viewMode, setViewMode] = useState('list');
  const [selectedGame, setSelectedGame] = useState(null);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [showRepack, setShowRepack] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showUpdates, setShowUpdates] = useState(false);
  const [nextGame, setNextGame] = useState(null); // ← SIN TIPOS → 100% JS PURO

  // ==== FAVORITOS ====
  // Se recomienda que favorites guarde objetos { id: string, postUrl: string } para el futuro
  const [favorites, setFavorites] = useState([]); 

  useEffect(() => {
    const saved = localStorage.getItem('heimdallr_favorites');
    if (saved) setFavorites(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('heimdallr_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (gameId) => {
    // Para simplificar la corrección actual, mantenemos la lógica de guardar solo IDs
    setFavorites(prev =>
      prev.includes(gameId)
        ? prev.filter(id => id !== gameId)
        : [...prev, gameId]
    );
  };

  const isFavorite = (gameId) => favorites.includes(gameId);

  // ==== VISOR ====
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerMedia, setViewerMedia] = useState([]);
  const [viewerStartIndex, setViewerStartIndex] = useState(0);

  const openViewer = (mediaArray, startIdx = 0) => {
    setViewerMedia(mediaArray);
    setViewerStartIndex(startIdx);
    setViewerOpen(true);
  };

  const fetchRealCover = async (game) => {
    if (tab !== 'buscador' || game.cover) return;
    try {
      const res = await fetch(`/api/details?url=${encodeURIComponent(game.postUrl)}`);
      const data = await res.json();
      if (data.cover) {
        setGames(prev => prev.map(g =>
          g.id === game.id ? { ...g, cover: data.cover } : g
        ));
      }
    } catch (err) {
      console.log('No se pudo cargar portada para:', game.title);
    }
  };

  const fetchGames = async (reset = false) => {
    if (tab === 'buscador' && !search.trim()) {
      setGames([]);
      setHasMore(false);
      setLoading(false);
      return;
    }
    if (tab === 'favoritos' && favorites.length === 0) {
        setGames([]);
        setHasMore(false);
        setLoading(false);
        return;
    }

    setLoading(true);
    const p = reset ? 1 : page;
    
    let res;

    // 🚩 CORRECCIÓN PARA FAVORITOS: Usar POST para enviar IDs al backend
    if (tab === 'favoritos') {
      try {
        res = await fetch('/api/games', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // Enviamos la lista de IDs de favoritos al servidor
          body: JSON.stringify({ favorites: Array.isArray(favorites) ? favorites : [] }),
        });
      } catch (err) {
        console.error('Error en POST /api/games para favoritos:', err);
        setLoading(false);
        return;
      }
    } else {
      // Para las otras pestañas, usamos el método GET original
      const params = new URLSearchParams();
      params.set('tab', tab);
      if (search && tab === 'buscador') params.set('search', search.trim());
      params.set('page', p);
      res = await fetch(`/api/games?${params.toString()}`);
    }
    // 🚩 FIN DE LA CORRECCIÓN DE FAVORITOS

    try {
      const data = await res.json();
      const newGames = Array.isArray(data.games) ? data.games : [];

      // No se requiere filtro, asumimos que el backend devuelve SÓLO los juegos relevantes/favoritos
      const filteredGames = newGames; 

      if (reset) {
        setGames(filteredGames);
        setPage(2);
      } else {
        setGames(prev => [...prev, ...filteredGames]);
        setPage(p + 1);
      }
      // Para favoritos, setHasMore puede ser false si el backend no soporta paginación por POST,
      // pero para las otras pestañas mantenemos la lógica de la API.
      setHasMore(tab !== 'favoritos' ? data.hasMore : false); 
      if (tab === 'buscador' && reset) {
        newGames.forEach((game, index) => {
          setTimeout(() => fetchRealCover(game), index * 350);
        });
      }
    } catch (err) {
      console.error('Error cargando juegos:', err);
      // Mantenemos los juegos anteriores si falla una carga de "más"
      if (reset) setGames([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setGames([]);
    setPage(1);
    setHasMore(true);
    setSelectedGame(null);
    setSelectedDetails(null);
    setViewMode('list');
    setNextGame(null);
    setLoading(true);
    fetchGames(true);
  }, [tab, search, favorites]); // Añadido 'favorites' para recargar al cambiar favoritos

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSelectedGame(null);
    setSelectedDetails(null);
    setViewMode('list');
    setNextGame(null);
    fetchGames(true);
  };

  const loadMore = () => fetchGames();

  const handleSelect = async (game, currentList = games) => {
    setSelectedGame(game);
    setSelectedDetails({ loading: true });
    setViewMode('detail');
    const currentIndex = currentList.findIndex(g => g.id === game.id);
    const next = currentList[currentIndex + 1] || null;
    setNextGame(next);
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
    setNextGame(null);
    fetchGames(true);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 onClick={resetToHome} className="text-5xl font-bold text-center mb-8 text-yellow-400 cursor-pointer hover:text-yellow-300 transition select-none">
          Heimdallr Games 🎮
        </h1>

        {/* PESTAÑAS + FAVORITOS */}
        <div className="mb-8 flex justify-center gap-2 flex-wrap">
          {[
            { key: 'novedades', label: '✨ Novedades' },
            { key: 'populares_mes', label: '🔥 Populares (mes)' },
            { key: 'populares_ano', label: '🏆 Populares (año)' },
            { key: 'todos_az', label: '📚 Todos (A-Z)' },
            { key: 'buscador', label: '🔍 Buscador' },
            { key: 'favoritos', label: `⭐ Mis favoritos (${favorites.length})` },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-6 py-3 rounded-lg font-bold transition ${
                tab === key ? 'bg-yellow-500 text-black shadow-lg' : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* BUSCADOR */}
        {tab === 'buscador' && viewMode === 'list' && (
          <div className="max-w-2xl mx-auto mb-12 px-4">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar juegos en todo el sitio..."
                className="flex-1 px-6 py-4 bg-gray-800 rounded-xl text-lg focus:outline-none focus:ring-4 focus:ring-yellow-500/50"
                autoFocus
              />
              <button type="submit" className="px-10 py-4 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition">
                Buscar
              </button>
            </form>
          </div>
        )}

        {/* LISTADO */}
        {viewMode === 'list' && (
          <>
            {(tab === 'todos_az' || tab === 'buscador' || tab === 'favoritos') ? (
              <div className="max-w-4xl mx-auto">
                <div className="space-y-3">
                  {games.map((game) => (
                    <div
                      key={game.id}
                      className="group cursor-pointer bg-gray-800/60 hover:bg-gray-700 rounded-xl p-6 transition-all duration-200 border border-gray-700 hover:border-yellow-500/60 shadow-lg hover:shadow-yellow-500/10 relative"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(game.id);
                        }}
                        className="absolute top-4 right-6"
                      >
                        <Star
                          className={`w-9 h-9 transition-all ${isFavorite(game.id) ? 'fill-yellow-400 text-yellow-400 drop-shadow-lg' : 'text-gray-500 hover:text-yellow-400'}`}
                        />
                      </button>

                      <h3
                        onClick={() => handleSelect(game, games)}
                        className="text-2xl font-bold text-yellow-400 group-hover:text-yellow-300 transition pr-16"
                      >
                        {game.title}
                      </h3>
                    </div>
                  ))}
                </div>

                {loading && games.length === 0 && (
                  <p className="text-center text-3xl text-yellow-400 mt-20">Cargando juegos...</p>
                )}
                {/* Mensaje especial para Favoritos si está vacío */}
                {!loading && tab === 'favoritos' && favorites.length > 0 && games.length === 0 && (
                    <p className="text-center text-xl text-red-400 mt-20">
                        ⚠️ No se han encontrado datos del backend para tus favoritos. Revisa la implementación del `POST /api/games`.
                    </p>
                )}
                {!loading && tab === 'favoritos' && favorites.length === 0 && (
                    <p className="text-center text-xl text-gray-500 mt-20">
                        🌟 Aún no tienes juegos marcados como favoritos.
                    </p>
                )}
                {!loading && tab === 'buscador' && search.trim() && games.length === 0 && (
                    <p className="text-center text-xl text-gray-500 mt-20">
                        😔 No se encontraron resultados para "{search}".
                    </p>
                )}
                {hasMore && games.length > 0 && tab !== 'favoritos' && (
                  <div className="text-center mt-16">
                    <button onClick={loadMore} disabled={loading} className="px-12 py-5 bg-yellow-500 text-black text-xl font-bold rounded-full hover:bg-yellow-400 disabled:opacity-50 transition">
                      {loading ? 'Cargando...' : 'Cargar más juegos'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8">
                  {games.map((game) => (
                    <div key={game.id} className="space-y-4 relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(game.id);
                        }}
                        className="absolute top-2 right-2 z-10 bg-black/70 rounded-full p-2 hover:scale-125 transition-all"
                      >
                        <Star
                          className={`w-8 h-8 ${isFavorite(game.id) ? 'fill-yellow-400 text-yellow-400 drop-shadow-lg' : 'text-white hover:text-yellow-400'}`}
                        />
                      </button>

                      <div onClick={() => handleSelect(game, games)} className="cursor-pointer group transform hover:scale-105 transition-all duration-300">
                        <div className="relative overflow-hidden rounded-xl bg-gray-900 shadow-2xl">
                          <Image
                            src={game.cover || '/placeholder-cover.jpg'}
                            alt={game.title}
                            width={300}
                            height={450}
                            className="w-full h-auto object-cover"
                            unoptimized
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition">
                            <p className="absolute bottom-3 left-3 right-3 text-sm font-bold line-clamp-3">{game.title}</p>
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
                    <button onClick={loadMore} disabled={loading} className="px-12 py-5 bg-yellow-500 text-black text-xl font-bold rounded-full hover:bg-yellow-400 disabled:opacity-50 transition">
                      {loading ? 'Cargando...' : 'Cargar más'}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* DETALLE DEL JUEGO */}
        {viewMode === 'detail' && selectedGame && (
          <div className="mt-12 bg-gray-900 rounded-xl p-6 border-4 border-yellow-500 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <button onClick={() => setViewMode('list')} className="px-6 py-3 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 transition">
                ⬅️ Volver al listado
              </button>

              <button
                onClick={() => toggleFavorite(selectedGame.id)}
                className="hover:scale-110 transition-all"
              >
                <Heart
                  className={`w-16 h-16 drop-shadow-2xl ${isFavorite(selectedGame.id) ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-red-500'}`}
                />
              </button>
            </div>

            {selectedDetails?.loading && <p className="text-center text-yellow-400 text-xl font-bold">Cargando detalles...</p>}
            {selectedDetails?.error && <p className="text-center text-red-400 text-xl font-bold">❌ Error al cargar detalles</p>}
            {selectedDetails && !selectedDetails.loading && !selectedDetails.error && (
              <div className="space-y-6">
                <div className="text-center space-y-6">
                  <h2 className="text-4xl md:text-5xl font-bold text-yellow-400 leading-tight">
                    {selectedDetails.title && !selectedDetails.title.includes('FitGirl Repacks')
                      ? selectedDetails.title
                      : selectedGame.title}
                  </h2>
                  <div className="flex justify-center">
                    <Image
                      src={selectedDetails.cover || selectedGame.cover}
                      alt={selectedDetails.title || selectedGame.title}
                      width={280}
                      height={420}
                      className="rounded-xl shadow-2xl border-4 border-yellow-500/30"
                      unoptimized
                    />
                  </div>
                </div>

                <div className="text-lg space-y-3 p-4 bg-gray-800 rounded-lg">
                  <p><strong>🎮 Géneros:</strong> {selectedDetails.genres || 'N/A'}</p>
                  <p><strong>🏢 Compañía:</strong> {selectedDetails.company || 'N/A'}</p>
                  <p><strong>🗣️ Idiomas:</strong> {selectedDetails.languages || 'N/A'}</p>
                  <p><strong>💾 Tamaño Original:</strong> {selectedDetails.originalSize || 'N/A'}</p>
                  <p><strong>📦 Tamaño del Repack:</strong> {selectedDetails.repackSize || 'N/A'}</p>
                  <p><strong>💿 Tamaño de la instalación:</strong> {selectedDetails.installedSize || 'N/A'}</p>
                  <div className="space-y-2 pt-4 border-t border-gray-700">
                    <p className="font-bold text-yellow-400">🔗 Download Mirrors:</p>
                    {selectedDetails.mirrors?.length > 0 ? (
                      <ul className="list-disc list-inside text-sm pl-4">
                        {selectedDetails.mirrors.map((url, i) => (
                          <li key={i}>
                            <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">
                              {url.startsWith('magnet:') ? 'Magnet Link (Torrent)' : `Mirror ${i + 1}`}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="text-gray-500">No hay enlaces de descarga disponibles.</p>}
                  </div>
                </div>

                {selectedDetails.screenshots && selectedDetails.screenshots.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-2xl font-bold text-yellow-400 mb-6 text-center">📸 Capturas del juego</h3>
                    {(() => {
                      const media = [];
                      if (selectedDetails.trailerVideo) media.push({ type: 'video', src: selectedDetails.trailerVideo });
                      selectedDetails.screenshots.forEach(src => media.push({ type: 'image', src }));
                      return (
                        <>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {selectedDetails.screenshots.slice(0, 16).map((src, i) => (
                              <div key={i} className="cursor-zoom-in" onClick={() => openViewer(media, selectedDetails.trailerVideo ? i + 1 : i)}>
                                <Image src={src} alt={`Captura ${i + 1}`} width={400} height={225} className="rounded-lg shadow-lg hover:scale-105 transition-transform duration-300 object-cover w-full h-48" unoptimized />
                              </div>
                            ))}
                          </div>
                          {selectedDetails.screenshots.length > 16 && (
                            <p className="text-center mt-6 text-yellow-400 font-bold">
                              + {selectedDetails.screenshots.length - 16} capturas más (haz clic para ver todas)
                            </p>
                          )}
                        </>
                      );
                    })()}
                    {selectedDetails.trailerVideo && (
                      <div className="mt-10 max-w-4xl mx-auto">
                        <h4 className="text-2xl font-bold text-yellow-400 mb-4 text-center">🎬 Tráiler del juego</h4>
                        <video
                          controls
                          preload="metadata"
                          className="w-full rounded-xl shadow-2xl border-4 border-yellow-500/30 cursor-pointer"
                          poster={selectedDetails.screenshots[0]}
                          onClick={() => openViewer(
                            [{ type: 'video', src: selectedDetails.trailerVideo }, ...selectedDetails.screenshots.map(src => ({ type: 'image', src }))],
                            0
                          )}
                        >
                          <source src={selectedDetails.trailerVideo} type="video/webm" />
                          Tu navegador no soporta video.
                        </video>
                        <p className="text-center mt-3 text-sm text-gray-400">Haz clic en el vídeo para verlo a pantalla completa</p>
                      </div>
                    )}
                  </div>
                )}

                {selectedDetails.updatesHtml && (
                  <div className="mt-6">
                    <button
                      onClick={() => setShowUpdates(!showUpdates)}
                      className="w-full text-left py-3 px-4 font-bold text-yellow-400 bg-gray-800 rounded-lg hover:bg-gray-700 transition flex justify-between items-center"
                    >
                      ⬆️ Actualizaciones del juego
                      <span>{showUpdates ? '▲' : '▼'}</span>
                    </button>
                    {showUpdates && (
                      <div className="mt-2 bg-gray-900/80 border border-green-600/40 rounded-lg p-6 text-sm leading-relaxed text-gray-200 overflow-x-auto">
                        <div
                          className="whitespace-normal break-words"
                          dangerouslySetInnerHTML={{
                            __html: selectedDetails.updatesHtml
                              .replace(/<h3[^>]*>Game Updates[^<]*<\/h3>/gi, '')
                              .replace(/style="[^"]*"/gi, '')
                              .replace(/<a /gi, '<a class="text-yellow-400 hover:text-yellow-300 underline" ')
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <button
                    onClick={() => setShowRepack(!showRepack)}
                    className="w-full text-left py-3 px-4 font-bold text-yellow-400 bg-gray-800 rounded-lg hover:bg-gray-700 transition flex justify-between items-center"
                  >
                    ⚙️ Características del repack
                    <span>{showRepack ? '▲' : '▼'}</span>
                  </button>
                  {showRepack && (
                    <p className="mt-2 text-sm bg-gray-900 p-4 rounded-lg whitespace-pre-line text-gray-300">
                      {selectedDetails.repackFeatures || 'N/A'}
                    </p>
                  )}
                </div>

                <div>
                  <button
                    onClick={() => setShowInfo(!showInfo)}
                    className="w-full text-left py-3 px-4 font-bold text-yellow-400 bg-gray-800 rounded-lg hover:bg-gray-700 transition flex justify-between items-center"
                  >
                    ℹ️ Información del juego
                    <span>{showInfo ? '▲' : '▼'}</span>
                  </button>
                  {showInfo && (
                    <div className="mt-2 text-sm bg-gray-900 p-6 rounded-lg leading-relaxed text-gray-200">
                      <MarkdownText text={selectedDetails.gameInfo} />
                    </div>
                  )}
                </div>

                {selectedDetails.csrinLink && (
                  <>
                    <button onClick={() => sendMagnetToQB(selectedDetails.csrinLink)} className="mt-6 block w-full text-center py-4 bg-green-600 hover:bg-green-500 rounded-lg font-bold text-xl transition">
                      ⬇️ Instalar con Magnet (qBittorrent)
                    </button>
                    {selectedDetails.torrentStatsImage && (
                      <Image src={selectedDetails.torrentStatsImage} alt="Torrent stats" width={800} height={200} className="w-full mt-4 rounded-lg border border-gray-700" unoptimized />
                    )}
                  </>
                )}

                <div className="mt-8 flex flex-wrap gap-4 justify-start items-center">
                  <button
                    onClick={() => {
                      const currentIndex = games.findIndex(g => g.id === selectedGame.id);
                      if (currentIndex > 0) {
                        const prevGame = games[currentIndex - 1];
                        handleSelect(prevGame, games);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      } else {
                        setViewMode('list');
                      }
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-500 transition whitespace-nowrap disabled:opacity-50"
                    disabled={games.findIndex(g => g.id === selectedGame.id) === 0}
                  >
                    <ChevronLeft className="w-6 h-6" />
                    <span>Anterior</span>
                  </button>

                  <button
                    onClick={() => {
                      const currentIndex = games.findIndex(g => g.id === selectedGame.id);
                      const nextGame = games[currentIndex + 1];
                      if (nextGame) {
                        handleSelect(nextGame, games);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                    disabled={loading || games.findIndex(g => g.id === selectedGame.id) === games.length - 1}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap"
                  >
                    <span>Siguiente</span>
                    <ChevronRight className="w-6 h-6" />
                    {loading && <span className="ml-2 animate-pulse">…</span>}
                  </button>

                  {games.length > 0 &&
                    games.findIndex(g => g.id === selectedGame.id) === games.length - 1 &&
                    !hasMore && (
                      <div className="text-gray-500 text-sm italic ml-4">
                        Último juego de la lista
                      </div>
                    )}
                </div>

                <div className="text-center mt-8">
                  <span className="text-gray-400 text-sm mr-2">Fuente:</span>
                  <a
                    href={selectedGame.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-yellow-400 hover:text-yellow-300 underline transition font-medium break-all"
                  >
                    FitGirl Repacks
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {viewerOpen && (
          <MediaViewer media={viewerMedia} startIndex={viewerStartIndex} onClose={() => setViewerOpen(false)} />
        )}
      </div>
    </div>
  );
}
