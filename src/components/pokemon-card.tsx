import Link from 'next/link';
import Image from 'next/image';
import type { Pokemon } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TypeBadge } from '@/components/type-badge';
import { PlaceHolderImages } from '@/lib/placeholder-images';

type PokemonCardProps = {
  pokemon: Pokemon;
};

export function PokemonCard({ pokemon }: PokemonCardProps) {
  const placeholder = PlaceHolderImages.find(p => p.id === pokemon.image2d);

  return (
    <Link href={`/pokemon/${pokemon.name.toLowerCase()}`} className="group block">
      <Card className="h-full overflow-hidden transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1.5 hover:border-primary">
        <CardHeader className="items-center p-0 pt-6">
          {placeholder && (
             <div className="relative h-36 w-36">
              <Image
                src={placeholder.imageUrl}
                alt={pokemon.name}
                fill
                sizes="144px"
                data-ai-hint={placeholder.imageHint}
                className="object-contain transition-transform duration-300 group-hover:scale-110"
              />
            </div>
          )}
        </CardHeader>
        <CardContent className="p-4 text-center">
          <CardTitle className="text-xl font-bold capitalize tracking-tight">
            {pokemon.name}
          </CardTitle>
          <p className="text-sm text-muted-foreground">#{String(pokemon.id).padStart(4, '0')}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {pokemon.types.map((type) => (
              <TypeBadge key={type} type={type} />
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
