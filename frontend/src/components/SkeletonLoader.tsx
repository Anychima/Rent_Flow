/**
 * Skeleton Loading Components
 * Provides skeleton loaders for better UX during data fetching
 */

import React from 'react';

/**
 * Base Skeleton component
 */
interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  circle?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  width, 
  height, 
  circle = false 
}) => {
  const baseClasses = 'animate-pulse bg-gray-200 rounded';
  const shapeClasses = circle ? 'rounded-full' : '';
  const style = {
    width: width || '100%',
    height: height || '1rem'
  };

  return (
    <div 
      className={`${baseClasses} ${shapeClasses} ${className}`}
      style={style}
    />
  );
};

/**
 * Property Card Skeleton
 */
export const PropertyCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Image skeleton */}
      <Skeleton height="192px" className="rounded-none" />
      
      <div className="p-4 space-y-3">
        {/* Title */}
        <Skeleton height="1.5rem" width="80%" />
        
        {/* Address */}
        <Skeleton height="1rem" width="60%" />
        
        {/* Price */}
        <Skeleton height="1.75rem" width="40%" />
        
        {/* Features */}
        <div className="flex space-x-4">
          <Skeleton height="1rem" width="60px" />
          <Skeleton height="1rem" width="60px" />
          <Skeleton height="1rem" width="80px" />
        </div>
        
        {/* Button */}
        <Skeleton height="2.5rem" className="rounded-md" />
      </div>
    </div>
  );
};

/**
 * Property List Skeleton
 */
interface PropertyListSkeletonProps {
  count?: number;
}

export const PropertyListSkeleton: React.FC<PropertyListSkeletonProps> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <PropertyCardSkeleton key={index} />
      ))}
    </div>
  );
};

/**
 * Table Row Skeleton
 */
export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 4 }) => {
  return (
    <tr className="border-b">
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index} className="px-6 py-4">
          <Skeleton height="1rem" />
        </td>
      ))}
    </tr>
  );
};

/**
 * Table Skeleton
 */
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ 
  rows = 5, 
  columns = 4 
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white">
        <thead className="bg-gray-50">
          <tr>
            {Array.from({ length: columns }).map((_, index) => (
              <th key={index} className="px-6 py-3">
                <Skeleton height="1rem" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, index) => (
            <TableRowSkeleton key={index} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Profile Card Skeleton
 */
export const ProfileCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
      <div className="flex items-center space-x-4">
        <Skeleton circle width="80px" height="80px" />
        <div className="flex-1 space-y-2">
          <Skeleton height="1.5rem" width="60%" />
          <Skeleton height="1rem" width="40%" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton height="1rem" />
        <Skeleton height="1rem" width="90%" />
        <Skeleton height="1rem" width="80%" />
      </div>
    </div>
  );
};

/**
 * Dashboard Stats Skeleton
 */
export const DashboardStatsSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="bg-white rounded-lg shadow-md p-6 space-y-3">
          <Skeleton height="1rem" width="60%" />
          <Skeleton height="2rem" width="40%" />
          <Skeleton height="0.875rem" width="50%" />
        </div>
      ))}
    </div>
  );
};

/**
 * Form Field Skeleton
 */
export const FormFieldSkeleton: React.FC = () => {
  return (
    <div className="space-y-2">
      <Skeleton height="1rem" width="30%" />
      <Skeleton height="2.5rem" className="rounded-md" />
    </div>
  );
};

/**
 * Form Skeleton
 */
interface FormSkeletonProps {
  fields?: number;
}

export const FormSkeleton: React.FC<FormSkeletonProps> = ({ fields = 5 }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
      {Array.from({ length: fields }).map((_, index) => (
        <FormFieldSkeleton key={index} />
      ))}
      <Skeleton height="2.5rem" width="150px" className="rounded-md mt-6" />
    </div>
  );
};

/**
 * Chat Message Skeleton
 */
export const ChatMessageSkeleton: React.FC = () => {
  return (
    <div className="flex space-x-3 p-4">
      <Skeleton circle width="40px" height="40px" />
      <div className="flex-1 space-y-2">
        <Skeleton height="1rem" width="20%" />
        <Skeleton height="1rem" width="90%" />
        <Skeleton height="1rem" width="70%" />
      </div>
    </div>
  );
};

/**
 * Page Skeleton - Full page loader
 */
export const PageSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <Skeleton height="2rem" width="40%" />
      </div>
      
      {/* Stats */}
      <DashboardStatsSkeleton />
      
      {/* Content */}
      <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
        <Skeleton height="1.5rem" width="30%" />
        <TableSkeleton rows={8} columns={5} />
      </div>
    </div>
  );
};

/**
 * Loading Spinner Component
 */
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <svg
        className="animate-spin text-blue-600"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
};

/**
 * Full Page Loader with Spinner
 */
export const FullPageLoader: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => {
  return (
    <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
      <div className="text-center space-y-4">
        <Spinner size="lg" className="mx-auto" />
        <p className="text-gray-600 text-lg">{message}</p>
      </div>
    </div>
  );
};

export default {
  Skeleton,
  PropertyCardSkeleton,
  PropertyListSkeleton,
  TableSkeleton,
  ProfileCardSkeleton,
  DashboardStatsSkeleton,
  FormSkeleton,
  ChatMessageSkeleton,
  PageSkeleton,
  Spinner,
  FullPageLoader
};
