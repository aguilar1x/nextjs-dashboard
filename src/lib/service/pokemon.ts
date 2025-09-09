 export class PokemonService {

  static async getPokemon(id: number) {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch pokemon')
    }
    return response.json();
  }

  static async getPokemonList(limit = 10) {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${limit}`);
    if (!response.ok) {
      throw new Error('Failed to fech pokemon list')
    }
    return response.json();
  }
 }
