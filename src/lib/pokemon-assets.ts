const ARTWORK_BASE_URL =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork';
const MODEL_BASE_URL =
  'https://raw.githubusercontent.com/Sudhanshu-Ambastha/Pokemon-3D/main/models/glb/regular';

export function getArtworkUrl(id: number): string {
  return `${ARTWORK_BASE_URL}/${id}.png`;
}

// Fully animated models (idle, walk, run, attack, happy, sleep) for the original 151 Pokémon.
// Pinned to a commit so files can't move or change underneath the app.
const ANIMATED_MODEL_BASE_URL =
  'https://raw.githubusercontent.com/06wj/pokemon/00d96f7f18894055e7f1db44fa0df6462e5e4c8a/public/models';
const ANIMATED_MODEL_MAX_ID = 151;

export function getModelUrl(id: number): string {
  if (id <= ANIMATED_MODEL_MAX_ID) {
    return `${ANIMATED_MODEL_BASE_URL}/${String(id).padStart(3, '0')}/model.glb`;
  }
  return `${MODEL_BASE_URL}/${id}.glb`;
}

const ITEM_SPRITE_BASE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items';

// Small pixel sprite of an item, by PokeAPI slug (e.g. "water-stone").
export function getItemSpriteUrl(slug: string): string {
  return `${ITEM_SPRITE_BASE_URL}/${slug}.png`;
}

const CRY_BASE_URL = 'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon';

export type CryVersion = 'latest' | 'legacy';

export function getCryUrl(id: number, version: CryVersion = 'latest'): string {
  return `${CRY_BASE_URL}/${version}/${id}.ogg`;
}
