import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";

serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  // Get the notification data from the request body (if triggered by a webhook or manually)
  const notification = await req.json();

  // Alternatively, listen for inserts on the notifications table
  supabaseClient
    .from("notifications")
    .on("INSERT", async (payload) => {
      const newNotification = payload.new;

      // Fetch the recipient's push token from the users table
      const { data: userData, error } = await supabaseClient
        .from("users")
        .select("push_token")
        .eq("id", newNotification.user_id)
        .single();

      if (error || !userData?.push_token) {
        console.error("Error fetching push token or no token found:", error);
        return;
      }

      const pushToken = userData.push_token;

      // Send push notification via Expo's push API
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("EXPO_ACCESS_TOKEN")}`,
        },
        body: JSON.stringify({
          to: pushToken,
          sound: "default",
          title: newNotification.title,
          body: newNotification.body,
          data: newNotification.data || {},
        }),
      });

      const result = await response.json();
      console.log("Push notification sent:", result);
    })
    .subscribe();

  return new Response(JSON.stringify({ message: "Push notification function initialized" }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
