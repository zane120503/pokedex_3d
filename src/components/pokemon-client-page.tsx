"use client";

import { useState, useMemo } from 'react';
import type { Pokemon, PokemonType } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { PokemonCard } from '@/components/pokemon-card';
import { Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ALL_POKEMON_TYPES } from '@/lib/data';

export function PokemonClientPage({ pokemonList }: { pokemonList: Pokemon[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<PokemonType | 'all'>('all');

  const filteredPokemon = useMemo(() => {
    return pokemonList.filter(pokemon => {
      const nameMatch = pokemon.name.toLowerCase().includes(searchTerm.toLowerCase());
      const typeMatch = selectedType === 'all' || pokemon.types.includes(selectedType);
      return nameMatch && typeMatch;
    });
  }, [pokemonList, searchTerm, selectedType]);

  return (
    <div className="container py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Search Pokémon by name"
            placeholder="Search Pokémon..."
            className="pl-10 text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={selectedType} onValueChange={(value) => setSelectedType(value as PokemonType | 'all')}>
          <SelectTrigger className="w-full sm:w-[200px]" aria-label="Filter by type">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {ALL_POKEMON_TYPES.map(type => (
              <SelectItem key={type} value={type} className="capitalize">
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {filteredPokemon.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filteredPokemon.map((pokemon) => (
            <PokemonCard key={pokemon.id} pokemon={pokemon} />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <h2 className="text-2xl font-bold">No Pokémon Found</h2>
          <p className="text-muted-foreground">Try adjusting your search or filters.</p>
        </div>
      )}
    </div>
  );
}
