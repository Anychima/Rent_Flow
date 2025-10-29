import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Home, Bed, Bath, DollarSign, Heart, Filter, User, LogOut, FileText, BarChart2, Menu, X } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import PropertyComparisonModal from './PropertyComparisonModal';
import { PropertyListSkeleton } from './SkeletonLoader';

interface Property {
  id: string;
  title: string;
  description: string;
  address: string;
  city: string;
  state: string;
  monthly_rent_usdc: number;
  bedrooms: number;
  bathrooms: number;
  square_feet: number;
  property_type: string;
  image_urls?: string[]; // Changed from images to image_urls to match database
  amenities: string[];
  pet_friendly: boolean;
  parking_available: boolean;
  view_count: number;
  application_count: number;
  availability_status?: 'available' | 'pending_tenant_signature' | 'pending_landlord_signature' | 'lease_signed' | 'rented';
}

const PublicPropertyListings: React.FC = () => {
  const navigate = useNavigate();
  const { user, userProfile, signOut } = useAuth();
  
  console.log('🏠 [PublicPropertyListings] Component rendered');
  console.log('   User:', user);
  console.log('   UserProfile:', userProfile);
  console.log('   Is Authenticated:', !!user && !!userProfile);
  
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 10000 });
  const [minBedrooms, setMinBedrooms] = useState<number>(0);
  const [minBathrooms, setMinBathrooms] = useState<number>(0);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'popular'>('newest');
  const [showFilters, setShowFilters] = useState(false);
  
  // Saved properties state
  const [savedPropertyIds, setSavedPropertyIds] = useState<Set<string>>(new Set());
  
  // Comparison state
  const [compareList, setCompareList] = useState<Property[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  
  // Mobile menu state
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Available amenities for filtering
  const availableAmenities = [
    'parking', 'gym', 'pool', 'pet_friendly', 'in_unit_laundry',
    'dishwasher', 'air_conditioning', 'balcony', 'hardwood_floors'
  ];

  useEffect(() => {
    fetchProperties();
    if (userProfile?.id) {
      fetchSavedProperties();
    }
  }, [userProfile]);

  useEffect(() => {
    applyFilters();
  }, [properties, searchTerm, filterType, priceRange, minBedrooms, minBathrooms, selectedAmenities, sortBy]);

  const fetchProperties = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/properties/public');
      if (response.data.success) {
        setProperties(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedProperties = async () => {
    if (!userProfile?.id) return;
    
    try {
      const response = await axios.get(`http://localhost:3001/api/saved-properties/user/${userProfile.id}`);
      if (response.data.success) {
        const savedIds = new Set<string>(response.data.data.map((sp: any) => sp.property_id));
        setSavedPropertyIds(savedIds);
      }
    } catch (error) {
      console.error('Error fetching saved properties:', error);
    }
  };

  const toggleSaveProperty = async (propertyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!userProfile?.id) {
      alert('Please login to save properties');
      return;
    }

    const isSaved = savedPropertyIds.has(propertyId);

    try {
      if (isSaved) {
        await axios.delete(`http://localhost:3001/api/saved-properties/user/${userProfile.id}/property/${propertyId}`);
        setSavedPropertyIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(propertyId);
          return newSet;
        });
      } else {
        await axios.post('http://localhost:3001/api/saved-properties', {
          userId: userProfile.id,
          propertyId
        });
        setSavedPropertyIds(prev => new Set([...prev, propertyId]));
      }
    } catch (error: any) {
      console.error('Error toggling saved property:', error);
      if (error.response?.status !== 409) {
        alert('Failed to update saved properties');
      }
    }
  };

  const toggleCompare = (property: Property, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const isInCompare = compareList.some(p => p.id === property.id);
    
    if (isInCompare) {
      setCompareList(compareList.filter(p => p.id !== property.id));
    } else if (compareList.length < 3) {
      setCompareList([...compareList, property]);
    } else {
      alert('You can only compare up to 3 properties at once');
    }
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev => 
      prev.includes(amenity) 
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  };

  const togglePropertyType = (type: string) => {
    setFilterType(prev => 
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const applyFilters = () => {
    let filtered = [...properties];

    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.address.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType.length > 0) {
      filtered = filtered.filter((p) => filterType.includes(p.property_type));
    }

    filtered = filtered.filter((p) => 
      p.monthly_rent_usdc >= priceRange.min && p.monthly_rent_usdc <= priceRange.max
    );

    if (minBedrooms > 0) {
      filtered = filtered.filter((p) => p.bedrooms >= minBedrooms);
    }

    if (minBathrooms > 0) {
      filtered = filtered.filter((p) => p.bathrooms >= minBathrooms);
    }

    if (selectedAmenities.length > 0) {
      filtered = filtered.filter((p) => 
        selectedAmenities.every(amenity => p.amenities?.includes(amenity))
      );
    }

    switch (sortBy) {
      case 'price_asc':
        filtered.sort((a, b) => a.monthly_rent_usdc - b.monthly_rent_usdc);
        break;
      case 'price_desc':
        filtered.sort((a, b) => b.monthly_rent_usdc - a.monthly_rent_usdc);
        break;
      case 'popular':
        filtered.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
        break;
      case 'newest':
      default:
        break;
    }

    setFilteredProperties(filtered);
  };

  const PropertyCard: React.FC<{ property: Property }> = ({ property }) => {
    // Generate a consistent placeholder image based on property type
    const getPlaceholderImage = () => {
      const propertyTypeImages: { [key: string]: string } = {
        apartment: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&h=400&fit=crop',
        house: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&h=400&fit=crop',
        condo: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&h=400&fit=crop',
        studio: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&h=400&fit=crop',
      };
      return propertyTypeImages[property.property_type] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=400&fit=crop';
    };

    // Use uploaded images if available, otherwise use placeholder
    const mainImage = (property.image_urls && property.image_urls.length > 0) 
      ? property.image_urls[0] 
      : getPlaceholderImage();

    // Get status badge configuration
    const getStatusBadge = () => {
      const status = property.availability_status || 'available';
      
      const statusConfig: { [key: string]: { label: string; bgColor: string; icon: string } } = {
        available: { label: 'Available', bgColor: 'bg-green-500', icon: '✓' },
        pending_tenant_signature: { label: 'Tenant Signing', bgColor: 'bg-yellow-500', icon: '✍️' },
        pending_landlord_signature: { label: 'Manager Review', bgColor: 'bg-orange-500', icon: '📋' },
        lease_signed: { label: 'Processing', bgColor: 'bg-blue-500', icon: '⏳' },
        rented: { label: 'Rented', bgColor: 'bg-gray-500', icon: '🏠' },
      };

      return statusConfig[status] || statusConfig.available;
    };

    const statusBadge = getStatusBadge();

    const isSaved = savedPropertyIds.has(property.id);
    const isInCompare = compareList.some(p => p.id === property.id);

    return (
      <div 
        onClick={() => navigate(`/property/${property.id}`)}
        className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
      >
          {/* Property Image */}
          <div className="relative h-56 bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden group">
            <img
              src={mainImage}
              alt={property.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              loading="lazy"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Save Button - Updated */}
            <button 
              className={`absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full p-2.5 hover:bg-white transition-all duration-200 shadow-lg hover:scale-110 ${
                isSaved ? 'text-red-500' : 'text-gray-700'
              }`}
              onClick={(e) => toggleSaveProperty(property.id, e)}
            >
              <Heart className={`w-5 h-5 transition-colors ${isSaved ? 'fill-current' : ''}`} />
            </button>
            
            {/* Compare Button */}
            <button 
              className={`absolute top-3 right-16 backdrop-blur-sm rounded-full p-2.5 transition-all duration-200 shadow-lg hover:scale-110 ${
                isInCompare ? 'bg-blue-600 text-white' : 'bg-white/90 text-gray-700 hover:bg-white'
              }`}
              onClick={(e) => toggleCompare(property, e)}
              title="Compare properties"
            >
              <BarChart2 className="w-5 h-5" />
            </button>
            
            {/* Property Type Badge */}
            <div className="absolute top-3 left-3 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide shadow-lg">
              {property.property_type}
            </div>
            
            {/* Availability Status Badge */}
            <div className={`absolute top-3 right-16 ${statusBadge.bgColor} text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg flex items-center gap-1`}>
              <span>{statusBadge.icon}</span>
              <span>{statusBadge.label}</span>
            </div>
            
            {/* Pet Friendly Badge */}
            {property.amenities?.includes('pet_friendly') && (
              <div className="absolute top-12 left-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg flex items-center gap-1">
                🐾 Pet Friendly
              </div>
            )}
          </div>

          {/* Property Details */}
          <div className="p-5">
            {/* Title */}
            <h3 className="text-xl font-bold text-gray-900 mb-2 truncate hover:text-blue-600 transition-colors">
              {property.title}
            </h3>
            
            {/* Location */}
            <div className="flex items-center text-gray-600 text-sm mb-3">
              <MapPin className="w-4 h-4 mr-1.5 text-blue-600" />
              <span className="truncate font-medium">{property.city}, {property.state}</span>
            </div>

            {/* Description Preview */}
            {property.description && (
              <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                {property.description}
              </p>
            )}

            {/* Property Stats */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
              <div className="flex items-center space-x-4 text-gray-700">
                {property.bedrooms > 0 && (
                  <div className="flex items-center bg-gray-50 px-2 py-1 rounded">
                    <Bed className="w-4 h-4 mr-1.5 text-blue-600" />
                    <span className="text-sm font-semibold">{property.bedrooms}</span>
                  </div>
                )}
                <div className="flex items-center bg-gray-50 px-2 py-1 rounded">
                  <Bath className="w-4 h-4 mr-1.5 text-blue-600" />
                  <span className="text-sm font-semibold">{property.bathrooms}</span>
                </div>
                <div className="flex items-center bg-gray-50 px-2 py-1 rounded">
                  <Home className="w-4 h-4 mr-1.5 text-blue-600" />
                  <span className="text-sm font-semibold">{property.square_feet.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Amenities Pills */}
            {property.amenities && property.amenities.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {property.amenities.slice(0, 3).map((amenity, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700"
                  >
                    {amenity.replace('_', ' ')}
                  </span>
                ))}
                {property.amenities.length > 3 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    +{property.amenities.length - 3} more
                  </span>
                )}
              </div>
            )}

            {/* Price and CTA */}
            <div className="flex items-center justify-between pt-4">
              <div>
                <div className="flex items-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                  <span className="text-2xl font-bold text-gray-900">
                    {property.monthly_rent_usdc.toLocaleString()}
                  </span>
                </div>
                <span className="text-xs text-gray-500 ml-1">USDC per month</span>
              </div>
              <button 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 text-sm font-semibold shadow-md hover:shadow-lg transform hover:scale-105"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/property/${property.id}`);
                }}
              >
                View Details
              </button>
            </div>

            {/* Stats Footer */}
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-xs text-gray-500">
              <span className="flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-1.5"></span>
                {property.view_count || 0} views
              </span>
              <span className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></span>
                {property.application_count || 0} applications
              </span>
            </div>
          </div>
        </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading properties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setShowMobileMenu(false)}
        />
      )}
      
      {/* Mobile Slide-out Menu */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
        showMobileMenu ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="p-6">
          {/* Close Button */}
          <button
            onClick={() => setShowMobileMenu(false)}
            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          
          {/* User Info */}
          {user && userProfile && (
            <div className="mb-8 pt-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {userProfile.full_name?.[0] || userProfile.email[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{userProfile.full_name || 'User'}</p>
                  <p className="text-sm text-gray-500">{userProfile.email}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Menu Items */}
          <nav className="space-y-2">
            <button
              onClick={() => {
                navigate('/');
                setShowMobileMenu(false);
              }}
              className="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors font-medium"
            >
              <Home className="w-5 h-5" />
              <span>Browse Properties</span>
            </button>
            
            {user && userProfile && (
              <>
                <button
                  onClick={() => {
                    navigate('/saved-properties');
                    setShowMobileMenu(false);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors font-medium"
                >
                  <Heart className="w-5 h-5" />
                  <span>Saved Properties</span>
                  {savedPropertyIds.size > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      {savedPropertyIds.size}
                    </span>
                  )}
                </button>
                
                <button
                  onClick={() => {
                    navigate('/my-applications');
                    setShowMobileMenu(false);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors font-medium"
                >
                  <FileText className="w-5 h-5" />
                  <span>My Applications</span>
                </button>
                
                <div className="border-t border-gray-200 my-4"></div>
                
                <button
                  onClick={async () => {
                    await signOut();
                    setShowMobileMenu(false);
                    navigate('/');
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Sign Out</span>
                </button>
              </>
            )}
            
            {!user && (
              <>
                <button
                  onClick={() => {
                    navigate('/login');
                    setShowMobileMenu(false);
                  }}
                  className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  <User className="w-5 h-5 mr-2" />
                  <span>Sign In</span>
                </button>
                
                <button
                  onClick={() => {
                    navigate('/signup');
                    setShowMobileMenu(false);
                  }}
                  className="w-full flex items-center justify-center px-4 py-3 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold"
                >
                  Sign Up
                </button>
              </>
            )}
          </nav>
        </div>
      </div>
      
      {/* Header */}
      <div className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                🏠 RentFlow AI
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-2 flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Find your perfect home on the blockchain
              </p>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex space-x-3">
              {user && userProfile ? (
                // Authenticated user menu
                <>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 px-4 py-2 bg-blue-50 rounded-lg">
                      <User className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">{userProfile.email}</span>
                    </div>
                    <button
                      onClick={() => navigate('/saved-properties')}
                      className="flex items-center space-x-2 px-5 py-2.5 text-gray-700 hover:text-gray-900 font-semibold border border-gray-300 rounded-lg hover:border-gray-400 transition-all duration-200"
                    >
                      <Heart className="w-4 h-4" />
                      <span>Saved ({savedPropertyIds.size})</span>
                    </button>
                    <button
                      onClick={() => navigate('/my-applications')}
                      className="flex items-center space-x-2 px-5 py-2.5 text-gray-700 hover:text-gray-900 font-semibold border border-gray-300 rounded-lg hover:border-gray-400 transition-all duration-200"
                    >
                      <FileText className="w-4 h-4" />
                      <span>My Applications</span>
                    </button>
                    <button
                      onClick={signOut}
                      className="flex items-center space-x-2 px-5 py-2.5 text-red-600 hover:text-red-700 font-semibold border border-red-300 rounded-lg hover:border-red-400 transition-all duration-200"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </>
              ) : (
                // Guest user buttons
                <>
                  <button
                    onClick={() => window.location.href = '/login'}
                    className="px-5 py-2.5 text-gray-700 hover:text-gray-900 font-semibold border border-gray-300 rounded-lg hover:border-gray-400 transition-all duration-200"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => window.location.href = '/signup'}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                  >
                    Sign Up Free
                  </button>
                </>
              )}
            </div>
            
            {/* Mobile Hamburger Menu Button */}
            <button
              onClick={() => setShowMobileMenu(true)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6 text-gray-700" />
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by city, address, or property name..."
                className="w-full pl-12 pr-4 py-3 sm:py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-700 placeholder-gray-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-6 sm:px-8 py-3 sm:py-4 rounded-xl flex items-center justify-center gap-2 font-semibold transition-all duration-200 ${
                showFilters 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-500'
              }`}
            >
              <Filter className="w-5 h-5" />
              <span className="hidden sm:inline">Filters</span>
              {showFilters && <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Active</span>}
            </button>
          </div>

          {/* Enhanced Filter Panel */}
          {showFilters && (
            <div className="mt-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-100 animate-fadeIn space-y-6">
              {/* Property Types - Multi-select */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  🏠 Property Type (select multiple)
                </label>
                <div className="flex flex-wrap gap-2">
                  {['apartment', 'house', 'condo', 'studio'].map((type) => (
                    <button
                      key={type}
                      onClick={() => togglePropertyType(type)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        filterType.includes(type)
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-500'
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range Slider */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    💰 Min Rent (USDC)
                  </label>
                  <input
                    type="number"
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange(prev => ({ ...prev, min: Number(e.target.value) }))}
                    min="0"
                    step="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    💰 Max Rent (USDC)
                  </label>
                  <input
                    type="number"
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange(prev => ({ ...prev, max: Number(e.target.value) }))}
                    min="0"
                    step="100"
                  />
                </div>
              </div>

              {/* Bedrooms & Bathrooms */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    🛏️ Min Bedrooms
                  </label>
                  <select
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                    value={minBedrooms}
                    onChange={(e) => setMinBedrooms(Number(e.target.value))}
                  >
                    <option value="0">Any</option>
                    <option value="1">1+</option>
                    <option value="2">2+</option>
                    <option value="3">3+</option>
                    <option value="4">4+</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    🛿 Min Bathrooms
                  </label>
                  <select
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                    value={minBathrooms}
                    onChange={(e) => setMinBathrooms(Number(e.target.value))}
                  >
                    <option value="0">Any</option>
                    <option value="1">1+</option>
                    <option value="2">2+</option>
                    <option value="3">3+</option>
                  </select>
                </div>
              </div>

              {/* Amenities - Multi-select */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  ✨ Amenities
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableAmenities.map((amenity) => (
                    <button
                      key={amenity}
                      onClick={() => toggleAmenity(amenity)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        selectedAmenities.includes(amenity)
                          ? 'bg-green-600 text-white shadow-md'
                          : 'bg-white text-gray-700 border border-gray-200 hover:border-green-500'
                      }`}
                    >
                      {amenity.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🔄 Sort By
                </label>
                <select
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                >
                  <option value="newest">Newest First</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="popular">Most Popular</option>
                </select>
              </div>

              {/* Clear Filters Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterType([]);
                    setPriceRange({ min: 0, max: 10000 });
                    setMinBedrooms(0);
                    setMinBathrooms(0);
                    setSelectedAmenities([]);
                    setSortBy('newest');
                  }}
                  className="px-6 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-300 font-semibold transition-all duration-200"
                >
                  ↻ Clear All Filters
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Properties Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">
              Available Properties <span className="text-blue-600">({filteredProperties.length})</span>
            </h2>
            <p className="text-gray-600 mt-1">Discover your next home powered by blockchain technology</p>
          </div>
        </div>

        {loading ? (
          <PropertyListSkeleton count={6} />
        ) : filteredProperties.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
              <Home className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No properties found</h3>
            <p className="text-gray-600 mb-6">Try adjusting your search or filters</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterType([]);
                setPriceRange({ min: 0, max: 10000 });
                setMinBedrooms(0);
                setMinBathrooms(0);
                setSelectedAmenities([]);
                setSortBy('newest');
              }}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProperties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white py-16 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-4">
            Ready to find your next home? 🏡
          </h2>
          <p className="text-xl mb-8 text-blue-100 max-w-2xl mx-auto">
            Create an account to apply for properties, save your favorites, and experience blockchain-powered renting
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => window.location.href = '/signup'}
              className="inline-block px-10 py-4 bg-white text-blue-600 rounded-xl hover:bg-gray-100 font-bold text-lg shadow-2xl hover:shadow-3xl transition-all duration-200 transform hover:scale-105"
            >
              Get Started Free →
            </button>
            <button
              onClick={() => window.location.href = '/login'}
              className="inline-block px-10 py-4 bg-transparent border-2 border-white text-white rounded-xl hover:bg-white/10 font-bold text-lg transition-all duration-200"
            >
              Sign In
            </button>
          </div>
          <p className="mt-6 text-sm text-blue-100">
            ✨ Powered by Arc & Circle USDC | Secure, Fast, Transparent
          </p>
        </div>
      </div>

      {/* Floating Compare Button */}
      {compareList.length > 0 && (
        <div className="fixed bottom-8 right-8 z-40">
          <button
            onClick={() => setShowComparison(true)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 rounded-full shadow-2xl hover:shadow-3xl transition-all transform hover:scale-105 flex items-center gap-3 font-bold"
          >
            <BarChart2 className="w-5 h-5" />
            Compare ({compareList.length})
          </button>
        </div>
      )}

      {/* Property Comparison Modal */}
      {showComparison && (
        <PropertyComparisonModal
          properties={compareList}
          onClose={() => setShowComparison(false)}
          onRemove={(propertyId) => {
            setCompareList(compareList.filter(p => p.id !== propertyId));
          }}
        />
      )}
    </div>
  );
};

export default PublicPropertyListings;
