// app/[...path]/page.js
'use client';

import Home from '../page';

export default function DynamicPage({ params }) {
  const path = params.path ? params.path.join('/') : '';

  // Log para depurar
  console.log('DynamicPage ejecutado - path completo:', path);

  const tabMap = {
    '': 'novedades',
    'pop-repacks': 'populares_mes',
    'popular-repacks-of-the-year': 'populares_ano',
    'all-my-repacks-a-z': 'todos_az',
  };

  const isTab = tabMap[path];
  const initialTab = isTab || 'novedades';
  const isDetail = !!path && !isTab;

  console.log('DynamicPage - isDetail:', isDetail, 'initialTab:', initialTab, 'path:', path);

  return (
    <Home
      initialTab={initialTab}
      initialPath={path}
      initialViewMode={isDetail ? 'detail' : 'list'}
    />
  );
}
