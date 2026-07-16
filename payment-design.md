# Payment Flow Design — TeleBirr Screenshot Parsing

## Current State

### TeleBirr Confirmation Screenshot Fields
From the actual screenshot, the following fields are visible:

| Field | Amharic Label | Example Value | Currently Parsed? |
|-------|--------------|---------------|-------------------|
| Status | ተሳክቷል | ተሳክቷል (Success) | ❌ No |
| Amount | — | -550.00 ብር | ⚠️ Partial (misses negative sign, Amharic ብር) |
| Transaction Date | የግብይቱ ቀን | 2026/06/27 12:09:55 | ❌ No |
| Transaction Type | የግብይቱ ዓይነት | ወደማህበሩ (To Group) | ❌ No |
| Receiver Name | ለምፅብ ስም | ALAMENSH | ❌ No (only parses From/Sender/Payer) |
| Transaction Reference | የግብይት ማጣቀሻ | DFR9BLCKVT | ⚠️ Partial (English patterns only) |

### Current OCR Extraction (`_extract_text_from_image`)
```
Extracts:
  - transaction_id: English patterns only (TXN, Ref, Reference)
  - amount: English patterns only (Amount, Total, ETB)
  - sender_name: English patterns only (From, Sender, Payer)

Missing:
  - transaction_date
  - receiver_name
  - transaction_type
  - status (success/failure)
  - Amharic field labels
```

### Current Admin Notification
```
💵 *New Deposit Request*

👤 {firstName} (@{username})
💰 TeleBirr Name: {telebirrName}
💵 Amount: {amount} ETB
🔖 TXN: {transactionId}
👤 Sender: {senderName}
🆔 {deposit_id}
🕐 {timestamp}
```

---

## Updated Design

### 1. Firestore Deposit Document Schema

```python
deposit_data = {
    # User info
    'userId': str(uid),
    'username': str,
    'firstName': str,

    # User-provided
    'telebirrName': str,           # Name user entered manually
    'amount': float,               # Amount user entered (cross-check with OCR)

    # OCR-parsed from screenshot
    'ocr': {
        'status': str,             # 'success' | 'failed' | 'unknown'
        'amount': float,           # Parsed amount (may be negative)
        'transactionDate': str,    # '2026/06/27 12:09:55'
        'transactionType': str,    # 'ወደማህበሩ' | 'ወደ ሰው' etc.
        'receiverName': str,       # 'ALAMENSH'
        'transactionRef': str,     # 'DFR9BLCKVT'
        'rawText': str,            # Full OCR text for debugging
        'confidence': float,       # 0.0-1.0, how confident we are in parsing
    },

    # Dedup
    'imageHash': str,
    'imageFileId': str,

    # Status
    'status': 'pending',           # 'pending' | 'approved' | 'rejected'
    'createdAt': datetime,
    'processedAt': datetime | None,
    'adminNote': str,
}
```

### 2. Updated OCR Extraction Rules

The OCR must parse both **English** and **Amharic** labels:

#### Transaction Reference
```
English: Transaction ID, TXN, Ref, Reference, Transaction Ref
Amharic: የግብይት ማጣቀሻ
Pattern: 8-12 alphanumeric chars (e.g., DFR9BLCKVT)
```

#### Amount
```
English: Amount, Total, ETB, Birr
Amharic: ብር, መጠን
Pattern: [\d,]+\.?\d* (handle negative signs)
Note: TeleBirr shows negative for outgoing (-550.00)
```

#### Transaction Date
```
English: Date, Time, Transaction Date
Amharic: የግብይቱ ቀን
Pattern: \d{4}/\d{2}/\d{2}\s+\d{2}:\d{2}:\d{2}
```

#### Receiver Name
```
English: Receiver, To, Beneficiary
Amharic: ለምፅብ ስም, ለ接收方
Pattern: [A-Za-z\s]{2,} (uppercase names)
```

#### Transaction Type
```
English: Type, Transaction Type
Amharic: የግብይቱ ዓይነት
Pattern: ወደማህበሩ | ወደ ሰው | ወደ ቤተሰብ etc.
```

#### Status
```
English: Success, Completed, Failed
Amharic: ተሳክቷል (success), አልተሳካም (failed)
Pattern: First line of receipt
```

### 3. Updated Admin Notification

```
💵 *New Deposit Request*

👤 *User:* {firstName} (@{username})
📱 *TeleBirr Name:* {telebirrName}

━━━ *Screenshot Parsed* ━━━
✅ *Status:* {ocr.status}
💵 *Amount:* {ocr.amount} ETB
📅 *Date:* {ocr.transactionDate}
🔖 *Reference:* {ocr.transactionRef}
👤 *Receiver:* {ocr.receiverName}
📋 *Type:* {ocr.transactionType}

🆔 {deposit_id}
🕐 {timestamp}
```

### 4. Updated User Confirmation

```
✅ Deposit request submitted!

💵 Amount: {amount} ETB
👤 Receiver: {receiver_name}
🔖 Reference: {txn_id}
📅 Date: {transaction_date}
✅ Status: {status}

ID: `{deposit_id}`
```

### 5. Validation Rules

| Check | Rule | Action |
|-------|------|--------|
| Status | Must be 'success' / 'ተሳክቷل' | Reject if failed |
| Amount | OCR amount must match user-entered amount (±1 ETB) | Warn admin of mismatch |
| Reference | Must be 8+ alphanumeric, unique | Reject duplicates |
| Date | Must be within last 24 hours | Warn if older |
| Receiver | Should match expected TeleBirr number name | Warn if different |

### 6. Implementation Steps

1. **Update `_extract_text_from_image()`** — Add Amharic patterns, extract all 6 fields
2. **Update `handle_screenshot()`** — Store all OCR fields in `ocr` sub-object
3. **Update `_notify_admin_deposit()`** — Show all parsed fields to admin
4. **Update `process_deposit()`** — No changes needed (already works)
5. **Add validation** — Cross-check amount, status, date freshness

### 7. Edge Cases

- **OCR fails completely**: Store raw text, set `confidence: 0`, admin reviews manually
- **Partial parse**: Store what was found, set `confidence: 0.5`, admin reviews
- **Amount mismatch**: User says 500, OCR says 550 → flag for admin
- **Duplicate reference**: Already handled (reject)
- **Old screenshot**: Date > 24h → warn but allow
- **Non-TeleBirr screenshot**: Different app → OCR returns garbage, admin reviews
