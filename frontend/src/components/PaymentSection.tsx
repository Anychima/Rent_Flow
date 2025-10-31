import { CheckCircle, DollarSign, Loader, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'https://rent-flow.onrender.com';

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
  walletConnected: boolean;
  walletAddress?: string;
  walletId?: string;
  walletType: 'phantom' | 'circle';
  onPaymentComplete?: () => void;
}

export default function PaymentSection({
  leaseId,
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
      console.log('💰 [PaymentSection] Fetching payments for lease:', leaseId);
      
      const response = await axios.get(`${API_URL}/api/payments/lease/${leaseId}`);
      
      console.log('📊 [PaymentSection] Payments API response:', response.data);
      
      if (response.data.success) {
        // Log all payments before filtering
        console.log('💳 [PaymentSection] All payments:', response.data.data);
        
        // Filter for pending initial payments only
        const initialPayments = response.data.data.filter(
          (p: Payment) => {
            const isPending = p.status === 'pending';
            const isInitialType = p.payment_type === 'security_deposit' || p.payment_type === 'rent';
            const isFailed = p.status === 'failed';
            console.log(`   Payment ${p.id}:`, {
              type: p.payment_type,
              status: p.status,
              amount: p.amount_usdc,
              isPending,
              isFailed,
              isInitialType,
              willShow: (isPending || isFailed) && isInitialType
            });
            return (isPending || isFailed) && isInitialType; // Show both pending AND failed payments
          }
        );
        
        console.log('💵 [PaymentSection] Filtered pending payments:', initialPayments);
        setPayments(initialPayments);
        
        if (initialPayments.length === 0) {
          console.log('🤔 [PaymentSection] No pending payments found. Checking if all complete...');
          const allPayments = response.data.data;
          const hasSecurityDeposit = allPayments.some((p: Payment) => p.payment_type === 'security_deposit');
          const hasRent = allPayments.some((p: Payment) => p.payment_type === 'rent');
          console.log('   Has security deposit payment:', hasSecurityDeposit);
          console.log('   Has rent payment:', hasRent);
          console.log('   Total payments:', allPayments.length);
        }
      }
    } catch (err) {
      console.error('❌ [PaymentSection] Error fetching payments:', err);
      setError('Failed to load payment information. Please refresh the page.');
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
        walletType,
        walletId
      });

      // Step 1: Get lease details to find manager's wallet address
      console.log('🔍 [Payment] Fetching lease details...');
      const leaseResponse = await axios.get(`${API_URL}/api/leases/${leaseId}`);
      
      if (!leaseResponse.data.success) {
        throw new Error('Failed to fetch lease details');
      }

      const lease = leaseResponse.data.data;
      const managerWalletAddress = lease.manager_wallet_address;

      if (!managerWalletAddress) {
        throw new Error('Manager wallet address not found. Manager must sign the lease first.');
      }

      console.log('💰 [Payment] Manager wallet address:', managerWalletAddress);
      console.log('💳 [Payment] Tenant wallet ID:', walletId);

      // Step 2: Send payment via Arc Testnet
      console.log('💸 [Payment] Sending payment via Arc Testnet...');
      const response = await axios.post(
        `${API_URL}/api/arc/payment/send`,
        {
          fromWalletId: walletId,  // Tenant's Circle wallet ID (UUID)
          toAddress: managerWalletAddress,  // Manager's EVM address (0x...)
          amount: confirmPayment.amount_usdc,
          feeLevel: 'MEDIUM',
          paymentId: confirmPayment.id,
          leaseId: leaseId
        }
      );

      if (response.data.success) {
        console.log('✅ [Payment] Payment completed successfully');
        const txHash = response.data.data.transactionHash;
        const explorerUrl = response.data.data.explorerUrl;
        
        // Show success message
        alert(
          `Payment completed successfully!\n\n` +
          `Type: ${confirmPayment.payment_type === 'security_deposit' ? 'Security Deposit' : 'First Month Rent'}\n` +
          `Amount: $${confirmPayment.amount_usdc.toFixed(2)} USDC\n` +
          (txHash ? `Transaction: ${txHash.substring(0, 20)}...\n` : '') +
          (explorerUrl ? `View on Arc Explorer: ${explorerUrl}` : '')
        );
        
        // Refresh payments list
        await fetchPayments();
        
        // Check if all payments are complete by fetching updated lease
        const updatedLeaseResponse = await axios.get(`${API_URL}/api/leases/${leaseId}`);
        if (updatedLeaseResponse.data.success) {
          const updatedLease = updatedLeaseResponse.data.data;
          
          if (updatedLease.lease_status === 'active') {
            console.log('🎉 [Payment] Lease activated! Notifying parent component...');
            
            // Show activation message
            alert(
              '🎉 Lease Activated!\n\n' +
              'All payments have been completed successfully.\n' +
              'Your lease is now active and you have been promoted to tenant status.\n\n' +
              'You will be redirected to the tenant dashboard shortly.'
            );
            
            // All payments complete! Notify parent to trigger role refresh
            if (onPaymentComplete) {
              onPaymentComplete();
            }
          }
        }
      } else {
        throw new Error(response.data.error || 'Payment failed');
      }
    } catch (err: any) {
      console.error('❌ [Payment] Error:', err);
      setError(
        err.response?.data?.error || 
        err.message || 
        'Payment failed. Please try again. If your wallet was debited, please contact support.'
      );
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
        <p className="ml-3 text-gray-600">Loading payment information...</p>
      </div>
    );
  }

  // Show error if there's an error
  if (error && payments.length === 0) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-8 h-8 text-red-600" />
          <div>
            <h3 className="text-lg font-semibold text-red-800">Error Loading Payments</h3>
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={fetchPayments}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Only show "All Payments Complete" if we actually have no pending payments
  // AND we're not in an error state
  if (payments.length === 0 && !loading && !error) {
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
            Arc Wallet (Circle)
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
            
            {securityDeposit.status === 'pending' || securityDeposit.status === 'failed' ? (
              <>
                {securityDeposit.status === 'failed' && (
                  <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-red-800">Previous Payment Failed</p>
                        <p className="text-xs text-red-700 mt-1">
                          {securityDeposit.notes || 'Transaction failed. Please try again.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => handlePayment(securityDeposit)}
                  disabled={!walletConnected || processing === securityDeposit.id}
                  className={`w-full px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                    securityDeposit.status === 'failed'
                      ? 'bg-orange-600 hover:bg-orange-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {processing === securityDeposit.id ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-4 h-4" />
                      {securityDeposit.status === 'failed' ? 'Retry Payment' : 'Pay Security Deposit'}
                    </>
                  )}
                </button>
              </>
            ) : securityDeposit.status === 'completed' ? (
              <div className="flex items-center gap-2 text-green-600 font-medium">
                <CheckCircle className="w-5 h-5" />
                Paid
              </div>
            ) : null}
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
            
            {firstMonthRent.status === 'pending' || firstMonthRent.status === 'failed' ? (
              <>
                {firstMonthRent.status === 'failed' && (
                  <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-red-800">Previous Payment Failed</p>
                        <p className="text-xs text-red-700 mt-1">
                          {firstMonthRent.notes || 'Transaction failed. Please try again.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => handlePayment(firstMonthRent)}
                  disabled={!walletConnected || processing === firstMonthRent.id}
                  className={`w-full px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                    firstMonthRent.status === 'failed'
                      ? 'bg-orange-600 hover:bg-orange-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {processing === firstMonthRent.id ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-4 h-4" />
                      {firstMonthRent.status === 'failed' ? 'Retry Payment' : 'Pay First Month Rent'}
                    </>
                  )}
                </button>
              </>
            ) : firstMonthRent.status === 'completed' ? (
              <div className="flex items-center gap-2 text-green-600 font-medium">
                <CheckCircle className="w-5 h-5" />
                Paid
              </div>
            ) : null}
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
            ⚠️ Please connect your wallet above to enable payment buttons.
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
                  <strong>Arc Testnet:</strong> This will transfer real USDC on Arc Testnet from your wallet to the property manager.
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
