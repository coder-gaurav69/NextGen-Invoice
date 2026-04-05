import React, { useState } from 'react';
import { uppercase, formatNumber, calculateAndFormatTotal } from '../utils/formatters';

/**
 * Medicine Form Component
 * Handles live formatting and calculation
 */
export default function MedicineForm() {
  const [formData, setFormData] = useState({
    itemName: '',
    batchNo: '',
    expiry: '',
    rate: '',
    quantity: '',
  });

  const [displayData, setDisplayData] = useState({
    itemName: '',
    batchNo: '',
    expiry: '',
    rate: '',
    quantity: '',
    total: '0',
  });

  /**
   * Handle text input (name, batch, expiry)
    * Apply uppercase only for display
   */
  const handleTextChange = (e) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    setDisplayData(prev => ({
      ...prev,
      [name]: uppercase(value),
    }));
  };

  /**
   * Handle number input (rate, quantity)
   * Apply formatting only for display
   */
  const handleNumberChange = (e) => {
    const { name, value } = e.target;

    // Store raw value for calculation
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Format for display
    setDisplayData(prev => ({
      ...prev,
      [name]: formatNumber(value),
    }));

    // Recalculate total if rate or quantity changed
    if (name === 'rate' || name === 'quantity') {
      const rate = name === 'rate' ? value : formData.rate;
      const quantity = name === 'quantity' ? value : formData.quantity;
      const total = calculateAndFormatTotal(rate, quantity);

      setDisplayData(prev => ({
        ...prev,
        total: total,
      }));
    }
  };

  /**
   * Handle form submission
   * Send raw formData to server (unformatted)
   */
  const handleSubmit = (e) => {
    e.preventDefault();

    const payload = {
      item_name: uppercase(formData.itemName),
      batch_no: uppercase(formData.batchNo),
      exp: uppercase(formData.expiry),
      rate: parseFloat(formData.rate) || 0,
      quantity: parseFloat(formData.quantity) || 0,
      amount: calculateAndFormatTotal(formData.rate, formData.quantity),
    };

    console.log('Form Data to send:', payload);
    // Send to server/API
    // api.addMedicine(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="medicine-form">
      <h2>Add Medicine</h2>

      {/* Item Name */}
      <div className="form-group">
        <label>Item Name</label>
        <input
          type="text"
          name="itemName"
          value={displayData.itemName}
          onChange={handleTextChange}
          placeholder="e.g., paracetamol tablet"
        />
      </div>

      {/* Batch No */}
      <div className="form-group">
        <label>Batch No</label>
        <input
          type="text"
          name="batchNo"
          value={displayData.batchNo}
          onChange={handleTextChange}
          placeholder="e.g., batch 001"
        />
      </div>

      {/* Expiry */}
      <div className="form-group">
        <label>Expiry</label>
        <input
          type="text"
          name="expiry"
          value={displayData.expiry}
          onChange={handleTextChange}
          placeholder="e.g., may-25"
        />
      </div>

      {/* Rate */}
      <div className="form-group">
        <label>Rate</label>
        <input
          type="number"
          name="rate"
          value={formData.rate}
          onChange={handleNumberChange}
          step="0.01"
          placeholder="e.g., 52.50"
        />
        <span className="display-value">Display: {displayData.rate}</span>
      </div>

      {/* Quantity */}
      <div className="form-group">
        <label>Quantity</label>
        <input
          type="number"
          name="quantity"
          value={formData.quantity}
          onChange={handleNumberChange}
          step="1"
          placeholder="e.g., 9"
        />
        <span className="display-value">Display: {displayData.quantity}</span>
      </div>

      {/* Total (Read-Only) */}
      <div className="form-group">
        <label>Total Amount</label>
        <input
          type="text"
          value={displayData.total}
          readOnly
          className="total-field"
        />
      </div>

      <button type="submit">Add Medicine</button>
    </form>
  );
}
