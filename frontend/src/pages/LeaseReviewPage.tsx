import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LeaseDocument from '../components/LeaseDocument';
import { CheckCircle, AlertCircle, Loader, Edit, Send, Wallet, FileSignature } from 'lucide-react';
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
  rent_due_day: number;
  lease_status: string;
  status: string;
  lease_terms: any;
  special_terms?: any;
  landlord_signature?: string;
  tenant_signature?: string;
  landlord_signature_date?: string;
  tenant_signature_date?: string;
  generated_at: string;
  property?: any;
  tenant?: any;
  application?: any;
}

const LeaseReviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();

  const [lease, setLease] = useState<Lease | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [signing, setSigning] = useState(false);
  const [walletType, setWalletType] = useState<WalletType>('phantom');
  const [phantomConnected, setPhantomConnected] = useState(false);
  const [phantomAddress, setPhantomAddress] = useState<string>('');
  const [circleWalletId, setCircleWalletId] = useState<string>('');
  const [circleWalletConnected, setCircleWalletConnected] = useState(false);
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

    fetchLease();
    // Don't auto-connect, let user choose wallet type
  }, [id, user, userProfile]);

  const connectPhantomWallet = async () => {
    try {
      console.log('🔗 [Phantom] Connecting Phantom wallet for manager...');
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
      console.log('🔗 [Circle] Connecting Circle wallet for manager...');
      const result = await dualWalletService.connectCircleWallet(userProfile.id, 'manager');
      
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

  const signLeaseAsManager = async () => {
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
      const message = `LANDLORD SIGNATURE - I, as the property manager, approve and sign this lease agreement ${lease.id} for property starting ${lease.start_date}. Timestamp: ${timestamp}`;

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

      console.log('💰 [Wallet Info] Submitting with wallet:', {
        address: walletAddress,
        type: walletType,
        walletId: walletType === 'circle' ? circleWalletId : undefined
      });

      // Submit signature to backend WITH wallet info for payment routing
      const response = await axios.post(`http://localhost:3001/api/leases/${lease.id}/sign`, {
        signer_id: userProfile?.id,
        signature: signatureBase64,
        signer_type: 'landlord',
        wallet_address: walletAddress,       // For payment routing
        wallet_type: walletType,             // 'phantom' or 'circle'
        wallet_id: walletType === 'circle' ? circleWalletId : undefined
      });

      if (response.data.success) {
        const wasActivated = response.data.activated;
        setSuccess(
          wasActivated
            ? `Lease signed and activated with ${walletType === 'phantom' ? 'Phantom' : 'Circle'} wallet! Tenant has been notified and promoted to tenant role.`
            : `Lease signed successfully with ${walletType === 'phantom' ? 'Phantom' : 'Circle'} wallet! Tenant will be notified.`
        );
        setLease(response.data.data);
        setTimeout(() => {
          setSuccess('');
          fetchLease(); // Refresh to show updated status
        }, 3000);
      }
    } catch (err: any) {
      console.error(`❌ [${walletType.toUpperCase()} Sign] Error:`, err);
      setError(err.response?.data?.error || err.message || 'Failed to sign lease. Please try again.');
    } finally {
      setSigning(false);
    }
  };

  const fetchLease = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:3001/api/leases/${id}`);
      
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
      const response = await axios.put(`http://localhost:3001/api/leases/${id}`, {
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
      const response = await axios.put(`http://localhost:3001/api/leases/${id}`, {
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
        <div className="mb-6 bg-white rounded-lg p-6 shadow-md">
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
                  {/* Wallet Selection and Connection */}
                  {!phantomConnected && !circleWalletConnected && (
                    <div className="flex flex-col gap-3">
                      <p className="text-sm text-gray-600 font-medium">Choose wallet to sign:</p>
                      <div className="flex gap-2">
                        <button
                          onClick={connectPhantomWallet}
                          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-medium shadow-lg"
                        >
                          <Wallet className="w-4 h-4" />
                          Connect Phantom Wallet
                        </button>
                        <button
                          onClick={connectCircleWallet}
                          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium shadow-lg"
                        >
                          <Wallet className="w-4 h-4" />
                          Connect Circle Wallet
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Phantom Wallet Connected */}
                  {phantomConnected && (
                    <div className="flex flex-col gap-2">
                      <div className="px-4 py-2 bg-purple-50 border-2 border-purple-200 rounded-lg">
                        <p className="text-xs text-purple-600 font-medium">Phantom Wallet Connected</p>
                        <p className="text-sm font-mono text-purple-900">{phantomAddress.substring(0, 8)}...{phantomAddress.substring(phantomAddress.length - 6)}</p>
                      </div>
                      <button
                        onClick={signLeaseAsManager}
                        disabled={signing}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-medium shadow-lg disabled:opacity-50"
                      >
                        {signing ? (
                          <>
                            <Loader className="w-4 h-4 animate-spin" />
                            Signing...
                          </>
                        ) : (
                          <>
                            <FileSignature className="w-4 h-4" />
                            Sign with Phantom
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Circle Wallet Connected */}
                  {circleWalletConnected && (
                    <div className="flex flex-col gap-2">
                      <div className="px-4 py-2 bg-blue-50 border-2 border-blue-200 rounded-lg">
                        <p className="text-xs text-blue-600 font-medium">Circle Wallet Connected</p>
                        <p className="text-sm font-mono text-blue-900">{circleWalletId.substring(0, 20)}...{circleWalletId.substring(circleWalletId.length - 10)}</p>
                      </div>
                      <button
                        onClick={signLeaseAsManager}
                        disabled={signing}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium shadow-lg disabled:opacity-50"
                      >
                        {signing ? (
                          <>
                            <Loader className="w-4 h-4 animate-spin" />
                            Signing...
                          </>
                        ) : (
                          <>
                            <FileSignature className="w-4 h-4" />
                            Sign with Circle
                          </>
                        )}
                      </button>
                    </div>
                  )}

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
    </div>
  );
};

export default LeaseReviewPage;
