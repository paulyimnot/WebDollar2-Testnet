import { getStripeSync, getUncachableStripeClient } from './stripeClient.js';
import { storage } from './storage.js';
import { db } from './db.js';
import { sql } from 'drizzle-orm';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    try {
      const event = JSON.parse(payload.toString());

      if (event.type === 'checkout.session.completed') {
        await WebhookHandlers.fulfillPurchase(event.data.object);
      }
    } catch (err: any) {
      console.error('Fulfillment processing error:', err.message);
    }
  }

  static async fulfillPurchase(session: any): Promise<void> {
    const userId = parseInt(session.metadata?.userId);
    if (!userId || isNaN(userId)) {
      console.error('Purchase fulfillment: Missing userId in session metadata');
      return;
    }

    if (session.payment_status !== 'paid') {
      console.log(`Purchase fulfillment: Payment not completed for session ${session.id}`);
      return;
    }

    let webdAmount = 0;

    if (session.metadata?.webd_amount) {
      webdAmount = parseInt(session.metadata.webd_amount);
    }

    if (!webdAmount || webdAmount <= 0) {
      try {
        const stripe = await getUncachableStripeClient();
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
        if (lineItems.data.length > 0) {
          const priceId = lineItems.data[0].price?.id;
          if (priceId) {
            const price = await stripe.prices.retrieve(priceId, { expand: ['product'] });
            const product = price.product as any;
            webdAmount = parseInt(product.metadata?.webd_amount || '0');
          }
        }
      } catch (err: any) {
        console.error('Purchase fulfillment: Failed to retrieve product details:', err.message);
        return;
      }
    }

    if (webdAmount <= 0) {
      console.error('Purchase fulfillment: Invalid WEBD amount from product metadata');
      return;
    }

    const sessionId = session.id;

    try {
      await db.execute(sql`BEGIN`);

      await db.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext(${sessionId}))`
      );

      const dupCheck = await db.execute(
        sql`SELECT id FROM transactions WHERE type = 'purchase' AND sender_address = ${sessionId} LIMIT 1`
      );
      if (dupCheck.rows && dupCheck.rows.length > 0) {
        await db.execute(sql`ROLLBACK`);
        console.log(`Purchase fulfillment: Session ${sessionId} already fulfilled`);
        return;
      }

      const devResult = await db.execute(
        sql`UPDATE users SET balance = (balance::numeric - ${webdAmount})::text 
            WHERE username = 'WebDollarDev' AND balance::numeric >= ${webdAmount}
            RETURNING id, wallet_address, balance`
      );
      if (!devResult.rows || devResult.rows.length === 0) {
        await db.execute(sql`ROLLBACK`);
        console.error('Purchase fulfillment: Dev wallet insufficient balance or not found');
        return;
      }
      const devId = devResult.rows[0].id;

      const buyerResult = await db.execute(
        sql`UPDATE users SET balance = (balance::numeric + ${webdAmount})::text 
            WHERE id = ${userId}
            RETURNING id, wallet_address, balance`
      );
      if (!buyerResult.rows || buyerResult.rows.length === 0) {
        await db.execute(sql`ROLLBACK`);
        console.error(`Purchase fulfillment: Buyer ${userId} not found`);
        return;
      }
      const buyerAddress = buyerResult.rows[0].wallet_address || '';

      await db.execute(
        sql`UPDATE wallet_addresses SET balance = (balance::numeric + ${webdAmount})::text
            WHERE user_id = ${userId} AND is_primary = true`
      );

      await db.execute(
        sql`INSERT INTO transactions (sender_id, receiver_id, sender_address, receiver_address, amount, type)
            VALUES (${devId}, ${userId}, ${sessionId}, ${buyerAddress}, ${webdAmount.toFixed(4)}, 'purchase')`
      );

      await db.execute(sql`COMMIT`);

      console.log(`Purchase fulfilled: ${webdAmount.toLocaleString()} WEBD sent to user ${userId} (session: ${sessionId})`);
    } catch (err: any) {
      await db.execute(sql`ROLLBACK`).catch(() => {});
      console.error('Purchase fulfillment: Transaction failed:', err.message);
    }
  }
}
