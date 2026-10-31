// Shared (client + server + proxy safe): no server-only imports here.
export const DEMO_COOKIE = 'demo_profile_id'

export const DEMO_PROFILES = [
  { id: 'demo-admin-001', name: 'Aryaman', email: 'admin@constructiondekho.com', role: 'ADMIN', label: 'Project Admin', blurb: 'Full platform access: users, providers, claims and every project.', gradient: 'from-accent to-[#9BD600] text-zinc-950' },
  { id: 'demo-client-002', name: 'Sharma Family', email: 'sharma@example.com', role: 'OWNER', label: 'Homeowner', blurb: 'Finished villa in Bangalore. Explore a completed build.', gradient: 'from-brand-500 to-brand-700 text-white' },
  { id: 'demo-client-003', name: 'Nair Family', email: 'nair@example.com', role: 'OWNER', label: 'Homeowner', blurb: 'Duplex in Mumbai, mid-construction with live alerts.', gradient: 'from-brand-300 to-brand-600 text-white' },
] as const

export type DemoProfile = (typeof DEMO_PROFILES)[number]

export function isValidProfileId(id: string | undefined | null): boolean {
  return !!id && DEMO_PROFILES.some((p) => p.id === id)
}
