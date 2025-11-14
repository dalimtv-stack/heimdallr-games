// app/page.js (solo cambia el <Image>)
<Image
  src={game.cover}
  alt={game.title}
  width={300}
  height={450}
  className="w-full h-auto object-cover"
  unoptimized={true}  // NECESARIO para URLs externas
  onError={(e) => {
    e.currentTarget.src = 'https://via.placeholder.com/300x450/1a1a1a/ffffff?text=No+Cover';
  }}
/>
