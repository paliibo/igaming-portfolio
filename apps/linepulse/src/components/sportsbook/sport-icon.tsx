import {
  Bike,
  CircleDot,
  Dumbbell,
  Gamepad2,
  Medal,
  RugbyBall,
  Snowflake,
  Swords,
  Target,
  Trophy,
  Volleyball,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  football: CircleDot,
  soccer: CircleDot,
  basketball: Target,
  tennis: Volleyball,
  volleyball: Volleyball,
  rugby: RugbyBall,
  hockey: Snowflake,
  'ice-hockey': Snowflake,
  cycling: Bike,
  mma: Swords,
  boxing: Dumbbell,
  esports: Gamepad2,
  athletics: Medal,
};

export function SportIcon({ slug, ...props }: { slug: string } & LucideProps) {
  const Icon = ICONS[slug] ?? Trophy;
  return <Icon aria-hidden {...props} />;
}
