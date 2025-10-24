import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import './index.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import PropertyForm from './components/PropertyForm';
import LeaseForm from './components/LeaseForm';
import PaymentForm from './components/PaymentForm';
import PaymentAnalytics from './components/PaymentAnalytics';
import MaintenanceForm from './components/MaintenanceForm';
import TenantDashboard from './components/TenantDashboard';
import VoiceNotifications from './components/VoiceNotifications';
import PublicPropertyList from './components/PublicPropertyList';
import PublicPropertyListings from './components/PublicPropertyListings';
import PropertyDetail from './components/PropertyDetail';
import AuthWall from './components/AuthWall';
import PropertyApplicationForm from './components/PropertyApplicationForm';
import MyApplications from './components/MyApplications';
import LeaseSigningPage from './pages/LeaseSigningPage';
import LeaseReviewPage from './pages/LeaseReviewPage';
import ApplicationReviewModal from './components/ApplicationReviewModal';
import ChatBox from './components/ChatBox';

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
  property_id: string;
  requested_by: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  estimated_cost_usdc: number;
  actual_cost_usdc?: number;
  assigned_to?: string;
  notes?: string;
  property: Property;
  requestor: {
    full_name: string;
    email: string;
  };
}

interface Application {
  id: string;
  property_id: string;
  applicant_id: string;
  status: string;
  employment_status: string;
  monthly_income_usdc: number;
  ai_compatibility_score: number;
  ai_risk_score: number;
  ai_analysis: any;
  requested_move_in_date: string;
  created_at: string;
  property: Property;
  applicant: {
    id: string;
    full_name: string;
    email: string;
  };
  manager_notes?: string;
}

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

function Dashboard() {
  const { user, userProfile, signOut } = useAuth();
  const navigate = useNavigate();
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
  const [applications, setApplications] = useState<Application[]>([]);
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
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<MaintenanceRequest | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [chatApplication, setChatApplication] = useState<Application | null>(null);
  const [leaseStatus, setLeaseStatus] = useState<Record<string, { exists: boolean; landlordSigned: boolean; tenantSigned: boolean; fullySigned: boolean }>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const checkLeaseStatusForApps = async (apps: Application[]) => {
    const approvedApps = apps.filter(app => app.status === 'approved');
    const statusMap: Record<string, { exists: boolean; landlordSigned: boolean; tenantSigned: boolean; fullySigned: boolean }> = {};
    
    for (const app of approvedApps) {
      try {
        const response = await fetch(`${API_URL}/api/leases/by-application/${app.id}`);
        const result = await response.json();
        
        if (result.success && result.data) {
          const lease = result.data;
          statusMap[app.id] = {
            exists: true,
            landlordSigned: !!lease.landlord_signature,
            tenantSigned: !!lease.tenant_signature,
            fullySigned: !!lease.landlord_signature && !!lease.tenant_signature
          };
        } else {
          statusMap[app.id] = { exists: false, landlordSigned: false, tenantSigned: false, fullySigned: false };
        }
      } catch (err) {
        console.error('Error checking lease status:', err);
        statusMap[app.id] = { exists: false, landlordSigned: false, tenantSigned: false, fullySigned: false };
      }
    }
    
    setLeaseStatus(statusMap);
  };

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

      // Add owner_id for new properties (use logged-in manager's ID)
      if (!editingProperty) {
        if (!userProfile?.id) {
          showToast('Error: User profile not found. Please refresh and try again.', 'error');
          return;
        }
        (propertyData as any).owner_id = userProfile.id;
        console.log('🏠 [Property] Creating property for manager:', userProfile.email, 'ID:', userProfile.id);
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

  // Maintenance handlers
  const handleAddMaintenance = () => {
    setEditingMaintenance(null);
    setShowMaintenanceForm(true);
  };

  const handleEditMaintenance = (maintenance: MaintenanceRequest) => {
    setEditingMaintenance(maintenance);
    setShowMaintenanceForm(true);
  };

  const handleMaintenanceSubmit = async (maintenanceData: Partial<MaintenanceRequest>) => {
    try {
      const url = editingMaintenance 
        ? `${API_URL}/api/maintenance/${editingMaintenance.id}`
        : `${API_URL}/api/maintenance`;
      
      const method = editingMaintenance ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(maintenanceData),
      });

      const result = await response.json();

      if (result.success) {
        showToast(
          editingMaintenance ? 'Maintenance request updated!' : 'Maintenance request created!',
          'success'
        );
        setShowMaintenanceForm(false);
        setEditingMaintenance(null);
        fetchData();
      } else {
        showToast(result.error || 'Failed to save maintenance request', 'error');
      }
    } catch (error) {
      console.error('Error saving maintenance request:', error);
      showToast('Error saving maintenance request', 'error');
    }
  };

  const handleUpdateMaintenanceStatus = async (id: string, status: string) => {
    try {
      const response = await fetch(`${API_URL}/api/maintenance/${id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      const result = await response.json();

      if (result.success) {
        showToast(`Status updated to ${status}!`, 'success');
        fetchData();
      } else {
        showToast('Failed to update status', 'error');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      showToast('Error updating status', 'error');
    }
  };

  const handleCompleteMaintenance = async (id: string, actualCost: number) => {
    try {
      const response = await fetch(`${API_URL}/api/maintenance/${id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ actual_cost_usdc: actualCost }),
      });

      const result = await response.json();

      if (result.success) {
        showToast('Maintenance request completed!', 'success');
        fetchData();
      } else {
        showToast('Failed to complete request', 'error');
      }
    } catch (error) {
      console.error('Error completing maintenance:', error);
      showToast('Error completing maintenance', 'error');
    }
  };

  const handleDeleteMaintenance = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this maintenance request?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/maintenance/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        showToast('Maintenance request deleted!', 'success');
        fetchData();
      } else {
        showToast('Failed to delete request', 'error');
      }
    } catch (error) {
      console.error('Error deleting maintenance:', error);
      showToast('Error deleting maintenance', 'error');
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
      console.log('📊 [Dashboard] Starting data fetch...');
      console.log('👤 [Dashboard] Current user:', userProfile?.email, 'Role:', userProfile?.role);
      setLoading(true);
      
      // For managers, fetch only their data
      const managerId = userProfile?.role === 'manager' && userProfile?.id ? userProfile.id : null;
      
      // Build URLs with manager_id parameter where applicable
      const propertiesUrl = managerId
        ? `${API_URL}/api/properties?manager_id=${managerId}`
        : `${API_URL}/api/properties`;
      
      const statsUrl = managerId
        ? `${API_URL}/api/dashboard/stats?manager_id=${managerId}`
        : `${API_URL}/api/dashboard/stats`;
      
      const leasesUrl = managerId
        ? `${API_URL}/api/leases?manager_id=${managerId}`
        : `${API_URL}/api/leases`;
      
      const maintenanceUrl = managerId
        ? `${API_URL}/api/maintenance?manager_id=${managerId}`
        : `${API_URL}/api/maintenance`;
      
      const paymentsUrl = managerId
        ? `${API_URL}/api/payments?manager_id=${managerId}`
        : `${API_URL}/api/payments`;
      
      const applicationsUrl = managerId
        ? `${API_URL}/api/applications?manager_id=${managerId}`
        : `${API_URL}/api/applications`;
      
      console.log('🏛️ [Dashboard] Fetching properties from:', propertiesUrl);
      console.log('📊 [Dashboard] Fetching stats from:', statsUrl);
      
      // Fetch all data with individual error handling
      console.log('🔄 [Dashboard] Fetching stats...');
      const statsRes = await fetch(statsUrl).catch(() => null);
      console.log('🔄 [Dashboard] Fetching properties...');
      const propsRes = await fetch(propertiesUrl).catch(() => null);
      console.log('🔄 [Dashboard] Fetching leases...');
      const leasesRes = await fetch(leasesUrl).catch(() => null);
      console.log('🔄 [Dashboard] Fetching maintenance...');
      const maintenanceRes = await fetch(maintenanceUrl).catch(() => null);
      console.log('🔄 [Dashboard] Fetching payments...');
      const paymentsRes = await fetch(paymentsUrl).catch(() => null);
      console.log('🔄 [Dashboard] Fetching applications...');
      const applicationsRes = await fetch(applicationsUrl).catch(() => null);

      // Parse responses with fallbacks
      console.log('📦 [Dashboard] Parsing responses...');
      const statsData = statsRes ? await statsRes.json().catch(() => ({ success: false })) : { success: false };
      const propsData = propsRes ? await propsRes.json().catch(() => ({ success: false })) : { success: false };
      const leasesData = leasesRes ? await leasesRes.json().catch(() => ({ success: false })) : { success: false };
      const maintenanceData = maintenanceRes ? await maintenanceRes.json().catch(() => ({ success: false })) : { success: false };
      const paymentsData = paymentsRes ? await paymentsRes.json().catch(() => ({ success: false })) : { success: false };
      const applicationsData = applicationsRes ? await applicationsRes.json().catch(() => ({ success: false })) : { success: false };

      console.log('📊 [Dashboard] API Response Summary:');
      console.log('   Stats:', statsData.success ? '✅' : '❌', statsData);
      console.log('   Properties:', propsData.success ? '✅' : '❌', propsData.data?.length || 0, 'items');
      console.log('   Leases:', leasesData.success ? '✅' : '❌', leasesData.data?.length || 0, 'items');
      console.log('   Maintenance:', maintenanceData.success ? '✅' : '❌', maintenanceData.data?.length || 0, 'items');
      console.log('   Payments:', paymentsData.success ? '✅' : '❌', paymentsData.data?.length || 0, 'items');
      console.log('   Applications:', applicationsData.success ? '✅' : '❌', applicationsData.data?.length || 0, 'items');

      // Update state with defaults for failed requests
      if (statsData.success) {
        console.log('✅ [Dashboard] Setting stats:', statsData.data);
        setStats(statsData.data);
      } else {
        console.error('❌ [Dashboard] Stats failed, using defaults');
      }
      
      if (propsData.success) {
        console.log('✅ [Dashboard] Setting properties:', propsData.data?.length || 0);
        setProperties(propsData.data || []);
      } else {
        console.error('❌ [Dashboard] Properties failed');
      }
      
      if (leasesData.success) setLeases(leasesData.data || []);
      if (maintenanceData.success) setMaintenance(maintenanceData.data || []);
      if (paymentsData.success) setPayments(paymentsData.data || []);
      if (applicationsData.success) {
        const apps = applicationsData.data || [];
        setApplications(apps);
        // Check lease status for approved applications
        await checkLeaseStatusForApps(apps);
      } else {
        console.warn('⚠️  [Dashboard] Applications endpoint failed, using empty array');
        setApplications([]);
      }
      
      console.log('✅ [Dashboard] Data fetch complete!');
    } catch (error) {
      console.error('❌ [Dashboard] Error fetching data:', error);
    } finally {
      setLoading(false);
      console.log('🏁 [Dashboard] Loading state set to false');
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
            {['dashboard', 'properties', 'applications', 'leases', 'payments', 'analytics', 'maintenance', 'notifications'].map((tab) => (
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

        {activeTab === 'applications' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Application Management</h2>
              <div className="flex gap-4 mb-6">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="submitted">Submitted</option>
                  <option value="under_review">Under Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            {applications.filter(app => filterStatus === 'all' || app.status === filterStatus).length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <div className="text-6xl mb-4">📋</div>
                <p className="text-gray-500 text-lg">No applications found</p>
                <p className="text-gray-400 text-sm mt-2">Applications will appear here when prospective tenants apply</p>
              </div>
            ) : (
              <div className="space-y-4">
                {applications
                  .filter(app => filterStatus === 'all' || app.status === filterStatus)
                  .sort((a, b) => b.ai_compatibility_score - a.ai_compatibility_score)
                  .map((app, index) => (
                  <div key={`${app.id}-${index}`} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-800">{app.applicant?.full_name || 'Unknown Applicant'}</h3>
                        <p className="text-gray-600">{app.property?.title || 'Unknown Property'}</p>
                        <p className="text-sm text-gray-500 mt-1">Applied {new Date(app.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className={`text-3xl font-bold ${
                            app.ai_compatibility_score >= 75 ? 'text-green-600' :
                            app.ai_compatibility_score >= 60 ? 'text-blue-600' :
                            app.ai_compatibility_score >= 45 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {app.ai_compatibility_score}
                          </div>
                          <div className="text-xs text-gray-500">Score</div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          app.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                          app.status === 'under_review' ? 'bg-yellow-100 text-yellow-800' :
                          app.status === 'approved' ? 'bg-green-100 text-green-800' :
                          app.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {app.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                      <div>
                        <span className="text-gray-600">Income:</span>
                        <span className="ml-2 font-semibold">${app.monthly_income_usdc.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Ratio:</span>
                        <span className="ml-2 font-semibold">
                          {(app.monthly_income_usdc / (app.property?.monthly_rent_usdc || 1)).toFixed(2)}x
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Move-in:</span>
                        <span className="ml-2 font-semibold">
                          {new Date(app.requested_move_in_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => setSelectedApplication(app)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Review Details
                      </button>
                      {app.status === 'approved' && (
                        <>
                          <button
                            onClick={() => setChatApplication(app)}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                          >
                            💬 Chat
                          </button>
                          
                          {/* Lease Status Indicator for Manager */}
                          {leaseStatus[app.id]?.exists ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  // Find the lease ID for this application
                                  fetch(`${API_URL}/api/leases/by-application/${app.id}`)
                                    .then(res => res.json())
                                    .then(result => {
                                      if (result.success && result.data) {
                                        navigate(`/lease/review/${result.data.id}`);
                                      }
                                    });
                                }}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                              >
                                📋 View Lease
                              </button>
                              {leaseStatus[app.id]?.fullySigned ? (
                                <span className="px-3 py-2 bg-green-100 border-2 border-green-300 text-green-700 rounded-lg font-medium text-sm">
                                  ✅ Fully Signed
                                </span>
                              ) : leaseStatus[app.id]?.tenantSigned ? (
                                <span className="px-3 py-2 bg-blue-100 border-2 border-blue-300 text-blue-700 rounded-lg font-medium text-sm">
                                  🖊️ Tenant Signed - Your Turn!
                                </span>
                              ) : leaseStatus[app.id]?.landlordSigned ? (
                                <span className="px-3 py-2 bg-yellow-100 border-2 border-yellow-300 text-yellow-700 rounded-lg font-medium text-sm">
                                  ⏳ Awaiting Tenant Signature
                                </span>
                              ) : (
                                <span className="px-3 py-2 bg-gray-100 border-2 border-gray-300 text-gray-700 rounded-lg font-medium text-sm">
                                  📝 Lease Created - Sign or Send
                                </span>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={async () => {
                                try {
                                  showToast('Generating lease...', 'info');
                                  const response = await fetch(`${API_URL}/api/leases/generate`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ application_id: app.id })
                                  });
                                  const result = await response.json();
                                  if (result.success) {
                                    showToast('Lease generated successfully!', 'success');
                                    // Navigate to lease review page using React Router
                                    navigate(`/lease/review/${result.data.id}`);
                                  } else {
                                    showToast(result.error || 'Failed to generate lease', 'error');
                                  }
                                } catch (err) {
                                  showToast('Error generating lease', 'error');
                                  console.error(err);
                                }
                              }}
                              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                            >
                              📝 Generate Lease
                            </button>
                          )}
                        </>
                      )}
                      {app.status === 'submitted' && (
                        <>
                          <button
                            onClick={async () => {
                              try {
                                console.log('Quick approving application:', app.id);
                                const response = await fetch(`${API_URL}/api/applications/${app.id}/status`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ status: 'approved', reviewed_by: user?.id })
                                });
                                const result = await response.json();
                                console.log('Quick approval response:', result);
                                
                                if (result.success || response.ok) {
                                  showToast('Application approved! ✅', 'success');
                                  await fetchData();
                                } else {
                                  showToast(result.error || 'Failed to approve', 'error');
                                }
                              } catch (err) {
                                console.error('Error approving:', err);
                                showToast('Error approving application', 'error');
                              }
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={async () => {
                              if (!window.confirm('Are you sure you want to reject this application?')) return;
                              try {
                                console.log('Quick rejecting application:', app.id);
                                const response = await fetch(`${API_URL}/api/applications/${app.id}/status`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ status: 'rejected', reviewed_by: user?.id })
                                });
                                const result = await response.json();
                                console.log('Quick rejection response:', result);
                                
                                if (result.success || response.ok) {
                                  showToast('Application rejected', 'info');
                                  await fetchData();
                                } else {
                                  showToast(result.error || 'Failed to reject', 'error');
                                }
                              } catch (err) {
                                console.error('Error rejecting:', err);
                                showToast('Error rejecting application', 'error');
                              }
                            }}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                          >
                            ✕ Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Application Detail Modal */}
            <ApplicationReviewModal
              application={selectedApplication}
              onClose={() => setSelectedApplication(null)}
              onApprove={async (notes) => {
                try {
                  console.log('Approving application:', selectedApplication!.id);
                  
                  // Prepare update payload - don't send reviewed_by to avoid FK constraint issues
                  const updatePayload: any = {
                    status: 'approved',
                    manager_notes: notes
                  };
                  
                  // Only include reviewed_by if we have a valid user ID
                  // (commenting out for now to avoid FK constraint issues)
                  // if (user?.id) {
                  //   updatePayload.reviewed_by = user.id;
                  // }
                  
                  const response = await fetch(`${API_URL}/api/applications/${selectedApplication!.id}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatePayload)
                  });
                  
                  if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Approval failed:', errorText);
                    throw new Error(`Server error: ${response.status}`);
                  }
                  
                  const result = await response.json();
                  console.log('Approval response:', result);

                  if (result.success) {
                    showToast('Application approved successfully! ✅', 'success');
                    setSelectedApplication(null);
                    await fetchData();
                  } else {
                    const errorMsg = result.error || 'Failed to approve application';
                    showToast(errorMsg, 'error');
                    console.error('Approval error:', errorMsg);
                  }
                } catch (err: any) {
                  console.error('Error approving application:', err);
                  const errorMsg = err.message || 'Error approving application';
                  showToast(errorMsg, 'error');
                }
              }}
              onReject={async (notes) => {
                try {
                  console.log('Rejecting application:', selectedApplication!.id);
                  
                  // Prepare update payload - don't send reviewed_by to avoid FK constraint issues
                  const updatePayload: any = {
                    status: 'rejected',
                    manager_notes: notes
                  };
                  
                  // Only include reviewed_by if we have a valid user ID
                  // (commenting out for now to avoid FK constraint issues)
                  // if (user?.id) {
                  //   updatePayload.reviewed_by = user.id;
                  // }
                  
                  const response = await fetch(`${API_URL}/api/applications/${selectedApplication!.id}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatePayload)
                  });
                  
                  if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Rejection failed:', errorText);
                    throw new Error(`Server error: ${response.status}`);
                  }
                  
                  const result = await response.json();
                  console.log('Rejection response:', result);

                  if (result.success) {
                    showToast('Application rejected', 'info');
                    setSelectedApplication(null);
                    await fetchData();
                  } else {
                    const errorMsg = result.error || 'Failed to reject application';
                    showToast(errorMsg, 'error');
                    console.error('Rejection error:', errorMsg);
                  }
                } catch (err: any) {
                  console.error('Error rejecting application:', err);
                  const errorMsg = err.message || 'Error rejecting application';
                  showToast(errorMsg, 'error');
                }
              }}
              userId={user?.id}
            />

            {/* Chat Modal */}
            {chatApplication && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="max-w-4xl w-full">
                  <ChatBox
                    applicationId={chatApplication.id}
                    conversationType="application"
                    currentUserId={user?.id || ''}
                    otherUserId={chatApplication.applicant_id}
                    otherUserName={chatApplication.applicant?.full_name || 'Applicant'}
                    otherUserRole="prospective_tenant"
                    onClose={() => setChatApplication(null)}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && <PaymentAnalytics />}

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
              <button
                onClick={handleAddMaintenance}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                + New Request
              </button>
            </div>
            {filteredMaintenance.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-500 text-lg">No maintenance requests found</p>
                <p className="text-gray-400 text-sm mt-2">Try adjusting your search or filter</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredMaintenance.map((req) => (
                <div key={req.id} className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{req.title}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getPriorityColor(req.priority)}`}>
                          {req.priority}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(req.status)}`}>
                          {req.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{req.property?.title || 'Unknown Property'}</p>
                      <p className="text-sm text-gray-500 mb-2">Category: <span className="capitalize">{req.category.replace('_', ' ')}</span></p>
                      {req.description && (
                        <p className="text-sm text-gray-600 mt-2">{req.description}</p>
                      )}
                      {req.assigned_to && (
                        <p className="text-sm text-blue-600 mt-2">
                          👷 Assigned to: {req.assigned_to}
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-2xl font-bold text-gray-900">${req.estimated_cost_usdc}</div>
                      <div className="text-sm text-gray-500">Estimated</div>
                      {req.actual_cost_usdc !== undefined && req.actual_cost_usdc > 0 && (
                        <div className="mt-2">
                          <div className="text-lg font-semibold text-green-700">${req.actual_cost_usdc}</div>
                          <div className="text-xs text-green-600">Actual</div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="mt-4 pt-4 border-t flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {req.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleUpdateMaintenanceStatus(req.id, 'approved')}
                            className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => handleUpdateMaintenanceStatus(req.id, 'rejected')}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                          >
                            ✕ Reject
                          </button>
                        </>
                      )}
                      {req.status === 'approved' && (
                        <button
                          onClick={() => handleUpdateMaintenanceStatus(req.id, 'in_progress')}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                        >
                          🛠️ Start Work
                        </button>
                      )}
                      {req.status === 'in_progress' && (
                        <button
                          onClick={() => {
                            const cost = prompt('Enter actual cost (USDC):', req.estimated_cost_usdc?.toString());
                            if (cost) handleCompleteMaintenance(req.id, parseFloat(cost));
                          }}
                          className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200"
                        >
                          ✔️ Complete
                        </button>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditMaintenance(req)}
                        className="text-blue-600 hover:text-blue-900 text-sm"
                        title="Edit"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDeleteMaintenance(req.id)}
                        className="text-red-600 hover:text-red-900 text-sm"
                        title="Delete"
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

        {activeTab === 'notifications' && (
          <VoiceNotifications userId={user?.id} />
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

      {/* Maintenance Form Modal */}
      {showMaintenanceForm && (
        <MaintenanceForm
          maintenance={editingMaintenance}
          onClose={() => {
            setShowMaintenanceForm(false);
            setEditingMaintenance(null);
          }}
          onSubmit={handleMaintenanceSubmit}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { user, userProfile, loading, signOut } = useAuth();
  const [loadTimeout, setLoadTimeout] = useState(false);
  const [showPublicProperties, setShowPublicProperties] = useState(false);

  // Safety timeout - if loading takes more than 20 seconds, show error
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        console.error('❌ Loading timeout - forcing stop after 20s');
        setLoadTimeout(true);
      }, 20000); // Increased to 20s to give more time
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [loading]);

  // Debug logging
  console.log('🔍 AppContent Debug:', {
    loading,
    user: user?.email,
    userProfile: userProfile,
    role: userProfile?.role,
    loadTimeout
  });

  // Loading timeout error state
  if (loadTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-6">
          <div className="text-red-600 text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Loading Timeout</h2>
          <p className="text-gray-600 mb-2">
            The application took too long to load. This might be due to cached data.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Since it works in incognito mode, your browser cache is likely corrupted.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => {
                // Clear all browser storage
                localStorage.clear();
                sessionStorage.clear();
                // Clear IndexedDB (Supabase auth)
                if (window.indexedDB) {
                  window.indexedDB.databases().then(dbs => {
                    dbs.forEach(db => {
                      if (db.name) {
                        window.indexedDB.deleteDatabase(db.name);
                      }
                    });
                  });
                }
                // Force hard reload
                window.location.reload();
              }}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              🧼 Clear Cache & Reload
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
            >
              🔄 Just Reload
            </button>
          </div>
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-left">
            <p className="text-sm font-medium text-blue-900 mb-2">Or manually clear cache:</p>
            <ol className="text-xs text-blue-800 space-y-1">
              <li>1. Press <kbd className="px-2 py-1 bg-white rounded border">Ctrl + Shift + Delete</kbd></li>
              <li>2. Select "Cached images and files"</li>
              <li>3. Click "Clear data"</li>
              <li>4. Reload this page</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading RentFlow AI...</p>
          <p className="mt-2 text-sm text-gray-500">This should only take a few seconds</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show public property listings
  if (!user) {
    // If user explicitly requests old property list (from a button)
    if (showPublicProperties) {
      return <PublicPropertyList onBack={() => setShowPublicProperties(false)} />;
    }
    
    // Default: Show new public listings page (no auth required)
    return <PublicPropertyListings />;
  }

  // User authenticated but profile failed to load
  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-6">
          <div className="text-yellow-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Profile Load Failed</h2>
          <p className="text-gray-600 mb-2">
            Your account is authenticated but we couldn't load your profile from the database.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            This might be due to a slow connection to Supabase or a database issue.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm font-medium text-blue-900 mb-2">Quick Fixes:</p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Check your internet connection</li>
              <li>• Try disabling VPN if enabled</li>
              <li>• Clear browser cache (Ctrl+Shift+Delete)</li>
              <li>• Try incognito/private mode</li>
            </ul>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              🔄 Try Again
            </button>
            <button
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.reload();
              }}
              className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors"
            >
              🧼 Clear Cache & Reload
            </button>
            <button
              onClick={signOut}
              className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
            >
              🚪 Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated - route based on role
  console.log('==================================================');
  console.log('🔀 [App.tsx] Routing Decision for User:');
  console.log('   Email:', user?.email);
  console.log('   Auth ID:', user?.id);
  console.log('   Profile Role:', userProfile.role);
  console.log('   Profile User Type:', userProfile.user_type);
  console.log('   Full Profile:', userProfile);
  console.log('==================================================');
  
  if (userProfile.role === 'tenant') {
    console.log('✅ [App.tsx] Role is TENANT - Showing TenantDashboard');
    return <TenantDashboard />;
  }

  if (userProfile.role === 'prospective_tenant') {
    console.log('✅ [App.tsx] Role is PROSPECTIVE_TENANT - Showing PublicPropertyListings');
    return <PublicPropertyListings />;
  }

  console.log('✅ [App.tsx] Role is MANAGER (or default) - Showing Manager Dashboard');
  console.log('   If you see a blank screen, check the browser Network tab for failed API calls');
  // Default to manager/admin dashboard
  return <Dashboard />;
}

// Add routing wrapper for property detail pages
export default function AppWrapper() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/property/:id" element={<PropertyDetail />} />
        <Route path="/apply/:id" element={<PropertyApplicationForm />} />
        <Route path="/my-applications" element={<MyApplications />} />
        <Route path="/lease/sign/:id" element={<LeaseSigningPage />} />
        <Route path="/lease/review/:id" element={<LeaseReviewPage />} />
        <Route path="/login" element={<AuthWall mode="login" />} />
        <Route path="/signup" element={<AuthWall mode="signup" />} />
      </Routes>
    </AuthProvider>
  );
}
