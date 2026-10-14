const PALETTE = [
  ['#ff8a65', '#f4511e'],
  ['#64b5f6', '#1e88e5'],
  ['#81c784', '#43a047'],
  ['#ba68c8', '#8e24aa'],
  ['#4dd0e1', '#00acc1'],
  ['#ffb74d', '#fb8c00'],
  ['#f06292', '#d81b60'],
  ['#7986cb', '#3949ab'],
];

function hash(value: string): number {
  let result = 0;
  for (const char of value) result = (result * 31 + char.charCodeAt(0)) | 0;
  return Math.abs(result);
}

function initials(title: string): string {
  const words = title.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  // для номера телефона показываем последние две цифры
  if (/^\d+$/.test(words.join(''))) return words.join('').slice(-2);
  return words
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
}

interface AvatarProps {
  id: string;
  title: string;
  size?: number;
}

export function Avatar({ id, title, size = 48 }: AvatarProps) {
  const [from, to] = PALETTE[hash(id) % PALETTE.length];
  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `linear-gradient(135deg, ${from}, ${to})`,
      }}
      aria-hidden="true"
    >
      {initials(title)}
    </div>
  );
}
