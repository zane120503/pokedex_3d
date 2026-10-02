const ARTWORK_BASE_URL =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork';
const MODEL_BASE_URL =
  'https://raw.githubusercontent.com/Sudhanshu-Ambastha/Pokemon-3D/main/models/glb/regular';

export function getArtworkUrl(id: number): string {
  return `${ARTWORK_BASE_URL}/${id}.png`;
}

export function getModelUrl(id: number): string {
  return `${MODEL_BASE_URL}/${id}.glb`;
}

const CRY_BASE_URL = 'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon';

export type CryVersion = 'latest' | 'legacy';

export function getCryUrl(id: number, version: CryVersion = 'latest'): string {
  return `${CRY_BASE_URL}/${version}/${id}.ogg`;
}
