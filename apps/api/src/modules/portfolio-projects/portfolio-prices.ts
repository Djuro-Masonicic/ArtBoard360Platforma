// Shared server pricing. Historical purchases keep their stored amountCents.
export const portfolioPrices = { guestExportCents: 490, extraExportCents: 490, currency: "EUR" } as const;
export const premiumMonthlyAmounts = [890, ...Array.from({ length: 21 }, (_, i) => (i + 10) * 100)];
