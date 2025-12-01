import type { SVGProps } from 'react';
import {
  Flame, Leaf, Droplets, Zap, Snowflake, Hand, Biohazard, Mountain, Feather, BrainCircuit, Bug, Gem, Ghost, Circle, Moon, Shield, Sparkles
} from 'lucide-react';
import type { PokemonType } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const DragonIcon = (props: SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M14.5 10.5c-3.1.5-6 3-6 7 0 2.5 1.5 4.5 3.5 4.5 1.4 0 2.6-.6 3.5-1.5.9.9 2.1 1.5 3.5 1.5 2 0 3.5-2 3.5-4.5 0-4-2.9-6.5-6-7z"/>
        <path d="M5.5 14c-1.8 0-3.2-1.8-2.5-3.5.7-1.7 2.5-1.7 3.5-1.5 1.2.3 2.5.3 3.5 0"/>
        <path d="M12.5 8.5c-2.3 0-4.2-1.3-4.5-3-.3-1.7 1-3.2 2.5-3.5 1.5-.3 3.3.3 4.5 2"/>
    </svg>
);

const typeIcons: Record<PokemonType, React.ElementType> = {
  Fire: Flame,
  Grass: Leaf,
  Water: Droplets,
  Electric: Zap,
  Ice: Snowflake,
  Fighting: Hand,
  Poison: Biohazard,
  Ground: Mountain,
  Flying: Feather,
  Psychic: BrainCircuit,
  Bug: Bug,
  Rock: Gem,
  Ghost: Ghost,
  Normal: Circle,
  Dragon: DragonIcon,
  Dark: Moon,
  Steel: Shield,
  Fairy: Sparkles,
};

export const TypeBadge = ({ type, className }: { type: PokemonType; className?: string }) => {
  const Icon = typeIcons[type];
  return (
    <Badge variant="secondary" className={cn("flex items-center gap-1.5 whitespace-nowrap", className)}>
      <Icon className="h-3 w-3" />
      <span className="capitalize">{type}</span>
    </Badge>
  );
};
