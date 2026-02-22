import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Get or create a user by their Clerk ID
export async function getOrCreateUser(clerkId: string, email?: string) {
  const { data: existingUser } = await supabaseAdmin
    .from("users")
    .select("id, clerk_id, email, credits")
    .eq("clerk_id", clerkId)
    .single();

  if (existingUser) {
    return existingUser;
  }

  const { data: newUser, error } = await supabaseAdmin
    .from("users")
    .insert({ clerk_id: clerkId, email, credits: 0 })
    .select("id, clerk_id, email, credits")
    .single();

  if (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }

  return newUser;
}

// Get user credits
export async function getUserCredits(clerkId: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from("users")
    .select("credits")
    .eq("clerk_id", clerkId)
    .single();

  return data?.credits ?? 0;
}

// Add credits to user
export async function addCredits(clerkId: string, amount: number) {
  console.log(`addCredits called: clerkId=${clerkId}, amount=${amount}`);

  const { data: user, error: selectError } = await supabaseAdmin
    .from("users")
    .select("credits")
    .eq("clerk_id", clerkId)
    .single();

  if (selectError || !user) {
    console.error(`User not found for clerkId: ${clerkId}`, selectError);
    throw new Error(`User not found for clerkId: ${clerkId}`);
  }

  const currentCredits = user.credits ?? 0;
  const newCredits = currentCredits + amount;

  const { data: updated, error } = await supabaseAdmin
    .from("users")
    .update({ credits: newCredits })
    .eq("clerk_id", clerkId)
    .select("credits")
    .single();

  if (error || !updated) {
    console.error(`Failed to update credits for clerkId: ${clerkId}`, error);
    throw new Error(`Failed to add credits: ${error?.message || "No rows updated"}`);
  }

  console.log(`Credits updated: ${currentCredits} -> ${updated.credits}`);
  return updated.credits;
}

// Deduct credits from user (returns false if insufficient)
export async function deductCredits(clerkId: string, amount: number): Promise<boolean> {
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("credits")
    .eq("clerk_id", clerkId)
    .single();

  const currentCredits = user?.credits ?? 0;

  if (currentCredits < amount) {
    return false;
  }

  const { error } = await supabaseAdmin
    .from("users")
    .update({ credits: currentCredits - amount })
    .eq("clerk_id", clerkId);

  if (error) {
    throw new Error(`Failed to deduct credits: ${error.message}`);
  }

  return true;
}

// Save a generation record
export async function saveGeneration({
  userId,
  prompt,
  sourceUrl,
  referenceImages,
  resultUrl,
  type = "image",
}: {
  userId: string;
  prompt: string;
  sourceUrl?: string;
  referenceImages?: string[];
  resultUrl: string;
  type?: "image" | "video";
}) {
  const { data, error } = await supabaseAdmin
    .from("generations")
    .insert({
      user_id: userId,
      prompt,
      source_url: sourceUrl,
      reference_images: referenceImages || [],
      result_url: resultUrl,
      type,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save generation: ${error.message}`);
  }

  return data;
}

// Get user's generations
export async function getUserGenerations(userId: string, limit = 50) {
  const { data, error } = await supabaseAdmin
    .from("generations")
    .select("id, prompt, source_url, reference_images, result_url, type, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch generations: ${error.message}`);
  }

  return data;
}

// ============ Admin Functions ============

// Check if an email is an admin
export async function isAdmin(email: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("admins")
    .select("id")
    .eq("email", email.toLowerCase())
    .single();

  return !!data;
}

// Get all admins
export async function getAdmins() {
  const { data, error } = await supabaseAdmin
    .from("admins")
    .select("id, email, created_at, created_by")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch admins: ${error.message}`);
  }

  return data;
}

// Add a new admin
export async function addAdmin(email: string, createdBy: string) {
  const { error } = await supabaseAdmin
    .from("admins")
    .insert({ email: email.toLowerCase(), created_by: createdBy });

  if (error) {
    if (error.code === "23505") {
      throw new Error("This email is already an admin");
    }
    throw new Error(`Failed to add admin: ${error.message}`);
  }
}

// Get all users (for admin panel)
export async function getAllUsers() {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, clerk_id, email, credits, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }

  return data;
}

// Get all generations (for admin panel), optionally filtered by user
export async function getAllGenerations(userId?: string, limit = 100) {
  let query = supabaseAdmin
    .from("generations")
    .select(`
      id,
      prompt,
      source_url,
      reference_images,
      result_url,
      type,
      created_at,
      user_id,
      users (
        email,
        clerk_id
      )
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch generations: ${error.message}`);
  }

  return data;
}

// ============ Audit Log Functions ============

// Log an admin action
export async function logAuditAction({
  action,
  actorEmail,
  targetEmail,
  details,
}: {
  action: string;
  actorEmail: string;
  targetEmail?: string;
  details?: Record<string, unknown>;
}) {
  const { error } = await supabaseAdmin.from("audit_logs").insert({
    action,
    actor_email: actorEmail,
    target_email: targetEmail,
    details,
  });

  if (error) {
    console.error("Failed to log audit action:", error);
  }
}

// Get audit logs
export async function getAuditLogs(limit = 50) {
  const { data, error } = await supabaseAdmin
    .from("audit_logs")
    .select("id, action, actor_email, target_email, details, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch audit logs: ${error.message}`);
  }

  return data;
}
