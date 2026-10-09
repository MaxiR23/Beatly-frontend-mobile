// INFO: the only importer of lucide-react-native. Named imports only, to
// keep the bundle small; the glyph set grows by one entry per screen that
// needs an icon.
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Ellipsis,
  Eye,
  EyeOff,
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
  Trash,
  User,
  X,
} from "lucide-react-native";

import { icon } from "../tokens/icon.ts";
import { toneColor, type Tone } from "./tone.ts";

const glyphs = {
  check: Check,
  chevronDown: ChevronDown,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  clock: Clock,
  compass: Compass,
  ellipsis: Ellipsis,
  eye: Eye,
  eyeOff: EyeOff,
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
  trash: Trash,
  user: User,
  x: X,
} as const;

export type IconName = keyof typeof glyphs;

interface IconProps {
  name: IconName;
  size?: keyof typeof icon.size;
  tone?: Tone;
  filled?: boolean | undefined;
}

export function Icon({ name, size = "md", tone = "primary", filled }: IconProps) {
  const Glyph = glyphs[name];
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
