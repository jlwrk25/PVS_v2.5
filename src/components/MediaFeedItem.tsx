import React, { useEffect, useRef, useState } from "react";
import { Play, Plus } from "lucide-react";
import { MediaItem } from "../types";

interface MediaFeedItemProps {
  item: MediaItem;
  isActive: boolean;
  onVideoEnded: () => void;
  onDoubleTap?: () => void;
  accessToken?: string | null;
}

export const MediaFeedItem: React.FC<MediaFeedItemProps> = ({
  item,
  isActive,
  onVideoEnded,
  onDoubleTap,
  accessToken,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showPlayOverlay, setShowPlayOverlay] = useState(false);
  const imageTimerRef = useRef<NodeJS.Timeout | null>(null);

  const lastTapRef = useRef<number>(0);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showPlusAnimation, setShowPlusAnimation] = useState(false);

  // Clean up click/tap timeouts on unmount
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  // Synchronize playing state with active state
  useEffect(() => {
    if (item.type === "video" && videoRef.current) {
      const encodedToken = accessToken ? encodeURIComponent(accessToken) : "";
      const mediaUrl = accessToken
        ? `/api/media/${item.id}?token=${encodedToken}`
        : `/api/media/${item.id}`;

      if (isActive) {
        // Attempt autoplay
        videoRef.current
          .play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch((err) => {
            console.log("Autoplay blocked or interrupted:", err);
            setIsPlaying(false);
          });
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        setIsPlaying(false);
      }
    } else if (item.type === "image") {
      // For images, auto-advance after 7 seconds if active
      if (imageTimerRef.current) {
        clearTimeout(imageTimerRef.current);
        imageTimerRef.current = null;
      }

      if (isActive) {
        imageTimerRef.current = setTimeout(() => {
          onVideoEnded();
        }, 7000);
      }
    }

    return () => {
      if (imageTimerRef.current) {
        clearTimeout(imageTimerRef.current);
      }
    };
  }, [isActive, item.type, onVideoEnded]);

  // Ensure constantly unmuted
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = false;
    }
  }, [isActive]);

  const handleMediaClick = () => {
    if (item.type === "video" && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
        triggerPlayOverlay();
      } else {
        videoRef.current
          .play()
          .then(() => {
            setIsPlaying(true);
            triggerPlayOverlay();
          })
          .catch((e) => console.log(e));
      }
    }
  };

  const triggerPlayOverlay = () => {
    setShowPlayOverlay(true);
    setTimeout(() => {
      setShowPlayOverlay(false);
    }, 500);
  };

  const handleTap = (e: React.MouseEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 280; // ms

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }

      if (onDoubleTap) {
        onDoubleTap();
      }

      setShowPlusAnimation(true);
      setTimeout(() => {
        setShowPlusAnimation(false);
      }, 800);
    } else {
      lastTapRef.current = now;
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
      clickTimeoutRef.current = setTimeout(() => {
        handleMediaClick();
        clickTimeoutRef.current = null;
      }, DOUBLE_TAP_DELAY);
    }
  };

  const formatTitle = (title: string) => {
    // Remove underscores and file extension for a cleaner showcase
    const clean = title.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  };

  return (
    <div
      ref={containerRef}
      id={`feed-item-${item.id}`}
      className="snap-start h-full w-full flex-shrink-0 flex items-center justify-center relative bg-[#FAF9F6] overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Tiny overlay button to add current item to playlist (moved to top-left edge) */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-30">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onDoubleTap) {
              onDoubleTap();
            }
          }}
          className="py-1.5 px-3 rounded-full bg-white/85 hover:bg-white border border-stone-200/80 hover:border-stone-400 text-stone-600 hover:text-stone-900 transition-all shadow-sm active:scale-95 group focus:outline-none cursor-pointer flex items-center gap-1.5"
          title="Add current media to playlist"
        >
          <Plus className="h-3.5 w-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
          <span className="text-[9px] font-mono tracking-wider font-bold uppercase text-stone-500 group-hover:text-stone-900">
            ADD TO LIST
          </span>
        </button>
      </div>



      {/* Main Content Area */}
      <div
        onClick={handleTap}
        className="w-full h-full flex items-center justify-center relative z-10 cursor-pointer"
      >
        {item.type === "video" ? (
          <video
            ref={videoRef}
            src={accessToken ? `/api/media/${item.id}?token=${encodeURIComponent(accessToken)}` : `/api/media/${item.id}`}
            className="w-full h-full object-cover select-none"
            loop={false}
            playsInline
            onEnded={onVideoEnded}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#FAF9F6]">
            <img
              src={accessToken ? `/api/media/${item.id}?token=${encodeURIComponent(accessToken)}` : `/api/media/${item.id}`}
              alt={item.title}
              className="w-full h-full object-cover select-none animate-fade-in"
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        {/* Big Toggle Play Animation Icon Overlay */}
        {showPlayOverlay && item.type === "video" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className="bg-black/60 p-5 rounded-full animate-ping">
              {isPlaying ? (
                <Play className="h-10 w-10 text-white fill-white" />
              ) : (
                <div className="h-10 w-10 flex gap-1 justify-center items-center">
                  <div className="w-2 h-8 bg-white rounded"></div>
                  <div className="w-2 h-8 bg-white rounded"></div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Double Tap Add-to-Playlist Overlay Animation */}
        {showPlusAnimation && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-35 animate-fade-in">
            <div className="bg-emerald-500/90 p-5 rounded-full shadow-[0_0_30px_rgba(16,185,129,0.6)] flex flex-col items-center justify-center gap-1 scale-110 transition-transform">
              <Plus className="h-8 w-8 text-white stroke-[3.5px] animate-[spin_0.8s_ease-out]" />
              <span className="text-[9px] text-white font-mono tracking-widest font-bold uppercase px-2">ADD TO LIST</span>
            </div>
          </div>
        )}

      </div>

      {/* Ambient background blur glowing style */}
      <div
        className="absolute inset-0 bg-cover bg-center filter blur-3xl opacity-10 pointer-events-none z-0"
        style={{
          backgroundImage: `url(${accessToken ? `/api/media/${item.id}?token=${encodeURIComponent(accessToken)}` : `/api/media/${item.id}`})`,
        }}
      />
    </div>
  );
};
