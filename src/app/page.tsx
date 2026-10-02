import { Header } from '@/components/header';
import { PokemonClientPage } from '@/components/pokemon-client-page';
import { getAllPokemon } from '@/lib/pokemon-repository';

// Re-read the Pokémon list from the database at most once a minute.
export const revalidate = 60;

export default async function Home() {
  const allPokemon = await getAllPokemon();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <PokemonClientPage pokemonList={allPokemon} />
      </main>
    </div>
  );
}
