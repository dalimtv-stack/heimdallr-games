'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function Home() {
  const [games, setGames] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [tab, setTab] = useState('novedades');
  const [expandedId, setExpandedId] = useState(null);
  const [expandedDetails, setExpandedDetails] = useState({});

  const fetchGames = async (reset = false) => {
    setLoading(true);
    const p = reset ? 1 : page;
    const params = new URLSearchParams();
    params.set('tab', tab);
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
    setExpandedId(null);
    setExpandedDetails({});
    fetchGames(true);
  }, [tab, search]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setExpandedId(null);
    fetchGames(true);
  };

  const loadMore = () => fetchGames();

  const toggleExpand = async (game) => {
    if (expandedId === game.id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(game.id);
    if (expandedDetails[game.id]) return;

    setExpandedDetails(prev => ({ ...prev, [game.id]: { loading: true } }));

    try {
      const res = await fetch(game.postUrl);
      const html = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const title = doc.querySelector('h1.entry-title')?.textContent.replace(/– FitGirl Repack.*/i, '').trim() || game.title;
      const cover = doc.querySelector('meta[property="og:image"]')?.content || game.cover;

      let repackSize = 'N/A', originalSize = 'N/A', installTime = 'N/A', genres = 'N/A', company = 'N/A';
      const csrinLink = doc.querySelector('a[href*="cs.rin.ru"]')?.href || '';

      doc.querySelectorAll('article p, article li').forEach(el => {
        const text = el.textContent;
        if (text.includes('Repack Size:')) repackSize = text.split(':')[1]?.trim() || repackSize;
        if (text.includes('Original Size:')) originalSize = text.split(':')[1]?.trim() || originalSize;
        if (text.includes('Installation time:')) installTime = text.split(':')[1]?.trim() || installTime;
        if (text.includes('Genres/Tags:')) genres = text.split(':')[1]?.trim() || genres;
        if (text.includes('Company:')) company = text.split(':')[1]?.trim() || company;
      });

      const screenshots = Array.from(doc.querySelectorAll('article img[src*="-1024x"], article img[src*="fitgirl-repacks.site"]'))
        .map(img => {
          let src = img.src || '';
          if (src.includes('-1024x')) src = src.replace('-1024x', '');
          if (!src.startsWith('http')) src = 'https://fitgirl-repacks.site' + src;
          return src;
        })
        .slice(0, 6);

      setExpandedDetails(prev => ({
        ...prev,
        [game.id]: { title, cover, repackSize, originalSize, installTime, genres, company, csrinLink, screenshots }
      }));
    } catch (err) {
      setExpandedDetails(prev => ({ ...prev, [game.id]: { error: true } }));
    }
  };

  const resetToHome = () => {
    setSearch('');
    setTab('novedades');
    setPage(1);
    setExpandedId(null);
    fetchGames(true);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 onClick={resetToHome} className="text-5xl font-bold text-center mb-8 text-yellow-400 cursor-pointer hover:text-yellow-300 transition select-none">
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
              className={`px-6 py-3 rounded-lg font-bold transition ${tab === key ? 'bg-yellow-500 text-black' : 'bg-gray-800 hover:bg-gray-700'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8">
          {games.map((game) => (
            <div key={game.id} className="space-y-4">
              <div onClick={() => toggleExpand(game)} className="cursor-pointer group transform hover:scale-105 transition-all duration-300">
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
                    <p className="absolute bottom-3 left-3 right-3 text-sm font-bold line-clamp-3">{game.title}</p>
                  </div>
                </div>
              </div>

              {expandedId === game.id && (
                <div className="bg-gray-900 rounded-xl p-6 border-4 border-yellow-500 shadow-2xl">
                  {expandedDetails[game.id]?.loading && <p className="text-center text-yellow-400">Cargando detalles...</p>}
                  {expandedDetails[game.id]?.error && <p className="text-center text-red-400">Error al cargar detalles</p>}
                  {expandedDetails[game.id] && !expandedDetails[game.id].loading && !expandedDetails[game.id].error && (
                    <div className="space-y-4">
                      <h3 className="text-2xl font-bold text-yellow-400 mb-4">{expandedDetails[game.id].title}</h3>
                      <Image src={expandedDetails[game.id].cover} alt={expandedDetails[game.id].title} width={600} height={900} className="w-full rounded-lg mb-4" unoptimized />
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        {expandedDetails[game.id].screenshots?.slice(0, 4).map((src, i) => (
                          <Image key={i} src={src} alt="" width={300} height={169} className="rounded-lg" unoptimized />
                        ))}
                      </div>
                      <div className="text-sm space-y-2">
                        <p><strong>Géneros:</strong> {expandedDetails[game.id].genres || 'N/A'}</p>
                        <p><strong>Compañía:</strong> {expandedDetails[game.id].company || 'N/A'}</p>
                        <p><strong>Repack:</strong> {expandedDetails[game.id].repackSize || 'N/A'}</p>
                        <p><strong>Original:</strong> {expandedDetails[game.id].originalSize || 'N/A'}</p>
                        <p><strong>Instalación:</strong> {expandedDetails[game.id].installTime || 'N/A'}</p>
                      </div>
                      {expandedDetails[game.id].csrinLink && (
                        <a href={expandedDetails[game.id].csrinLink} target="_blank" rel="noopener noreferrer" className="mt-6 block text-center py-4 bg-green-600 hover:bg-green-500 rounded-lg font-bold">
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

        {loading && games.length === 0 && <p className="text-center text-3xl text-yellow-400 mt-20">Cargando juegos...</p>}

        {hasMore && games.length > 0 && (
          <div className="text-center mt-16">
            <button onClick={loadMore} disabled={loading} className="px-12 py-5 bg-yellow-500 text-black text-xl font-bold rounded-full disabled:opacity-50">
              {loading ? 'Cargando...' : 'Cargar más'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
