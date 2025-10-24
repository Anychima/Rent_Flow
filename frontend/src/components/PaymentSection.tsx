import { CheckCircle, DollarSign, Loader, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

interface Payment {
  id: string;
  lease_id: string;
  tenant_id: string;
  amount_usdc: number;
  payment_type: 'security_deposit' | 'rent';
  due_date: string;
  status: 'pending' | 'completed' | 'failed';
  transaction_hash?: string;
  paid_at?: string;
  notes?: string;
}

interface PaymentSectionProps {
  leaseId: string;
  tenantId: string;
  walletConnected: boolean;
  walletAddress?: string;
  walletId?: string;
  walletType: 'phantom' | 'circle';
  onPaymentComplete?: () => void;
}

export default function PaymentSection({
  leaseId,
  tenantId,
  walletConnected,
  walletAddress,
  walletId,
  walletType,
  onPaymentComplete
}: PaymentSectionProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [confirmPayment, setConfirmPayment] = useState<Payment | null>(null);

  useEffect(() => {
    fetchPayments();
  }, [leaseId]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/leases/${leaseId}/payments`);
      
      if (response.data.success) {
        // Filter for pending initial payments only
        const initialPayments = response.data.data.filter(
          (p: Payment) => p.status === 'pending' && 
          (p.payment_type === 'security_deposit' || p.payment_type === 'rent')
        );
        setPayments(initialPayments);
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
      setError('Failed to load payment information');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (payment: Payment) => {
    if (!walletConnected) {
      setError('Please ensure your wallet is connected');
      return;
    }

    // Show confirmation dialog
    setConfirmPayment(payment);
  };

  const confirmAndProcessPayment = async () => {
    if (!confirmPayment) return;

    try {
      setProcessing(confirmPayment.id);
      setError('');
      setConfirmPayment(null);

      console.log('💳 [Payment] Processing payment:', {
        paymentId: confirmPayment.id,
        type: confirmPayment.payment_type,
        amount: confirmPayment.amount_usdc,
        walletType
      });

      // Mark payment as completed
      // NOTE: In production, this should call Circle/Phantom API for actual USDC transfer
      const response = await axios.post(`${API_URL}/api/payments/${confirmPayment.id}/complete`, {
        tenant_id: tenantId,
        wallet_address: walletAddress,
        wallet_id: walletId,
        wallet_type: walletType,
        transaction_hash: `DEV_SIMULATED_${Date.now()}` // Dev mode simulation
      });

      if (response.data.success) {
        console.log('✅ [Payment] Payment completed successfully');
        
        // Refresh payments list
        await fetchPayments();
        
        // Check if lease was activated
        if (response.data.lease_activated) {
          console.log('🎉 [Payment] Lease activated! Notifying parent component...');
          
          // All payments complete! Notify parent to trigger role refresh
          if (onPaymentComplete) {
            onPaymentComplete();
          }
        }
      }
    } catch (err: any) {
      console.error('❌ [Payment] Error:', err);
      setError(err.response?.data?.error || 'Payment failed. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const totalDue = payments.reduce((sum, p) => sum + p.amount_usdc, 0);
  const securityDeposit = payments.find(p => p.payment_type === 'security_deposit');
  const firstMonthRent = payments.find(p => p.payment_type === 'rent');

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-8 h-8 text-green-600" />
          <div>
            <h3 className="text-lg font-semibold text-green-800">All Payments Complete!</h3>
            <p className="text-sm text-green-700">Your lease has been activated.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-blue-600" />
            Required Payments
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Complete these payments to activate your lease
          </p>
        </div>
        {walletConnected && (
          <div className="bg-green-100 px-3 py-1 rounded-full">
            <p className="text-xs font-medium text-green-800">✓ Wallet Connected</p>
          </div>
        )}
      </div>

      {/* Wallet Info */}
      {walletConnected && (
        <div className="bg-white/60 rounded-lg p-4 border border-blue-200">
          <p className="text-xs font-medium text-gray-600 mb-1">
            {walletType === 'phantom' ? 'Phantom Wallet' : 'Circle Wallet'}
          </p>
          <p className="font-mono text-sm text-gray-900">
            {walletAddress?.substring(0, 12)}...{walletAddress?.substring(walletAddress.length - 8)}
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Payment Items */}
      <div className="space-y-4">
        {/* Security Deposit */}
        {securityDeposit && (
          <div className="bg-white rounded-lg p-5 shadow-sm border-2 border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  🔐 Security Deposit
                </h3>
                <p className="text-xs text-gray-500 mt-1">Refundable at end of lease</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">
                  ${securityDeposit.amount_usdc.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">USDC</p>
              </div>
            </div>
            
            {securityDeposit.status === 'pending' ? (
              <button
                onClick={() => handlePayment(securityDeposit)}
                disabled={!walletConnected || processing === securityDeposit.id}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processing === securityDeposit.id ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <DollarSign className="w-4 h-4" />
                    Pay Security Deposit
                  </>
                )}
              </button>
            ) : (
              <div className="flex items-center gap-2 text-green-600 font-medium">
                <CheckCircle className="w-5 h-5" />
                Paid
              </div>
            )}
          </div>
        )}

        {/* First Month Rent */}
        {firstMonthRent && (
          <div className="bg-white rounded-lg p-5 shadow-sm border-2 border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  🏠 First Month's Rent
                </h3>
                <p className="text-xs text-gray-500 mt-1">Due: {new Date(firstMonthRent.due_date).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">
                  ${firstMonthRent.amount_usdc.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">USDC</p>
              </div>
            </div>
            
            {firstMonthRent.status === 'pending' ? (
              <button
                onClick={() => handlePayment(firstMonthRent)}
                disabled={!walletConnected || processing === firstMonthRent.id}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processing === firstMonthRent.id ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <DollarSign className="w-4 h-4" />
                    Pay First Month Rent
                  </>
                )}
              </button>
            ) : (
              <div className="flex items-center gap-2 text-green-600 font-medium">
                <CheckCircle className="w-5 h-5" />
                Paid
              </div>
            )}
          </div>
        )}
      </div>

      {/* Total */}
      <div className="border-t-2 border-blue-300 pt-4">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold text-gray-700">Total Due:</p>
          <p className="text-3xl font-bold text-blue-600">
            ${totalDue.toFixed(2)} <span className="text-lg text-gray-500">USDC</span>
          </p>
        </div>
      </div>

      {/* Info */}
      {!walletConnected && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            ⚠️ Your wallet is not connected. Please refresh the page and connect your wallet to make payments.
          </p>
        </div>
      )}

      {walletConnected && payments.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            ℹ️ After completing both payments, your lease will be automatically activated and you'll gain access to the tenant dashboard.
          </p>
        </div>
      )}

      {/* Payment Confirmation Modal */}
      {confirmPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  Confirm Payment
                </h3>
                <p className="text-sm text-gray-600">
                  You are about to process a payment
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Type:</span>
                <span className="font-semibold">
                  {confirmPayment.payment_type === 'security_deposit' 
                    ? 'Security Deposit' 
                    : 'First Month Rent'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-bold text-blue-600 text-lg">
                  ${confirmPayment.amount_usdc.toFixed(2)} USDC
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Wallet:</span>
                <span className="font-mono text-sm">
                  {walletAddress?.substring(0, 8)}...{walletAddress?.substring(walletAddress.length - 6)}
                </span>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  <strong>Development Mode:</strong> This will simulate a payment. In production, this would transfer real USDC from your wallet.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmPayment(null)}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmAndProcessPayment}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
