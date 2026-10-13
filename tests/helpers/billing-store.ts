// Test fixture only; production uses PostgreSQL.
import type { BillingStore, BillingAccount } from "../../services/ai/billing";
export class MemoryBillingStore implements BillingStore {
  accounts = new Map<string, BillingAccount>();
  events = new Set<string>();
  private locks = new Map<string, Promise<void>>();
  async userForCustomer(id: string) {
    return [...this.accounts.values()].find((a) => a.customer === id)?.user;
  }
  async withAccount<T>(
    id: string,
    fn: Parameters<BillingStore["withAccount"]>[1],
  ): Promise<T> {
    const before = this.locks.get(id) || Promise.resolve();
    let release!: () => void;
    const next = new Promise<void>((r) => (release = r));
    this.locks.set(
      id,
      before.then(() => next),
    );
    await before;
    const account = this.accounts.get(id) || {
      user: id,
      customer: null,
      subscription: null,
      paidUntil: null,
      checkoutKey: null,
      checkoutExpires: null,
      checkoutSession: null,
    };
    this.accounts.set(id, account);
    try {
      return (await fn({
        account,
        save: async (change) => {
          Object.assign(account, change);
        },
        seen: async (event) => this.events.has(event),
        apply: async (event, subscription, paidUntil) => {
          if (this.events.has(event)) return;
          Object.assign(account, { subscription, paidUntil });
          this.events.add(event);
        },
      })) as T;
    } finally {
      release();
    }
  }
}
