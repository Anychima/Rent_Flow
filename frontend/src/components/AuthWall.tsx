import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Mail, Lock, User, Home, Briefcase, ArrowRight, Shield, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AuthWallProps {
  onClose?: () => void;
  returnUrl?: string;
  mode?: 'login' | 'signup';
}

const AuthWall: React.FC<AuthWallProps> = ({ onClose, returnUrl, mode: initialMode = 'signup' }) => {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [role, setRole] = useState<'prospective_tenant' | 'manager'>('prospective_tenant');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        // Validation
        if (!formData.fullName.trim()) {
          setError('Please enter your full name');
          setLoading(false);
          return;
        }

        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }

        if (formData.password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }

        // Sign up
        const { error: signUpError } = await signUp(
          formData.email,
          formData.password,
          formData.fullName,
          role // Pass the selected role
        );

        if (signUpError) {
          setError(signUpError.message || 'Failed to create account');
          setLoading(false);
          return;
        }

        // TODO: Create user profile with role in database
        // For now, redirect to verification page
        alert('Account created! Please check your email for verification.');
        
        // Redirect to return URL or home
        if (returnUrl) {
          navigate(returnUrl);
        } else {
          navigate('/');
        }
      } else {
        // Login
        const { error: signInError } = await signIn(formData.email, formData.password);

        if (signInError) {
          setError(signInError.message || 'Failed to sign in');
          setLoading(false);
          return;
        }

        // Redirect to return URL or home (role-based routing happens in App.tsx)
        if (returnUrl) {
          navigate(returnUrl);
        } else {
          navigate('/');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-t-2xl">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          )}
          <div className="text-center text-white">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
              <Home className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-bold mb-2">
              {mode === 'signup' ? 'Join RentFlow AI' : 'Welcome Back'}
            </h2>
            <p className="text-blue-100">
              {mode === 'signup'
                ? 'Start your journey to finding the perfect home'
                : 'Sign in to continue your property search'}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Role Selection (Signup Only) */}
          {mode === 'signup' && (
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700">
                I am a:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('prospective_tenant')}
                  className={`p-4 border-2 rounded-xl transition-all ${
                    role === 'prospective_tenant'
                      ? 'border-blue-600 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <Home className={`w-6 h-6 mx-auto mb-2 ${
                    role === 'prospective_tenant' ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                  <div className="text-sm font-semibold text-gray-900">Tenant</div>
                  <div className="text-xs text-gray-500">Looking for property</div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('manager')}
                  className={`p-4 border-2 rounded-xl transition-all ${
                    role === 'manager'
                      ? 'border-blue-600 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <Briefcase className={`w-6 h-6 mx-auto mb-2 ${
                    role === 'manager' ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                  <div className="text-sm font-semibold text-gray-900">Manager</div>
                  <div className="text-xs text-gray-500">List properties</div>
                </button>
              </div>
            </div>
          )}

          {/* Full Name (Signup Only) */}
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  required={mode === 'signup'}
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                required
              />
            </div>
          </div>

          {/* Confirm Password (Signup Only) */}
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  required={mode === 'signup'}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>{mode === 'signup' ? 'Create Account' : 'Sign In'}</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          {/* Toggle Mode */}
          <div className="text-center pt-4 border-t">
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setError('');
              }}
              className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
            >
              {mode === 'signup' ? (
                <>Already have an account? <span className="font-semibold">Sign In</span></>
              ) : (
                <>Don't have an account? <span className="font-semibold">Sign Up</span></>
              )}
            </button>
          </div>
        </form>

        {/* Features Footer */}
        <div className="bg-gray-50 p-6 rounded-b-2xl border-t">
          <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-gray-900">Blockchain Secure</div>
                <div>Verified on Solana</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-gray-900">AI-Powered</div>
                <div>Smart matching</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthWall;
