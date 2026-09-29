// INFO: the create-playlist rules the sheet shows as the user types; they mirror POST /playlists (title 1 to 200 characters).
export const PLAYLIST_TITLE_MAX_LENGTH = 200;

// The backend's max_length counts code points; string.length counts UTF-16 units, so an emoji would count twice.
export function titleLength(title: string): number {
  return Array.from(title.trim()).length;
}

export function isTitleTooLong(title: string): boolean {
  return titleLength(title) > PLAYLIST_TITLE_MAX_LENGTH;
}

export function canCreatePlaylist(title: string): boolean {
  const length = titleLength(title);
  return length >= 1 && length <= PLAYLIST_TITLE_MAX_LENGTH;
}
