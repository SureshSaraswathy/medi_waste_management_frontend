import { User } from '../context/AuthContext';

/**
 * Check if the user is a SuperAdmin
 * SuperAdmin is identified by:
 * 1. Having 'superadmin' role
 * 2. User ID matching SuperAdmin ID ('00000000-0000-0000-0000-000000000001')
 * 3. Email matching 'superadmin@medi-waste.io' or 'superadmin'
 * 4. Username/name matching 'superadmin'
 */
export const isSuperAdmin = (user: User | null): boolean => {
  if (!user) return false;
  
  // Check by role
  if (user.roles.includes('superadmin')) return true;
  
  // Check by user ID (SuperAdmin static ID)
  if (user.id === '00000000-0000-0000-0000-000000000001') return true;
  
  // Check by email
  const email = user.email?.toLowerCase();
  if (email === 'superadmin@medi-waste.io' || email === 'superadmin') return true;
  
  // Check by username/name
  const name = user.name?.toLowerCase();
  if (name === 'superadmin') return true;
  
  return false;
};

/**
 * Check if the user can create master data
 * SuperAdmin and Admin can create master data
 */
export const canCreateMasterData = (user: User | null): boolean => {
  if (!user) return false;
  return isSuperAdmin(user) || user.roles.includes('admin');
};

/**
 * Check if the user can edit master data
 * SuperAdmin and Admin can edit master data
 */
export const canEditMasterData = (user: User | null): boolean => {
  if (!user) return false;
  return isSuperAdmin(user) || user.roles.includes('admin');
};

/**
 * Check if the user can delete master data
 * Only SuperAdmin can delete master data
 */
export const canDeleteMasterData = (user: User | null): boolean => {
  if (!user) return false;
  return isSuperAdmin(user);
};
