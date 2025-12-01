import { Header } from '@/components/header';
import { PokemonClientPage } from '@/components/pokemon-client-page';
import { allPokemon } from '@/lib/data';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <PokemonClientPage pokemonList={allPokemon} />
      </main>
    </div>
  );
}
