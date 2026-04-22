// Extrait l'ID d'une playlist YouTube depuis une URL
export const extractPlaylistId = (url: string): string | null => {
  const match = url.match(/[?&]list=([^&\s]+)/);
  return match ? match[1] : null;
};

// Récupère toutes les vidéos d'une playlist via l'API Invidious (open source, pas de clé API)
const INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.io',
  'https://y.com.sb',
];

export const fetchPlaylistVideos = async (playlistId: string): Promise<string[]> => {
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const res = await fetch(`${instance}/api/v1/playlists/${playlistId}`);
      if (!res.ok) continue;
      const data = await res.json();
      const urls: string[] = (data.videos || []).map(
        (v: { videoId: string }) => `https://www.youtube.com/watch?v=${v.videoId}`
      );
      if (urls.length > 0) return urls;
    } catch { /* essaie l'instance suivante */ }
  }
  throw new Error('Impossible de charger la playlist');
};

export const extractYoutubeVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/embed\/)([^?&#]+)/,
    /(?:v=|youtu\.be\/)([^&\s?#]+)/,
    /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/,
  ];
  for (const p of patterns) {
    const match = url.match(p);
    if (match) return match[match.length > 2 ? 2 : 1] || null;
  }
  return null;
};

export const isYoutubeUrl = (url: string): boolean => {
  return url.includes('youtube.com') || url.includes('youtu.be');
};

export const buildYoutubeEmbed = (videoId: string) => {
  return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&fs=1`;
};

// Lecteur sécurisé : l'élève voit la vidéo en embed uniquement,
// sans accès à YouTube, sans recommandations, sans branding.
export const YoutubePlayer = ({ videoId }: { videoId: string }) => {
  return (
    <div className="relative w-full rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
      <iframe
        src={buildYoutubeEmbed(videoId)}
        className="absolute inset-0 w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        frameBorder="0"
        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups-to-escape-sandbox"
      />
      {/* Overlay transparent qui bloque le clic sur le header YouTube */}
      <div
        className="absolute top-0 left-0 right-0 z-20"
        style={{ height: '55px', background: 'transparent', pointerEvents: 'all', cursor: 'default' }}
      />
    </div>
  );
};
