import React from 'react';
import { FileText, Calendar, DollarSign, Home, User, AlertCircle } from 'lucide-react';

interface LeaseTerms {
  propertyAddress: string;
  tenantName: string;
  tenantEmail: string;
  landlordName: string;
  monthlyRent: number;
  securityDeposit: number;
  leaseDuration: string;
  startDate: string;
  endDate: string;
  rentDueDay: number;
  lateFeeAmount: number;
  lateFeeGracePeriod: number;
  propertyDetails: {
    bedrooms: number;
    bathrooms: number;
    squareFeet: number;
    propertyType: string;
    amenities: string[];
  };
  standardClauses: string[];
}

interface Lease {
  id: string;
  lease_status: string;
  start_date: string;
  end_date: string;
  monthly_rent_usdc: number;
  security_deposit_usdc: number;
  lease_terms: LeaseTerms;
  special_terms?: {
    petPolicy?: string;
    parking?: string;
    [key: string]: string | undefined;
  };
  tenant_signature?: string;
  landlord_signature?: string;
  tenant_signature_date?: string;
  landlord_signature_date?: string;
  generated_at: string;
}

interface LeaseDocumentProps {
  lease: Lease;
}

const LeaseDocument: React.FC<LeaseDocumentProps> = ({ lease }) => {
  const terms = lease.lease_terms;

  return (
    <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Residential Lease Agreement</h1>
            <p className="text-blue-100">RentFlow AI Property Management Platform</p>
          </div>
          <FileText className="w-16 h-16 opacity-50" />
        </div>
      </div>

      {/* Document Body */}
      <div className="p-8 max-w-4xl mx-auto space-y-8">
        
        {/* Lease Status Badge */}
        <div className="flex items-center justify-center">
          <span className={`
            px-6 py-3 rounded-full text-sm font-bold uppercase tracking-wide
            ${lease.lease_status === 'fully_signed' ? 'bg-green-100 text-green-800 border-2 border-green-300' :
              lease.lease_status === 'active' ? 'bg-blue-100 text-blue-800 border-2 border-blue-300' :
              lease.lease_status === 'pending_tenant' ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300' :
              'bg-gray-100 text-gray-800 border-2 border-gray-300'}
          `}>
            {lease.lease_status.replace('_', ' ')}
          </span>
        </div>

        {/* Key Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 rounded-lg p-6 border-2 border-blue-100">
            <div className="flex items-start space-x-3">
              <Calendar className="w-6 h-6 text-blue-600 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Lease Period</h3>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Start:</span> {new Date(terms.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">End:</span> {new Date(terms.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">Duration:</span> {terms.leaseDuration}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-6 border-2 border-green-100">
            <div className="flex items-start space-x-3">
              <DollarSign className="w-6 h-6 text-green-600 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Financial Terms</h3>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Monthly Rent:</span> ${terms.monthlyRent.toLocaleString()} USDC
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Security Deposit:</span> ${terms.securityDeposit.toLocaleString()} USDC
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">Due:</span> Day {terms.rentDueDay} of each month
                </p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-6 border-2 border-purple-100">
            <div className="flex items-start space-x-3">
              <Home className="w-6 h-6 text-purple-600 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Property</h3>
                <p className="text-sm text-gray-600 font-medium">{terms.propertyAddress}</p>
                <div className="flex items-center space-x-3 mt-2 text-xs text-gray-600">
                  <span>🛏️ {terms.propertyDetails.bedrooms} bed</span>
                  <span>🚿 {terms.propertyDetails.bathrooms} bath</span>
                  <span>📐 {terms.propertyDetails.squareFeet.toLocaleString()} sqft</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-indigo-50 rounded-lg p-6 border-2 border-indigo-100">
            <div className="flex items-start space-x-3">
              <User className="w-6 h-6 text-indigo-600 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Parties</h3>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Tenant:</span> {terms.tenantName}
                </p>
                <p className="text-xs text-gray-500">{terms.tenantEmail}</p>
                <p className="text-sm text-gray-600 mt-2">
                  <span className="font-medium">Landlord:</span> {terms.landlordName}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Late Fees */}
        <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-gray-800 text-sm">Late Payment Policy</h4>
              <p className="text-sm text-gray-600 mt-1">
                A late fee of <span className="font-semibold">${terms.lateFeeAmount.toFixed(2)} USDC</span> will be charged if rent is not received within{' '}
                <span className="font-semibold">{terms.lateFeeGracePeriod} days</span> after the due date.
              </p>
            </div>
          </div>
        </div>

        {/* Property Amenities */}
        {terms.propertyDetails.amenities && terms.propertyDetails.amenities.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-800 mb-3">Property Amenities</h3>
            <div className="flex flex-wrap gap-2">
              {terms.propertyDetails.amenities.map((amenity, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {amenity.replace('_', ' ')}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Special Terms */}
        {lease.special_terms && Object.keys(lease.special_terms).length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-800 mb-3">Special Terms & Conditions</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              {Object.entries(lease.special_terms).map(([key, value]) => (
                value && (
                  <div key={key} className="flex items-start space-x-2">
                    <span className="text-blue-600">•</span>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span> {value}
                    </p>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {/* Standard Lease Clauses */}
        <div>
          <h3 className="font-semibold text-gray-800 mb-3">Standard Lease Terms</h3>
          <div className="space-y-3">
            {terms.standardClauses.map((clause, index) => (
              <div key={index} className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">
                  {index + 1}
                </span>
                <p className="text-sm text-gray-700 pt-0.5">{clause}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Signatures */}
        <div className="border-t-2 border-gray-200 pt-8 mt-8">
          <h3 className="font-semibold text-gray-800 mb-6">Digital Signatures</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Tenant Signature */}
            <div className="border-2 rounded-lg p-6 ${lease.tenant_signature ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-gray-50'}">
              <h4 className="font-semibold text-gray-700 mb-3">Tenant</h4>
              {lease.tenant_signature ? (
                <div>
                  <div className="mb-2">
                    <span className="text-green-600 font-bold">✓ SIGNED</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-medium">Name:</span> {terms.tenantName}
                  </p>
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-medium">Date:</span>{' '}
                    {new Date(lease.tenant_signature_date!).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  <p className="text-xs text-gray-500 font-mono mt-2 break-all">
                    Signature: {lease.tenant_signature.substring(0, 40)}...
                  </p>
                </div>
              ) : (
                <div className="text-gray-500 italic">
                  <p>Awaiting signature</p>
                </div>
              )}
            </div>

            {/* Landlord Signature */}
            <div className={`border-2 rounded-lg p-6 ${lease.landlord_signature ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-gray-50'}`}>
              <h4 className="font-semibold text-gray-700 mb-3">Landlord / Property Manager</h4>
              {lease.landlord_signature ? (
                <div>
                  <div className="mb-2">
                    <span className="text-green-600 font-bold">✓ SIGNED</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-medium">Name:</span> {terms.landlordName}
                  </p>
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-medium">Date:</span>{' '}
                    {new Date(lease.landlord_signature_date!).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  <p className="text-xs text-gray-500 font-mono mt-2 break-all">
                    Signature: {lease.landlord_signature.substring(0, 40)}...
                  </p>
                </div>
              ) : (
                <div className="text-gray-500 italic">
                  <p>Awaiting signature</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-gray-200 pt-6 mt-8 text-center text-sm text-gray-500">
          <p>
            This lease agreement was generated on{' '}
            {new Date(lease.generated_at).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
          <p className="mt-2">
            Lease ID: <span className="font-mono text-xs">{lease.id}</span>
          </p>
          <p className="mt-4 text-xs">
            This is a legally binding digital lease agreement secured on the Arc blockchain.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LeaseDocument;
