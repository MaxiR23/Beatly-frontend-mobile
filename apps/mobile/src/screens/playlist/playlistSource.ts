// INFO: the route's source param as a playlist source; anything else is an own playlist, and the API answers playlist_not_found when it is not.
import type { PlaylistSource } from "../../queries/usePlaylist.ts";

export function playlistSource(param: string | undefined): PlaylistSource {
  return param === "liked" || param === "genre" ? param : "user";
}
