# Loan Calculation Audit

## Sources Checked

- Revalidated on 2026-05-05.
- HDFC Bank Home Loan EMI Calculator: defines EMI as principal plus interest on the outstanding home loan amount, gives the standard EMI formula, defines the monthly rate as annual rate / 12 / 100, and describes amortization as a table of repayment, principal, and interest components. Source: https://www.hdfc.com/home-loan-emi-calculator
- HDFC Bank Home Loan FAQ: confirms EMI is principal plus interest, and documents assisted digital part prepayments after EMI commencement plus full/partial prepayments through the Home Loan Branch. Source: https://www.hdfc.com/checklist/faqs
- HDFC Bank conversion facility: existing customers may reduce either the monthly instalment (EMI) or loan tenure when switching to a lower adjustable rate. Source: https://www.hdfc.com/conversion-fees
- RBI circular RBI/2023-24/55, updated October 1, 2025: for EMI-based floating-rate loans, lenders must communicate the impact of benchmark changes on EMI and/or tenor, offer borrower options around EMI/tenor changes, and allow part/full prepayment subject to extant instructions. Source: https://rbi.org.in/scripts/NotificationUser.aspx?Id=12529
- RBI circular RBI/2013-14/582: banks cannot charge foreclosure/pre-payment penalties on floating-rate term loans sanctioned to individual borrowers. Source: https://www.rbi.org.in/Scripts/BS_CircularIndexDisplay.aspx?Id=8868
- RBI FAQ on that circular: explicitly lists "enhancement in EMI or elongation of number of EMIs, keeping the EMI unchanged or a combination" and part/full prepayment during residual tenor. Source: https://www.rbi.org.in/commonman/Upload/English/FAQs/PDFs/FAQRFIR10012025.pdf

## Validated Rules

### 1. Reducing-balance EMI

The app uses the standard reducing-balance EMI formula:

```text
EMI = P * R * (1 + R)^N / ((1 + R)^N - 1)
R = annualRatePercent / 12 / 100
```

where `P` is principal, `R` is the monthly rate, and `N` is the original tenure in months.

For the configured loan:

- Principal: INR 30,00,000
- Annual rate: 8.70%
- Tenure: 180 months
- EMI: INR 29,894.9427, displayed as INR 29,895
- Total interest with no events: INR 23,81,089.6911, displayed as INR 23,81,090

### 2. Floating rate revisions

The model is "keep EMI constant and reduce/extend tenure". HDFC and RBI sources establish that floating-rate resets can affect EMI and/or tenor; HDFC's conversion facility specifically supports choosing tenure reduction instead of EMI reduction. This app therefore models the explicit Settings strategy "Reduce tenure (keep EMI)" rather than claiming it is the only possible lender behavior.

Effective-date rule used in this app:

- A rate change dated on the 1st of a month applies to that month.
- A rate change dated after the 1st applies from the 1st day of the next month.
- Multiple rate changes normalizing to the same month are resolved by date order; the latest change for that month wins.

### 3. Part payments

Part payments reduce outstanding principal immediately. Under this app's selected strategy, EMI remains unchanged and tenure shrinks. If a part payment exceeds the outstanding principal, it is capped at the outstanding principal.

The public HDFC/RBI sources confirm that prepayment is allowed and affects the loan principal/outstanding, but they do not publish an intra-month ledger ordering rule for a same-month EMI and prepayment in the public pages checked. The app therefore follows the product requirement for this tracker: prepayment effective in a month reduces principal before that month's interest is computed.

Effective-date rule used in this app:

- A prepayment in a month is applied before that month's interest and EMI calculation.
- This includes a prepayment on the EMI date, per the product requirement.
- Multiple prepayments in the same month are summed before the month is calculated.

### 4. Monthly interest and EMI split

Each month:

1. Normalize and apply any rate change for the month.
2. Apply all prepayments effective for the month to opening balance.
3. Compute interest as `openingBalanceAfterPrepayment * monthlyRate`.
4. Compute scheduled principal as `baseEMI - interest`.
5. If scheduled principal is enough to close the loan, final EMI is `remainingPrincipal + interest`, which may be lower than the regular EMI.
6. Otherwise subtract scheduled principal from balance.

### 5. Rounding

The engine keeps internal calculations in decimal rupees and rounds only for display and test assertions. This avoids cumulative drift. Rows expose raw values plus stable display formatting in the UI.

## Prototype `data.js` Audit Notes

Audited file: `data.js`.

- Lines 31-34: EMI formula is correct for a positive monthly rate but has no zero-rate guard. The TypeScript engine handles zero-rate loans.
- Lines 36-42: month indexing ignores day-of-month. This breaks the required mid-month rule for rate changes; the TypeScript engine normalizes rate changes after the 1st to the next month.
- Lines 47-48: events are mapped only to month indices. This loses intra-month ordering and allows no explicit "prepayment before interest" behavior.
- Lines 60 and 81: `.find()` means only one rate change and one prepayment can apply in a month. The TypeScript engine supports multiple same-month events.
- Lines 63-77: interest is computed before prepayment. This violates the requirement that prepayments in the EMI month reduce principal before interest for that month.
- Lines 79-86: part payment after EMI understates same-month prepayment impact and overstates interest for the payment month.
- Line 56: `maxIter = 360` is a silent cap. The TypeScript engine derives a bounded safety limit from the original tenure and throws if the loan cannot amortize.
- Lines 143-169: marginal event impact is a useful additive attribution model. The TypeScript port keeps the idea but computes it from the corrected schedule rules.

## Expected Engine Behavior

- Clean 15-year schedule: 180 rows, EMI INR 29,895, total interest INR 23,81,090.
- Rate drop: monthly interest decreases from the effective month while EMI remains the original INR 29,895 and total tenure shrinks.
- Single prepayment: prepayment is shown in the effective month, interest is computed on the reduced balance, EMI remains unchanged unless it closes the loan.
- Full default scenario: 109 rows, 71 months saved, total prepayment INR 7,50,000, total interest INR 9,96,021, interest saved INR 13,85,069, outstanding as of 2026-05-05 INR 20,32,203, total outflow INR 39,96,021, final EMI INR 17,367.
- Final partial EMI: final row can be smaller than the base EMI when remaining principal plus interest is less than EMI.
