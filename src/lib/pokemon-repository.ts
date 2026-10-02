import { cache } from 'react';
import { allPokemon as localPokemon, getPokemonSlug } from './data';
import { getDb, isMongoConfigured } from './mongodb';
import type { Pokemon } from './types';

export const POKEMON_COLLECTION = 'pokemon';

// Reads Pokémon from MongoDB when MONGODB_URI is set, otherwise from the bundled data.
export const getAllPokemon = cache(async (): Promise<Pokemon[]> => {
  if (!isMongoConfigured()) {
    return localPokemon;
  }
  try {
    const db = await getDb();
    const pokemon = await db
      .collection<Pokemon>(POKEMON_COLLECTION)
      .find({}, { projection: { _id: 0 } })
      .sort({ id: 1 })
      .toArray();
    if (pokemon.length === 0) {
      console.warn('MongoDB "pokemon" collection is empty; run `npm run db:seed`. Using bundled data.');
      return localPokemon;
    }
    return pokemon;
  } catch (error) {
    console.error('Could not read Pokémon from MongoDB; using bundled data.', error);
    return localPokemon;
  }
});

// Looks a Pokémon up by its page slug, e.g. "nidoran-f" or "mr-mime".
export async function getPokemonBySlug(slug: string): Promise<Pokemon | undefined> {
  const pokemon = await getAllPokemon();
  return pokemon.find(p => getPokemonSlug(p.name) === decodeURIComponent(slug).toLowerCase());
}
