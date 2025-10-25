import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * CacheBuster Component
 * Detects when app updates are available and prompts user to refresh
 * Also provides manual cache clearing functionality
 */
const CacheBuster: React.FC = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    // Check for service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js').then((registration) => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
              }
            });
          }
        });
      });
    }

    // Check version in localStorage vs current
    const currentVersion = process.env.REACT_APP_VERSION || '1.0.0';
    const storedVersion = localStorage.getItem('app_version');
    
    if (storedVersion && storedVersion !== currentVersion) {
      setUpdateAvailable(true);
    }
    
    localStorage.setItem('app_version', currentVersion);
  }, []);

  const handleClearCache = async () => {
    setClearing(true);
    try {
      // Clear all types of cache
      console.log('🧹 [CacheBuster] Clearing all caches...');
      
      // 1. Clear localStorage
      const keysToPreserve = ['app_version']; // Preserve version to track updates
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (!keysToPreserve.includes(key)) {
          localStorage.removeItem(key);
        }
      });
      console.log('✅ [CacheBuster] localStorage cleared');

      // 2. Clear sessionStorage
      sessionStorage.clear();
      console.log('✅ [CacheBuster] sessionStorage cleared');

      // 3. Clear IndexedDB
      if ('indexedDB' in window) {
        const databases = await indexedDB.databases();
        for (const db of databases) {
          if (db.name) {
            indexedDB.deleteDatabase(db.name);
          }
        }
        console.log('✅ [CacheBuster] IndexedDB cleared');
      }

      // 4. Clear Service Worker caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('✅ [CacheBuster] Service Worker caches cleared');
      }

      // 5. Unregister service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map(registration => registration.unregister())
        );
        console.log('✅ [CacheBuster] Service Workers unregistered');
      }

      console.log('🎉 [CacheBuster] All caches cleared successfully');
      
      // Hard reload the page
      window.location.reload();
    } catch (error) {
      console.error('❌ [CacheBuster] Error clearing cache:', error);
      setClearing(false);
      // Still try to reload even if cache clearing failed
      window.location.reload();
    }
  };

  if (!updateAvailable) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slideInUp">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-lg shadow-2xl border-2 border-white/20 max-w-sm">
        <div className="flex items-start gap-3">
          <RefreshCw className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-semibold text-sm mb-1">Update Available!</h4>
            <p className="text-xs text-blue-100 mb-3">
              A new version of RentFlow AI is available. Refresh to get the latest features.
            </p>
            <button
              onClick={handleClearCache}
              disabled={clearing}
              className="w-full px-4 py-2 bg-white text-blue-600 rounded-lg font-semibold text-sm hover:bg-blue-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {clearing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span>Refreshing...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CacheBuster;
