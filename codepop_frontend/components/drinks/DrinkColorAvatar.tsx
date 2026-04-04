// components/drinks/DrinkColorAvatar.tsx
// Generates a consistent gradient placeholder based on the drink's soda type.
// No images needed — looks intentional.

interface DrinkColorAvatarProps {
  sodas: string[];
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

// Map common soda keywords to gradient pairs
const SODA_GRADIENTS: Record<string, [string, string]> = {
  sprite:      ['#a8ff78', '#78ffd6'],
  coke:        ['#c94b4b', '#4b134f'],
  cola:        ['#b06a2b', '#5c2d0a'],
  'dr pepper': ['#6b2737', '#c0392b'],
  'dr. pepper':['#6b2737', '#c0392b'],
  'mtn dew':   ['#b5cc18', '#5b8a00'],
  'mountain dew': ['#b5cc18', '#5b8a00'],
  lemonade:    ['#f7971e', '#ffd200'],
  'root beer': ['#8b4513', '#d2691e'],
  water:       ['#2196f3', '#21cbf3'],
  juice:       ['#f7971e', '#ff6b6b'],
  default:     ['#7c3aed', '#a78bfa'],
};

function getGradient(sodas: string[]): [string, string] {
  const lower = (sodas[0] ?? '').toLowerCase();
  for (const [key, colors] of Object.entries(SODA_GRADIENTS)) {
    if (lower.includes(key)) return colors;
  }
  return SODA_GRADIENTS.default;
}

// Get initials from drink name for the avatar text
function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

const SIZE_CLASSES = {
  sm: 'h-14 w-14 text-sm',
  md: 'h-16 w-16 text-base',
  lg: 'h-20 w-20 text-lg',
};

export default function DrinkColorAvatar({
  sodas,
  name,
  size = 'md',
}: DrinkColorAvatarProps) {
  const [from, to] = getGradient(sodas);
  return (
    <div
      className={`${SIZE_CLASSES[size]} flex-shrink-0 rounded-xl flex items-center justify-center font-bold text-white shadow-inner`}
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      {getInitials(name)}
    </div>
  );
}