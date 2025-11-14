import './globals.css';

export const metadata = {
  title: 'Heimdallr Games',
  description: 'FitGirl Repacks - Todos los juegos',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="bg-gray-950 text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}
