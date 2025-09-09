export async function GET() {
  const response = await fetch('https://pokeapi.co/api/v2/pokemon');
  const data = await response.json();
  return Response.json(data);
}