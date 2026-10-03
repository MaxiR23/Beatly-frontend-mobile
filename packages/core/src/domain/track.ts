// INFO: the schemas of GET /tracks/{id}/upnext, /lyrics, /related and /credits; not paginated, the first upnext track is the requested one, lyrics is null when the track has none, start_ms and end_ms are null on every line of unsynced lyrics, credits has four nullable sections and other_sections, never null.
import { z } from "zod";

import { albumRefSchema } from "./album.ts";
import { relatedArtistSchema } from "./artist.ts";
import { searchArtistRefSchema } from "./search.ts";

export const trackRefSchema = z.object({
  track_id: z.string(),
  title: z.string(),
  artists: z.array(searchArtistRefSchema),
  album: z.string().nullable(),
  album_id: z.string().nullable(),
  duration_seconds: z.number().int().nullable(),
  thumbnail_url: z.string().nullable(),
});
export type TrackRef = z.infer<typeof trackRefSchema>;

export const upNextSchema = z.object({ tracks: z.array(trackRefSchema) });
export type UpNext = z.infer<typeof upNextSchema>;

export const lyricsLineSchema = z.object({
  text: z.string(),
  start_ms: z.number().int().nullable(),
  end_ms: z.number().int().nullable(),
});
export type LyricsLine = z.infer<typeof lyricsLineSchema>;

export const lyricsSchema = z.object({
  has_timestamps: z.boolean(),
  source: z.string().nullable(),
  lines: z.array(lyricsLineSchema),
});
export type Lyrics = z.infer<typeof lyricsSchema>;

export const trackLyricsSchema = z.object({ lyrics: lyricsSchema.nullable() });
export type TrackLyrics = z.infer<typeof trackLyricsSchema>;

export const trackRelatedSchema = z.object({
  songs: z.array(trackRefSchema),
  artists: z.array(relatedArtistSchema),
  albums: z.array(albumRefSchema),
});
export type TrackRelated = z.infer<typeof trackRelatedSchema>;

export const creditSectionSchema = z.object({
  localized_title: z.string(),
  names: z.array(z.string()),
});
export type CreditSection = z.infer<typeof creditSectionSchema>;

export const trackCreditsSchema = z.object({
  performed_by: creditSectionSchema.nullable(),
  written_by: creditSectionSchema.nullable(),
  produced_by: creditSectionSchema.nullable(),
  music_metadata_provided_by: creditSectionSchema.nullable(),
  other_sections: z.array(creditSectionSchema),
});
export type TrackCredits = z.infer<typeof trackCreditsSchema>;
