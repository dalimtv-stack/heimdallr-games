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
  const [expandedId, setExpandedId] = useState(null);
  const [expandedDetails, setExpandedDetails] = useState({});

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
    setExpandedId(null);
    setExpandedDetails({});
    fetchGames(true);
  }, [tab]);

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
      const res = await fetch(`/api/details?url=${encodeURIComponent(game.postUrl)}`);
      const data = await res.json();
      setExpandedDetails(prev => ({ ...prev, [game.id]: data }));
    } catch (err) {
      setExpandedDetails(prev => ({ ...prev, [game.id]: { error: true } }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div class
