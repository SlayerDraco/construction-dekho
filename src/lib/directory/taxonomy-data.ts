/**
 * Master construction-service taxonomy (seed data).
 *
 * - Pure data: no imports, no database access.
 * - The database is the runtime source of truth. The UI must read categories from the API,
 *   never from this file.
 * - External mappings (googlePlaces / osm) are PROPOSALS that need human review before any
 *   source adapter relies on them. They are not verified against the live source schemas.
 * - Stage mappings are ranking hints only. They must never be used to hide a category.
 */

export const STAGE_KEYS = ['PLAN', 'SITE', 'FOUND', 'STRUCT', 'MEP', 'FINISH', 'EXT', 'SEC', 'SUST', 'HAND'] as const
export type StageKey = (typeof STAGE_KEYS)[number]

/** Concept key -> stage names it can resolve to. Covers both stage naming schemes found in the repo. */
export const STAGE_KEY_TO_NAMES: Record<StageKey, string[]> = {
  PLAN: ['Planning', 'Site Preparation'],
  SITE: ['Site Preparation'],
  FOUND: ['Foundation'],
  STRUCT: ['Structure', 'Walls & Masonry'],
  MEP: ['MEP', 'Utilities', 'Fixtures & Installations'],
  FINISH: ['Finishing', 'Flooring & Finishes', 'Painting', 'Surface Preparation', 'Kitchen'],
  EXT: ['Exterior Development'],
  SEC: ['Security & Connectivity'],
  SUST: ['Sustainability'],
  HAND: ['Handover', 'Final Inspection', 'Move-In Ready'],
}

export const EXTERNAL_SOURCE_KEYS = ['google_places', 'osm'] as const

export interface TaxonomyLeaf {
  slug: string
  name: string
  description?: string
  synonyms: string[]
  discoveryTerms: string[]
  googlePlaces: string[]
  osm: string[]
  /** Primary stages (relevance 2). */
  stages: StageKey[]
  /** Secondary stages (relevance 1). */
  stagesSecondary: StageKey[]
}

export interface TaxonomyGroup {
  slug: string
  name: string
  description: string
  children: TaxonomyLeaf[]
}

interface LeafOpts {
  syn?: string[]
  terms?: string[]
  g?: string[]
  osm?: string[]
  st?: StageKey[]
  st2?: StageKey[]
  d?: string
}

function L(slug: string, name: string, o: LeafOpts = {}): TaxonomyLeaf {
  return {
    slug,
    name,
    description: o.d,
    synonyms: o.syn ?? [],
    discoveryTerms: o.terms ?? [name.toLowerCase()],
    googlePlaces: o.g ?? [],
    osm: o.osm ?? [],
    stages: o.st ?? [],
    stagesSecondary: o.st2 ?? [],
  }
}

export const TAXONOMY: TaxonomyGroup[] = [
  {
    slug: 'planning-architecture-engineering',
    name: 'Planning, Architecture & Engineering',
    description: 'Design, drawings, approvals and technical consultancy before and during construction.',
    children: [
      L('architect', 'Architect', { syn: ['architects', 'architectural firm', 'building designer', 'home designer'], terms: ['architect', 'architectural firm', 'house plan designer'], osm: ['office=architect'], st: ['PLAN'] }),
      L('structural-engineer', 'Structural Engineer', { syn: ['structural consultant', 'structural designer', 'rcc designer'], terms: ['structural engineer', 'structural consultant'], osm: ['office=engineer'], st: ['PLAN', 'FOUND'] }),
      L('civil-engineer', 'Civil Engineer', { syn: ['civil consultant', 'site engineer'], terms: ['civil engineer', 'civil engineering consultant'], osm: ['office=engineer'], st: ['PLAN'], st2: ['STRUCT'] }),
      L('land-surveyor', 'Land Surveyor', { syn: ['surveyor', 'land survey', 'topographic survey', 'plot measurement'], terms: ['land surveyor', 'land survey services'], st: ['PLAN', 'SITE'] }),
      L('soil-testing-geotechnical', 'Soil Testing & Geotechnical', { syn: ['soil test', 'soil investigation', 'geotechnical engineer', 'bearing capacity test'], terms: ['soil testing', 'geotechnical investigation'], st: ['PLAN', 'FOUND'] }),
      L('town-planning-approvals', 'Building Plan Approvals & Liaison', { syn: ['plan sanction', 'building permit', 'approval consultant', 'liaisoning'], terms: ['building plan approval consultant', 'building permit agent'], st: ['PLAN'] }),
      L('quantity-surveyor-estimator', 'Quantity Surveyor & Estimator', { syn: ['estimator', 'bill of quantities', 'boq', 'cost estimation'], terms: ['quantity surveyor', 'construction estimator'], st: ['PLAN'] }),
      L('project-management-consultant', 'Project Management Consultant', { syn: ['pmc', 'construction manager', 'site supervision'], terms: ['project management consultant construction', 'construction supervision'], st: ['PLAN', 'STRUCT'], st2: ['FINISH'] }),
      L('vastu-consultant', 'Vastu Consultant', { syn: ['vastu shastra', 'vastu expert'], terms: ['vastu consultant'], st: ['PLAN'] }),
      L('drafting-3d-visualisation', 'Drafting & 3D Visualisation', { syn: ['3d elevation', 'cad drafting', 'floor plan drawing', '3d rendering'], terms: ['architectural drafting', '3d elevation design'], st: ['PLAN'] }),
    ],
  },
  {
    slug: 'land-site-preparation',
    name: 'Land & Site Preparation',
    description: 'Clearing, levelling, excavation and preparing the plot for construction.',
    children: [
      L('site-clearing-demolition', 'Site Clearing & Demolition', { syn: ['demolition contractor', 'plot clearing', 'old building demolition'], terms: ['demolition contractor', 'site clearing services'], st: ['SITE'] }),
      L('excavation-earthwork', 'Excavation & Earthwork', { syn: ['earthmoving', 'jcb hire', 'excavator hire', 'earth cutting'], terms: ['excavation contractor', 'jcb on hire'], st: ['SITE', 'FOUND'] }),
      L('land-levelling-grading', 'Land Levelling & Grading', { syn: ['plot levelling', 'land grading'], terms: ['land levelling contractor'], st: ['SITE'] }),
      L('soil-filling-compaction', 'Soil Filling & Compaction', { syn: ['murum supply', 'earth filling', 'plinth filling', 'roller compaction'], terms: ['murum supplier', 'soil filling contractor'], st: ['SITE', 'FOUND'] }),
      L('site-fencing-hoarding', 'Site Fencing & Hoarding', { syn: ['temporary fencing', 'site boundary sheet'], terms: ['site fencing contractor'], st: ['SITE'] }),
    ],
  },
  {
    slug: 'foundation-structural-work',
    name: 'Foundation & Structural Work',
    description: 'Footings, RCC frame, masonry and structural steel.',
    children: [
      L('foundation-contractor', 'Foundation Contractor', { syn: ['footing contractor', 'pcc contractor', 'plinth beam'], terms: ['foundation contractor', 'footing and foundation work'], st: ['FOUND'] }),
      L('rcc-contractor', 'RCC Contractor', { syn: ['reinforced concrete contractor', 'slab casting', 'column and beam work'], terms: ['rcc contractor', 'rcc construction'], st: ['FOUND', 'STRUCT'] }),
      L('reinforcement-bar-bending', 'Reinforcement & Bar Bending', { syn: ['bar bender', 'rebar fabrication', 'steel binding'], terms: ['bar bending contractor', 'rebar fabrication'], st: ['FOUND', 'STRUCT'] }),
      L('shuttering-formwork-scaffolding', 'Shuttering, Formwork & Scaffolding', { syn: ['centering', 'formwork', 'scaffolding rental', 'shuttering contractor'], terms: ['shuttering contractor', 'scaffolding on rent'], st: ['STRUCT'], st2: ['FOUND'] }),
      L('ready-mix-concrete', 'Ready-Mix Concrete', { syn: ['rmc', 'concrete batching plant', 'concrete pump'], terms: ['ready mix concrete', 'concrete pump hire'], st: ['FOUND', 'STRUCT'] }),
      L('piling-contractor', 'Piling Contractor', { syn: ['pile foundation', 'bored piling', 'driven piles'], terms: ['piling contractor', 'pile foundation contractor'], st: ['FOUND'] }),
      L('masonry-brickwork', 'Masonry & Brickwork', { syn: ['mason', 'mistri', 'bricklayer', 'block work', 'stone masonry'], terms: ['mason contractor', 'brick work contractor'], osm: ['craft=stonemason'], st: ['STRUCT'] }),
      L('structural-steel-fabrication', 'Structural Steel Fabrication', { syn: ['steel fabricator', 'steel structure', 'peb'], terms: ['structural steel fabrication', 'steel fabricator'], osm: ['craft=metal_construction'], st: ['STRUCT'] }),
      L('anti-termite-treatment', 'Anti-Termite Treatment', { syn: ['termite proofing', 'pre-construction termite treatment'], terms: ['anti termite treatment construction'], st: ['FOUND'] }),
    ],
  },
  {
    slug: 'general-construction-contracting',
    name: 'General Construction & Contracting',
    description: 'Full-scope builders, contractors and labour supply.',
    children: [
      L('general-contractor', 'General Contractor', { syn: ['civil contractor', 'building contractor', 'construction company', 'builder'], terms: ['general contractor', 'civil contractor', 'building contractor'], g: ['general_contractor'], osm: ['craft=builder'], st: ['FOUND', 'STRUCT'], st2: ['FINISH'] }),
      L('turnkey-home-construction', 'Turnkey Home Construction', { syn: ['complete house construction', 'home builders', 'design and build'], terms: ['turnkey house construction', 'home construction company'], st: ['PLAN', 'FOUND', 'STRUCT'], st2: ['FINISH'] }),
      L('labour-contractor', 'Labour Contractor', { syn: ['labour supply', 'mazdoor contractor', 'skilled labour', 'manpower supply'], terms: ['construction labour contractor', 'labour supplier'], st: ['FOUND', 'STRUCT'], st2: ['FINISH'] }),
      L('renovation-remodelling', 'Renovation & Remodelling', { syn: ['home renovation', 'house remodelling', 'extension contractor', 'repair and renovation'], terms: ['home renovation contractor', 'house remodelling'], st: ['FINISH'] }),
      L('builders-developers', 'Builders & Developers', { syn: ['real estate developer', 'residential builder'], terms: ['residential builders developers'], st: ['PLAN'] }),
    ],
  },
  {
    slug: 'roofing-building-envelope',
    name: 'Roofing & Building Envelope',
    description: 'Roofs, waterproofing, insulation, facades and weather protection.',
    children: [
      L('roofing-contractor', 'Roofing Contractor', { syn: ['roofer', 'roof sheet', 'roof repair', 'tile roofing'], terms: ['roofing contractor', 'roofing services'], g: ['roofing_contractor'], osm: ['craft=roofer'], st: ['STRUCT'], st2: ['FINISH'] }),
      L('waterproofing-contractor', 'Waterproofing Contractor', { syn: ['terrace waterproofing', 'bathroom waterproofing', 'basement waterproofing', 'leakage proofing'], terms: ['waterproofing contractor', 'terrace waterproofing'], st: ['STRUCT', 'FINISH'] }),
      L('thermal-insulation', 'Thermal Insulation & Heat Proofing', { syn: ['heat proofing', 'insulation contractor', 'cool roof'], terms: ['thermal insulation contractor', 'roof heat proofing'], st: ['STRUCT', 'FINISH'] }),
      L('facade-cladding', 'Facade & Cladding', { syn: ['acp cladding', 'elevation work', 'exterior cladding', 'curtain wall'], terms: ['facade contractor', 'acp cladding'], st: ['FINISH', 'EXT'] }),
      L('metal-roof-sheds', 'Metal Roof & Sheds', { syn: ['roof shed', 'peb shed', 'parking shed'], terms: ['metal roofing sheds', 'roof shed fabricator'], st: ['STRUCT'], st2: ['EXT'] }),
      L('gutters-rainwater-pipes', 'Gutters & Rainwater Pipes', { syn: ['downpipe', 'rain gutter', 'rainwater pipe'], terms: ['rain gutter installation'], st: ['FINISH'] }),
    ],
  },
  {
    slug: 'doors-windows-glass',
    name: 'Doors, Windows & Glass',
    description: 'Doors, windows, glazing, grills and fabrication.',
    children: [
      L('doors-supply-installation', 'Doors Supply & Installation', { syn: ['wooden doors', 'flush doors', 'main door', 'door frame'], terms: ['door manufacturer', 'wooden door supplier'], osm: ['shop=doors'], st: ['FINISH'], st2: ['STRUCT'] }),
      L('windows-upvc-aluminium', 'Windows (uPVC & Aluminium)', { syn: ['upvc windows', 'aluminium windows', 'sliding windows', 'window fabricator'], terms: ['upvc windows', 'aluminium window fabricator'], osm: ['craft=window_construction'], st: ['FINISH'], st2: ['STRUCT'] }),
      L('glass-glazing', 'Glass & Glazing', { syn: ['glazier', 'toughened glass', 'glass partition', 'glass railing'], terms: ['glass work contractor', 'toughened glass supplier'], osm: ['craft=glaziery'], st: ['FINISH'] }),
      L('grills-railings-gates', 'Grills, Railings & Gates', { syn: ['window grill', 'ss railing', 'iron gate', 'metal fabrication'], terms: ['grill and gate fabricator', 'stainless steel railing'], osm: ['craft=metal_construction'], st: ['FINISH'], st2: ['EXT'] }),
      L('mosquito-nets-screens', 'Mosquito Nets & Screens', { syn: ['insect screen', 'safety net', 'balcony net'], terms: ['mosquito net installation'], st: ['FINISH'] }),
      L('locks-hardware-locksmith', 'Locks, Hardware & Locksmith', { syn: ['locksmith', 'door hardware', 'door fittings'], terms: ['locksmith', 'door hardware supplier'], g: ['locksmith'], st: ['FINISH'] }),
    ],
  },
  {
    slug: 'electrical-power',
    name: 'Electrical & Power',
    description: 'Wiring, panels, power backup and electrical safety.',
    children: [
      L('electrician', 'Electrician', { syn: ['electrical contractor', 'wireman', 'electrical work', 'house wiring'], terms: ['electrician', 'electrical contractor'], g: ['electrician'], osm: ['craft=electrician'], st: ['MEP'], st2: ['FINISH'] }),
      L('wiring-panel-installation', 'Wiring & Panel Installation', { syn: ['db panel', 'distribution board', 'concealed wiring', 'mcb installation'], terms: ['electrical wiring contractor', 'electrical panel installation'], st: ['MEP'] }),
      L('earthing-lightning-protection', 'Earthing & Lightning Protection', { syn: ['earthing contractor', 'lightning arrestor', 'surge protection'], terms: ['earthing and lightning protection'], st: ['MEP'] }),
      L('inverter-ups-generator', 'Inverter, UPS & Generator', { syn: ['power backup', 'dg set', 'inverter installation', 'battery backup'], terms: ['inverter installation', 'generator installation'], st: ['MEP'], st2: ['FINISH'] }),
      L('ev-charger-installation', 'EV Charger Installation', { syn: ['ev charging point', 'electric vehicle charger'], terms: ['ev charger installation'], st: ['MEP'], st2: ['EXT'] }),
      L('lighting-installation', 'Lighting Installation', { syn: ['led lighting', 'decorative lighting', 'light fixtures fitting'], terms: ['lighting installation services'], st: ['FINISH'] }),
    ],
  },
  {
    slug: 'plumbing-sanitation',
    name: 'Plumbing & Sanitation',
    description: 'Water supply, drainage, sanitary fittings and gas pipelines.',
    children: [
      L('plumber', 'Plumber', { syn: ['plumbing contractor', 'plumbing work', 'pipe fitter'], terms: ['plumber', 'plumbing contractor'], g: ['plumber'], osm: ['craft=plumber'], st: ['MEP'], st2: ['FINISH'] }),
      L('sanitary-fitting-installation', 'Sanitary Fitting Installation', { syn: ['bathroom fittings', 'cp fittings', 'commode installation', 'wash basin fitting'], terms: ['bathroom fitting installation'], st: ['FINISH'], st2: ['MEP'] }),
      L('drainage-sewer-septic', 'Drainage, Sewer & Septic', { syn: ['septic tank', 'sewer line', 'drain pipe', 'soak pit'], terms: ['septic tank contractor', 'drainage contractor'], st: ['FOUND', 'MEP'] }),
      L('water-tanks-sumps', 'Water Tanks & Sumps', { syn: ['overhead tank', 'underground sump', 'water storage tank'], terms: ['water tank installation', 'sump construction'], st: ['STRUCT', 'MEP'] }),
      L('gas-pipeline-installation', 'Gas Pipeline Installation', { syn: ['png connection', 'lpg pipeline', 'piped gas'], terms: ['gas pipeline installation'], st: ['MEP'] }),
      L('water-pumps-motors', 'Water Pumps & Motors', { syn: ['pump installation', 'booster pump', 'submersible pump'], terms: ['water pump installation'], st: ['MEP'] }),
    ],
  },
  {
    slug: 'flooring-surface-finishes',
    name: 'Flooring & Surface Finishes',
    description: 'Tiles, stone, wood and other floor and wall surface work.',
    children: [
      L('tile-flooring-contractor', 'Tile Flooring Contractor', { syn: ['tiler', 'tile fixing', 'vitrified tile laying', 'floor tiling'], terms: ['tile contractor', 'tile fitting services'], osm: ['craft=tiler'], st: ['FINISH'] }),
      L('marble-granite-stone', 'Marble, Granite & Stone Work', { syn: ['marble flooring', 'granite countertop', 'kota stone', 'stone cladding'], terms: ['marble contractor', 'granite fitting'], osm: ['craft=stonemason'], st: ['FINISH'] }),
      L('wooden-laminate-flooring', 'Wooden & Laminate Flooring', { syn: ['wooden floor', 'laminate floor', 'engineered wood flooring'], terms: ['wooden flooring contractor'], st: ['FINISH'] }),
      L('vinyl-carpet-flooring', 'Vinyl & Carpet Flooring', { syn: ['pvc flooring', 'carpet installation', 'spc flooring'], terms: ['vinyl flooring installation'], st: ['FINISH'] }),
      L('epoxy-specialty-flooring', 'Epoxy & Specialty Flooring', { syn: ['epoxy floor', 'polished concrete', 'ips flooring', 'kota polishing'], terms: ['epoxy flooring contractor'], st: ['FINISH'] }),
      L('wall-tiling-cladding', 'Wall Tiling & Cladding', { syn: ['bathroom tiling', 'kitchen backsplash', 'wall tile fixing'], terms: ['wall tiling contractor'], st: ['FINISH'] }),
      L('stone-floor-polishing', 'Stone Polishing & Restoration', { syn: ['marble polishing', 'floor grinding', 'granite polishing'], terms: ['marble polishing services'], st: ['FINISH', 'HAND'] }),
    ],
  },
  {
    slug: 'plastering-painting',
    name: 'Plastering & Painting',
    description: 'Wall preparation, plaster, putty, paint and decorative coatings.',
    children: [
      L('plastering-contractor', 'Plastering Contractor', { syn: ['plasterer', 'wall plastering', 'cement plaster', 'sand faced plaster'], terms: ['plastering contractor'], osm: ['craft=plasterer'], st: ['FINISH', 'STRUCT'] }),
      L('putty-wall-finishing', 'Putty & Wall Finishing', { syn: ['wall putty', 'pop punning', 'primer coating'], terms: ['wall putty contractor', 'pop punning'], st: ['FINISH'] }),
      L('interior-painting', 'Interior Painting', { syn: ['painter', 'house painting', 'wall painting', 'home painters'], terms: ['house painter', 'interior painting contractor'], g: ['painter'], osm: ['craft=painter'], st: ['FINISH'] }),
      L('exterior-painting', 'Exterior Painting', { syn: ['exterior wall paint', 'weatherproof paint', 'building painting'], terms: ['exterior painting contractor'], g: ['painter'], osm: ['craft=painter'], st: ['FINISH', 'EXT'] }),
      L('texture-decorative-paint', 'Texture & Decorative Paint', { syn: ['texture painting', 'stencil', 'royale play', 'wall texture'], terms: ['texture paint contractor'], st: ['FINISH'] }),
      L('wallpaper-wall-art', 'Wallpaper & Wall Art', { syn: ['wallpaper installation', 'wall mural', '3d wall panel'], terms: ['wallpaper installation'], st: ['FINISH'] }),
      L('wood-polish-coatings', 'Wood Polish & Coatings', { syn: ['pu polish', 'melamine polish', 'duco paint', 'wood finishing'], terms: ['wood polish contractor'], st: ['FINISH'] }),
    ],
  },
  {
    slug: 'interior-design-furnishing',
    name: 'Interior Design & Furnishing',
    description: 'Interiors, woodwork, kitchens, ceilings and soft furnishings.',
    children: [
      L('interior-designer', 'Interior Designer', { syn: ['interior design firm', 'home interiors', 'interior decorator'], terms: ['interior designer', 'home interior design'], st: ['PLAN', 'FINISH'] }),
      L('modular-kitchen', 'Modular Kitchen', { syn: ['kitchen cabinets', 'kitchen designer', 'kitchen modular'], terms: ['modular kitchen manufacturer'], osm: ['shop=kitchen'], st: ['FINISH'] }),
      L('carpenter-woodwork', 'Carpenter & Woodwork', { syn: ['carpenter', 'furniture maker', 'wooden work', 'plywood work', 'wardrobe maker'], terms: ['carpenter', 'custom furniture maker'], osm: ['craft=carpenter'], st: ['FINISH'] }),
      L('false-ceiling-gypsum', 'False Ceiling & Gypsum', { syn: ['pop ceiling', 'gypsum board', 'drywall', 'ceiling contractor'], terms: ['false ceiling contractor'], st: ['FINISH'] }),
      L('furniture-store', 'Furniture Store', { syn: ['furniture showroom', 'sofa shop', 'home furniture'], terms: ['furniture store'], g: ['furniture_store'], osm: ['shop=furniture'], st: ['FINISH', 'HAND'] }),
      L('curtains-blinds-upholstery', 'Curtains, Blinds & Upholstery', { syn: ['window blinds', 'curtain maker', 'sofa upholstery'], terms: ['curtains and blinds'], osm: ['shop=curtain'], st: ['FINISH', 'HAND'] }),
      L('decor-lighting-showroom', 'Decor & Lighting Showroom', { syn: ['lighting store', 'home decor shop', 'chandelier'], terms: ['lighting showroom', 'home decor store'], osm: ['shop=lighting'], st: ['FINISH', 'HAND'] }),
    ],
  },
  {
    slug: 'hvac-mechanical-systems',
    name: 'HVAC & Mechanical Systems',
    description: 'Cooling, ventilation, lifts, water heating and fire safety systems.',
    children: [
      L('air-conditioning-installation', 'Air Conditioning Installation', { syn: ['ac installation', 'split ac fitting', 'vrv system', 'ac installer'], terms: ['ac installation services', 'air conditioner installer'], osm: ['craft=hvac'], st: ['MEP'], st2: ['HAND'] }),
      L('ventilation-exhaust', 'Ventilation & Exhaust', { syn: ['exhaust fan', 'duct work', 'kitchen chimney installation', 'ventilation system'], terms: ['ventilation system contractor'], osm: ['craft=hvac'], st: ['MEP'] }),
      L('lift-elevator-installation', 'Lift & Elevator Installation', { syn: ['home lift', 'elevator', 'stair lift', 'passenger lift'], terms: ['home lift installation', 'elevator company'], st: ['STRUCT', 'MEP'] }),
      L('water-heating-systems', 'Water Heating Systems', { syn: ['geyser installation', 'heat pump', 'instant water heater'], terms: ['geyser installation'], st: ['MEP'] }),
      L('fire-safety-systems', 'Fire Safety Systems', { syn: ['fire fighting', 'sprinkler', 'fire extinguisher', 'smoke detector'], terms: ['fire safety system installation'], st: ['MEP'] }),
    ],
  },
  {
    slug: 'smart-home-security',
    name: 'Smart Home & Security',
    description: 'Automation, surveillance, access control and structured cabling.',
    children: [
      L('cctv-installation', 'CCTV Installation', { syn: ['cctv camera', 'surveillance system', 'security camera installation'], terms: ['cctv installation'], st: ['MEP', 'SEC'], st2: ['HAND'] }),
      L('smart-home-automation', 'Smart Home Automation', { syn: ['home automation', 'smart lighting', 'knx', 'google home setup'], terms: ['smart home automation company'], st: ['MEP', 'SEC'], st2: ['FINISH'] }),
      L('video-door-phone-intercom', 'Video Door Phone & Intercom', { syn: ['intercom', 'video doorbell', 'door phone'], terms: ['video door phone installation'], st: ['SEC'], st2: ['MEP'] }),
      L('alarm-systems', 'Burglar & Fire Alarm Systems', { syn: ['burglar alarm', 'fire alarm', 'security alarm'], terms: ['burglar alarm installation'], st: ['SEC'], st2: ['MEP'] }),
      L('access-control-smart-locks', 'Access Control & Smart Locks', { syn: ['digital lock', 'biometric lock', 'smart door lock', 'rfid lock'], terms: ['smart door lock installation'], st: ['SEC'], st2: ['FINISH'] }),
      L('structured-cabling-wifi', 'Structured Cabling & Wi-Fi', { syn: ['lan cabling', 'internet installation', 'network cabling', 'wifi setup'], terms: ['structured cabling contractor', 'wifi installation'], st: ['MEP', 'SEC'] }),
      L('home-theatre-av', 'Home Theatre & AV Wiring', { syn: ['home cinema', 'av installation', 'speaker wiring'], terms: ['home theatre installation'], st: ['MEP'], st2: ['FINISH'] }),
    ],
  },
  {
    slug: 'external-development-landscaping',
    name: 'External Development & Landscaping',
    description: 'Compound, driveway, garden, pool and outdoor works.',
    children: [
      L('landscaping-gardening', 'Landscaping & Gardening', { syn: ['landscape designer', 'gardener', 'garden design', 'lawn development'], terms: ['landscape contractor', 'garden design services'], osm: ['craft=gardener'], st: ['EXT'], st2: ['HAND'] }),
      L('compound-wall-gate', 'Compound Wall & Gate', { syn: ['boundary wall', 'compound wall contractor', 'main gate'], terms: ['compound wall contractor'], st: ['EXT'], st2: ['STRUCT'] }),
      L('paver-blocks-driveway', 'Paver Blocks & Driveway', { syn: ['paving contractor', 'interlocking tiles', 'driveway flooring', 'cobblestone'], terms: ['paver block contractor'], st: ['EXT'] }),
      L('swimming-pool-contractor', 'Swimming Pool Contractor', { syn: ['pool builder', 'pool construction', 'plunge pool'], terms: ['swimming pool contractor'], st: ['EXT'], st2: ['STRUCT'] }),
      L('artificial-turf-lawn', 'Artificial Turf & Lawn', { syn: ['synthetic grass', 'lawn installation', 'grass carpet'], terms: ['artificial grass installation'], st: ['EXT'] }),
      L('parking-sheds-canopies', 'Parking Sheds & Canopies', { syn: ['car porch', 'tensile structure', 'canopy fabrication'], terms: ['car parking shed'], st: ['EXT'] }),
      L('terrace-vertical-garden', 'Terrace & Vertical Garden', { syn: ['roof garden', 'green wall', 'balcony garden'], terms: ['terrace garden contractor'], st: ['EXT'], st2: ['HAND'] }),
    ],
  },
  {
    slug: 'building-materials-retail',
    name: 'Building Materials & Retail',
    description: 'Suppliers, dealers and showrooms for construction materials and fittings.',
    children: [
      L('cement-supplier', 'Cement Supplier', { syn: ['cement dealer', 'cement distributor'], terms: ['cement dealer'], st: ['FOUND', 'STRUCT'] }),
      L('steel-tmt-supplier', 'Steel & TMT Supplier', { syn: ['tmt bars', 'steel dealer', 'rebar supplier', 'iron rod dealer'], terms: ['tmt bar dealer', 'steel supplier'], st: ['FOUND', 'STRUCT'] }),
      L('bricks-blocks-supplier', 'Bricks & Blocks Supplier', { syn: ['aac blocks', 'fly ash bricks', 'red bricks', 'concrete blocks'], terms: ['brick supplier', 'aac block dealer'], st: ['STRUCT'] }),
      L('sand-aggregate-supplier', 'Sand & Aggregate Supplier', { syn: ['m-sand', 'river sand', 'gravel', 'crushed stone', 'metal supplier'], terms: ['sand and aggregate supplier'], st: ['FOUND', 'STRUCT'] }),
      L('building-material-dealer', 'Building Material Dealer', { syn: ['construction material shop', 'building materials store'], terms: ['building material dealer'], osm: ['shop=trade'], st: ['FOUND', 'STRUCT'], st2: ['FINISH'] }),
      L('tiles-showroom', 'Tiles Showroom', { syn: ['tile shop', 'ceramic tiles dealer', 'vitrified tile showroom'], terms: ['tiles showroom'], osm: ['shop=tiles'], st: ['FINISH'] }),
      L('sanitaryware-bath-showroom', 'Sanitaryware & Bath Showroom', { syn: ['bath fittings showroom', 'sanitary ware dealer', 'cp fittings dealer'], terms: ['sanitaryware showroom'], osm: ['shop=bathroom_furnishing'], st: ['FINISH', 'MEP'] }),
      L('paint-shop', 'Paint Shop', { syn: ['paint dealer', 'paint store'], terms: ['paint dealer'], osm: ['shop=paint'], st: ['FINISH'] }),
      L('hardware-store', 'Hardware Store', { syn: ['hardware shop', 'home improvement store', 'tools shop'], terms: ['hardware store'], g: ['hardware_store', 'home_improvement_store'], osm: ['shop=hardware', 'shop=doityourself'], st: ['STRUCT'], st2: ['FINISH', 'MEP'] }),
      L('electrical-supplies-shop', 'Electrical Supplies Shop', { syn: ['electrical shop', 'wires and cables dealer', 'switch dealer'], terms: ['electrical shop'], osm: ['shop=electrical'], st: ['MEP'] }),
      L('plumbing-supplies-pipes', 'Plumbing Supplies & Pipes', { syn: ['pipe dealer', 'cpvc pipes', 'pvc fittings'], terms: ['plumbing material shop', 'pipe dealer'], st: ['MEP'] }),
      L('timber-plywood-supplier', 'Timber & Plywood Supplier', { syn: ['plywood dealer', 'wood supplier', 'laminates dealer', 'sunmica'], terms: ['plywood dealer', 'timber merchant'], st: ['STRUCT', 'FINISH'] }),
    ],
  },
  {
    slug: 'energy-water-sustainability',
    name: 'Energy, Water & Sustainability',
    description: 'Solar, water sourcing and treatment, harvesting and green building.',
    children: [
      L('solar-panel-installation', 'Solar Panel Installation', { syn: ['rooftop solar', 'solar epc', 'solar power plant', 'on-grid solar'], terms: ['rooftop solar installer'], st: ['SUST', 'MEP'], st2: ['HAND'] }),
      L('solar-water-heater', 'Solar Water Heater', { syn: ['solar geyser', 'solar thermal'], terms: ['solar water heater installation'], st: ['SUST', 'MEP'] }),
      L('rainwater-harvesting', 'Rainwater Harvesting', { syn: ['rain water harvesting', 'recharge pit', 'water harvesting'], terms: ['rainwater harvesting contractor'], st: ['SUST', 'EXT'] }),
      L('borewell-drilling', 'Borewell Drilling', { syn: ['bore well', 'tube well', 'borewell contractor', 'water boring'], terms: ['borewell drilling contractor'], st: ['SITE', 'SUST'] }),
      L('water-treatment-filtration', 'Water Treatment & Filtration', { syn: ['water softener', 'ro plant', 'water purification', 'whole house filter'], terms: ['water treatment plant installation'], st: ['MEP', 'SUST'] }),
      L('sewage-treatment-recycling', 'Sewage Treatment & Greywater Recycling', { syn: ['stp', 'greywater recycling', 'effluent treatment'], terms: ['sewage treatment plant contractor'], st: ['SUST', 'MEP'] }),
      L('green-building-energy-audit', 'Green Building & Energy Audit', { syn: ['igbc consultant', 'griha', 'energy audit', 'sustainable design'], terms: ['green building consultant', 'energy audit services'], st: ['PLAN', 'SUST'] }),
    ],
  },
  {
    slug: 'cleaning-maintenance-repairs',
    name: 'Cleaning, Maintenance & Repairs',
    description: 'Post-construction cleaning, pest control and upkeep.',
    children: [
      L('post-construction-cleaning', 'Post-Construction Cleaning', { syn: ['deep cleaning', 'builder cleaning', 'final cleaning', 'move in cleaning'], terms: ['post construction cleaning services'], st: ['HAND'] }),
      L('pest-control', 'Pest Control', { syn: ['termite control', 'pest management', 'fumigation'], terms: ['pest control services'], st: ['HAND'], st2: ['FOUND'] }),
      L('home-repair-handyman', 'Home Repair & Handyman', { syn: ['handyman', 'home maintenance', 'minor repairs', 'house repair'], terms: ['handyman services', 'home repair services'], st: ['HAND'] }),
      L('leakage-seepage-repair', 'Leakage & Seepage Repair', { syn: ['wall dampness', 'roof leakage repair', 'seepage treatment'], terms: ['leakage repair contractor'], st: ['HAND'], st2: ['FINISH'] }),
      L('debris-waste-removal', 'Debris & Waste Removal', { syn: ['construction waste', 'rubble removal', 'skip hire', 'malba removal'], terms: ['construction debris removal'], st: ['HAND'], st2: ['SITE'] }),
      L('tank-cleaning', 'Water Tank Cleaning', { syn: ['sump cleaning', 'overhead tank cleaning'], terms: ['water tank cleaning service'], st: ['HAND'] }),
    ],
  },
  {
    slug: 'specialist-services',
    name: 'Specialist Services',
    description: 'Inspection, audit, legal, valuation and other specialist support.',
    children: [
      L('home-inspection-snagging', 'Home Inspection & Snagging', { syn: ['snag list', 'pre-handover inspection', 'building inspection', 'home inspector'], terms: ['home inspection services', 'snagging inspection'], st: ['HAND'] }),
      L('structural-audit-ndt', 'Structural Audit & NDT', { syn: ['rebound hammer test', 'structural stability certificate', 'ndt testing', 'building audit'], terms: ['structural audit services'], st: ['STRUCT', 'HAND'] }),
      L('property-valuation', 'Property Valuation', { syn: ['valuer', 'property valuer', 'valuation report'], terms: ['property valuer'], st: ['HAND'] }),
      L('legal-title-documentation', 'Legal, Title & Documentation', { syn: ['property lawyer', 'title verification', 'registry work', 'completion certificate'], terms: ['property lawyer', 'title search advocate'], st: ['PLAN', 'HAND'] }),
      L('fire-noc-compliance', 'Fire NOC & Compliance', { syn: ['fire noc', 'occupancy certificate', 'regulatory compliance'], terms: ['fire noc consultant'], st: ['HAND'] }),
      L('acoustic-soundproofing', 'Acoustic & Soundproofing', { syn: ['sound proofing', 'acoustic panels', 'noise insulation'], terms: ['soundproofing contractor'], st: ['FINISH'] }),
      L('packers-movers', 'Packers & Movers', { syn: ['relocation services', 'house shifting', 'movers'], terms: ['packers and movers'], g: ['moving_company'], st: ['HAND'] }),
      L('other-specialist', 'Other Construction Specialist', { syn: ['specialist contractor', 'other services'], terms: ['construction specialist'], st: [] }),
    ],
  },
]

export const GROUP_COUNT = TAXONOMY.length
export const LEAF_COUNT = TAXONOMY.reduce((n, g) => n + g.children.length, 0)
