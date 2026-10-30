// INFO: the only importer of lucide-react-native. Named imports only, to
// keep the bundle small; the glyph set grows by one entry per screen that
// needs an icon; back and more draw the Material 3 glyph on Android (ADR 027).
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Ellipsis,
  EllipsisVertical,
  Eye,
  EyeOff,
  Flag,
  GripVertical,
  Heart,
  House,
  Inbox,
  Info,
  Library,
  Mail,
  Music,
  Pause,
  Pencil,
  Play,
  Plus,
  Repeat1,
  Search,
  Shuffle,
  SkipBack,
  SkipForward,
  Star,
  Trash,
  User,
  X,
} from "lucide-react-native";

import { icon } from "../tokens/icon.ts";
import { isAndroidVariant } from "./platform.ts";
import { toneColor, type Tone } from "./tone.ts";

const glyphs = {
  check: Check,
  chevronDown: ChevronDown,
  chevronRight: ChevronRight,
  clock: Clock,
  compass: Compass,
  eye: Eye,
  eyeOff: EyeOff,
  flag: Flag,
  gripVertical: GripVertical,
  heart: Heart,
  house: House,
  inbox: Inbox,
  info: Info,
  library: Library,
  mail: Mail,
  music: Music,
  pause: Pause,
  pencil: Pencil,
  play: Play,
  plus: Plus,
  repeat1: Repeat1,
  search: Search,
  shuffle: Shuffle,
  skipBack: SkipBack,
  skipForward: SkipForward,
  star: Star,
  trash: Trash,
  user: User,
  x: X,
} as const;

// The action glyphs follow the platform (ADR 027): Material 3's arrow_back and more_vert on Android, today's chevron and ellipsis on iOS.
const platformGlyphs = {
  back: { ios: ChevronLeft, android: ArrowLeft },
  more: { ios: Ellipsis, android: EllipsisVertical },
} as const;

type PlatformGlyphName = keyof typeof platformGlyphs;

export type IconName = keyof typeof glyphs | PlatformGlyphName;

function isPlatformGlyph(name: IconName): name is PlatformGlyphName {
  return Object.hasOwn(platformGlyphs, name);
}

interface IconProps {
  name: IconName;
  size?: keyof typeof icon.size;
  tone?: Tone;
  filled?: boolean | undefined;
}

export function Icon({ name, size = "md", tone = "primary", filled }: IconProps) {
  const Glyph = isPlatformGlyph(name)
    ? platformGlyphs[name][isAndroidVariant() ? "android" : "ios"]
    : glyphs[name];
  return (
    <Glyph
      size={icon.size[size]}
      strokeWidth={icon.stroke}
      color={toneColor[tone]}
      fill={filled === true ? toneColor[tone] : "none"}
      accessible={false}
    />
  );
}
