/**
 * Candela Labs Commercial Underwriting Dashboard - Core JS Engine
 * Handles State, Stepper routing, Canvas Map drawing, Decision logic, Roles dropdown and Event logs.
 */

// Global Application State
const appState = {
  currentRole: 'underwriter',
  activeView: 'dashboard-view',
  selectedQuoteNo: null,
  currentStep: 0,
  caseTypeFilter: 'all', // 'all' | 'fresh' | 'returning'
  currentConfigLOB: 'Property',

  // LOB Products configuration (Full-Blown config engine)
  products: {
    Property: {
      coverages: [
        { id: 'fire', name: 'Fire & Lightning Cover', selected: true },
        { id: 'windstorm', name: 'Windstorm & Typhoon Cover', selected: true },
        { id: 'earthquake', name: 'Earthquake Cover', selected: true },
        { id: 'flood', name: 'Flood Ingress Cover', selected: true },
        { id: 'riot', name: 'Riot, Strike & Malicious Damage', selected: false }
      ],
      exclusions: [
        'War, Invasion and Acts of Foreign Enemies',
        'Nuclear Reaction, Radiation or Radioactive Contamination',
        'Wear and Tear, Corrosion, and Gradual Deterioration',
        'Defective Design and Materials Construction'
      ],
      warranties: [
        'Fire Hydrant and Sprinkler System maintenance warranty (checked quarterly)',
        '24/7 Manned security watch on premises',
        'Annual thermographic scan of key electrical breaker boards'
      ],
      deductiblePct: 5,
      deductibleMin: 50000
    },
    Liability: {
      coverages: [
        { id: 'bi', name: 'Third-Party Bodily Injury Limit', selected: true },
        { id: 'pd', name: 'Third-Party Property Damage Limit', selected: true },
        { id: 'prod', name: 'Product Liability Extension', selected: false },
        { id: 'tenant', name: 'Tenant Legal Liability Extension', selected: true }
      ],
      exclusions: [
        'Asbestos and Asbestos-related claims',
        'Pollution, Contamination and Environmental Liabilities',
        'Professional Indemnity / Negligence exclusions',
        'Cyber Security breach and data loss claims'
      ],
      warranties: [
        'General safety maintenance guidelines compliant with national labor laws',
        'Immediate reporting of all incidents resulting in injury within 48 hours'
      ],
      deductiblePct: 2.5,
      deductibleMin: 25000
    },
    Cargo: {
      coverages: [
        { id: 'all_risks', name: 'Institute Cargo Clauses (A) - All Risks', selected: true },
        { id: 'ga', name: 'General Average & Salvage Charges', selected: true },
        { id: 'theft', name: 'Theft, Pilferage and Non-delivery', selected: true },
        { id: 'war', name: 'Institute War Clauses (Cargo) Extension', selected: false }
      ],
      exclusions: [
        'Inherent Vice, Wear and Tear, or Nature of the Subject Matter',
        'Loss due to Insufficient or Unsuitable Packaging',
        'Insolvency or Financial Default of Vessel Owners / Operators'
      ],
      warranties: [
        'Clean Bill of Lading required for all consignments',
        'Certified packaging certificate for fragile or temperature-sensitive goods'
      ],
      deductiblePct: 1.5,
      deductibleMin: 10000
    },
    Engineering: {
      coverages: [
        { id: 'works', name: 'Contract Works & Material Damage', selected: true },
        { id: 'cpe', name: 'Construction Plant & Equipment Cover', selected: true },
        { id: 'tpl', name: 'Third-Party Liability Cover', selected: true },
        { id: 'ee', name: 'Electronic Equipment & Machinery Breakdown', selected: false }
      ],
      exclusions: [
        'Defective design, material or workmanship recovery cost',
        'Loss or damage discovered only at the time of taking inventory',
        'Cessation of construction works exceeding 30 consecutive days'
      ],
      warranties: [
        'Continuous drainage system operational in flood-prone excavations',
        'Certified crane inspection certificate verified prior to heavy lifts'
      ],
      deductiblePct: 5,
      deductibleMin: 100000
    }
  },
  
  // Rule configs (Admin adjustable) — INR Crore scale per PDF spec
  adminRules: {
    scorePreferred: 68,
    scoreDeferred: 40,
    maxClaims: 3,
    accumRadius: 5,
    maxCapacity: 1500000000,  // ₹150 Cr portfolio capacity (per PDF: Company Capacity 150 Cr)
    netRetention: 10000000,   // ₹1 Cr net retention
    treatyCapacity: 400000000 // ₹40 Cr treaty capacity (to reach ₹150 Cr total with retention)
  },

  // Authority limits configuration — per PDF Section 6
  authorityLimits: {
    preferred_underwriter: { name: 'Preferred Risk UW', limit: 5000000, premiumLimit: 60000, products: ['Property', 'Cargo'] },         // Up to ₹50L
    junior_underwriter:    { name: 'Junior Underwriter', limit: 10000000, premiumLimit: 120000, products: ['Property', 'Liability', 'Cargo'] }, // Up to ₹1 Cr
    underwriter:           { name: 'Underwriter', limit: 10000000, premiumLimit: 120000, products: ['Property', 'Liability', 'Cargo'] },
    senior_underwriter:    { name: 'Senior Underwriter', limit: 50000000, premiumLimit: 600000, products: ['Property', 'Liability', 'Cargo'] },  // ₹1–5 Cr
    underwriting_manager:  { name: 'Underwriting Manager', limit: 250000000, premiumLimit: 3000000, products: ['Property', 'Liability', 'Cargo'] }, // ₹5–25 Cr
    head_underwriter:      { name: 'Head of Underwriting', limit: 999999999, premiumLimit: 9999999, products: ['Property', 'Liability', 'Cargo'] }, // Above ₹25 Cr
    reinsurance_manager:   { name: 'Reinsurance Manager', limit: 999999999, premiumLimit: 9999999, products: ['Property', 'Liability', 'Cargo'] }   // Capacity breach
  },

  // Personas / Roles list with descriptions
  personas: [
    { key: 'underwriter', name: 'David Wright', roleTitle: 'Underwriter', email: 'd.wright@candelalabs.com', initials: 'DW', desc: 'Standard authority review' },
    { key: 'senior_underwriter', name: 'Sarah Jenkins', roleTitle: 'Senior Underwriter', email: 's.jenkins@candelalabs.com', initials: 'SJ', desc: 'Escalations & high risks' },
    { key: 'underwriting_manager', name: 'Robert Vance', roleTitle: 'Underwriting Manager', email: 'r.vance@candelalabs.com', initials: 'RV', desc: 'Manager capacity overrides' },
    { key: 'reinsurance_manager', name: 'Alistair Cole', roleTitle: 'Reinsurance Manager', email: 'a.cole@candelalabs.com', initials: 'AC', desc: 'Facultative placements' },
    { key: 'agent', name: 'Alistair Agency Corp', roleTitle: 'Commercial Agent', email: 'agent@alistairagency.com', initials: 'AA', desc: 'Quotation submitter view' },
    { key: 'admin', name: 'Admin Director', roleTitle: 'System Administrator', email: 'admin@candelalabs.com', initials: 'AD', desc: 'Rules & matrix settings' },
    { key: 'operations', name: 'Operations Hub', roleTitle: 'Ops Administrator', email: 'ops@candelalabs.com', initials: 'OH', desc: 'Quotation registration' }
  ],

  // Mock Database
  quotations: [
    {
      quoteNo: 'QT2024001',
      caseType: 'fresh',
      customerName: 'Thai Eastern Manufacturing Co.',
      lob: 'Property',
      product: 'Commercial Property Policy',
      sumInsured: 22000000,
      premiumEstimate: 320000,
      occupancy: 'Light Engineering & Warehousing (Bangkok Industrial Estate)',
      latitude: 13.7563,
      longitude: 100.5018, // Bangkok
      city: 'Bangkok', state: 'Bangkok Metro',
      claims: 1,
      claimsDetails: 'Minor water leakage claim (₹4.5 L) resolved in 2024.',
      riskScore: 76,
      riskCategory: 'Preferred',
      riskCategoryReason: 'Preferred — Clean occupancy (Bangkok industrial estate), acceptable TIV within Jr UW limit, 1 minor claim.',
      slaHours: 24,
      owner: 'David Wright',
      assignedRole: 'junior_underwriter',
      status: 'Underwriting Review',
      documents: [
        { name: 'Property Survey Report', uploaded: true, type: 'pdf' },
        { name: 'Financial Statements 3Y', uploaded: true, type: 'pdf' },
        { name: 'Fire Risk Assessment', uploaded: true, type: 'pdf' }
      ],
      remarks: [
        { date: '2026-06-23 10:15', user: 'Operations Admin', role: 'operations', note: 'Quotation initiated from Bangkok branch office.' },
        { date: '2026-06-23 11:30', user: 'System Engine', role: 'system', note: 'Auto-scoping: Risk category designated as Preferred.' }
      ],
      chatHistory: [
        { sender: 'underwriter', text: 'Hi Team, please verify if the warehouse fire alarm system has direct notification with local response services.', time: '2026-06-23 14:05' },
        { sender: 'agent', text: 'Yes David, checking. Uploaded the fire risk assessment which confirms dual-path cellular signaling is in place.', time: '2026-06-23 14:22' }
      ],
      timeline: [
        { label: 'Quote Created', date: '2026-06-23 10:15', user: 'Operations Admin', status: 'completed' },
        { label: 'Risk Details Configured', date: '2026-06-23 10:30', user: 'Operations Admin', status: 'completed' },
        { label: 'Documents Uploaded', date: '2026-06-23 11:00', user: 'Operations Admin', status: 'completed' },
        { label: 'Risk Assessment Executed', date: '2026-06-23 11:30', user: 'System Engine', status: 'completed' },
        { label: 'Underwriter Assigned', date: '2026-06-23 11:30', user: 'System Engine', status: 'completed' },
        { label: 'Underwriting Review', date: 'In Progress', user: 'David Wright', status: 'active' },
        { label: 'Reinsurance Referral', date: 'Pending', user: 'TBD', status: 'pending' },
        { label: 'Final Issuance', date: 'Pending', user: 'TBD', status: 'pending' }
      ]
    },
    {
      quoteNo: 'QT2024002',
      caseType: 'fresh',
      customerName: 'Pattaya Bay Resort & Hotels',
      lob: 'Property',
      product: 'Commercial Property Policy',
      sumInsured: 65000000,
      premiumEstimate: 850000,
      occupancy: 'Beach Resort & Hospitality',
      latitude: 12.9236,
      longitude: 100.8824, // Pattaya
      city: 'Pattaya', state: 'Chonburi',
      claims: 2,
      claimsDetails: 'Two monsoon/storm surge damage claims (₹45 L aggregate) in 2025 — coastal exposure, Pattaya Bay area.',
      riskScore: 55,
      riskCategory: 'Referred',
      riskCategoryReason: 'Referred — TIV ₹6.5 Cr exceeds Junior UW authority. Two flood/storm claims in 2025 (coastal risk). Senior UW review required.',
      slaHours: 4,
      owner: 'TBD',
      assignedRole: 'senior_underwriter',
      status: 'Senior Approval Pending',
      documents: [
        { name: 'Flood Risk Survey Plan', uploaded: true, type: 'pdf' },
        { name: 'Business Continuity Review', uploaded: true, type: 'pdf' },
        { name: 'Loss Run Reports 5Y', uploaded: true, type: 'pdf' }
      ],
      remarks: [
        { date: '2026-06-24 08:00', user: 'System Engine', role: 'system', note: 'Auto-referral triggered: Sum Insured (₹6.50 Cr) exceeds Underwriter authority limit of ₹2.50 Cr.' },
        { date: '2026-06-24 09:12', user: 'David Wright', role: 'underwriter', note: 'Sum Insured exceeds authority. Forwarding to Senior Underwriter. Noted flood claims in 2025 need review.' }
      ],
      chatHistory: [
        { sender: 'underwriter', text: 'Senior review triggered. Please confirm whether the property has sea-facing storm surge defenses and coastal elevation reports.', time: '2026-06-24 08:30' }
      ],
      timeline: [
        { label: 'Quote Created', date: '2026-06-24 07:30', user: 'Agent Operations', status: 'completed' },
        { label: 'Risk Details Configured', date: '2026-06-24 07:45', user: 'Agent Operations', status: 'completed' },
        { label: 'Documents Uploaded', date: '2026-06-24 08:00', user: 'Agent Operations', status: 'completed' },
        { label: 'Risk Assessment Executed', date: '2026-06-24 08:00', user: 'System Engine', status: 'completed' },
        { label: 'Underwriter Referral', date: '2026-06-24 09:12', user: 'David Wright', status: 'completed' },
        { label: 'Senior Underwriter Assigned', date: 'In Progress', user: 'Sarah Jenkins (Senior UW)', status: 'active' },
        { label: 'Reinsurance Referral', date: 'Pending', user: 'Reinsurance Manager', status: 'pending' },
        { label: 'Final Issuance', date: 'Pending', user: 'TBD', status: 'pending' }
      ]
    },
    {
      quoteNo: 'QT2024003',
      caseType: 'fresh',
      customerName: 'Siam Digital Innovation Park',
      lob: 'Liability',
      product: 'General Liability Policy',
      sumInsured: 120000000,
      premiumEstimate: 1650000,
      occupancy: 'Digital R&D Lab / Tech Incubator (Bangkok CBD)',
      latitude: 13.7367,
      longitude: 100.5231, // Bangkok CBD
      city: 'Bangkok', state: 'Bangkok Metro',
      claims: 4,
      claimsDetails: 'Multiple third-party bodily injury and equipment liability claims from tech incubator operations.',
      riskScore: 28,
      riskCategory: 'Deferred',
      riskCategoryReason: 'Deferred — Claims frequency (4 claims) exceeds appetite. TIV ₹12 Cr exceeds Manager authority. Missing mandatory liability loss documentation.',
      slaHours: 48,
      owner: 'TBD',
      assignedRole: 'underwriting_manager',
      status: 'Deferred',
      documents: [
        { name: 'Liability Loss Run', uploaded: false, type: 'pdf' },
        { name: 'Research Protocol Manual', uploaded: true, type: 'pdf' }
      ],
      remarks: [
        { date: '2026-06-24 10:00', user: 'System Engine', role: 'system', note: 'Decline trigger: High claims count (4) and Sum Insured (₹12.00 Cr) exceeds standard Underwriter threshold.' }
      ],
      chatHistory: [
        { sender: 'underwriter', text: 'This account has been deferred due to excessive claims frequency and insufficient liability loss documentation.', time: '2026-06-24 11:00' }
      ],
      timeline: [
        { label: 'Quote Created', date: '2026-06-24 10:00', user: 'Agent Operations', status: 'completed' },
        { label: 'Risk Details Configured', date: '2026-06-24 10:10', user: 'Agent Operations', status: 'completed' },
        { label: 'Documents Uploaded', date: 'Pending Check', user: 'Agent Operations', status: 'active' },
        { label: 'Risk Assessment Executed', date: 'Blocked', user: 'System Engine', status: 'breached' }
      ]
    },
    {
      quoteNo: 'QT2024004',
      caseType: 'fresh',
      customerName: 'Thai Port Logistics & Haulage',
      lob: 'Cargo',
      product: 'Marine Cargo & Transit',
      sumInsured: 8500000,
      premiumEstimate: 120000,
      occupancy: 'Port Freight Logistics & Container Haulage (Laem Chabang)',
      latitude: 13.0823,
      longitude: 100.8831, // Laem Chabang Port
      city: 'Laem Chabang', state: 'Chonburi',
      claims: 0,
      claimsDetails: 'Clean loss history for the past 5 years. No transit or cargo claims on Laem Chabang port routes.',
      riskScore: 92,
      riskCategory: 'Preferred',
      riskCategoryReason: 'Preferred — Clean loss history, TIV ₹85 L within Junior UW limit, excellent risk score (92/100). Port logistics, well-established operator.',
      slaHours: 0,
      owner: 'David Wright',
      assignedRole: 'junior_underwriter',
      status: 'Quote Issued',
      documents: [
        { name: 'Transit Insurance Schedule', uploaded: true, type: 'pdf' },
        { name: 'Fleet Security Verification', uploaded: true, type: 'pdf' }
      ],
      remarks: [
        { date: '2026-06-22 09:00', user: 'David Wright', role: 'underwriter', note: 'Risk approved automatically. Sum Insured is within limits (₹85.00 L) and score is excellent (92).' }
      ],
      chatHistory: [],
      timeline: [
        { label: 'Quote Created', date: '2026-06-22 08:30', user: 'Agent Operations', status: 'completed' },
        { label: 'Risk Assessment', date: '2026-06-22 08:45', user: 'System Engine', status: 'completed' },
        { label: 'Underwriter Decision', date: '2026-06-22 09:00', user: 'David Wright', status: 'completed' },
        { label: 'Quote Issued', date: '2026-06-22 10:15', user: 'Operations Admin', status: 'completed' }
      ]
    },
    {
      quoteNo: 'QT2024005',
      caseType: 'fresh',
      customerName: 'PTT Rayong Chemical Storage',
      lob: 'Property',
      product: 'Commercial Property Policy',
      sumInsured: 48000000,
      premiumEstimate: 620000,
      occupancy: 'Petrochemical Processing & Storage (Map Ta Phut Industrial Estate)',
      latitude: 12.6815,
      longitude: 101.1453, // Map Ta Phut Industrial Estate
      city: 'Rayong', state: 'Rayong',
      claims: 2,
      claimsDetails: 'Petrochemical spillage claim in 2024 (₹20 L), minor equipment fire in 2025 (₹15 L) — Map Ta Phut industrial estate.',
      riskScore: 48,
      riskCategory: 'Referred',
      riskCategoryReason: 'Referred — High hazard petrochemical occupancy (Map Ta Phut), TIV ₹4.8 Cr exceeds Senior UW limit. Reinsurance dependency triggered.',
      slaHours: 12,
      owner: 'TBD',
      assignedRole: 'reinsurance_manager',
      status: 'Reinsurance Review',
      documents: [
        { name: 'Environmental Impact Audit', uploaded: true, type: 'pdf' },
        { name: 'Hazardous Cargo Safety Protocol', uploaded: true, type: 'pdf' },
        { name: 'Property Survey Report', uploaded: true, type: 'pdf' }
      ],
      remarks: [
        { date: '2026-06-23 15:00', user: 'System Engine', role: 'system', note: 'Reinsurance Referral: Petrochemical storage at Map Ta Phut Industrial Estate — high hazard, treaty verification required.' }
      ],
      chatHistory: [
        { sender: 'underwriter', text: 'PTT Rayong petrochemical facility — please verify containment dike certification and industrial estate safety compliance reports.', time: '2026-06-23 16:30' }
      ],
      timeline: [
        { label: 'Quote Created', date: '2026-06-23 14:00', user: 'Agent Operations', status: 'completed' },
        { label: 'Risk Details Configured', date: '2026-06-23 14:15', user: 'Agent Operations', status: 'completed' },
        { label: 'Risk Assessment Executed', date: '2026-06-23 15:00', user: 'System Engine', status: 'completed' },
        { label: 'Underwriter Referral', date: '2026-06-23 15:10', user: 'David Wright', status: 'completed' },
        { label: 'Reinsurance Referral Triggered', date: '2026-06-23 15:30', user: 'System Engine', status: 'completed' },
        { label: 'Reinsurance Review', date: 'In Progress', user: 'Reinsurance team', status: 'active' }
      ]
    },
    // ─── RETURNING CASE #1 ───────────────────────────────────────────────
    {
      quoteNo: 'QT2024006',
      caseType: 'returning',
      customerName: 'Chiang Mai Central Mall Group',
      lob: 'Property',
      product: 'Commercial Property Policy',
      sumInsured: 48000000,
      premiumEstimate: 640000,
      occupancy: 'Retail Shopping Mall & Food Court (Chiang Mai)',
      latitude: 18.7883,
      longitude: 98.9853, // Chiang Mai
      city: 'Chiang Mai', state: 'Chiang Mai',
      claims: 2,
      claimsDetails: 'Flood ingress claim (₹28 L) during 2025 monsoon, slip & fall liability (₹12 L) — Chiang Mai city centre location.',
      riskScore: 58,
      riskCategory: 'Referred',
      riskCategoryReason: 'Referred — TIV ₹4.8 Cr exceeds Junior UW limit. 2 new claims (flood + liability) since last policy. Category: Preferred → Referred.',
      slaHours: 18,
      owner: 'Sarah Jenkins',
      assignedRole: 'senior_underwriter',
      status: 'Senior Approval Pending',
      // --- Returning Case Specific Fields ---
      previousPolicy: {
        policyNo: 'POL2023-441',
        sumInsured: 32000000, // ₹3.20 Cr
        premium: 420000, // ₹4.20 L
        riskScore: 74,
        riskCategory: 'Preferred',
        occupancy: 'Retail Shopping Centre',
        claims: 0,
        reinsuranceDecision: 'Treaty Applicable',
        owner: 'David Wright',
        expiryDate: '2026-07-01'
      },
      categoryMovement: 'deteriorated', // 'improved' | 'unchanged' | 'deteriorated'
      categoryMovementReason: 'Claims count increased from 0 to 2 (monsoon flood + liability). TIV increased 50% triggering Senior UW authority review.',
      changeDetection: [
        { field: 'Sum Insured', previous: '₹3.20 Cr', current: '₹4.80 Cr', change: '+50%', severity: 'high' },
        { field: 'Claims (3Y)', previous: '0 claims', current: '2 claims', change: '+2 claims', severity: 'high' },
        { field: 'Risk Score', previous: '74 (Preferred)', current: '58 (Referred)', change: '-16 pts', severity: 'high' },
        { field: 'Risk Category', previous: 'Preferred', current: 'Referred', change: 'Deteriorated', severity: 'high' },
        { field: 'Premium Estimate', previous: '₹4.20 L', current: '₹6.40 L', change: '+52%', severity: 'medium' },
        { field: 'Owner / UW', previous: 'David Wright', current: 'Sarah Jenkins (Senior)', change: 'Re-routed', severity: 'medium' },
        { field: 'Reinsurance', previous: 'Treaty Applicable', current: 'Treaty Applicable (TBC)', change: 'Reconfirm Required', severity: 'low' }
      ],
      documents: [
        { name: 'Renewal Proposal Form', uploaded: true, type: 'pdf' },
        { name: 'Updated Property Valuation', uploaded: true, type: 'pdf' },
        { name: 'Loss Run Reports 5Y', uploaded: false, type: 'pdf', mandatory: true }
      ],
      remarks: [
        { date: '2026-06-24 09:00', user: 'System Engine', role: 'system', note: 'Returning case detected. Previous policy POL2023-441 retrieved. Category movement: Preferred → Referred.' },
        { date: '2026-06-24 09:30', user: 'David Wright', role: 'underwriter', note: 'Sum Insured increase of 50% and 2 new claims since last policy. Routing to Senior UW for review.' }
      ],
      chatHistory: [
        { sender: 'agent', text: 'Please find the renewal submission for Chiang Mai Central Mall. Two minor incidents in 2025 — operations remain stable and footfall strong.', time: '2026-06-24 08:45' },
        { sender: 'underwriter', text: 'Noted. TIV increase from ₹3.2 Cr to ₹4.8 Cr requires senior review. Please upload the full Loss Run Reports for 2023-2025.', time: '2026-06-24 09:35' }
      ],
      timeline: [
        { label: 'Case Retrieved', date: '2026-06-24 08:30', user: 'System Engine', status: 'completed' },
        { label: 'Changes Identified', date: '2026-06-24 09:00', user: 'System Engine', status: 'completed' },
        { label: 'Risk Revalidated', date: '2026-06-24 09:00', user: 'System Engine', status: 'completed' },
        { label: 'Underwriter Review', date: '2026-06-24 09:30', user: 'David Wright', status: 'completed' },
        { label: 'Senior UW Review', date: 'In Progress', user: 'Sarah Jenkins', status: 'active' },
        { label: 'Capacity Rechecked', date: 'Pending', user: 'TBD', status: 'pending' },
        { label: 'Terms Revised / Released', date: 'Pending', user: 'TBD', status: 'pending' }
      ]
    },
    // ─── RETURNING CASE #2 ───────────────────────────────────────────────
    {
      quoteNo: 'QT2024007',
      caseType: 'returning',
      customerName: 'Khon Kaen BioStorage Co.',
      lob: 'Property',
      product: 'Commercial Property Policy',
      sumInsured: 85000000,
      premiumEstimate: 1120000,
      occupancy: 'Pharmaceutical Cold Chain Warehouse (Khon Kaen)',
      latitude: 16.4419,
      longitude: 102.8360, // Khon Kaen
      city: 'Khon Kaen', state: 'Khon Kaen',
      claims: 1,
      claimsDetails: 'Cold chain refrigeration failure claim (₹85 L) in 2025 — Khon Kaen pharmaceutical logistics hub.',
      riskScore: 61,
      riskCategory: 'Referred',
      riskCategoryReason: 'Referred — TIV ₹8.5 Cr within Senior UW range. Cold chain failure claim in 2025 and treaty position near limit require reconfirmation.',
      slaHours: 8,
      owner: 'TBD',
      assignedRole: 'underwriting_manager',
      status: 'Manager Referral Pending',
      // --- Returning Case Specific Fields ---
      previousPolicy: {
        policyNo: 'POL2023-388',
        sumInsured: 72000000, // ₹7.20 Cr
        premium: 940000, // ₹9.40 L
        riskScore: 65,
        riskCategory: 'Referred',
        occupancy: 'Pharmaceutical Warehouse',
        claims: 0,
        reinsuranceDecision: 'Treaty Applicable',
        owner: 'Robert Vance',
        expiryDate: '2026-06-30'
      },
      categoryMovement: 'unchanged', // 'improved' | 'unchanged' | 'deteriorated'
      categoryMovementReason: 'Risk remains Referred. TIV increase ₹7.2 Cr → ₹8.5 Cr elevates treaty position. Cold chain claim (₹85 L) in 2025 noted — treaty continuity check required.',
      changeDetection: [
        { field: 'Sum Insured', previous: '₹7.20 Cr', current: '₹8.50 Cr', change: '+18%', severity: 'medium' },
        { field: 'Claims (3Y)', previous: '0 claims', current: '1 claim (₹85 L)', change: '+1 claim', severity: 'high' },
        { field: 'Risk Score', previous: '65 (Referred)', current: '61 (Referred)', change: '-4 pts', severity: 'low' },
        { field: 'Risk Category', previous: 'Referred', current: 'Referred', change: 'Unchanged', severity: 'low' },
        { field: 'Premium Estimate', previous: '₹9.40 L', current: '₹11.20 L', change: '+19%', severity: 'medium' },
        { field: 'Reinsurance Position', previous: 'Treaty: ₹62.0 Cr surplus', current: 'Treaty: ₹75.0 Cr surplus — Near Limit', change: 'Escalated', severity: 'high' },
        { field: 'Owner / UW', previous: 'Robert Vance (Manager)', current: 'TBD — Pending Assignment', change: 'Reassignment Required', severity: 'medium' }
      ],
      documents: [
        { name: 'Previous Policy Schedule', uploaded: true, type: 'pdf' },
        { name: 'Cold Chain Risk Assessment', uploaded: true, type: 'pdf' },
        { name: 'Refrigeration Claim Report', uploaded: false, type: 'pdf', mandatory: true },
        { name: 'Updated Valuation Report', uploaded: false, type: 'pdf', mandatory: false }
      ],
      remarks: [
        { date: '2026-06-24 11:00', user: 'System Engine', role: 'system', note: 'Returning case: POL2023-388. Sum Insured increase approaching treaty limit. Reinsurance continuity check required.' },
        { date: '2026-06-24 11:30', user: 'Sarah Jenkins', role: 'senior_underwriter', note: 'Treaty limit approaching ₹80.0 Cr threshold. Escalating to Manager. Reinsurance team to review facultative options.' }
      ],
      chatHistory: [
        { sender: 'underwriter', text: 'Khon Kaen BioStorage renewal — ₹85 L cold chain claim in 2025, TIV approaching treaty boundary. Requires manager sign-off and reinsurance continuity review.', time: '2026-06-24 11:35' }
      ],
      timeline: [
        { label: 'Case Retrieved', date: '2026-06-24 10:00', user: 'System Engine', status: 'completed' },
        { label: 'Changes Identified', date: '2026-06-24 11:00', user: 'System Engine', status: 'completed' },
        { label: 'Risk Revalidated', date: '2026-06-24 11:00', user: 'System Engine', status: 'completed' },
        { label: 'Underwriter Review', date: '2026-06-24 11:30', user: 'Sarah Jenkins', status: 'completed' },
        { label: 'Manager Referral', date: 'In Progress', user: 'Robert Vance', status: 'active' },
        { label: 'Capacity Rechecked', date: 'Pending', user: 'TBD', status: 'pending' },
        { label: 'Reinsurance Continuity', date: 'Pending', user: 'Reinsurance Team', status: 'pending' },
        { label: 'Terms Revised / Released', date: 'Pending', user: 'TBD', status: 'pending' }
      ]
    }
  ],

  // Notifications Queue
  notifications: [
    { id: 1, title: 'New Referral Assignment', desc: 'QT2024002 (Riverside Hotels) has been referred to Senior Underwriter queue.', time: '2h ago', unread: true },
    { id: 2, title: 'SLA Breach Threat', desc: 'QT2024002 is within 4 hours of SLA threshold breach!', time: '1h ago', unread: true },
    { id: 3, title: 'Clarification Response', desc: 'Agent replied on QT2024001 (Acme Manufacturing). View docs.', time: '30m ago', unread: true },
    { id: 4, title: 'Accumulation Warning', desc: 'Risk at Manchester ChemCo is nearing cumulative branch limits.', time: '10m ago', unread: true },
    { id: 5, title: 'Returning Case — Category Deteriorated', desc: 'QT2024006 (Greenfield Retail) moved from Preferred to Referred due to claims increase.', time: '45m ago', unread: true },
    { id: 6, title: 'Renewal Review Due', desc: 'QT2024007 (Northern Pharma) renewal terms require Senior UW approval before release.', time: '20m ago', unread: true }
  ],

  // Audit Logs
  auditLogs: [
    { timestamp: '2026-06-24 16:15:32', quoteNo: 'QT2024002', user: 'Sarah Jenkins', role: 'Senior Underwriter', action: 'Referred from Junior Queue', transition: 'Underwriting -> Senior Review', remarks: 'Sum insured exceeds basic underwriter limit.' },
    { timestamp: '2026-06-24 15:30:10', quoteNo: 'QT2024005', user: 'System Rules', role: 'Automation Engine', action: 'Trigger Reinsurance recommendation', transition: 'Assessment -> Reinsurance Review', remarks: 'Chemical Risk sum insured exceeds treaty retention.' },
    { timestamp: '2026-06-24 14:22:15', quoteNo: 'QT2024001', user: 'Agent Intermediary', role: 'Agent', action: 'Uploaded Fire Survey Doc', transition: 'Active', remarks: 'Attached documentation requested by UW.' },
    { timestamp: '2026-06-24 10:00:00', quoteNo: 'QT2024003', user: 'Agent Intermediary', role: 'Agent', action: 'Quotation Created', transition: 'New -> Draft', remarks: 'Quote submission for tech incubator facility.' }
  ]
};

// ─── INR Currency Formatter ────────────────────────────────────────────────
// Formats a number (in base units) as ₹X.XX Cr
function formatINR(amount) {
  const cr = amount / 10000000;
  if (cr >= 1) return `₹${cr.toFixed(2)} Cr`;
  const lac = amount / 100000;
  if (lac >= 1) return `₹${lac.toFixed(2)} L`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

// Wizard Draft Data
let quoteWizardData = {
  customerName: '',
  lob: 'Property',
  product: 'Commercial Property Policy',
  sumInsured: 1000000,
  premiumEstimate: 12000,
  occupancy: 'Office',
  latitude: 53.4808,
  longitude: -2.2426,
  claims: 0,
  claimsDetails: '',
  riskScore: 100,
  riskCategory: 'Preferred',
  documents: [],
  triggers: []
};

// Stepper steps configuration
const stepperSteps = [
  'Customer Details',
  'Location Details',
  'Occupancy Details',
  'Coverage Details',
  'Risk Questionnaire',
  'Claims History',
  'Upload Documents',
  'Risk Scoring',
  'Underwriting Review',
  'Reinsurance Scan',
  'Quote Issuance'
];

// Initialize application on load
window.addEventListener('DOMContentLoaded', () => {
  app.init();
});

// App Controller Object
const app = {
  init() {
    // Setup Navigation Listeners
    document.querySelectorAll('.sidebar-menu li').forEach(item => {
      item.addEventListener('click', (e) => {
        const viewId = item.getAttribute('data-view');
        this.switchView(viewId);
      });
    });

    // Theme Switcher
    const themeBtn = document.getElementById('theme-toggle');
    themeBtn.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      const isDark = document.body.classList.contains('dark-mode');
      const themeIcon = document.getElementById('theme-icon');
      if (isDark) {
        themeIcon.setAttribute('data-lucide', 'sun');
      } else {
        themeIcon.setAttribute('data-lucide', 'moon');
      }
      this.drawAccumulationMap(); // Redraw map to adapt to new theme colors
      lucide.createIcons();
    });

    // Notification Drawer Switch
    const bellBtn = document.getElementById('bell-btn');
    const closeDrawerBtn = document.getElementById('close-drawer-btn');
    const drawer = document.getElementById('notifications-drawer');

    bellBtn.addEventListener('click', () => {
      drawer.classList.add('open');
      this.clearUnreadNotificationsBadge();
    });

    closeDrawerBtn.addEventListener('click', () => {
      drawer.classList.remove('open');
    });

    // Top-Right Profile Dropdown Toggler
    const profileTrigger = document.getElementById('profile-menu-trigger');
    const profileDropdown = document.getElementById('profile-dropdown');

    profileTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      profileDropdown.classList.toggle('open');
      profileTrigger.classList.toggle('active');
    });

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (!profileDropdown.contains(e.target) && !profileTrigger.contains(e.target)) {
        profileDropdown.classList.remove('open');
        profileTrigger.classList.remove('active');
      }
    });

    // Global Search Setup
    const searchInput = document.getElementById('global-search');
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      this.filterDashboardTable(q);
    });

    // Dashboard filters
    document.getElementById('filter-lob').addEventListener('change', () => this.applyDashboardFilters());
    document.getElementById('filter-risk').addEventListener('change', () => this.applyDashboardFilters());
    document.getElementById('filter-sla').addEventListener('change', () => this.applyDashboardFilters());
    document.getElementById('filter-branch').addEventListener('change', () => this.applyDashboardFilters());

    // Setup Chat Send Button
    document.getElementById('detail-send-chat-btn').addEventListener('click', () => {
      this.sendChatFromDetail();
    });
    document.getElementById('detail-chat-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.sendChatFromDetail();
      }
    });

    // Init Render
    this.renderRoleDropdownSwitcher();
    this.updateRoleViewContext();
    this.initCustomDropdowns();
    this.renderDashboardMetrics();
    this.renderDashboardTable();
    this.renderNotifications();
    this.renderAuthorityMatrix();
    this.renderAuditTrail();
    this.drawAccumulationMap();

    // Create Lucide Icons
    lucide.createIcons();
  },

  // Render Top-Right Dropdown switcher roles list
  renderRoleDropdownSwitcher() {
    const list = document.getElementById('dropdown-role-list');
    list.innerHTML = '';

    appState.personas.forEach(p => {
      // Choose icon for persona
      let icon = 'user';
      if (p.key === 'senior_underwriter') icon = 'shield-alert';
      if (p.key === 'underwriting_manager') icon = 'briefcase';
      if (p.key === 'reinsurance_manager') icon = 'globe';
      if (p.key === 'agent') icon = 'users';
      if (p.key === 'admin') icon = 'sliders';
      if (p.key === 'operations') icon = 'layers';

      const isActive = appState.currentRole === p.key;

      const div = document.createElement('div');
      div.className = `role-switch-item ${isActive ? 'active' : ''}`;
      div.innerHTML = `
        <div class="role-switch-icon-box">
          <i data-lucide="${icon}"></i>
        </div>
        <div class="role-switch-details">
          <h5>${p.name}</h5>
          <p>${p.roleTitle} — ${p.desc}</p>
        </div>
      `;

      div.addEventListener('click', () => {
        appState.currentRole = p.key;
        this.closeProfileDropdown();
        this.renderRoleDropdownSwitcher();
        this.updateRoleViewContext();
      });

      list.appendChild(div);
    });

    lucide.createIcons();
  },

  closeProfileDropdown() {
    const profileDropdown = document.getElementById('profile-dropdown');
    const profileTrigger = document.getElementById('profile-menu-trigger');
    profileDropdown.classList.remove('open');
    profileTrigger.classList.remove('active');
  },

  simulateSignOut() {
    this.closeProfileDropdown();
    this.openModal(
      'Session Finished',
      '<p>You have signed out of the current underwriting sandbox session.</p>',
      '<button class="btn btn-primary" onclick="app.closeModal(); location.reload();">Restart Prototype</button>'
    );
  },

  // Role Management
  updateRoleViewContext() {
    const roleKey = appState.currentRole;
    const persona = appState.personas.find(p => p.key === roleKey);
    if (!persona) return;
    
    // Update Header trigger fields
    document.getElementById('header-avatar-initials').textContent = persona.initials;
    document.getElementById('header-user-name').textContent = persona.name;
    document.getElementById('header-user-role').textContent = persona.roleTitle;

    // Update Dropdown details fields
    document.getElementById('dropdown-avatar-initials').textContent = persona.initials;
    document.getElementById('dropdown-user-name').textContent = persona.name;
    document.getElementById('dropdown-user-email').textContent = persona.email;

    // Hide configure screens for non-admin
    const adminConfigMenuItem = document.querySelector('[data-view="admin-config-view"]');
    const authorityMenuItem = document.querySelector('[data-view="authority-matrix-view"]');
    
    if (roleKey === 'admin') {
      adminConfigMenuItem.style.display = 'block';
      authorityMenuItem.style.display = 'block';
    } else {
      adminConfigMenuItem.style.display = 'none';
      authorityMenuItem.style.display = 'none';
    }

    // Refresh active view
    this.switchView(appState.activeView);
    this.renderDashboardMetrics();
    this.renderDashboardTable();
    this.renderWorkQueueTable();
  },

  // View Routing Management
  switchView(viewId, quoteNo = null) {
    appState.activeView = viewId;
    this.stopMapAnimation();
    
    // Hide active menu states, apply to selected
    document.querySelectorAll('.sidebar-menu li').forEach(item => {
      if (item.getAttribute('data-view') === viewId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Toggle viewport section views
    document.querySelectorAll('.app-view').forEach(view => {
      view.classList.remove('active');
    });

    const activeViewEl = document.getElementById(viewId);
    if (activeViewEl) {
      activeViewEl.classList.add('active');
    }

    // Handle View-Specific Initializers
    if (viewId === 'new-quote-view') {
      appState.currentStep = 0;
      this.initQuotationStepper();
    } else if (viewId === 'work-queue-view') {
      this.renderWorkQueueTable();
    } else if (viewId === 'quote-detail-view' && quoteNo) {
      appState.selectedQuoteNo = quoteNo;
      this.renderQuotationDetailReview(quoteNo);
    } else if (viewId === 'risk-map-view') {
      setTimeout(() => this.initLeafletMap(), 100);
      this.stopMapAnimation();
    } else if (viewId === 'product-configurator-view') {
      this.renderConfigProduct();
    } else if (viewId === 'authority-matrix-view') {
      this.renderAuthorityMatrix();
    } else if (viewId === 'admin-config-view') {
      this.loadAdminConfigValues();
    } else if (viewId === 'audit-trail-view') {
      this.renderAuditTrail();
    } else if (viewId === 'dashboard-view') {
      this.renderDashboardMetrics();
      this.renderDashboardTable();
    }

    lucide.createIcons();
  },

  // Dashboard metrics — 7 KPIs per PDF spec
  renderDashboardMetrics() {
    const quotes = appState.quotations;
    const role = appState.currentRole;
    
    let visibleQuotes = quotes;
    if (role === 'agent') visibleQuotes = quotes.filter(q => q.quoteNo !== 'QT2024003');

    // Apply case type filter
    let filtered = visibleQuotes;
    if (appState.caseTypeFilter === 'fresh')     filtered = visibleQuotes.filter(q => !q.caseType || q.caseType === 'fresh');
    if (appState.caseTypeFilter === 'returning') filtered = visibleQuotes.filter(q => q.caseType === 'returning');

    const freshCount    = visibleQuotes.filter(q => !q.caseType || q.caseType === 'fresh').length;
    const returnCount   = visibleQuotes.filter(q => q.caseType === 'returning').length;
    const preferredCount= filtered.filter(q => q.riskCategory === 'Preferred').length;
    const referredCount = filtered.filter(q => q.riskCategory === 'Referred').length;
    const deferredCount = filtered.filter(q => q.riskCategory === 'Deferred').length;
    const nearingSLA    = filtered.filter(q => q.slaHours > 0 && q.slaHours <= 12).length;
    const totalTIV      = filtered.reduce((s, q) => s + q.sumInsured, 0);
    const capUtil       = Math.round((totalTIV / (appState.adminRules.maxCapacity * 10)) * 100);

    const metricsContainer = document.getElementById('dashboard-metrics');
    metricsContainer.innerHTML = `
      <div class="metric-card fresh-case" onclick="app.setCaseTypeFilter('fresh')">
        <div class="metric-info">
          <h3>Fresh Cases</h3>
          <div class="value">${freshCount}</div>
          <div class="metric-sub">New submissions</div>
        </div>
        <div class="metric-icon-box" style="background-color:#dbeafe;color:#1d4ed8;">
          <i data-lucide="file-plus"></i>
        </div>
      </div>

      <div class="metric-card returning-case" onclick="app.setCaseTypeFilter('returning')">
        <div class="metric-info">
          <h3>Returning Cases</h3>
          <div class="value">${returnCount}</div>
          <div class="metric-sub">Renewals &amp; endorsements</div>
        </div>
        <div class="metric-icon-box" style="background-color:#ede9fe;color:#7c3aed;">
          <i data-lucide="refresh-cw"></i>
        </div>
      </div>

      <div class="metric-card preferred" onclick="app.filterByStatus('Preferred')">
        <div class="metric-info">
          <h3>Preferred</h3>
          <div class="value">${preferredCount}</div>
          <div class="metric-sub">Fast-track eligible</div>
        </div>
        <div class="metric-icon-box">
          <i data-lucide="shield-check"></i>
        </div>
      </div>

      <div class="metric-card referred" onclick="app.filterByStatus('Referred')">
        <div class="metric-info">
          <h3>Referred</h3>
          <div class="value">${referredCount}</div>
          <div class="metric-sub">Pending UW review</div>
        </div>
        <div class="metric-icon-box">
          <i data-lucide="alert-triangle"></i>
        </div>
      </div>

      <div class="metric-card deferred" onclick="app.filterByStatus('Deferred')">
        <div class="metric-info">
          <h3>Deferred</h3>
          <div class="value">${deferredCount}</div>
          <div class="metric-sub">Blocked / exception</div>
        </div>
        <div class="metric-icon-box">
          <i data-lucide="alert-circle"></i>
        </div>
      </div>

      <div class="metric-card sla" onclick="app.filterByStatus('sla')">
        <div class="metric-info">
          <h3>SLA Breach Risk</h3>
          <div class="value">${nearingSLA}</div>
          <div class="metric-sub">Nearing deadline</div>
        </div>
        <div class="metric-icon-box">
          <i data-lucide="clock"></i>
        </div>
      </div>
    `;
    
    this.renderDashboardMI();
    lucide.createIcons();
  },

  renderDashboardMI() {
    const divConversion = document.getElementById('mi-conversion-rates');
    if (divConversion) {
      divConversion.innerHTML = `
        <div style="margin-bottom: 8px;">
          <div style="display:flex; justify-content:space-between; font-size:0.78rem; font-weight:600; margin-bottom:4px;">
            <span>Commercial Property</span><span>62%</span>
          </div>
          <div style="background:#e2e8f0; height:8px; border-radius:4px; overflow:hidden;">
            <div style="background:var(--risk-preferred-text); width:62%; height:100%; border-radius:4px;"></div>
          </div>
        </div>
        <div style="margin-bottom: 8px;">
          <div style="display:flex; justify-content:space-between; font-size:0.78rem; font-weight:600; margin-bottom:4px;">
            <span>General Liability</span><span>48%</span>
          </div>
          <div style="background:#e2e8f0; height:8px; border-radius:4px; overflow:hidden;">
            <div style="background:var(--accent-color); width:48%; height:100%; border-radius:4px;"></div>
          </div>
        </div>
        <div style="margin-bottom: 8px;">
          <div style="display:flex; justify-content:space-between; font-size:0.78rem; font-weight:600; margin-bottom:4px;">
            <span>Marine Cargo</span><span>74%</span>
          </div>
          <div style="background:#e2e8f0; height:8px; border-radius:4px; overflow:hidden;">
            <div style="background:#0284c7; width:74%; height:100%; border-radius:4px;"></div>
          </div>
        </div>
        <div>
          <div style="display:flex; justify-content:space-between; font-size:0.78rem; font-weight:600; margin-bottom:4px;">
            <span>Engineering & CAR</span><span>35%</span>
          </div>
          <div style="background:#e2e8f0; height:8px; border-radius:4px; overflow:hidden;">
            <div style="background:var(--risk-referred-text); width:35%; height:100%; border-radius:4px;"></div>
          </div>
        </div>
      `;
    }

    const divSLATrends = document.getElementById('mi-sla-trends');
    if (divSLATrends) {
      divSLATrends.innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
          <div style="background:var(--bg-card); padding:8px; border-radius:6px; text-align:center; border:1px solid var(--border-color);">
            <div style="font-size:0.7rem; color:var(--text-muted);">SLA Compliance</div>
            <div style="font-size:1.1rem; font-weight:700; color:var(--risk-preferred-text);">92%</div>
            <div style="font-size:0.65rem; color:var(--text-muted);">Target: 95%</div>
          </div>
          <div style="background:var(--bg-card); padding:8px; border-radius:6px; text-align:center; border:1px solid var(--border-color);">
            <div style="font-size:0.7rem; color:var(--text-muted);">Referral Rate</div>
            <div style="font-size:1.1rem; font-weight:700; color:var(--risk-referred-text);">28.5%</div>
            <div style="font-size:0.65rem; color:var(--text-muted);">Slight decrease</div>
          </div>
        </div>
        <div>
          <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:4px;">
            <span>Avg TAT (Turnaround Time)</span>
            <span style="font-weight:600;">4.2 hours / Target 8 hrs</span>
          </div>
          <div style="background:#e2e8f0; height:6px; border-radius:3px; overflow:hidden;">
            <div style="background:#0ea5e9; width:52.5%; height:100%;"></div>
          </div>
        </div>
      `;
    }

    const divCapacity = document.getElementById('mi-capacity-split');
    if (divCapacity) {
      divCapacity.innerHTML = `
        <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:6px;">Exposed TIV distribution across risk retention layers:</div>
        <div style="display:flex; height:24px; border-radius:6px; overflow:hidden; margin-bottom:12px; box-shadow:inset 0 1px 3px rgba(0,0,0,0.1);">
          <div style="background:var(--risk-preferred-text); width:14.5%; display:flex; align-items:center; justify-content:center; color:#fff; font-size:0.65rem; font-weight:700;" title="Net Retention">15%</div>
          <div style="background:var(--accent-color); width:65.2%; display:flex; align-items:center; justify-content:center; color:#fff; font-size:0.65rem; font-weight:700;" title="Treaty Reinsurance">65%</div>
          <div style="background:var(--risk-referred-text); width:20.3%; display:flex; align-items:center; justify-content:center; color:#fff; font-size:0.65rem; font-weight:700;" title="Facultative Reinsurance">20%</div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:0.7rem;">
          <div style="display:flex; align-items:center; gap:4px;">
            <span style="display:inline-block; width:8px; height:8px; background:var(--risk-preferred-text); border-radius:50%;"></span>
            <span>Retention (₹22.5 Cr)</span>
          </div>
          <div style="display:flex; align-items:center; gap:4px;">
            <span style="display:inline-block; width:8px; height:8px; background:var(--accent-color); border-radius:50%;"></span>
            <span>Treaty (₹101.4 Cr)</span>
          </div>
          <div style="display:flex; align-items:center; gap:4px;">
            <span style="display:inline-block; width:8px; height:8px; background:var(--risk-referred-text); border-radius:50%;"></span>
            <span>Facultative (₹31.5 Cr)</span>
          </div>
        </div>
      `;
    }
  },

  // Unified filtering helper that evaluates all active dropdowns + search bar + case type toggles
  getFilteredQuotes() {
    const role = appState.currentRole;
    let list = appState.quotations;
    if (role === 'agent') {
      list = list.filter(q => q.quoteNo !== 'QT2024003');
    }

    // 1. Case Type filter
    if (appState.caseTypeFilter !== 'all') {
      list = list.filter(q => {
        if (appState.caseTypeFilter === 'fresh') return !q.caseType || q.caseType === 'fresh';
        if (appState.caseTypeFilter === 'returning') return q.caseType === 'returning';
        return true;
      });
    }

    // 2. LOB Filter
    const lobEl = document.getElementById('filter-lob');
    if (lobEl && lobEl.value !== 'all') {
      list = list.filter(q => q.lob === lobEl.value);
    }

    // 3. Risk Filter
    const riskEl = document.getElementById('filter-risk');
    if (riskEl && riskEl.value !== 'all') {
      list = list.filter(q => q.riskCategory === riskEl.value);
    }

    // 4. SLA Filter
    const slaEl = document.getElementById('filter-sla');
    if (slaEl && slaEl.value === 'breaching') {
      list = list.filter(q => q.slaHours > 0 && q.slaHours <= 12);
    }

    const branchEl = document.getElementById('filter-branch');
    if (branchEl && branchEl.value !== 'all') {
      list = list.filter(q => q.city === branchEl.value);
    }

    // 6. Global Search Query
    const searchEl = document.getElementById('global-search');
    if (searchEl && searchEl.value) {
      const query = searchEl.value.toLowerCase();
      list = list.filter(q => {
        return q.quoteNo.toLowerCase().includes(query) ||
               q.customerName.toLowerCase().includes(query) ||
               q.occupancy.toLowerCase().includes(query) ||
               q.lob.toLowerCase().includes(query);
      });
    }

    return list;
  },

  // Dashboard Data Table rendering
  renderDashboardTable(filteredQuotes = null) {
    const list = filteredQuotes || this.getFilteredQuotes();
    const tbody = document.getElementById('dashboard-table-body');
    const badge = document.getElementById('table-count-badge');
    
    tbody.innerHTML = '';
    badge.textContent = `${list.length} quotations`;

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 24px;">No quotations found matching selected parameters.</td></tr>`;
      return;
    }

    list.forEach(q => {
      const isReturning = q.caseType === 'returning';
      let riskBadgeClass = 'badge-preferred';
      if (q.riskCategory === 'Referred') riskBadgeClass = 'badge-referred';
      if (q.riskCategory === 'Deferred') riskBadgeClass = 'badge-deferred';

      let statusBadgeClass = 'badge-pending';
      if (q.status === 'Approved' || q.status === 'Quote Issued') statusBadgeClass = 'badge-preferred';
      if (q.status === 'Deferred') statusBadgeClass = 'badge-deferred';
      
      let slaText = `${q.slaHours}h remaining`;
      let slaBadgeClass = '';
      if (q.slaHours === 0) { slaText = 'Resolved'; slaBadgeClass = 'badge-preferred'; }
      else if (q.slaHours <= 12) { slaBadgeClass = 'badge-sla'; }

      // Category movement chip for returning cases
      let movementChip = '';
      if (isReturning && q.categoryMovement) {
        const mvClr = q.categoryMovement === 'deteriorated' ? '#dc2626' : q.categoryMovement === 'improved' ? '#059669' : '#64748b';
        const mvIcon = q.categoryMovement === 'deteriorated' ? '▼' : q.categoryMovement === 'improved' ? '▲' : '→';
        movementChip = `<span style="margin-left:5px;font-size:0.65rem;background:${mvClr}20;color:${mvClr};border:1px solid ${mvClr}40;padding:1px 5px;border-radius:4px;font-weight:700;">${mvIcon} ${q.categoryMovement.charAt(0).toUpperCase()+q.categoryMovement.slice(1)}</span>`;
      }

      const caseTypeBadge = isReturning
        ? `<span class="badge-case-type returning"><i data-lucide="refresh-cw" style="width:10px;height:10px;"></i> Returning</span>`
        : `<span class="badge-case-type fresh"><i data-lucide="file-plus" style="width:10px;height:10px;"></i> Fresh</span>`;

      const tr = document.createElement('tr');
      if (isReturning) tr.classList.add('returning-row');
      tr.innerHTML = `
        <td style="font-weight:700;color:#2563eb;">${q.quoteNo}</td>
        <td style="font-weight:600;">${q.customerName}</td>
        <td>${caseTypeBadge}</td>
        <td>${q.lob} - ${q.product.substring(0, 14)}...</td>
        <td style="font-weight:600;">${formatINR(q.sumInsured)}</td>
        <td><span class="badge ${riskBadgeClass}">${q.riskCategory}</span>${movementChip}</td>
        <td><span class="badge ${slaBadgeClass}">${slaText}</span></td>
        <td><span style="font-size:0.85rem;color:var(--text-secondary);"><i data-lucide="user" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"></i>${q.owner}</span></td>
        <td><span class="badge ${statusBadgeClass}">${q.status}</span></td>
      `;
      tr.addEventListener("click", () => { this.switchView("quote-detail-view", q.quoteNo); });
      tbody.appendChild(tr);
    });

    lucide.createIcons();
  },

  setCaseTypeFilter(type) {
    appState.caseTypeFilter = type;
    
    // Update active class on buttons
    document.querySelectorAll('.case-type-btn').forEach(btn => {
      if (btn.getAttribute('data-type') === type) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Reset risk and SLA dropdowns to allow a fresh start when user toggles case type
    const riskEl = document.getElementById('filter-risk');
    const slaEl = document.getElementById('filter-sla');
    if (riskEl) riskEl.value = 'all';
    if (slaEl) slaEl.value = 'all';

    this.applyDashboardFilters();
  },

  filterByStatus(statusType) {
    // Reset LOB and Branch filters to avoid clashing when selecting a high-level metric card
    const lobEl = document.getElementById('filter-lob');
    const branchEl = document.getElementById('filter-branch');
    const riskEl = document.getElementById('filter-risk');
    const slaEl = document.getElementById('filter-sla');

    if (lobEl) lobEl.value = 'all';
    if (branchEl) branchEl.value = 'all';

    if (statusType === 'Preferred' || statusType === 'Referred' || statusType === 'Deferred') {
      if (riskEl) riskEl.value = statusType;
      if (slaEl) slaEl.value = 'all';
    } else if (statusType === 'sla') {
      if (riskEl) riskEl.value = 'all';
      if (slaEl) slaEl.value = 'breaching';
    } else {
      if (riskEl) riskEl.value = 'all';
      if (slaEl) slaEl.value = 'all';
    }

    // Reset Case Type filter back to All Cases so we don't accidentally hide metrics
    appState.caseTypeFilter = 'all';
    document.querySelectorAll('.case-type-btn').forEach(btn => {
      if (btn.getAttribute('data-type') === 'all') btn.classList.add('active');
      else btn.classList.remove('active');
    });

    this.applyDashboardFilters();
  },

  applyDashboardFilters() {
    const filtered = this.getFilteredQuotes();
    this.renderDashboardTable(filtered);
  },

  filterDashboardTable(query) {
    this.applyDashboardFilters();
  },

  // Underwriter Work Queue Filtering
  filterQueue(type, btn) {
    btn.parentNode.querySelectorAll('button').forEach(b => b.classList.remove('btn-active'));
    btn.classList.add('btn-active');

    let list = appState.quotations;
    
    if (type === 'Preferred' || type === 'Referred' || type === 'Deferred') {
      list = list.filter(q => q.riskCategory === type);
    } else if (type === 'clarification') {
      list = list.filter(q => q.chatHistory.length > 0 && q.chatHistory[q.chatHistory.length - 1].sender === 'agent');
    } else if (type === 'docs') {
      list = list.filter(q => q.documents.some(d => !d.uploaded));
    } else if (type === 'reinsurance') {
      list = list.filter(q => q.status === 'Reinsurance Review');
    }

    this.renderWorkQueueTable(list);
  },

  renderWorkQueueTable(customList = null) {
    const rawList = customList || appState.quotations;
    const tbody = document.getElementById('work-queue-table-body');
    tbody.innerHTML = '';

    const role = appState.currentRole;
    let list = rawList;
    if (role === 'underwriter') {
      list = rawList.filter(q => q.assignedRole === 'underwriter' || q.assignedRole === 'junior_underwriter' || q.assignedRole === 'preferred_underwriter');
    } else if (role === 'senior_underwriter') {
      list = rawList.filter(q => q.assignedRole === 'senior_underwriter' || q.riskCategory === 'Referred');
    } else if (role === 'underwriting_manager') {
      list = rawList.filter(q => q.assignedRole === 'underwriting_manager' || q.riskScore < 30);
    } else if (role === 'reinsurance_manager') {
      list = rawList.filter(q => q.assignedRole === 'reinsurance_manager' || q.status === 'Reinsurance Review');
    } else if (role === 'agent') {
      list = rawList.filter(q => q.status !== 'Deferred');
    }

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">No items currently in your queue.</td></tr>`;
      return;
    }

    list.forEach(q => {
      let riskBadgeClass = 'badge-preferred';
      if (q.riskCategory === 'Referred') riskBadgeClass = 'badge-referred';
      if (q.riskCategory === 'Deferred') riskBadgeClass = 'badge-deferred';

      let slaText = `${q.slaHours}h remaining`;
      let slaBadgeClass = '';
      if (q.slaHours === 0) {
        slaText = 'Resolved';
        slaBadgeClass = 'badge-preferred';
      } else if (q.slaHours <= 12) {
        slaBadgeClass = 'badge-sla';
      }

      let nextAction = 'Review details';
      if (q.status === 'Reinsurance Review') nextAction = 'Verify retention';
      if (q.status === 'Senior Approval Pending') nextAction = 'Assess Referral';
      if (q.documents.some(d => !d.uploaded)) nextAction = 'Request Docs';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 700; color: #2563eb;">${q.quoteNo}</td>
        <td style="font-weight: 600;">${q.customerName}</td>
        <td>${q.lob} - ${q.product}</td>
        <td style="font-weight: 600;">${formatINR(q.sumInsured)}</td>
        <td><span class="badge ${riskBadgeClass}">${q.riskCategory}</span></td>
        <td><span class="badge ${slaBadgeClass}">${slaText}</span></td>
        <td><span style="font-size: 0.85rem; font-weight: 500; color: var(--text-secondary);">${q.assignedRole.toUpperCase().replace('_', ' ')}</span></td>
        <td><button class="btn btn-secondary btn-sm" style="padding: 4px 8px; font-size: 0.75rem;">${nextAction}</button></td>
      `;
      tr.addEventListener('click', () => {
        this.switchView('quote-detail-view', q.quoteNo);
      });
      tbody.appendChild(tr);
    });

    lucide.createIcons();
  },

  // 11-Step Stepper Management
  initQuotationStepper() {
    const headerList = document.getElementById('stepper-header-list');
    headerList.innerHTML = '';

    stepperSteps.forEach((step, idx) => {
      const isCompleted = idx < appState.currentStep;
      const isActive = idx === appState.currentStep;
      
      const stepDiv = document.createElement('div');
      stepDiv.className = `stepper-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`;
      
      stepDiv.innerHTML = `
        <div class="step-bubble">${isCompleted ? '✓' : idx + 1}</div>
        <div class="step-label">${step}</div>
        ${idx < stepperSteps.length - 1 ? '<div class="stepper-progress-line"></div>' : ''}
      `;
      
      stepDiv.addEventListener('click', () => {
        if (idx <= appState.currentStep || isCompleted) {
          appState.currentStep = idx;
          this.renderQuotationStepperForm();
        }
      });
      headerList.appendChild(stepDiv);
    });

    this.renderQuotationStepperForm();
  },

  renderQuotationStepperForm() {
    const formBox = document.getElementById('wizard-form-box');
    formBox.innerHTML = '';

    const stepIndex = appState.currentStep;
    const isLastStep = stepIndex === stepperSteps.length - 1;

    let formHTML = '';

    switch (stepIndex) {
      case 0: // Customer & Business Details
        formHTML = `
          <div class="wizard-title-block">
            <h3>Customer & Business Details</h3>
            <p>Gather general commercial company registration and core contact information.</p>
          </div>
          <div class="wizard-grid">
            <div class="form-field">
              <label class="required">Customer / Corporate Entity Name</label>
              <input type="text" class="form-input" id="ws-cust-name" value="${quoteWizardData.customerName}" placeholder="e.g. Globex Logistics Ltd" required>
            </div>
            <div class="form-field">
              <label class="required">Company Registration Number</label>
              <input type="text" class="form-input" placeholder="e.g. 08129934" required>
            </div>
            <div class="form-field">
              <label class="required">Commercial LOB</label>
              <select class="form-select" id="ws-lob" onchange="app.updateProductSelect(this.value)">
                <option value="Property" ${quoteWizardData.lob === 'Property' ? 'selected' : ''}>Commercial Property</option>
                <option value="Liability" ${quoteWizardData.lob === 'Liability' ? 'selected' : ''}>General Liability</option>
                <option value="Cargo" ${quoteWizardData.lob === 'Cargo' ? 'selected' : ''}>Marine Cargo & Transit</option>
              </select>
            </div>
            <div class="form-field">
              <label>Select Product Plan</label>
              <select class="form-select" id="ws-product">
                <option value="Commercial Property Policy">Commercial Property Policy</option>
                <option value="Commercial Combined Cover">Commercial Combined Cover</option>
              </select>
            </div>
          </div>
        `;
        break;

      case 1: // Risk Location Details
        formHTML = `
          <div class="wizard-title-block">
            <h3>Risk Location Details</h3>
            <p>Input correct latitude and longitude coordinates to execute risk accumulation check.</p>
          </div>
          <div class="wizard-grid">
            <div class="form-field">
              <label class="required">Address Line 1</label>
              <input type="text" class="form-input" placeholder="e.g. 10 Canal Street" required>
            </div>
            <div class="form-field">
              <label class="required">Postcode / City</label>
              <input type="text" class="form-input" placeholder="e.g. M1 3HE, Manchester" required>
            </div>
            <div class="form-field">
              <label class="required">Latitude Coordinate</label>
              <input type="number" step="0.0001" class="form-input" id="ws-lat" value="${quoteWizardData.latitude}">
            </div>
            <div class="form-field">
              <label class="required">Longitude Coordinate</label>
              <input type="number" step="0.0001" class="form-input" id="ws-lng" value="${quoteWizardData.longitude}">
            </div>
          </div>
        `;
        break;

      case 2: // Occupancy / Trade Details
        formHTML = `
          <div class="wizard-title-block">
            <h3>Occupancy / Trade Details</h3>
            <p>Specify the commercial operational trade of the entity for hazard grading.</p>
          </div>
          <div class="wizard-grid">
            <div class="form-field">
              <label class="required">Trade / Occupancy Group</label>
              <select class="form-select" id="ws-occupancy">
                <option value="Office" ${quoteWizardData.occupancy === 'Office' ? 'selected' : ''}>General Commercial Office</option>
                <option value="Light Engineering & Warehousing" ${quoteWizardData.occupancy.includes('Warehousing') ? 'selected' : ''}>Light Engineering & Warehousing</option>
                <option value="Chemical Processing & Storage" ${quoteWizardData.occupancy.includes('Chemical') ? 'selected' : ''}>Chemical Processing & Storage (High Hazard)</option>
                <option value="Hospitality & Leisure" ${quoteWizardData.occupancy.includes('Hospitality') ? 'selected' : ''}>Hospitality & Leisure (Hotels, etc.)</option>
              </select>
            </div>
            <div class="form-field">
              <label>Years of Operation in Trade</label>
              <input type="number" class="form-input" value="10">
            </div>
          </div>
        `;
        break;

      case 3: // Coverage & Sum Insured
        formHTML = `
          <div class="wizard-title-block">
            <h3>Coverage & Sum Insured</h3>
            <p>Specify overall capacity limits and sum insured requirements.</p>
          </div>
          <div class="wizard-grid">
            <div class="form-field">
              <label class="required">Property / Liability Sum Insured (₹)</label>
              <input type="number" class="form-input" id="ws-sum-insured" value="${quoteWizardData.sumInsured}">
            </div>
            <div class="form-field">
              <label>Target Premium Estimate (₹)</label>
              <input type="number" class="form-input" id="ws-premium" value="${quoteWizardData.premiumEstimate}">
            </div>
          </div>
        `;
        break;

      case 4: // Risk Questionnaire
        formHTML = `
          <div class="wizard-title-block">
            <h3>Risk Questionnaire</h3>
            <p>Answers to key risk evaluation questions.</p>
          </div>
          <div class="wizard-grid full-width">
            <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 12px;">
              <input type="checkbox" id="q-sprinkler" checked style="width: 18px; height: 18px;">
              <label for="q-sprinkler" style="font-weight: 500; font-size: 0.85rem;">Approved automatic sprinkler protection is installed throughout the risk premises.</label>
            </div>
            <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 12px;">
              <input type="checkbox" id="q-security" checked style="width: 18px; height: 18px;">
              <label for="q-security" style="font-weight: 500; font-size: 0.85rem;">Dual-path cellular signaling alarms with direct police connection are operational.</label>
            </div>
            <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 12px;">
              <input type="checkbox" id="q-hazmat" style="width: 18px; height: 18px;">
              <label for="q-hazmat" style="font-weight: 500; font-size: 0.85rem;">Flammable liquids or chemicals are stored on site exceeding 1,000 liters.</label>
            </div>
          </div>
        `;
        break;

      case 5: // Claims & Loss History
        formHTML = `
          <div class="wizard-title-block">
            <h3>Claims & Loss History</h3>
            <p>Prior loss history determines basic authority routing and scoring deductions.</p>
          </div>
          <div class="wizard-grid">
            <div class="form-field">
              <label class="required">Number of Claims (Last 3 Years)</label>
              <input type="number" class="form-input" id="ws-claims" value="${quoteWizardData.claims}">
            </div>
            <div class="form-field">
              <label>Details of Prior Losses (if any)</label>
              <textarea class="form-textarea" rows="3" id="ws-claims-details">${quoteWizardData.claimsDetails}</textarea>
            </div>
          </div>
        `;
        break;

      case 6: // Upload Documents
        formHTML = `
          <div class="wizard-title-block">
            <h3>Upload Documents</h3>
            <p>Attach necessary survey reports, valuation data, and audits.</p>
          </div>
          <div class="wizard-grid full-width">
            <div style="border: 2px dashed var(--border-color); padding: 24px; border-radius: var(--radius-lg); text-align: center; background-color: var(--bg-app);">
              <i data-lucide="upload-cloud" style="width: 42px; height: 42px; color: var(--text-muted); margin-bottom: 8px;"></i>
              <h4>Drag & drop survey documents here</h4>
              <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">Supported formats: PDF, DOCX (Max 25MB)</p>
              <button class="btn btn-secondary btn-sm" style="margin-top: 10px;">Select File</button>
            </div>
            <div style="margin-top: 16px;">
              <h4 style="font-size: 0.85rem; margin-bottom: 6px;">Required Checklists:</h4>
              <div style="display: flex; gap: 8px; align-items: center; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 4px;">
                <span class="badge badge-preferred" style="padding: 2px 6px;">✓</span> Property Survey Report
              </div>
              <div style="display: flex; gap: 8px; align-items: center; font-size: 0.8rem; color: var(--text-secondary);">
                <span class="badge badge-referred" style="padding: 2px 6px;">!</span> Financial Audit Report (Optional)
              </div>
            </div>
          </div>
        `;
        break;

      case 7: { // Risk Assessment Result
        this.calculateDraftRiskScore();
        
        let riskBadgeClass = 'badge-preferred';
        if (quoteWizardData.riskCategory === 'Referred') riskBadgeClass = 'badge-referred';
        if (quoteWizardData.riskCategory === 'Deferred') riskBadgeClass = 'badge-deferred';

        formHTML = `
          <div class="wizard-title-block">
            <h3>Risk Assessment Result</h3>
            <p>Dynamic assessment output from Candela automatic rules engine.</p>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 20px;">
            <div class="panel-card" style="text-align: center; display: flex; flex-direction: column; justify-content: center; align-items: center; background-color: var(--bg-app);">

              <h4 style="font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px;">Auto Risk Score</h4>
              <div style="font-size: 3rem; font-family: var(--font-display); font-weight: 800; color: #2563eb; line-height: 1;">${quoteWizardData.riskScore}</div>
              <span class="badge ${riskBadgeClass}" style="margin-top: 12px; font-size: 0.78rem; padding: 5px 12px;">${quoteWizardData.riskCategory} Risk</span>
            </div>
            <div>
              <h4 style="margin-bottom: 8px; font-size: 0.9rem;">Score Calculation Explanations:</h4>
              <ul style="font-size: 0.8rem; color: var(--text-secondary); display: flex; flex-direction: column; gap: 6px; padding-left: 14px;" id="ws-rules-list">
                <!-- Explanations populated below -->
              </ul>
            </div>
          </div>
        `;
        break;
      }

      case 8: // Underwriting Review
        formHTML = `
          <div class="wizard-title-block">
            <h3>Underwriting Review & Referral Path</h3>
            <p>Determine authority routing requirements based on the risk profile.</p>
          </div>
          <div class="panel-card">
            <h4 style="font-size: 0.95rem; margin-bottom: 10px;"><i data-lucide="git-branch" style="vertical-align: middle; margin-right: 6px;"></i> Referral & Assignment Route</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 0.85rem;">
              <div>
                <p style="color: var(--text-muted); margin-bottom: 2px;">Assigned Review Level:</p>
                <p style="font-weight: 600;" id="ws-assignee-role">Underwriter (UW)</p>
              </div>
              <div>
                <p style="color: var(--text-muted); margin-bottom: 2px;">Referral Reason Code:</p>
                <p style="font-weight: 600;" id="ws-routing-reason">Sum Insured within Standard Authority limits.</p>
              </div>
            </div>
          </div>
        `;
        break;

      case 9: // Reinsurance Review
        formHTML = `
          <div class="wizard-title-block">
            <h3>Reinsurance Capacity Scan</h3>
            <p>Review limits against Net Retention (₹1.00 Cr) and Treaty capacities (₹5.00 Cr).</p>
          </div>
          <div class="panel-card">
            <h4 style="font-size: 0.95rem; margin-bottom: 10px;"><i data-lucide="shield" style="vertical-align: middle; margin-right: 6px;"></i> Reinsurance Recommendation</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 0.85rem;">
              <div>
                <p style="color: var(--text-muted); margin-bottom: 2px;">Treaty Position:</p>
                <p style="font-weight: 600;" id="ws-re-status">-</p>
              </div>
              <div>
                <p style="color: var(--text-muted); margin-bottom: 2px;">Placement Recommendation:</p>
                <p style="font-weight: 600;" id="ws-re-placement">-</p>
              </div>
            </div>
          </div>
        `;
        break;

      case 10: // Quote Review & Issue
        formHTML = `
          <div class="wizard-title-block">
            <h3>Review & Issue Quotation</h3>
            <p>Perform a final review of terms and bind the quotation package.</p>
          </div>
          <div class="panel-card" style="background-color: var(--primary-light); border-color: #2563eb;">
            <h4 style="color: #2563eb; font-size: 0.95rem; margin-bottom: 6px;">Binding Confirmation Summary</h4>
            <p style="font-size: 0.8rem; color: var(--text-secondary);">By clicking <strong>Submit Quote</strong>, this quotation will be registered in the work list and routed to the assigned owner. A notification will be dispatched to the agent intermediation pool.</p>
          </div>
        `;
        break;
    }

    formBox.innerHTML = formHTML;

    // Append Navigation buttons
    const navDiv = document.createElement('div');
    navDiv.className = 'wizard-buttons';
    navDiv.innerHTML = `
      <button class="btn btn-secondary" onclick="app.prevStep()" ${stepIndex === 0 ? 'disabled' : ''}>Previous</button>
      <button class="btn btn-primary" onclick="app.nextStep()">${isLastStep ? 'Submit Quote' : 'Next'}</button>
    `;
    formBox.appendChild(navDiv);

    // Call inner view-specific callbacks
    if (stepIndex === 7) {
      this.populateDraftScoringExplanations();
    } else if (stepIndex === 8) {
      this.populateDraftReferralRouting();
    } else if (stepIndex === 9) {
      this.populateDraftReinsuranceScan();
    }

    this.initCustomDropdowns();
    lucide.createIcons();
  },

  updateProductSelect(lobVal) {
    const select = document.getElementById('ws-product');
    if (!select) return;
    select.innerHTML = '';
    if (lobVal === 'Property') {
      select.innerHTML = `
        <option value="Commercial Property Policy">Commercial Property Policy</option>
        <option value="Commercial Combined Cover">Commercial Combined Cover</option>
      `;
    } else if (lobVal === 'Liability') {
      select.innerHTML = `
        <option value="General Liability Policy">General Liability Policy</option>
        <option value="Professional Indemnity Cover">Professional Indemnity Cover</option>
      `;
    } else if (lobVal === 'Cargo') {
      select.innerHTML = `
        <option value="Marine Cargo & Transit">Marine Cargo & Transit</option>
        <option value="Air Freight Fleet Insurance">Air Freight Fleet Insurance</option>
      `;
    }
    
    this.initCustomDropdowns();
  },

  nextStep() {
    this.saveCurrentStepData();

    if (appState.currentStep < stepperSteps.length - 1) {
      appState.currentStep++;
      this.initQuotationStepper();
    } else {
      this.submitWizardQuote();
    }
  },

  prevStep() {
    this.saveCurrentStepData();
    if (appState.currentStep > 0) {
      appState.currentStep--;
      this.initQuotationStepper();
    }
  },

  saveCurrentStepData() {
    const step = appState.currentStep;
    if (step === 0) {
      quoteWizardData.customerName = document.getElementById('ws-cust-name').value || 'Unregistered Client';
      quoteWizardData.lob = document.getElementById('ws-lob').value;
      quoteWizardData.product = document.getElementById('ws-product').value;
    } else if (step === 1) {
      quoteWizardData.latitude = parseFloat(document.getElementById('ws-lat').value) || 53.4808;
      quoteWizardData.longitude = parseFloat(document.getElementById('ws-lng').value) || -2.2426;
    } else if (step === 2) {
      quoteWizardData.occupancy = document.getElementById('ws-occupancy').value;
    } else if (step === 3) {
      quoteWizardData.sumInsured = parseInt(document.getElementById('ws-sum-insured').value) || 1000000;
      quoteWizardData.premiumEstimate = parseInt(document.getElementById('ws-premium').value) || 12000;
    } else if (step === 5) {
      quoteWizardData.claims = parseInt(document.getElementById('ws-claims').value) || 0;
      quoteWizardData.claimsDetails = document.getElementById('ws-claims-details').value;
    }
  },

  calculateDraftRiskScore() {
    let score = 100;
    quoteWizardData.triggers = [];

    // 1. Claims impact
    const claims = quoteWizardData.claims;
    if (claims > 0) {
      const deduction = claims * 15;
      score -= deduction;
      quoteWizardData.triggers.push(`Prior Claims: Deducted ${deduction} points due to ${claims} claim(s) in last 3Y.`);
    }

    // 2. Occupancy hazard impact
    const occupancy = quoteWizardData.occupancy;
    if (occupancy === 'Chemical Processing & Storage') {
      score -= 30;
      quoteWizardData.triggers.push('Hazardous Trade: Deducted 30 points for high-hazard chemical processing operations.');
    } else if (occupancy === 'Hospitality & Leisure') {
      score -= 10;
      quoteWizardData.triggers.push('Public Access Risk: Deducted 10 points for hospitality operations.');
    }

    // 3. Accumulation threat simulation
    const lat = quoteWizardData.latitude;
    const lng = quoteWizardData.longitude;
    const distToHotzone = Math.sqrt(Math.pow(lat - 53.4682, 2) + Math.pow(lng - (-2.2592), 2)) * 111; // Approx km
    if (distToHotzone < 3) {
      score -= 15;
      quoteWizardData.triggers.push(`High Hazard Accumulation: Deducted 15 points for proximity to Manchester chemical port zone (${distToHotzone.toFixed(1)} km).`);
    }

    quoteWizardData.riskScore = Math.max(10, Math.min(100, score));

    if (quoteWizardData.riskScore >= appState.adminRules.scorePreferred) {
      quoteWizardData.riskCategory = 'Preferred';
    } else if (quoteWizardData.riskScore < appState.adminRules.scoreDeferred) {
      quoteWizardData.riskCategory = 'Deferred';
    } else {
      quoteWizardData.riskCategory = 'Referred';
    }
  },

  populateDraftScoringExplanations() {
    const list = document.getElementById('ws-rules-list');
    list.innerHTML = '';
    
    if (quoteWizardData.triggers.length === 0) {
      list.innerHTML = `<li><span class="badge badge-preferred" style="padding: 2px 6px; margin-right: 8px;">✓</span> No negative risk flags detected. Account meets Preferred Risk standards.</li>`;
    } else {
      quoteWizardData.triggers.forEach(t => {
        list.innerHTML += `<li><span class="badge badge-referred" style="padding: 2px 6px; margin-right: 8px;">!</span> ${t}</li>`;
      });
    }
  },

  populateDraftReferralRouting() {
    const roleEl = document.getElementById('ws-assignee-role');
    const reasonEl = document.getElementById('ws-routing-reason');

    const si = quoteWizardData.sumInsured;
    let target = 'junior_underwriter';

    if (si > appState.authorityLimits.senior_underwriter.limit) {
      target = 'underwriting_manager';
    } else if (si > appState.authorityLimits.underwriter.limit) {
      target = 'senior_underwriter';
    } else if (si > appState.authorityLimits.junior_underwriter.limit) {
      target = 'underwriter';
    }

    if (quoteWizardData.riskCategory === 'Deferred') {
      target = 'underwriting_manager';
    }

    const limits = appState.authorityLimits[target];
    roleEl.textContent = `${limits.name} (${target.toUpperCase().replace('_', ' ')})`;
    
    if (quoteWizardData.riskCategory === 'Deferred') {
      reasonEl.textContent = `Auto-escalation to Manager: Risk falls within DEFERRED status (Score: ${quoteWizardData.riskScore}).`;
    } else {
      reasonEl.textContent = `Routed based on Sum Insured ${formatINR(si)} (Authority Limit: ${formatINR(limits.limit)}).`;
    }
  },

  populateDraftReinsuranceScan() {
    const statusEl = document.getElementById('ws-re-status');
    const placementEl = document.getElementById('ws-re-placement');

    const si = quoteWizardData.sumInsured;
    if (si <= appState.adminRules.netRetention) {
      statusEl.textContent = 'Within Company Net Retention';
      placementEl.textContent = 'No Reinsurance required.';
    } else if (si <= appState.adminRules.netRetention + appState.adminRules.treatyCapacity) {
      statusEl.textContent = 'Treaty reinsurance capacity active';
      placementEl.textContent = `Treaty Reinsurance covers ${formatINR(si - appState.adminRules.netRetention)} surplus.`;
    } else {
      statusEl.textContent = 'Exceeds Treaty capacity';
      placementEl.textContent = `Facultative placement required for ${formatINR(si - (appState.adminRules.netRetention + appState.adminRules.treatyCapacity))} limit.`;
    }
  },

  submitWizardQuote() {
    const quoteNo = `QT2024${String(appState.quotations.length + 1).padStart(3, '0')}`;
    
    const si = quoteWizardData.sumInsured;
    let assignedRole = 'underwriter';
    if (si > 5000000) assignedRole = 'underwriting_manager';
    else if (si > 2500000) assignedRole = 'senior_underwriter';

    if (quoteWizardData.riskCategory === 'Deferred') {
      assignedRole = 'underwriting_manager';
    }

    const newQuote = {
      quoteNo: quoteNo,
      customerName: quoteWizardData.customerName,
      lob: quoteWizardData.lob,
      product: quoteWizardData.product,
      sumInsured: quoteWizardData.sumInsured,
      premiumEstimate: quoteWizardData.premiumEstimate,
      occupancy: quoteWizardData.occupancy === 'Office' ? 'General Commercial Office' : quoteWizardData.occupancy,
      latitude: quoteWizardData.latitude,
      longitude: quoteWizardData.longitude,
      claims: quoteWizardData.claims,
      claimsDetails: quoteWizardData.claimsDetails || 'None reported.',
      riskScore: quoteWizardData.riskScore,
      riskCategory: quoteWizardData.riskCategory,
      slaHours: 24,
      owner: 'David Wright',
      assignedRole: assignedRole,
      status: quoteWizardData.riskCategory === 'Deferred' ? 'Deferred' : 'Underwriting Review',
      documents: [
        { name: 'Property Survey Report', uploaded: true, type: 'pdf' }
      ],
      remarks: [
        { date: '2026-06-24 16:30', user: 'Operations Admin', role: 'operations', note: 'Created new quotation via guided stepper.' }
      ],
      chatHistory: [],
      timeline: [
        { label: 'Quote Created', date: '2026-06-24 16:30', user: 'Operations Admin', status: 'completed' },
        { label: 'Risk Assessment Executed', date: '2026-06-24 16:35', user: 'System Engine', status: 'completed' },
        { label: 'Underwriting Review', date: 'In Progress', user: 'David Wright', status: 'active' }
      ]
    };

    appState.quotations.unshift(newQuote);

    // Audit logs entry
    appState.auditLogs.unshift({
      timestamp: '2026-06-24 16:30:00',
      quoteNo: quoteNo,
      user: 'Operations Admin',
      role: 'Operations',
      action: 'Created Quotation',
      transition: 'Draft -> Underwriting Review',
      remarks: `Submitted new quote for ${newQuote.customerName}. Sum Insured: ${formatINR(newQuote.sumInsured)}.`
    });

    appState.notifications.unshift({
      id: Date.now(),
      title: 'Quotation Created',
      desc: `${newQuote.quoteNo} submitted for ${newQuote.customerName}. Score: ${newQuote.riskScore}`,
      time: 'Just now',
      unread: true
    });

    // Reset wizard
    quoteWizardData = {
      customerName: '',
      lob: 'Property',
      product: 'Commercial Property Policy',
      sumInsured: 1000000,
      premiumEstimate: 12000,
      occupancy: 'Office',
      latitude: 53.4808,
      longitude: -2.2426,
      claims: 0,
      claimsDetails: '',
      riskScore: 100,
      riskCategory: 'Preferred',
      documents: [],
      triggers: []
    };

    this.openModal(
      'Quotation Submitted Successfully',
      `<p>Quotation <strong>${quoteNo}</strong> has been registered and routed to the <strong>${assignedRole.toUpperCase().replace('_', ' ')}</strong> work queue.</p>`,
      `<button class="btn btn-primary" onclick="app.closeModal(); app.switchView('dashboard-view');">Return to Dashboard</button>`
    );

    this.renderDashboardMetrics();
    this.renderDashboardTable();
    this.renderNotifications();
    this.renderAuditTrail();
    this.drawAccumulationMap();
  },

  // Detailed Quote Review screen rendering — ENHANCED
  renderQuotationDetailReview(quoteNo) {
    const q = appState.quotations.find(item => item.quoteNo === quoteNo);
    if (!q) return;

    const isReturning = q.caseType === 'returning';

    document.getElementById('detail-quote-number-breadcrumb').textContent = q.quoteNo;
    document.getElementById('detail-quote-title').textContent = `${isReturning ? '↩ Returning' : '✦ Fresh'} Case: ${q.customerName}`;

    // ── Case Type Banner ──────────────────────────────────────────────────
    const caseTypeBannerEl = document.getElementById('detail-case-type-banner');
    if (caseTypeBannerEl) {
      const bannerColor = isReturning ? '#7c3aed' : '#2563eb';
      const bannerBg    = isReturning ? '#ede9fe' : '#dbeafe';
      caseTypeBannerEl.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 16px;background:${bannerBg};border-radius:var(--radius-md);border-left:4px solid ${bannerColor};margin-bottom:16px;">
          <i data-lucide="${isReturning ? 'refresh-cw' : 'file-plus'}" style="width:18px;height:18px;color:${bannerColor};flex-shrink:0;"></i>
          <div>
            <div style="font-weight:700;font-size:0.85rem;color:${bannerColor};">${isReturning ? 'Returning Case' : 'Fresh Case'}</div>
            <div style="font-size:0.72rem;color:${bannerColor}aa;">${isReturning ? 'Focus on what changed, what worsened and what requires fresh approval.' : 'Complete the risk profile and validate exposure before quote release.'}</div>
          </div>
          ${isReturning && q.previousPolicy ? `<div style="margin-left:auto;text-align:right;font-size:0.72rem;"><div style="font-weight:600;color:${bannerColor};">Previous Policy</div><div style="color:${bannerColor}aa;">${q.previousPolicy.policyNo} · Expiry ${q.previousPolicy.expiryDate}</div></div>` : ''}
        </div>
      `;
    }

    // ── Dynamic Workflow Stepper (PDF §9 exact labels) ───────────────────
    const stepperEl = document.getElementById('detail-workflow-stepper');
    if (stepperEl) {
      // PDF §4: Fresh stepper: Submitted → Documents Pending → Risk Scored → Underwriter Assigned → Capacity Checked → Reinsurance Reviewed → Approved / Deferred / Issued
      // PDF §3: Returning stepper: Case Retrieved → Changes Identified → Risk Revalidated → Underwriter Review → Capacity Rechecked → Terms Revised → Approved / Released
      const freshSteps  = ['Submitted', 'Docs Pending', 'Risk Scored', 'UW Assigned', 'Capacity Checked', 'RI Reviewed', 'Approved / Issued'];
      const returnSteps = ['Case Retrieved', 'Changes ID\'d', 'Risk Revalidated', 'UW Review', 'Capacity Rechecked', 'Terms Revised', 'Approved / Released'];
      const steps = isReturning ? returnSteps : freshSteps;
      const activeStep = q.timeline ? q.timeline.filter(t => t.status === 'completed').length : 0;
      const clampStep = Math.min(activeStep, steps.length - 1);
      const stepperTitle = isReturning
        ? `<div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:10px;font-weight:600;"><i data-lucide="refresh-cw" style="width:11px;height:11px;vertical-align:middle;"></i> Returning Case Journey — Step ${clampStep + 1} of ${steps.length}</div>`
        : `<div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:10px;font-weight:600;"><i data-lucide="file-plus" style="width:11px;height:11px;vertical-align:middle;"></i> Fresh Case Journey — Step ${clampStep + 1} of ${steps.length}</div>`;
      stepperEl.innerHTML = stepperTitle + `
        <div class="detail-stepper">
          ${steps.map((s, i) => `
            <div class="dstep ${i < clampStep ? 'dstep-done' : i === clampStep ? 'dstep-active' : 'dstep-pending'}">
              <div class="dstep-bubble">${i < clampStep ? '✓' : i + 1}</div>
              <div class="dstep-label">${s}</div>
              ${i < steps.length - 1 ? '<div class="dstep-line"></div>' : ''}
            </div>
          `).join('')}
        </div>
      `;
    }

    // ── Next Best Actions ─────────────────────────────────────────────────
    const nbaEl = document.getElementById('detail-next-best-actions');
    if (nbaEl) nbaEl.innerHTML = this.renderNextBestActions(q);

    // ── UW Routing Ladder ─────────────────────────────────────────────────
    const ladderEl = document.getElementById('detail-uw-ladder');
    if (ladderEl) ladderEl.innerHTML = this.renderUWRoutingLadder(q);

    // ── Core Risk Info ────────────────────────────────────────────────────
    document.getElementById('detail-cust-name').textContent = q.customerName;
    document.getElementById('detail-lob').textContent = q.lob;
    document.getElementById('detail-sum-insured').textContent = formatINR(q.sumInsured);
    document.getElementById('detail-occupancy').textContent = q.occupancy;
    document.getElementById('detail-coords').textContent = `${q.latitude.toFixed(4)}, ${q.longitude.toFixed(4)}`;
    document.getElementById('detail-claims').textContent = `${q.claims} claim(s) — ${q.claimsDetails}`;

    // ── Risk Badge + Reason Code (PDF §5: every badge must show a reason code) ──
    const riskBadge = document.getElementById('detail-risk-badge');
    riskBadge.textContent = `${q.riskCategory} Risk`;
    riskBadge.className = 'badge';
    if (q.riskCategory === 'Preferred') riskBadge.classList.add('badge-preferred');
    else if (q.riskCategory === 'Referred') riskBadge.classList.add('badge-referred');
    else riskBadge.classList.add('badge-deferred');
    // Inject reason code tooltip chip below the badge
    const reasonEl = document.getElementById('detail-risk-reason');
    if (reasonEl) {
      const reason = q.riskCategoryReason || `${q.riskCategory} — Based on TIV, claims history and occupancy classification.`;
      reasonEl.innerHTML = `<div style="font-size:0.7rem;color:var(--text-muted);margin-top:4px;font-style:italic;line-height:1.4;"><i data-lucide="info" style="width:11px;height:11px;vertical-align:middle;margin-right:3px;"></i>${reason}</div>`;
    }

    document.getElementById('detail-risk-score').textContent = q.riskScore;

    // ── Risk Triggers ─────────────────────────────────────────────────────
    const triggersContent = document.getElementById('detail-triggers-content');
    triggersContent.innerHTML = '';
    const rulesList = [];
    if (q.claims > 0) rulesList.push(`Loss history: ${q.claims} claim(s) recorded in prior 3 years.`);
    if (q.occupancy && q.occupancy.toLowerCase().includes('chemical')) rulesList.push('High hazard occupancy: Chemical processing/storage.');
    if (q.sumInsured > 50000000) rulesList.push(`High value TIV: ${formatINR(q.sumInsured)} exceeds standard authority limits.`);
    if (isReturning && q.categoryMovement === 'deteriorated') rulesList.push('Category movement: Risk deteriorated from previous policy assessment.');

    if (rulesList.length === 0) {
      triggersContent.innerHTML = `<div style="background:var(--risk-preferred-bg);color:var(--risk-preferred-text);padding:10px 14px;border-radius:var(--radius-md);font-size:0.8rem;"><i data-lucide="check-circle" style="vertical-align:middle;margin-right:6px;width:14px;height:14px;"></i>No negative risk flags. Account meets all standard filters.</div>`;
    } else {
      triggersContent.innerHTML = `<ul style="font-size:0.8rem;color:var(--text-secondary);display:flex;flex-direction:column;gap:6px;padding-left:16px;">${rulesList.map(r => `<li>${r}</li>`).join('')}</ul>`;
    }

    // ── Capacity Gauge (replaces legacy reinsurance flow) ─────────────────
    const capGaugeEl = document.getElementById('detail-capacity-gauge');
    if (capGaugeEl) capGaugeEl.innerHTML = this.renderCapacityGauge(q);

    // Legacy reinsurance badge fallback
    const reBadge = document.getElementById('detail-reinsurance-badge');
    if (reBadge) {
      const si = q.sumInsured, ret = appState.adminRules.netRetention, tr = appState.adminRules.treatyCapacity;
      reBadge.textContent = si <= ret ? 'Retention Met' : si <= ret + tr ? 'Treaty Applicable' : 'Facultative Required';
      reBadge.className = `badge ${si <= ret ? 'badge-preferred' : si <= ret + tr ? 'badge-referred' : 'badge-deferred'}`;
      const reqReText = document.getElementById('detail-required-re');
      if (reqReText) reqReText.textContent = si > ret ? formatINR(si - ret) : 'None';
      const placeSugg = document.getElementById('detail-placement-sugg');
      if (placeSugg) placeSugg.textContent = si > ret + tr ? 'Requires facultative placement.' : si > ret ? 'Auto-allocated to Treaty Agreement.' : 'Full retention — no reinsurance needed.';
      const riFlowBox = document.getElementById('detail-ri-flow');
      if (riFlowBox) riFlowBox.style.display = 'none';
    }

    // ── Documents ─────────────────────────────────────────────────────────
    const docChecklist = document.getElementById('detail-docs-checklist');
    docChecklist.innerHTML = '';
    q.documents.forEach(d => {
      const isMandatory = d.mandatory !== false;
      docChecklist.innerHTML += `
        <div style="display:flex;align-items:center;justify-content:space-between;font-size:0.8rem;padding:6px 8px;background:var(--bg-app);border-radius:var(--radius-sm);margin-bottom:4px;">
          <span><i data-lucide="file" style="width:12px;height:12px;vertical-align:middle;margin-right:6px;color:var(--text-muted);"></i>${d.name}</span>
          <span style="display:flex;align-items:center;gap:6px;">
            <span style="font-size:0.65rem;padding:1px 5px;border-radius:3px;font-weight:700;${isMandatory ? 'background:#fee2e2;color:#dc2626;' : 'background:#f1f5f9;color:#64748b;'}">${isMandatory ? 'Required' : 'Optional'}</span>
            ${d.uploaded ? `<span style="color:var(--risk-preferred-text);font-weight:600;">✓ Uploaded</span>` : `<button class="btn btn-secondary btn-sm" style="padding:2px 8px;font-size:0.65rem;" onclick="app.simulateDocUpload('${q.quoteNo}', '${d.name}')">Upload</button>`}
          </span>
        </div>
      `;
    });

    // ── Actions Panel ─────────────────────────────────────────────────────
    const btnBox = document.getElementById('detail-action-buttons-box');
    const role = appState.currentRole;
    btnBox.innerHTML = '';

    if (role === 'agent') {
      document.getElementById('detail-decision-actions-panel').style.display = 'none';
    } else {
      document.getElementById('detail-decision-actions-panel').style.display = 'block';
      let hasAuthority = false;
      if (role === 'admin' || role === 'reinsurance_manager' || role === 'underwriting_manager') hasAuthority = true;
      else if (role === 'senior_underwriter' && q.sumInsured <= 50000000) hasAuthority = true;
      else if (role === 'underwriter' && q.sumInsured <= 10000000) hasAuthority = true;

      const approveLabel = isReturning ? 'Approve Renewal' : 'Approve & Issue';
      if (hasAuthority) {
        btnBox.innerHTML = `
          <button class="btn btn-success" onclick="app.executeDecision('Approve')"><i data-lucide="check"></i> ${approveLabel}</button>
          <button class="btn btn-warning" onclick="app.executeDecision('Refer')"><i data-lucide="share-2"></i> Refer up Hierarchy</button>
          <button class="btn btn-danger" onclick="app.executeDecision('Decline')"><i data-lucide="x"></i> Decline Risk</button>
          <button class="btn btn-secondary" onclick="app.executeDecision('Defer')"><i data-lucide="clock"></i> Defer Decision</button>
        `;
      } else {
        btnBox.innerHTML = `
          <div style="background:var(--risk-referred-bg);color:var(--risk-referred-text);padding:8px 12px;border-radius:var(--radius-sm);font-size:0.78rem;font-weight:500;margin-bottom:8px;border-left:3px solid var(--risk-referred);">
            <i data-lucide="info" style="width:12px;height:12px;vertical-align:middle;"></i> TIV exceeds your authority limit — referral required.
          </div>
          <button class="btn btn-warning" onclick="app.executeDecision('Refer')"><i data-lucide="share-2"></i> Refer up Hierarchy</button>
          <button class="btn btn-secondary" onclick="app.executeDecision('Defer')"><i data-lucide="clock"></i> Defer Decision</button>
        `;
      }
    }

    this.renderChatHistory(q);
    this.renderTimelineTracker(q);

    // ── SLA Timer ─────────────────────────────────────────────────────────
    const timerText = document.getElementById('detail-sla-timer-text');
    const escalationTarget = document.getElementById('detail-sla-escalation-target');
    const requiredRoleName = q.sumInsured > 50000000 ? 'UW Manager' : q.sumInsured > 10000000 ? 'Senior UW' : 'Underwriter';
    if (q.slaHours === 0) {
      timerText.textContent = 'RESOLVED';
      timerText.style.color = 'var(--risk-preferred)';
      escalationTarget.textContent = 'Workflow complete.';
    } else {
      timerText.textContent = `${q.slaHours}h 00m`;
      timerText.style.color = q.slaHours <= 12 ? 'var(--risk-deferred)' : 'var(--primary)';
      escalationTarget.textContent = q.slaHours <= 12 ? 'Escalating immediately to Manager' : `Next escalation: ${requiredRoleName}`;
    }

    // ── Alert Banner ──────────────────────────────────────────────────────
    const banner = document.getElementById('detail-alert-banner');
    banner.style.display = 'none';
    if (q.riskCategory === 'Deferred') {
      banner.style.display = 'block';
      banner.innerHTML = `<div style="background:var(--risk-deferred-bg);border:1px solid var(--risk-deferred);color:var(--risk-deferred-text);padding:10px 16px;border-radius:var(--radius-md);font-size:0.8rem;font-weight:500;display:flex;align-items:center;gap:8px;margin-bottom:12px;"><i data-lucide="alert-octagon"></i><strong>Critical:</strong> DEFERRED — cannot proceed until blockers are resolved.</div>`;
    } else if (isReturning && q.categoryMovement === 'deteriorated') {
      banner.style.display = 'block';
      banner.innerHTML = `<div style="background:#fef3c7;border:1px solid #d97706;color:#92400e;padding:10px 16px;border-radius:var(--radius-md);font-size:0.8rem;font-weight:500;display:flex;align-items:center;gap:8px;margin-bottom:12px;"><i data-lucide="alert-triangle"></i><strong>Category Deteriorated:</strong> ${q.categoryMovementReason}</div>`;
    }

    // ── AI Underwriting Assist ─────────────────────────────────────────────
    const aiSummaryEl = document.getElementById('detail-ai-summary');
    if (aiSummaryEl) {
      let aiSummaryText = `AI analysis shows that **${q.customerName}** is located in **${q.city}**, operating as **${q.occupancy}**. `;
      if (q.riskCategory === 'Preferred') {
        aiSummaryText += `The risk score of **${q.riskScore}/100** indicates highly satisfactory underwriting attributes. Fire and loss mitigation compliance is fully verified. Recommend binding at standard terms.`;
      } else if (q.riskCategory === 'Referred') {
        aiSummaryText += `The risk score is **${q.riskScore}/100**. Referral triggered due to TIV exceeding junior limits or prior claims. Recommend applying a **5% to 10% premium loading** and verifying reinsurer retention allocation before binding.`;
      } else {
        aiSummaryText += `The risk score of **${q.riskScore}/100** represents elevated hazard triggers. High claim frequency or critical accumulation zone detected. Deferral or severe loading suggested.`;
      }
      aiSummaryEl.innerHTML = `<p>${aiSummaryText}</p>`;
    }

    const aiOcrEl = document.getElementById('detail-ai-ocr-list');
    if (aiOcrEl) {
      aiOcrEl.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:4px; padding:2px 0; border-bottom:1px solid rgba(0,0,0,0.03);">
          <span>Business License ID:</span><span style="font-weight:600; color:#059669;">✓ Verified</span>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:4px; padding:2px 0; border-bottom:1px solid rgba(0,0,0,0.03);">
          <span>TIV Match in PDF:</span><span style="font-weight:600; color:#059669;">✓ Verified</span>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:4px; padding:2px 0; border-bottom:1px solid rgba(0,0,0,0.03);">
          <span>Geospatial Risk Match:</span><span style="font-weight:600; color:#059669;">✓ Verified</span>
        </div>
        <div style="display:flex; justify-content:space-between; padding:2px 0;">
          <span>Prior Loss Cert:</span><span style="font-weight:600; color:#059669;">✓ Verified</span>
        </div>
      `;
    }

    const aiPromptsEl = document.getElementById('detail-ai-prompts');
    if (aiPromptsEl) {
      aiPromptsEl.innerHTML = `
        <button class="btn btn-secondary btn-xs" style="font-size:0.68rem; padding:4px 8px;" onclick="app.generateAIAction('Reinsurance')">Draft RI Inquiry</button>
        <button class="btn btn-secondary btn-xs" style="font-size:0.68rem; padding:4px 8px;" onclick="app.generateAIAction('Loading')">Suggest Loadings</button>
        <button class="btn btn-secondary btn-xs" style="font-size:0.68rem; padding:4px 8px;" onclick="app.generateAIAction('Risk Memo')">Generate Risk Memo</button>
      `;
    }

    // ── Claims & Loss History Integration ──────────────────────────────────
    const lossRatioBadge = document.getElementById('detail-loss-ratio-badge');
    const claimsDesc = document.getElementById('detail-claims-summary-desc');
    const claimsTbody = document.getElementById('detail-claims-tbody');

    if (lossRatioBadge && claimsDesc && claimsTbody) {
      let ratio;
      let claimsListHtml;
      let descText;

      if (q.claims === 0) {
        ratio = 0;
        descText = 'Clean record — no prior losses registered.';
        claimsListHtml = `<tr><td colspan="4" style="text-align:center; padding:12px; color:var(--text-muted);">No prior claims in database</td></tr>`;
        lossRatioBadge.className = 'badge badge-approved';
      } else {
        ratio = q.claims === 1 ? 24.5 : q.claims === 2 ? 48.2 : 78.4;
        lossRatioBadge.className = ratio > 50 ? 'badge badge-deferred' : 'badge badge-referred';
        descText = `${q.claims} prior loss event(s) recorded. Severity level is ${ratio > 50 ? 'High' : 'Moderate'}.`;

        // Generate claims rows
        const lossDates = ['2023-04-12', '2022-11-05', '2021-06-15'];
        const causes = [
          q.lob === 'Property' ? 'Minor water leakage' : 'Slip & fall bodily injury',
          'Warehouse storm damage',
          'Machinery breakdown'
        ];
        const amounts = [120000, 450000, 950000];
        
        claimsListHtml = '';
        for (let i = 0; i < q.claims; i++) {
          claimsListHtml += `
            <tr style="border-bottom:1px solid rgba(0,0,0,0.03);">
              <td style="padding:6px 4px;">${lossDates[i] || '2024-01-10'}</td>
              <td style="padding:6px 4px; font-weight:500; color:var(--text-primary);">${causes[i] || 'Operational incident'}</td>
              <td style="padding:6px 4px;">${formatINR(amounts[i] || 50000)}</td>
              <td style="padding:6px 4px;"><span class="badge" style="background:#d1fae5; color:#059669; padding:2px 6px;">Settled</span></td>
            </tr>
          `;
        }
      }

      lossRatioBadge.textContent = `Loss Ratio: ${ratio}%`;
      claimsDesc.innerHTML = `<span>${descText}</span>`;
      claimsTbody.innerHTML = claimsListHtml;
    }

    // ── Inspection & Risk Engineering ─────────────────────────────────────
    const surveyStatusBadge = document.getElementById('detail-survey-status-badge');
    const surveyRecs = document.getElementById('detail-survey-recs');
    const surveyCompliance = document.getElementById('detail-survey-compliance');

    if (surveyStatusBadge && surveyRecs && surveyCompliance) {
      const recs = q.lob === 'Property'
        ? ['Upgrade warehouse fire sprinkler system valves to high-pressure specs.', 'Inspect perimeter flood defenses annually before monsoon season.']
        : ['Verify employee safety certificate logs weekly.', 'Install non-slip grating on high-elevation catwalks.'];
      
      surveyStatusBadge.textContent = 'Survey Completed';
      surveyStatusBadge.className = 'badge badge-approved';

      surveyRecs.innerHTML = recs.map(r => `<li style="margin-bottom:6px;">${r}</li>`).join('');

      surveyCompliance.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:4px; color:var(--text-primary);">
          <span>Sprinkler Valving:</span><span style="font-weight:700; color:#059669;">✓ COMPLIANT</span>
        </div>
        <div style="display:flex; justify-content:space-between; color:var(--text-primary);">
          <span>Flood Defenses:</span><span style="font-weight:700; color:#d97706;">▲ PENDING REVIEW</span>
        </div>
      `;
    }

    // ── Document Generation & e-Sign ──────────────────────────────────────
    q.esignStatus = q.esignStatus || { uw: 'Awaiting Generation', broker: 'Awaiting Generation', triggered: false };
    
    const esignBadge = document.getElementById('detail-esign-badge');
    const esignUw = document.getElementById('esign-status-uw');
    const esignBroker = document.getElementById('esign-status-broker');
    const btnESign = document.getElementById('btn-trigger-esign');

    if (esignBadge && esignUw && esignBroker && btnESign) {
      esignUw.textContent = q.esignStatus.uw;
      esignBroker.textContent = q.esignStatus.broker;
      
      if (q.esignStatus.uw === 'Signed' && q.esignStatus.broker === 'e-Signed') {
        esignBadge.textContent = 'Completed';
        esignBadge.className = 'badge badge-approved';
        btnESign.disabled = true;
      } else if (q.esignStatus.uw === 'Generated & Signed') {
        esignBadge.textContent = 'Awaiting Broker Signature';
        esignBadge.className = 'badge badge-referred';
        esignUw.style.color = '#059669';
        esignUw.innerHTML = '✓ Generated & Signed';
        btnESign.disabled = false;
      } else {
        esignBadge.textContent = 'Awaiting Generation';
        esignBadge.className = 'badge';
        btnESign.disabled = true;
      }
    }

    // ── Bottom Intelligence Panel ─────────────────────────────────────────
    const bottomEl = document.getElementById('detail-bottom-intelligence');
    if (bottomEl) {
      if (isReturning) {
        bottomEl.innerHTML = `
          <div class="panel-card" style="margin-top:20px;">
            <div class="panel-card-title" style="border-bottom:1px solid var(--border-color);padding-bottom:12px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;">
              <span><i data-lucide="git-diff" style="width:15px;height:15px;vertical-align:middle;margin-right:8px;"></i>Previous vs Current — What Changed?</span>
              <span class="badge badge-referred" style="font-size:0.7rem;">${q.changeDetection?.length || 0} changes detected</span>
            </div>
            ${this.renderReturningCaseComparison(q)}
          </div>
        `;
      } else {
        bottomEl.innerHTML = `
          <div class="panel-card" style="margin-top:20px;">
            <div class="panel-card-title" style="border-bottom:1px solid var(--border-color);padding-bottom:12px;margin-bottom:16px;">
              <span><i data-lucide="clipboard-list" style="width:15px;height:15px;vertical-align:middle;margin-right:8px;"></i>Fresh Case — Intake Completeness Checklist</span>
            </div>
            ${this.renderFreshCaseMissingInfo(q)}
          </div>
        `;
      }
    }

    lucide.createIcons();
  },


  renderChatHistory(q) {
    const chatHistoryBox = document.getElementById('detail-chat-history');
    chatHistoryBox.innerHTML = '';

    if (q.chatHistory.length === 0) {
      chatHistoryBox.innerHTML = `<p style="text-align: center; color: var(--text-muted); font-size: 0.78rem; padding: 24px;">No messages sent. Start communication with the agent.</p>`;
      return;
    }

    q.chatHistory.forEach(msg => {
      const bubble = document.createElement('div');
      const isSent = msg.sender === 'underwriter';
      bubble.className = `chat-bubble ${isSent ? 'sent' : 'received'}`;
      bubble.innerHTML = `
        ${msg.text}
        <span class="chat-bubble-meta">${msg.sender.toUpperCase()} - ${msg.time}</span>
      `;
      chatHistoryBox.appendChild(bubble);
    });

    chatHistoryBox.scrollTop = chatHistoryBox.scrollHeight;
  },

  sendChatFromDetail() {
    const input = document.getElementById('detail-chat-input');
    const val = input.value.trim();
    if (!val) return;

    const q = appState.quotations.find(item => item.quoteNo === appState.selectedQuoteNo);
    if (!q) return;

    q.chatHistory.push({
      sender: 'underwriter',
      text: val,
      time: '2026-06-24 16:45'
    });

    input.value = '';
    this.renderChatHistory(q);

    // Simulate Agent Auto-response
    setTimeout(() => {
      q.chatHistory.push({
        sender: 'agent',
        text: 'Received your request. Checking with the client representative and will upload files shortly.',
        time: '2026-06-24 16:46'
      });
      this.renderChatHistory(q);
      this.renderNotifications();
      lucide.createIcons();
    }, 2000);
  },

  simulateDocUpload(quoteNo, docName) {
    const q = appState.quotations.find(item => item.quoteNo === quoteNo);
    if (!q) return;
    const doc = q.documents.find(d => d.name === docName);
    if (doc) doc.uploaded = true;

    appState.auditLogs.unshift({
      timestamp: '2026-06-24 16:45:00',
      quoteNo: quoteNo,
      user: 'Agent Intermediary',
      role: 'Agent',
      action: 'Upload document',
      transition: 'Active',
      remarks: `Uploaded requested document: ${docName}.`
    });

    this.renderQuotationDetailReview(quoteNo);
    this.renderAuditTrail();
  },

  renderTimelineTracker(q) {
    const timelineBox = document.getElementById('detail-progress-timeline');
    timelineBox.innerHTML = '';

    q.timeline.forEach(step => {
      const isCompleted = step.status === 'completed';
      const isActive = step.status === 'active';
      const isBreached = step.status === 'breached';

      const li = document.createElement('li');
      li.className = `timeline-event ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''} ${isBreached ? 'breached' : ''}`;
      
      li.innerHTML = `
        <div class="timeline-dot"></div>
        <div class="timeline-meta">${step.date} • ${step.user}</div>
        <div class="timeline-event-title">${step.label}</div>
      `;
      timelineBox.appendChild(li);
    });
  },

  executeDecision(decisionType) {
    const q = appState.quotations.find(item => item.quoteNo === appState.selectedQuoteNo);
    if (!q) return;

    const remarksVal = document.getElementById('detail-remarks-input').value || 'Processed decision.';
    const loadingVal = document.getElementById('detail-loading-input').value || '0';

    let nextStatus = '';
    let role = appState.currentRole;

    if (decisionType === 'Approve') {
      const activeLimitConfig = appState.authorityLimits[role] || { limit: 10000000 };
      if (q.sumInsured > activeLimitConfig.limit) {
        this.showToast(`Maker-Checker: Sum Insured (${formatINR(q.sumInsured)}) exceeds your authority limit (${formatINR(activeLimitConfig.limit)}). You must Refer up.`);
        return;
      }
      nextStatus = 'Quote Issued';
      q.slaHours = 0;
    } else if (decisionType === 'Decline') {
      nextStatus = 'Declined';
      q.slaHours = 0;
    } else if (decisionType === 'Defer') {
      nextStatus = 'Deferred';
    } else if (decisionType === 'Refer') {
      if (role === 'underwriter') {
        q.assignedRole = 'senior_underwriter';
        nextStatus = 'Senior Approval Pending';
      } else if (role === 'senior_underwriter') {
        q.assignedRole = 'underwriting_manager';
        nextStatus = 'Manager Referral Pending';
      } else {
        q.assignedRole = 'reinsurance_manager';
        nextStatus = 'Reinsurance Review';
      }
    }

    q.status = nextStatus;
    
    const activePersona = appState.personas.find(p => p.key === role) || { name: 'Underwriter' };
    const activeUserName = activePersona.name;

    q.remarks.unshift({
      date: '2026-06-24 16:50',
      user: activeUserName,
      role: role,
      note: `${decisionType} decision logged. Loading: ${loadingVal}%. Note: ${remarksVal}`
    });

    q.timeline.unshift({
      label: `Underwriter Decision: ${decisionType}`,
      date: '2026-06-24 16:50',
      user: activeUserName,
      status: 'completed'
    });

    appState.auditLogs.unshift({
      timestamp: '2026-06-24 16:50:00',
      quoteNo: q.quoteNo,
      user: activeUserName,
      role: role,
      action: `Decision - ${decisionType}`,
      transition: `${q.status} -> ${nextStatus}`,
      remarks: remarksVal
    });

    document.getElementById('detail-remarks-input').value = '';

    this.openModal(
      'Decision Saved',
      `<p>Quotation <strong>${q.quoteNo}</strong> status updated to: <strong>${nextStatus}</strong>.</p>`,
      `<button class="btn btn-primary" onclick="app.closeModal(); app.switchView('work-queue-view');">Return to Queue</button>`
    );

    this.renderDashboardMetrics();
    this.renderDashboardTable();
    this.renderWorkQueueTable();
    this.renderAuditTrail();
  },

  // Interactive geospatial canvas map drawer (Refined Dark Theme Look)
  startMapAnimation() {
    this.stopMapAnimation();
    this.mapSweepAngle = this.mapSweepAngle || 0;
    this.mapEventsInitialized = this.mapEventsInitialized || false;
    
    const canvas = document.getElementById('map-canvas');
    if (canvas && !this.mapEventsInitialized) {
      this.initMapEvents(canvas);
    }
    
    const animate = () => {
      this.mapSweepAngle += 0.012;
      if (this.mapSweepAngle > Math.PI * 2) {
        this.mapSweepAngle = 0;
      }
      this.drawAccumulationMap();
      if (appState.activeView === 'risk-map-view') {
        this.mapAnimId = requestAnimationFrame(animate);
      }
    };
    this.mapAnimId = requestAnimationFrame(animate);
  },

  stopMapAnimation() {
    if (this.mapAnimId) {
      cancelAnimationFrame(this.mapAnimId);
      this.mapAnimId = null;
    }
  },

  initMapEvents(canvas) {
    this.mapEventsInitialized = true;
    this.mousePos = { x: null, y: null };
    this.hoveredQuote = null;

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      this.mousePos.x = (e.clientX - rect.left) * scaleX;
      this.mousePos.y = (e.clientY - rect.top) * scaleY;

      const centerLat = 53.4808;
      const centerLng = -2.2426;
      const mapWidth = canvas.width;
      const mapHeight = canvas.height;
      const latToY = (lat) => mapHeight / 2 - (lat - centerLat) * 3500;
      const lngToX = (lng) => mapWidth / 2 + (lng - centerLng) * 5500;

      let found = null;
      appState.quotations.forEach(q => {
        if (q.quoteNo === 'QT2024004' && q.latitude === 51.5074) return; // Skip London
        const px = lngToX(q.longitude);
        const py = latToY(q.latitude);
        const dist = Math.sqrt(Math.pow(this.mousePos.x - px, 2) + Math.pow(this.mousePos.y - py, 2));
        if (dist <= 12) {
          found = q;
        }
      });
      this.hoveredQuote = found;

      if (!this.mapAnimId) {
        this.drawAccumulationMap();
      }
    });

    canvas.addEventListener('mouseleave', () => {
      this.mousePos = { x: null, y: null };
      this.hoveredQuote = null;
      if (!this.mapAnimId) {
        this.drawAccumulationMap();
      }
    });

    canvas.addEventListener('click', () => {
      if (this.hoveredQuote) {
        appState.selectedQuoteNo = this.hoveredQuote.quoteNo;
        if (!this.mapAnimId) {
          this.drawAccumulationMap();
        }
      }
    });
  },

  drawAccumulationMap() {
    const canvas = document.getElementById('map-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const centerLat = 53.4808;
    const centerLng = -2.2426;
    
    const mapWidth = 800;
    const mapHeight = 500;
    
    // Retina DPI scale handling
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${mapWidth}px`;
    canvas.style.height = `${mapHeight}px`;
    if (canvas.width !== mapWidth * dpr || canvas.height !== mapHeight * dpr) {
      canvas.width = mapWidth * dpr;
      canvas.height = mapHeight * dpr;
    }
    
    ctx.resetTransform();
    ctx.scale(dpr, dpr);
    
    // 1. Off-white/light-grey background base
    ctx.fillStyle = '#eceef1';
    ctx.fillRect(0, 0, mapWidth, mapHeight);
    
    // 2. Seeded random generator for reproducible street layout matching the high-density reference image
    let streetSeed = 888;
    const sRandom = () => {
      const x = Math.sin(streetSeed++) * 10000;
      return x - Math.floor(x);
    };

    // 3. Draw pastel green park shapes
    ctx.fillStyle = '#d4efdf';
    
    // Park 1: Left Salford park
    ctx.beginPath();
    ctx.moveTo(80, 200);
    ctx.lineTo(220, 220);
    ctx.lineTo(190, 310);
    ctx.lineTo(90, 280);
    ctx.closePath();
    ctx.fill();

    // Park 2: Right City Centre park next to river
    ctx.beginPath();
    ctx.moveTo(690, 100);
    ctx.lineTo(760, 80);
    ctx.lineTo(800, 190);
    ctx.lineTo(720, 180);
    ctx.closePath();
    ctx.fill();

    // Park 3: Lower Castlefield park
    ctx.beginPath();
    ctx.moveTo(250, 420);
    ctx.lineTo(390, 450);
    ctx.lineTo(330, 500);
    ctx.lineTo(240, 480);
    ctx.closePath();
    ctx.fill();

    // 4. Draw large diagonal sky-blue river and smaller branching stream
    ctx.fillStyle = '#7ec6eb';
    ctx.beginPath();
    ctx.moveTo(520, -20);
    ctx.bezierCurveTo(560, 140, 680, 320, 820, 520);
    ctx.lineTo(960, 520);
    ctx.bezierCurveTo(820, 320, 700, 140, 660, -20);
    ctx.closePath();
    ctx.fill();

    // Secondary streams
    ctx.strokeStyle = '#7ec6eb';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 420);
    ctx.bezierCurveTo(120, 360, 210, 400, 320, 310);
    ctx.bezierCurveTo(400, 240, 480, 270, 590, 230);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 110);
    ctx.bezierCurveTo(80, 90, 110, 50, 20, -10);
    ctx.stroke();

    // 5. Draw high-density street grid
    ctx.strokeStyle = '#dfdfdf'; // Subtle grey secondary streets
    ctx.lineWidth = 1.3;

    // We draw vertical grid paths (streets)
    for (let i = 0; i < 28; i++) {
      const x = 20 + i * 28 + sRandom() * 8;
      for (let j = 0; j < 8; j++) {
        const yStart = j * 70 + sRandom() * 15;
        const yEnd = yStart + 45 + sRandom() * 15;
        
        // Skip parts of vertical streets that overlap the wide river corridor
        if (x > 530 && x < 830 && yStart < 350) continue;
        
        ctx.beginPath();
        ctx.moveTo(x, yStart);
        ctx.lineTo(x, yEnd);
        ctx.stroke();
      }
    }
    // We draw horizontal grid paths (streets)
    for (let i = 0; i < 20; i++) {
      const y = 20 + i * 26 + sRandom() * 8;
      for (let j = 0; j < 8; j++) {
        const xStart = j * 110 + sRandom() * 20;
        const xEnd = xStart + 80 + sRandom() * 20;
        
        // Skip horizontal streets overlapping the wide river corridor
        if (xStart > 530 && xEnd < 880 && y < 350) continue;
        
        ctx.beginPath();
        ctx.moveTo(xStart, y);
        ctx.lineTo(xEnd, y);
        ctx.stroke();
      }
    }

    // 6. Draw primary arterials (Thick Black Highways)
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 5.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Highway 1: Diagonal cross from bottom-left to top-right
    ctx.beginPath();
    ctx.moveTo(0, 310);
    ctx.bezierCurveTo(180, 240, 280, 110, 380, -20);
    ctx.stroke();

    // Highway 2: Loop crossover from top-left to bottom-right
    ctx.beginPath();
    ctx.moveTo(180, -20);
    ctx.bezierCurveTo(320, 110, 480, 220, 820, 520);
    ctx.stroke();

    // Loop structure interchange at intersection (approx center x=250, y=140)
    ctx.lineWidth = 4.5;
    
    // Cloverleaf loop 1
    ctx.beginPath();
    ctx.arc(245, 145, 18, 0, Math.PI * 2);
    ctx.stroke();

    // Cloverleaf loop 2
    ctx.beginPath();
    ctx.arc(225, 160, 15, 0, Math.PI * 2);
    ctx.stroke();

    // Cloverleaf loop 3
    ctx.beginPath();
    ctx.arc(265, 130, 15, 0, Math.PI * 2);
    ctx.stroke();

    // 7. Draw multi-risk Catastrophe flood zone layers (clean translucent overlays)
    // High Hazard (Zone 3)
    const zone3Pts = [[140, 180], [380, 220], [490, 410], [270, 460]];
    ctx.fillStyle = 'rgba(220, 38, 38, 0.12)';
    ctx.strokeStyle = 'rgba(220, 38, 38, 0.4)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(zone3Pts[0][0], zone3Pts[0][1]);
    for(let i = 1; i < zone3Pts.length; i++) ctx.lineTo(zone3Pts[i][0], zone3Pts[i][1]);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Hatch pattern in Zone 3
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(zone3Pts[0][0], zone3Pts[0][1]);
    for(let i = 1; i < zone3Pts.length; i++) ctx.lineTo(zone3Pts[i][0], zone3Pts[i][1]);
    ctx.closePath();
    ctx.clip();
    ctx.strokeStyle = 'rgba(220, 38, 38, 0.08)';
    ctx.lineWidth = 0.8;
    for (let offset = -400; offset < 900; offset += 15) {
      ctx.beginPath();
      ctx.moveTo(offset, 0);
      ctx.lineTo(offset + 500, 500);
      ctx.stroke();
    }
    ctx.restore();

    // Medium Hazard (Zone 2)
    const zone2Pts = [[110, 160], [410, 200], [530, 440], [240, 490]];
    ctx.fillStyle = 'rgba(217, 119, 6, 0.05)';
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.2)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(zone2Pts[0][0], zone2Pts[0][1]);
    for(let i = 1; i < zone2Pts.length; i++) ctx.lineTo(zone2Pts[i][0], zone2Pts[i][1]);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Zone 3 Tag Label
    ctx.fillStyle = 'rgba(220, 38, 38, 0.75)';
    ctx.font = 'bold 8.5px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('▲ CAT-3 FLOOD ZONE', 155, 196);

    const quotes = appState.quotations;
    const latToY = (lat) => mapHeight / 2 - (lat - centerLat) * 3500;
    const lngToX = (lng) => mapWidth / 2 + (lng - centerLng) * 5500;

    const radiusScale = document.getElementById('map-radius-selector') ? parseFloat(document.getElementById('map-radius-selector').value) : 5;
    const radiusPx = radiusScale * 14;
    
    const centerX = lngToX(centerLng);
    const centerY = latToY(centerLat);

    // 8. Draw HUD Compass Rose
    ctx.save();
    const compX = mapWidth - 45;
    const compY = 45;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(compX, compY, 20, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(compX - 25, compY);
    ctx.lineTo(compX + 25, compY);
    ctx.moveTo(compX, compY - 25);
    ctx.lineTo(compX, compY + 25);
    ctx.stroke();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.moveTo(compX, compY - 18);
    ctx.lineTo(compX - 5, compY - 3);
    ctx.lineTo(compX, compY - 6);
    ctx.lineTo(compX + 5, compY - 3);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.font = 'bold 8.5px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', compX, compY - 22);
    ctx.restore();

    // 9. Draw HUD Scale Bar
    ctx.save();
    const scX = mapWidth - 110;
    const scY = mapHeight - 30;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(scX, scY);
    ctx.lineTo(scX + 70, scY);
    ctx.moveTo(scX, scY - 4);
    ctx.lineTo(scX, scY + 2);
    ctx.moveTo(scX + 35, scY - 4);
    ctx.lineTo(scX + 35, scY + 2);
    ctx.moveTo(scX + 70, scY - 4);
    ctx.lineTo(scX + 70, scY + 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.font = '7.5px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('0', scX, scY - 8);
    ctx.fillText('2.5 km', scX + 35, scY - 8);
    ctx.fillText('5 km', scX + 70, scY - 8);
    ctx.restore();

    // 10. Border Axis Ticks
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.lineWidth = 1;
    const pad = 20;
    ctx.strokeRect(pad, pad, mapWidth - pad * 2, mapHeight - pad * 2);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.font = '7.5px monospace';
    for (let y = 60; y < mapHeight - pad; y += 80) {
      const latVal = centerLat + (mapHeight / 2 - y) / 3500;
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(pad + 4, y);
      ctx.stroke();
      ctx.textAlign = 'left';
      ctx.fillText(`${latVal.toFixed(4)}°N`, pad + 7, y + 2.5);
    }
    for (let x = 80; x < mapWidth - pad; x += 120) {
      const lngVal = centerLng + (x - mapWidth / 2) / 5500;
      ctx.beginPath();
      ctx.moveTo(x, mapHeight - pad);
      ctx.lineTo(x, mapHeight - pad - 4);
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillText(`${lngVal.toFixed(4)}°W`, x, mapHeight - pad - 7);
    }

    // 11. Draw main accumulation circle
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.7)';
    ctx.fillStyle = 'rgba(59, 130, 246, 0.03)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(centerX, centerY, radiusPx, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);

    // Concentric inner helper rings
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)';
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.arc(centerX, centerY, radiusPx * 0.5, 0, 2 * Math.PI);
    ctx.arc(centerX, centerY, radiusPx * 0.25, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);

    // Crosshair at accumulation center
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(centerX - 8, centerY);
    ctx.lineTo(centerX + 8, centerY);
    ctx.moveTo(centerX, centerY - 8);
    ctx.lineTo(centerX, centerY + 8);
    ctx.stroke();

    ctx.fillStyle = 'rgba(59, 130, 246, 0.85)';
    ctx.fillRect(centerX - 42, centerY - radiusPx - 24, 84, 17);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.strokeRect(centerX - 42, centerY - radiusPx - 24, 84, 17);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 8.5px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`ZONE: ${radiusScale}km`, centerX, centerY - radiusPx - 12);

    // 12. Sonar sweep line animation
    if (this.mapSweepAngle !== undefined) {
      const sweepRadius = radiusPx * 1.4;
      const sweepX = centerX + Math.cos(this.mapSweepAngle) * sweepRadius;
      const sweepY = centerY + Math.sin(this.mapSweepAngle) * sweepRadius;

      ctx.save();
      const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, sweepRadius);
      grad.addColorStop(0, 'rgba(56, 189, 248, 0.15)');
      grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      const steps = 30;
      for (let i = 0; i <= steps; i++) {
        const angle = this.mapSweepAngle - (i / steps) * 0.6;
        ctx.lineTo(centerX + Math.cos(angle) * sweepRadius, centerY + Math.sin(angle) * sweepRadius);
      }
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(sweepX, sweepY);
      ctx.stroke();
      ctx.restore();
    }

    let insideExposure = 0;
    let count = 0;

    // Draw connection lines under the nodes
    quotes.forEach(q => {
      if (q.quoteNo === 'QT2024004' && q.latitude === 51.5074) return;
      const px = lngToX(q.longitude);
      const py = latToY(q.latitude);
      const dist = Math.sqrt(Math.pow(q.latitude - centerLat, 2) + Math.pow(q.longitude - centerLng, 2)) * 111;
      const isInside = dist <= radiusScale;

      if (isInside) {
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.35)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(px, py);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });

    // Draw points & labels with shadows & high-contrast outlines
    quotes.forEach(q => {
      if (q.quoteNo === 'QT2024004' && q.latitude === 51.5074) return;
      const px = lngToX(q.longitude);
      const py = latToY(q.latitude);

      const dist = Math.sqrt(Math.pow(q.latitude - centerLat, 2) + Math.pow(q.longitude - centerLng, 2)) * 111;
      const isInside = dist <= radiusScale;

      if (isInside) {
        insideExposure += q.sumInsured;
        count++;
      }

      let pointColor = '#059669'; // Emerald
      let colorRGB = '5, 150, 105';
      if (q.riskCategory === 'Referred') { pointColor = '#d97706'; colorRGB = '217, 119, 6'; }
      if (q.riskCategory === 'Deferred') { pointColor = '#dc2626'; colorRGB = '220, 38, 38'; }

      const isSelected = q.quoteNo === appState.selectedQuoteNo;
      const isHovered = this.hoveredQuote && q.quoteNo === this.hoveredQuote.quoteNo;

      if (isSelected || isHovered) {
        const t = Date.now() / 1000;
        const radiusMultiplier = 1.0 + (t % 1.5) / 1.5;
        const opacity = 1.0 - (t % 1.5) / 1.5;

        ctx.strokeStyle = `rgba(${colorRGB}, ${opacity * 0.7})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, 7 * radiusMultiplier * 1.8, 0, 2 * Math.PI);
        ctx.stroke();

        ctx.strokeStyle = `rgba(${colorRGB}, ${opacity * 0.4})`;
        ctx.beginPath();
        ctx.arc(px, py, 7 * radiusMultiplier * 2.8, 0, 2 * Math.PI);
        ctx.stroke();
      }

      // Drop shadow for the risk node
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;

      ctx.beginPath();
      ctx.arc(px, py, 6.5, 0, 2 * Math.PI);
      ctx.fillStyle = pointColor;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#fff';
      ctx.stroke();
      ctx.restore();

      // Shadowed labels
      ctx.font = '600 9px sans-serif';
      const labelText = q.customerName;
      const textWidth = ctx.measureText(labelText).width;
      
      // Label box
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(px + 10, py - 8, textWidth + 6, 14);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(px + 10, py - 8, textWidth + 6, 14);

      ctx.fillStyle = '#1e293b'; // Slate dark text
      ctx.textAlign = 'left';
      ctx.fillText(labelText, px + 13, py + 2);
    });

    // Crosshair guidelines for mouse
    if (this.mousePos && this.mousePos.x !== null) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
      ctx.lineWidth = 0.8;
      ctx.setLineDash([2, 4]);

      ctx.beginPath();
      ctx.moveTo(this.mousePos.x, pad);
      ctx.lineTo(this.mousePos.x, mapHeight - pad);
      ctx.moveTo(pad, this.mousePos.y);
      ctx.lineTo(mapWidth - pad, this.mousePos.y);
      ctx.stroke();
      ctx.setLineDash([]);

      const mouseLat = centerLat + (mapHeight / 2 - this.mousePos.y) / 3500;
      const mouseLng = centerLng + (this.mousePos.x - mapWidth / 2) / 5500;
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.fillRect(32, mapHeight - 48, 145, 22);
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(32, mapHeight - 48, 145, 22);

      ctx.fillStyle = '#1d4ed8'; // Crisp blue coordinates
      ctx.font = 'bold 8.5px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`GRID: ${mouseLat.toFixed(5)}N, ${Math.abs(mouseLng).toFixed(5)}W`, 38, mapHeight - 34);
    }

    // Hover Tooltip on Canvas
    if (this.hoveredQuote) {
      const q = this.hoveredQuote;
      const px = lngToX(q.longitude);
      const py = latToY(q.latitude);

      const ttW = 160;
      const ttH = 92;
      let ttX = px + 15;
      let ttY = py - ttH - 15;
      if (ttX + ttW > mapWidth - pad) ttX = px - ttW - 15;
      if (ttY < pad) ttY = py + 15;

      ctx.save();
      // Light glassmorphic card shadow and background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;
      ctx.beginPath();
      ctx.roundRect(ttX, ttY, ttW, ttH, 6);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      
      let borderStyle = 'rgba(5, 150, 105, 0.6)';
      if (q.riskCategory === 'Referred') borderStyle = 'rgba(217, 119, 6, 0.6)';
      if (q.riskCategory === 'Deferred') borderStyle = 'rgba(220, 38, 38, 0.6)';
      
      ctx.strokeStyle = borderStyle;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(q.customerName.toUpperCase(), ttX + 10, ttY + 16);

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ttX + 10, ttY + 24);
      ctx.lineTo(ttX + ttW - 10, ttY + 24);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '8px sans-serif';
      ctx.fillText('LOB / Product:', ttX + 10, ttY + 38);
      ctx.fillText('Sum Insured:', ttX + 10, ttY + 52);
      ctx.fillText('Risk Category:', ttX + 10, ttY + 66);
      ctx.fillText('Coordinates:', ttX + 10, ttY + 80);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(q.lob + ' / ' + q.product, ttX + ttW - 10, ttY + 38);
      ctx.fillText(`${formatINR(q.sumInsured)}`, ttX + ttW - 10, ttY + 52);
      
      ctx.fillStyle = q.riskCategory === 'Deferred' ? '#dc2626' : q.riskCategory === 'Referred' ? '#d97706' : '#059669';
      ctx.fillText(q.riskCategory, ttX + ttW - 10, ttY + 66);
      
      ctx.fillStyle = '#475569';
      ctx.font = '8px monospace';
      ctx.fillText(`${q.latitude.toFixed(4)}, ${q.longitude.toFixed(4)}`, ttX + ttW - 10, ttY + 80);

      ctx.restore();
    }

    document.getElementById('map-overlay-count').textContent = count;
    document.getElementById('map-overlay-exposure').textContent = `${formatINR(insideExposure)}`;
    
    const maxCap = appState.adminRules.maxCapacity;
    const capacityPercent = Math.round((insideExposure / maxCap) * 100);
    
    document.getElementById('map-overlay-capacity-percent').textContent = `${capacityPercent}%`;
    document.getElementById('map-overlay-capacity-bar').style.width = `${Math.min(capacityPercent, 100)}%`;

    const fill = document.getElementById('map-overlay-capacity-bar');
    if (capacityPercent > 80) fill.style.background = 'var(--risk-deferred)';
    else if (capacityPercent > 50) fill.style.background = 'var(--risk-referred)';
    else fill.style.background = 'var(--risk-preferred)';

    document.getElementById('map-metrics-exposure').textContent = `${formatINR(insideExposure)}`;
    document.getElementById('map-metrics-avail').textContent = `${formatINR(Math.max(0, maxCap - insideExposure))}`;
    document.getElementById('map-metrics-breach-risk').textContent = `${capacityPercent}%`;
  },

  changeMapRadius(radiusVal) {
    this.drawAccumulationMap();
  },

  // Authority Limits Setup Admin View
  renderAuthorityMatrix() {
    const grid = document.getElementById('authority-matrix-grid');
    if (!grid) return;
    grid.innerHTML = '';

    Object.entries(appState.authorityLimits).forEach(([key, limits]) => {
      const card = document.createElement('div');
      card.className = 'role-limit-card';
      card.innerHTML = `
        <h4><span><i data-lucide="shield-check" style="vertical-align: middle; margin-right: 6px;"></i> ${limits.name}</span></h4>
        <div class="limit-item">
          <span>Max Sum Insured limit:</span>
          <span>${formatINR(limits.limit)}</span>
        </div>
        <div class="limit-item">
          <span>Premium Cap Threshold:</span>
          <span>${formatINR(limits.premiumLimit)}</span>
        </div>
        <div class="limit-item">
          <span>Authority LOB Products:</span>
          <span style="font-size: 0.75rem;">${limits.products.join(', ')}</span>
        </div>
        <div style="margin-top: 14px;">
          <button class="btn btn-secondary btn-sm w-full" onclick="app.editAuthorityLimit('${key}')">Edit Limits</button>
        </div>
      `;
      grid.appendChild(card);
    });

    lucide.createIcons();
  },

  editAuthorityLimit(roleKey) {
    const limitInfo = appState.authorityLimits[roleKey];
    this.openModal(
      `Edit Limits - ${limitInfo.name}`,
      `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div class="form-field">
            <label>Authority Sum Insured Limit (₹)</label>
            <input type="number" class="form-input" id="edit-limit-si" value="${limitInfo.limit}">
          </div>
          <div class="form-field">
            <label>Premium Threshold Limit (₹)</label>
            <input type="number" class="form-input" id="edit-limit-prem" value="${limitInfo.premiumLimit}">
          </div>
        </div>
      `,
      `
        <button class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="app.saveAuthorityLimit('${roleKey}')">Save Changes</button>
      `
    );
  },

  saveAuthorityLimit(roleKey) {
    const newSI = parseInt(document.getElementById('edit-limit-si').value);
    const newPrem = parseInt(document.getElementById('edit-limit-prem').value);

    appState.authorityLimits[roleKey].limit = newSI;
    appState.authorityLimits[roleKey].premiumLimit = newPrem;

    this.closeModal();
    this.renderAuthorityMatrix();
  },

  // Admin Config settings
  loadAdminConfigValues() {
    document.getElementById('cfg-score-preferred').value = appState.adminRules.scorePreferred;
    document.getElementById('cfg-score-deferred').value = appState.adminRules.scoreDeferred;
    document.getElementById('cfg-max-claims').value = appState.adminRules.maxClaims;
    document.getElementById('cfg-accum-radius').value = appState.adminRules.accumRadius;
    document.getElementById('cfg-max-capacity').value = appState.adminRules.maxCapacity;
  },

  saveAdminRules() {
    appState.adminRules.scorePreferred = parseInt(document.getElementById('cfg-score-preferred').value);
    appState.adminRules.scoreDeferred = parseInt(document.getElementById('cfg-score-deferred').value);
    appState.adminRules.maxClaims = parseInt(document.getElementById('cfg-max-claims').value);
    appState.adminRules.accumRadius = parseInt(document.getElementById('cfg-accum-radius').value);
    appState.adminRules.maxCapacity = parseInt(document.getElementById('cfg-max-capacity').value);

    this.openModal(
      'Configuration Saved',
      '<p>Global scoring parameters, perils zones limits, and branch capacities updated successfully.</p>',
      '<button class="btn btn-primary" onclick="app.closeModal()">Close</button>'
    );
  },

  // Audit Log history
  renderAuditTrail() {
    const tbody = document.getElementById('audit-trail-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    appState.auditLogs.forEach(log => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-size: 0.8rem; color: var(--text-muted);">${log.timestamp}</td>
        <td style="font-weight: 700; color: var(--primary);">${log.quoteNo}</td>
        <td><span style="font-weight: 600;">${log.user}</span> <span style="font-size: 0.75rem; color: var(--text-muted);">(${log.role})</span></td>
        <td style="font-weight: 500;">${log.action}</td>
        <td><span class="badge badge-pending" style="font-size: 0.7rem;">${log.transition}</span></td>
        <td style="font-size: 0.85rem; color: var(--text-secondary); max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${log.remarks}</td>
      `;
      tbody.appendChild(tr);
    });
  },

  // Notifications drawer panel
  renderNotifications() {
    const listContainer = document.getElementById('notifications-list');
    const badge = document.getElementById('notif-badge');
    listContainer.innerHTML = '';

    const unreadCount = appState.notifications.filter(n => n.unread).length;
    if (unreadCount > 0) {
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }

    appState.notifications.forEach(n => {
      const div = document.createElement('div');
      div.className = `notification-item ${n.unread ? 'unread' : ''}`;
      div.innerHTML = `
        <h5>${n.title}</h5>
        <p>${n.desc}</p>
        <div class="time"><i data-lucide="clock" style="width: 10px; height: 10px; vertical-align: middle; margin-right: 4px;"></i> ${n.time}</div>
      `;
      div.addEventListener('click', () => {
        n.unread = false;
        this.renderNotifications();
      });
      listContainer.appendChild(div);
    });

    lucide.createIcons();
  },

  clearUnreadNotificationsBadge() {
    appState.notifications.forEach(n => n.unread = false);
    this.renderNotifications();
  },

  addNotification(title, desc) {
    appState.notifications = appState.notifications || [];
    appState.notifications.unshift({
      id: Date.now(),
      title: title,
      desc: desc,
      time: 'Just now',
      unread: true
    });
    this.renderNotifications();
  },

  goBackToQueue() {
    this.switchView('work-queue-view');
  },

  // Reusable Modal Methods
  openModal(title, bodyHTML, footerHTML) {
    const modal = document.getElementById('app-modal');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHTML;
    document.getElementById('modal-footer').innerHTML = footerHTML;
    modal.classList.add('open');
  },

  closeModal() {
    const modal = document.getElementById('app-modal');
    modal.classList.remove('open');
  },

  // Custom Dropdown UI Initialization
  initCustomDropdowns() {
    document.querySelectorAll('select.filter-select, select.form-select').forEach(select => {
      this.createCustomDropdown(select);
    });

    // Global click listener to close dropdowns when clicking outside
    document.removeEventListener('click', this.closeAllCustomDropdowns);
    document.addEventListener('click', this.closeAllCustomDropdowns);
  },

  closeAllCustomDropdowns() {
    document.querySelectorAll('.custom-dropdown-container').forEach(c => {
      c.classList.remove('open');
    });
  },

  createCustomDropdown(selectElement) {
    // Hide native select
    selectElement.style.display = 'none';

    // Find and remove any existing custom dropdown for this select element
    const parent = selectElement.parentNode;
    const existing = parent.querySelector('.custom-dropdown-container');
    if (existing) {
      existing.remove();
    }

    // Build container
    const container = document.createElement('div');
    container.className = 'custom-dropdown-container';
    if (selectElement.style.width) {
      container.style.width = selectElement.style.width;
    }

    // Build trigger
    const trigger = document.createElement('div');
    trigger.className = 'custom-dropdown-trigger';

    const selectedSpan = document.createElement('span');
    selectedSpan.className = 'custom-dropdown-selected-value';

    // Get current selection
    const activeOption = selectElement.options[selectElement.selectedIndex] || selectElement.options[0];
    selectedSpan.textContent = activeOption ? activeOption.textContent : '';

    const arrow = document.createElement('i');
    arrow.className = 'custom-dropdown-arrow';
    arrow.setAttribute('data-lucide', 'chevron-down');

    trigger.appendChild(selectedSpan);
    trigger.appendChild(arrow);
    container.appendChild(trigger);

    // Build menu
    const menu = document.createElement('div');
    menu.className = 'custom-dropdown-menu';

    Array.from(selectElement.options).forEach(opt => {
      const item = document.createElement('div');
      item.className = 'custom-dropdown-item';
      if (opt.value === selectElement.value) {
        item.classList.add('selected');
      }
      item.textContent = opt.textContent;
      item.setAttribute('data-value', opt.value);

      item.addEventListener('click', (e) => {
        e.stopPropagation();
        selectElement.value = opt.value;
        selectedSpan.textContent = opt.textContent;

        menu.querySelectorAll('.custom-dropdown-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');

        container.classList.remove('open');

        // Fire native change listener
        selectElement.dispatchEvent(new Event('change'));
      });

      menu.appendChild(item);
    });

    container.appendChild(menu);
    parent.appendChild(container);

    // Click handler to toggle open
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.custom-dropdown-container').forEach(c => {
        if (c !== container) c.classList.remove('open');
      });
      container.classList.toggle('open');
    });

    // Refresh icons inside custom dropdown
    lucide.createIcons();
  },

  // ─── UW ROUTING LADDER (PDF Section 6 — corrected) ──────────────────────
  renderUWRoutingLadder(q) {
    const si = q.sumInsured;
    // PDF-correct tiers and limits (INR scale)
    const routingLevels = [
      { key: 'auto',      label: 'Auto Approval Engine',   limit: 0,          icon: 'zap',          desc: 'Preferred cases with no exceptions',              color: '#059669' },
      { key: 'preferred', label: 'Preferred Risk UW',       limit: 5000000,    icon: 'star',         desc: 'Preferred risks requiring basic validation',       color: '#0891b2' },
      { key: 'junior',    label: 'Junior Underwriter',      limit: 10000000,   icon: 'user',         desc: 'Low to moderate referred risks (up to ₹1 Cr)',     color: '#2563eb' },
      { key: 'senior',    label: 'Senior Underwriter',      limit: 50000000,   icon: 'shield-alert', desc: 'Medium/high complexity or TIV ₹1–5 Cr',           color: '#d97706' },
      { key: 'manager',   label: 'Underwriting Manager',    limit: 250000000,  icon: 'briefcase',    desc: 'High value, accumulation or exception (₹5–25 Cr)', color: '#7c3aed' },
      { key: 'head',      label: 'Head of Underwriting',    limit: 999999999,  icon: 'crown',        desc: 'Above ₹25 Cr / appetite exception cases',          color: '#dc2626' },
      { key: 'reinsurance', label: 'Reinsurance Team',      limit: 999999999,  icon: 'globe',        desc: 'Capacity breach or treaty rule triggered',         color: '#0e7490' }
    ];

    // ── Multi-rule routing decision (PDF: "route by highest applicable rule") ──
    let targetLevel = 'auto';
    let routingReasons = [];

    // Rule 1: Sum insured / TIV
    if (si > 250000000) {
      targetLevel = 'head';
      routingReasons.push(`TIV ${formatINR(si)} exceeds Underwriting Manager limit (₹25 Cr)`);
    } else if (si > 50000000) {
      targetLevel = 'manager';
      routingReasons.push(`TIV ${formatINR(si)} exceeds Senior UW limit (₹5 Cr)`);
    } else if (si > 10000000) {
      targetLevel = 'senior';
      routingReasons.push(`TIV ${formatINR(si)} exceeds Junior UW limit (₹1 Cr)`);
    } else if (si > 5000000) {
      targetLevel = 'junior';
      routingReasons.push(`TIV ${formatINR(si)} requires Junior UW review`);
    } else if (si > 0 && q.riskCategory === 'Preferred' && q.claims === 0) {
      targetLevel = 'preferred';
      routingReasons.push(`Preferred risk, clean loss history, TIV within ₹50 L`);
    }

    // Rule 2: Risk category override
    if (q.riskCategory === 'Deferred') {
      if (['auto', 'preferred', 'junior'].includes(targetLevel)) targetLevel = 'manager';
      routingReasons.push('Risk category Deferred — requires Manager+ approval');
    }

    // Rule 3: Claims indicator
    if (q.claims >= (appState.adminRules.maxClaims || 3)) {
      if (['auto', 'preferred', 'junior'].includes(targetLevel)) targetLevel = 'senior';
      routingReasons.push(`High claims frequency (${q.claims} claims ≥ threshold)`);
    }

    // Rule 4: High hazard occupancy
    if (q.occupancy && (q.occupancy.toLowerCase().includes('chemical') || q.occupancy.toLowerCase().includes('petro') || q.occupancy.toLowerCase().includes('hazard'))) {
      if (['auto', 'preferred'].includes(targetLevel)) targetLevel = 'junior';
      routingReasons.push('High-hazard occupancy (chemical/petrochemical) — manual UW required');
    }

    // Rule 5: Reinsurance dependency
    if (q.status === 'Reinsurance Review' || si > (appState.adminRules.netRetention + appState.adminRules.treatyCapacity)) {
      targetLevel = 'reinsurance';
      routingReasons.push('Reinsurance dependency — treaty/facultative review required');
    }

    // Rule 6: Returning case — category deteriorated
    if (q.caseType === 'returning' && q.categoryMovement === 'deteriorated') {
      if (['auto', 'preferred'].includes(targetLevel)) targetLevel = 'junior';
      routingReasons.push('Returning case — category deteriorated since previous policy');
    }

    // Authority breach check
    const roleAuthorityMap = { auto: 0, preferred: 5000000, junior: 10000000, senior: 50000000, manager: 250000000, head: 999999999, reinsurance: 999999999 };
    const activeRoleKey = appState.currentRole.replace('_underwriter', '').replace('underwriting_', 'manager_').replace('reinsurance_manager', 'reinsurance');
    const userLimit = appState.authorityLimits[appState.currentRole]?.limit || 0;
    const authorityBreach = si > userLimit && !['admin'].includes(appState.currentRole);
    if (authorityBreach && routingReasons.length === 0) routingReasons.push(`Current role limit (${formatINR(userLimit)}) exceeded — referral required`);

    const whyText = routingReasons.length > 0 ? routingReasons.join(' · ') : 'Within auto-approval parameters — no exceptions flagged.';

    let html = `<div class="uw-routing-ladder">`;
    routingLevels.forEach((level, idx) => {
      const isActive = level.key === targetLevel;
      const targetIdx = routingLevels.findIndex(l => l.key === targetLevel);
      const isAbove   = targetIdx > idx;
      const rowClass  = isActive ? 'ladder-row active' : isAbove ? 'ladder-row completed' : 'ladder-row pending';
      const limitLabel = level.limit > 0 && level.limit < 999999999 ? `Up to ${formatINR(level.limit)}` : level.key === 'auto' ? 'Auto-approved threshold' : 'Exception cases';
      html += `
        <div class="${rowClass}">
          <div class="ladder-icon" style="--ladder-color:${level.color}"><i data-lucide="${level.icon}"></i></div>
          <div class="ladder-body">
            <div class="ladder-title">${level.label} ${isActive ? '<span class="ladder-current-badge">Current Route</span>' : ''}</div>
            <div class="ladder-meta">${limitLabel} &nbsp;·&nbsp; ${level.desc}</div>
            ${isActive ? `<div class="ladder-reason"><i data-lucide="info" style="width:11px;height:11px;vertical-align:middle;margin-right:4px;"></i>${whyText}</div>` : ''}
            ${isActive && authorityBreach ? `<div class="ladder-reason" style="color:#dc2626;margin-top:4px;"><i data-lucide="alert-circle" style="width:11px;height:11px;vertical-align:middle;margin-right:4px;"></i>Authority breach — your role cannot approve independently. Referral required.</div>` : ''}
          </div>
          <div class="ladder-status-dot" style="background:${level.color};${isActive ? 'box-shadow:0 0 8px '+level.color+'88;' : ''}"></div>
        </div>
      `;
    });
    html += `</div>`;
    return html;
  },

  // ─── NEXT BEST ACTIONS ────────────────────────────────────────────────────
  renderNextBestActions(q) {
    const isReturning = q.caseType === 'returning';
    const freshActions = [
      { label: 'Complete missing occupancy details', status: q.occupancy ? 'completed' : 'current', icon: 'building' },
      { label: 'Upload fire protection certificate', status: q.documents?.some(d => d.name.toLowerCase().includes('fire') && d.uploaded) ? 'completed' : (q.documents?.some(d => d.name.toLowerCase().includes('fire')) ? 'current' : 'pending'), icon: 'flame' },
      { label: 'Validate latitude and longitude', status: q.latitude && q.longitude ? 'completed' : 'current', icon: 'map-pin' },
      { label: 'Review claims declaration', status: q.claims >= 0 && q.claimsDetails ? 'completed' : 'current', icon: 'file-warning' },
      { label: 'Check underwriting authority', status: q.assignedRole ? 'completed' : 'pending', icon: 'shield-check' },
      { label: 'Perform accumulation check', status: q.riskScore ? 'completed' : 'pending', icon: 'layers' },
      { label: 'Confirm reinsurance requirement', status: q.status === 'Reinsurance Review' ? 'current' : q.slaHours === 0 ? 'completed' : 'pending', icon: 'umbrella' },
      { label: 'Release quote to broker', status: q.status === 'Quote Issued' ? 'completed' : 'pending', icon: 'send' }
    ];
    const returningActions = [
      { label: 'Review changes from previous policy', status: (q.changeDetection && q.changeDetection.length > 0) ? 'completed' : 'current', icon: 'git-diff' },
      { label: 'Validate increase in sum insured', status: q.sumInsured > (q.previousPolicy?.sumInsured || 0) ? 'current' : 'completed', icon: 'trending-up' },
      { label: 'Check claims since last policy', status: q.claims > (q.previousPolicy?.claims || 0) ? 'current' : 'completed', icon: 'alert-triangle' },
      { label: 'Compare previous and current risk score', status: 'current', icon: 'bar-chart-2' },
      { label: 'Reconfirm accumulation exposure', status: 'pending', icon: 'layers' },
      { label: 'Review expiring reinsurance terms', status: q.previousPolicy?.reinsuranceDecision ? 'awaiting' : 'pending', icon: 'umbrella' },
      { label: 'Approve renewal terms or escalate', status: q.status === 'Quote Issued' ? 'completed' : q.categoryMovement === 'deteriorated' ? 'awaiting' : 'pending', icon: 'check-circle' },
      { label: 'Release renewal / revised quotation', status: q.status === 'Quote Issued' ? 'completed' : 'pending', icon: 'send' }
    ];

    // Returning: smart routing suggestion (PDF §3 — reuse previous owner when no material change)
    const prevOwnerSame = isReturning && q.categoryMovement === 'unchanged' && q.previousPolicy?.owner;
    if (prevOwnerSame) {
      returningActions.splice(3, 0, {
        label: `Smart Route: Suggest previous owner — ${q.previousPolicy.owner} (no material category change)`,
        status: 'awaiting', icon: 'user-check'
      });
    }

    // Fresh: mark blocked if deferred
    if (!isReturning && q.riskCategory === 'Deferred') {
      freshActions[7] = { label: 'Release quote to broker — BLOCKED (deferred risk)', status: 'blocked', icon: 'ban' };
      freshActions[6] = { label: 'Confirm reinsurance requirement — awaiting manager override', status: 'awaiting', icon: 'umbrella' };
    }
    // Fresh: mark awaiting if mandatory doc missing
    const hasMissingMandatoryDoc = q.documents?.some(d => !d.uploaded && d.mandatory);
    if (!isReturning && hasMissingMandatoryDoc) {
      freshActions[1] = { label: 'Upload mandatory documents — awaiting from agent', status: 'awaiting', icon: 'file-x' };
    }

    const actions = isReturning ? returningActions : freshActions;

    const statusConfig = {
      completed: { cls: 'nba-completed', dot: '#059669', label: 'Done' },
      current:   { cls: 'nba-current',   dot: '#2563eb', label: 'Action Required' },
      awaiting:  { cls: 'nba-awaiting',  dot: '#d97706', label: 'Awaiting' },
      blocked:   { cls: 'nba-blocked',   dot: '#dc2626', label: 'Blocked' },
      pending:   { cls: 'nba-pending',   dot: '#94a3b8', label: 'Pending' }
    };

    let html = `<div class="nba-list">`;
    actions.forEach(a => {
      const cfg = statusConfig[a.status] || statusConfig.pending;
      html += `
        <div class="nba-item ${cfg.cls}">
          <div class="nba-dot" style="background:${cfg.dot};${a.status==='current'?'box-shadow:0 0 6px '+cfg.dot+'88;':''}"></div>
          <i data-lucide="${a.icon}" class="nba-icon"></i>
          <span class="nba-label">${a.label}</span>
          <span class="nba-status-tag" style="color:${cfg.dot};border-color:${cfg.dot}30;background:${cfg.dot}10;">${cfg.label}</span>
        </div>
      `;
    });
    html += `</div>`;
    return html;
  },

  // ─── RETURNING CASE COMPARISON PANEL ─────────────────────────────────────
  renderReturningCaseComparison(q) {
    if (!q.changeDetection || !q.previousPolicy) return '<p style="color:var(--text-muted);font-size:0.85rem;">No comparison data available.</p>';
    const prev = q.previousPolicy;
    const movColor = q.categoryMovement === 'deteriorated' ? '#dc2626' : q.categoryMovement === 'improved' ? '#059669' : '#64748b';
    const movIcon  = q.categoryMovement === 'deteriorated' ? '▼ Deteriorated' : q.categoryMovement === 'improved' ? '▲ Improved' : '→ Unchanged';

    let rowsHTML = q.changeDetection.map(chg => {
      const svrColor = chg.severity === 'high' ? '#dc2626' : chg.severity === 'medium' ? '#d97706' : '#64748b';
      const svrBg    = chg.severity === 'high' ? '#fee2e2' : chg.severity === 'medium' ? '#fef3c7' : '#f1f5f9';
      return `
        <tr>
          <td style="font-weight:600;color:var(--text-secondary);">${chg.field}</td>
          <td style="color:var(--text-muted);">${chg.previous}</td>
          <td style="font-weight:700;color:var(--text-primary);">${chg.current}</td>
          <td><span style="font-size:0.72rem;font-weight:700;padding:2px 8px;border-radius:4px;background:${svrBg};color:${svrColor};">${chg.change}</span></td>
        </tr>
      `;
    }).join('');

    const comparisonHTML = `
      <div style="margin-bottom:14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <div style="flex:1;min-width:200px;">
          <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;font-weight:700;letter-spacing:0.05em;margin-bottom:3px;">Previous Policy</div>
          <div style="font-weight:700;font-size:0.9rem;">${prev.policyNo}</div>
          <div style="font-size:0.78rem;color:var(--text-secondary);">${prev.riskCategory} · Score ${prev.riskScore} · Expiry ${prev.expiryDate}</div>
        </div>
        <div style="padding:6px 14px;border-radius:8px;font-weight:700;font-size:0.8rem;background:${movColor}15;color:${movColor};border:1px solid ${movColor}30;">
          Category Movement: ${movIcon}
        </div>
      </div>
      <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:8px;padding:8px 12px;background:var(--bg-app);border-radius:6px;border-left:3px solid ${movColor};">
        ${q.categoryMovementReason}
      </div>
      <div style="overflow:auto;border-radius:8px;border:1px solid var(--border-color);">
        <table style="width:100%;border-collapse:collapse;font-size:0.8rem;">
          <thead>
            <tr style="background:var(--bg-app);">
              <th style="text-align:left;padding:8px 12px;color:var(--text-muted);font-weight:600;font-size:0.72rem;text-transform:uppercase;">Field</th>
              <th style="text-align:left;padding:8px 12px;color:var(--text-muted);font-weight:600;font-size:0.72rem;text-transform:uppercase;">Previous</th>
              <th style="text-align:left;padding:8px 12px;color:var(--text-muted);font-weight:600;font-size:0.72rem;text-transform:uppercase;">Current</th>
              <th style="text-align:left;padding:8px 12px;color:var(--text-muted);font-weight:600;font-size:0.72rem;text-transform:uppercase;">Change</th>
            </tr>
          </thead>
          <tbody>${rowsHTML}</tbody>
        </table>
      </div>
    `;

    // ── Accumulation Delta Card (PDF §3: Before/after exposure comparison) ──
    const prevSI  = q.previousPolicy?.sumInsured || 0;
    const currSI  = q.sumInsured;
    const delta   = currSI - prevSI;
    const deltaPct = prevSI > 0 ? ((delta / prevSI) * 100).toFixed(1) : 'N/A';
    const maxCap  = appState.adminRules.maxCapacity;
    const prevCap = prevSI > 0 ? Math.min(100, ((prevSI / maxCap) * 100)).toFixed(1) : 0;
    const currCap = Math.min(100, ((currSI / maxCap) * 100)).toFixed(1);
    const deltaColor = delta > 0 ? '#dc2626' : '#059669';

    const accDelta = `
      <div style="margin-top:16px;padding:14px 16px;background:linear-gradient(135deg,#f8fafc,#eff6ff);border-radius:var(--radius-lg);border:1px solid var(--border-color);">
        <div style="font-size:0.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px;">
          <i data-lucide="layers" style="width:12px;height:12px;vertical-align:middle;margin-right:4px;"></i>Accumulation Exposure Delta
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px;">
          <div style="text-align:center;padding:8px;background:#fff;border-radius:8px;border:1px solid var(--border-color);">
            <div style="font-size:0.65rem;color:var(--text-muted);font-weight:600;text-transform:uppercase;">Previous TIV</div>
            <div style="font-size:1rem;font-weight:800;color:var(--text-primary);">${formatINR(prevSI)}</div>
            <div style="font-size:0.65rem;color:var(--text-muted);">${prevCap}% of capacity</div>
          </div>
          <div style="text-align:center;padding:8px;background:#fff;border-radius:8px;border:1px solid var(--border-color);">
            <div style="font-size:0.65rem;color:var(--text-muted);font-weight:600;text-transform:uppercase;">Current TIV</div>
            <div style="font-size:1rem;font-weight:800;color:var(--text-primary);">${formatINR(currSI)}</div>
            <div style="font-size:0.65rem;color:var(--text-muted);">${currCap}% of capacity</div>
          </div>
          <div style="text-align:center;padding:8px;background:${deltaColor}08;border-radius:8px;border:1px solid ${deltaColor}22;">
            <div style="font-size:0.65rem;color:${deltaColor};font-weight:700;text-transform:uppercase;">Incremental Delta</div>
            <div style="font-size:1rem;font-weight:800;color:${deltaColor};">${delta > 0 ? '+' : ''}${formatINR(Math.abs(delta))}</div>
            <div style="font-size:0.65rem;color:${deltaColor};">${delta > 0 ? '▲' : '▼'} ${deltaPct}%</div>
          </div>
        </div>
        <div style="height:8px;border-radius:4px;background:var(--border-color);overflow:hidden;margin-bottom:4px;">
          <div style="width:${prevCap}%;height:100%;background:#94a3b8;border-radius:4px;"></div>
        </div>
        <div style="height:8px;border-radius:4px;background:var(--border-color);overflow:hidden;margin-bottom:8px;">
          <div style="width:${currCap}%;height:100%;background:${deltaColor};border-radius:4px;transition:width 0.6s ease;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:0.68rem;color:var(--text-muted);">
          <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#94a3b8;margin-right:3px;"></span>Previous (${prevCap}%)</span>
          <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${deltaColor};margin-right:3px;"></span>Current (${currCap}%)</span>
          <span style="font-weight:700;color:var(--text-secondary);">Remaining: ${formatINR(Math.max(0, maxCap - currSI))}</span>
        </div>
      </div>
    `;

    return comparisonHTML + accDelta;
  },

  // ─── FRESH CASE MISSING INFO PANEL ───────────────────────────────────────
  renderFreshCaseMissingInfo(q) {
    const checks = [
      { label: 'Customer Name', done: !!q.customerName, mandatory: true },
      { label: 'Occupancy / Trade', done: !!q.occupancy, mandatory: true },
      { label: 'Coordinates (Lat/Lng)', done: !!q.latitude && !!q.longitude, mandatory: true },
      { label: 'Sum Insured', done: q.sumInsured > 0, mandatory: true },
      { label: 'Claims Declaration', done: q.claimsDetails && q.claimsDetails !== 'None reported.', mandatory: true },
      { label: 'Fire Protection Certificate', done: q.documents?.some(d => d.name.toLowerCase().includes('fire') && d.uploaded), mandatory: true },
      { label: 'Property Survey Report', done: q.documents?.some(d => d.name.toLowerCase().includes('survey') && d.uploaded), mandatory: true },
      { label: 'Financial Statements', done: q.documents?.some(d => d.name.toLowerCase().includes('financial') && d.uploaded), mandatory: false },
    ];
    const mandatory = checks.filter(c => c.mandatory);
    const doneCount = mandatory.filter(c => c.done).length;
    const pct = Math.round((doneCount / mandatory.length) * 100);
    const barColor = pct >= 100 ? '#059669' : pct >= 60 ? '#d97706' : '#dc2626';

    let itemsHTML = checks.map(c => `
      <div style="display:flex;align-items:center;gap:8px;font-size:0.78rem;padding:5px 0;border-bottom:1px solid var(--border-color);">
        <span style="width:18px;height:18px;border-radius:50%;background:${c.done ? '#d1fae5' : '#fee2e2'};display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:10px;">
          ${c.done ? '<span style="color:#059669;">✓</span>' : '<span style="color:#dc2626;">✕</span>'}
        </span>
        <span style="flex:1;${!c.done ? 'font-weight:600;color:var(--text-primary);' : 'color:var(--text-muted);'}">${c.label}</span>
        <span style="font-size:0.65rem;padding:1px 6px;border-radius:3px;font-weight:700;${c.mandatory ? 'background:#fee2e2;color:#dc2626;' : 'background:#f1f5f9;color:#64748b;'}">${c.mandatory ? 'Mandatory' : 'Optional'}</span>
      </div>
    `).join('');

    return `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
        <div>
          <div style="font-size:0.85rem;font-weight:700;color:var(--text-primary);">Intake Completion</div>
          <div style="font-size:0.72rem;color:var(--text-muted);">${doneCount} of ${mandatory.length} mandatory fields complete</div>
        </div>
        <div style="font-size:1.4rem;font-weight:800;font-family:var(--font-display);color:${barColor};">${pct}%</div>
      </div>
      <div style="height:6px;background:var(--border-color);border-radius:3px;margin-bottom:16px;overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:${barColor};border-radius:3px;transition:width 0.5s ease;"></div>
      </div>
      ${itemsHTML}
    `;
  },

  // ─── LAYERED CAPACITY / REINSURANCE GAUGE ────────────────────────────────
  renderCapacityGauge(q) {
    const si = q.sumInsured;
    const retention = appState.adminRules.netRetention;       // e.g. 10,000,000
    const treaty    = appState.adminRules.treatyCapacity;     // e.g. 50,000,000
    const facLimit  = 200000000;

    let recommendation, recColor = '#059669', recBg = '#d1fae5';
    if (si <= retention) {
      recommendation = 'Within retention — no reinsurance action required.';
    } else if (si <= retention + treaty) {
      recommendation = 'Treaty applicable — continue with treaty allocation.';
      recColor = '#d97706'; recBg = '#fef3c7';
    } else if (si <= retention + treaty + facLimit) {
      recommendation = 'Facultative reinsurance required before quote release.';
      recColor = '#dc2626'; recBg = '#fee2e2';
    } else {
      recommendation = 'Escalation required due to accumulation and loss indicators.';
      recColor = '#dc2626'; recBg = '#fee2e2';
    }

    const retPct = Math.min((Math.min(si, retention) / (retention + treaty)) * 100, 100);
    const trPct  = si > retention ? Math.min(((Math.min(si, retention + treaty) - retention) / (retention + treaty)) * 100, 100) : 0;
    const facPct = si > retention + treaty ? Math.min(((si - retention - treaty) / (retention + treaty)) * 100, 100) : 0;

    return `
      <div class="capacity-gauge-section">
        <div class="capacity-layers">
          <div class="cap-layer-bar">
            <div class="cap-layer-fill" style="width:${retPct}%;background:#059669;" title="Net Retention: ${formatINR(Math.min(si, retention))}"></div>
            <div class="cap-layer-fill" style="width:${trPct}%;background:#d97706;" title="Treaty: ${formatINR(Math.max(0, Math.min(si, retention+treaty) - retention))}"></div>
            <div class="cap-layer-fill" style="width:${facPct}%;background:#dc2626;" title="Facultative: ${formatINR(Math.max(0, si - retention - treaty))}"></div>
          </div>
          <div class="cap-legend">
            <span><span class="cap-dot" style="background:#059669;"></span> Retention: ${formatINR(retention)}</span>
            <span><span class="cap-dot" style="background:#d97706;"></span> Treaty: ${formatINR(treaty)}</span>
            <span><span class="cap-dot" style="background:#dc2626;"></span> Facultative</span>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0;font-size:0.78rem;">
          <div style="padding:8px 12px;background:var(--bg-app);border-radius:6px;">
            <div style="color:var(--text-muted);margin-bottom:2px;">Net Retention</div>
            <div style="font-weight:700;">${formatINR(retention)}</div>
          </div>
          <div style="padding:8px 12px;background:var(--bg-app);border-radius:6px;">
            <div style="color:var(--text-muted);margin-bottom:2px;">Treaty Capacity</div>
            <div style="font-weight:700;">${formatINR(treaty)}</div>
          </div>
          <div style="padding:8px 12px;background:var(--bg-app);border-radius:6px;">
            <div style="color:var(--text-muted);margin-bottom:2px;">Required Reinsurance</div>
            <div style="font-weight:700;">${si > retention ? formatINR(si - retention) : 'None'}</div>
          </div>
          <div style="padding:8px 12px;background:var(--bg-app);border-radius:6px;">
            <div style="color:var(--text-muted);margin-bottom:2px;">Risk TIV</div>
            <div style="font-weight:700;">${formatINR(si)}</div>
          </div>
        </div>
        <div style="padding:10px 14px;background:${recBg};border-left:3px solid ${recColor};border-radius:0 6px 6px 0;font-size:0.78rem;font-weight:600;color:${recColor};">
          <i data-lucide="info" style="width:13px;height:13px;vertical-align:middle;margin-right:6px;"></i>${recommendation}
        </div>
      </div>
    `;
  },

  // ─── LEAFLET MAP INITIALIZATION ──────────────────────────────────────────
  initLeafletMap() {
    const mapEl = document.getElementById('leaflet-map');
    if (!mapEl || mapEl._leaflet_id) return; // already init

    const center = [13.7563, 100.5018]; // Thailand center (Bangkok)
    const map = L.map('leaflet-map', { zoomControl: true, scrollWheelZoom: true }).setView(center, 6);

    // Voyager tiles — works perfectly on GitHub Pages, no API key needed
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd', maxZoom: 19
    }).addTo(map);

    this.leafletMap = map;
    this.leafletMarkers = [];
    this.gisLayers = { flood: null, seismic: null, storm: null };

    if (document.getElementById('gis-flood-zone')) document.getElementById('gis-flood-zone').checked = false;
    if (document.getElementById('gis-seismic-zone')) document.getElementById('gis-seismic-zone').checked = false;
    if (document.getElementById('gis-storm-surge')) document.getElementById('gis-storm-surge').checked = false;

    const quotes = appState.quotations;
    const radiusKm = parseFloat(document.getElementById('map-radius-selector')?.value || 5) * 1000;

    let totalExposure = 0, inZoneCount = 0;
    const bounds = [];
    const heatPoints = []; // PDF §7: Heat Layer for density

    quotes.forEach(q => {
      if (!q.latitude || !q.longitude) return;

      bounds.push([q.latitude, q.longitude]);
      // Intensity based on sumInsured in Cr
      heatPoints.push([q.latitude, q.longitude, q.sumInsured / 10000000]);

      const color = q.riskCategory === 'Preferred' ? '#059669' : q.riskCategory === 'Referred' ? '#d97706' : '#dc2626';

      // Exposure bubble (circle proportional to TIV)
      const bubbleRadius = Math.sqrt(q.sumInsured / 10000000) * 18000;
      const bubble = L.circle([q.latitude, q.longitude], {
        radius: bubbleRadius,
        color: color,
        fillColor: color,
        fillOpacity: 0.07,
        weight: 1,
        dashArray: '4,4'
      }).addTo(map);

      // Risk pin marker
      const markerHtml = `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2.5px solid #fff;box-shadow:0 2px 8px ${color}88;"></div>`;
      const icon = L.divIcon({ html: markerHtml, className: '', iconSize: [16,16], iconAnchor: [8,8] });
      const marker = L.marker([q.latitude, q.longitude], { icon }).addTo(map);

      marker.bindPopup(`
        <div style="font-family:var(--font-body);min-width:180px;">
          <div style="font-weight:700;font-size:0.85rem;margin-bottom:4px;">${q.customerName}</div>
          <div style="font-size:0.75rem;color:#64748b;margin-bottom:6px;">${q.quoteNo} · ${q.lob}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:0.72rem;">
            <span style="color:#64748b;">TIV:</span><span style="font-weight:600;">${formatINR(q.sumInsured)}</span>
            <span style="color:#64748b;">Score:</span><span style="font-weight:600;">${q.riskScore}/100</span>
            <span style="color:#64748b;">Category:</span><span style="font-weight:600;color:${color};">${q.riskCategory}</span>
            <span style="color:#64748b;">Status:</span><span style="font-weight:600;">${q.status}</span>
          </div>
        </div>
      `, { maxWidth: 220 });

      this.leafletMarkers.push({ marker, bubble, q });
      totalExposure += q.sumInsured;
      inZoneCount++;
    });

    // Add CAT zone polygon (flood zone simulation)
    if (quotes[0] && quotes[0].latitude) {
      const lat = quotes[0].latitude, lng = quotes[0].longitude;
      L.polygon([
        [lat - 0.1, lng - 0.15], [lat + 0.08, lng - 0.05],
        [lat + 0.06, lng + 0.12], [lat - 0.08, lng + 0.08]
      ], {
        color: '#dc2626', fillColor: '#dc2626', fillOpacity: 0.08,
        weight: 1.5, dashArray: '6,4'
      }).addTo(map).bindTooltip('▲ CAT-3 Flood Zone', { permanent: true, className: 'cat-zone-tooltip', direction: 'center' });
    }

    // Add Leaflet Heat Layer (density heatmap representation)
    if (heatPoints.length > 0 && typeof L.heatLayer === 'function') {
      L.heatLayer(heatPoints, {
        radius: 35,
        blur: 15,
        maxZoom: 10,
        gradient: { 0.4: 'rgba(59,130,246,0.5)', 0.7: 'rgba(234,179,8,0.7)', 1.0: 'rgba(239,68,68,0.8)' }
      }).addTo(map);
    }

    if (bounds.length > 1) map.fitBounds(bounds, { padding: [40, 40] });
    else if (bounds.length === 1) map.setView(bounds[0], 12);

    // Update overlay stats — PDF §7: Nearby Risks, TIV, Company Capacity, Remaining, Level, Action
    const maxCap = appState.adminRules.maxCapacity;
    const capPct = Math.round((totalExposure / maxCap) * 100);
    const remaining = Math.max(0, maxCap - totalExposure);
    const exposureLevel = capPct > 80 ? 'High' : capPct > 50 ? 'Medium' : 'Low';
    const exposureLevelColor = capPct > 80 ? '#dc2626' : capPct > 50 ? '#d97706' : '#059669';

    // PDF §7: System-generated suggested action
    let suggestedAction = 'Within safe accumulation limits — proceed normally.';
    let actionBg = '#eff6ff'; let actionColor = '#2563eb'; let actionBorder = '#2563eb';
    if (capPct > 80) {
      suggestedAction = 'Reinsurance Review Required — capacity nearing breach threshold.';
      actionBg = '#fee2e2'; actionColor = '#dc2626'; actionBorder = '#dc2626';
    } else if (capPct > 50) {
      suggestedAction = 'Accumulation caution — escalate to Senior UW for review.';
      actionBg = '#fef3c7'; actionColor = '#d97706'; actionBorder = '#d97706';
    }

    const el = (id) => document.getElementById(id);
    if (el('map-overlay-count')) el('map-overlay-count').textContent = inZoneCount;
    if (el('map-overlay-exposure')) el('map-overlay-exposure').textContent = formatINR(totalExposure);
    if (el('map-overlay-company-cap')) el('map-overlay-company-cap').textContent = formatINR(maxCap);
    if (el('map-overlay-remaining')) { el('map-overlay-remaining').textContent = formatINR(remaining); el('map-overlay-remaining').style.color = remaining < maxCap * 0.2 ? '#dc2626' : 'inherit'; }
    if (el('map-overlay-level')) { el('map-overlay-level').textContent = exposureLevel; el('map-overlay-level').style.color = exposureLevelColor; }
    if (el('map-overlay-capacity-percent')) el('map-overlay-capacity-percent').textContent = `${capPct}%`;
    if (el('map-overlay-capacity-bar')) {
      el('map-overlay-capacity-bar').style.width = `${Math.min(capPct, 100)}%`;
      el('map-overlay-capacity-bar').style.background = capPct > 80 ? 'var(--risk-deferred)' : capPct > 50 ? 'var(--risk-referred)' : 'var(--risk-preferred)';
    }
    if (el('map-overlay-action')) {
      el('map-overlay-action').textContent = suggestedAction;
      el('map-overlay-action').style.background = actionBg;
      el('map-overlay-action').style.color = actionColor;
      el('map-overlay-action').style.borderLeftColor = actionBorder;
    }
    if (el('map-metrics-exposure')) el('map-metrics-exposure').textContent = formatINR(totalExposure);
    if (el('map-metrics-avail')) el('map-metrics-avail').textContent = formatINR(remaining);
    if (el('map-metrics-breach-risk')) el('map-metrics-breach-risk').textContent = `${capPct}%`;
  },

  // LOB Product Configurator Handlers
  selectConfigLOB(lob, btn) {
    document.querySelectorAll('.lob-config-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    appState.currentConfigLOB = lob;
    this.renderConfigProduct();
  },

  renderConfigProduct() {
    const lob = appState.currentConfigLOB;
    const prod = appState.products[lob];
    if (!prod) return;

    // Deductibles
    const dedPctInput = document.getElementById('cfg-lob-deductible-pct');
    const dedMinInput = document.getElementById('cfg-lob-deductible-min');
    if (dedPctInput) dedPctInput.value = prod.deductiblePct;
    if (dedMinInput) dedMinInput.value = prod.deductibleMin;

    // Coverages
    const covList = document.getElementById('config-coverages-list');
    if (covList) {
      covList.innerHTML = prod.coverages.map((c, i) => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px;">
          <span style="font-size: 0.88rem; font-weight: 500; color: var(--text-primary);">${c.name}</span>
          <label class="switch">
            <input type="checkbox" ${c.selected ? 'checked' : ''} onchange="app.toggleConfigCoverage('${lob}', ${i}, this.checked)">
            <span class="slider round"></span>
          </label>
        </div>
      `).join('');
    }

    // Exclusions
    const exclList = document.getElementById('config-exclusions-list');
    if (exclList) {
      exclList.innerHTML = prod.exclusions.map((e, i) => `
        <div style="display: flex; align-items: flex-start; justify-content: space-between; padding: 8px 12px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.8rem; line-height: 1.4; gap: 8px; width: 100%; box-sizing: border-box;">
          <span style="color: var(--text-secondary);">${e}</span>
          <button style="background: none; border: none; color: var(--risk-deferred-text); cursor: pointer; font-size: 0.95rem; padding: 0 4px;" onclick="app.deleteConfigExclusion('${lob}', ${i})">&times;</button>
        </div>
      `).join('');
    }

    // Warranties
    const wartList = document.getElementById('config-warranties-list');
    if (wartList) {
      wartList.innerHTML = prod.warranties.map((w, i) => `
        <div style="display: flex; align-items: flex-start; justify-content: space-between; padding: 8px 12px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.8rem; line-height: 1.4; gap: 8px; width: 100%; box-sizing: border-box;">
          <span style="color: var(--text-secondary);">${w}</span>
          <button style="background: none; border: none; color: var(--risk-deferred-text); cursor: pointer; font-size: 0.95rem; padding: 0 4px;" onclick="app.deleteConfigWarranty('${lob}', ${i})">&times;</button>
        </div>
      `).join('');
    }
  },

  toggleConfigCoverage(lob, idx, checked) {
    if (appState.products[lob] && appState.products[lob].coverages[idx]) {
      appState.products[lob].coverages[idx].selected = checked;
    }
  },

  addCustomExclusion() {
    const lob = appState.currentConfigLOB;
    const input = document.getElementById('new-exclusion-input');
    if (input && input.value.trim() && appState.products[lob]) {
      appState.products[lob].exclusions.push(input.value.trim());
      input.value = '';
      this.renderConfigProduct();
    }
  },

  addCustomWarranty() {
    const lob = appState.currentConfigLOB;
    const input = document.getElementById('new-warranty-input');
    if (input && input.value.trim() && appState.products[lob]) {
      appState.products[lob].warranties.push(input.value.trim());
      input.value = '';
      this.renderConfigProduct();
    }
  },

  deleteConfigExclusion(lob, idx) {
    if (appState.products[lob]) {
      appState.products[lob].exclusions.splice(idx, 1);
      this.renderConfigProduct();
    }
  },

  deleteConfigWarranty(lob, idx) {
    if (appState.products[lob]) {
      appState.products[lob].warranties.splice(idx, 1);
      this.renderConfigProduct();
    }
  },

  saveProductConfig() {
    const lob = appState.currentConfigLOB;
    const prod = appState.products[lob];
    if (!prod) return;

    const dedPctInput = document.getElementById('cfg-lob-deductible-pct');
    const dedMinInput = document.getElementById('cfg-lob-deductible-min');
    if (dedPctInput) prod.deductiblePct = parseFloat(dedPctInput.value);
    if (dedMinInput) prod.deductibleMin = parseFloat(dedMinInput.value);

    this.showToast(`Saved ${lob} LOB product settings successfully!`);
    
    // Log to audit trail
    appState.auditLog.unshift({
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      user: appState.personas.find(p => p.key === appState.currentRole)?.name || 'System',
      role: appState.currentRole,
      action: 'Product Config Updated',
      remarks: `Updated core rules and terms for ${lob} Line of Business.`
    });
    this.renderAuditTrail();
  },

  showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'toast-alert';
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: var(--bg-card);
      border-left: 4px solid var(--accent-color);
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      color: var(--text-primary);
      padding: 14px 20px;
      border-radius: 0 8px 8px 0;
      font-size: 0.88rem;
      font-weight: 600;
      z-index: 10000;
      animation: slideInRight 0.3s forwards;
    `;
    toast.innerHTML = `<i class="lucide lucide-check-circle" style="vertical-align: middle; margin-right: 8px; color: var(--accent-color);"></i> ${msg}`;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.3s forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  toggleGISLayer(layerKey, checked) {
    const map = this.leafletMap;
    if (!map) return;

    this.gisLayers = this.gisLayers || { flood: null, seismic: null, storm: null };

    if (checked) {
      if (layerKey === 'flood') {
        // Flood plains in Bangkok region
        this.gisLayers.flood = L.polygon([
          [13.55, 100.35], [13.95, 100.35], [13.95, 100.80], [13.55, 100.80]
        ], {
          color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.18, weight: 1.5, dashArray: '4,4'
        }).addTo(map).bindTooltip('100-Year Flood Ingress Zone (Chao Phraya Basin)', { className: 'cat-zone-tooltip' });
      } else if (layerKey === 'seismic') {
        // Seismic zones in Chiang Mai region
        this.gisLayers.seismic = L.polygon([
          [18.50, 98.70], [19.20, 98.70], [19.20, 99.40], [18.50, 99.40]
        ], {
          color: '#f97316', fillColor: '#f97316', fillOpacity: 0.18, weight: 1.5, dashArray: '4,4'
        }).addTo(map).bindTooltip('Active Seismic fault zone (Mae Tha & Phrae Faults)', { className: 'cat-zone-tooltip' });
      } else if (layerKey === 'storm') {
        // Storm surge zones in Pattaya/Rayong region
        this.gisLayers.storm = L.polygon([
          [12.40, 100.60], [13.10, 100.60], [13.10, 101.50], [12.40, 101.50]
        ], {
          color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.18, weight: 1.5, dashArray: '4,4'
        }).addTo(map).bindTooltip('High Storm Surge & Typhoon Path zone', { className: 'cat-zone-tooltip' });
      }
    } else {
      if (this.gisLayers[layerKey]) {
        map.removeLayer(this.gisLayers[layerKey]);
        this.gisLayers[layerKey] = null;
      }
    }
  },

  generateAIAction(type) {
    const q = appState.quotations.find(item => item.quoteNo === appState.selectedQuoteNo);
    if (!q) return;

    let title;
    let body;

    if (type === 'Reinsurance') {
      title = 'Drafted Reinsurance Placement Query';
      body = `
        <div style="font-family: monospace; font-size: 0.8rem; background: var(--bg-app); padding: 15px; border-radius: 6px; line-height: 1.5; color: var(--text-primary); border: 1px solid var(--border-color);">
          <strong>TO:</strong> underwriting.escalations@candela-re.com<br>
          <strong>SUBJECT:</strong> Facultative Capacity Query - ${q.customerName} (${q.quoteNo})<br><br>
          Dear Reinsurance Team,<br><br>
          We are reviewing a commercial risk for ${q.customerName} in the ${q.city} branch. The details are:<br>
          - LOB: ${q.lob}<br>
          - Sum Insured: ${formatINR(q.sumInsured)}<br>
          - Net Retention: ${formatINR(appState.adminRules.netRetention)}<br>
          - Required Treaty Capacity: ${formatINR(q.sumInsured - appState.adminRules.netRetention)}<br><br>
          Due to high value or hazard status, we require a facultative placement review for this account. Please verify capacity availability.<br><br>
          Regards,<br>
          ${appState.personas.find(p => p.key === appState.currentRole)?.name || 'Underwriter'}
        </div>
      `;
    } else if (type === 'Loading') {
      title = 'AI Underwriting Premium Loading Advice';
      body = `
        <div style="font-size: 0.85rem; line-height: 1.5; color: var(--text-secondary);">
          <p>Based on our hazard model, location analysis, and loss history, AI suggests the following premium adjustments:</p>
          <ul style="padding-left: 20px; margin-top: 10px; display: flex; flex-direction: column; gap: 8px;">
            <li><strong>Base Premium:</strong> ${formatINR(q.premiumEstimate)}</li>
            <li><strong>Suggested Loading:</strong> +10.0% due to peril exposure / claims history</li>
            <li><strong>Adjusted Premium:</strong> ${formatINR(q.premiumEstimate * 1.10)}</li>
            <li><strong>Deductible Recommendation:</strong> Maintain standard deductible of ${appState.products[q.lob]?.deductiblePct || 5}% with minimum threshold of ${formatINR(appState.products[q.lob]?.deductibleMin || 50000)}.</li>
          </ul>
        </div>
      `;
    } else {
      title = 'Underwriting Risk Assessment Memorandum';
      body = `
        <div style="font-size: 0.85rem; line-height: 1.5; color: var(--text-secondary); max-height: 350px; overflow-y: auto;">
          <h4 style="margin: 0 0 10px 0; color: var(--text-primary);">RISK ASSESSMENT MEMORANDUM</h4>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
            <tr style="border-bottom: 1px solid var(--border-color);"><td style="padding: 6px 0; font-weight: 600; color: var(--text-primary);">Customer:</td><td style="color: var(--text-secondary);">${q.customerName}</td></tr>
            <tr style="border-bottom: 1px solid var(--border-color);"><td style="padding: 6px 0; font-weight: 600; color: var(--text-primary);">Quote Number:</td><td style="color: var(--text-secondary);">${q.quoteNo}</td></tr>
            <tr style="border-bottom: 1px solid var(--border-color);"><td style="padding: 6px 0; font-weight: 600; color: var(--text-primary);">Occupancy:</td><td style="color: var(--text-secondary);">${q.occupancy}</td></tr>
            <tr style="border-bottom: 1px solid var(--border-color);"><td style="padding: 6px 0; font-weight: 600; color: var(--text-primary);">Risk Category:</td><td style="color: var(--text-secondary);">${q.riskCategory} (Score: ${q.riskScore})</td></tr>
          </table>
          <p><strong>Underwriting Rationale:</strong></p>
          <p>The subject risk represents a ${q.riskCategory} commercial account. Geo-spatial accumulation shows no hazard breaches. The surveyor has verified safety parameters on site. Prior losses have been settled and preventive measures are implemented. Net retention remains within limits.</p>
          <p><strong>Recommendation:</strong> Bind risk at standard rates subject to the warranties defined in the product configurator.</p>
        </div>
      `;
    }

    const footer = `<button class="btn btn-secondary" onclick="app.closeModal()">Close</button>`;
    this.openModal(title, body, footer);
  },

  triggerNewSurvey() {
    this.showToast('Inspection request sent to risk engineering team! Survey scheduled within 48 hours.');
  },

  previewDocument(docType) {
    const q = appState.quotations.find(item => item.quoteNo === appState.selectedQuoteNo);
    if (!q) return;

    let title;
    let body;

    const lob = q.lob;
    const prod = appState.products[lob] || { coverages: [], exclusions: [], warranties: [], deductiblePct: 5, deductibleMin: 50000 };

    const activeCovs = prod.coverages.filter(c => c.selected).map(c => `<li>${c.name}</li>`).join('');
    const activeExcls = prod.exclusions.map(e => `<li>${e}</li>`).join('');
    const activeWarts = prod.warranties.map(w => `<li>${w}</li>`).join('');

    if (docType === 'Quote Slip') {
      title = `Commercial Quotation Slip: ${q.quoteNo}`;
      body = `
        <div style="font-family: 'Courier New', Courier, monospace; font-size: 0.8rem; border: 2px solid #000; padding: 25px; background: #fff; color: #000; max-height: 450px; overflow-y: auto; text-align: left;">
          <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px double #000; padding-bottom: 10px;">
            <h3 style="margin: 0; font-size: 1.1rem; font-weight: 800;">CANDELA INSURANCE (THAILAND) PCL</h3>
            <span style="font-size: 0.7rem;">Head Office: Bangkok Metro Area, Thailand</span>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr><td style="width: 35%; font-weight: 700; padding: 4px 0;">QUOTATION NO:</td><td>${q.quoteNo}</td></tr>
            <tr><td style="font-weight: 700; padding: 4px 0;">CLIENT:</td><td>${q.customerName}</td></tr>
            <tr><td style="font-weight: 700; padding: 4px 0;">LINE OF BUSINESS:</td><td>${q.lob} - ${q.product}</td></tr>
            <tr><td style="font-weight: 700; padding: 4px 0;">LOCATION:</td><td>${q.city}, Thailand</td></tr>
            <tr><td style="font-weight: 700; padding: 4px 0;">SUM INSURED (TIV):</td><td>${formatINR(q.sumInsured)}</td></tr>
            <tr><td style="font-weight: 700; padding: 4px 0;">NET RETENTION:</td><td>${formatINR(appState.adminRules.netRetention)}</td></tr>
            <tr><td style="font-weight: 700; padding: 4px 0;">ESTIMATED PREMIUM:</td><td>${formatINR(q.premiumEstimate)}</td></tr>
          </table>

          <div style="margin-bottom: 15px;">
            <div style="font-weight: 700; text-decoration: underline; margin-bottom: 5px;">CORE COVERAGES INCLUDED:</div>
            <ul style="margin: 0; padding-left: 20px;">
              ${activeCovs || '<li>Standard Coverages</li>'}
            </ul>
          </div>

          <div style="margin-bottom: 15px;">
            <div style="font-weight: 700; text-decoration: underline; margin-bottom: 5px;">EXCLUSIONS:</div>
            <ul style="margin: 0; padding-left: 20px;">
              ${activeExcls || '<li>Standard Exclusions</li>'}
            </ul>
          </div>

          <div style="margin-bottom: 15px;">
            <div style="font-weight: 700; text-decoration: underline; margin-bottom: 5px;">WARRANTIES & SPECIAL CONDITIONS:</div>
            <ul style="margin: 0; padding-left: 20px;">
              ${activeWarts || '<li>Standard Warranties</li>'}
            </ul>
          </div>

          <div style="margin-top: 30px; border-top: 1px dashed #000; padding-top: 15px; display: flex; justify-content: space-between;">
            <div>
              <div style="font-size: 0.65rem; margin-bottom: 25px;">SIGNED ON BEHALF OF INSURER:</div>
              <div style="font-weight: 700;">[DIGITALLY SIGNED]</div>
              <div style="font-size: 0.7rem; color: #555;">Candela Labs Underwriter</div>
            </div>
            <div>
              <div style="font-size: 0.65rem; margin-bottom: 25px;">ACCEPTED BY BROKER / INSURED:</div>
              <div style="border-bottom: 1px solid #000; width: 150px; height: 15px;"></div>
              <div style="font-size: 0.7rem; color: #555; margin-top: 4px;">Authorized Signatory</div>
            </div>
          </div>
        </div>
      `;
    } else {
      title = `Commercial Policy Schedule: POL-${q.quoteNo.substring(2)}`;
      body = `
        <div style="font-family: 'Courier New', Courier, monospace; font-size: 0.8rem; border: 2px solid #000; padding: 25px; background: #fff; color: #000; max-height: 450px; overflow-y: auto; text-align: left;">
          <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px double #000; padding-bottom: 10px;">
            <h3 style="margin: 0; font-size: 1.1rem; font-weight: 800;">COMMERCIAL INSURANCE POLICY SCHEDULE</h3>
            <span style="font-size: 0.7rem;">Head Office: Bangkok Metro Area, Thailand</span>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr><td style="width: 35%; font-weight: 700; padding: 4px 0;">POLICY NUMBER:</td><td>POL-${q.quoteNo.substring(2)}</td></tr>
            <tr><td style="font-weight: 700; padding: 4px 0;">CLIENT:</td><td>${q.customerName}</td></tr>
            <tr><td style="font-weight: 700; padding: 4px 0;">LOB:</td><td>${q.lob}</td></tr>
            <tr><td style="font-weight: 700; padding: 4px 0;">EFFECTIVE DATE:</td><td>${new Date().toISOString().substring(0, 10)}</td></tr>
            <tr><td style="font-weight: 700; padding: 4px 0;">SUM INSURED:</td><td>${formatINR(q.sumInsured)}</td></tr>
            <tr><td style="font-weight: 700; padding: 4px 0;">DEDUCTIBLES:</td><td>${prod.deductiblePct}% of claim (min ${formatINR(prod.deductibleMin)})</td></tr>
          </table>

          <div style="margin-bottom: 15px;">
            <div style="font-weight: 700; text-decoration: underline; margin-bottom: 5px;">INCLUDED COVERS:</div>
            <ul style="margin: 0; padding-left: 20px;">
              ${activeCovs || '<li>Standard covers</li>'}
            </ul>
          </div>
          
          <div style="margin-top: 30px; text-align: center; border-top: 1px dashed #000; padding-top: 15px;">
            <div style="font-weight: 800; color: #059669; font-size: 0.9rem;">POLICY ACTIVE & CERTIFIED</div>
          </div>
        </div>
      `;
    }

    const footer = `
      <button class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
      ${docType === 'Quote Slip' && q.esignStatus.uw !== 'Signed' && q.esignStatus.uw !== 'Generated & Signed' ? `<button class="btn btn-primary" onclick="app.signQuoteSlipDocument('${q.quoteNo}')"><i class="lucide lucide-edit"></i> Sign and Release</button>` : ''}
    `;

    this.openModal(title, body, footer);
  },

  signQuoteSlipDocument(quoteNo) {
    const q = appState.quotations.find(item => item.quoteNo === quoteNo);
    if (!q) return;

    q.esignStatus.uw = 'Generated & Signed';
    this.closeModal();
    this.showToast('Quote Slip signed digitally! e-Sign trigger is now available.');
    this.renderQuotationDetailReview(quoteNo);

    this.addNotification('System Alert', `Underwriter signed Quote Slip for ${quoteNo}. Ready for Broker e-sign.`);
  },

  triggerESign() {
    const q = appState.quotations.find(item => item.quoteNo === appState.selectedQuoteNo);
    if (!q) return;

    const btn = document.getElementById('btn-trigger-esign');
    btn.innerHTML = `<span class="spinner" style="display:inline-block; width:12px; height:12px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; animation:spin 1s linear infinite; margin-right:6px; vertical-align:middle;"></span> Sending...`;
    btn.disabled = true;

    setTimeout(() => {
      q.esignStatus.broker = 'e-Signed';
      q.esignStatus.uw = 'Signed';
      this.showToast('Broker has e-signed the contract! Policy is ready to bind.');
      this.renderQuotationDetailReview(q.quoteNo);
      this.addNotification('e-Sign Notification', `Broker completed e-signature for ${q.quoteNo}.`);
    }, 1500);
  }
};
