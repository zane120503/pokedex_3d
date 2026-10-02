# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.
# pokedex_3d

## Running locally

```bash
npm install
npm run dev   # http://localhost:9002
```

## MongoDB (optional)

Without a database the app uses the Pokémon data bundled in `src/lib/data.ts`.
To read the data from MongoDB instead:

1. Copy `.env.example` to `.env.local` and set `MONGODB_URI` to your connection string.
2. Load the Pokémon into the database: `npm run db:seed`
3. Start the app: `npm run dev`

Pages re-read the database at most once a minute. If MongoDB can't be reached,
the app logs an error and falls back to the bundled data.
