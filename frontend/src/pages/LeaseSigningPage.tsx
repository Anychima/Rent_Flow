import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LeaseDocument from '../components/LeaseDocument';
import PaymentSection from '../components/PaymentSection';
import { CheckCircle, AlertCircle, Loader, Wallet, FileSignature } from 'lucide-react';
import axios from 'axios';
import dualWalletService, { WalletType } from '../services/dualWalletService';

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

  const [lease, setLease] = useState<Lease | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [walletType, setWalletType] = useState<WalletType>('phantom');
  const [phantomConnected, setPhantomConnected] = useState(false);
  const [phantomAddress, setPhantomAddress] = useState<string>('');
  const [circleWalletId, setCircleWalletId] = useState<string>('');
  const [circleWalletConnected, setCircleWalletConnected] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPayments, setShowPayments] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchLease();
    // Don't auto-connect, let user choose wallet type
  }, [id, user]);

  const fetchLease = async () => {
    try {
      setLoading(true);
      
      // The id from the URL is actually the application_id
      // First, get the lease by application_id
      const response = await axios.get(`http://localhost:3001/api/leases/by-application/${id}`);
      
      if (response.data.success && response.data.data) {
        setLease(response.data.data);
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

  const connectPhantomWallet = async () => {
    try {
      console.log('🔗 [Phantom] Connecting Phantom wallet for tenant...');
      const result = await dualWalletService.connectPhantomWallet();
      
      if (result.success && result.publicKey) {
        setPhantomAddress(result.publicKey);
        setPhantomConnected(true);
        setWalletType('phantom');
        console.log('✅ [Phantom] Wallet connected:', result.publicKey);
      } else {
        setError(result.error || 'Failed to connect Phantom wallet');
      }
    } catch (err) {
      console.error('Error connecting Phantom wallet:', err);
      setError('Failed to connect Phantom wallet');
    }
  };

  const connectCircleWallet = async () => {
    if (!userProfile?.id) return;

    try {
      console.log('🔗 [Circle] Connecting Circle wallet for tenant...');
      const result = await dualWalletService.connectCircleWallet(userProfile.id, 'tenant');
      
      if (result.success && result.walletId) {
        setCircleWalletId(result.walletId);
        setCircleWalletConnected(true);
        setWalletType('circle');
        console.log('✅ [Circle] Wallet connected:', result.walletId);
      } else {
        setError(result.error || 'Failed to connect Circle wallet');
      }
    } catch (err) {
      console.error('Error connecting Circle wallet:', err);
      setError('Failed to connect Circle wallet');
    }
  };

  const signLease = async () => {
    if (!lease) return;

    // Check if appropriate wallet is connected
    if (walletType === 'phantom' && !phantomConnected) {
      setError('Please connect Phantom wallet first');
      return;
    }
    if (walletType === 'circle' && !circleWalletConnected) {
      setError('Please connect Circle wallet first');
      return;
    }

    try {
      setSigning(true);
      setError('');

      // Create message to sign with timestamp and role to make it unique
      const timestamp = Date.now();
      const message = `TENANT SIGNATURE - I agree to the terms of lease ${lease.id} for property starting ${lease.start_date}. Timestamp: ${timestamp}`;

      console.log(`🔐 [${walletType.toUpperCase()} Sign] Requesting signature...`);
      console.log('   Message:', message);

      // Sign with selected wallet type
      const result = await dualWalletService.signMessage(
        walletType,
        message,
        walletType === 'circle' ? circleWalletId : undefined
      );

      if (!result.success) {
        setError(result.error || 'Failed to sign lease');
        setSigning(false);
        return;
      }

      const signatureBase64 = result.signature!;

      console.log(`✅ [${walletType.toUpperCase()} Sign] Signature obtained:`, signatureBase64.substring(0, 40) + '...');
      console.log('   Signing lease ID:', lease.id);

      // Get wallet address for payment routing
      const walletAddress = walletType === 'phantom' 
        ? phantomAddress 
        : (result.publicKey || circleWalletId);

      console.log('💳 [Wallet Info] Submitting with wallet:', {
        address: walletAddress,
        type: walletType,
        walletId: walletType === 'circle' ? circleWalletId : undefined
      });

      // Submit signature to backend using the LEASE ID WITH wallet info
      const response = await axios.post(`http://localhost:3001/api/leases/${lease.id}/sign`, {
        signer_id: userProfile?.id,
        signature: signatureBase64,
        signer_type: 'tenant',
        wallet_address: walletAddress,       // For payment routing
        wallet_type: walletType,             // 'phantom' or 'circle'
        wallet_id: walletType === 'circle' ? circleWalletId : undefined
      });

      if (response.data.success) {
        const wasActivated = response.data.activated;
        const requiresPayment = response.data.requires_payment;
        
        setSuccess(
          wasActivated
            ? `Lease signed and activated with ${walletType === 'phantom' ? 'Phantom' : 'Circle'} wallet! You are now a tenant. Redirecting...`
            : requiresPayment
            ? `Lease signed successfully! Please complete the required payments below.`
            : `Lease signed successfully with ${walletType === 'phantom' ? 'Phantom' : 'Circle'} wallet! Waiting for manager signature.`
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
      console.error(`❌ [${walletType.toUpperCase()} Sign] Error:`, err);
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
                {!phantomConnected && !circleWalletConnected && (
                  <div className="space-y-3">
                    <p className="text-sm text-blue-100 font-medium">Choose wallet to sign:</p>
                    <div className="flex gap-3">
                      <button
                        onClick={connectPhantomWallet}
                        className="flex items-center space-x-2 px-6 py-3 bg-white text-purple-600 rounded-lg hover:bg-gray-100 transition-all font-bold shadow-lg hover:shadow-xl"
                      >
                        <Wallet className="w-5 h-5" />
                        <span>Phantom Wallet</span>
                      </button>
                      <button
                        onClick={connectCircleWallet}
                        className="flex items-center space-x-2 px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-all font-bold shadow-lg hover:shadow-xl"
                      >
                        <Wallet className="w-5 h-5" />
                        <span>Circle Wallet</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Phantom Wallet Connected */}
                {phantomConnected && (
                  <div className="space-y-4">
                    <div className="p-4 bg-white/10 rounded-lg">
                      <p className="text-sm text-blue-100 mb-1">Phantom Wallet Connected</p>
                      <p className="font-mono text-sm">{phantomAddress.substring(0, 12)}...{phantomAddress.substring(phantomAddress.length - 8)}</p>
                    </div>
                    <button
                      onClick={signLease}
                      disabled={signing}
                      className="flex items-center space-x-2 px-8 py-4 bg-white text-purple-600 rounded-lg hover:bg-gray-100 transition-all font-bold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {signing ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin" />
                          <span>Signing with Phantom...</span>
                        </>
                      ) : (
                        <>
                          <FileSignature className="w-5 h-5" />
                          <span>Sign with Phantom</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Circle Wallet Connected */}
                {circleWalletConnected && (
                  <div className="space-y-4">
                    <div className="p-4 bg-white/10 rounded-lg">
                      <p className="text-sm text-blue-100 mb-1">Circle Wallet Connected</p>
                      <p className="font-mono text-sm">{circleWalletId.substring(0, 20)}...{circleWalletId.substring(circleWalletId.length - 10)}</p>
                    </div>
                    <button
                      onClick={signLease}
                      disabled={signing}
                      className="flex items-center space-x-2 px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-all font-bold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {signing ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin" />
                          <span>Signing with Circle...</span>
                        </>
                      ) : (
                        <>
                          <FileSignature className="w-5 h-5" />
                          <span>Sign with Circle</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
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

        {/* Payment Section - Show after signing if payments required */}
        {showPayments && paymentInfo && (phantomConnected || circleWalletConnected) && (
          <div className="mb-8">
            <PaymentSection
              leaseId={lease.id}
              tenantId={lease.tenant_id}
              walletConnected={phantomConnected || circleWalletConnected}
              walletAddress={phantomConnected ? phantomAddress : circleWalletId}
              walletId={circleWalletId}
              walletType={walletType}
              onPaymentComplete={async () => {
                console.log('🎉 [Payments Complete] All payments finished, activating lease...');
                // Refresh profile to get tenant role
                try {
                  await refreshUserProfile();
                  console.log('✅ [Payments Complete] Profile refreshed');
                } catch (err) {
                  console.warn('⚠️ [Payments Complete] Could not refresh profile');
                }
                // Redirect to tenant dashboard
                setTimeout(() => {
                  window.location.href = '/';
                }, 1500);
              }}
            />
          </div>
        )}

        {/* Lease Document */}
        <LeaseDocument lease={lease} />
      </div>
    </div>
  );
};

// Extend Window interface for Phantom wallet
declare global {
  interface Window {
    solana?: any;
  }
}

export default LeaseSigningPage;
