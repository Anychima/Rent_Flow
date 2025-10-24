import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Home, Bed, Bath, DollarSign, Heart, Filter, User, LogOut, FileText } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

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
  images: string[];
  amenities: string[];
  pet_friendly: boolean;
  parking_available: boolean;
  view_count: number;
  application_count: number;
}

const PublicPropertyListings: React.FC = () => {
  const navigate = useNavigate();
  const { user, userProfile, signOut } = useAuth();
  
  // Debug logging for authentication state
  console.log('🏠 [PublicPropertyListings] Component rendered');
  console.log('   User:', user);
  console.log('   UserProfile:', userProfile);
  console.log('   Is Authenticated:', !!user && !!userProfile);
  
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [maxRent, setMaxRent] = useState<number>(10000);
  const [minBedrooms, setMinBedrooms] = useState<number>(0);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [properties, searchTerm, filterType, maxRent, minBedrooms]);

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

  const applyFilters = () => {
    let filtered = [...properties];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.address.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Property type filter
    if (filterType !== 'all') {
      filtered = filtered.filter((p) => p.property_type === filterType);
    }

    // Max rent filter
    filtered = filtered.filter((p) => p.monthly_rent_usdc <= maxRent);

    // Min bedrooms filter
    if (minBedrooms > 0) {
      filtered = filtered.filter((p) => p.bedrooms >= minBedrooms);
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

    const mainImage = (property.images && property.images.length > 0) 
      ? property.images[0] 
      : getPlaceholderImage();

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
            
            {/* Save Button */}
            <button 
              className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full p-2.5 hover:bg-white transition-all duration-200 shadow-lg hover:scale-110"
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Implement save functionality
              }}
            >
              <Heart className="w-5 h-5 text-gray-700 hover:text-red-500 transition-colors" />
            </button>
            
            {/* Property Type Badge */}
            <div className="absolute top-3 left-3 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide shadow-lg">
              {property.property_type}
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
      {/* Header */}
      <div className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                🏠 RentFlow AI
              </h1>
              <p className="text-gray-600 mt-2 flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Find your perfect home on the blockchain
              </p>
            </div>
            <div className="flex space-x-3">
              {user && userProfile ? (
                // Authenticated user menu
                <>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 px-4 py-2 bg-blue-50 rounded-lg">
                      <User className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">{userProfile.email}</span>
                    </div>
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
          </div>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Search Bar */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by city, address, or property name..."
                className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-700 placeholder-gray-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-8 py-4 rounded-xl flex items-center gap-2 font-semibold transition-all duration-200 ${
                showFilters 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-500'
              }`}
            >
              <Filter className="w-5 h-5" />
              Filters
              {showFilters && <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Active</span>}
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-100 grid grid-cols-1 md:grid-cols-4 gap-6 animate-fadeIn">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🏠 Property Type
                </label>
                <select
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="all">All Types</option>
                  <option value="apartment">Apartment</option>
                  <option value="house">House</option>
                  <option value="condo">Condo</option>
                  <option value="studio">Studio</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  💰 Max Rent (USDC)
                </label>
                <input
                  type="number"
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200"
                  value={maxRent}
                  onChange={(e) => setMaxRent(Number(e.target.value))}
                  min="0"
                  step="100"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🛏️ Min Bedrooms
                </label>
                <select
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200"
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

              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterType('all');
                    setMaxRent(10000);
                    setMinBedrooms(0);
                  }}
                  className="w-full px-4 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-300 font-semibold transition-all duration-200"
                >
                  ↻ Clear Filters
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

        {filteredProperties.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
              <Home className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No properties found</h3>
            <p className="text-gray-600 mb-6">Try adjusting your search or filters</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterType('all');
                setMaxRent(10000);
                setMinBedrooms(0);
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
            ✨ Powered by Solana & Circle USDC | Secure, Fast, Transparent
          </p>
        </div>
      </div>
    </div>
  );
};

export default PublicPropertyListings;
