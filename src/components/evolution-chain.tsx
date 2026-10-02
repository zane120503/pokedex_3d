import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, ArrowLeftRight, ArrowRight } from 'lucide-react';
import { getPokemonSlug } from '@/lib/data';
import type { Evolution, EvolutionTrigger, Pokemon } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { getArtworkUrl, getItemSpriteUrl } from '@/lib/pokemon-assets';
import { cn } from '@/lib/utils';

type EvolutionNode = {
  pokemon: Pokemon;
  // How the parent node evolves into this one (absent for the first stage).
  evolution?: Evolution;
  children: EvolutionNode[];
};

const TRIGGER_HINTS: Record<EvolutionTrigger, string> = {
  level: 'Level up',
  item: 'Use item',
  trade: 'Link trade',
  friendship: 'Level up',
};

// Item sprite that illustrates each kind of evolution; item evolutions show the item itself.
const TRIGGER_SPRITES: Partial<Record<EvolutionTrigger, string>> = {
  level: 'rare-candy',
  friendship: 'soothe-bell',
};

function findRoot(pokemon: Pokemon, allPokemon: Pokemon[]): Pokemon {
  let root = pokemon;
  while (root.previousEvolution) {
    const previousId = root.previousEvolution.id;
    const previous = allPokemon.find(p => p.id === previousId);
    if (!previous) break;
    root = previous;
  }
  return root;
}

function buildTree(pokemon: Pokemon, allPokemon: Pokemon[], evolution?: Evolution): EvolutionNode {
  const children = (pokemon.evolutions ?? []).flatMap(evo => {
    const next = allPokemon.find(p => p.id === evo.id);
    return next ? [buildTree(next, allPokemon, evo)] : [];
  });
  return { pokemon, evolution, children };
}

function EvolutionCard({ pokemon, isCurrent }: { pokemon: Pokemon; isCurrent: boolean }) {
  return (
    <Link
      href={`/pokemon/${getPokemonSlug(pokemon.name)}`}
      className="group block w-full xl:w-32"
      aria-current={isCurrent ? 'page' : undefined}
    >
      <Card
        className={cn(
          'h-full overflow-hidden transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-lg',
          isCurrent && 'border-primary ring-2 ring-primary/40'
        )}
      >
        <CardContent className="flex flex-col items-center gap-1 p-3 text-center">
          <div className="relative h-16 w-16">
            <Image
              src={getArtworkUrl(pokemon.id)}
              alt={pokemon.name}
              fill
              sizes="64px"
              className="object-contain transition-transform duration-300 group-hover:scale-110"
            />
          </div>
          <p className="text-xs font-medium text-muted-foreground">#{String(pokemon.id).padStart(4, '0')}</p>
          <h3 className="text-sm font-bold leading-tight text-primary">{pokemon.name}</h3>
        </CardContent>
      </Card>
    </Link>
  );
}

function EvolutionMethod({ evolution }: { evolution: Evolution }) {
  const sprite = evolution.item ?? (evolution.trigger && TRIGGER_SPRITES[evolution.trigger]);
  const hint = evolution.trigger && TRIGGER_HINTS[evolution.trigger];
  return (
    <div
      className="flex w-24 shrink-0 flex-col items-center justify-center gap-1 text-center"
      title={evolution.method ? `Evolves into ${evolution.name}: ${evolution.method}` : undefined}
    >
      {evolution.method && (
        <>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            {sprite ? (
              <Image
                src={getItemSpriteUrl(sprite)}
                alt=""
                width={30}
                height={30}
                unoptimized
                className="[image-rendering:pixelated]"
              />
            ) : (
              <ArrowLeftRight className="h-5 w-5 text-muted-foreground" aria-hidden />
            )}
          </div>
          <p className="text-xs font-semibold leading-tight">{evolution.method}</p>
          {hint && <p className="text-[11px] leading-tight text-muted-foreground">{hint}</p>}
        </>
      )}
      <ArrowDown className="h-5 w-5 text-muted-foreground xl:hidden" aria-hidden />
      <ArrowRight className="hidden h-5 w-5 text-muted-foreground xl:block" aria-hidden />
    </div>
  );
}

// One stage plus everything it evolves into. Stages flow downwards on narrow screens and
// left-to-right on wide ones; a branching evolution (Eevee) lists each branch with its own condition.
function EvolutionBranch({ node, currentId }: { node: EvolutionNode; currentId: number }) {
  const branching = node.children.length > 1;
  return (
    <div className="flex w-full flex-col items-center gap-2 xl:w-auto xl:flex-row">
      <div className="w-full max-w-40 xl:w-auto">
        <EvolutionCard pokemon={node.pokemon} isCurrent={node.pokemon.id === currentId} />
      </div>
      {node.children.length > 0 && (
        <div
          className={cn(
            'w-full xl:w-auto',
            branching ? 'grid grid-cols-2 gap-x-3 gap-y-4 xl:gap-y-3' : 'flex flex-col'
          )}
        >
          {node.children.map(child => (
            <div key={child.pokemon.id} className="flex flex-col items-center gap-2 xl:flex-row">
              {child.evolution && <EvolutionMethod evolution={child.evolution} />}
              <EvolutionBranch node={child} currentId={currentId} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// The whole family the Pokémon belongs to (looked up in `allPokemon`), or null when it doesn't evolve.
export function getEvolutionTree(pokemon: Pokemon, allPokemon: Pokemon[]): EvolutionNode | null {
  const tree = buildTree(findRoot(pokemon, allPokemon), allPokemon);
  return tree.children.length > 0 ? tree : null;
}

export function EvolutionChain({ tree, currentId }: { tree: EvolutionNode; currentId: number }) {
  return (
    <div className="flex justify-center overflow-x-auto xl:justify-start">
      <EvolutionBranch node={tree} currentId={currentId} />
    </div>
  );
}
