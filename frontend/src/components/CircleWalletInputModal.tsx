import React, { useState } from 'react';

interface CircleWalletInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (walletId: string) => void;
}

/**
 * Modal for users to input their Circle wallet ID
 * Provides instructions and validation
 */
const CircleWalletInputModal: React.FC<CircleWalletInputModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [walletId, setWalletId] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate wallet ID format (UUIDs)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!walletId.trim()) {
      setError('Please enter your Circle wallet ID');
      return;
    }
    
    if (!uuidRegex.test(walletId.trim())) {
      setError('Invalid wallet ID format. Should be a UUID (e.g., 12345678-1234-1234-1234-123456789012)');
      return;
    }
    
    setError('');
    onSubmit(walletId.trim());
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 shadow-2xl">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Connect Circle Wallet</h2>
            <p className="text-sm text-gray-600 mt-1">
              Enter your Circle Developer Controlled Wallet ID
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            How to get your Circle Wallet ID:
          </h3>
          <ol className="list-decimal list-inside text-sm text-blue-800 space-y-2">
            <li>Go to <a href="https://console.circle.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">Circle Console</a></li>
            <li>Navigate to "Wallets" → "Developer Controlled Wallets"</li>
            <li>Select or create an Arc Testnet wallet</li>
            <li>Copy the Wallet ID (UUID format)</li>
            <li>Paste it below</li>
          </ol>
          <div className="mt-3 text-xs text-blue-700 bg-blue-100 p-2 rounded">
            💡 <strong>Tip:</strong> Your wallet ID looks like: <code className="bg-white px-1 rounded">bc7a44e4-4702-5490-bc99-84587a5a2939</code>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Circle Wallet ID *
            </label>
            <input
              type="text"
              value={walletId}
              onChange={(e) => {
                setWalletId(e.target.value);
                setError('');
              }}
              placeholder="e.g., bc7a44e4-4702-5490-bc99-84587a5a2939"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
            {error && (
              <p className="mt-2 text-sm text-red-600 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </p>
            )}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <svg className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="text-sm text-yellow-800">
                <p className="font-semibold mb-1">Important Security Note:</p>
                <p>
                  Only use wallet IDs from <strong>Circle Developer Controlled Wallets</strong>.
                  Never share your entity secret or API keys. This wallet will be used for signing
                  lease agreements and processing rent payments.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              Connect Wallet
            </button>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <details className="text-sm">
            <summary className="cursor-pointer text-gray-600 hover:text-gray-900 font-medium">
              Don't have a Circle wallet yet?
            </summary>
            <div className="mt-3 text-gray-700 space-y-2">
              <p>You'll need to create one at Circle Console:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Sign up at <a href="https://console.circle.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">console.circle.com</a></li>
                <li>Complete KYC verification</li>
                <li>Create a Wallet Set for Arc Testnet</li>
                <li>Generate a new Developer Controlled Wallet</li>
                <li>Copy the Wallet ID and paste it here</li>
              </ol>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};

export default CircleWalletInputModal;
