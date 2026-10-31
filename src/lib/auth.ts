import { cookies } from 'next/headers';

export const DEMO_PROFILES = [
  { id: 'demo-admin-001', name: 'Aryaman', email: 'admin@constructiondekho.com', role: 'ADMIN' },
  { id: 'demo-client-002', name: 'Sharma Family', email: 'sharma@example.com', role: 'CLIENT' },
  { id: 'demo-client-003', name: 'Nair Family', email: 'nair@example.com', role: 'CLIENT' },
];

export const getCurrentUser = async () => {
  const cookieStore = await cookies();
  const profileId = cookieStore.get('demo_profile_id')?.value;
  
  if (!profileId) return null;
  
  return DEMO_PROFILES.find(p => p.id === profileId) || null;
};
