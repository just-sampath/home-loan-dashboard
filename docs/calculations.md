# Loan Calculation Audit

## Sources Checked

- Revalidated on 2026-07-02 against the official HDFC app amortization schedule.
- HDFC Bank Home Loan EMI Calculator: defines EMI as principal plus interest on the outstanding home loan amount, gives the standard EMI formula, defines the monthly rate as annual rate / 12 / 100, and describes amortization as a table of repayment, principal, and interest components. Source: https://www.hdfc.com/home-loan-emi-calculator
- HDFC Bank Home Loan FAQ: confirms EMI is principal plus interest, and documents assisted digital part prepayments after EMI commencement plus full/partial prepayments through the Home Loan Branch. Source: https://www.hdfc.com/checklist/faqs
- HDFC Bank conversion facility: existing customers may reduce either the monthly instalment (EMI) or loan tenure when switching to a lower adjustable rate. Source: https://www.hdfc.com/conversion-fees
- IncorpX HDFC Home Loan EMI Calculator: documents that HDFC Bank calculates interest on the daily reducing balance, meaning each EMI payment immediately reduces the principal for the next day's interest calculation. Source: https://www.incorpx.io/tools/hdfc-home-loan-emi-calculator
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

### 3. Pre-EMI interest

When a loan is disbursed before the EMI commencement date, HDFC charges pre-EMI interest for the intervening period. This is interest-only and does not reduce the principal. The app accepts an optional `preEmiInterest` field in `LoanConfig` and includes it in `ScheduleSummary.totalInterest` and `totalOutflow` without affecting the amortization schedule rows.

For the configured loan: INR 14,301 was paid in August 2024 (the month before EMIs commenced in September 2024).

### 4. Part payments and simple interest

Part payments reduce outstanding principal. Under this app's selected strategy, EMI remains unchanged and tenure shrinks. If a part payment exceeds the outstanding balance after EMI, it is capped at that balance.

The app models HDFC's daily-reducing-balance prepayment behavior. Since the EMI is paid on the 1st of the month and the part payment is made mid-month, the part payment reduces the closing balance for that month (effective for the next month's interest), not the current month's EMI interest. HDFC charges simple interest on the prepaid amount for the days between the EMI date and the prepayment date:

```text
SI = prepaymentAmount * (annualRate / 100) * max(0, day - 2) / daysInYear
```

where `day` is the day of the month the prepayment was made, `daysInYear` is 365 or 366 (leap year), and the `max(0, day - 2)` term counts the accrual days from day 2 (the day after the EMI) to the day before the prepayment. A prepayment on the 1st (EMI date) has zero simple interest.

This formula was reverse-engineered and validated against all six real prepayments on the HDFC app:

| Date       | Prepayment | Day | Computed SI | HDFC SI |
| ---------- | ---------- | --- | ----------- | ------- |
| 2026-01-08 | 2,00,000   | 8   | 244.93      | 245     |
| 2026-02-17 | 2,00,000   | 17  | 612.33      | 612     |
| 2026-03-18 | 2,00,000   | 18  | 653.15      | 653     |
| 2026-04-18 | 1,50,000   | 18  | 489.86      | 490     |
| 2026-05-20 | 1,50,000   | 20  | 551.10      | 551     |
| 2026-06-19 | 2,00,000   | 19  | 693.97      | 694     |

Total simple interest: INR 3,245.

Effective-date rule used in this app:

- A prepayment in a month is recorded in that month's schedule row and reduces the closing balance.
- The EMI interest for that month is computed on the full opening balance (the EMI on the 1st is paid before the mid-month prepayment).
- The reduced closing balance becomes the next month's opening balance, so the prepayment first reduces the interest charged in the following month.
- Multiple prepayments in the same month are preserved individually so each one's simple interest is computed from its own date.

### 5. Monthly interest and EMI split

Each month:

1. Normalize and apply any rate change for the month.
2. Compute interest on the full opening balance: `openingBalance * monthlyRate`.
3. Compute scheduled principal as `baseEMI - interest`.
4. If the EMI is enough to close the loan, final EMI is `remainingPrincipal + interest`, which may be lower than the regular EMI.
5. Subtract scheduled principal from the opening balance to get the balance after EMI.
6. Apply all prepayments for the month (capped at the balance after EMI) and add their simple interest.
7. The closing balance is the balance after EMI minus prepayments.

### 6. Rounding

The engine keeps internal calculations in decimal rupees and rounds only for display and test assertions. This avoids cumulative drift. Rows expose raw values plus stable display formatting in the UI.

## Expected Engine Behavior

- Clean 15-year schedule: 180 rows, EMI INR 29,895, total interest INR 23,81,090.
- Rate drop: monthly interest decreases from the effective month while EMI remains the original INR 29,895 and total tenure shrinks.
- Single prepayment: prepayment is shown in the effective month, simple interest is charged, EMI interest for that month is on the full opening balance, and the prepayment reduces the closing balance (effective for the next month's interest).
- Full default scenario (validated against the HDFC app on 2026-07-02):
  - 90 rows, 90 months saved, total prepayment INR 11,00,000, total simple interest INR 3,245, pre-EMI interest INR 14,301.
  - Total interest INR 8,03,863, interest saved INR 15,91,527, outstanding as of 2026-07-01 INR 16,51,369.
  - Total outflow INR 38,03,863, final EMI INR 25,667, 67 months remaining.
  - Rate impact months saved: [4, 5, 7, 3]. Part-payment impact months saved: [16, 14, 13, 9, 8, 11].
- Final partial EMI: final row can be smaller than the base EMI when remaining principal plus interest is less than EMI.
