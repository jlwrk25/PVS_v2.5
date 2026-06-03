import React, { useState } from "react";
import { X, Plus, Trash2, Play, Search, Film, Image as ImageIcon } from "lucide-react";
import { MediaItem, Playlist } from "../types";
import { createPlaylist, deletePlaylist, addItemToPlaylist } from "../mediaService";

// VIEW PLAYLISTS MODAL
interface ViewPlaylistsModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlists: Playlist[];
  onRefresh: () => void;
  selectedPlaylistId: string | null;
  onSelectPlaylist: (playlistId: string | null) => void;
  mediaItems: MediaItem[];
}

export const ViewPlaylistsModal: React.FC<ViewPlaylistsModalProps> = ({
  isOpen,
  onClose,
  playlists,
  onRefresh,
  selectedPlaylistId,
  onSelectPlaylist,
  mediaItems,
}) => {
  const [newPlaylistName, setNewPlaylistName] = useState("");

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    createPlaylist(newPlaylistName);
    setNewPlaylistName("");
    onRefresh();
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deletePlaylist(id);
    if (selectedPlaylistId === id) {
      onSelectPlaylist(null);
    }
    onRefresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="bg-stone-50 border border-stone-200/80 rounded-3xl w-full max-w-md overflow-hidden shadow-xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-stone-200 bg-stone-100/50">
          <div>
            <h3 className="text-sm font-semibold tracking-wider text-stone-900 uppercase">My Playlists</h3>
            <p className="text-xs text-stone-500 mt-0.5">Filter your scroll-feed state</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-200 text-stone-500 hover:text-stone-800 transition-all active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Create New Playlist Form */}
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              type="text"
              placeholder="Create new playlist..."
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              className="flex-1 text-xs px-3.5 py-2.5 rounded-xl bg-white border border-stone-200 focus:outline-none focus:border-stone-400 font-sans text-stone-900 placeholder-stone-400 shadow-xs transition-all"
            />
            <button
              type="submit"
              className="px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs transition-all active:scale-95 flex items-center justify-center"
            >
              <Plus className="h-4 w-4" />
            </button>
          </form>

          {/* Playlists List */}
          <div className="space-y-2">
            {/* Standard "All Items" Option */}
            <div
              onClick={() => {
                onSelectPlaylist(null);
                onClose();
              }}
              className={`p-3.5 rounded-xl cursor-pointer transition-all border flex items-center justify-between ${
                selectedPlaylistId === null
                  ? "bg-amber-50/50 border-amber-200/60 text-stone-900 shadow-xs font-medium"
                  : "bg-white border-stone-200/40 text-stone-600 hover:bg-stone-100/60 hover:text-stone-900 hover:border-stone-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <Play className="h-4 w-4 text-stone-400" />
                <div>
                  <h4 className="text-xs font-semibold tracking-wide uppercase">All Contents</h4>
                  <p className="text-[10px] text-stone-550 font-mono mt-0.5">
                    {mediaItems.length} ITEMS • RANDOMIZED
                  </p>
                </div>
              </div>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-stone-200 text-stone-700 rounded font-bold">
                DEFAULT
              </span>
            </div>

            {playlists.length === 0 ? (
              <div className="text-center py-6 text-stone-405 text-xs">
                No custom playlists created yet
              </div>
            ) : (
              playlists.map((playlist) => {
                const isSelected = selectedPlaylistId === playlist.id;
                return (
                  <div
                    key={playlist.id}
                    onClick={() => {
                      onSelectPlaylist(playlist.id);
                      onClose();
                    }}
                    className={`p-3.5 rounded-xl cursor-pointer transition-all border flex items-center justify-between ${
                      isSelected
                        ? "bg-emerald-50/75 border-emerald-200 text-emerald-700 font-medium shadow-xs"
                        : "bg-white border-stone-200/40 text-stone-600 hover:bg-stone-100/60 hover:text-stone-900 hover:border-stone-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Play className={`h-4 w-4 ${isSelected ? "text-emerald-600" : "text-stone-400"}`} />
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wide truncate max-w-[200px]">
                          {playlist.name}
                        </h4>
                        <p className="text-[10px] text-stone-500 font-mono mt-0.5">
                          {playlist.itemIds.length} MEDIA ITEMS
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleDelete(playlist.id, e)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-500 transition-all active:scale-95"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


// ADD TO PLAYLIST MODAL
interface AddToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeItem: MediaItem | null;
  playlists: Playlist[];
  onRefresh: () => void;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
  isOpen,
  onClose,
  activeItem,
  playlists,
  onRefresh,
}) => {
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [showCreateInline, setShowCreateInline] = useState(false);

  if (!isOpen || !activeItem) return null;

  const handleCreateAndAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    const play = createPlaylist(newPlaylistName);
    addItemToPlaylist(play.id, activeItem.id);
    setNewPlaylistName("");
    setShowCreateInline(false);
    onRefresh();
    onClose();
  };

  const handleAddToPlaylist = (playlistId: string) => {
    addItemToPlaylist(playlistId, activeItem.id);
    onRefresh();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="bg-stone-50 border border-stone-200/80 rounded-3xl w-full max-w-md overflow-hidden shadow-xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-stone-200 bg-stone-100/50">
          <div>
            <h3 className="text-xs font-semibold tracking-wider text-stone-500 uppercase">
              Add Active Media
            </h3>
            <h4 className="text-xs font-semibold text-stone-900 truncate max-w-[260px] lowercase font-mono mt-0.5">
              {activeItem.title}
            </h4>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-200 text-stone-500 hover:text-stone-800 transition-all active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {showCreateInline ? (
            <form onSubmit={handleCreateAndAdd} className="space-y-2">
              <label className="text-[10px] uppercase font-mono text-stone-500 font-semibold tracking-widest">
                Playlist Name
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Cat Collection"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  className="flex-1 text-xs px-3.5 py-2.5 rounded-xl bg-white border border-stone-200 focus:outline-none focus:border-stone-400 font-sans text-stone-900 placeholder-stone-400 transition-all"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs tracking-wide transition-all active:scale-95 flex items-center justify-center"
                >
                  Create
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateInline(false)}
                className="text-[10px] uppercase font-mono text-stone-450 hover:text-stone-800 transition-colors"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowCreateInline(true)}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-stone-300 hover:border-stone-450 bg-stone-100/50 text-xs text-stone-605 hover:text-stone-900 transition-all font-semibold active:scale-[0.99]"
            >
              <Plus className="h-4 w-4" /> Create New Playlist
            </button>
          )}

          {/* Selectable Playlists options */}
          <div className="space-y-1.5">
            <h5 className="text-[10px] uppercase font-mono text-stone-500 font-semibold tracking-widest px-1 py-1">
              Select Playlist
            </h5>
            {playlists.length === 0 ? (
              <div className="text-center py-6 text-stone-400 text-xs">
                No custom playlists available
              </div>
            ) : (
              playlists.map((playlist) => {
                const alreadyAdded = playlist.itemIds.includes(activeItem.id);
                return (
                  <button
                    key={playlist.id}
                    disabled={alreadyAdded}
                    onClick={() => handleAddToPlaylist(playlist.id)}
                    className={`w-full text-left p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                      alreadyAdded
                        ? "bg-stone-100/40 border-stone-200/50 opacity-60 cursor-not-allowed text-stone-400"
                        : "bg-white border-stone-200/60 hover:border-stone-350 text-stone-700 hover:text-stone-900 hover:bg-stone-50/50"
                    }`}
                  >
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide truncate max-w-[200px]">
                        {playlist.name}
                      </h4>
                      <p className="text-[10px] text-stone-450 font-mono mt-0.5">
                        {playlist.itemIds.length} MEDIA ITEMS
                      </p>
                    </div>

                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
                      {alreadyAdded ? "ALREADY ADDED" : "SELECT"}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
// GALLERY VIEW MODAL
interface GalleryViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaItems: MediaItem[];
  playlists: Playlist[];
  selectedPlaylistId: string | null;
  onSelectPlaylistId?: (playlistId: string | null) => void;
  onSelectIndex: (item: MediaItem, playlistId: string | null, filterType: "all" | "video" | "image") => void;
  accessToken?: string | null;
}

export const GalleryViewModal: React.FC<GalleryViewModalProps> = ({
  isOpen,
  onClose,
  mediaItems,
  playlists,
  selectedPlaylistId,
  onSelectPlaylistId,
  onSelectIndex,
  accessToken,
}) => {
  const [filterType, setFilterType] = useState<"all" | "video" | "image">("all");
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  // Find files which are part of the active selected playlist
  const activePlaylist = selectedPlaylistId
    ? playlists.find((p) => p.id === selectedPlaylistId)
    : null;

  const filteredItems = mediaItems.filter((item) => {
    // Check if it belongs to selected playlist
    const matchesPlaylist = activePlaylist
      ? activePlaylist.itemIds.includes(item.id)
      : true;
    const matchesType = filterType === "all" || item.type === filterType;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPlaylist && matchesType && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 bg-stone-50 flex flex-col h-screen w-screen animate-fade-in overflow-hidden">
        {/* Header */}
        <div className="flex flex-col p-3 px-4 md:px-6 border-b border-stone-250 gap-2.5 bg-stone-100/60">
          {/* Top Line: Select Dropdown & Close Button */}
          <div className="flex items-center justify-between w-full">
            {/* Playlist Filter Selector Dropdown */}
            <div className="flex items-center gap-1.5 flex-1 max-w-[200px]">
              <span className="text-[9px] font-mono uppercase tracking-widest text-stone-500 hidden sm:inline-block">PLAYLIST:</span>
              <select
                value={selectedPlaylistId || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (onSelectPlaylistId) {
                    onSelectPlaylistId(val || null);
                  }
                }}
                className="text-[11px] px-2.5 py-1.5 w-full rounded-md bg-white border border-stone-200/80 focus:outline-none focus:border-stone-400 text-stone-800 font-sans font-medium hover:bg-stone-50 transition-all cursor-pointer shadow-xs"
              >
                <option value="">ALL CONTENT</option>
                {playlists.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name.toUpperCase()} ({p.itemIds.length})
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Green Close Button - smaller */}
            <button
              onClick={onClose}
              className="text-xs font-semibold tracking-wider text-emerald-600 hover:text-emerald-700 transition-all font-mono lowercase cursor-pointer px-2.5 py-1 focus:outline-none"
            >
              close
            </button>
          </div>

          {/* Bottom Controls / Stacking Area - tighter */}
          <div className="flex items-center gap-2 w-full">
            {/* Embedded Search */}
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-stone-400" />
              <input
                type="text"
                placeholder="Search gallery..."
                value={searchQuery}
                aria-label="Search items"
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-7.5 pr-2 py-1 rounded bg-white border border-stone-200 focus:outline-none focus:border-stone-400 text-stone-900 placeholder-stone-400 font-sans transition-all shadow-xs"
              />
            </div>

            {/* Type Filter Buttons - even lighter */}
            <div className="flex border border-stone-200 bg-stone-100/40 p-0.5 rounded">
              {(["all", "video", "image"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`text-[9px] uppercase tracking-wider font-mono font-bold px-2 py-1 rounded transition-all ${
                    filterType === t
                      ? "bg-white text-stone-900 shadow-xs border border-stone-200/40"
                      : "text-stone-550 hover:text-stone-800"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Catalog Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-stone-100/40">
          {filteredItems.length === 0 ? (
            <div className="text-center py-24 text-stone-400 text-xs">
              No matching media items found at this filter
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-5">
              {filteredItems.map((item) => {
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                        onSelectIndex(item, selectedPlaylistId, filterType);
                        onClose();
                    }}
                    className="group relative aspect-square rounded-2xl bg-white border border-stone-200 hover:border-stone-400 overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-md active:scale-95"
                  >
                    {/* Media Thumbnail */}
                    {item.type === "video" ? (
                      <div className="w-full h-full relative flex items-center justify-center bg-stone-100">
                        <video
                          src={accessToken ? `/api/media/${item.id}?token=${encodeURIComponent(accessToken)}#t=0.5` : `/api/media/${item.id}#t=0.5`}
                          preload="metadata"
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                          muted
                          playsInline
                        />
                        <div className="absolute inset-0 bg-stone-950/15 group-hover:bg-transparent transition-colors" />
                        <div className="absolute top-2 right-2 bg-stone-900/80 p-1 rounded-md text-white border border-white/5 z-15 shadow-sm">
                          <Film className="h-3 w-3" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full relative flex items-center justify-center bg-stone-100">
                        <img
                          src={accessToken ? `/api/media/${item.id}?token=${encodeURIComponent(accessToken)}` : `/api/media/${item.id}`}
                          alt={item.title}
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-stone-950/15 group-hover:bg-transparent transition-colors" />
                        <div className="absolute top-2 right-2 bg-stone-900/80 p-1 rounded-md text-white border border-white/5 z-15 shadow-sm">
                          <ImageIcon className="h-3 w-3" />
                        </div>
                      </div>
                    )}

                    {/* Meta info Hover footer */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-900/90 via-stone-900/40 to-transparent p-3 flex flex-col justify-end translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                      <p className="text-[10px] text-white lowercase font-mono truncate">
                        {item.title}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
    </div>
  );
};
