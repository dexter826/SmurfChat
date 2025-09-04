/**
 * Backward Compatibility Wrapper cho useFirestore
 * 
 * Wraps useOptimizedFirestore với same interface như useFirestore cũ
 * Enables seamless migration without breaking existing components
 * 
 * Created: September 4, 2025
 * Task: 4.3 - Optimize Real-time Listeners
 */

import useOptimizedFirestore from './useOptimizedFirestore';

const useFirestore = (collectionName, condition, orderByField = null, orderDirection = 'asc') => {
  const { documents } = useOptimizedFirestore(
    collectionName, 
    condition, 
    orderByField, 
    orderDirection,
    { realTime: true, enabled: true }
  );

  // Return documents array for backward compatibility
  return documents;
};

export default useFirestore;
