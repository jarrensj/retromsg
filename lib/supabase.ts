import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Get or create a user by their Clerk ID
export async function getOrCreateUser(clerkId: string, email?: string) {
  const { data: existingUser } = await supabaseAdmin
    .from("users")
    .select("id, clerk_id, email")
    .eq("clerk_id", clerkId)
    .single();

  if (existingUser) {
    return existingUser;
  }

  const { data: newUser, error } = await supabaseAdmin
    .from("users")
    .insert({ clerk_id: clerkId, email })
    .select("id, clerk_id, email")
    .single();

  if (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }

  return newUser;
}
