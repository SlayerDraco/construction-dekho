'use client';

import { useRouter } from 'next/navigation';

const PROFILES = [
  { id: 'demo-admin-001', name: 'Aryaman', role: 'Project Admin', color: 'bg-blue-600' },
  { id: 'demo-client-002', name: 'Sharma Family', role: 'Homeowner', color: 'bg-emerald-600' },
  { id: 'demo-client-003', name: 'Nair Family', role: 'Homeowner', color: 'bg-purple-600' },
];

export default function ProfilePicker() {
  const router = useRouter();

  const handleSelectProfile = (id: string) => {
    document.cookie = `demo_profile_id=${id}; path=/; max-age=86400`;
    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center text-white">
      <h1 className="text-4xl font-bold mb-12 tracking-tight">Who is viewing the demo?</h1>
      
      <div className="flex gap-8 flex-wrap justify-center">
        {PROFILES.map((profile) => (
          <div 
            key={profile.id} 
            onClick={() => handleSelectProfile(profile.id)}
            className="group cursor-pointer flex flex-col items-center gap-5 transition-transform hover:scale-105"
          >
            <div className={`w-36 h-36 rounded-xl ${profile.color} flex items-center justify-center text-5xl font-bold border-4 border-transparent group-hover:border-white transition-all shadow-lg`}>
              {profile.name.charAt(0)}
            </div>
            
            <div className="text-center">
              <h2 className="text-xl font-medium text-gray-200 group-hover:text-white transition-colors">{profile.name}</h2>
              <p className="text-sm text-gray-500 mt-1">{profile.role}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
