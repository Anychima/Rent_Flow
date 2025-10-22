import { useState, useEffect } from 'react';
import './index.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import PropertyForm from './components/PropertyForm';
import LeaseForm from './components/LeaseForm';
import PaymentForm from './components/PaymentForm';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface DashboardStats {
  totalProperties: number;
  activeLeases: number;
  pendingMaintenance: number;
  totalRevenue: string;
}

interface Property {
  id: string;
  owner_id?: string;
  title: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  description: string;
  property_type: string;
  monthly_rent_usdc: number;
  security_deposit_usdc: number;
  bedrooms: number;
  bathrooms: number;
  square_feet: number;
  amenities: string[];
  is_active: boolean;
}

interface Lease {
  id: string;
  property_id: string;
  tenant_id: string;
  start_date: string;
  end_date: string;
  status: string;
  monthly_rent_usdc: number;
  security_deposit_usdc: number;
  rent_due_day: number;
  property: Property;
  tenant: {
    full_name: string;
    email: string;
  };
}

interface Payment {
  id: string;
  lease_id: string;
  tenant_id: string;
  amount_usdc: number;
  payment_date: string;
  due_date: string;
  status: string;
  transaction_hash?: string;
  notes?: string;
  lease: {
    property: Property;
  };
  tenant: {
    full_name: string;
    email: string;
  };
}

interface MaintenanceRequest {
  id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  estimated_cost_usdc: number;
  property: Property;
}

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

function Dashboard() {
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalProperties: 0,
    activeLeases: 0,
    pendingMaintenance: 0,
    totalRevenue: '0'
  });
  const [properties, setProperties] = useState<Property[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRequest[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [showLeaseForm, setShowLeaseForm] = useState(false);
  const [editingLease, setEditingLease] = useState<Lease | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const handleRefresh = async () => {
    showToast('Refreshing data...', 'info');
    await fetchData();
    showToast('Data refreshed successfully!', 'success');
  };

  const handleAddProperty = () => {
    setEditingProperty(null);
    setShowPropertyForm(true);
  };

  const handleEditProperty = (property: Property) => {
    setEditingProperty(property);
    setShowPropertyForm(true);
  };

  const handleDeleteProperty = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/properties/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        showToast('Property deleted successfully!', 'success');
        fetchData();
      } else {
        showToast('Failed to delete property', 'error');
      }
    } catch (error) {
      console.error('Error deleting property:', error);
      showToast('Error deleting property', 'error');
    }
  };

  const handlePropertySubmit = async (propertyData: Partial<Property>) => {
    try {
      const url = editingProperty 
        ? `${API_URL}/api/properties/${editingProperty.id}`
        : `${API_URL}/api/properties`;
      
      const method = editingProperty ? 'PUT' : 'POST';

      // Add owner_id for new properties (should come from auth in production)
      if (!editingProperty) {
        (propertyData as any).owner_id = 'a0000000-0000-0000-0000-000000000001'; // Default manager
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(propertyData),
      });

      const result = await response.json();

      if (result.success) {
        showToast(
          editingProperty ? 'Property updated successfully!' : 'Property created successfully!',
          'success'
        );
        setShowPropertyForm(false);
        setEditingProperty(null);
        fetchData();
      } else {
        showToast(result.error || 'Failed to save property', 'error');
      }
    } catch (error) {
      console.error('Error saving property:', error);
      showToast('Error saving property', 'error');
    }
  };

  const handleAddLease = () => {
    setEditingLease(null);
    setShowLeaseForm(true);
  };

  const handleEditLease = (lease: Lease) => {
    setEditingLease(lease);
    setShowLeaseForm(true);
  };

  const handleTerminateLease = async (id: string) => {
    if (!window.confirm('Are you sure you want to terminate this lease?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/leases/${id}/terminate`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        showToast('Lease terminated successfully!', 'success');
        fetchData();
      } else {
        showToast('Failed to terminate lease', 'error');
      }
    } catch (error) {
      console.error('Error terminating lease:', error);
      showToast('Error terminating lease', 'error');
    }
  };

  const handleDeleteLease = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this lease? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/leases/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        showToast('Lease deleted successfully!', 'success');
        fetchData();
      } else {
        showToast('Failed to delete lease', 'error');
      }
    } catch (error) {
      console.error('Error deleting lease:', error);
      showToast('Error deleting lease', 'error');
    }
  };

  const handleLeaseSubmit = async (leaseData: Partial<Lease>) => {
    try {
      const url = editingLease 
        ? `${API_URL}/api/leases/${editingLease.id}`
        : `${API_URL}/api/leases`;
      
      const method = editingLease ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leaseData),
      });

      const result = await response.json();

      if (result.success) {
        showToast(
          editingLease ? 'Lease updated successfully!' : 'Lease created successfully!',
          'success'
        );
        setShowLeaseForm(false);
        setEditingLease(null);
        fetchData();
      } else {
        showToast(result.error || 'Failed to save lease', 'error');
      }
    } catch (error) {
      console.error('Error saving lease:', error);
      showToast('Error saving lease', 'error');
    }
  };

  const handleAddPayment = () => {
    setEditingPayment(null);
    setShowPaymentForm(true);
  };

  const handlePaymentSubmit = async (paymentData: Partial<Payment>) => {
    try {
      const url = editingPayment 
        ? `${API_URL}/api/payments/${editingPayment.id}`
        : `${API_URL}/api/payments`;
      
      const method = editingPayment ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      const result = await response.json();

      if (result.success) {
        showToast(
          editingPayment ? 'Payment updated successfully!' : 'Payment recorded successfully!',
          'success'
        );
        setShowPaymentForm(false);
        setEditingPayment(null);
        fetchData();
      } else {
        showToast(result.error || 'Failed to save payment', 'error');
      }
    } catch (error) {
      console.error('Error saving payment:', error);
      showToast('Error saving payment', 'error');
    }
  };

  const handleCompletePayment = async (id: string) => {
    if (!window.confirm('Mark this payment as completed?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/payments/${id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        showToast('Payment marked as completed!', 'success');
        fetchData();
      } else {
        showToast('Failed to complete payment', 'error');
      }
    } catch (error) {
      console.error('Error completing payment:', error);
      showToast('Error completing payment', 'error');
    }
  };

  const getToastColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  const filteredMaintenance = maintenance.filter(req => {
    const matchesSearch = req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         req.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || req.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const filteredProperties = properties.filter(prop => 
    prop.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prop.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, propsRes, leasesRes, maintenanceRes, paymentsRes] = await Promise.all([
        fetch(`${API_URL}/api/dashboard/stats`),
        fetch(`${API_URL}/api/properties`),
        fetch(`${API_URL}/api/leases`),
        fetch(`${API_URL}/api/maintenance`),
        fetch(`${API_URL}/api/payments`)
      ]);

      const [statsData, propsData, leasesData, maintenanceData, paymentsData] = await Promise.all([
        statsRes.json(),
        propsRes.json(),
        leasesRes.json(),
        maintenanceRes.json(),
        paymentsRes.json()
      ]);

      if (statsData.success) setStats(statsData.data);
      if (propsData.success) setProperties(propsData.data || []);
      if (leasesData.success) setLeases(leasesData.data || []);
      if (maintenanceData.success) setMaintenance(maintenanceData.data || []);
      if (paymentsData.success) setPayments(paymentsData.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'emergency': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading RentFlow AI...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">RF</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">RentFlow AI</h1>
                <p className="text-sm text-gray-500">Property Management on Solana</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 px-3 py-1 bg-gray-100 rounded-lg">
                <span className="text-sm text-gray-700">{user?.email}</span>
              </div>
              <button
                onClick={signOut}
                className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                title="Sign out"
              >
                🚪 Sign Out
              </button>
              <button
                onClick={handleRefresh}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                title="Refresh all data"
              >
                🔄 Refresh
              </button>
              <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                Solana Devnet
              </span>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                ● Connected
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {['dashboard', 'properties', 'leases', 'payments', 'maintenance'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-4 text-sm font-medium capitalize border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <div>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">🏠</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Properties</dt>
                        <dd className="text-3xl font-semibold text-gray-900">{stats.totalProperties}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">📄</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Active Leases</dt>
                        <dd className="text-3xl font-semibold text-gray-900">{stats.activeLeases}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">🔧</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Pending Requests</dt>
                        <dd className="text-3xl font-semibold text-gray-900">{stats.pendingMaintenance}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">💰</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                        <dd className="text-3xl font-semibold text-gray-900">${stats.totalRevenue}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white shadow rounded-lg p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Maintenance Requests</h2>
              <div className="space-y-4">
                {maintenance.slice(0, 5).map((req) => (
                  <div key={req.id} className="flex items-center justify-between border-b pb-4">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">{req.title}</h3>
                      <p className="text-sm text-gray-500">{req.property?.title || 'Unknown Property'}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getPriorityColor(req.priority)}`}>
                        {req.priority}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(req.status)}`}>
                        {req.status}
                      </span>
                      <span className="text-sm font-medium text-gray-900">${req.estimated_cost_usdc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'properties' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Properties</h2>
                <input
                  type="text"
                  placeholder="Search properties by name or city..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg w-96 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleAddProperty}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                + Add Property
              </button>
            </div>
            {filteredProperties.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-500 text-lg">No properties found</p>
                <p className="text-gray-400 text-sm mt-2">Try adjusting your search</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProperties.map((property) => (
                <div key={property.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="h-48 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                    <span className="text-6xl">🏠</span>
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{property.title}</h3>
                    <p className="text-sm text-gray-600 mb-4">{property.address}, {property.city}, {property.state}</p>
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <span>🛏️ {property.bedrooms} bed</span>
                      <span>🚿 {property.bathrooms} bath</span>
                      <span>📐 {property.square_feet} sqft</span>
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl font-bold text-blue-600">${property.monthly_rent_usdc}/mo</span>
                      <span className={`px-3 py-1 text-xs font-medium rounded ${property.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {property.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditProperty(property)}
                        className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDeleteProperty(property.id)}
                        className="flex-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'leases' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Leases</h2>
              <button
                onClick={handleAddLease}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                + Create Lease
              </button>
            </div>
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rent</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leases.map((lease) => (
                    <tr key={lease.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{lease.property?.title || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{lease.property?.city || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{lease.tenant?.full_name || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{lease.tenant?.email || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">${lease.monthly_rent_usdc} USDC</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(lease.status)}`}>
                          {lease.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditLease(lease)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit lease"
                          >
                            ✏️
                          </button>
                          {lease.status === 'active' && (
                            <button
                              onClick={() => handleTerminateLease(lease.id)}
                              className="text-yellow-600 hover:text-yellow-900"
                              title="Terminate lease"
                            >
                              ⏹️
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteLease(lease.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete lease"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Payments</h2>
              <button
                onClick={handleAddPayment}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                + Record Payment
              </button>
            </div>
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{payment.lease?.property?.title || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{payment.lease?.property?.city || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{payment.tenant?.full_name || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{payment.tenant?.email || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">${payment.amount_usdc} USDC</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{payment.due_date}</div>
                        {payment.transaction_hash && (
                          <div className="text-xs text-gray-500 truncate max-w-[100px]" title={payment.transaction_hash}>
                            {payment.transaction_hash.substring(0, 12)}...
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(payment.status)}`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          {payment.status === 'pending' && (
                            <button
                              onClick={() => handleCompletePayment(payment.id)}
                              className="px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-xs"
                              title="Mark as completed"
                            >
                              ✓ Complete
                            </button>
                          )}
                          {payment.transaction_hash && (
                            <a
                              href={`https://explorer.solana.com/tx/${payment.transaction_hash}?cluster=devnet`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-900"
                              title="View on Solana Explorer"
                            >
                              🔗
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Maintenance Requests</h2>
                <div className="flex items-center space-x-4">
                  <input
                    type="text"
                    placeholder="Search by title or category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg w-80 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>
            </div>
            {filteredMaintenance.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-500 text-lg">No maintenance requests found</p>
                <p className="text-gray-400 text-sm mt-2">Try adjusting your search or filter</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredMaintenance.map((req) => (
                <div key={req.id} className="bg-white shadow rounded-lg p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{req.title}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getPriorityColor(req.priority)}`}>
                          {req.priority}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(req.status)}`}>
                          {req.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{req.property?.title || 'Unknown Property'}</p>
                      <p className="text-sm text-gray-500">Category: {req.category}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">${req.estimated_cost_usdc}</div>
                      <div className="text-sm text-gray-500">Estimated</div>
                    </div>
                  </div>
                </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`${getToastColor(toast.type)} text-white px-6 py-3 rounded-lg shadow-lg animate-slide-in-right flex items-center space-x-2`}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="ml-2 text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div>
              <p>Powered by Circle API • Solana Devnet • Supabase</p>
            </div>
            <div className="flex items-center space-x-4">
              <span>Deployer: {process.env.REACT_APP_DEPLOYER_ADDRESS?.substring(0, 8)}...</span>
              <span>AI Agent: {process.env.REACT_APP_AI_WALLET_ADDRESS?.substring(0, 8)}...</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Property Form Modal */}
      {showPropertyForm && (
        <PropertyForm
          property={editingProperty}
          onClose={() => {
            setShowPropertyForm(false);
            setEditingProperty(null);
          }}
          onSubmit={handlePropertySubmit}
        />
      )}

      {/* Lease Form Modal */}
      {showLeaseForm && (
        <LeaseForm
          lease={editingLease}
          onClose={() => {
            setShowLeaseForm(false);
            setEditingLease(null);
          }}
          onSubmit={handleLeaseSubmit}
        />
      )}

      {/* Payment Form Modal */}
      {showPaymentForm && (
        <PaymentForm
          payment={editingPayment}
          onClose={() => {
            setShowPaymentForm(false);
            setEditingPayment(null);
          }}
          onSubmit={handlePaymentSubmit}
        />
      )}
    </div>
  );
}

export default function App() {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  return (
    <AuthProvider>
      <AppContent authMode={authMode} setAuthMode={setAuthMode} />
    </AuthProvider>
  );
}

function AppContent({ authMode, setAuthMode }: { authMode: 'login' | 'register'; setAuthMode: (mode: 'login' | 'register') => void }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading RentFlow AI...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return authMode === 'login' ? (
      <Login onToggleMode={() => setAuthMode('register')} />
    ) : (
      <Register onToggleMode={() => setAuthMode('login')} />
    );
  }

  return <Dashboard />;
}
