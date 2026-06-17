'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/dashboard-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Select, Badge } from '@/components/ui/index'
import { Building2, Home, Zap, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react'

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana',
  'Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur',
  'Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh',
  'Puducherry','Chandigarh',
]

const HOUSE_TYPES = [
  { id: '', name: 'Select type...' },
  { id: 'basic', name: 'Basic House' },
  { id: 'duplex', name: 'Duplex' },
  { id: 'villa', name: 'Villa' },
  { id: 'farmhouse', name: 'Farmhouse' },
  { id: 'luxury', name: 'Luxury House' },
  { id: 'renovation', name: 'Renovation' },
]

const FEATURE_GROUPS = [
  {
    label: 'Security',
    features: ['CCTV', 'Video Doorbell', 'Smart Lock', 'Motion Sensors', 'Intercom'],
  },
  {
    label: 'Smart Home',
    features: ['Smart Lighting', 'Smart Switches', 'Smart Curtains', 'Home Automation Hub'],
  },
  {
    label: 'Energy',
    features: ['Solar Panels', 'Inverter System', 'Battery Backup', 'EV Charger'],
  },
  {
    label: 'Water',
    features: ['Borewell', 'Rainwater Harvesting', 'Water Softener', 'RO System', 'Pressure Pump'],
  },
  {
    label: 'Comfort',
    features: ['False Ceiling', 'AC Preparation', 'Centralized AC Preparation', 'Terrace Garden'],
  },
  {
    label: 'Exterior',
    features: ['Garden', 'Landscaping', 'Boundary Wall', 'Main Gate', 'Driveway'],
  },
  {
    label: 'Premium',
    features: ['Swimming Pool', 'Lift', 'Home Theater', 'Servant Quarter', 'Gym Room'],
  },
]

const STEPS = [
  { id: 1, title: 'House Basics', icon: Home },
  { id: 2, title: 'Layout', icon: Building2 },
  { id: 3, title: 'Features', icon: Zap },
  { id: 4, title: 'Review', icon: CheckCircle },
]

export default function NewHousePage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [houseTypes, setHouseTypes] = useState<{id:string;name:string}[]>([])
  const [dbHouseTypeId, setDbHouseTypeId] = useState('')

  const [form, setForm] = useState({
    projectName: '',
    city: '',
    state: '',
    plotSize: '',
    houseTypeName: '',
    floors: '1',
    bedrooms: '2',
    bathrooms: '2',
    parkingSpaces: '1',
    selectedFeatures: [] as string[],
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const update = (key: string, val: string) => {
    setForm((f) => ({ ...f, [key]: val }))
    setErrors((e) => ({ ...e, [key]: '' }))
  }

  const toggleFeature = (name: string) => {
    setForm((f) => ({
      ...f,
      selectedFeatures: f.selectedFeatures.includes(name)
        ? f.selectedFeatures.filter((n) => n !== name)
        : [...f.selectedFeatures, name],
    }))
  }

  const validateStep1 = () => {
    const e: Record<string, string> = {}
    if (!form.projectName.trim()) e.projectName = 'Project name is required'
    if (!form.city.trim()) e.city = 'City is required'
    if (!form.state) e.state = 'State is required'
    if (!form.houseTypeName) e.houseTypeName = 'House type is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      // First fetch house types to get the DB ID
      const typesRes = await fetch('/api/house-types')
      let houseTypeId = ''
      if (typesRes.ok) {
        const types = await typesRes.json()
        const match = types.find((t: any) => t.name === form.houseTypeName)
        houseTypeId = match?.id ?? ''
      }

      if (!houseTypeId) {
        toast.error('Invalid house type. Please try again.')
        setLoading(false)
        return
      }

      // Fetch feature IDs
      const featuresRes = await fetch('/api/features')
      let featureIds: string[] = []
      if (featuresRes.ok) {
        const features = await featuresRes.json()
        featureIds = features
          .filter((f: any) => form.selectedFeatures.includes(f.name))
          .map((f: any) => f.id)
      }

      const res = await fetch('/api/houses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: form.projectName,
          city: form.city,
          state: form.state,
          plotSize: form.plotSize ? parseFloat(form.plotSize) : undefined,
          houseTypeId,
          floors: parseInt(form.floors),
          bedrooms: parseInt(form.bedrooms),
          bathrooms: parseInt(form.bathrooms),
          parkingSpaces: parseInt(form.parkingSpaces),
          features: featureIds,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Failed to create project')
        return
      }

      const house = await res.json()
      toast.success('Project created successfully!')
      router.push(`/houses/${house.id}`)
    } catch (err) {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Create New Project"
        description="Set up your house construction project in a few steps"
      />

      <div className="max-w-2xl mx-auto px-6 py-6">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const isActive = s.id === step
            const isDone = s.id < step
            return (
              <div key={s.id} className="flex items-center gap-2 flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-colors ${
                    isDone ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                    : isActive ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {isDone ? '✓' : s.id}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${isActive ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500'}`}>
                  {s.title}
                </span>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px ${isDone ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-zinc-200 dark:bg-zinc-800'}`} />
                )}
              </div>
            )
          })}
        </div>

        {/* Step 1: Basics */}
        {step === 1 && (
          <Card>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4">House Basics</h2>
            <div className="space-y-4">
              <Input
                label="Project Name"
                placeholder="e.g., Our Dream Home"
                value={form.projectName}
                onChange={(e) => update('projectName', e.target.value)}
                error={errors.projectName}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="City"
                  placeholder="e.g., Bangalore"
                  value={form.city}
                  onChange={(e) => update('city', e.target.value)}
                  error={errors.city}
                />
                <Select
                  label="State"
                  value={form.state}
                  onChange={(e) => update('state', e.target.value)}
                  error={errors.state}
                  options={[
                    { label: 'Select state...', value: '' },
                    ...INDIAN_STATES.map((s) => ({ label: s, value: s })),
                  ]}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="House Type"
                  value={form.houseTypeName}
                  onChange={(e) => update('houseTypeName', e.target.value)}
                  error={errors.houseTypeName}
                  options={HOUSE_TYPES.map((t) => ({ label: t.name, value: t.name }))}
                />
                <Input
                  label="Plot Size (sq.ft)"
                  type="number"
                  placeholder="e.g., 2400"
                  value={form.plotSize}
                  onChange={(e) => update('plotSize', e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <Button
                onClick={() => { if (validateStep1()) setStep(2) }}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Next Step
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2: Layout */}
        {step === 2 && (
          <Card>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Layout Details</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'floors', label: 'Floors', min: 1, max: 10 },
                { key: 'bedrooms', label: 'Bedrooms', min: 1, max: 20 },
                { key: 'bathrooms', label: 'Bathrooms', min: 1, max: 20 },
                { key: 'parkingSpaces', label: 'Parking Spaces', min: 0, max: 10 },
              ].map(({ key, label, min, max }) => (
                <div key={key}>
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">{label}</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => update(key, String(Math.max(min, parseInt(form[key as keyof typeof form] as string) - 1)))}
                      className="w-8 h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    >−</button>
                    <input
                      type="number"
                      min={min}
                      max={max}
                      value={form[key as keyof typeof form]}
                      onChange={(e) => update(key, e.target.value)}
                      className="flex-1 h-9 text-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-semibold text-zinc-900 dark:text-zinc-100"
                    />
                    <button
                      onClick={() => update(key, String(Math.min(max, parseInt(form[key as keyof typeof form] as string) + 1)))}
                      className="w-8 h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    >+</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-6">
              <Button variant="ghost" onClick={() => setStep(1)} leftIcon={<ArrowLeft className="h-4 w-4" />}>Back</Button>
              <Button onClick={() => setStep(3)} rightIcon={<ArrowRight className="h-4 w-4" />}>Next Step</Button>
            </div>
          </Card>
        )}

        {/* Step 3: Features */}
        {step === 3 && (
          <Card>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Select Features</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">
              Choose optional features for your house. These inject tasks and decisions into your roadmap.
            </p>
            <div className="space-y-5">
              {FEATURE_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
                    {group.label}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.features.map((feat) => {
                      const selected = form.selectedFeatures.includes(feat)
                      return (
                        <button
                          key={feat}
                          onClick={() => toggleFeature(feat)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            selected
                              ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                              : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                          }`}
                        >
                          {feat}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-4">
              {form.selectedFeatures.length} feature{form.selectedFeatures.length !== 1 ? 's' : ''} selected. You can change this later.
            </p>
            <div className="flex justify-between mt-6">
              <Button variant="ghost" onClick={() => setStep(2)} leftIcon={<ArrowLeft className="h-4 w-4" />}>Back</Button>
              <Button onClick={() => setStep(4)} rightIcon={<ArrowRight className="h-4 w-4" />}>Review</Button>
            </div>
          </Card>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <Card>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Review & Create</h2>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Project Name</span>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{form.projectName}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Location</span>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{form.city}, {form.state}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">House Type</span>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{form.houseTypeName}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Layout</span>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {form.floors}F · {form.bedrooms}BR · {form.bathrooms}BA · {form.parkingSpaces} Parking
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Features</span>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {form.selectedFeatures.length > 0 ? `${form.selectedFeatures.length} selected` : 'None'}
                </span>
              </div>
              {form.selectedFeatures.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.selectedFeatures.map((f) => (
                    <Badge key={f} variant="outline">{f}</Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(3)} leftIcon={<ArrowLeft className="h-4 w-4" />}>Back</Button>
              <Button onClick={handleSubmit} loading={loading}>
                Create Project & Generate Roadmap
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
