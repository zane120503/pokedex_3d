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

export type EvolutionTrigger = "level" | "item" | "trade" | "friendship";

export type Evolution = {
  id: number;
  name: string;
  // How the previous stage evolves into this one, e.g. "Level 16" or "Water Stone".
  method?: string;
  trigger?: EvolutionTrigger;
  // PokeAPI item slug (e.g. "water-stone"), used to show the item's sprite.
  item?: string;
}

export type Pokemon = {
  id: number;
  name: string;
  types: PokemonType[];
  stats: PokemonStat[];
  description: string;
  abilities: string[];
  appearance: string;
  diet: string;
  evolutions?: Evolution[];
  previousEvolution?: Evolution;
};
