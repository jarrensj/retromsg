import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { addCredits } from "@/lib/supabase";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  console.log("Webhook received");

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    console.error("Missing stripe-signature header");
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    console.log("Webhook event type:", event.type);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const clerkId = session.metadata?.clerkId;
    const credits = parseInt(session.metadata?.credits || "0", 10);

    console.log("Checkout completed - clerkId:", clerkId, "credits:", credits);

    if (clerkId && credits > 0) {
      try {
        await addCredits(clerkId, credits);
        console.log(`Successfully added ${credits} credits to user ${clerkId}`);
      } catch (error) {
        console.error("Failed to add credits:", error);
        return NextResponse.json(
          { error: "Failed to add credits" },
          { status: 500 }
        );
      }
    } else {
      console.error("Missing clerkId or credits in metadata");
    }
  }

  return NextResponse.json({ received: true });
}
