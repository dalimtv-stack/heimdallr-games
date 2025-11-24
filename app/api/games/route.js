import { NextResponse } from 'next/server';
import { getGamesList } from '@/services/fitgirlScraper'; // Importa el servicio centralizado

// ──────────────────────────────────────────────────────────────
// Endpoint GET - Recupera listas por Pestaña/Búsqueda/Paginación
// ──────────────────────────────────────────────────────────────
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const tab = searchParams.get('tab') || 'novedades';
        const searchQuery = searchParams.get('search')?.trim();

        // Llama al servicio centralizado con los parámetros del GET
        const { games, hasMore } = await getGamesList({ tab, page, searchQuery });
        
        return NextResponse.json({ games, hasMore });
    } catch (err) {
        console.error('Error en /api/games (GET):', err.message);
        return NextResponse.json({ games: [], hasMore: false });
    }
}

// ──────────────────────────────────────────────────────────────
// Endpoint POST - Recupera los juegos favoritos (FIX FAVORITOS)
// ──────────────────────────────────────────────────────────────
export async function POST(request) {
    try {
        const { favorites } = await request.json();

        if (!Array.isArray(favorites) || favorites.length === 0) {
            return NextResponse.json({ games: [], hasMore: false });
        }

        // Llama al servicio centralizado con la lista de favoritos
        const { games, hasMore } = await getGamesList({ favorites });

        return NextResponse.json({ games, hasMore });

    } catch (error) {
        console.error('Error procesando favoritos (POST):', error.message);
        return NextResponse.json({ games: [], hasMore: false });
    }
}
