
import Stripe from 'stripe';
import { neon } from '@netlify/neon';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

const getSql = () => {
  const url = process.env.NETLIFY_DATABASE_URL;
  if (!url) return null;
  return neon(url);
};

export const handler = async (event: any) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!stripe || !WEBHOOK_SECRET) {
    console.error('Stripe not configured');
    return { statusCode: 500, body: 'Stripe not configured' };
  }

  const sig = event.headers['stripe-signature'];
  if (!sig) {
    return { statusCode: 400, body: 'Missing stripe-signature header' };
  }

  let stripeEvent: Stripe.Event;

  try {
    // Verify webhook signature
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  const sql = getSql();
  if (!sql) {
    console.error('Database not configured');
    return { statusCode: 500, body: 'Database not configured' };
  }

  // Handle the event
  try {
    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (userId && subscriptionId) {
          // Activate premium for this user
          await sql`
            INSERT INTO hypeakz_quotas (user_id, used_generations, is_premium, stripe_customer_id, stripe_subscription_id, created_at)
            VALUES (${userId}, 0, TRUE, ${customerId}, ${subscriptionId}, ${Date.now()})
            ON CONFLICT (user_id) DO UPDATE SET
              is_premium = TRUE,
              stripe_customer_id = ${customerId},
              stripe_subscription_id = ${subscriptionId}
          `;
          console.log(`Premium activated for user ${userId}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = stripeEvent.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        const isActive = ['active', 'trialing'].includes(subscription.status);

        if (userId) {
          await sql`
            UPDATE hypeakz_quotas
            SET is_premium = ${isActive}
            WHERE user_id = ${userId}
          `;
          console.log(`Subscription ${isActive ? 'activated' : 'deactivated'} for user ${userId}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = stripeEvent.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (userId) {
          await sql`
            UPDATE hypeakz_quotas
            SET is_premium = FALSE, stripe_subscription_id = NULL
            WHERE user_id = ${userId}
          `;
          console.log(`Subscription cancelled for user ${userId}`);
        } else {
          // Fallback: find by subscription ID
          await sql`
            UPDATE hypeakz_quotas
            SET is_premium = FALSE, stripe_subscription_id = NULL
            WHERE stripe_subscription_id = ${subscription.id}
          `;
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = stripeEvent.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          // Optionally deactivate premium on payment failure
          // Or just log and let Stripe handle retries
          console.log(`Payment failed for subscription ${subscriptionId}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`);
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };

  } catch (error: any) {
    console.error('Webhook handler error:', error);
    return { statusCode: 500, body: `Webhook handler error: ${error.message}` };
  }
};
