import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';
import LeaseDocument from '../components/LeaseDocument';
import PaymentSection from '../components/PaymentSection';
import WalletConnectionModal from '../components/WalletConnectionModal';
import { CheckCircle, AlertCircle, Loader, Wallet, FileSignature } from 'lucide-react';
import axios from 'axios';

interface Lease {
  id: string;
  application_id: string;
  property_id: string;
  tenant_id: string;
  start_date: string;
  end_date: string;
  monthly_rent_usdc: number;
  security_deposit_usdc: number;
  lease_status: string;
  status: string;
  lease_terms: any;
  special_terms?: any;
  tenant_signature?: string;
  landlord_signature?: string;
  tenant_signature_date?: string;
  landlord_signature_date?: string;
  generated_at: string;
  property?: any;
  tenant?: any;
}

const LeaseSigningPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, userProfile, refreshUserProfile } = useAuth();
  const { walletAddress: contextWalletAddress, walletId: contextWalletId, walletType: contextWalletType, isConnected: contextIsConnected, connectWallet: saveToContext } = useWallet();

  const [lease, setLease] = useState<Lease | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPayments, setShowPayments] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);

  // Use wallet from context instead of local state
  const arcWalletAddress = contextWalletAddress;
  const arcWalletId = contextWalletId;
  const arcWalletType = contextWalletType;
  const arcWalletConnected = contextIsConnected;

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchLease();
  }, [id, user]); // Wallet is loaded by WalletContext - no need to load here

  // Load wallet from user profile if WalletContext doesn't have it
  useEffect(() => {
    // Only run if userProfile is loaded and has a wallet_address
    if (!userProfile?.wallet_address) return;
    
    // Only run if WalletContext doesn't already have a wallet
    if (contextIsConnected && contextWalletAddress) return;
    
    console.log('🔄 [Wallet Recovery] Loading wallet from user profile:', userProfile.wallet_address);
    
    // Load wallet into WalletContext
    saveToContext(
      userProfile.wallet_address, 
      userProfile.circle_wallet_id || '', 
      userProfile.circle_wallet_id ? 'circle' : 'external'
    );
  }, [userProfile?.wallet_address, contextIsConnected, contextWalletAddress, userProfile?.circle_wallet_id, saveToContext]);

  // Debug: Log wallet connection state
  useEffect(() => {
    console.log('🔍 [Wallet State Debug]', {
      arcWalletAddress,
      arcWalletConnected,
      arcWalletId,
      userProfileWalletAddress: userProfile?.wallet_address,
      showPayments,
      hasPaymentInfo: !!paymentInfo,
      leaseStatus: lease?.lease_status,
      userRole: userProfile?.role,
      localStorage: localStorage.getItem('rentflow_wallet') ? 'HAS DATA' : 'EMPTY'
    });
  }, [arcWalletAddress, arcWalletConnected, userProfile?.wallet_address, showPayments, paymentInfo, lease?.lease_status, userProfile?.role, arcWalletId]);

  const fetchLease = async () => {
    try {
      setLoading(true);
      
      // The id from the URL is actually the application_id
      // First, get the lease by application_id
      const response = await axios.get(`https://rent-flow.onrender.com/api/leases/by-application/${id}`);
      
      if (response.data.success && response.data.data) {
        const leaseData = response.data.data;
        setLease(leaseData);

        // Check if lease is fully signed - if so, prospective tenant needs to make payments
        if ((leaseData.lease_status === 'fully_signed' || leaseData.status === 'fully_signed') && 
            leaseData.tenant_signature && 
            leaseData.landlord_signature) {
          
          console.log('🔍 [Payment Check] Lease fully signed - checking if payments needed');
          console.log('   Lease Status:', leaseData.lease_status);
          console.log('   Tenant Signature:', !!leaseData.tenant_signature);
          console.log('   Landlord Signature:', !!leaseData.landlord_signature);
          console.log('   User Role:', userProfile?.role);

          // Fetch payments to check status
          try {
            const paymentsResponse = await axios.get(`https://rent-flow.onrender.com/api/payments/lease/${leaseData.id}`);
            const payments = paymentsResponse.data?.data || [];
            const hasPendingPayments = payments.length === 0 || payments.some((p: any) => p.status === 'pending');

            console.log('   Payments:', payments.length, 'Pending:', hasPendingPayments);

            // Show payment section if:
            // 1. User is prospective_tenant (hasn't paid yet)
            // 2. OR there are pending payments (in case of partial payment)
            // 3. OR there are NO payment records yet (need to create them)
            if (userProfile?.role === 'prospective_tenant' || hasPendingPayments || payments.length === 0) {
              console.log('   User needs to complete payments to activate lease');
              console.log('   Setting showPayments to TRUE...');

              // ALWAYS show payment section when lease is fully signed and user hasn't paid
              setPaymentInfo({
                securityDeposit: leaseData.security_deposit_usdc,
                firstMonthRent: leaseData.monthly_rent_usdc,
                landlordWallet: leaseData.landlord_wallet || leaseData.property?.wallet_address || '',
                payments: payments
              });
              setShowPayments(true);
              console.log('✅ [Payment Check] showPayments set to TRUE');
              console.log('   Payment Info:', {
                securityDeposit: leaseData.security_deposit_usdc,
                firstMonthRent: leaseData.monthly_rent_usdc,
                paymentsCount: payments.length,
                hasPendingPayments
              });

              // DO NOT auto-connect wallet - user must choose to connect manually
              console.log('ℹ️ [Payment Check] User must connect wallet manually to make payments');
            } else {
              console.log('✅ [Payment Check] All payments complete, lease activated');
            }
          } catch (paymentError) {
            console.error('Error fetching payments:', paymentError);
            // If we can't fetch payments, assume they need to pay (safe fallback)
            if (userProfile?.role === 'prospective_tenant') {
              setPaymentInfo({
                securityDeposit: leaseData.security_deposit_usdc,
                firstMonthRent: leaseData.monthly_rent_usdc,
                landlordWallet: leaseData.landlord_wallet || leaseData.property?.wallet_address || '',
                payments: []
              });
              setShowPayments(true);
              console.log('⚠️ [Payment Check] Could not fetch payments, showing payment section for prospective_tenant');
            }
          }
        }
      } else {
        setError('No lease found for this application. Please contact the property manager.');
      }
    } catch (err) {
      console.error('Error fetching lease:', err);
      setError('Error loading lease');
    } finally {
      setLoading(false);
    }
  };

  const connectArcWallet = async () => {
    // Show wallet connection modal instead of auto-creating
    setShowWalletModal(true);
  };

  const handleWalletConnected = (walletId: string, walletAddress: string) => {
    // Determine wallet type based on whether walletId is provided
    const walletType: 'circle' | 'external' = walletId ? 'circle' : 'external';
    
    // Save to WalletContext (which also saves to localStorage)
    saveToContext(walletAddress, walletId, walletType);
    
    // Show appropriate message based on wallet type
    if (walletType === 'circle') {
      setSuccess(`Circle wallet connected! Address: ${walletAddress.substring(0, 8)}...${walletAddress.substring(walletAddress.length - 6)}`);
    } else {
      setSuccess(`External wallet connected! Address: ${walletAddress.substring(0, 8)}...${walletAddress.substring(walletAddress.length - 6)}\n✅ You can now sign leases with this wallet!`);
    }
    setTimeout(() => setSuccess(''), 5000);
  };

  const signLease = async () => {
    if (!lease) return;

    // Check if Arc wallet is connected
    if (!arcWalletConnected) {
      setError('Please connect Arc wallet first');
      return;
    }
    
    // Validate we have a wallet address
    if (!arcWalletAddress) {
      setError('Wallet address is required for signing. Please reconnect your wallet.');
      return;
    }

    try {
      setSigning(true);
      setError('');

      console.log('📝 [Smart Contract Signing] Initiating on-chain signature...');
      console.log('   Wallet Type:', arcWalletType);
      console.log('   Address:', arcWalletAddress);
      console.log('   Lease ID:', lease.id);

      // Import the smart contract signing service
      const smartContractSigningService = await import('../services/smartContractSigningService');
      
      // Prepare lease info for smart contract
      const leaseInfo = {
        leaseId: lease.id,
        landlord: lease.property?.manager_wallet || userProfile?.wallet_address || '0x0000000000000000000000000000000000000000',
        tenant: arcWalletAddress, // Current user is the tenant
        leaseDocumentHash: `lease-${lease.id}`, // Use lease ID as document hash
        monthlyRent: lease.monthly_rent_usdc,
        securityDeposit: lease.security_deposit_usdc,
        isLandlord: false
      };

      // Sign lease on smart contract (works for both Circle and external wallets)
      const result = await smartContractSigningService.signLeaseOnChain(
        {
          address: arcWalletAddress,
          walletType: arcWalletType,
          circleWalletId: arcWalletId || undefined
        },
        leaseInfo
      );

      if (!result.success) {
        const errorMessage = typeof result.error === 'string' 
          ? result.error 
          : (result.error as any)?.message || 'Failed to sign lease on-chain';
        setError(errorMessage);
        setSigning(false);
        return;
      }

      console.log('✅ [Smart Contract] Transaction confirmed:', result.transactionHash);
      console.log('   Explorer:', `https://testnet.arcscan.app/tx/${result.transactionHash}`);

      // Update lease in database with transaction hash
      const response = await axios.post(`https://rent-flow.onrender.com/api/leases/${lease.id}/sign`, {
        signer_id: userProfile!.id,
        signature: result.transactionHash, // Store tx hash instead of signature
        signer_type: 'tenant',
        wallet_address: arcWalletAddress,
        wallet_type: arcWalletType,
        wallet_id: arcWalletId || null,
        blockchain_tx_hash: result.transactionHash
      });

      if (response.data.success) {
        const wasActivated = response.data.activated;
        const requiresPayment = response.data.requires_payment;
        
        setSuccess(
          wasActivated
            ? `✅ Lease signed on-chain! You are now a tenant. Redirecting...`
            : requiresPayment
            ? `✅ Lease signed successfully! Transaction: ${result.transactionHash?.substring(0, 10)}... Please complete payments below.`
            : `✅ Lease signed successfully! Waiting for manager signature.`
        );
        setLease(response.data.data);

        // If requires payment, show payment section (keep wallet connected)
        if (requiresPayment && response.data.payment_info) {
          setShowPayments(true);
          setPaymentInfo(response.data.payment_info);
          // Don't redirect - user needs to make payments
          return;
        }

        // If activated, force auth refresh and redirect to tenant dashboard
        if (wasActivated) {
          console.log('🚀 [Activation] Lease activated! Forcing auth refresh...');
          
          // Wait a moment for success message to show
          setTimeout(async () => {
            try {
              // Force refresh the user profile to get updated role
              await refreshUserProfile();
              console.log('✅ [Activation] Profile refreshed, redirecting to tenant dashboard...');
            } catch (err) {
              console.warn('⚠️ [Activation] Could not refresh profile, but proceeding with redirect');
            }
            
            // Redirect with full page reload to force role-based routing
            window.location.href = '/';
          }, 2000);
        }
      }
    } catch (err: any) {
      console.error('❌ [Arc Sign] Error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to sign lease. Please try again.');
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading lease agreement...</p>
        </div>
      </div>
    );
  }

  if (!lease) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Lease Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'The lease you are looking for does not exist.'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isUserTenant = userProfile?.id === lease.tenant_id;
  const canSign = isUserTenant && !lease.tenant_signature && lease.lease_status === 'pending_tenant';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Lease Agreement
              </h1>
              <p className="text-gray-600 mt-1">Review and sign your lease digitally</p>
            </div>
            <button
              onClick={() => navigate('/my-applications')}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              ← Back to Applications
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-lg flex items-start">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3" />
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {/* Signing Actions */}
        {canSign && (
          <div className="mb-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl p-8 shadow-xl">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">Ready to Sign</h2>
                <p className="text-blue-100 mb-6">
                  Connect your preferred wallet to digitally sign this lease agreement. Your signature will be securely recorded on the blockchain.
                </p>

                {/* Wallet Selection */}
                {!arcWalletConnected && (
                  <div className="space-y-3">
                    <p className="text-sm text-blue-100 font-medium">Connect your wallet to sign:</p>
                    <div className="flex gap-3">
                      <button
                        onClick={connectArcWallet}
                        className="flex items-center space-x-2 px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-all font-bold shadow-lg hover:shadow-xl"
                      >
                        <Wallet className="w-5 h-5" />
                        <span>Connect Arc Wallet</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Arc Wallet Connected */}
                {arcWalletConnected && (
                  <div className="bg-white/10 backdrop-blur-sm border-2 border-white/30 rounded-lg p-4">
                    <p className="text-sm text-blue-100 mb-2">Arc Wallet Connected:</p>
                    <p className="font-mono text-sm">{arcWalletAddress.substring(0, 12)}...{arcWalletAddress.substring(arcWalletAddress.length - 8)}</p>
                    <p className="text-xs text-green-300 mt-2 font-medium">✅ Ready to sign lease on-chain</p>
                  </div>
                )}

                <button
                  onClick={signLease}
                  disabled={signing}
                  className="flex items-center space-x-2 px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-all font-bold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {signing ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>Signing with Arc...</span>
                    </>
                  ) : (
                    <>
                      <FileSignature className="w-5 h-5" />
                      <span>Sign with Arc</span>
                    </>
                  )}
                </button>
              </div>
              <div className="ml-6">
                <FileSignature className="w-24 h-24 opacity-30" />
              </div>
            </div>
          </div>
        )}

        {/* Lease already signed */}
        {isUserTenant && lease.tenant_signature && (
          <div className="mb-8 bg-green-50 border-2 border-green-200 rounded-2xl p-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600 mr-4" />
              <div>
                <h3 className="text-xl font-bold text-green-900">You've Signed This Lease</h3>
                <p className="text-green-700">
                  Signed on {new Date(lease.tenant_signature_date!).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Payment Section - Show when fully signed, even without wallet (show wallet prompt) */}
        {showPayments && paymentInfo ? (
          arcWalletAddress ? (
            <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-blue-200">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Complete Required Payments</h3>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-sm text-gray-700">
                    Your Arc wallet is connected. You can now complete your payments below.
                  </p>
                </div>

                {arcWalletAddress && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">
                          Arc Wallet Address
                        </p>
                        <p className="font-mono text-sm text-gray-900">
                          {arcWalletAddress.substring(0, 12)}...{arcWalletAddress.substring(arcWalletAddress.length - 8)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                          <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                          Arc Wallet (Circle)
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <PaymentSection
                leaseId={lease.id}
                walletConnected={!!arcWalletAddress}
                walletAddress={arcWalletAddress}
                walletId={arcWalletId}
                walletType="circle"
                onPaymentComplete={async () => {
                  console.log('🎉 [Payment Complete] All payments finished, refreshing user profile...');
                  
                  // Force refresh to get updated tenant role
                  await refreshUserProfile();
                  
                  // Redirect to dashboard after brief delay
                  setTimeout(() => {
                    window.location.href = '/';
                  }, 3000);
                }}
              />
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-yellow-200">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Complete Required Payments</h3>
                <div className="p-6 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-yellow-900 mb-2">Wallet Connection Required</h4>
                      <p className="text-sm text-yellow-800 mb-4">
                        You must connect your Arc wallet to complete the required payments below:
                      </p>
                      <ul className="list-disc list-inside text-sm text-yellow-800 mb-4 space-y-1">
                        <li>Security Deposit: ${paymentInfo.securityDeposit} USDC</li>
                        <li>First Month's Rent: ${paymentInfo.firstMonthRent} USDC</li>
                      </ul>
                      <button
                        onClick={connectArcWallet}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-md hover:shadow-lg"
                      >
                        <Wallet className="w-5 h-5" />
                        Connect Arc Wallet to Make Payments
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        ) : null}

        {/* Lease Document */}
        <LeaseDocument lease={lease} />
      </div>

      {/* Wallet Connection Modal */}
      {showWalletModal && userProfile && (
        <WalletConnectionModal
          userId={userProfile.id}
          userEmail={userProfile.email}
          onClose={() => setShowWalletModal(false)}
          onWalletConnected={handleWalletConnected}
        />
      )}
    </div>
  );
};

export default LeaseSigningPage;
