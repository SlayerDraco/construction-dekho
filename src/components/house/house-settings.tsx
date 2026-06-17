'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/dashboard-layout'
import { Card } from '@/components/ui/card'
import { Badge, AlertBanner, Select } from '@/components/ui/index'
import { Input } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { Settings, Zap, Save, AlertTriangle } from 'lucide-react'

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana',
  'Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur',
  'Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh',
  'Puducherry','Chandigarh',
]

const FEATURE_CATEGORIES: Record<string, string> = {
  SECURITY: '🔒 Security',
  SMART_HOME: '🏠 Smart Home',
  ENERGY: '⚡ Energy',
  WATER: '💧 Water',
  COMFORT: '🛋️ Comfort',
  EXTERIOR: '🌿 Exterior',
  PREMIUM: '⭐ Premium',
}

interface HouseSettingsProps {
  house: any
  houseTypes: any[]
  allFeatures: any[]
}

export function HouseSettings({ house, houseTypes, allFeatures }: HouseSettingsProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [togglingFeature, setTogglingFeature] = useState<string | null>(null)

  const [form, setForm] = useState({
    projectName: house.projectName,
    city: house.city,
    state: house.state,
    plotSize: house.plotSize?.toString() ?? '',
    floors: house.floors.toString(),
    bedrooms: house.bedrooms.toString(),
    bathrooms: house.bathrooms.toString(),
    parkingSpaces: house.parkingSpaces.toString(),
    houseTypeId: house.houseTypeId,
  })

  const featuresByCategory = allFeatures.reduce((acc: Record<string, any[]>, f: any) => {
    if (!acc[f.category]) acc[f.category] = []
    acc[f.category].push(f)
    return acc
  }, {})

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/houses/${house.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: form.projectName,
          city: form.city,
          state: form.state,
          plotSize: form.plotSize ? parseFloat(form.plotSize) : undefined,
          floors: parseInt(form.floors),
          bedrooms: parseInt(form.bedrooms),
          bathrooms: parseInt(form.bathrooms),
          parkingSpaces: parseInt(form.parkingSpaces),
          houseTypeId: form.houseTypeId,
        }),
      })
      if (res.ok) {
        toast.success('Settings saved')
        router.refresh()
      } else {
        const err = await res.json()
        toast.error(err.error ?? 'Failed to save settings')
      }
    } finally {
      setSaving(false)
    }
  }

  async function toggleFeature(featureId: string, currentEnabled: boolean) {
    setTogglingFeature(featureId)
    try {
      const res = await fetch(`/api/houses/${house.id}/features`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureId, enabled: !currentEnabled }),
      })
      if (res.ok) {
        toast.success(currentEnabled ? 'Feature disabled' : 'Feature enabled — roadmap updated')
        router.refresh()
      } else {
        toast.error('Failed to update feature')
      }
    } finally {
      setTogglingFeature(null)
    }
  }

  return (
    <div>
      <PageHeader title="Project Settings" description={house.projectName} />

      <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
        {/* Basic info */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Settings className="h-4 w-4 text-zinc-500" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Project Details</h2>
          </div>
          <div className="space-y-4">
            <Input
              label="Project Name"
              value={form.projectName}
              onChange={(e) => setForm((f) => ({ ...f, projectName: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="City"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              />
              <Select
                label="State"
                value={form.state}
                onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                options={INDIAN_STATES.map((s) => ({ label: s, value: s }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="House Type"
                value={form.houseTypeId}
                onChange={(e) => setForm((f) => ({ ...f, houseTypeId: e.target.value }))}
                options={houseTypes.map((t) => ({ label: t.name, value: t.id }))}
              />
              <Input
                label="Plot Size (sq.ft)"
                type="number"
                value={form.plotSize}
                onChange={(e) => setForm((f) => ({ ...f, plotSize: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { key: 'floors', label: 'Floors' },
                { key: 'bedrooms', label: 'Bedrooms' },
                { key: 'bathrooms', label: 'Bathrooms' },
                { key: 'parkingSpaces', label: 'Parking' },
              ].map(({ key, label }) => (
                <Input
                  key={key}
                  label={label}
                  type="number"
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <Button onClick={handleSave} loading={saving} leftIcon={<Save className="h-4 w-4" />}>
              Save Changes
            </Button>
          </div>
        </Card>

        {/* Features */}
        <Card>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-4 w-4 text-yellow-500" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Optional Features</h2>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
            Enabling or disabling features updates your construction roadmap automatically.
          </p>

          {Object.entries(featuresByCategory).map(([category, features]) => (
            <div key={category} className="mb-5">
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
                {FEATURE_CATEGORIES[category] ?? category}
              </p>
              <div className="flex flex-wrap gap-2">
                {(features as any[]).map((feat) => (
                  <button
                    key={feat.id}
                    onClick={() => toggleFeature(feat.id, feat.enabled)}
                    disabled={togglingFeature === feat.id}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all disabled:opacity-50 ${
                      feat.enabled
                        ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                        : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500'
                    }`}
                  >
                    {togglingFeature === feat.id ? '...' : feat.name}
                    {feat.enabled && ' ✓'}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Card>

        {/* Danger zone */}
        <Card className="border-red-200 dark:border-red-900">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">Danger Zone</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Archive Project</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">This hides the project from your dashboard.</p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={async () => {
                if (!confirm('Archive this project? You can restore it later.')) return
                const res = await fetch(`/api/houses/${house.id}`, { method: 'DELETE' })
                if (res.ok) {
                  toast.success('Project archived')
                  router.push('/houses')
                } else {
                  toast.error('Failed to archive project')
                }
              }}
            >
              Archive
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
