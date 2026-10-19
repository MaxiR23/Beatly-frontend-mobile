// INFO: the route's source param as a playlist source; anything else is an own playlist, and the API answers playlist_not_found when it is not; and the playback source kind of each.
import type { PlaylistSource } from "../../queries/usePlaylist.ts";

export function playlistSource(param: string | undefined): PlaylistSource {
  return param === "liked" || param === "genre" ? param : "user";
}

// The playback source kind of each playlist source: an own playlist is "playlist", as on the API's up next.
export function playbackKindOf(source: PlaylistSource): "playlist" | "genre_playlist" | "liked" {
  return source === "user" ? "playlist" : source === "genre" ? "genre_playlist" : "liked";
}
