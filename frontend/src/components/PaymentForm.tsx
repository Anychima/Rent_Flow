import { useState, useEffect } from 'react';

interface Lease {
  id: string;
  property: {
    title: string;
    address: string;
  };
  tenant: {
    full_name: string;
  };
  monthly_rent_usdc: number;
}

interface Payment {
  id?: string;
  lease_id: string;
  tenant_id: string;
  amount_usdc: number;
  due_date: string;
  status: string;
  notes?: string;
}

interface PaymentFormProps {
  payment?: Payment | null;
  onClose: () => void;
  onSubmit: (payment: Partial<Payment>) => Promise<void>;
}

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

export default function PaymentForm({ payment, onClose, onSubmit }: PaymentFormProps) {
  const [loading, setLoading] = useState(false);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loadingLeases, setLoadingLeases] = useState(true);
  const [formData, setFormData] = useState<Partial<Payment>>({
    lease_id: '',
    tenant_id: '',
    amount_usdc: 0,
    due_date: new Date().toISOString().split('T')[0],
    status: 'pending',
    notes: '',
  });

  useEffect(() => {
    fetchLeases();
    if (payment) {
      setFormData(payment);
    }
  }, [payment]);

  const fetchLeases = async () => {
    try {
      setLoadingLeases(true);
      const response = await fetch(`${API_URL}/api/leases`);
      const result = await response.json();
      
      if (result.success) {
        // Filter only active leases
        const activeLeases = (result.data || []).filter((l: any) => l.status === 'active');
        setLeases(activeLeases);
      }
    } catch (error) {
      console.error('Error fetching leases:', error);
    } finally {
      setLoadingLeases(false);
    }
  };

  const handleLeaseChange = (leaseId: string) => {
    const lease = leases.find(l => l.id === leaseId);
    if (lease) {
      setFormData(prev => ({
        ...prev,
        lease_id: leaseId,
        tenant_id: (lease as any).tenant_id,
        amount_usdc: lease.monthly_rent_usdc,
      }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate amount
    if (!formData.amount_usdc || formData.amount_usdc <= 0) {
      alert('Please enter a valid payment amount greater than $0');
      return;
    }

    if (!formData.lease_id) {
      alert('Please select a lease');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error submitting payment:', error);
      alert('Failed to submit payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingLeases) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading leases...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {payment ? 'Edit Payment' : 'Record New Payment'}
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
          {/* Lease Selection */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lease *
                </label>
                <select
                  name="lease_id"
                  required
                  disabled={!!payment}
                  value={formData.lease_id}
                  onChange={(e) => handleLeaseChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="">Select a lease</option>
                  {leases.map(lease => (
                    <option key={lease.id} value={lease.id}>
                      {lease.property?.title} - {lease.tenant?.full_name} (${lease.monthly_rent_usdc}/mo)
                    </option>
                  ))}
                </select>
                {leases.length === 0 && (
                  <p className="mt-1 text-xs text-red-600">No active leases available</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (USDC) *
                  </label>
                  <input
                    type="number"
                    name="amount_usdc"
                    required
                    min="0.01"
                    step="0.01"
                    value={formData.amount_usdc}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">Minimum amount: $0.01 USDC</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    name="due_date"
                    required
                    value={formData.due_date}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent capitalize"
                >
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="late">Late</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add any notes about this payment..."
                />
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          {formData.lease_id && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Payment Summary</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p>• Property: {leases.find(l => l.id === formData.lease_id)?.property?.title}</p>
                <p>• Tenant: {leases.find(l => l.id === formData.lease_id)?.tenant?.full_name}</p>
                <p>• Amount: ${formData.amount_usdc} USDC</p>
                <p>• Due Date: {formData.due_date}</p>
                <p>• Status: <span className="capitalize font-medium">{formData.status}</span></p>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <span className="text-yellow-600 text-xl">💡</span>
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Payment Processing</p>
                <p>Circle API integration for USDC transfers is ready. Payments will be recorded in the system and can be processed on Solana Devnet.</p>
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
              disabled={loading || leases.length === 0}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : (
                payment ? 'Update Payment' : 'Record Payment'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
