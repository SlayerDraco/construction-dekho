'use client';

import { useRouter } from 'next/navigation';

export function SwitchProfileButton() {
  const router = useRouter();

  const handleSwitch = () => {
    // Clear the session cookie
    document.cookie = "demo_profile_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push('/');
    router.refresh();
  };

  return (
    <button 
      onClick={handleSwitch}
      className="w-full text-sm font-medium text-gray-500 hover:text-black hover:bg-gray-100 transition-colors flex items-center gap-3 p-3 rounded-md"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
        <polyline points="16 17 21 12 16 7"></polyline>
        <line x1="21" y1="12" x2="9" y2="12"></line>
      </svg>
      Switch Profile
    </button>
  );
}
