import React from 'react';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';
import LeaseDocument from '../components/LeaseDocument';
import WalletConnectionModal from '../components/WalletConnectionModal';
import { CheckCircle, AlertCircle, Loader, Edit, Send, Wallet, FileSignature } from 'lucide-react';
import axios from 'axios';

// API Configuration
const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

interface Lease {
  id: string;
  application_id: string;
  property_id: string;
  tenant_id: string;
  start_date: string;
  end_date: string;
  monthly_rent_usdc: number;
  security_deposit_usdc: number;
  rent_due_day: number;
  lease_status: string;
  status: string;
  lease_terms: any;
  special_terms?: any;
  landlord_signature?: string;
  tenant_signature?: string;
  landlord_signature_date?: string;
  tenant_signature_date?: string;
  landlord_signed_at?: string;
  tenant_signed_at?: string;
  blockchain_transaction_hash?: string;
  blockchain_lease_id?: number;
  generated_at: string;
  property?: any;
  tenant?: any;
  application?: any;
}

const LeaseReviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { walletAddress, walletId, walletType, isConnected, connectWallet } = useWallet();

  const [lease, setLease] = useState<Lease | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [signing, setSigning] = useState(false);
  const [verifyingBlockchain, setVerifyingBlockchain] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Editable fields
  const [monthlyRent, setMonthlyRent] = useState(0);
  const [securityDeposit, setSecurityDeposit] = useState(0);
  const [rentDueDay, setRentDueDay] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [specialTerms, setSpecialTerms] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Only managers can review leases
    if (userProfile?.role !== 'manager') {
      navigate('/');
      return;
    }

    // Auto-load wallet from user profile if not already connected
    if (!isConnected && userProfile?.wallet_address) {
      console.log('🔄 [Auto-Load] Loading wallet from user profile...');
      connectWallet(
        userProfile.wallet_address,
        userProfile.circle_wallet_id || '',
        userProfile.circle_wallet_id ? 'circle' : 'external'
      );
    }

    fetchLease();
  }, [id, user, userProfile, isConnected]);

  const connectArcWallet = async () => {
    // Show wallet connection modal instead of auto-connecting
    setShowWalletModal(true);
  };

  const handleWalletConnected = async (wId: string, wAddress: string) => {
    // Determine wallet type based on whether walletId is provided
    const wType: 'circle' | 'external' = wId ? 'circle' : 'external';
    
    // Use global wallet context
    connectWallet(wAddress, wId, wType);
    
    // Show appropriate message based on wallet type
    if (wType === 'circle') {
      setSuccess(`Circle wallet connected! Address: ${wAddress.substring(0, 8)}...${wAddress.substring(wAddress.length - 6)}`);
    } else {
      setSuccess(`External wallet connected! Address: ${wAddress.substring(0, 8)}...${wAddress.substring(wAddress.length - 6)}\n✅ You can now sign leases with this wallet!`);
    }
    setTimeout(() => setSuccess(''), 5000);
  };

  const signLeaseAsManager = async () => {
    if (!lease) return;

    // Check if Arc wallet is connected
    if (!isConnected) {
      setError('Please connect Arc wallet first');
      return;
    }
    
    // Validate we have a wallet address
    if (!walletAddress) {
      setError('Wallet address is required for signing. Please reconnect your wallet.');
      return;
    }

    try {
      setSigning(true);
      setError('');

      console.log('📝 [Smart Contract Signing] Initiating on-chain signature...');
      console.log('   Wallet Type:', walletType);
      console.log('   Address:', walletAddress);
      console.log('   Lease ID:', lease.id);

      // Import the smart contract signing service
      const smartContractSigningService = await import('../services/smartContractSigningService');
      
      // Prepare lease info for smart contract
      const leaseInfo = {
        leaseId: lease.id,
        landlord: walletAddress, // Manager is the landlord
        tenant: lease.tenant?.wallet_address || '0x0000000000000000000000000000000000000000',
        leaseDocumentHash: `lease-${lease.id}`, // Use lease ID as document hash
        monthlyRent: lease.monthly_rent_usdc,
        securityDeposit: lease.security_deposit_usdc,
        isLandlord: true
      };

      // Sign lease on smart contract (works for both Circle and external wallets)
      const result = await smartContractSigningService.signLeaseOnChain(
        {
          address: walletAddress,
          walletType: walletType,
          circleWalletId: walletId || undefined
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
      const response = await axios.post(`${API_URL}/api/leases/${lease.id}/sign`, {
        signer_id: userProfile!.id,
        signature: result.transactionHash, // Store tx hash instead of signature
        signer_type: 'landlord',
        wallet_address: walletAddress,
        wallet_type: walletType,
        wallet_id: walletId || null,
        blockchain_tx_hash: result.transactionHash
      });

      if (response.data.success) {
        setSuccess(
          response.data.data.lease_status === 'fully_signed'
            ? `✅ Lease signed on-chain! Transaction: ${result.transactionHash?.substring(0, 10)}...`
            : `✅ Lease signed successfully! Waiting for tenant signature.`
        );

        setLease(response.data.data);
        setTimeout(() => {
          setSuccess('');
          fetchLease(); // Refresh to show updated status
        }, 3000);
      }
    } catch (err) {
      console.error('❌ [Smart Contract] Error:', err);
      const errorMessage = err instanceof Error 
        ? err.message 
        : typeof err === 'string' 
        ? err 
        : 'Failed to sign lease. Please try again.';
      setError(errorMessage);
    } finally {
      setSigning(false);
    }
  };

  const handleVerifyBlockchain = async () => {
    if (!lease?.id) return;

    try {
      setVerifyingBlockchain(true);
      console.log('🔍 [Verify Blockchain] Checking lease on smart contract...', lease.id);

      // Import smart contract service
      const smartContractService = await import('../services/smartContractSigningService');
      
      // Check if lease is on-chain
      const statusResult = await smartContractService.checkLeaseStatus(lease.id);

      if (!statusResult.success) {
        setError('Failed to verify blockchain status: ' + (statusResult.error || 'Unknown error'));
        return;
      }

      if (!statusResult.isFullySigned) {
        setError('Lease not found on blockchain. Both parties may need to sign again.');
        return;
      }

      // Lease is on-chain, confirmed!
      console.log('✅ [Verify Blockchain] Lease confirmed on-chain');
      setSuccess('Lease verified on Arc blockchain! Lease ID: ' + lease.id.substring(0, 8) + '... If the transaction hash still doesn\'t appear, please sign the lease again.');
      
      // Refresh lease data
      await fetchLease();
    } catch (error) {
      console.error('❌ [Verify Blockchain] Error:', error);
      setError('Failed to verify blockchain status. Please try again.');
    } finally {
      setVerifyingBlockchain(false);
    }
  };

  const fetchLease = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/leases/${id}`);
      
      if (response.data.success) {
        const leaseData = response.data.data;
        setLease(leaseData);
        
        // Initialize editable fields
        setMonthlyRent(leaseData.monthly_rent_usdc);
        setSecurityDeposit(leaseData.security_deposit_usdc);
        setRentDueDay(leaseData.rent_due_day);
        setStartDate(leaseData.start_date);
        setEndDate(leaseData.end_date);
        setSpecialTerms(
          leaseData.special_terms 
            ? Object.entries(leaseData.special_terms).map(([key, value]) => `${key}: ${value}`).join('\n')
            : ''
        );
      } else {
        setError('Failed to load lease');
      }
    } catch (err) {
      console.error('Error fetching lease:', err);
      setError('Error loading lease');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!lease) return;

    try {
      setSaving(true);
      setError('');

      // Parse special terms
      const parsedSpecialTerms: any = {};
      if (specialTerms.trim()) {
        specialTerms.split('\n').forEach(line => {
          const [key, ...valueParts] = line.split(':');
          if (key && valueParts.length > 0) {
            parsedSpecialTerms[key.trim()] = valueParts.join(':').trim();
          }
        });
      }

      // Update lease
      const response = await axios.put(`${API_URL}/api/leases/${id}`, {
        monthly_rent_usdc: monthlyRent,
        security_deposit_usdc: securityDeposit,
        rent_due_day: rentDueDay,
        start_date: startDate,
        end_date: endDate,
        special_terms: parsedSpecialTerms,
        lease_terms: {
          ...lease.lease_terms,
          monthlyRent: monthlyRent,
          securityDeposit: securityDeposit,
          startDate: startDate,
          endDate: endDate,
          rentDueDay: rentDueDay
        }
      });

      if (response.data.success) {
        setSuccess('Lease updated successfully!');
        setLease(response.data.data);
        setEditing(false);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      console.error('Error saving lease:', err);
      setError(err.response?.data?.error || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleSendToTenant = async () => {
    if (!lease) return;

    // Check if landlord has signed
    if (!lease.landlord_signature) {
      setError('Please sign the lease before sending to tenant');
      return;
    }

    const confirmMessage = lease.landlord_signature 
      ? 'Send this signed lease to the tenant? They will be able to review and sign it.'
      : 'Send this unsigned lease to the tenant for review?';

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setSending(true);
      setError('');

      console.log('📧 [Send Lease] Sending lease to tenant...');

      // Update lease status to pending_tenant
      const response = await axios.put(`${API_URL}/api/leases/${id}`, {
        lease_status: 'pending_tenant',
        status: 'pending',
        sent_to_tenant_at: new Date().toISOString()
      });

      if (response.data.success) {
        setSuccess('Lease sent to tenant successfully! They can now review and sign.');
        setLease(response.data.data);
        
        // Optionally: Could add email notification here
        console.log('✅ [Send Lease] Lease sent successfully');
        
        // Don't redirect immediately, let user see success message
        setTimeout(() => {
          setSuccess('');
          fetchLease(); // Refresh to show updated status
        }, 3000);
      }
    } catch (err: any) {
      console.error('❌ [Send Lease] Error:', err);
      setError(err.response?.data?.error || 'Failed to send lease');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading lease...</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Review & Edit Lease
              </h1>
              <p className="text-gray-600 mt-1">
                {lease.property?.title || 'Property'} - {lease.tenant?.full_name || 'Tenant'}
              </p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              ← Back to Dashboard
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

        {/* Status */}
        <div className="mb-6 bg-white rounded-lg p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Lease Status</h3>
              <div className="flex items-center gap-4">
                <span className={`px-4 py-2 rounded-lg font-medium ${
                  lease.lease_status === 'draft' ? 'bg-gray-100 text-gray-800' :
                  lease.lease_status === 'pending_tenant' ? 'bg-yellow-100 text-yellow-800' :
                  lease.lease_status === 'pending_landlord' ? 'bg-blue-100 text-blue-800' :
                  lease.lease_status === 'fully_signed' ? 'bg-green-100 text-green-800' :
                  lease.lease_status === 'active' ? 'bg-purple-100 text-purple-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {lease.lease_status.replace('_', ' ').toUpperCase()}
                </span>
                {lease.landlord_signature && (
                  <span className="text-sm text-gray-600">✅ Landlord Signed</span>
                )}
                {lease.tenant_signature && (
                  <span className="text-sm text-gray-600">✅ Tenant Signed</span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {!editing && !lease.landlord_signature && (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <Edit className="w-4 h-4" />
                  Edit Lease
                </button>
              )}
              {!lease.landlord_signature && !editing && (
                <>
                  {/* Wallet Connection Section */}
                  <div className="bg-white rounded-lg p-6 shadow-sm border-2 border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose wallet to sign:</h3>
                    
                    {!isConnected && (
                      <div className="space-y-3">
                        <button
                          onClick={connectArcWallet}
                          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
                        >
                          <Wallet className="w-5 h-5" />
                          <span className="font-medium">Connect Arc Wallet</span>
                        </button>
                      </div>
                    )}

                    {/* Arc Wallet Connected */}
                    {isConnected && (
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-5 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <Wallet className="w-6 h-6 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-blue-900">Arc Wallet Connected</p>
                            <p className="text-sm font-mono text-blue-900">{walletAddress.substring(0, 8)}...{walletAddress.substring(walletAddress.length - 6)}</p>
                            <p className="text-xs text-green-600 mt-1 font-medium">✅ Ready to sign lease on-chain</p>
                          </div>
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                      </div>
                    )}

                    {/* Sign Lease Button */}
                    <button
                      onClick={signLeaseAsManager}
                      disabled={signing}
                      className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-700 text-white rounded-xl hover:bg-blue-800 transition-all shadow-md hover:shadow-lg disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                    >
                      {signing ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          Signing...
                        </>
                      ) : (
                        <>
                          <FileSignature className="w-4 h-4" />
                          Sign Lease
                        </>
                      )}
                    </button>
                  </div>

                  {/* Send to Tenant Button - Show when NOT signed OR when signed but not sent */}
                  {(!lease.landlord_signature || (lease.landlord_signature && lease.lease_status === 'draft')) && (
                    <button
                      onClick={handleSendToTenant}
                      disabled={sending || !lease.landlord_signature}
                      className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sending ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : lease.landlord_signature ? (
                        <>
                          <Send className="w-4 h-4" />
                          Send Signed Lease to Tenant
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send to Tenant (Unsigned)
                        </>
                      )}
                    </button>
                  )}
                </>
              )}
              {/* Show status after sending OR when tenant received */}
              {lease.landlord_signature && lease.lease_status === 'pending_tenant' && (
                <div className="px-6 py-3 bg-green-50 border-2 border-green-200 text-green-700 rounded-lg font-medium">
                  ✅ Lease sent to tenant for signing!
                </div>
              )}
              {lease.landlord_signature && lease.tenant_signature && (
                <div className="px-6 py-3 bg-green-50 border-2 border-green-200 text-green-700 rounded-lg font-medium">
                  ✅ Fully Signed • Both parties have signed
                </div>
              )}
              {editing && (
                <>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Blockchain Transaction Hash Display */}
          {lease.blockchain_transaction_hash ? (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5 mt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xl">⛓️</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-blue-900">Lease Stored on Blockchain</p>
                    <p className="text-xs text-blue-700">Arc Testnet</p>
                  </div>
                </div>
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="bg-white rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-2">Transaction Hash:</p>
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://testnet.arcscan.app/tx/${lease.blockchain_transaction_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs text-blue-600 hover:text-blue-800 hover:underline break-all flex-1"
                      title="View on Arc Explorer"
                    >
                      {lease.blockchain_transaction_hash}
                    </a>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(lease.blockchain_transaction_hash!);
                        setSuccess('✅ Transaction hash copied to clipboard!');
                        setTimeout(() => setSuccess(''), 2000);
                      }}
                      className="text-gray-500 hover:text-gray-700 p-2 flex-shrink-0 hover:bg-gray-100 rounded"
                      title="Copy transaction hash"
                    >
                      📋
                    </button>
                  </div>
                </div>
                {lease.blockchain_lease_id && (
                  <p className="text-xs text-gray-600">
                    On-Chain Lease ID: <span className="font-mono font-semibold">#{lease.blockchain_lease_id}</span>
                  </p>
                )}
                <div className="flex items-start gap-2 bg-green-50 rounded-lg p-3 mt-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-green-800">
                    This lease is permanently and immutably recorded on the Arc blockchain.
                  </p>
                </div>
              </div>
            </div>
          ) : (lease.landlord_signed_at || lease.landlord_signature_date) && (lease.tenant_signed_at || lease.tenant_signature_date) ? (
            <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 mt-4">
              <div className="flex items-center gap-3">
                <Loader className="w-5 h-5 text-orange-600 animate-spin" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-orange-900">⏳ Processing Blockchain Storage</p>
                  <p className="text-xs text-orange-700 mt-1">
                    Both parties have signed! The lease is being submitted to the Arc blockchain. Please refresh the page in a few moments.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 mt-3">
                <button
                  onClick={fetchLease}
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
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mt-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">📝</span>
                <div>
                  <p className="text-sm font-semibold text-yellow-900">Awaiting Digital Signatures</p>
                  <p className="text-xs text-yellow-700 mt-1">
                    This lease will be stored on the Arc blockchain for immutability once both parties complete the digital signing process.
                  </p>
                  <div className="mt-2 space-y-1">
                    {!(lease.landlord_signed_at || lease.landlord_signature_date) && (
                      <p className="text-xs text-yellow-800">• Landlord signature pending</p>
                    )}
                    {!(lease.tenant_signed_at || lease.tenant_signature_date) && (
                      <p className="text-xs text-yellow-800">• Tenant signature pending</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Edit Form */}
        {editing && (
          <div className="mb-6 bg-white rounded-lg p-6 shadow-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Edit Lease Terms</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Rent (USDC)
                </label>
                <input
                  type="number"
                  value={monthlyRent}
                  onChange={(e) => setMonthlyRent(parseFloat(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Security Deposit (USDC)
                </label>
                <input
                  type="number"
                  value={securityDeposit}
                  onChange={(e) => setSecurityDeposit(parseFloat(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rent Due Day (1-28)
                </label>
                <input
                  type="number"
                  min="1"
                  max="28"
                  value={rentDueDay}
                  onChange={(e) => setRentDueDay(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Special Terms (one per line, format: "key: value")
                </label>
                <textarea
                  value={specialTerms}
                  onChange={(e) => setSpecialTerms(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="petPolicy: Pet allowed with deposit&#10;parking: One parking spot included"
                />
              </div>
            </div>
          </div>
        )}

        {/* Lease Document */}
        <LeaseDocument lease={lease} />
      </div>

      {/* Wallet Connection Modal */}
      {showWalletModal && userProfile && (
        <WalletConnectionModal
          userId={userProfile.id}
          userEmail={userProfile.email || ''}
          onClose={() => setShowWalletModal(false)}
          onWalletConnected={handleWalletConnected}
        />
      )}
    </div>
  );
};

export default LeaseReviewPage;
