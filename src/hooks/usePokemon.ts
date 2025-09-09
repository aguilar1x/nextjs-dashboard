'use client';

import { PokemonService } from "@/src/lib/service/pokemon";
import { useState, useEffect } from "react";
import { Pokemon } from "@/src/lib/types/pokemon";

export function usePokemon(id: number) {
    const [pokemon, setPokemon] = useState<Pokemon | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadPokemon () {
            try {
                setLoading(true);
                const data = await PokemonService.getPokemon(id); 
                setPokemon(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        }
        loadPokemon();
    }, [id]);

    return {pokemon, loading, error};
}