import React, { useEffect, useRef, useState } from "react";
import {
  ListFilter,
  LayoutGrid,
  Search,
  RotateCcw,
  Sparkles,
  Film,
  Image,
  Layers,
} from "lucide-react";

import { getMediaItems, getPlaylists, shuffleArray } from "./mediaService";
import { MediaItem, Playlist } from "./types";
import { MediaFeedItem } from "./components/MediaFeedItem";
import { ViewPlaylistsModal, AddToPlaylistModal, GalleryViewModal } from "./components/Modals";

export default function App() {
  // ----------------------------------------------------
  // Core States
  // ----------------------------------------------------
  const [allMedia, setAllMedia] = useState<MediaItem[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

  // Active items computed for feeding the scrolling list
  const [feedItems, setFeedItems] = useState<MediaItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // Global settings
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [mediaTypeFilter, setMediaTypeFilter] = useState<"all" | "video" | "image">("all");

  // Modal Open/Close statuses
  const [isPlaylistsOpen, setIsPlaylistsOpen] = useState(false);
  const [isAddToPlaylistOpen, setIsAddToPlaylistOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  // Scrolling Container Ref
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pendingScrollItemIdRef = useRef<string | null>(null);

  // ----------------------------------------------------
  // Initial Load and Updates
  // ----------------------------------------------------
  const loadInitialData = () => {
    const media = getMediaItems();
    setAllMedia(media);
    setPlaylists(getPlaylists());
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Compute feed items based on selected playlist, randomized default, and search queries
  useEffect(() => {
    if (allMedia.length === 0) return;

    let itemsToFeed: MediaItem[] = [];

    if (selectedPlaylistId) {
      // Find files which are part of the selected playlist
      const activePlaylist = playlists.find((p) => p.id === selectedPlaylistId);
      if (activePlaylist) {
        itemsToFeed = allMedia.filter((m) => activePlaylist.itemIds.includes(m.id));
      } else {
        itemsToFeed = [];
      }
    } else {
      // Shuffled/Randomized content by default as requested
      itemsToFeed = shuffleArray(allMedia);
    }

    // Filter by type if set
    if (mediaTypeFilter !== "all") {
      itemsToFeed = itemsToFeed.filter((item) => item.type === mediaTypeFilter);
    }

    // Apply active search filter if any
    if (searchQuery.trim()) {
      itemsToFeed = itemsToFeed.filter((item) =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    let targetIdx = 0;
    if (pendingScrollItemIdRef.current) {
      const idx = itemsToFeed.findIndex((item) => item.id === pendingScrollItemIdRef.current);
      if (idx !== -1) {
        targetIdx = idx;
      }
      pendingScrollItemIdRef.current = null;
    }

    setFeedItems(itemsToFeed);
    setActiveIndex(targetIdx);

    // Reset container scroll to top or targeted item whenever the feed source shifts
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      setTimeout(() => {
        const itemHeight = container.clientHeight || 700;
        container.scrollTop = targetIdx * itemHeight;
      }, 50);
    }
  }, [selectedPlaylistId, searchQuery, mediaTypeFilter, allMedia, playlists]);

  // ----------------------------------------------------
  // Keyboard Navigation Events
  // ----------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        handleNextItem();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
         handlePrevItem();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, feedItems.length]);

  // ----------------------------------------------------
  // Custom Navigation Action Helpers
  // ----------------------------------------------------
  const scrollToItem = (index: number) => {
    const container = scrollContainerRef.current;
    if (!container || feedItems.length === 0) return;

    // Safety bounds
    let targetIndex = index;
    if (index >= feedItems.length) {
      targetIndex = 0; // Wrap around to top
    } else if (index < 0) {
      targetIndex = feedItems.length - 1; // Wrap around to bottom
    }

    const itemHeight = container.clientHeight;
    container.scrollTo({
      top: targetIndex * itemHeight,
      behavior: "smooth",
    });

    setActiveIndex(targetIndex);
  };

  const handleNextItem = () => {
    scrollToItem(activeIndex + 1);
  };

  const handlePrevItem = () => {
    scrollToItem(activeIndex - 1);
  };

  // Tracks physical scroll alignments
  const handleContainerScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollTop = container.scrollTop;
    const itemHeight = container.clientHeight;
    if (itemHeight === 0) return;

    const matchedIndex = Math.round(scrollTop / itemHeight);
    if (
      matchedIndex >= 0 &&
      matchedIndex < feedItems.length &&
      matchedIndex !== activeIndex
    ) {
      setActiveIndex(matchedIndex);
    }
  };

  // Return formatted name for playlists
  const getActivePlaylistName = () => {
    if (!selectedPlaylistId) return "Randomizer Feed";
    const play = playlists.find((p) => p.id === selectedPlaylistId);
    return play ? play.name : "Custom Playlist";
  };

  const activeItem = feedItems[activeIndex] || null;

  return (
    <main className="fixed inset-0 bg-[#FAF9F6] text-zinc-800 flex flex-col md:flex-row items-center justify-center font-sans overflow-hidden select-none">
      
      {/* 1. ambient backdrop of the current item for luxurious depth on wider monitors */}
      {activeItem && (
        <div
          className="absolute inset-0 bg-cover bg-center filter blur-3xl opacity-[0.14] transition-all duration-1000 hidden md:block"
          style={{
            backgroundImage: `url(/api/media/${activeItem.id})`,
          }}
        />
      )}

      {/* 2. Side Panel Info Frame - Visible on Desktop only */}
      <div className="absolute left-8 top-8 z-30 hidden lg:flex flex-col gap-4 pointer-events-auto max-w-sm">
        <div className="flex items-center gap-2 bg-white/75 backdrop-blur-md px-4 py-2 rounded-full border border-zinc-200/60 w-fit shadow-xs">
          <Sparkles className="h-4 w-4 text-zinc-500 fill-zinc-300" />
          <span className="text-xs uppercase font-semibold font-mono tracking-widest text-zinc-600">
            PERSONAL SHOWCASE
          </span>
        </div>
        
        {/* Main description block */}
        <div className="bg-white/70 p-5 rounded-2xl border border-zinc-200/50 backdrop-blur-md shadow-xs">
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-zinc-800 to-zinc-600 bg-clip-text text-transparent">
            Personal Video Feed
          </h1>
          <p className="text-xs text-zinc-500 mt-1 font-sans leading-relaxed">
            Use the arrow keys ( <span className="font-mono text-zinc-400">↑</span> /{" "}
            <span className="font-mono text-zinc-400">↓</span> ) or mousewheel to scroll.
            Click a media card to play/pause.
          </p>

          <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-400 font-semibold">
              Source type:
            </span>
            <span className="inline-block text-xs py-1 px-2.5 bg-emerald-500/10 border border-emerald-500/10 rounded-lg text-emerald-600 font-medium tracking-wide font-mono uppercase">
              {getActivePlaylistName()}
            </span>
          </div>
        </div>

        {/* Informative Folder Context Box */}
        <div className="bg-white/80 p-5 rounded-2xl border border-zinc-200/55 backdrop-blur-md shadow-xs flex flex-col gap-2">
          <h2 className="text-xs font-bold text-zinc-700 uppercase tracking-wider font-mono">
            Drive Source Folder
          </h2>
          <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">
            Streaming media dynamically from Google Drive folder:
          </p>
          <a
            href="https://drive.google.com/drive/folders/1E3a9iO-NhW3s3T75GgZLXodLTxoUj5AB?usp=drive_link"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-blue-600 font-mono break-all hover:underline"
          >
            1E3a9iO-NhW3s3T75GgZLXodLTxoUj5AB
          </a>
        </div>
      </div>

      {/* 3. Small, Elegant Header - Small dynamic search bar in the top right */}
      <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
        {/* Compact focused Search Bar */}
        <div className="relative flex items-center transition-all bg-white/80 border border-zinc-200 rounded-full py-1.5 px-3 shadow-xs focus-within:border-zinc-400">
          {isSearching ? (
            <input
              type="text"
              placeholder="Search title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-[10px] outline-none text-zinc-800 w-24 md:w-32 font-sans transition-all"
              autoFocus
              onBlur={() => {
                if (!searchQuery) setIsSearching(false);
              }}
            />
          ) : (
            <button
              onClick={() => setIsSearching(true)}
              className="text-[9px] text-zinc-500 hover:text-zinc-800 font-mono flex items-center gap-1 cursor-pointer font-bold uppercase tracking-wider"
            >
              SEARCH
            </button>
          )}
          <Search className="h-3 w-3 text-zinc-500 ml-1.5" />
        </div>
      </div>

      {/* 4. Core Media TikTok Container */}
      <div className="relative w-full h-full max-h-screen md:max-h-[85vh] md:aspect-[9/16] md:w-[450px] bg-white border border-stone-250 md:rounded-[36px] overflow-hidden flex flex-col justify-end shadow-[0_15px_60px_rgba(0,0,0,0.06)]">
        
        {/* Scroll Snap Feed Lists */}
        <div
          ref={scrollContainerRef}
          onScroll={handleContainerScroll}
          className="w-full h-full overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar flex flex-col"
          style={{ scrollbarWidth: "none" }}
        >
          {feedItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 bg-stone-50">
              <ListFilter className="h-10 w-10 text-zinc-400 stroke-1" />
              <div className="space-y-1">
                <h4 className="text-zinc-700 font-semibold text-sm font-sans uppercase tracking-wider font-bold">
                  No Media Available
                </h4>
                <p className="text-zinc-400 text-xs max-w-xs leading-relaxed">
                  {searchQuery ? "No titles matched your active query filter." : "This custom playlist is empty."}
                </p>
              </div>

              {selectedPlaylistId && (
                <button
                  onClick={() => setSelectedPlaylistId(null)}
                  className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-stone-200 hover:bg-stone-300 text-zinc-700 hover:text-zinc-900 transition-all text-xs font-mono tracking-wider font-bold"
                >
                  <RotateCcw className="h-3 w-3" /> RESET FEED
                </button>
              )}
            </div>
          ) : (
            feedItems.map((item, index) => (
              <MediaFeedItem
                key={`${selectedPlaylistId || "random"}-${item.id}-${index}`}
                item={item}
                isActive={index === activeIndex}
                onVideoEnded={handleNextItem}
                onDoubleTap={() => setIsAddToPlaylistOpen(true)}
              />
            ))
          )}
        </div>

         {/* 5. Clean Bottom Navigation Drawer Bar */}
        <div className="absolute bottom-0 left-0 right-0 z-30 p-4 pt-10 bg-gradient-to-t from-stone-50 via-stone-50/95 to-transparent flex justify-around items-center">
          {/* VIEW PLAYLIST */}
          <button
            onClick={() => {
              loadInitialData();
              setIsPlaylistsOpen(true);
            }}
            className="flex flex-col items-center gap-1 text-stone-500 hover:text-stone-900 transition-colors cursor-pointer group focus:outline-none"
          >
            <ListFilter className="h-5 w-5 group-hover:scale-105 transition-transform" />
            <span className="text-[10px] tracking-widest font-mono uppercase">PLAYLISTS</span>
          </button>

          {/* MEDIA FILTER SWITCHER (VIEW VIDEOS OR IMAGES) */}
          <button
            onClick={() => {
              setMediaTypeFilter((prev) => {
                if (prev === "all") return "video";
                if (prev === "video") return "image";
                return "all";
              });
            }}
            className="flex flex-col items-center gap-1 transition-colors cursor-pointer group focus:outline-none"
          >
            {mediaTypeFilter === "all" ? (
              <Layers className="h-5 w-5 group-hover:scale-105 transition-transform text-sky-500" />
            ) : mediaTypeFilter === "video" ? (
              <Film className="h-5 w-5 group-hover:scale-105 transition-transform text-indigo-500" />
            ) : (
              <Image className="h-5 w-5 group-hover:scale-105 transition-transform text-rose-500" />
            )}
            <span className="text-[10px] tracking-widest font-mono uppercase text-stone-500 group-hover:text-stone-900">
              {mediaTypeFilter === "all" ? "VIEW: ALL" : mediaTypeFilter === "video" ? "VIDEOS ONLY" : "IMAGES ONLY"}
            </span>
          </button>

          {/* GALLERY VIEW */}
          <button
            onClick={() => setIsGalleryOpen(true)}
            className="flex flex-col items-center gap-1 text-stone-500 hover:text-stone-900 transition-colors cursor-pointer group focus:outline-none"
          >
            <LayoutGrid className="h-5 w-5 group-hover:scale-105 transition-transform" />
            <span className="text-[10px] tracking-widest font-mono uppercase">GALLERY</span>
          </button>
        </div>
      </div>

      {/* 6. Modals Overlays Renderers */}
      <ViewPlaylistsModal
        isOpen={isPlaylistsOpen}
        onClose={() => setIsPlaylistsOpen(false)}
        playlists={playlists}
        onRefresh={loadInitialData}
        selectedPlaylistId={selectedPlaylistId}
        onSelectPlaylist={setSelectedPlaylistId}
        mediaItems={allMedia}
      />

      <AddToPlaylistModal
        isOpen={isAddToPlaylistOpen}
        onClose={() => setIsAddToPlaylistOpen(false)}
        activeItem={activeItem}
        playlists={playlists}
        onRefresh={loadInitialData}
      />

      <GalleryViewModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        mediaItems={allMedia}
        playlists={playlists}
        selectedPlaylistId={selectedPlaylistId}
        onSelectPlaylistId={setSelectedPlaylistId}
        onSelectIndex={(item, playlistId, filterType) => {
          pendingScrollItemIdRef.current = item.id;
          setSelectedPlaylistId(playlistId);
          setMediaTypeFilter(filterType);
          setSearchQuery(""); // Clear main bar search to match gallery list items exactly
        }}
      />
    </main>
  );
}
