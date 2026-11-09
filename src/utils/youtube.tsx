// ─────────────────────────────────────────────────────────────────────────────
// Lecteur YouTube SÉCURISÉ (règle « Aucune sortie vers YouTube », tous projets)
// - API officielle YT.Player, controls: 0 → aucune commande YouTube visible
// - l'iframe ne reçoit AUCUN clic (pointer-events: none) ; un calque maison les capte tous
// - commandes maison : lecture/pause, avancer dans la vidéo, son, plein écran
// - en pause ou à la fin, l'image de la vidéo recouvre le lecteur : les « autres vidéos »
//   proposées par YouTube ne sont jamais visibles ni cliquables
// - sans Internet : message clair « 📡 Nécessite Internet » (une vidéo YouTube ne peut
//   pas être gardée sur l'appareil)
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, WifiOff } from "lucide-react";

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


type YTPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (s: number, allow: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  mute: () => void;
  unMute: () => void;
  destroy: () => void;
};
type YTNamespace = {
  Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer;
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number; BUFFERING: number };
};
declare global {
  interface Window { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void }
}

let apiPromise: Promise<YTNamespace> | null = null;
const loadYoutubeApi = (): Promise<YTNamespace> => {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { previous?.(); if (window.YT) resolve(window.YT); };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;
    tag.onerror = () => { apiPromise = null; reject(new Error("api")); };
    document.head.appendChild(tag);
  });
  return apiPromise;
};

const formatTime = (s: number) => {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

export const YoutubePlayer = ({ videoId }: { videoId: string }) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const holderRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [started, setStarted] = useState(false);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(false);
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  // Création du lecteur au premier « Lecture » (rien n'est chargé avant : appli légère)
  useEffect(() => {
    if (!started || !holderRef.current) return;
    let cancelled = false;
    const holder = holderRef.current;
    const target = document.createElement("div");
    holder.appendChild(target);
    loadYoutubeApi()
      .then((YT) => {
        if (cancelled) return;
        playerRef.current = new YT.Player(target, {
          videoId,
          host: "https://www.youtube-nocookie.com",
          width: "100%",
          height: "100%",
          playerVars: {
            controls: 0, disablekb: 1, fs: 0, rel: 0, modestbranding: 1,
            playsinline: 1, iv_load_policy: 3, autoplay: 1, cc_load_policy: 0,
          },
          events: {
            onReady: (e: { target: YTPlayer }) => {
              setReady(true);
              setDuration(e.target.getDuration() || 0);
              e.target.playVideo();
            },
            onStateChange: (e: { data: number }) => {
              setPlaying(e.data === YT.PlayerState.PLAYING || e.data === YT.PlayerState.BUFFERING);
              setEnded(e.data === YT.PlayerState.ENDED);
            },
            onError: () => setError(true),
          },
        });
      })
      .catch(() => { if (!cancelled) setError(true); });
    return () => {
      cancelled = true;
      try { playerRef.current?.destroy(); } catch { /* déjà détruit */ }
      playerRef.current = null;
      holder.innerHTML = "";
      setReady(false);
      setPlaying(false);
    };
  }, [started, videoId]);

  // Avancement de la barre pendant la lecture
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      setTime(p.getCurrentTime() || 0);
      const d = p.getDuration() || 0;
      if (d) setDuration(d);
    }, 500);
    return () => window.clearInterval(id);
  }, [playing]);

  const togglePlay = () => {
    if (!online && !started) return;
    if (!started) { setStarted(true); return; }
    const p = playerRef.current;
    if (!p || !ready) return;
    if (ended) { p.seekTo(0, true); p.playVideo(); return; }
    if (playing) p.pauseVideo(); else p.playVideo();
  };
  const toggleMute = () => {
    const p = playerRef.current;
    if (!p) return;
    if (muted) p.unMute(); else p.mute();
    setMuted(!muted);
  };
  const seek = (v: number) => {
    setTime(v);
    playerRef.current?.seekTo(v, true);
  };
  const canFullscreen = typeof document !== "undefined" && !!document.fullscreenEnabled;
  const fullscreen = () => {
    const box = boxRef.current;
    if (!box) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else box.requestFullscreen?.().catch(() => {});
  };

  const thumb = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  const showCover = !started || !playing; // avant, en pause, à la fin : image par-dessus

  return (
    <div ref={boxRef} className="relative w-full rounded-xl overflow-hidden bg-black select-none" style={{ aspectRatio: "16/9" }}>
      {/* Lecteur YouTube : ne reçoit aucun clic. Il dépasse de 60 px en haut et en bas,
          cachés par le cadre : le titre et la barre YouTube (logo) restent hors de vue. */}
      <div ref={holderRef} className="absolute inset-x-0 [&>iframe]:w-full [&>iframe]:h-full"
        style={{ pointerEvents: "none", top: -60, bottom: -60 }} aria-hidden="true" />

      {/* Image de la vidéo par-dessus le lecteur quand il ne joue pas */}
      {showCover && (
        <img src={thumb} alt="" className="absolute inset-0 w-full h-full object-cover" draggable={false}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
      )}

      {/* Calque qui capte 100 % des clics */}
      <button type="button" onClick={togglePlay} onContextMenu={(e) => e.preventDefault()}
        className="absolute inset-0 z-10 flex items-center justify-center bg-transparent"
        aria-label={playing ? "Mettre en pause" : "Lire la vidéo"}>
        {(!online && !started) ? (
          <span className="flex items-center gap-2 rounded-full bg-black/75 px-4 py-2 text-sm text-white">
            <WifiOff size={16} className="shrink-0" /> 📡 Nécessite Internet
          </span>
        ) : error ? (
          <span className="rounded-full bg-black/75 px-4 py-2 text-sm text-white">Vidéo indisponible pour le moment</span>
        ) : showCover ? (
          <span className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/90 shadow-lg">
            {ended ? <RotateCcw size={28} className="text-white" /> : <Play size={30} className="text-white fill-white ml-1" />}
          </span>
        ) : null}
      </button>

      {/* Commandes maison */}
      {started && ready && !error && (
        <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center gap-2 px-2 py-1.5 bg-gradient-to-t from-black/80 to-transparent text-white">
          <button type="button" onClick={togglePlay} className="p-1.5 shrink-0" aria-label={playing ? "Pause" : "Lecture"}>
            {playing ? <Pause size={18} /> : ended ? <RotateCcw size={18} /> : <Play size={18} />}
          </button>
          <span className="text-[11px] tabular-nums shrink-0">{formatTime(time)}</span>
          <input type="range" min={0} max={duration || 0} step={1} value={Math.min(time, duration || 0)}
            onChange={(e) => seek(Number(e.target.value))}
            className="flex-1 min-w-0 accent-primary h-1 cursor-pointer" aria-label="Avancer dans la vidéo" />
          <span className="text-[11px] tabular-nums shrink-0">{formatTime(duration)}</span>
          <button type="button" onClick={toggleMute} className="p-1.5 shrink-0" aria-label={muted ? "Remettre le son" : "Couper le son"}>
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          {canFullscreen && (
            <button type="button" onClick={fullscreen} className="p-1.5 shrink-0" aria-label="Plein écran">
              <Maximize size={18} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
