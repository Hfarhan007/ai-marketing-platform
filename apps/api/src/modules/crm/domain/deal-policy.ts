export interface DealLineItem {
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
}
export class DealPolicy {
  assertLineItems(
    items: readonly DealLineItem[],
    declaredValue: number,
    canApproveDiscount = false,
  ) {
    let total = 0;
    for (const item of items) {
      if (item.quantity <= 0 || item.unitPrice < 0) throw new Error('INVALID_DEAL_LINE_ITEM');
      const discount = item.discountPercent ?? 0;
      if (discount < 0 || discount > 100) throw new Error('INVALID_DEAL_DISCOUNT');
      if (discount > 20 && !canApproveDiscount) throw new Error('DEAL_DISCOUNT_APPROVAL_REQUIRED');
      total += item.quantity * item.unitPrice * (1 - discount / 100);
    }
    if (items.length && Math.abs(total - declaredValue) > 0.01)
      throw new Error('DEAL_VALUE_LINE_ITEM_MISMATCH');
    return Math.round(total * 100) / 100;
  }
  probabilityFor(status: DealState, stageProbability: number) {
    if (status === 'won') return 100;
    if (status === 'lost') return 0;
    return Math.max(0, Math.min(99, stageProbability));
  }
  forecast(probability: number): 'pipeline' | 'best_case' | 'commit' | 'closed' {
    if (probability === 100) return 'closed';
    if (probability >= 75) return 'commit';
    if (probability >= 40) return 'best_case';
    return 'pipeline';
  }
}
type DealState = 'open' | 'won' | 'lost';
