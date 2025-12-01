import * as React from 'react';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { allPokemon } from '@/lib/data';
import type { Pokemon, Evolution } from '@/lib/types';
import { Header } from '@/components/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TypeBadge } from '@/components/type-badge';
import Pokemon3DViewer from '@/components/pokemon-3d-viewer';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { ChevronRight } from 'lucide-react';

async function getPokemonByName(name: string): Promise<Pokemon | undefined> {
  return allPokemon.find(p => p.name.toLowerCase() === name.toLowerCase());
}

function EvolutionCard({ pokemon }: { pokemon: Pokemon }) {
    const placeholder = PlaceHolderImages.find(p => p.id === pokemon.image2d);
    return (
        <Link href={`/pokemon/${pokemon.name.toLowerCase()}`} className="group block">
            <Card className="h-full overflow-hidden transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1">
                <CardContent className="p-4 flex items-center gap-4">
                    {placeholder && (
                        <div className="relative h-16 w-16 shrink-0">
                            <Image
                                src={placeholder.imageUrl}
                                alt={pokemon.name}
                                fill
                                sizes="64px"
                                data-ai-hint={placeholder.imageHint}
                                className="object-contain transition-transform duration-300 group-hover:scale-110"
                            />
                        </div>
                    )}
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">#{String(pokemon.id).padStart(4, '0')}</p>
                        <h3 className="text-lg font-bold capitalize text-primary">{pokemon.name}</h3>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

function getFullEvolutionChain(pokemon: Pokemon): Pokemon[] {
    if (!pokemon.previousEvolution && !pokemon.evolutions) {
        return [pokemon];
    }
    
    let currentPokemon = pokemon;
    // Find the start of the chain
    while (currentPokemon.previousEvolution) {
        const prev = allPokemon.find(p => p.id === currentPokemon.previousEvolution!.id);
        if (prev) {
            currentPokemon = prev;
        } else {
            break;
        }
    }

    const chain: Pokemon[] = [currentPokemon];
    // Build the chain forward
    while (currentPokemon.evolutions && currentPokemon.evolutions.length > 0) {
        // For simplicity, we'll just follow the first evolution path if there are multiple (like Eevee)
        const next = allPokemon.find(p => p.id === currentPokemon.evolutions![0].id);
        if (next) {
            chain.push(next);
            currentPokemon = next;
        } else {
            break;
        }
    }

    return chain;
}


export default async function PokemonPage({ params }: { params: { name: string } }) {
  const pokemon = await getPokemonByName(params.name);

  if (!pokemon) {
    notFound();
  }
  
  const placeholder = PlaceHolderImages.find(p => p.id === pokemon.image2d);
  const maxStat = 255; 

  const evolutionChain = getFullEvolutionChain(pokemon);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 py-10">
        <div className="container grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5">

          <div className="flex flex-col gap-8 lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex flex-col-reverse items-center gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-base font-medium text-muted-foreground">#{String(pokemon.id).padStart(4, '0')}</p>
                    <h1 className="text-5xl font-bold capitalize text-primary">{pokemon.name}</h1>
                    <div className="mt-4 flex gap-2">
                      {pokemon.types.map(type => <TypeBadge key={type} type={type} />)}
                    </div>
                  </div>
                  {placeholder && (
                    <div className="relative h-48 w-48 shrink-0">
                      <Image
                        src={placeholder.imageUrl}
                        alt={pokemon.name}
                        fill
                        sizes="192px"
                        data-ai-hint={placeholder.imageHint}
                        className="object-contain"
                        priority
                      />
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-lg">{pokemon.description}</p>
              </CardContent>
            </Card>

            {evolutionChain.length > 1 && (
                <Card>
                    <CardHeader><CardTitle>Evolution Chain</CardTitle></CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap items-center gap-4">
                            {evolutionChain.map((evo, index) => (
                                <React.Fragment key={evo.id}>
                                    <div className="w-full sm:w-auto sm:flex-1 min-w-[200px]">
                                        <EvolutionCard pokemon={evo} />
                                    </div>
                                    {index < evolutionChain.length - 1 && (
                                        <ChevronRight className="hidden h-8 w-8 text-muted-foreground sm:block" />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
                <Card>
                    <CardHeader><CardTitle>Stats</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                    {pokemon.stats.map(stat => (
                        <div key={stat.name} className="grid grid-cols-[80px_50px_1fr] items-center gap-4">
                          <p className="shrink-0 font-medium text-muted-foreground">{stat.name}</p>
                          <p className="font-mono text-lg font-semibold">{stat.value}</p>
                          <Progress value={(stat.value / maxStat) * 100} aria-label={`${stat.name} stat: ${stat.value}`} className="h-3" />
                        </div>
                    ))}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <h3 className="font-semibold text-muted-foreground">Abilities</h3>
                            <p className="text-lg">{pokemon.abilities.join(', ')}</p>
                        </div>
                        <div>
                            <h3 className="font-semibold text-muted-foreground">Appearance</h3>
                            <p>{pokemon.appearance}</p>
                        </div>
                        <div>
                            <h3 className="font-semibold text-muted-foreground">Diet</h3>
                            <p>{pokemon.diet}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
          </div>
          
          <Card className="flex flex-col lg:col-span-2">
              <CardHeader>
                <CardTitle>3D Model</CardTitle>
                <CardDescription>Drag to rotate the model</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 items-center justify-center">
                <Pokemon3DViewer />
              </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}

export async function generateStaticParams() {
  return allPokemon.map(pokemon => ({
    name: pokemon.name.toLowerCase(),
  }));
}
