// INFO: the only importer of lucide-react-native. Named imports only, to
// keep the bundle small; the glyph set grows by one entry per screen that
// needs an icon.
import {
  Check,
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
  Library,
  Mail,
  Music,
  Plus,
  Search,
  User,
  X,
} from "lucide-react-native";

import { icon } from "../tokens/icon.ts";
import { toneColor, type Tone } from "./tone.ts";

const glyphs = {
  check: Check,
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
  library: Library,
  mail: Mail,
  music: Music,
  plus: Plus,
  search: Search,
  user: User,
  x: X,
} as const;

export type IconName = keyof typeof glyphs;

interface IconProps {
  name: IconName;
  size?: keyof typeof icon.size;
  tone?: Tone;
}

export function Icon({ name, size = "md", tone = "primary" }: IconProps) {
  const Glyph = glyphs[name];
  return (
    <Glyph
      size={icon.size[size]}
      strokeWidth={icon.stroke}
      color={toneColor[tone]}
      accessible={false}
    />
  );
}
