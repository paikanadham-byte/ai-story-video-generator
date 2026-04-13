/**
 * Centralized icon system using Lucide React
 * Replaces all emojis with clean, professional SVG icons
 */
import {
  Home, Sparkles, Film, Scissors, Shield, Mic, Smartphone,
  Gem, MessageSquare, Settings, ChevronLeft, Play, Globe,
  Zap, Infinity, Crown, Lock, Star, Heart, Flame,
  Upload, Download, RefreshCw, Copy, Check, AlertTriangle,
  Folder, Link, Type, Music, Volume2, SlidersHorizontal,
  Palette, RotateCcw, Image, Layers, Shuffle, UserCircle,
  Eraser, Monitor, Wand2, Clock, Hash, Search, Eye,
  Camera, Sun, Snowflake, CircleDot, Clapperboard,
  FileText, Video, Headphones, Speaker, VolumeX,
  SquareStack, Paintbrush, Contrast, Focus, ImagePlus,
  Tv, Radio, Ghost, Swords, Rocket, Laugh, BookOpen,
  Brain, GraduationCap, ShoppingBag, Newspaper, Smartphone as Phone,
  MicVocal, Cloudy, User, LogOut, Languages, Mail,
  Send, Info, Wrench, LayoutGrid, TrendingUp, ThumbsUp,
  Binary, Key, Server, Code, GitBranch, Cpu, Database,
  PenTool, Megaphone, FileVideo, Gauge, BarChart3,
  Target, Lightbulb, Trash2, Dna, Guitar, Droplet,
  FlipHorizontal2
} from "lucide-react";

// Standard icon size for consistency
const S = 16;
const M = 18;
const L = 22;

/**
 * Icon component with consistent sizing
 * Usage: <I name="home" /> or <I name="home" size={20} />
 */
export default function I({ name, size = S, className = "", ...props }) {
  const Icon = ICON_MAP[name];
  if (!Icon) return null;
  return <Icon size={size} className={className} strokeWidth={1.8} {...props} />;
}

const ICON_MAP = {
  // Navigation
  home: Home,
  sparkles: Sparkles,
  film: Film,
  scissors: Scissors,
  shield: Shield,
  mic: Mic,
  smartphone: Smartphone,
  gem: Gem,
  message: MessageSquare,
  settings: Settings,
  back: ChevronLeft,
  play: Play,
  globe: Globe,
  
  // Dashboard stats
  clapperboard: Clapperboard,
  headphones: Headphones,
  crown: Crown,
  zap: Zap,
  infinity: Infinity,
  star: Star,
  
  // Actions
  upload: Upload,
  download: Download,
  refresh: RefreshCw,
  copy: Copy,
  check: Check,
  alert: AlertTriangle,
  folder: Folder,
  link: Link,
  search: Search,
  eye: Eye,
  send: Send,
  info: Info,
  logout: LogOut,
  
  // Editor tools
  type: Type,
  music: Music,
  volume: Volume2,
  sliders: SlidersHorizontal,
  palette: Palette,
  rotate: RotateCcw,
  image: Image,
  layers: Layers,
  shuffle: Shuffle,
  user: UserCircle,
  eraser: Eraser,
  monitor: Monitor,
  wand: Wand2,
  clock: Clock,
  hash: Hash,
  speaker: Speaker,
  volumeX: VolumeX,
  pen: PenTool,
  
  // Image enhancer
  camera: Camera,
  sun: Sun,
  snowflake: Snowflake,
  focus: Focus,
  contrast: Contrast,
  paintbrush: Paintbrush,
  imagePlus: ImagePlus,
  circleDot: CircleDot,
  
  // Content types / Genres
  bookOpen: BookOpen,
  graduationCap: GraduationCap,
  shoppingBag: ShoppingBag,
  newspaper: Newspaper,
  phone: Phone,
  brain: Brain,
  ghost: Ghost,
  heart: Heart,
  flame: Flame,
  swords: Swords,
  rocket: Rocket,
  laugh: Laugh,
  
  // Vocal
  micVocal: MicVocal,
  
  // Video preview
  tv: Tv,
  radio: Radio,
  
  // Pro / API
  lock: Lock,
  key: Key,
  server: Server,
  code: Code,
  git: GitBranch,
  cpu: Cpu,
  database: Database,
  gauge: Gauge,
  barChart: BarChart3,
  binary: Binary,
  megaphone: Megaphone,
  fileVideo: FileVideo,
  fileText: FileText,
  video: Video,
  
  // Misc
  wrench: Wrench,
  layoutGrid: LayoutGrid,
  trendingUp: TrendingUp,
  thumbsUp: ThumbsUp,
  languages: Languages,
  mail: Mail,
  cloudy: Cloudy,
  squareStack: SquareStack,
  target: Target,
  lightbulb: Lightbulb,
  logOut: LogOut,
  trash: Trash2,
  dna: Dna,
  guitar: Guitar,
  droplet: Droplet,
  flipHorizontal: FlipHorizontal2,
};
