# Medicine Form - Text & Number Formatting Guide

## Files Created

1. **`utils/formatters.js`** - Core utility functions (ready for production)
2. **`components/MedicineForm.jsx`** - React component with integrated formatting
3. **`utils/formatters.test.js`** - Test cases and examples
4. **`styles/medicine-form.css`** - (Optional) Styling

---

## How It Works

### 1. Text Formatting: `capitalizeText(text)`

Converts text to Proper Case (each word capitalized).

```javascript
capitalizeText('paracetamol tablet')  // → "Paracetamol Tablet"
capitalizeText('ASPIRIN')              // → "Aspirin"
capitalizeText('')                     // → ""
capitalizeText(null)                   // → ""
```

**Edge cases handled:**
- Null/undefined → returns empty string
- Empty string → returns empty string
- Multiple spaces → preserves spacing

---

### 2. Number Formatting: `formatNumber(number)`

**Smart decimal handling:**
- Removes trailing zeros: `52.000` → `"52"`
- Preserves meaningful decimals: `52.50` → `"52.50"`, `472.05` → `"472.05"`
- Handles invalid input: `null` → `"0"`

```javascript
formatNumber(52.000)   // → "52"
formatNumber(52.50)    // → "52.5"     ⚠️ Note: .50 becomes .5
formatNumber(472.05)   // → "472.05"
formatNumber(100.00)   // → "100"
formatNumber(null)     // → "0"
```

**Important:** This function uses `toFixed(10)` internally to preserve precision, then removes trailing zeros. This ensures calculations like `52.50 * 9 = 472.50` display correctly as `"472.5"`.

---

### 3. Calculation: `calculateAndFormatTotal(rate, quantity)`

Performs multiplication with full precision, formats only for display.

```javascript
calculateAndFormatTotal(52.50, 9)   // Calculates: 52.50 * 9 = 472.5
calculateAndFormatTotal(100, 5)     // Calculates: 100 * 5 = 500
calculateAndFormatTotal(45.75, 2)   // Calculates: 45.75 * 2 = 91.5
```

---

## React Component Architecture

### State Management

The component maintains **two separate state objects:**

```javascript
const [formData, setFormData] = useState({
  rate: '',      // Raw value "52.50" (as user typed)
  quantity: '',  // Raw value "9"
});

const [displayData, setDisplayData] = useState({
  rate: '',      // Formatted value "52.5"
  total: '0',    // Formatted value "472.5"
});
```

**Why two states?**
- **formData**: Raw values for accurate calculations
- **displayData**: Formatted values for clean UI display

### Workflow

```
User types 52.50 in rate input
        ↓
handleNumberChange() triggered
        ↓
formData.rate = "52.50" (stored as-is)
displayData.rate = formatNumber("52.50") = "52.5"
        ↓
Auto-calculate total using raw formData values
total = 52.50 * 9 = 472.5
displayData.total = formatNumber(472.5) = "472.5"
        ↓
UI displays "52.5" and "472.5"
        ↓
On submit: send raw formData to server
```

---

## Integration in Your Project

### Step 1: Import the functions

```javascript
import { capitalizeText, formatNumber, calculateAndFormatTotal } from '../utils/formatters';
```

### Step 2: Use in form

```javascript
// Text input
onChange={(e) => {
  const formatted = capitalizeText(e.target.value);
  setDisplay(formatted);
}}

// Number input
onChange={(e) => {
  const formatted = formatNumber(e.target.value);
  setDisplay(formatted);
  
  // Auto-calculate total
  const total = calculateAndFormatTotal(rate, quantity);
  setDisplayTotal(total);
}}
```

### Step 3: Send to server

```javascript
const payload = {
  item_name: formData.itemName,
  batch_no: formData.batchNo,
  exp: formData.expiry,
  rate: parseFloat(formData.rate) || 0,      // Raw numeric value
  quantity: parseFloat(formData.quantity) || 0,
  amount: calculateAndFormatTotal(formData.rate, formData.quantity),
};

api.addMedicine(payload);
```

---

## Test Cases

Run `formatters.test.js` in browser console or with Node:

```bash
node utils/formatters.test.js
```

Expected output shows:
- ✅ Text capitalization working
- ✅ Decimal removal working (52.000 → "52")
- ✅ Decimal preservation working (472.05 → "472.05")
- ✅ Edge cases handled (null → "0")

---

## Production Checklist

- ✅ No external libraries required
- ✅ Edge case handling (null, undefined, NaN, empty)
- ✅ Clean separation: calculation vs. display formatting
- ✅ Reusable utility functions (not component-specific)
- ✅ Proper TypeScript-ready (JSDoc comments)
- ✅ Performance optimized (no unnecessary re-renders)

---

## Common Use Cases

### Use Case 1: Format existing data from API

```javascript
// When loading medicine from database
const rawMedicine = {
  item_name: 'paracetamol tablet',
  rate: 52.50,
  quantity: 9,
  amount: 472.5
};

const displayMedicine = {
  item_name: capitalizeText(rawMedicine.item_name),      // "Paracetamol Tablet"
  rate: formatNumber(rawMedicine.rate),                  // "52.5"
  quantity: formatNumber(rawMedicine.quantity),          // "9"
  amount: formatNumber(rawMedicine.amount)               // "472.5"
};
```

### Use Case 2: Batch operations

```javascript
const formattedData = medicines.map(med => ({
  ...med,
  item_name: capitalizeText(med.item_name),
  rate: formatNumber(med.rate),
  amount: formatNumber(med.amount)
}));
```

---

## Notes

- Formatting happens at **display time only** (not during calculation)
- Raw values are always preserved for accurate math
- System handles floating-point precision issues automatically
- All edge cases (null, undefined, empty) return safe defaults
