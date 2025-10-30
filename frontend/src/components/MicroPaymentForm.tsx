import { useState } from 'react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'https://rent-flow.onrender.com';

interface MicroPaymentFormProps {
  fromUserId: string;
  toUserId: string;
  onClose: () => void;
  onPaymentSuccess: () => void;
}

export default function MicroPaymentForm({ fromUserId, toUserId, onClose, onPaymentSuccess }: MicroPaymentFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    purpose: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(formData.amount);
    
    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount greater than $0');
      return;
    }

    if (amount > 10) {
      alert('Micropayment amount cannot exceed $10 USDC');
      return;
    }

    if (!formData.purpose.trim()) {
      alert('Please provide a purpose for this payment');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/api/micropayments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromUserId,
          toUserId,
          amountUsdc: amount,
          purpose: formData.purpose.trim()
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert('✅ Micropayment sent successfully!');
        onPaymentSuccess();
        onClose();
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error sending micropayment:', error);
      alert('❌ Failed to send micropayment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            Send Micropayment
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (USDC) *
              </label>
              <input
                type="number"
                name="amount"
                required
                min="0.01"
                max="10"
                step="0.01"
                value={formData.amount}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter amount (max $10)"
              />
              <p className="mt-1 text-xs text-gray-500">Micropayments are limited to $10 or less</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Purpose *
              </label>
              <textarea
                name="purpose"
                required
                value={formData.purpose}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="What is this payment for?"
              />
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <span className="text-blue-600 text-xl">💡</span>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Arc Blockchain Integration</p>
                <p>This micropayment will be processed on the Arc blockchain with USDC as native gas, enabling gasless transactions for small amounts.</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.amount || !formData.purpose}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </span>
              ) : (
                'Send Payment'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}