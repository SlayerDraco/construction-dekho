/**
 * Maps legacy ServiceCategory names (case-insensitive) to the new taxonomy slugs.
 * Names not listed here are imported as sub-categories of "Specialist Services" (slug "legacy-<name>")
 * so that nothing is lost; an administrator can re-parent them later.
 * Names include both the demo seed values and the names hard-coded in src/lib/service-discovery.ts.
 */
export const LEGACY_CATEGORY_NAME_TO_SLUG: Record<string, string> = {
  'electrical': 'electrician',
  'electrician': 'electrician',
  'plumbing': 'plumber',
  'plumber': 'plumber',
  'masonry': 'masonry-brickwork',
  'mason': 'masonry-brickwork',
  'interior design': 'interior-designer',
  'painting': 'interior-painting',
  'painter': 'interior-painting',
  'architect': 'architect',
  'structural engineer': 'structural-engineer',
  'surveyor': 'land-surveyor',
  'contractor': 'general-contractor',
  'excavation contractor': 'excavation-earthwork',
  'cement supplier': 'cement-supplier',
  'steel supplier': 'steel-tmt-supplier',
  'waterproofing contractor': 'waterproofing-contractor',
  'tile supplier': 'tiles-showroom',
  'marble supplier': 'marble-granite-stone',
  'flooring contractor': 'tile-flooring-contractor',
  'carpenter': 'carpenter-woodwork',
  'modular kitchen provider': 'modular-kitchen',
  'landscaping contractor': 'landscaping-gardening',
  'paver contractor': 'paver-blocks-driveway',
  'gate fabricator': 'grills-railings-gates',
  'cctv installer': 'cctv-installation',
  'internet installer': 'structured-cabling-wifi',
  'smart home installer': 'smart-home-automation',
  'solar installer': 'solar-panel-installation',
  'borewell contractor': 'borewell-drilling',
  'elevator installer': 'lift-elevator-installation',
  'ac installer': 'air-conditioning-installation',
}

export const LEGACY_FALLBACK_PARENT_SLUG = 'specialist-services'
