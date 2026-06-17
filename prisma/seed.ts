// @ts-ignore
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ── helpers ────────────────────────────────────────────────────────────────
function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d }
function daysAgoMs(n: number) { return daysAgo(n).getTime() }

// ── static lookup tables ───────────────────────────────────────────────────
const HOUSE_TYPES = [
  { name: 'Basic House',   description: 'Standard residential house' },
  { name: 'Duplex',        description: 'Dual-unit residential structure' },
  { name: 'Villa',         description: 'Premium independent residence' },
  { name: 'Farmhouse',     description: 'Rural or semi-rural residence' },
  { name: 'Luxury House',  description: 'High-end custom residence' },
  { name: 'Renovation',    description: 'Feature additions, upgrades, modifications' },
]

const STAGES_DATA = [
  { name: 'Planning',                description: 'Initial planning, design, and approvals',                    displayOrder: 1  },
  { name: 'Site Preparation',        description: 'Clearing the site and preparing for construction',           displayOrder: 2  },
  { name: 'Foundation',              description: 'Laying the foundation of the structure',                     displayOrder: 3  },
  { name: 'Structure',               description: 'Building the main structural frame',                         displayOrder: 4  },
  { name: 'Walls & Masonry',         description: 'Constructing external and internal walls',                   displayOrder: 5  },
  { name: 'Utilities',               description: 'Plumbing, electrical, gas, and internet rough-in',          displayOrder: 6  },
  { name: 'Surface Preparation',     description: 'Plastering and waterproofing all surfaces',                  displayOrder: 7  },
  { name: 'Flooring & Finishes',     description: 'Installing flooring and finishing materials',                displayOrder: 8  },
  { name: 'Painting',                description: 'Interior and exterior painting',                             displayOrder: 9  },
  { name: 'Fixtures & Installations',description: 'Electrical fixtures, plumbing fittings, and hardware',      displayOrder: 10 },
  { name: 'Kitchen',                 description: 'Modular kitchen, countertops, and appliances',              displayOrder: 11 },
  { name: 'Exterior Development',    description: 'Boundary wall, gate, driveway, and landscaping',            displayOrder: 12 },
  { name: 'Security & Connectivity', description: 'WiFi, CCTV, and smart home setup',                         displayOrder: 13 },
  { name: 'Sustainability',          description: 'Solar, battery backup, and EV charging',                    displayOrder: 14 },
  { name: 'Final Inspection',        description: 'Comprehensive inspection and defect resolution',             displayOrder: 15 },
  { name: 'Move-In Ready',           description: 'Project closure and handover',                               displayOrder: 16 },
]

// tasks per stage: [name, description, type (M/R/O), weight]
const TASKS_DATA: [string, string, string, string, number][] = [
  // Planning
  ['Planning', 'Site Survey',                'Site survey of the plot boundaries',                   'MANDATORY',    15],
  ['Planning', 'Floor Plan Finalization',    'Finalize floor plan with architect',                   'MANDATORY',    20],
  ['Planning', 'Structural Design',          'Complete structural engineering design',                'MANDATORY',    20],
  ['Planning', 'Room Layout Finalization',   'Finalize room dimensions and layout',                  'MANDATORY',    15],
  ['Planning', 'Utility Planning',           'Plan electrical, plumbing, and gas routing',           'MANDATORY',    15],
  ['Planning', 'Soil Testing',               'Test soil bearing capacity',                           'RECOMMENDED',  10],
  ['Planning', 'Future Expansion Planning',  'Plan for potential future additions',                  'RECOMMENDED',  10],
  ['Planning', 'Smart Home Planning',        'Plan smart home infrastructure',                       'OPTIONAL',      5],
  ['Planning', 'Solar Planning',             'Assess solar potential',                               'OPTIONAL',      5],
  // Site Preparation
  ['Site Preparation', 'Site Clearing',              'Clear site of vegetation and debris',          'MANDATORY',    15],
  ['Site Preparation', 'Material Storage Setup',     'Set up secure material storage areas',         'MANDATORY',    10],
  ['Site Preparation', 'Temporary Water Supply',     'Arrange temporary water for construction',     'MANDATORY',    15],
  ['Site Preparation', 'Temporary Electricity Supply','Arrange temporary power connection',          'MANDATORY',    15],
  ['Site Preparation', 'Excavation',                 'Excavate as per structural design',            'MANDATORY',    20],
  ['Site Preparation', 'Site Security Setup',        'Set up fencing and security measures',         'RECOMMENDED',  15],
  ['Site Preparation', 'CCTV Monitoring',            'Install site monitoring cameras',              'OPTIONAL',     10],
  // Foundation
  ['Foundation', 'Footing Marking',           'Mark footing positions per structural drawings', 'MANDATORY',    10],
  ['Foundation', 'Excavation Verification',   'Verify excavation depth and dimensions',         'MANDATORY',    10],
  ['Foundation', 'Reinforcement Placement',   'Place steel reinforcement per design',           'MANDATORY',    20],
  ['Foundation', 'Concrete Pouring',          'Pour concrete for footings and foundation',      'MANDATORY',    20],
  ['Foundation', 'Foundation Waterproofing',  'Apply waterproofing to foundation',              'MANDATORY',    15],
  ['Foundation', 'Curing',                    'Cure concrete for minimum 21 days',              'MANDATORY',    15],
  ['Foundation', 'Foundation Inspection',     'Independent inspection of completed foundation', 'RECOMMENDED',   5],
  ['Foundation', 'Additional Waterproofing',  'Premium waterproofing treatment',                'OPTIONAL',      5],
  // Structure
  ['Structure', 'Column Construction',    'Construct all structural columns',    'MANDATORY',    15],
  ['Structure', 'Beam Construction',      'Construct all structural beams',      'MANDATORY',    15],
  ['Structure', 'Slab Construction',      'Pour and cure floor slabs',           'MANDATORY',    20],
  ['Structure', 'Staircase Construction', 'Construct staircases per design',     'MANDATORY',    15],
  ['Structure', 'Roof Slab Construction', 'Pour and cure roof slab',             'MANDATORY',    20],
  ['Structure', 'Structural Curing',      'Cure all structural elements',        'MANDATORY',    10],
  ['Structure', 'Structural Inspection',  'Independent structural inspection',   'RECOMMENDED',   3],
  ['Structure', 'Future Lift Provision',  'Provision for elevator shaft',        'OPTIONAL',      2],
  // Walls & Masonry
  ['Walls & Masonry', 'External Walls',        'Construct all external walls',        'MANDATORY',    20],
  ['Walls & Masonry', 'Internal Walls',        'Construct all internal partition walls','MANDATORY', 20],
  ['Walls & Masonry', 'Door Openings',         'Mark and create all door openings',   'MANDATORY',    15],
  ['Walls & Masonry', 'Window Openings',       'Mark and create all window openings', 'MANDATORY',    15],
  ['Walls & Masonry', 'Ventilation Openings',  'Create ventilation openings',         'MANDATORY',    15],
  ['Walls & Masonry', 'Alignment Verification','Verify all wall alignments',          'RECOMMENDED',  10],
  ['Walls & Masonry', 'Decorative Brickwork',  'Add decorative masonry elements',     'OPTIONAL',      5],
  // Utilities
  ['Utilities', 'Plumbing Layout',            'Mark all plumbing routes on walls',   'MANDATORY',     8],
  ['Utilities', 'Plumbing Rough-In',          'Install supply and return lines',     'MANDATORY',    10],
  ['Utilities', 'Drainage Installation',      'Install complete drainage system',    'MANDATORY',    10],
  ['Utilities', 'Electrical Layout',          'Mark all electrical circuit routes',  'MANDATORY',     8],
  ['Utilities', 'Conduit Installation',       'Install electrical conduits in walls','MANDATORY',    10],
  ['Utilities', 'Wire Pulling',               'Pull wires through conduits',         'MANDATORY',    10],
  ['Utilities', 'Distribution Board Setup',   'Install main distribution board',     'MANDATORY',     8],
  ['Utilities', 'Gas Pipeline Installation',  'Install gas pipeline',               'MANDATORY',     8],
  ['Utilities', 'Internet Conduit Installation','Install conduits for data cables',  'MANDATORY',     8],
  ['Utilities', 'Utility Testing',            'Test all utility systems',            'MANDATORY',    10],
  ['Utilities', 'Spare Conduit Installation', 'Install additional conduits',         'RECOMMENDED',   5],
  ['Utilities', 'Future Expansion Wiring',    'Additional wiring for expansion',     'RECOMMENDED',   5],
  ['Utilities', 'CCTV Conduits',              'Install conduits for CCTV cameras',   'OPTIONAL',      0],
  ['Utilities', 'Smart Home Wiring',          'Install smart home control wiring',   'OPTIONAL',      0],
  ['Utilities', 'Solar Preparation Wiring',   'Install conduits for solar system',   'OPTIONAL',      0],
  ['Utilities', 'EV Charger Preparation',     'Wiring and conduit for EV charger',   'OPTIONAL',      0],
  // Surface Preparation
  ['Surface Preparation', 'Internal Plastering',     'Plaster all internal walls',         'MANDATORY',    15],
  ['Surface Preparation', 'External Plastering',     'Plaster all external walls',         'MANDATORY',    15],
  ['Surface Preparation', 'Bathroom Waterproofing',  'Waterproof bathroom surfaces',       'MANDATORY',    15],
  ['Surface Preparation', 'Balcony Waterproofing',   'Waterproof balcony surfaces',        'MANDATORY',    15],
  ['Surface Preparation', 'Terrace Waterproofing',   'Waterproof terrace',                 'MANDATORY',    15],
  ['Surface Preparation', 'Waterproofing Test',      'Water retention test',               'MANDATORY',    15],
  ['Surface Preparation', 'Additional Leak Inspection','Inspect for any leaks',            'RECOMMENDED',   5],
  ['Surface Preparation', 'Premium Waterproofing',   'Apply crystalline waterproofing',    'OPTIONAL',      5],
  // Flooring & Finishes
  ['Flooring & Finishes', 'Flooring Material Selection','Finalise flooring materials',     'MANDATORY',    10],
  ['Flooring & Finishes', 'Flooring Installation',     'Install flooring across all rooms','MANDATORY',    30],
  ['Flooring & Finishes', 'Skirting Installation',     'Install skirting tiles or boards', 'MANDATORY',    15],
  ['Flooring & Finishes', 'Stair Finish Installation', 'Install staircase flooring',       'MANDATORY',    20],
  ['Flooring & Finishes', 'Final Alignment Check',     'Verify flooring alignment',        'MANDATORY',    15],
  ['Flooring & Finishes', 'Spare Tile Storage',        'Store spare tiles for repairs',    'RECOMMENDED',   5],
  ['Flooring & Finishes', 'Premium Flooring',          'Premium marble or hardwood',       'OPTIONAL',      5],
  // Painting
  ['Painting', 'Surface Preparation for Paint','Sand and prepare surfaces',     'MANDATORY',    15],
  ['Painting', 'Putty Application',            'Apply wall putty to interiors',  'MANDATORY',    15],
  ['Painting', 'Primer Application',           'Apply primer coat',              'MANDATORY',    15],
  ['Painting', 'Interior Painting',            'Apply finish coats to interiors','MANDATORY',    20],
  ['Painting', 'Exterior Painting',            'Apply exterior weather-proof paint','MANDATORY', 20],
  ['Painting', 'Touch-Ups',                    'Complete all touch-ups',         'MANDATORY',     5],
  ['Painting', 'Paint Quality Inspection',     'Inspect paint finish quality',   'RECOMMENDED',   5],
  ['Painting', 'Texture Finishes',             'Apply decorative texture',       'OPTIONAL',      5],
  // Fixtures & Installations
  ['Fixtures & Installations', 'Switch Installation',       'Install all switches and sockets',    'MANDATORY',    15],
  ['Fixtures & Installations', 'Light Installation',        'Install all light fixtures',          'MANDATORY',    15],
  ['Fixtures & Installations', 'Fan Installation',          'Install all ceiling fans',            'MANDATORY',    10],
  ['Fixtures & Installations', 'Tap Installation',          'Install all taps and faucets',        'MANDATORY',    15],
  ['Fixtures & Installations', 'Sanitaryware Installation', 'Install toilets and washbasins',      'MANDATORY',    20],
  ['Fixtures & Installations', 'Water Heater Installation', 'Install water heaters',              'MANDATORY',    15],
  ['Fixtures & Installations', 'Fixture Inspection',        'Inspect all installed fixtures',      'RECOMMENDED',   5],
  ['Fixtures & Installations', 'Smart Fixtures',            'Install smart switches',              'OPTIONAL',      5],
  // Kitchen
  ['Kitchen', 'Cabinet Installation',    'Install modular kitchen cabinets', 'MANDATORY',    20],
  ['Kitchen', 'Countertop Installation', 'Install kitchen countertop',       'MANDATORY',    20],
  ['Kitchen', 'Sink Installation',       'Install kitchen sink and faucet',  'MANDATORY',    15],
  ['Kitchen', 'Appliance Setup',         'Install kitchen appliances',       'MANDATORY',    20],
  ['Kitchen', 'Final Kitchen Inspection','Complete kitchen inspection',      'MANDATORY',    15],
  ['Kitchen', 'Chimney Installation',    'Install kitchen chimney',          'RECOMMENDED',   5],
  ['Kitchen', 'Smart Kitchen Integration','Connect to smart home system',    'OPTIONAL',      5],
  // Exterior Development
  ['Exterior Development', 'Boundary Wall', 'Construct compound wall',          'MANDATORY',    20],
  ['Exterior Development', 'Main Gate',     'Install main entrance gate',       'MANDATORY',    20],
  ['Exterior Development', 'Driveway',      'Construct driveway and parking',   'MANDATORY',    25],
  ['Exterior Development', 'Exterior Cleanup','Clean up construction waste',    'MANDATORY',    20],
  ['Exterior Development', 'Site Finishing', 'Final leveling of exterior',      'MANDATORY',    10],
  ['Exterior Development', 'Landscaping',   'Plant trees and lay lawn',         'RECOMMENDED',   4],
  ['Exterior Development', 'Garden Features','Add garden decorative elements',  'OPTIONAL',      1],
  // Security & Connectivity
  ['Security & Connectivity', 'WiFi Setup',       'Install and configure WiFi',         'MANDATORY',    20],
  ['Security & Connectivity', 'Router Installation','Install internet router',          'MANDATORY',    20],
  ['Security & Connectivity', 'Network Testing',  'Test internet connectivity',         'MANDATORY',    20],
  ['Security & Connectivity', 'CCTV Installation','Install CCTV cameras and DVR',       'RECOMMENDED',  15],
  ['Security & Connectivity', 'Video Doorbell',   'Install video doorbell',             'RECOMMENDED',  15],
  ['Security & Connectivity', 'Smart Locks',      'Install smart door locks',           'OPTIONAL',      5],
  ['Security & Connectivity', 'Smart Automation', 'Configure home automation',          'OPTIONAL',      5],
  // Sustainability
  ['Sustainability', 'System Assessment',        'Assess power requirements',         'MANDATORY',    15],
  ['Sustainability', 'Installation Preparation', 'Prepare roof for solar',            'MANDATORY',    15],
  ['Sustainability', 'Solar System Installation','Install solar panels and inverter', 'MANDATORY',    30],
  ['Sustainability', 'Solar System Testing',     'Test and commission solar system',  'MANDATORY',    20],
  ['Sustainability', 'Solar Handover',           'System handover and documentation', 'MANDATORY',    10],
  ['Sustainability', 'Battery Backup',           'Install battery backup system',     'RECOMMENDED',   5],
  ['Sustainability', 'EV Charger',               'Install EV charging point',         'OPTIONAL',      5],
  // Final Inspection
  ['Final Inspection', 'Plumbing Inspection',      'Inspect all plumbing',          'MANDATORY',    15],
  ['Final Inspection', 'Electrical Inspection',    'Inspect all electrical',        'MANDATORY',    15],
  ['Final Inspection', 'Waterproofing Inspection', 'Verify all waterproofing',      'MANDATORY',    15],
  ['Final Inspection', 'Paint Inspection',         'Inspect paint quality',         'MANDATORY',    10],
  ['Final Inspection', 'Flooring Inspection',      'Inspect flooring for defects',  'MANDATORY',    10],
  ['Final Inspection', 'Final Defect List',        'Compile complete defect list',  'MANDATORY',    15],
  ['Final Inspection', 'Defect Resolution',        'Resolve all defects',           'MANDATORY',    15],
  ['Final Inspection', 'Independent Inspection',   'Third-party professional inspection','RECOMMENDED',4],
  ['Final Inspection', 'Third Party Audit',        'Audit by external agency',      'OPTIONAL',      1],
  // Move-In Ready
  ['Move-In Ready', 'Project Closure',      'Complete administrative closure',       'MANDATORY',    20],
  ['Move-In Ready', 'Document Organization','Organise all project documents',        'MANDATORY',    20],
  ['Move-In Ready', 'Warranty Storage',     'Store all product warranties',          'MANDATORY',    20],
  ['Move-In Ready', 'Final Progress Snapshot','Take final photos of completed house','MANDATORY',    20],
  ['Move-In Ready', 'Milestone Completion', 'Mark project as Move-In Ready',         'MANDATORY',    20],
]

const DECISIONS_DATA: [string, string, string, boolean][] = [
  ['Planning', 'House Layout',             'Finalise overall house layout and design',              true],
  ['Planning', 'Floor Count',              'Decide on the number of floors',                       true],
  ['Planning', 'Bedroom Count',            'Decide on the number of bedrooms',                     true],
  ['Planning', 'Bathroom Count',           'Decide on the number of bathrooms',                    true],
  ['Site Preparation', 'Material Storage Location','Choose where to store materials on site',       false],
  ['Foundation', 'Waterproofing Level',    'Choose foundation waterproofing level',                true],
  ['Structure', 'Future Lift Provision',   'Provision for a future elevator shaft',                false],
  ['Walls & Masonry', 'Wall Material Selection','Choose wall material',                            true],
  ['Utilities', 'Wire Brand',              'Choose electrical wire brand',                         true],
  ['Utilities', 'Pipe Brand',              'Choose plumbing pipe brand',                           true],
  ['Utilities', 'Internet Ready',          'Decide on internet connectivity standard',             true],
  ['Utilities', 'Inverter Required',       'Decide whether to install an inverter',                false],
  ['Surface Preparation', 'Waterproofing Type','Choose waterproofing chemical brand',              true],
  ['Flooring & Finishes', 'Tile Type',     'Choose tile type',                                     true],
  ['Flooring & Finishes', 'Tile Contractor','Select flooring contractor',                          true],
  ['Painting', 'Paint Type',               'Choose paint brand',                                   true],
  ['Painting', 'Paint Color',              'Finalise interior and exterior colour scheme',         true],
  ['Fixtures & Installations', 'Switch Brand','Choose switch and socket brand',                   true],
  ['Fixtures & Installations', 'Fixture Selection','Choose bathroom and kitchen fixtures',         true],
  ['Kitchen', 'Kitchen Style',             'Choose kitchen style',                                 true],
  ['Kitchen', 'Countertop Type',           'Choose countertop material',                           true],
  ['Exterior Development', 'Gate Design',  'Choose main gate design and material',                 true],
  ['Exterior Development', 'Landscaping Style','Choose landscaping style',                        false],
  ['Security & Connectivity', 'CCTV Setup','Decide on CCTV camera count and placement',           false],
  ['Security & Connectivity', 'Smart Lock Required','Decide whether to install smart locks',      false],
  ['Sustainability', 'Solar Type',         'Choose solar system type',                             true],
  ['Sustainability', 'Battery Backup',     'Decide on battery backup capacity',                    false],
  ['Final Inspection', 'Move-In Approval', 'Final approval to proceed with move-in',              true],
]

const ALERTS_DATA: [string | null, string, string, string, string][] = [
  ['Planning',            'DEPENDENCY', 'Structural Design Incomplete',    'Start construction only after structural design is finalised.',     'CRITICAL'],
  ['Planning',            'WARNING',    'Utility Planning Incomplete',     'Utility planning must be completed before site preparation begins.', 'HIGH'],
  ['Utilities',           'WARNING',    'Utilities Testing Incomplete',    'All utilities must be tested before plastering commences.',         'CRITICAL'],
  ['Utilities',           'WARNING',    'Plumbing Testing Incomplete',     'Plumbing must be pressure tested before walls are plastered.',      'HIGH'],
  ['Surface Preparation', 'WARNING',    'Waterproofing Test Missing',      'Water retention test must be done before flooring installation.',   'CRITICAL'],
  ['Flooring & Finishes', 'DEPENDENCY', 'Waterproofing Not Verified',     'Flooring cannot proceed until waterproofing test has passed.',      'HIGH'],
  [null, 'PROGRESS', 'No Recent Progress Updates',  'No progress updates received in the last 7 days.',         'MEDIUM'],
  [null, 'BUDGET',   'Budget Overrun Detected',      'Project spending has exceeded the estimated cost range.',   'HIGH'],
  [null, 'WEATHER',  'Heavy Rain Alert',              'Heavy rainfall expected — exterior work may be affected.',  'MEDIUM'],
  [null, 'WEATHER',  'Extreme Heat Alert',            'Extreme temperatures may affect concrete curing.',          'MEDIUM'],
  [null, 'DECISION', 'Pending Decision Required',     'A required decision is pending and may block construction.','MEDIUM'],
]

const MILESTONES_DATA = [
  { title: 'Foundation Complete',  description: 'Foundation successfully completed and inspected.' },
  { title: 'Structure Complete',   description: 'Main structural frame including columns, beams, and slabs complete.' },
  { title: 'Utilities Complete',   description: 'All rough-in work complete and tested.' },
  { title: 'Interior Complete',    description: 'All interior work — flooring, painting, fixtures — complete.' },
  { title: 'Move-In Ready',        description: 'House passed all inspections and ready for occupation.' },
]

const FEATURES_DATA: [string, string, string][] = [
  ['CCTV',                'SECURITY',   'Closed-circuit television surveillance'],
  ['Video Doorbell',      'SECURITY',   'Smart video doorbell with remote viewing'],
  ['Smart Lock',          'SECURITY',   'Smart electronic door locks'],
  ['Motion Sensors',      'SECURITY',   'Motion detection security sensors'],
  ['Intercom',            'SECURITY',   'Internal intercom system'],
  ['Smart Lighting',      'SMART_HOME', 'Automated and app-controlled lighting'],
  ['Smart Switches',      'SMART_HOME', 'App-controlled electrical switches'],
  ['Smart Curtains',      'SMART_HOME', 'Motorised curtain system'],
  ['Home Automation Hub', 'SMART_HOME', 'Central smart home control system'],
  ['Solar Panels',        'ENERGY',     'Rooftop solar panel installation'],
  ['Inverter System',     'ENERGY',     'Power backup inverter system'],
  ['Battery Backup',      'ENERGY',     'Battery storage for solar/inverter'],
  ['EV Charger',          'ENERGY',     'Electric vehicle charging point'],
  ['Borewell',            'WATER',      'Underground water borewell'],
  ['Rainwater Harvesting','WATER',      'Rainwater collection and storage'],
  ['Water Softener',      'WATER',      'Hard water treatment system'],
  ['RO System',           'WATER',      'Reverse osmosis water purification'],
  ['Pressure Pump',       'WATER',      'Water pressure booster pump'],
  ['Water Level Controller','WATER',    'Automatic water level monitoring'],
  ['False Ceiling',       'COMFORT',    'Suspended false ceiling system'],
  ['Terrace Garden',      'COMFORT',    'Rooftop garden setup'],
  ['AC Preparation',      'COMFORT',    'Pre-wiring for split ACs'],
  ['Centralized AC Preparation','COMFORT','Ducted centralised AC preparation'],
  ['Garden',              'EXTERIOR',   'Garden with plants and lawn'],
  ['Landscaping',         'EXTERIOR',   'Professional landscaping design'],
  ['Boundary Wall',       'EXTERIOR',   'Compound boundary wall'],
  ['Main Gate',           'EXTERIOR',   'Main entrance gate'],
  ['Driveway',            'EXTERIOR',   'Paved driveway to parking'],
  ['Swimming Pool',       'PREMIUM',    'In-ground swimming pool'],
  ['Lift',                'PREMIUM',    'Residential elevator'],
  ['Home Theater',        'PREMIUM',    'Dedicated home theater room'],
  ['Servant Quarter',     'PREMIUM',    'Dedicated servant quarter'],
  ['Gym Room',            'PREMIUM',    'Dedicated gym/fitness room'],
]

const SERVICE_CATEGORIES_DATA = [
  'Architect','Structural Engineer','Surveyor','Contractor','Mason',
  'Electrician','Plumber','Painter','Carpenter','Fabricator',
  'Waterproofing Contractor','POP Contractor','Interior Designer',
  'Solar Installer','CCTV Installer','Smart Home Installer',
  'Internet Installer','AC Installer','Borewell Contractor',
  'Landscaping Contractor','Water Tank Installer','Gate Fabricator',
  'Glass Contractor','Mesh Installer','Elevator Installer',
  'Generator Installer','Paver Contractor','Excavation Contractor',
  'Modular Kitchen Provider','Tile Supplier','Marble Supplier',
  'Cement Supplier','Steel Supplier','Flooring Contractor',
]

// 50 providers across all major Indian cities
const PROVIDERS_DATA: [string, string, string[], string[], boolean][] = [
  ['Sharma Constructions',          'Premium residential contractor with 15+ years experience.',         ['Contractor', 'Mason'],                              ['Bangalore', 'Mysore'],        true ],
  ['Verma Electricals',             'Certified electrical contractors for residential projects.',          ['Electrician'],                                      ['Delhi', 'Noida', 'Gurugram'], true ],
  ['AquaFit Plumbing',              'Expert plumbing solutions for homes and commercial buildings.',       ['Plumber'],                                          ['Mumbai', 'Pune'],             true ],
  ['SolarEdge India',               'Top-rated solar panel installation and commissioning.',               ['Solar Installer'],                                  ['Bangalore', 'Chennai'],       true ],
  ['DesignAxis Architects',         'Award-winning residential architecture firm.',                        ['Architect', 'Interior Designer'],                   ['Mumbai', 'Pune'],             true ],
  ['BuildSafe Contractors',         'Reliable general contractors for luxury residential projects.',       ['Contractor'],                                       ['Hyderabad', 'Secunderabad'],  true ],
  ['PipePro Plumbers',              'Specialist plumbing services with 24/7 support.',                    ['Plumber', 'Borewell Contractor'],                   ['Chennai', 'Coimbatore'],      true ],
  ['LuminousElec',                  'Licensed electricians for new construction and renovations.',         ['Electrician'],                                      ['Bangalore', 'Mangalore'],     true ],
  ['ColourCraft Painters',          'Premium interior and exterior painting specialists.',                 ['Painter'],                                          ['Delhi', 'Faridabad'],         true ],
  ['TileWorld India',               'India\'s largest tile supplier with 10,000+ designs.',               ['Tile Supplier', 'Flooring Contractor'],             ['Pan India (Bangalore)'],      true ],
  ['GreenBuild Contractors',        'Eco-friendly construction with sustainable materials.',              ['Contractor', 'Waterproofing Contractor'],            ['Pune', 'Nashik'],             true ],
  ['SmartHome Solutions',           'End-to-end smart home automation installation.',                     ['Smart Home Installer', 'CCTV Installer'],           ['Bangalore', 'Mysore'],        true ],
  ['RajMasonry Works',              'Expert masonry and brickwork specialists.',                           ['Mason'],                                            ['Jaipur', 'Ajmer'],            false],
  ['SteelCraft Fabricators',        'Precision steel fabrication for gates and grilles.',                  ['Fabricator', 'Gate Fabricator'],                    ['Ludhiana', 'Amritsar'],       false],
  ['WoodWorks Carpenter',           'Custom carpentry for modular kitchens and furniture.',               ['Carpenter', 'Modular Kitchen Provider'],            ['Bangalore', 'Mysore'],        true ],
  ['SkyHigh Roofing',               'Waterproofing and roofing specialists for terrace and slabs.',       ['Waterproofing Contractor'],                         ['Mumbai', 'Navi Mumbai'],      true ],
  ['NetConnect Installers',         'High-speed internet and networking setup for homes.',                 ['Internet Installer'],                               ['Hyderabad', 'Warangal'],      false],
  ['CoolBreeze AC Services',        'AC installation and maintenance for all brands.',                    ['AC Installer'],                                     ['Chennai', 'Vellore'],         false],
  ['MarbleMasters',                 'Premium marble and granite supply and installation.',                 ['Marble Supplier', 'Flooring Contractor'],           ['Udaipur', 'Jaipur'],          true ],
  ['SecureVision CCTV',             'Professional CCTV installation and security systems.',               ['CCTV Installer'],                                   ['Delhi', 'Gurugram', 'Noida'], true ],
  ['EarthWorks Excavation',         'Heavy excavation and earthmoving services.',                          ['Excavation Contractor'],                            ['Bengaluru Rural', 'Tumkur'],  false],
  ['POP Masters',                   'False ceiling, POP, and wall texture specialists.',                   ['POP Contractor'],                                   ['Bangalore', 'Bangalore'],     false],
  ['VijayElectric Works',           'Experienced household electricians and panel technicians.',           ['Electrician'],                                      ['Hyderabad', 'Bangalore'],     true ],
  ['SurveyPro India',               'Licensed land and building survey services.',                         ['Surveyor', 'Structural Engineer'],                  ['Mumbai', 'Pune'],             true ],
  ['DeepBore Borewells',            'Borewell drilling and submersible pump installation.',               ['Borewell Contractor', 'Water Tank Installer'],      ['Bangalore', 'Mysore'],        false],
  ['LandscapeArt',                  'Premium garden design, landscaping, and maintenance.',               ['Landscaping Contractor'],                           ['Bangalore', 'Chennai'],       true ],
  ['GlassVision',                   'Architectural glass and glazing solutions for homes.',               ['Glass Contractor'],                                 ['Bangalore', 'Hyderabad'],     false],
  ['CementSupply Direct',           'Bulk cement supply — ACC, Ultratech, Ambuja.',                       ['Cement Supplier'],                                  ['Bangalore', 'Mysore'],        false],
  ['SteelPlus Suppliers',           'TMT steel and reinforcement bars for construction.',                  ['Steel Supplier'],                                   ['Bangalore', 'Hosur'],         false],
  ['Paver Paradise',                'Interlocking paver blocks and driveway solutions.',                   ['Paver Contractor'],                                 ['Hyderabad', 'Secunderabad'],  false],
  ['RameshPainters',                'Affordable interior painting with premium finishes.',                 ['Painter'],                                          ['Bangalore', 'Bangalore'],     false],
  ['MeshTech Installers',           'Window mesh, grilles, and security mesh installation.',              ['Mesh Installer'],                                   ['Delhi', 'Noida'],             false],
  ['ModularKitchen Co.',            'Complete modular kitchen design and installation.',                   ['Modular Kitchen Provider', 'Carpenter'],            ['Mumbai', 'Thane'],            true ],
  ['ElevatePro Lifts',              'Residential elevator design and installation.',                       ['Elevator Installer'],                               ['Mumbai', 'Bangalore'],        true ],
  ['GenPower Generators',           'Generator installation and annual maintenance contracts.',            ['Generator Installer'],                              ['Chennai', 'Coimbatore'],      false],
  ['AarchiDesigns',                 'Residential interior design and decor services.',                     ['Interior Designer'],                                ['Bangalore', 'Mysore'],        true ],
  ['TrustStruct Engineers',         'Structural engineering consultants for residential projects.',        ['Structural Engineer'],                              ['Bangalore', 'Hubli'],         true ],
  ['MegaBuild Contractors',         'Large-scale residential contractors — villas and luxury homes.',     ['Contractor'],                                       ['Bangalore', 'Chennai'],       true ],
  ['PureWater Systems',             'Water purification and pressure pump installation.',                  ['Borewell Contractor', 'Water Tank Installer'],      ['Pune', 'Nashik'],             false],
  ['BrightPaint Solutions',         'Commercial and residential painting with 5-year warranty.',          ['Painter'],                                          ['Bangalore', 'Tumkur'],        false],
  ['FlexElec Bangalore',            'Electrical fit-out for new constructions.',                           ['Electrician'],                                      ['Bangalore', 'Bangalore'],     false],
  ['SafeGuard Security',            'Complete home security — CCTV, access control, alarms.',             ['CCTV Installer', 'Smart Home Installer'],           ['Delhi', 'Gurugram'],          true ],
  ['NaturalStone India',            'Import quality marble, granite, and natural stone.',                  ['Marble Supplier'],                                  ['Bangalore', 'Hyderabad'],     false],
  ['SunPower Solar',                'Off-grid, on-grid, and hybrid solar system installation.',            ['Solar Installer'],                                  ['Rajasthan (Jaipur)', 'Bangalore'], true],
  ['QuickBuild Masons',             'Fast and quality masonry for residential construction.',              ['Mason'],                                            ['Bangalore', 'Mysore'],        false],
  ['PrimePlumb Chennai',            'Residential plumbing specialists serving Tamil Nadu.',                ['Plumber'],                                          ['Chennai', 'Madurai'],         false],
  ['AirFlow AC Works',              'Split and ducted AC installation for homes.',                         ['AC Installer'],                                     ['Bangalore', 'Bangalore'],     false],
  ['KitchenMagic',                  'Modular kitchen specialists with 500+ installations.',               ['Modular Kitchen Provider'],                         ['Bangalore', 'Mysore'],        true ],
  ['FortGate Fabricators',          'Custom steel gates and boundary walls.',                              ['Gate Fabricator', 'Fabricator'],                    ['Bangalore', 'Hosur'],         false],
  ['ClearView Glass',               'Toughened glass, glass railings, and window solutions.',             ['Glass Contractor'],                                 ['Bangalore', 'Bangalore'],     false],
]

const CITIES = ['Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune']

const UPDATE_TITLES = [
  'Foundation concrete poured successfully',
  'Reinforcement steel placed for columns',
  'Brickwork completed for first floor',
  'Electrical conduits installed in all rooms',
  'Plumbing rough-in completed',
  'Roof slab work in progress',
  'External plastering completed',
  'Waterproofing applied to terrace',
  'Tiles fixed in master bedroom',
  'Interior painting — second coat applied',
  'Kitchen cabinet installation started',
  'Main gate fabricated and erected',
  'CCTV cameras installed',
  'Solar panels mounted on rooftop',
  'Final inspection walkthrough done',
  'Switches and sockets installed throughout',
  'Water heaters fitted in all bathrooms',
  'Staircase railing welded and fixed',
  'Driveway paving completed',
  'Landscaping and garden work done',
]

const UPDATE_DESCRIPTIONS = [
  'Work progressing as per schedule. Contractor team of 12 workers on site today.',
  'Material delivered on time. Weather conditions were favourable for outdoor work.',
  'Slight delay due to rain in the morning but work resumed by noon.',
  'Good progress today. Supervisor inspection carried out and approved.',
  'All materials procured and work is on track.',
  'Third-party quality check conducted — results satisfactory.',
  'Contractor raised a query about wall thickness — resolved with architect.',
  'Labour shortage today — only partial work completed.',
  'Excellent progress. Target for the week likely to be met.',
  'Quality check passed. Moving to next task tomorrow.',
]

const EXPENSE_NOTES = [
  'Paid contractor for monthly labour charges',
  'Cement and sand purchase from local supplier',
  'Electrical wires and conduits — full lot',
  'Plumbing pipes and fittings — PVC and CPVC',
  'TMT steel bars — 10mm and 12mm',
  'Tile purchase — master bedroom and bathrooms',
  'Paint — interior emulsion 20L cans',
  'Gate fabrication — advance payment',
  'Excavation contractor payment — final bill',
  'Mason team weekly wages',
  'Waterproofing chemical and labour',
  'Modular kitchen advance payment',
  'Solar panels and inverter installation',
  'CCTV cameras and DVR unit',
  'Plumbing fixtures — taps and sanitaryware',
  'Electrical switchgear — DB and MCBs',
  'Landscaping and garden materials',
  'Flooring contractor final bill',
  'Painter final settlement',
  'Miscellaneous hardware and consumables',
]

const REVIEW_REASONS: string[] = [
  'POOR_QUALITY', 'DELAYED_WORK', 'OVER_BUDGET', 'POOR_COMMUNICATION', 'OTHER',
]

// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱  Starting HCOS production seed...\n')

  // ── 1. House Types ──────────────────────────────────────────────────────────
  console.log('1/15  Seeding house types...')
  const houseTypeMap: Record<string, string> = {}
  for (const ht of HOUSE_TYPES) {
    const r = await prisma.houseType.upsert({ where: { name: ht.name }, update: {}, create: ht })
    houseTypeMap[ht.name] = r.id
  }

  // ── 2. Stages ───────────────────────────────────────────────────────────────
  console.log('2/15  Seeding stages...')
  const stageMap: Record<string, string> = {}
  for (const s of STAGES_DATA) {
    const r = await prisma.stage.upsert({ where: { name: s.name }, update: {}, create: s })
    stageMap[s.name] = r.id
  }

  // ── 3. Tasks ────────────────────────────────────────────────────────────────
  console.log('3/15  Seeding tasks...')
  const taskMap: Record<string, string> = {} // key = "StageName:TaskName"
  for (const [stageName, name, description, taskType, weight] of TASKS_DATA) {
    const existing = await prisma.task.findFirst({ where: { name, stageId: stageMap[stageName] } })
    const r = existing
      ? existing
      : await prisma.task.create({ data: { stageId: stageMap[stageName], name, description, taskType: taskType as any, weight } })
    taskMap[`${stageName}:${name}`] = r.id
  }

  // ── 4. Task dependencies ────────────────────────────────────────────────────
  console.log('4/15  Seeding task dependencies...')
  const DEP_PAIRS: [string, string][] = [
    ['Flooring & Finishes:Flooring Installation',     'Surface Preparation:Waterproofing Test'],
    ['Flooring & Finishes:Flooring Material Selection','Surface Preparation:Waterproofing Test'],
    ['Painting:Surface Preparation for Paint',         'Flooring & Finishes:Final Alignment Check'],
    ['Fixtures & Installations:Switch Installation',   'Painting:Touch-Ups'],
    ['Fixtures & Installations:Light Installation',    'Painting:Touch-Ups'],
    ['Kitchen:Cabinet Installation',                   'Fixtures & Installations:Fixture Inspection'],
    ['Exterior Development:Boundary Wall',             'Kitchen:Final Kitchen Inspection'],
    ['Security & Connectivity:WiFi Setup',             'Utilities:Utility Testing'],
    ['Structure:Column Construction',                  'Foundation:Curing'],
    ['Walls & Masonry:External Walls',                 'Structure:Structural Curing'],
    ['Utilities:Plumbing Rough-In',                    'Walls & Masonry:Internal Walls'],
    ['Utilities:Conduit Installation',                 'Walls & Masonry:Internal Walls'],
    ['Surface Preparation:Internal Plastering',        'Utilities:Utility Testing'],
    ['Foundation:Footing Marking',                     'Site Preparation:Excavation'],
    ['Site Preparation:Site Clearing',                 'Planning:Floor Plan Finalization'],
  ]
  for (const [from, to] of DEP_PAIRS) {
    const fId = taskMap[from]; const tId = taskMap[to]
    if (fId && tId) {
      await prisma.taskDependency.upsert({
        where: { taskId_dependsOnTaskId: { taskId: fId, dependsOnTaskId: tId } },
        update: {}, create: { taskId: fId, dependsOnTaskId: tId },
      })
    }
  }

  // ── 5. Decisions ────────────────────────────────────────────────────────────
  console.log('5/15  Seeding decisions...')
  const decisionMap: Record<string, string> = {} // "title" -> id
  for (const [stageName, title, description, required] of DECISIONS_DATA) {
    const existing = await prisma.decision.findFirst({ where: { title, stageId: stageMap[stageName] } })
    const r = existing
      ? existing
      : await prisma.decision.create({ data: { stageId: stageMap[stageName], title, description, required } })
    decisionMap[title] = r.id
  }

  // ── 6. Master Alerts ────────────────────────────────────────────────────────
  console.log('6/15  Seeding master alerts...')
  const alertMasterMap: Record<string, string> = {}
  for (const [stageName, type, title, description, severity] of ALERTS_DATA) {
    const existing = await prisma.alert.findFirst({ where: { title } })
    const r = existing
      ? existing
      : await prisma.alert.create({
          data: {
            stageId: stageName ? stageMap[stageName] : null,
            type: type as any, title, description, severity: severity as any,
          },
        })
    alertMasterMap[title] = r.id
  }

  // ── 7. Milestones ───────────────────────────────────────────────────────────
  console.log('7/15  Seeding milestones...')
  const milestoneMap: Record<string, string> = {}
  for (const m of MILESTONES_DATA) {
    const r = await prisma.milestone.upsert({ where: { title: m.title }, update: {}, create: m })
    milestoneMap[m.title] = r.id
  }

  // ── 8. Features ─────────────────────────────────────────────────────────────
  console.log('8/15  Seeding features...')
  const featureMap: Record<string, string> = {}
  for (const [name, category, description] of FEATURES_DATA) {
    const r = await prisma.feature.upsert({
      where: { name }, update: {}, create: { name, category: category as any, description },
    })
    featureMap[name] = r.id
  }

  // ── 9. Service categories ───────────────────────────────────────────────────
  console.log('9/15  Seeding service categories...')
  const catMap: Record<string, string> = {}
  for (const name of SERVICE_CATEGORIES_DATA) {
    const r = await prisma.serviceCategory.upsert({ where: { name }, update: {}, create: { name } })
    catMap[name] = r.id
  }

  // ── 10. Cost estimates ──────────────────────────────────────────────────────
  console.log('10/15 Seeding cost estimates...')
  const COST_DATA: [string, string, string, number, number, string][] = [
    ['Planning',                 'Bangalore', 'Architect & Design',       50000,   200000, 'HIGH'],
    ['Foundation',               'Bangalore', 'Foundation Work',          150000,  400000, 'MEDIUM'],
    ['Structure',                'Bangalore', 'RCC Structure',            400000,  800000, 'HIGH'],
    ['Walls & Masonry',          'Bangalore', 'Masonry Work',             100000,  250000, 'HIGH'],
    ['Utilities',                'Bangalore', 'Electrical Work',          150000,  250000, 'HIGH'],
    ['Utilities',                'Bangalore', 'Plumbing Work',            80000,   180000, 'HIGH'],
    ['Surface Preparation',      'Bangalore', 'Plastering & Waterproofing',120000, 280000, 'MEDIUM'],
    ['Flooring & Finishes',      'Bangalore', 'Flooring',                 200000,  500000, 'MEDIUM'],
    ['Painting',                 'Bangalore', 'Painting',                 80000,   200000, 'HIGH'],
    ['Fixtures & Installations', 'Bangalore', 'Fixtures',                 150000,  350000, 'MEDIUM'],
    ['Kitchen',                  'Bangalore', 'Modular Kitchen',          150000,  600000, 'MEDIUM'],
    ['Exterior Development',     'Bangalore', 'Exterior Work',            100000,  400000, 'LOW'],
    ['Security & Connectivity',  'Bangalore', 'Security & Network',       30000,   150000, 'MEDIUM'],
    ['Sustainability',           'Bangalore', 'Solar System',             200000,  600000, 'HIGH'],
    ['Structure',                'Mumbai',    'RCC Structure',            500000, 1000000, 'MEDIUM'],
    ['Utilities',                'Mumbai',    'Electrical Work',          200000,  350000, 'HIGH'],
    ['Flooring & Finishes',      'Mumbai',    'Flooring',                 250000,  600000, 'MEDIUM'],
    ['Painting',                 'Mumbai',    'Painting',                 100000,  250000, 'MEDIUM'],
    ['Structure',                'Delhi',     'RCC Structure',            450000,  900000, 'MEDIUM'],
    ['Utilities',                'Delhi',     'Electrical Work',          160000,  280000, 'MEDIUM'],
    ['Painting',                 'Delhi',     'Painting',                 90000,   220000, 'MEDIUM'],
    ['Structure',                'Hyderabad', 'RCC Structure',            380000,  780000, 'MEDIUM'],
    ['Utilities',                'Hyderabad', 'Electrical Work',          140000,  260000, 'MEDIUM'],
    ['Flooring & Finishes',      'Chennai',   'Flooring',                 180000,  450000, 'MEDIUM'],
    ['Painting',                 'Chennai',   'Painting',                 75000,   190000, 'MEDIUM'],
  ]
  for (const [stageName, city, category, minCost, maxCost, confidence] of COST_DATA) {
    const existing = await prisma.costEstimate.findFirst({ where: { stageId: stageMap[stageName], city, category } })
    if (!existing) {
      await prisma.costEstimate.create({
        data: {
          stageId: stageMap[stageName], city, category,
          minCost, maxCost, confidence: confidence as any,
          sourceCount: randInt(5, 30),
        },
      })
    }
  }

  // ── 11. Service providers (50) ──────────────────────────────────────────────
  console.log('11/15 Seeding 50 service providers...')

  // Create placeholder Clerk IDs for provider users
  const providerUsers: any[] = []
  for (let i = 0; i < PROVIDERS_DATA.length; i++) {
    const [businessName] = PROVIDERS_DATA[i]
    const clerkId = `provider-seed-${i + 1}-${Date.now()}`
    const u = await prisma.user.upsert({
      where: { email: `provider${i + 1}@hcos.seed` },
      update: {},
      create: {
        clerkId,
        fullName: businessName,
        email: `provider${i + 1}@hcos.seed`,
        role: 'SERVICE_PROVIDER' as any,
      },
    })
    providerUsers.push(u)
  }

  const providerIds: string[] = []
  for (let i = 0; i < PROVIDERS_DATA.length; i++) {
    const [businessName, description, categories, areas, verified] = PROVIDERS_DATA[i]
    const user = providerUsers[i]

    const existing = await prisma.serviceProvider.findUnique({ where: { userId: user.id } })
    let provider: any

    if (existing) {
      provider = existing
    } else {
      provider = await prisma.serviceProvider.create({
        data: {
          userId: user.id,
          businessName,
          description,
          verified,
          active: true,
        },
      })
    }
    providerIds.push(provider.id)

    // categories
    for (const catName of categories) {
      if (catMap[catName]) {
        await prisma.serviceProviderCategory.upsert({
          where: { providerId_categoryId: { providerId: provider.id, categoryId: catMap[catName] } },
          update: {},
          create: { providerId: provider.id, categoryId: catMap[catName] },
        })
      }
    }

    // service areas
    for (const city of areas) {
      await prisma.serviceArea.upsert({
        where: { providerId_city: { providerId: provider.id, city } },
        update: {},
        create: { providerId: provider.id, city, radius: randInt(30, 100) },
      })
    }
  }

  // ── 12. Houses + all house data ─────────────────────────────────────────────
  console.log('12/15 Seeding 4 sample houses...')

  // Create house owner users
  const ownerA = await prisma.user.upsert({
    where: { email: 'arjun.sharma@hcos.seed' },
    update: {},
    create: { clerkId: 'seed-owner-a', fullName: 'Arjun Sharma', email: 'arjun.sharma@hcos.seed', role: 'OWNER' as any },
  })
  const ownerB = await prisma.user.upsert({
    where: { email: 'priya.nair@hcos.seed' },
    update: {},
    create: { clerkId: 'seed-owner-b', fullName: 'Priya Nair', email: 'priya.nair@hcos.seed', role: 'OWNER' as any },
  })
  const ownerC = await prisma.user.upsert({
    where: { email: 'rajan.mehta@hcos.seed' },
    update: {},
    create: { clerkId: 'seed-owner-c', fullName: 'Rajan Mehta', email: 'rajan.mehta@hcos.seed', role: 'OWNER' as any },
  })
  const ownerD = await prisma.user.upsert({
    where: { email: 'sunita.iyer@hcos.seed' },
    update: {},
    create: { clerkId: 'seed-owner-d', fullName: 'Sunita Iyer', email: 'sunita.iyer@hcos.seed', role: 'OWNER' as any },
  })

  // Secondary users (family member, contractor, architect)
  const familyMember = await prisma.user.upsert({
    where: { email: 'meera.sharma@hcos.seed' },
    update: {},
    create: { clerkId: 'seed-family-a', fullName: 'Meera Sharma', email: 'meera.sharma@hcos.seed', role: 'FAMILY_MEMBER' as any },
  })
  const contractorUser = await prisma.user.upsert({
    where: { email: 'suresh.contractor@hcos.seed' },
    update: {},
    create: { clerkId: 'seed-contractor-a', fullName: 'Suresh Kumar', email: 'suresh.contractor@hcos.seed', role: 'CONTRACTOR' as any },
  })
  const architectUser = await prisma.user.upsert({
    where: { email: 'aditya.architect@hcos.seed' },
    update: {},
    create: { clerkId: 'seed-architect-a', fullName: 'Aditya Rao', email: 'aditya.architect@hcos.seed', role: 'ARCHITECT' as any },
  })

  // ─── Helper: create all stage + task records for a house ────────────────────
  async function createHouseStages(houseId: string, completedUpToOrder: number, inProgressOrder: number | null) {
    for (const s of STAGES_DATA) {
      let status: string
      if (s.displayOrder < completedUpToOrder) status = 'COMPLETED'
      else if (s.displayOrder === completedUpToOrder && inProgressOrder === null) status = 'COMPLETED'
      else if (s.displayOrder === inProgressOrder) status = 'IN_PROGRESS'
      else status = 'NOT_STARTED'

      const completedAt = status === 'COMPLETED' ? daysAgo(randInt(5, 200)) : null
      const startedAt   = status !== 'NOT_STARTED' ? daysAgo(randInt(1, 30)) : null

      await prisma.houseStage.upsert({
        where: { houseId_stageId: { houseId, stageId: stageMap[s.name] } },
        update: {},
        create: { houseId, stageId: stageMap[s.name], status: status as any, completedAt, startedAt },
      })
    }
  }

  async function createHouseTasks(houseId: string, completedUpToOrder: number, inProgressOrder: number | null) {
    for (const [stageName, taskName, , , weight] of TASKS_DATA) {
      const taskId = taskMap[`${stageName}:${taskName}`]
      if (!taskId) continue
      const stageOrder = STAGES_DATA.find(s => s.name === stageName)?.displayOrder ?? 99
      let status: string
      if (stageOrder < completedUpToOrder) {
        status = Math.random() < 0.05 ? 'SKIPPED' : 'COMPLETED'
      } else if (stageOrder === inProgressOrder) {
        const r = Math.random()
        status = r < 0.5 ? 'COMPLETED' : r < 0.75 ? 'IN_PROGRESS' : 'PENDING'
      } else {
        status = 'PENDING'
      }
      const completedAt = status === 'COMPLETED' ? daysAgo(randInt(1, 180)) : null
      await prisma.houseTask.upsert({
        where: { houseId_taskId: { houseId, taskId } },
        update: {},
        create: { houseId, taskId, status: status as any, completedAt },
      })
    }
  }

  async function createHouseDecisions(houseId: string, completedUpToOrder: number) {
    const answerPool = [
      'Asian Paints Royale', 'Polycab Wires', 'Astral Pipes', 'Jaquar Fixtures',
      'Vitrified Tiles', 'Granite', 'L-Shaped Kitchen', 'Steel Gate',
      'Standard', 'On-Grid Solar', '3 Floors', '4 Bedrooms',
      'Havells Switches', 'AAC Blocks', 'Dr. Fixit Waterproofing',
    ]
    for (const [stageName, title] of DECISIONS_DATA) {
      const decId = decisionMap[title]
      if (!decId) continue
      const stageOrder = STAGES_DATA.find(s => s.name === stageName)?.displayOrder ?? 99
      const isAnswered  = stageOrder < completedUpToOrder || (stageOrder === completedUpToOrder && Math.random() < 0.8)
      await prisma.houseDecision.upsert({
        where: { houseId_decisionId: { houseId, decisionId: decId } },
        update: {},
        create: {
          houseId,
          decisionId: decId,
          selectedValue: isAnswered ? rand(answerPool) : null,
          completedAt:  isAnswered ? daysAgo(randInt(1, 100)) : null,
        },
      })
    }
  }

  async function createHouseAlerts(houseId: string, count: number) {
    const alertTitles = Object.keys(alertMasterMap)
    for (let i = 0; i < count; i++) {
      const title   = rand(alertTitles)
      const alertId = alertMasterMap[title]
      const existing = await prisma.houseAlert.findFirst({ where: { houseId, alertId, acknowledged: false } })
      if (!existing) {
        await prisma.houseAlert.create({
          data: {
            houseId,
            alertId,
            acknowledged: Math.random() < 0.4,
            createdAt: daysAgo(randInt(1, 60)),
          },
        })
      }
    }
  }

  async function calculateProgress(houseId: string): Promise<number> {
    const tasks = await prisma.houseTask.findMany({ where: { houseId }, include: { task: true } })
    const total = tasks.reduce((s: number, t: any) => s + t.task.weight, 0)
    const done  = tasks.filter((t: any) => t.status === 'COMPLETED' || t.status === 'SKIPPED').reduce((s: number, t: any) => s + t.task.weight, 0)
    return total === 0 ? 0 : Math.round((done / total) * 100)
  }

  // ─── HOUSE A: COMPLETED PROJECT ─────────────────────────────────────────────
  console.log('   → House A: Completed project (Sharma Villa, Bangalore)')
  const houseA = await prisma.house.upsert({
    where: { id: 'house-seed-a' },
    update: {},
    create: {
      id: 'house-seed-a',
      ownerId: ownerA.id,
      projectName: 'Sharma Villa',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      plotSize: 3200,
      houseTypeId: houseTypeMap['Villa'],
      floors: 3,
      bedrooms: 5,
      bathrooms: 5,
      parkingSpaces: 2,
      currentProgress: 100,
      projectStatus: 'COMPLETED' as any,
      createdAt: daysAgo(420),
    },
  })
  await createHouseStages(houseA.id, 17, null)   // all 16 stages completed
  await createHouseTasks(houseA.id, 17, null)
  await createHouseDecisions(houseA.id, 17)
  await createHouseAlerts(houseA.id, 3)

  // House A features
  for (const fname of ['CCTV', 'Solar Panels', 'Smart Lighting', 'False Ceiling', 'Landscaping', 'Swimming Pool', 'Home Theater']) {
    if (featureMap[fname]) {
      await prisma.houseFeature.upsert({
        where: { houseId_featureId: { houseId: houseA.id, featureId: featureMap[fname] } },
        update: {}, create: { houseId: houseA.id, featureId: featureMap[fname], enabled: true },
      })
    }
  }

  // House A milestones — all achieved
  for (const [title, id] of Object.entries(milestoneMap)) {
    await prisma.houseMilestone.upsert({
      where: { houseId_milestoneId: { houseId: houseA.id, milestoneId: id } },
      update: {}, create: { houseId: houseA.id, milestoneId: id, achievedAt: daysAgo(randInt(10, 200)) },
    })
  }

  // House A members
  await prisma.houseMember.upsert({
    where: { houseId_userId: { houseId: houseA.id, userId: familyMember.id } },
    update: {}, create: { houseId: houseA.id, userId: familyMember.id, role: 'FAMILY_MEMBER' as any },
  })
  await prisma.houseMember.upsert({
    where: { houseId_userId: { houseId: houseA.id, userId: architectUser.id } },
    update: {}, create: { houseId: houseA.id, userId: architectUser.id, role: 'ARCHITECT' as any },
  })

  // ─── HOUSE B: MID-CONSTRUCTION (Utilities stage) ────────────────────────────
  console.log('   → House B: Mid-construction (Nair Duplex, Mumbai)')
  const houseB = await prisma.house.upsert({
    where: { id: 'house-seed-b' },
    update: {},
    create: {
      id: 'house-seed-b',
      ownerId: ownerB.id,
      projectName: 'Nair Duplex',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      plotSize: 1800,
      houseTypeId: houseTypeMap['Duplex'],
      floors: 2,
      bedrooms: 4,
      bathrooms: 4,
      parkingSpaces: 2,
      currentProgress: 0,
      projectStatus: 'ACTIVE' as any,
      createdAt: daysAgo(210),
    },
  })
  await createHouseStages(houseB.id, 6, 6)       // stages 1-5 done, stage 6 (Utilities) in progress
  await createHouseTasks(houseB.id, 6, 6)
  await createHouseDecisions(houseB.id, 6)
  await createHouseAlerts(houseB.id, 5)
  const progressB = await calculateProgress(houseB.id)
  await prisma.house.update({ where: { id: houseB.id }, data: { currentProgress: progressB } })

  for (const fname of ['CCTV', 'Inverter System', 'AC Preparation', 'Borewell']) {
    if (featureMap[fname]) {
      await prisma.houseFeature.upsert({
        where: { houseId_featureId: { houseId: houseB.id, featureId: featureMap[fname] } },
        update: {}, create: { houseId: houseB.id, featureId: featureMap[fname], enabled: true },
      })
    }
  }

  // Milestones B — Foundation + Structure done
  for (const t of ['Foundation Complete', 'Structure Complete']) {
    await prisma.houseMilestone.upsert({
      where: { houseId_milestoneId: { houseId: houseB.id, milestoneId: milestoneMap[t] } },
      update: {}, create: { houseId: houseB.id, milestoneId: milestoneMap[t], achievedAt: daysAgo(randInt(20, 80)) },
    })
  }

  await prisma.houseMember.upsert({
    where: { houseId_userId: { houseId: houseB.id, userId: contractorUser.id } },
    update: {}, create: { houseId: houseB.id, userId: contractorUser.id, role: 'CONTRACTOR' as any },
  })

  // ─── HOUSE C: EARLY STAGE (Foundation in progress) ──────────────────────────
  console.log('   → House C: Early stage (Mehta Residence, Delhi)')
  const houseC = await prisma.house.upsert({
    where: { id: 'house-seed-c' },
    update: {},
    create: {
      id: 'house-seed-c',
      ownerId: ownerC.id,
      projectName: 'Mehta Residence',
      city: 'Delhi',
      state: 'Delhi',
      country: 'India',
      plotSize: 2400,
      houseTypeId: houseTypeMap['Basic House'],
      floors: 2,
      bedrooms: 3,
      bathrooms: 3,
      parkingSpaces: 1,
      currentProgress: 0,
      projectStatus: 'ACTIVE' as any,
      createdAt: daysAgo(60),
    },
  })
  await createHouseStages(houseC.id, 2, 3)       // stages 1-2 done, stage 3 (Foundation) in progress
  await createHouseTasks(houseC.id, 2, 3)
  await createHouseDecisions(houseC.id, 2)
  await createHouseAlerts(houseC.id, 4)
  const progressC = await calculateProgress(houseC.id)
  await prisma.house.update({ where: { id: houseC.id }, data: { currentProgress: progressC } })

  for (const fname of ['AC Preparation', 'CCTV']) {
    if (featureMap[fname]) {
      await prisma.houseFeature.upsert({
        where: { houseId_featureId: { houseId: houseC.id, featureId: featureMap[fname] } },
        update: {}, create: { houseId: houseC.id, featureId: featureMap[fname], enabled: true },
      })
    }
  }

  await prisma.houseMember.upsert({
    where: { houseId_userId: { houseId: houseC.id, userId: familyMember.id } },
    update: {}, create: { houseId: houseC.id, userId: familyMember.id, role: 'FAMILY_MEMBER' as any },
  })

  // ─── HOUSE D: NEWLY STARTED (Planning stage) ────────────────────────────────
  console.log('   → House D: Newly started (Iyer Farmhouse, Hyderabad)')
  const houseD = await prisma.house.upsert({
    where: { id: 'house-seed-d' },
    update: {},
    create: {
      id: 'house-seed-d',
      ownerId: ownerD.id,
      projectName: 'Iyer Farmhouse',
      city: 'Hyderabad',
      state: 'Telangana',
      country: 'India',
      plotSize: 5000,
      houseTypeId: houseTypeMap['Farmhouse'],
      floors: 1,
      bedrooms: 3,
      bathrooms: 3,
      parkingSpaces: 3,
      currentProgress: 0,
      projectStatus: 'PLANNING' as any,
      createdAt: daysAgo(10),
    },
  })
  await createHouseStages(houseD.id, 0, 1)       // stage 1 (Planning) in progress
  await createHouseTasks(houseD.id, 0, 1)
  await createHouseDecisions(houseD.id, 0)
  await createHouseAlerts(houseD.id, 2)
  const progressD = await calculateProgress(houseD.id)
  await prisma.house.update({ where: { id: houseD.id }, data: { currentProgress: progressD } })

  for (const fname of ['Solar Panels', 'Battery Backup', 'Borewell', 'Rainwater Harvesting', 'Garden', 'Landscaping']) {
    if (featureMap[fname]) {
      await prisma.houseFeature.upsert({
        where: { houseId_featureId: { houseId: houseD.id, featureId: featureMap[fname] } },
        update: {}, create: { houseId: houseD.id, featureId: featureMap[fname], enabled: true },
      })
    }
  }

  const allHouses = [houseA, houseB, houseC, houseD]

  // ── 13. Progress updates (100) ──────────────────────────────────────────────
  console.log('13/15 Seeding 100 progress updates...')
  const submitters = [ownerA, ownerB, ownerC, ownerD, contractorUser, architectUser]

  // Distribution: completed house gets most
  const updateDist = [45, 30, 15, 10]
  for (let hi = 0; hi < allHouses.length; hi++) {
    const house  = allHouses[hi]
    const count  = updateDist[hi]
    const owners = [ownerA, ownerB, ownerC, ownerD]
    const owner  = owners[hi]

    for (let i = 0; i < count; i++) {
      const dayOffset = randInt(1, Math.min(hi === 0 ? 400 : hi === 1 ? 200 : hi === 2 ? 55 : 9, 400))
      const submitter = i % 5 === 0 ? contractorUser : i % 7 === 0 ? architectUser : owner

      const update = await prisma.progressUpdate.create({
        data: {
          houseId:     house.id,
          submittedBy: submitter.id,
          title:       rand(UPDATE_TITLES),
          description: rand(UPDATE_DESCRIPTIONS),
          createdAt:   daysAgo(dayOffset),
          media: {
            create: Array.from({ length: randInt(0, 3) }, () => ({
              fileUrl:   `https://pub.r2.dev/seed/progress/${house.id}-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`,
              mediaType: Math.random() < 0.85 ? 'PHOTO' : 'VIDEO' as any,
            })),
          },
        },
      })

      // 70% of completed house updates are verified
      const shouldVerify = hi === 0 ? Math.random() < 0.7 : Math.random() < 0.3
      if (shouldVerify) {
        await prisma.progressVerification.upsert({
          where: { updateId: update.id },
          update: {},
          create: {
            updateId:   update.id,
            verifiedBy: owner.id,
            approved:   Math.random() < 0.9,
            feedback:   Math.random() < 0.4 ? rand(['Good progress! Keep it up.', 'Looks correct.', 'Please fix the alignment before proceeding.']) : null,
            verifiedAt: daysAgo(randInt(0, dayOffset)),
          },
        })
      }
    }
  }

  // ── 14. Expenses (100) ──────────────────────────────────────────────────────
  console.log('14/15 Seeding 100 expenses...')
  const EXP_CATS: string[] = ['ELECTRICAL','PLUMBING','FLOORING','PAINTING','LABOUR','MATERIALS','OTHER']
  // Distribution: completed house gets most
  const expDist = [50, 30, 15, 5]
  const expOwners = [ownerA, ownerB, ownerC, ownerD]
  for (let hi = 0; hi < allHouses.length; hi++) {
    const house = allHouses[hi]
    const count = expDist[hi]
    for (let i = 0; i < count; i++) {
      const cat = rand(EXP_CATS)
      const amount = cat === 'LABOUR'    ? randInt(10000, 80000)
                   : cat === 'MATERIALS' ? randInt(15000, 200000)
                   : cat === 'FLOORING'  ? randInt(30000, 300000)
                   : cat === 'ELECTRICAL'? randInt(20000, 150000)
                   : cat === 'PLUMBING'  ? randInt(15000, 120000)
                   : cat === 'PAINTING'  ? randInt(20000, 100000)
                   : randInt(5000, 50000)
      await prisma.expense.create({
        data: {
          houseId:  house.id,
          category: cat as any,
          amount,
          notes:    rand(EXPENSE_NOTES),
          createdAt: daysAgo(randInt(1, hi === 0 ? 400 : hi === 1 ? 200 : 55)),
        },
      })
    }
  }

  // ── 15. Reviews (100) ───────────────────────────────────────────────────────
  console.log('15/15 Seeding 100 reviews...')
  // Reviews are from completed/mid-construction house owners about providers
  const reviewHouses = [houseA, houseB]
  let reviewCount = 0
  const usedPairs = new Set<string>()

  while (reviewCount < 100) {
    const house      = rand(reviewHouses)
    const providerId = rand(providerIds)
    const key        = `${house.id}:${providerId}`
    if (usedPairs.has(key)) continue
    usedPairs.add(key)

    const wouldHireAgain = Math.random() < 0.72   // 72% positive rate
    await prisma.review.create({
      data: {
        providerId,
        houseId:       house.id,
        wouldHireAgain,
        reason: wouldHireAgain ? null : rand(REVIEW_REASONS) as any,
        createdAt:     daysAgo(randInt(1, 380)),
      },
    })
    reviewCount++
  }

  // ── Notifications (sample) ───────────────────────────────────────────────────
  const notifOwners = [ownerA, ownerB, ownerC, ownerD]
  const NOTIF_TITLES = [
    'Stage Completed: Foundation', 'New Progress Update Submitted',
    'Alert: Waterproofing Test Missing', 'Member Added to Project',
    'Decision Required: Tile Type', 'Budget Update Available',
    'Milestone Achieved: Structure Complete', 'Document Uploaded',
  ]
  for (const owner of notifOwners) {
    for (let i = 0; i < 5; i++) {
      await prisma.notification.create({
        data: {
          userId:    owner.id,
          title:     rand(NOTIF_TITLES),
          body:      'Tap to view the latest update on your project.',
          read:      Math.random() < 0.5,
          createdAt: daysAgo(randInt(1, 30)),
        },
      })
    }
  }

  // ── Audit logs (sample) ──────────────────────────────────────────────────────
  const AUDIT_ACTIONS = ['STAGE_COMPLETED','FEATURE_ADDED','DECISION_UPDATED','EXPENSE_ADDED','PROGRESS_VERIFIED']
  for (const house of allHouses) {
    const owner = [ownerA, ownerB, ownerC, ownerD][[houseA, houseB, houseC, houseD].indexOf(house)]
    for (let i = 0; i < 8; i++) {
      await prisma.auditLog.create({
        data: {
          userId:    owner.id,
          houseId:   house.id,
          action:    rand(AUDIT_ACTIONS),
          entity:    'House',
          entityId:  house.id,
          metadata:  { note: 'seed' },
          createdAt: daysAgo(randInt(1, 200)),
        },
      })
    }
  }

  console.log('\n✅  Seed complete! Summary:')
  console.log('    • 6  house types')
  console.log('    • 16 stages,  ~130 tasks, 28 decisions, 11 master alerts')
  console.log('    • 5  milestones, 33 features, 34 service categories')
  console.log('    • 50 service providers  (inc. categories & service areas)')
  console.log('    • 4  houses  (completed / mid-construction / early / newly started)')
  console.log('    • 100 progress updates  (inc. media & verifications)')
  console.log('    • 100 expenses')
  console.log('    • 100 reviews')
  console.log('    • 25  cost estimates across Bangalore / Mumbai / Delhi / Hyderabad / Chennai')
  console.log('    • Notifications, audit logs, house members, milestones\n')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
