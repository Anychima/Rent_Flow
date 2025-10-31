import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import MicroPaymentForm from './MicroPaymentForm';
import MicropaymentHistory from './MicropaymentHistory';
import WalletManagement from './WalletManagement';
import { DashboardStatsSkeleton, TableSkeleton } from './SkeletonLoader';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'https://rent-flow.onrender.com';

interface Property {
  id: string;
  title: string;
  address: string;
  city: string;
  state: string;
  monthly_rent_usdc: number;
}

interface Lease {
  id: string;
  property_id: string;
  tenant_id: string;
  start_date: string;
  end_date: string;
  monthly_rent_usdc: number;
  security_deposit_usdc: number;
  rent_due_day: number;
  status: string;
  lease_status?: string;
  blockchain_lease_id?: number;
  blockchain_transaction_hash?: string;
  tenant_signature?: string;
  landlord_signature?: string;
  tenant_signed_at?: string;
  landlord_signed_at?: string;
  property: Property;
}

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Payment {
  id: string;
  lease_id: string;
  amount_usdc: number;
  payment_type?: string; // Optional since it can be null
  status: string;
  due_date: string;
  paid_at?: string;
  transaction_hash?: string;
  created_at: string;
}

interface DashboardData {
  lease: Lease | null;
  maintenanceRequests: MaintenanceRequest[];
  payments: Payment[];
}

export default function TenantDashboard() {
  const { userProfile, signOut } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'maintenance' | 'payments' | 'micropayments' | 'wallet'>('overview');
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [showMicroPaymentForm, setShowMicroPaymentForm] = useState(false);
  const [verifyingBlockchain, setVerifyingBlockchain] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState({
    title: '',
    description: '',
    category: 'plumbing',
    priority: 'medium'
  });

  useEffect(() => {
    let mounted = true;
    
    const loadDashboard = async () => {
      if (userProfile?.id && mounted) {
        await fetchDashboard();
        checkPendingActivationPayments();
      } else if (!userProfile?.id) {
        // Set a short timeout to retry
        setTimeout(() => {
          if (mounted && userProfile?.id) {
            fetchDashboard();
            checkPendingActivationPayments();
          }
        }, 1000);
      }
    };
    
    loadDashboard();
    
    return () => {
      mounted = false;
    };
  }, [userProfile?.id]);

  // Check if user has pending payments blocking tenant activation
  const checkPendingActivationPayments = async () => {
    if (!userProfile?.id) return;

    try {
      const response = await fetch(`${API_URL}/api/payments/pending?tenant_id=${userProfile.id}`);
      const result = await response.json();

      // Just check for pending payments - no action needed
      if (result.success && result.data && result.data.length > 0) {
        // Silently track pending activation payments
        result.data.some((p: Payment) => 
          (p.payment_type === 'security_deposit' || p.payment_type === 'rent') && 
          p.status === 'pending'
        );
      }
    } catch (error) {
      // Silently fail - this is not critical
    }
  };

  const fetchDashboard = async () => {
    if (!userProfile?.id) {
      console.error('[TenantDashboard] Cannot fetch - no userProfile.id');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/tenant/${userProfile.id}/dashboard`);
      const result = await response.json();

      if (result.success) {
        setDashboardData(result.data);
      } else {
        console.error('[TenantDashboard] API error:', result.error);
        alert(`Failed to load dashboard: ${result.error}`);
      }
    } catch (error) {
      console.error('[TenantDashboard] Fetch error:', error);
      alert('Failed to load dashboard. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitMaintenance = async () => {
    if (!userProfile?.id) {
      alert('User profile not found. Please sign in again.');
      return;
    }

    // Validate required fields
    if (!maintenanceForm.title.trim()) {
      alert('Please enter a title for your request');
      return;
    }

    if (!maintenanceForm.description.trim()) {
      alert('Please provide a detailed description');
      return;
    }

    // Check if tenant has active lease
    if (!dashboardData?.lease) {
      alert('You must have an active lease to submit maintenance requests.\n\nPlease contact your property manager.');
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(
        `${API_URL}/api/tenant/${userProfile.id}/maintenance`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: maintenanceForm.title,
            description: maintenanceForm.description,
            category: maintenanceForm.category,
            priority: maintenanceForm.priority
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        alert('Maintenance request submitted successfully!\n\nYour request has been sent to the property manager.');
        setShowMaintenanceForm(false);
        setMaintenanceForm({ title: '', description: '', category: 'plumbing', priority: 'medium' });
        await fetchDashboard();
      } else {
        alert(`Submission Failed\n\n${result.error || 'Unknown error occurred'}`);
      }
    } catch (error) {
      console.error('[TenantDashboard] Maintenance submission error:', error);
      alert('Network Error\n\nFailed to submit request. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // AI Agent Autonomy - Trigger automated payment processing
  const handleAIAutomatedPayment = async () => {
    if (!userProfile?.id || !dashboardData?.lease) {
      alert('User profile or lease not found. Please refresh the page.');
      return;
    }

    if (!window.confirm('Trigger AI automated payment processing? This will analyze your payment history and process payments automatically if approved by the AI.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/ai/process-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaseId: dashboardData.lease.id,
          amountUsdc: dashboardData.lease.monthly_rent_usdc,
          paymentType: 'rent'
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert(`AI Payment Processing Result:\n${result.message}`);
        await fetchDashboard();
      } else {
        alert(`AI Payment Processing Failed\n\n${result.error || 'Unknown error occurred'}`);
      }
    } catch (error) {
      console.error('[TenantDashboard] AI payment error:', error);
      alert('Network Error\n\nFailed to process AI payment. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Predictive Maintenance - Trigger AI analysis
  const handlePredictiveMaintenance = async () => {
    if (!userProfile?.id || !dashboardData?.lease) {
      alert('User profile or lease not found. Please refresh the page.');
      return;
    }

    if (!window.confirm('Trigger predictive maintenance analysis? This will analyze historical data to predict potential maintenance needs.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/ai/predictive-maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: dashboardData.lease.property_id
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert(`Predictive Maintenance Analysis Complete!

${result.message}

Check your maintenance requests for AI-scheduled tasks.`);
        await fetchDashboard();
      } else {
        alert(`Predictive Maintenance Analysis Failed\n\n${result.error || 'Unknown error occurred'}`);
      }
    } catch (error) {
      console.error('[TenantDashboard] Predictive maintenance error:', error);
      alert('Network Error\n\nFailed to run predictive maintenance analysis. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInitiatePayment = async (paymentId: string) => {
    if (!userProfile?.id) {
      alert('User profile not found. Please sign in again.');
      return;
    }

    // Find the specific payment
    const payment = dashboardData?.payments?.find(p => p.id === paymentId);
    if (!payment) {
      alert('Payment not found');
      return;
    }

    // Confirm payment amount
    const confirmMessage = `Confirm Payment

Amount: ${payment.amount_usdc} USDC
Type: ${payment.payment_type || 'Rent Payment'}
Due: ${new Date(payment.due_date).toLocaleDateString()}

Proceed with payment?`;
  
    if (!window.confirm(confirmMessage)) {
      return;
    }

    const walletAddress = userProfile.wallet_address || prompt('Enter your wallet address to pay from:');
    if (!walletAddress) {
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(
        `${API_URL}/api/tenant/${userProfile.id}/payments/initiate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentId,
            fromAddress: walletAddress
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        const txHash = result.data?.transactionHash || 'Processing...';
        alert(`Payment Initiated Successfully!

Amount: ${payment.amount_usdc} USDC
Transaction: ${txHash}

Your payment is being processed.`);
        await fetchDashboard();
      } else {
        alert(`Payment Failed\n\n${result.error || 'Unknown error occurred'}`);
      }
    } catch (error) {
      console.error('[TenantDashboard] Payment initiation error:', error);
      alert('Network Error\n\nFailed to process payment. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Add a new function to create a payment
  const handleMakePayment = async () => {
    if (!userProfile?.id) {
      alert('User profile not found. Please sign in again.');
      return;
    }

    if (!dashboardData?.lease) {
      alert('No active lease found. Please contact your property manager.');
      return;
    }

    // Prompt for payment amount
    const amountInput = prompt('Enter payment amount in USDC:');
    if (!amountInput) return;
  
    const amount = parseFloat(amountInput);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    // Prompt for payment type
    const paymentTypes = ['rent', 'security_deposit', 'late_fee', 'other'];
    const paymentType = prompt(`Enter payment type (${paymentTypes.join(', ')}):`, 'rent');
    if (!paymentType || !paymentTypes.includes(paymentType)) {
      alert(`Please enter a valid payment type: ${paymentTypes.join(', ')}`);
      return;
    }

    const walletAddress = userProfile.wallet_address || prompt('Enter your wallet address to pay from:');
    if (!walletAddress) {
      return;
    }

    try {
      setLoading(true);
    
      // First create the payment record
      const createResponse = await fetch(`${API_URL}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lease_id: dashboardData.lease.id,
          tenant_id: userProfile.id,
          amount_usdc: amount,
          payment_type: paymentType,
          due_date: new Date().toISOString().split('T')[0],
          status: 'pending'
        }),
      });

      const createResult = await createResponse.json();

      if (!createResult.success) {
        alert(`Payment Creation Failed\n\n${createResult.error || 'Unknown error occurred'}`);
        return;
      }

      const paymentId = createResult.data.id;
      
      // Then initiate the payment transfer
      const initiateResponse = await fetch(
        `${API_URL}/api/tenant/${userProfile.id}/payments/initiate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentId,
            fromAddress: walletAddress
          }),
        }
      );

      const initiateResult = await initiateResponse.json();

      if (initiateResult.success) {
        const txHash = initiateResult.data?.transactionHash || 'Processing...';
        alert(`Payment Initiated Successfully!

Amount: ${amount} USDC
Type: ${paymentType}
Transaction: ${txHash}

Your payment is being processed.`);
        await fetchDashboard();
      } else {
        alert(`Payment Failed\n\n${initiateResult.error || 'Unknown error occurred'}`);
      }
    } catch (error) {
      console.error('[TenantDashboard] Payment creation error:', error);
      alert('Network Error\n\nFailed to process payment. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyBlockchain = async () => {
    if (!dashboardData?.lease?.id) return;

    try {
      setVerifyingBlockchain(true);
      console.log('🔍 [Verify Blockchain] Checking lease on smart contract...', dashboardData.lease.id);

      // Import smart contract service
      const smartContractService = await import('../services/smartContractSigningService');
      
      // Check if lease is on-chain
      const statusResult = await smartContractService.checkLeaseStatus(dashboardData.lease.id);

      if (!statusResult.success) {
        alert('❌ Failed to verify blockchain status: ' + (statusResult.error || 'Unknown error'));
        return;
      }

      if (!statusResult.isFullySigned) {
        alert('⚠️ Lease not found on blockchain. Both parties may need to sign again.');
        return;
      }

      // Lease is on-chain, confirmed!
      console.log('✅ [Verify Blockchain] Lease confirmed on-chain');
      
      // Refresh dashboard to get updated data
      await fetchDashboard();
      
      alert('✅ Lease verified on Arc blockchain!\n\nLease ID: ' + dashboardData.lease.id.substring(0, 8) + '...\n\nIf the transaction hash still doesn\'t appear, please sign the lease again.');
    } catch (error) {
      console.error('❌ [Verify Blockchain] Error:', error);
      alert('Failed to verify blockchain status. Please try again.');
    } finally {
      setVerifyingBlockchain(false);
    }
  };

  if (loading && !dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header Skeleton */}
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="h-10 w-24 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <DashboardStatsSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tenant Portal</h1>
              <p className="text-sm text-gray-600">Welcome, {userProfile?.full_name}</p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={signOut}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Features Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xl">🤖</span>
              <span className="font-medium">AI-Powered Features</span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleAIAutomatedPayment}
                disabled={loading}
                className="px-3 py-1 text-xs bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-colors disabled:opacity-50"
              >
                Auto Payments
              </button>
              <button
                onClick={handlePredictiveMaintenance}
                disabled={loading}
                className="px-3 py-1 text-xs bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-colors disabled:opacity-50"
              >
                Predictive Maintenance
              </button>
              <button
                onClick={() => setShowMicroPaymentForm(true)}
                disabled={loading}
                className="px-3 py-1 text-xs bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-colors disabled:opacity-50"
              >
                Send Micropayment
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Activation Payment Alert */}
      {userProfile?.role === 'prospective_tenant' && dashboardData?.payments && dashboardData.payments.some(p => 
        (p.payment_type === 'security_deposit' || p.payment_type === 'rent') && p.status === 'pending'
      ) && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-yellow-800">
                  💳 Payment Required to Activate Lease
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p className="mb-2">
                    Your lease has been fully signed! To complete your move-in and become a tenant, please complete the following payments:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    {dashboardData.payments
                      .filter(p => (p.payment_type === 'security_deposit' || p.payment_type === 'rent') && p.status === 'pending')
                      .map(payment => (
                        <li key={payment.id}>
                          {payment.payment_type === 'security_deposit' ? '🛡️ Security Deposit' : '🏠 First Month Rent'}: 
                          <strong className="font-semibold"> ${payment.amount_usdc} USDC</strong>
                          <span className="ml-2 text-xs">(Due: {new Date(payment.due_date).toLocaleDateString()})</span>
                        </li>
                      ))
                    }
                  </ul>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => setActiveTab('payments')}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                  >
                    <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Complete Payments Now
                  </button>
                  <span className="ml-3 text-xs text-yellow-600">
                    Once payments are complete, you'll be automatically upgraded to tenant status
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {(['overview', 'maintenance', 'payments', 'micropayments', 'wallet'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Property Info */}
            {dashboardData?.lease ? (
              <div className="lg:col-span-2 space-y-6">
                {/* Property Card */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Your Property</h2>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active Lease
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{dashboardData.lease.property.title}</h3>
                      <p className="text-gray-600">{dashboardData.lease.property.address}</p>
                      <p className="text-gray-600">{dashboardData.lease.property.city}, {dashboardData.lease.property.state}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <p className="text-sm text-gray-500">Monthly Rent</p>
                        <p className="text-lg font-semibold">${dashboardData.lease.monthly_rent_usdc} USDC</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Lease Period</p>
                        <p className="text-lg font-semibold">
                          {new Date(dashboardData.lease.start_date).toLocaleDateString()} - {new Date(dashboardData.lease.end_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lease Agreement Card */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">📜 Lease Agreement</h2>
                    {dashboardData.lease.blockchain_lease_id && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        ⛓️ On-Chain
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    {/* Signing Status */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm text-gray-600">Tenant Signature</p>
                          {dashboardData.lease.tenant_signed_at ? (
                            <span className="text-green-600 text-xl">✅</span>
                          ) : (
                            <span className="text-gray-400 text-xl">⏳</span>
                          )}
                        </div>
                        {dashboardData.lease.tenant_signed_at && (
                          <p className="text-xs text-gray-500">
                            {new Date(dashboardData.lease.tenant_signed_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm text-gray-600">Landlord Signature</p>
                          {dashboardData.lease.landlord_signed_at ? (
                            <span className="text-green-600 text-xl">✅</span>
                          ) : (
                            <span className="text-gray-400 text-xl">⏳</span>
                          )}
                        </div>
                        {dashboardData.lease.landlord_signed_at && (
                          <p className="text-xs text-gray-500">
                            {new Date(dashboardData.lease.landlord_signed_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Blockchain Info */}
                    {dashboardData.lease.blockchain_transaction_hash ? (
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm text-blue-900 font-semibold">⛓️ Lease Stored on Blockchain</p>
                          <span className="text-xs text-blue-600 font-medium">Arc Testnet</span>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Transaction Hash:</p>
                            <div className="flex items-center space-x-2 bg-white rounded px-3 py-2">
                              <a
                                href={`https://testnet.arcscan.app/tx/${dashboardData.lease.blockchain_transaction_hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-xs text-blue-600 hover:text-blue-800 hover:underline break-all flex-1"
                                title="View on Arc Explorer"
                              >
                                {dashboardData.lease.blockchain_transaction_hash}
                              </a>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(dashboardData.lease!.blockchain_transaction_hash!);
                                  alert('✅ Transaction hash copied to clipboard!');
                                }}
                                className="text-gray-500 hover:text-gray-700 p-1 flex-shrink-0"
                                title="Copy transaction hash"
                              >
                                📋
                              </button>
                            </div>
                          </div>
                          {dashboardData.lease.blockchain_lease_id && (
                            <p className="text-xs text-gray-600">
                              On-Chain Lease ID: #{dashboardData.lease.blockchain_lease_id}
                            </p>
                          )}
                          <p className="text-xs text-green-700 mt-2">
                            ✅ Your lease is permanently secured on Arc blockchain
                          </p>
                        </div>
                      </div>
                    ) : dashboardData.lease.tenant_signed_at && dashboardData.lease.landlord_signed_at ? (
                      <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                        <p className="text-sm text-orange-800 font-medium mb-2">
                          ⏳ Processing Blockchain Storage
                        </p>
                        <p className="text-xs text-orange-700">
                          Both parties have signed! Your lease is being submitted to the Arc blockchain. This usually takes a few moments.
                        </p>
                        <div className="flex gap-3 mt-3">
                          <button
                            onClick={() => fetchDashboard()}
                            className="text-xs text-orange-600 hover:text-orange-800 font-medium underline"
                          >
                            🔄 Refresh to check status
                          </button>
                          <span className="text-orange-400">•</span>
                          <button
                            onClick={handleVerifyBlockchain}
                            disabled={verifyingBlockchain}
                            className="text-xs text-orange-600 hover:text-orange-800 font-medium underline disabled:opacity-50"
                          >
                            {verifyingBlockchain ? '⏳ Verifying...' : '🔍 Verify on Blockchain'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                        <p className="text-sm text-yellow-800">
                          📝 <strong>Awaiting Digital Signatures:</strong> Your lease will be stored on Arc blockchain for immutability once both parties complete the digital signing process.
                        </p>
                        <div className="mt-2 text-xs text-yellow-700">
                          {!dashboardData.lease.tenant_signed_at && <p>• Tenant signature pending</p>}
                          {!dashboardData.lease.landlord_signed_at && <p>• Landlord signature pending</p>}
                        </div>
                      </div>
                    )}

                    {/* Lease Details */}
                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Security Deposit</span>
                        <span className="font-semibold">${dashboardData.lease.security_deposit_usdc} USDC</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Rent Due Day</span>
                        <span className="font-semibold">{dashboardData.lease.rent_due_day} of each month</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Lease Status</span>
                        <span className="font-semibold capitalize">{dashboardData.lease.lease_status || dashboardData.lease.status}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Property Information</h2>
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-4">🏠</div>
                  <p className="text-gray-500">No active lease found</p>
                  <p className="text-sm text-gray-400 mt-2">Contact your property manager to get started</p>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="space-y-3">
                  <button
                    onClick={() => setShowMaintenanceForm(true)}
                    disabled={!dashboardData?.lease || loading}
                    className="w-full flex items-center justify-between p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <div className="flex items-center">
                      <span className="text-blue-600 text-xl mr-3">🔧</span>
                      <span>Request Maintenance</span>
                    </div>
                    <span className="text-gray-400">→</span>
                  </button>
                  <button
                    onClick={handleMakePayment}
                    disabled={!dashboardData?.lease || loading}
                    className="w-full flex items-center justify-between p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <div className="flex items-center">
                      <span className="text-green-600 text-xl mr-3">💳</span>
                      <span>Make Payment</span>
                    </div>
                    <span className="text-gray-400">→</span>
                  </button>
                  <button
                    onClick={() => setShowMicroPaymentForm(true)}
                    disabled={loading}
                    className="w-full flex items-center justify-between p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <div className="flex items-center">
                      <span className="text-purple-600 text-xl mr-3">💰</span>
                      <span>Send Micropayment</span>
                    </div>
                    <span className="text-gray-400">→</span>
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Activity</h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <span className="text-blue-600 text-lg mr-2">🔧</span>
                      <span className="text-gray-600">Maintenance Requests</span>
                    </div>
                    <span className="font-semibold">{dashboardData?.maintenanceRequests?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <span className="text-green-600 text-lg mr-2">💳</span>
                      <span className="text-gray-600">Payments Made</span>
                    </div>
                    <span className="font-semibold">{dashboardData?.payments?.filter(p => p.status === 'completed').length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <span className="text-purple-600 text-lg mr-2">💰</span>
                      <span className="text-gray-600">Pending Payments</span>
                    </div>
                    <span className="font-semibold">{dashboardData?.payments?.filter(p => p.status === 'pending').length || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Maintenance Requests</h2>
              <button
                onClick={() => setShowMaintenanceForm(true)}
                disabled={!dashboardData?.lease || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                <span className="mr-2">+</span> New Request
              </button>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="space-y-3">
                      <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse"></div>
                      <div className="flex justify-between">
                        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : dashboardData?.maintenanceRequests && dashboardData.maintenanceRequests.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {dashboardData.maintenanceRequests.map((request) => (
                  <div key={request.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-gray-900">{request.title}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        request.status === 'completed' ? 'bg-green-100 text-green-800' :
                        request.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        request.status === 'approved' ? 'bg-purple-100 text-purple-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {request.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-4">{request.description}</p>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Category: {request.category}</span>
                      <span>Priority: {request.priority}</span>
                    </div>
                    <div className="mt-4 pt-4 border-t text-xs text-gray-400">
                      Submitted: {new Date(request.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <div className="text-gray-400 text-4xl mb-4">🔧</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No maintenance requests</h3>
                <p className="text-gray-500 mb-6">You haven't submitted any maintenance requests yet.</p>
                <button
                  onClick={() => setShowMaintenanceForm(true)}
                  disabled={!dashboardData?.lease || loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Submit Your First Request
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Payment History</h2>
              <button
                onClick={handleMakePayment}
                disabled={!dashboardData?.lease || loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                <span className="mr-2">+</span> Make Payment
              </button>
            </div>

            {loading ? (
              <TableSkeleton rows={5} columns={5} />
            ) : dashboardData?.payments && dashboardData.payments.length > 0 ? (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Transaction Hash
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dashboardData.payments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ${payment.amount_usdc} USDC
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                          {payment.payment_type ? payment.payment_type.replace('_', ' ') : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                            payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {payment.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {payment.transaction_hash ? (
                            <div className="flex items-center space-x-2">
                              <a
                                href={`https://testnet.arcscan.app/tx/${payment.transaction_hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-blue-600 hover:text-blue-800 hover:underline"
                                title={payment.transaction_hash}
                              >
                                {payment.transaction_hash.substring(0, 10)}...{payment.transaction_hash.substring(payment.transaction_hash.length - 8)}
                              </a>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(payment.transaction_hash!);
                                  alert('✅ Transaction hash copied to clipboard!');
                                }}
                                className="text-gray-500 hover:text-gray-700 p-1"
                                title="Copy transaction hash"
                              >
                                📋
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.status === 'pending' && (
                            <button
                              onClick={() => handleInitiatePayment(payment.id)}
                              className="text-blue-600 hover:text-blue-900 font-medium"
                            >
                              Pay Now
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <div className="text-gray-400 text-4xl mb-4">💳</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No payment history</h3>
                <p className="text-gray-500 mb-6">You haven't made any payments yet.</p>
                <button
                  onClick={handleMakePayment}
                  disabled={!dashboardData?.lease || loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Make Your First Payment
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'micropayments' && userProfile?.id && (
          <MicropaymentHistory userId={userProfile.id} />
        )}

        {activeTab === 'wallet' && userProfile && (
          <WalletManagement 
            userId={userProfile.id} 
            userEmail={userProfile.email || ''}
          />
        )}
      </div>

      {/* Maintenance Form Modal */}
      {showMaintenanceForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Submit Maintenance Request</h2>
              <button
                onClick={() => {
                  setShowMaintenanceForm(false);
                  setMaintenanceForm({ title: '', description: '', category: 'plumbing', priority: 'medium' });
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={maintenanceForm.title}
                    onChange={(e) => setMaintenanceForm({...maintenanceForm, title: e.target.value})}
                    placeholder="e.g., Leaky faucet in kitchen"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={maintenanceForm.description}
                    onChange={(e) => setMaintenanceForm({...maintenanceForm, description: e.target.value})}
                    rows={4}
                    placeholder="Provide detailed description of the issue..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      value={maintenanceForm.category}
                      onChange={(e) => setMaintenanceForm({...maintenanceForm, category: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="plumbing">Plumbing</option>
                      <option value="electrical">Electrical</option>
                      <option value="hvac">HVAC</option>
                      <option value="appliance">Appliance</option>
                      <option value="structural">Structural</option>
                      <option value="pest_control">Pest Control</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority *
                    </label>
                    <select
                      value={maintenanceForm.priority}
                      onChange={(e) => setMaintenanceForm({...maintenanceForm, priority: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <span className="text-blue-600 text-xl">🤖</span>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">AI Analysis</p>
                    <p>After submission, our AI will analyze your request to determine priority, category, and estimated cost.</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowMaintenanceForm(false);
                    setMaintenanceForm({ title: '', description: '', category: 'plumbing', priority: 'medium' });
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitMaintenance}
                  disabled={loading || !maintenanceForm.title || !maintenanceForm.description}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Micropayment Form Modal */}
      {showMicroPaymentForm && userProfile?.id && (
        <MicroPaymentForm
          fromUserId={userProfile.id}
          toUserId="a0000000-0000-0000-0000-000000000001" // Default to property manager
          onClose={() => setShowMicroPaymentForm(false)}
          onPaymentSuccess={fetchDashboard}
        />
      )}
    </div>
  );
}