import { useState } from 'react';
import { X, Wallet, ArrowRight, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'https://rent-flow.onrender.com';

interface WalletConnectionModalProps {
  userId: string;
  // userEmail: string; // DISABLED: Only needed for wallet creation
  onClose: () => void;
  onWalletConnected: (walletId: string, walletAddress: string) => void;
}

export default function WalletConnectionModal({
  userId,
  // userEmail, // DISABLED: Only needed for wallet creation
  onClose,
  onWalletConnected
}: WalletConnectionModalProps) {
  const [mode, setMode] = useState<'select' | 'create' | 'connect-id' | 'connect-address' | 'connect-metamask'>('select');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detectionInfo, setDetectionInfo] = useState<string>('');
  const [existingWalletId, setExistingWalletId] = useState('');
  const [existingWalletAddress, setExistingWalletAddress] = useState('');

  const handleConnectMetaMask = async () => {
    setLoading(true);
    setError('');

    try {
      // Check if MetaMask is installed
      if (typeof window.ethereum === 'undefined') {
        setError('MetaMask is not installed. Please install MetaMask browser extension first.');
        setLoading(false);
        return;
      }

      console.log('🦊 [MetaMask] Requesting account access...');
      
      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      const walletAddress = accounts[0];
      console.log('✅ [MetaMask] Connected:', walletAddress);

      // Save as external wallet
      const response = await axios.post(`${API_URL}/api/users/${userId}/wallets`, {
        walletAddress,
        walletType: 'external'
      });

      if (response.data.success) {
        alert(`✅ MetaMask Connected!

Address: ${walletAddress.substring(0, 20)}...

✨ This wallet is now available in your Wallet tab!\n✨ You can now sign leases with MetaMask!`);
        
        // Save to localStorage
        const walletInfo = {
          address: walletAddress,
          walletId: null,
          type: 'external',
          connectedAt: new Date().toISOString()
        };
        localStorage.setItem('rentflow_wallet', JSON.stringify(walletInfo));
        console.log('💾 [Wallet Modal] MetaMask saved to localStorage:', walletInfo);
        
        // Dispatch event to notify other components
        window.dispatchEvent(new CustomEvent('walletConnected'));
        
        onWalletConnected('', walletAddress);
        onClose();
      } else {
        setError(response.data.error || 'Failed to connect wallet');
      }
    } catch (err: any) {
      console.error('❌ [MetaMask] Error:', err);
      if (err.code === 4001) {
        setError('You rejected the connection request. Please try again.');
      } else {
        setError(err.message || 'Failed to connect MetaMask. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // DISABLED: Creates wallets in developer's Circle account
  // const handleCreateNewWallet = async () => {
  //   setLoading(true);
  //   setError('');

  //   try {
  //     console.log('🌐 [Wallet] Creating new Arc wallet for user...');
  //     
  //     const response = await axios.post(`${API_URL}/api/arc/wallet/create`, {
  //       userId,
  //       userEmail
  //     });

  //     if (response.data.success) {
  //       const { walletId, address } = response.data.data;
  //       console.log('✅ [Wallet] New wallet created:', { walletId, address });
  //       
  //       // Save to user_wallets table
  //       const saveResponse = await axios.post(`${API_URL}/api/users/${userId}/wallets`, {
  //         walletAddress: address,
  //         walletType: 'circle',
  //         circleWalletId: walletId
  //       });
  //       
  //       if (saveResponse.data.success) {
  //         console.log('✅ [Wallet] Wallet saved to user_wallets table');
  //         
  //         // Save to localStorage for immediate availability
  //         const walletInfo = {
  //           address: address,
  //           walletId: walletId,
  //           type: 'circle',
  //           connectedAt: new Date().toISOString()
  //         };
  //         localStorage.setItem('rentflow_wallet', JSON.stringify(walletInfo));
  //         console.log('💾 [Wallet Modal] New wallet saved to localStorage:', walletInfo);
  //         
  //         // Dispatch event to notify other components
  //         window.dispatchEvent(new CustomEvent('walletConnected'));
  //       }
  //       
  //       alert(`✅ Arc Wallet Created!

// Your new wallet address:
// ${address.substring(0, 20)}...

// ✨ This wallet is now available in your Wallet tab!`);
  //       onWalletConnected(walletId, address);
  //       onClose();
  //     } else {
  //       setError(response.data.error || 'Failed to create wallet');
  //     }
  //   } catch (err: any) {
  //     console.error('❌ [Wallet] Error creating wallet:', err);
  //     setError(err.response?.data?.error || 'Failed to create wallet. Please try again.');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleConnectExistingWallet = async () => {
    setLoading(true);
    setError('');
    setDetectionInfo('');

    try {
      // Validate Arc address format (0x... with 42 characters)
      if (!existingWalletAddress.startsWith('0x') || existingWalletAddress.length !== 42) {
        setError('Invalid Arc wallet address format. Must start with 0x and be 42 characters long.');
        setLoading(false);
        return;
      }

      console.log('🔍 [Wallet] Checking if address is Circle wallet:', existingWalletAddress);
      
      // Smart detection: Check if address belongs to Circle
      const checkResponse = await axios.post(`${API_URL}/api/arc/wallet/check-address`, {
        address: existingWalletAddress,
        userId
      });

      if (checkResponse.data.success && checkResponse.data.isCircleWallet) {
        // Found Circle wallet! Use the wallet ID
        const { walletId, address, source, note } = checkResponse.data;
        console.log('✅ [Wallet] Found Circle wallet!', { walletId, address, source });
        
        // Show detection source
        if (note) {
          setDetectionInfo(`🔍 Detected: ${note}`);
        }
        
        // Save to user_wallets table
        const response = await axios.post(`${API_URL}/api/users/${userId}/wallets`, {
          walletAddress: address,
          walletType: 'circle',
          circleWalletId: walletId
        });

        if (response.data.success) {
          alert(`✅ Circle Wallet Connected!

Wallet ID: ${walletId}
Address: ${address.substring(0, 20)}...
Source: ${source}

✨ This wallet is now available in your Wallet tab!\n✨ This wallet can sign leases!`);
          
          // Save to localStorage for app-wide persistence
          const walletInfo = {
            address: address,
            walletId: walletId,
            type: 'circle',
            connectedAt: new Date().toISOString()
          };
          localStorage.setItem('rentflow_wallet', JSON.stringify(walletInfo));
          console.log('💾 [Wallet Modal] Saved to localStorage:', walletInfo);
          
          // Dispatch event to notify other components
          window.dispatchEvent(new CustomEvent('walletConnected'));
          
          onWalletConnected(walletId, address);
          onClose();
        } else {
          setError(response.data.error || 'Failed to connect wallet');
        }
      } else {
        // External wallet (not Circle) or AI detection
        const { detection, suggestion } = checkResponse.data;
        
        console.log('ℹ️ [Wallet] Detection result:', detection);
        
        if (detection) {
          const aiInfo = `🤖 AI Detection:
- Provider: ${detection.likelyProvider}
- Confidence: ${detection.confidence}%
- Blockchain: ${detection.blockchain}
- Patterns: ${detection.patterns.join(', ')}`;
          
          setDetectionInfo(aiInfo);
          
          if (suggestion) {
            setDetectionInfo(prev => `${prev}

💡 ${suggestion}`);
          }
        }
        
        console.log('ℹ️ [Wallet] External wallet detected:', existingWalletAddress);
        
        // Save as external wallet
        const response = await axios.post(`${API_URL}/api/users/${userId}/wallets`, {
          walletAddress: existingWalletAddress,
          walletType: 'external'
        });

        if (response.data.success) {
          console.log('✅ [Wallet] External wallet connected');
          alert(`✅ Wallet Connected as External!

✨ This wallet is now available in your Wallet tab!

✨ This wallet can:
- ✅ Sign leases (via MetaMask/wallet popup)
- ✅ Receive payments

🔐 Signing method: Browser wallet extension

You're all set to sign leases and receive payments!`);
          
          // Save to localStorage for app-wide persistence
          const walletInfo = {
            address: existingWalletAddress,
            walletId: null,
            type: 'external',
            connectedAt: new Date().toISOString()
          };
          localStorage.setItem('rentflow_wallet', JSON.stringify(walletInfo));
          console.log('💾 [Wallet Modal] Saved to localStorage:', walletInfo);
          
          // Dispatch event to notify other components
          window.dispatchEvent(new CustomEvent('walletConnected'));
          
          onWalletConnected('', existingWalletAddress);
          onClose();
        } else {
          setError(response.data.error || 'Failed to connect wallet');
        }
      }
    } catch (err: any) {
      console.error('❌ [Wallet] Error connecting wallet:', err);
      setError(err.response?.data?.error || 'Failed to connect wallet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectByWalletId = async () => {
    setLoading(true);
    setError('');

    try {
      // Validate wallet ID format (UUID)
      if (!existingWalletId || existingWalletId.length < 10) {
        setError('Invalid wallet ID format.');
        setLoading(false);
        return;
      }

      console.log('🔗 [Wallet] Connecting by Circle wallet ID:', existingWalletId);
      
      // Connect existing Circle wallet
      const response = await axios.post(`${API_URL}/api/arc/wallet/connect-existing`, {
        walletId: existingWalletId,
        userId
      });

      if (response.data.success) {
        const { walletId, address } = response.data.data;
        console.log('✅ [Wallet] Circle wallet connected:', { walletId, address });
        
        alert(`✅ Circle Wallet Connected!

Wallet ID: ${walletId}
Address: ${address.substring(0, 20)}...

✨ This wallet is now available in your Wallet tab!\n✨ This wallet can sign leases!`);
        
        // Save to localStorage for app-wide persistence
        const walletInfo = {
          address: address,
          walletId: walletId,
          type: 'circle',
          connectedAt: new Date().toISOString()
        };
        localStorage.setItem('rentflow_wallet', JSON.stringify(walletInfo));
        console.log('💾 [Wallet Modal] Saved to localStorage:', walletInfo);
        
        // Dispatch event to notify other components
        window.dispatchEvent(new CustomEvent('walletConnected'));
        
        onWalletConnected(walletId, address);
        onClose();
      } else {
        setError(response.data.error || 'Failed to connect wallet. Please verify the wallet ID.');
      }
    } catch (err: any) {
      console.error('❌ [Wallet] Error connecting by wallet ID:', err);
      setError(err.response?.data?.error || 'Failed to connect wallet. Please verify the wallet ID.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-t-2xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="text-center text-white">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
              <Wallet className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
            <p className="text-blue-100 text-sm">
              Choose how you want to connect your Arc wallet
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {mode === 'select' && (
            <div className="space-y-4">
              <p className="text-gray-600 text-sm mb-6">
                Connect your existing Arc wallet. You must have your own wallet to make payments and sign leases.
              </p>

              {/* DISABLED: Option 1: Create New Wallet - Creates wallets in developer's account */}
              {/* <button
                onClick={() => setMode('create')}
                className="w-full p-5 border-2 border-blue-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all text-left group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                        <Wallet className="w-5 h-5 text-blue-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900">Create New Wallet</h3>
                    </div>
                    <p className="text-sm text-gray-600 ml-12">
                      We'll create and manage a secure Arc wallet for you using Circle
                    </p>
                    <div className="ml-12 mt-2 flex flex-wrap gap-2">
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Recommended</span>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">Secure</span>
                      <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">Can Sign Leases</span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0 mt-2" />
                </div>
              </button> */}

              {/* Option 2: Connect Existing Circle Wallet by ID */}
              <button
                onClick={() => setMode('connect-id')}
                className="w-full p-5 border-2 border-blue-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all text-left group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                        <Wallet className="w-5 h-5 text-blue-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900">Connect Existing Circle Wallet</h3>
                    </div>
                    <p className="text-sm text-gray-600 ml-12">
                      Connect a Circle wallet you already created using its Wallet ID
                    </p>
                    <div className="ml-12 mt-2 flex flex-wrap gap-2">
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">Secure</span>
                      <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">Can Sign Leases</span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0 mt-2" />
                </div>
              </button>

              {/* Option 3: Connect MetaMask (Simple & Fast) */}
              <button
                onClick={() => handleConnectMetaMask()}
                className="w-full p-5 border-2 border-orange-200 rounded-xl hover:border-orange-400 hover:bg-orange-50 transition-all text-left group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                        <Wallet className="w-5 h-5 text-orange-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900">Connect MetaMask</h3>
                    </div>
                    <p className="text-sm text-gray-600 ml-12">
                      Connect with your MetaMask wallet - no setup needed!
                    </p>
                    <div className="ml-12 mt-2 flex flex-wrap gap-2">
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Fast & Easy</span>
                      <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">Can Sign Leases</span>
                      <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded">1-Click Connect</span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-orange-600 transition-colors flex-shrink-0 mt-2" />
                </div>
              </button>

              {/* Option 4: Connect Wallet by Address (Smart Detection) */}
              <button
                onClick={() => setMode('connect-address')}
                className="w-full p-5 border-2 border-gray-200 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-all text-left group">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                        <Wallet className="w-5 h-5 text-gray-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900">Connect by Address</h3>
                    </div>
                    <p className="text-sm text-gray-600 ml-12">
                      Enter wallet address - we'll auto-detect if it's Circle or external
                    </p>
                    <div className="ml-12 mt-2">
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">Smart Detection</span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0 mt-2" />
                </div>
              </button>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-blue-900 mb-1">About Arc Wallets</h4>
                    <p className="text-xs text-blue-800">
                      Arc is an EVM-compatible blockchain that uses USDC as its native currency. 
                      You need an Arc wallet to make secure, on-chain payments for your lease.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DISABLED: Create wallet mode - Creates wallets in developer's account */}
          {/* {mode === 'create' && (
            <div className="space-y-4">
              <button
                onClick={() => setMode('select')}
                className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 mb-4"
              >
                ← Back to options
              </button>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Wallet className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Create Your Arc Wallet</h3>
                  <p className="text-sm text-gray-600">
                    We'll create a secure wallet managed by Circle Developer Controlled Wallets
                  </p>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Secure & Non-Custodial</p>
                      <p className="text-xs text-gray-600">Your wallet is secured by Circle's infrastructure</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">No Setup Required</p>
                      <p className="text-xs text-gray-600">Ready to use immediately after creation</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Blockchain Verified</p>
                      <p className="text-xs text-gray-600">All transactions recorded on Arc Testnet</p>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleCreateNewWallet}
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>Creating Wallet...</span>
                    </>
                  ) : (
                    <>
                      <Wallet className="w-5 h-5" />
                      <span>Create My Arc Wallet</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )} */}

          {mode === 'connect-id' && (
            <div className="space-y-4">
              <button
                onClick={() => setMode('select')}
                className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 mb-4"
              >
                ← Back to options
              </button>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Circle Wallet ID
                </label>
                <input
                  type="text"
                  value={existingWalletId}
                  onChange={(e) => setExistingWalletId(e.target.value)}
                  placeholder="Enter your Circle wallet ID (UUID format)"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono text-sm"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Enter the wallet ID from your Circle Developer Console
                </p>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-blue-900 mb-1">Circle Wallet Benefits</h4>
                    <p className="text-xs text-blue-800">
                      Circle wallets are managed by Circle's secure infrastructure and <strong>can sign leases</strong>. 
                      This is the recommended option for full functionality.
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}

              <button
                onClick={handleConnectByWalletId}
                disabled={loading || !existingWalletId}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <Wallet className="w-5 h-5" />
                    <span>Connect Circle Wallet</span>
                  </>
                )}
              </button>
            </div>
          )}

          {mode === 'connect-address' && (
            <div className="space-y-4">
              <button
                onClick={() => setMode('select')}
                className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 mb-4"
              >
                ← Back to options
              </button>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Arc Wallet Address
                </label>
                <input
                  type="text"
                  value={existingWalletAddress}
                  onChange={(e) => setExistingWalletAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono text-sm"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Enter your Arc wallet address (must start with 0x and be 42 characters)
                </p>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-yellow-900 mb-1">Smart Detection</h4>
                    <p className="text-xs text-yellow-800">
                      We'll automatically detect if your address is a Circle wallet or external wallet. 
                      <strong>Both Circle and external wallets can sign leases!</strong> Circle wallets sign via backend, external wallets sign via your browser extension (MetaMask, etc.).
                    </p>
                  </div>
                </div>
              </div>

              {detectionInfo && (
                <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
                  <div className="flex gap-3">
                    <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-blue-900 mb-2">🤖 AI Detection Results</h4>
                      <pre className="text-xs text-blue-800 whitespace-pre-wrap font-mono">{detectionInfo}</pre>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}

              <button
                onClick={handleConnectExistingWallet}
                disabled={loading || !existingWalletAddress}
                className="w-full py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Checking & Connecting...</span>
                  </>
                ) : (
                  <>
                    <Wallet className="w-5 h-5" />
                    <span>Connect Wallet (Smart Detection)</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
