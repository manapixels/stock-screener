import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TelegramSignupRequest {
  telegram_user_id: number;
  telegram_chat_id: string;
  first_name: string;
  last_name?: string;
  username?: string;
  email?: string;
}

interface SignupResponse {
  success: boolean;
  user_id?: string;
  message: string;
  error?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const signupData: TelegramSignupRequest = await req.json();

    console.log(
      `📝 Telegram signup request for user ${signupData.telegram_user_id}`,
    );

    // Validate required fields
    if (
      !signupData.telegram_user_id ||
      !signupData.telegram_chat_id ||
      !signupData.first_name
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          message:
            "Missing required fields: telegram_user_id, telegram_chat_id, first_name",
          error: "MISSING_FIELDS",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("id, telegram_user_id")
      .eq("telegram_user_id", signupData.telegram_user_id.toString())
      .single();

    if (existingUser) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Account already exists with this Telegram ID",
          error: "USER_EXISTS",
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Generate email if not provided
    const email =
      signupData.email ||
      `telegram_${signupData.telegram_user_id}@placeholder.local`;

    // Generate secure random password (user will never see this)
    const password = generateSecurePassword();

    // Create display name
    const displayName = `${signupData.first_name}${signupData.last_name ? " " + signupData.last_name : ""}`;

    console.log(`Creating account for ${displayName} with email: ${email}`);

    // Create Supabase Auth user
    const { data: authUser, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Skip email confirmation for Telegram users
        user_metadata: {
          telegram_user_id: signupData.telegram_user_id,
          telegram_chat_id: signupData.telegram_chat_id,
          signup_method: "telegram",
          display_name: displayName,
          first_name: signupData.first_name,
          last_name: signupData.last_name,
          username: signupData.username,
        },
      });

    if (authError) {
      console.error("❌ Supabase Auth error:", authError);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Failed to create authentication account",
          error: "AUTH_ERROR",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!authUser.user) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Failed to create user account",
          error: "USER_CREATION_FAILED",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Create or update profile
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: authUser.user.id,
      email: email.includes("@placeholder.local") ? null : email,
      display_name: displayName,
      telegram_user_id: signupData.telegram_user_id.toString(),
      telegram_chat_id: signupData.telegram_chat_id,
      telegram_username: signupData.username,
      telegram_first_name: signupData.first_name,
      telegram_last_name: signupData.last_name,
      signup_method: "telegram",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      console.error("❌ Profile creation error:", profileError);

      // Cleanup: delete the auth user if profile creation failed
      await supabase.auth.admin.deleteUser(authUser.user.id);

      return new Response(
        JSON.stringify({
          success: false,
          message: "Failed to create user profile",
          error: "PROFILE_ERROR",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(
      `✅ Successfully created Telegram account for user ${authUser.user.id}`,
    );

    const response: SignupResponse = {
      success: true,
      user_id: authUser.user.id,
      message:
        "Account created successfully! You can now use all bot features.",
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Telegram signup error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Internal server error during signup",
        error: "INTERNAL_ERROR",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

function generateSecurePassword(): string {
  // Generate a secure random password that users will never see
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < 24; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
