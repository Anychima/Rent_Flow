import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MapPin, Home, Bed, Bath, DollarSign, Trash2, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

interface SavedProperty {
  id: string;
  property_id: string;
  notes: string | null;
  created_at: string;
  property: {
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
    image_urls?: string[];
    amenities: string[];
  };
}

const SavedPropertiesPage: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [savedProperties, setSavedProperties] = useState<SavedProperty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userProfile?.id) {
      fetchSavedProperties();
    } else {
      navigate('/login');
    }
  }, [userProfile, navigate]);

  const fetchSavedProperties = async () => {
    if (!userProfile?.id) return;

    try {
      const response = await axios.get(`http://localhost:3001/api/saved-properties/user/${userProfile.id}`);
      if (response.data.success) {
        setSavedProperties(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching saved properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeSavedProperty = async (savedId: string) => {
    try {
      await axios.delete(`http://localhost:3001/api/saved-properties/${savedId}`);
      setSavedProperties(savedProperties.filter(sp => sp.id !== savedId));
    } catch (error) {
      console.error('Error removing saved property:', error);
      alert('Failed to remove property');
    }
  };

  const getPlaceholderImage = (propertyType: string) => {
    const propertyTypeImages: { [key: string]: string } = {
      apartment: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&h=400&fit=crop',
      house: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&h=400&fit=crop',
      condo: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&h=400&fit=crop',
      studio: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&h=400&fit=crop',
    };
    return propertyTypeImages[propertyType] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=400&fit=crop';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your saved properties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
                <Heart className="w-10 h-10 text-red-500 fill-current" />
                Saved Properties
              </h1>
              <p className="text-gray-600 mt-2">
                {savedProperties.length} {savedProperties.length === 1 ? 'property' : 'properties'} saved
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {savedProperties.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
              <Heart className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No saved properties yet</h3>
            <p className="text-gray-600 mb-6">Start exploring and save your favorite properties</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
            >
              Browse Properties
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {savedProperties.map((saved) => {
              const property = saved.property;
              const mainImage = property.image_urls?.[0] || getPlaceholderImage(property.property_type);

              return (
                <div
                  key={saved.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
                >
                  {/* Property Image */}
                  <div className="relative h-56 bg-gradient-to-br from-blue-50 to-indigo-100">
                    <img
                      src={mainImage}
                      alt={property.title}
                      className="w-full h-full object-cover"
                      onClick={() => navigate(`/property/${property.id}`)}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Remove this property from your saved list?')) {
                          removeSavedProperty(saved.id);
                        }
                      }}
                      className="absolute top-3 right-3 bg-red-500 text-white p-2.5 rounded-full hover:bg-red-600 transition-all shadow-lg"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <div className="absolute top-3 left-3 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold uppercase">
                      {property.property_type}
                    </div>
                  </div>

                  {/* Property Details */}
                  <div className="p-5" onClick={() => navigate(`/property/${property.id}`)}>
                    <h3 className="text-xl font-bold text-gray-900 mb-2 truncate hover:text-blue-600 transition-colors">
                      {property.title}
                    </h3>

                    <div className="flex items-center text-gray-600 text-sm mb-3">
                      <MapPin className="w-4 h-4 mr-1.5 text-blue-600" />
                      <span className="truncate font-medium">{property.city}, {property.state}</span>
                    </div>

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

                    {/* Price */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center">
                          <DollarSign className="w-6 h-6 text-green-600" />
                          <span className="text-2xl font-bold text-gray-900">
                            {property.monthly_rent_usdc.toLocaleString()}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 ml-1">USDC per month</span>
                      </div>
                    </div>

                    {/* Saved Date */}
                    <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
                      Saved on {new Date(saved.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedPropertiesPage;
