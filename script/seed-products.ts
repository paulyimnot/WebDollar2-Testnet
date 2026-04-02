import { getUncachableStripeClient } from "../server/stripeClient";

async function seedProducts() {
  const stripe = await getUncachableStripeClient();

  const packages = [
    {
      name: "Starter Pack - 10,000 WEBD",
      description: "Get started with 10,000 WebDollar 2 tokens. Perfect for trying out mining and transfers.",
      amount: 999,
      metadata: { webd_amount: "10000", tier: "starter" },
    },
    {
      name: "Growth Pack - 50,000 WEBD",
      description: "50,000 WebDollar 2 tokens with 25% bonus. Great for active miners and stakers.",
      amount: 3999,
      metadata: { webd_amount: "50000", tier: "growth" },
    },
    {
      name: "Pro Pack - 200,000 WEBD",
      description: "200,000 WebDollar 2 tokens with 50% bonus. Maximize your mining rewards.",
      amount: 9999,
      metadata: { webd_amount: "200000", tier: "pro" },
    },
    {
      name: "Whale Pack - 1,000,000 WEBD",
      description: "1,000,000 WebDollar 2 tokens with 100% bonus. The ultimate WEBD package.",
      amount: 29999,
      metadata: { webd_amount: "1000000", tier: "whale" },
    },
  ];

  for (const pkg of packages) {
    const existing = await stripe.products.search({ query: `name:'${pkg.name}'` });
    if (existing.data.length > 0) {
      console.log(`Already exists: ${pkg.name}`);
      continue;
    }

    const product = await stripe.products.create({
      name: pkg.name,
      description: pkg.description,
      metadata: pkg.metadata,
    });

    await stripe.prices.create({
      product: product.id,
      unit_amount: pkg.amount,
      currency: "usd",
    });

    console.log(`Created: ${pkg.name} ($${(pkg.amount / 100).toFixed(2)})`);
  }

  console.log("Done seeding products.");
}

seedProducts().catch(console.error);
