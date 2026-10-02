// Copies the bundled Pokémon data into MongoDB. Safe to run repeatedly.
// Usage: npm run db:seed   (reads MONGODB_URI from .env.local or .env)
import { config } from 'dotenv';
import { MongoClient } from 'mongodb';
import { allPokemon } from '../src/lib/data';

config({ path: ['.env.local', '.env'] });

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Add it to .env.local first.');
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const collection = client.db(process.env.MONGODB_DB ?? 'pokedex').collection('pokemon');

    await collection.createIndex({ id: 1 }, { unique: true });
    await collection.createIndex({ name: 1 }, { unique: true });

    const result = await collection.bulkWrite(
      allPokemon.map(pokemon => ({
        replaceOne: { filter: { id: pokemon.id }, replacement: pokemon, upsert: true },
      }))
    );

    console.log(
      `Seeded ${allPokemon.length} Pokémon (${result.upsertedCount} inserted, ${result.modifiedCount} updated).`
    );
  } finally {
    await client.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
