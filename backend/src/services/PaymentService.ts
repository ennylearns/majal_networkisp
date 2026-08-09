export interface PaymentService {
  initialize(amount: number, email: string, reference: string): Promise<{ checkoutUrl: string; accessCode: string }>;
  verifyWebhook(payload: any, signature: string): boolean;
  verifyTransaction(reference: string): Promise<{ status: string; amount: number }>;
}

export type FakePaymentCondition = 'valid' | 'tampered' | 'failed';

export class FakePaymentService implements PaymentService {
  private condition: FakePaymentCondition = 'valid';

  setCondition(condition: FakePaymentCondition) {
    this.condition = condition;
  }

  async initialize(amount: number, email: string, reference: string): Promise<{ checkoutUrl: string; accessCode: string }> {
    return {
      checkoutUrl: `https://fake-payment-gateway.com/checkout/${reference}`,
      accessCode: `fake_access_code_${reference}`
    };
  }

  verifyWebhook(payload: any, signature: string): boolean {
    if (this.condition === 'tampered') {
      return false;
    }
    return true;
  }

  async verifyTransaction(reference: string): Promise<{ status: string; amount: number }> {
    if (this.condition === 'failed') {
      return { status: 'failed', amount: 0 };
    }
    return { status: 'success', amount: 1000 };
  }
}
