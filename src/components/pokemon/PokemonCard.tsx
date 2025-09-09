'use client';

import { usePokemon } from "@/src/hooks/usePokemon";
import { 
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle, 
} from "@/src/components/ui/card";
import { CardSkeleton } from "../ui/skeletons";
import Image from "next/image";

export function PokemonCard({pokemonId}: {pokemonId: number}) {
    const {pokemon, loading, error} = usePokemon(pokemonId)

    if (loading) return <CardSkeleton />
    if (error) return <div>Error: {error}</div>
    if (!pokemon) return <div>No pokemon found</div>

    return (
        <div className="flex flex-col items-center">
            <h1 className="text-2xl font-bold text-center mt-36 text-amber-400" >Pokemon</h1>
            <Card className="w-72 max-w-md mt-8">
                <CardHeader>
                    <CardTitle>{pokemon.id}</CardTitle>
                    <CardDescription>{pokemon.name}</CardDescription>
                    <CardDescription>{`Base Experience: ${pokemon.base_experience}`}</CardDescription>
                    <CardDescription>{`Height: ${pokemon.height}`}</CardDescription>
                    <CardDescription>{`Weight: ${pokemon.weight}`}</CardDescription>
                    <CardDescription>{`Order: ${pokemon.order}`}</CardDescription>
                    <CardDescription>{`Is Default: ${pokemon.is_default}`}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Image src={pokemon.sprites.front_default} alt={pokemon.name} width={100} height={100} />
                </CardContent>
            </Card>
        </div>
    )
}
