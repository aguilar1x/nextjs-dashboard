import { createServerClient } from '@/src/lib/supabase';

export default async function Notes() {
  const supabase = createServerClient();
  const { data: revenue, error } = await supabase.from("revenue").select();
  if (error) {
    return <div>Error loading notes</div>;
  }
  return <pre>{JSON.stringify(revenue, null, 2)}</pre>
}