// app/[...path]/page.tsx
'use client';

import { useEffect } from 'react';
import Home from '../page'; // Importa tu componente Home actual (el de app/page.js)

export default function DynamicPage({ params }) {
  const pathSegments = params.path || [];
  const path = pathSegments.join('/');

  // Mapeo de rutas conocidas a pestañas internas
  const tabMap = {
    '': 'novedades',
    'pop-repacks': 'populares_mes',
    'popular-repacks-of-the-year': 'populares_ano',
    'all-my-repacks-a-z': 'todos_az',
  };

  const initialTab = tabMap[path] || 'novedades';
  const isDetail = path && !tabMap[path]; // Si no es una pestaña conocida → es detalle de juego

  return (
    <Home
      initialTab={initialTab}
      initialPath={path}
      initialViewMode={isDetail ? 'detail' : 'list'}
    />
  );
}

// Opcional: para mejorar SEO y pre-carga (puedes omitir si quieres)
export async function generateStaticParams() {
  // Puedes dejar vacío o generar algunos slugs comunes si quieres SSG parcial
  return [];
}
