export type PokemonType =
  | "Normal"
  | "Fire"
  | "Water"
  | "Grass"
  | "Electric"
  | "Ice"
  | "Fighting"
  | "Poison"
  | "Ground"
  | "Flying"
  | "Psychic"
  | "Bug"
  | "Rock"
  | "Ghost"
  | "Dragon"
  | "Dark"
  | "Steel"
  | "Fairy";

export type PokemonStat = {
  name: "HP" | "Attack" | "Defense" | "Sp. Atk" | "Sp. Def" | "Speed";
  value: number;
};

export type Pokemon = {
  id: number;
  name: string;
  types: PokemonType[];
  stats: PokemonStat[];
  description: string;
  abilities: string[];
  appearance: string;
  diet: string;
  image2d: string;
};
