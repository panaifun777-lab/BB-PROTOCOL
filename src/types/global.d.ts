// ── CSS Module declarations for side-effect imports ──
declare module '*.css' {
  const content: string;
  export default content;
}

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// ── Extend global Window for Web3 ──
interface Window {
  ethereum?: import('viem').EIP1193Provider;
}

// ── Fix Stripe types for common missing properties ──
import 'stripe';

declare module 'stripe' {
  namespace Stripe {
    interface Subscription {
      current_period_start: number;
      current_period_end: number;
    }
    interface Invoice {
      customer_metadata: Record<string, string> | null;
      tax: number | null;
    }
    namespace SubscriptionItem {
      interface Resource {
        createUsageRecord: (...args: unknown[]) => unknown;
      }
    }
  }
}
