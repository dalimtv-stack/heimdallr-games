// app/[...path]/page.tsx
'use client';

import Home from '../page';

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
  const isDetail = path && !tabMap[path]; // Si no es pestaña conocida → detalle de juego

  return (
    <Home
      initialTab={initialTab}
      initialPath={path}
      initialViewMode={isDetail ? 'detail' : 'list'}
    />
  );
}
