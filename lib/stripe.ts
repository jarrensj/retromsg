import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder");

// Credit packages: price in cents, credits awarded
export const CREDIT_PACKAGES = {
  starter: {
    credits: 10,
    amount: 500, // $5
    name: "Starter Pack",
    description: "10 credits for retroAI generations",
  },
  popular: {
    credits: 25,
    amount: 1000, // $10
    name: "Popular Pack",
    description: "25 credits for retroAI generations",
  },
  pro: {
    credits: 60,
    amount: 2000, // $20
    name: "Pro Pack",
    description: "60 credits for retroAI generations",
  },
} as const;

export type PackageId = keyof typeof CREDIT_PACKAGES;

// Cache for price IDs (created on first use)
const priceCache: Record<string, string> = {};

// Get or create a Stripe price for a package
export async function getOrCreatePrice(packageId: PackageId): Promise<string> {
  // Return cached price if available
  if (priceCache[packageId]) {
    return priceCache[packageId];
  }

  const pkg = CREDIT_PACKAGES[packageId];
  const productName = `retroAI ${pkg.name}`;

  // Search for existing product
  const existingProducts = await stripe.products.search({
    query: `name:"${productName}"`,
  });

  let productId: string;

  if (existingProducts.data.length > 0) {
    productId = existingProducts.data[0].id;
  } else {
    // Create new product
    const product = await stripe.products.create({
      name: productName,
      description: pkg.description,
      metadata: {
        packageId,
        credits: pkg.credits.toString(),
      },
    });
    productId = product.id;
  }

  // Search for existing price
  const existingPrices = await stripe.prices.list({
    product: productId,
    active: true,
  });

  const matchingPrice = existingPrices.data.find(
    (p) => p.unit_amount === pkg.amount && p.currency === "usd"
  );

  if (matchingPrice) {
    priceCache[packageId] = matchingPrice.id;
    return matchingPrice.id;
  }

  // Create new price
  const price = await stripe.prices.create({
    product: productId,
    unit_amount: pkg.amount,
    currency: "usd",
    metadata: {
      packageId,
      credits: pkg.credits.toString(),
    },
  });

  priceCache[packageId] = price.id;
  return price.id;
}

// Credit costs per generation type
export const CREDIT_COSTS = {
  image: 1,
  video: 7,
} as const;
