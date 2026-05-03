// ============================================
// FHIR Operations Configuration
// Based on Aklan FHIR Fundamentals 2026 Postman Collection
// ============================================

const FHIR_OPERATIONS = {
    // ═══════════════════════════════════════════════════════════════════════════════
    // PRIMARY OPERATIONS (Main Workflow)
    // ═══════════════════════════════════════════════════════════════════════════════
    
    // 1. Create Patient (Rico) - Starting point
    'create-patient': {
        id: 'create-patient',
        name: 'Create Patient (Rico)',
        icon: '➕',
        method: 'PUT',
        endpoint: '/Patient',
        server: 'cdr',
        category: 'primary',
        description: 'Create Rico Dela Cruz patient resource on the server',
        teaching: {
            title: 'Creating Resources: ID vs Identifier',
            content: `
                <p>Create Rico on the public test server using <code>conditional update</code> (PUT with search criteria).</p>
                <p>Response headers include <code>Location:</code> — that is your new resource URL.</p>
                <p><strong>Teaching moment:</strong> The server assigns the <code>id</code>. Your local ID <code>PH-TB-2026-0142</code> lives in the <code>identifier</code> field, not in the <code>id</code>.</p>
                <p>The distinction matters:</p>
                <ul>
                    <li><code>id</code> — Server-scoped (unique on this server only)</li>
                    <li><code>identifier</code> — Business-scoped (globally unique when combined with system)</li>
                </ul>
            `
        },
        hasBody: true,
        bodyTemplate: {
            resourceType: 'Patient',
            meta: {
                tag: [
                    {
                        system: 'http://workshop.fhir.example.org',
                        code: 'training-sample',
                        display: 'Aklan FHIR Fundamentals training — not real patient data'
                    }
                ]
            },
            identifier: [
                {
                    use: 'official',
                    system: 'http://ntp.doh.gov.ph/ids',
                    value: 'PH-TB-2026-0142'
                }
            ],
            name: [
                {
                    use: 'official',
                    family: 'Dela Cruz',
                    given: ['Rico']
                }
            ],
            gender: 'male',
            birthDate: '1992-03-15',
            address: [
                {
                    use: 'home',
                    line: ['Barangay Malaya'],
                    city: 'Quezon City',
                    country: 'PH'
                }
            ]
        },
        params: [
            {
                name: 'identifier',
                label: 'Conditional Update Identifier',
                type: 'text',
                default: 'http://ntp.doh.gov.ph/ids|PH-TB-2026-0142',
                required: true,
                description: 'Query parameter for conditional update (system|value)'
            }
        ],
        formFields: [
            { name: 'identifier[0].value', label: 'Patient ID', type: 'text', default: 'PH-TB-2026-0142', path: 'identifier.0.value' },
            { name: 'name[0].family', label: 'Family Name', type: 'text', default: 'Dela Cruz', path: 'name.0.family' },
            { name: 'name[0].given[0]', label: 'Given Name', type: 'text', default: 'Rico', path: 'name.0.given.0' },
            { name: 'gender', label: 'Gender', type: 'select', default: 'male', path: 'gender', options: [
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
                { value: 'other', label: 'Other' },
                { value: 'unknown', label: 'Unknown' }
            ]},
            { name: 'birthDate', label: 'Birth Date', type: 'date', default: '1992-03-15', path: 'birthDate' },
            { name: 'address[0].city', label: 'City', type: 'text', default: 'Quezon City', path: 'address.0.city' },
            { name: 'address[0].country', label: 'Country', type: 'text', default: 'PH', path: 'address.0.country' }
        ]
    },

    // 2. Search Patients by name (the collision problem)
    'search-patients': {
        id: 'search-patients',
        name: 'Search Patients by Name',
        icon: '🔍',
        method: 'GET',
        endpoint: '/Patient',
        server: 'cdr',
        category: 'primary',
        description: 'The name-collision problem — how many "Rico Dela Cruz" patients exist?',
        teaching: {
            title: 'The Name Collision Problem',
            content: `
                <p>How many "Rico Dela Cruz" patients exist on this public server? Probably many.</p>
                <p><strong>Teaching moment:</strong> Name matching is NOT patient matching. This is exactly the problem a <strong>Master Patient Index / PhilSys</strong> linkage solves.</p>
                <p>In real-world scenarios, searching by name alone can return hundreds of matches. That's why we need unique identifiers.</p>
            `
        },
        hasBody: false,
        params: [
            {
                name: 'family',
                label: 'Family Name',
                type: 'text',
                default: 'Dela Cruz',
                required: false,
                description: 'Patient family name'
            },
            {
                name: 'given',
                label: 'Given Name',
                type: 'text',
                default: 'Rico',
                required: false,
                description: 'Patient first/given name'
            },
            {
                name: '_count',
                label: 'Result Count',
                type: 'number',
                default: '5',
                required: false,
                description: 'Maximum number of results to return'
            }
        ]
    },

    // 3. Search Observations by LOINC code
    'search-observations': {
        id: 'search-observations',
        name: 'Search Observations',
        icon: '📊',
        method: 'GET',
        endpoint: '/Observation',
        server: 'cdr',
        category: 'primary',
        description: 'Search for observations using LOINC codes',
        teaching: {
            title: 'Semantic Interoperability in Action',
            content: `
                <p>Search for body weight observations using the LOINC code <code>29463-7</code>.</p>
                <p>Note the search syntax: <code>code=SYSTEM|CODE</code>. The code alone is ambiguous. The system+code pair is globally unique.</p>
                <p><strong>Teaching moment:</strong> This is <em>semantic interoperability</em> in action. Any server in the world that implemented the same standard would return the same conceptual answer.</p>
                <p>Common LOINC codes:</p>
                <ul>
                    <li><code>29463-7</code> — Body weight</li>
                    <li><code>8302-2</code> — Body height</li>
                    <li><code>8480-6</code> — Systolic blood pressure</li>
                    <li><code>8462-4</code> — Diastolic blood pressure</li>
                </ul>
            `
        },
        hasBody: false,
        params: [
            {
                name: 'code',
                label: 'LOINC Code',
                type: 'select',
                default: 'http://loinc.org|29463-7',
                required: false,
                description: 'LOINC code with system',
                options: [
                    { value: 'http://loinc.org|29463-7', label: '29463-7 - Body weight' },
                    { value: 'http://loinc.org|8302-2', label: '8302-2 - Body height' },
                    { value: 'http://loinc.org|8480-6', label: '8480-6 - Systolic BP' },
                    { value: 'http://loinc.org|8462-4', label: '8462-4 - Diastolic BP' },
                    { value: 'http://loinc.org|8867-4', label: '8867-4 - Heart rate' }
                ]
            },
            {
                name: '_count',
                label: 'Result Count',
                type: 'number',
                default: '5',
                required: false,
                description: 'Maximum results to return'
            }
        ]
    },

    // 4. Search with _include
    'search-include': {
        id: 'search-include',
        name: 'Search with _include',
        icon: '🔗',
        method: 'GET',
        endpoint: '/Observation',
        server: 'cdr',
        category: 'primary',
        description: 'Fetch observations AND their referenced patients in one call',
        teaching: {
            title: 'Efficient Data Retrieval with _include',
            content: `
                <p>Fetch body-weight observations AND the patients they reference, in one call.</p>
                <p>The response is a searchset <code>Bundle</code> with <code>entry[].search.mode</code> = 'match' or 'include'.</p>
                <p><strong>Teaching moment:</strong> FHIR references are <em>lazy</em>. The observation doesn't repeat patient data — it points to it.</p>
                <p><code>_include</code> tells the server to materialize the references so your client doesn't make N extra calls. This is crucial for performance.</p>
                <p>Without <code>_include</code>, you would need to:</p>
                <ol>
                    <li>Get observations (1 call)</li>
                    <li>Extract patient references</li>
                    <li>Get each patient individually (N calls)</li>
                </ol>
                <p>With <code>_include</code>: 1 call gets everything!</p>
            `
        },
        hasBody: false,
        params: [
            {
                name: 'code',
                label: 'LOINC Code',
                type: 'select',
                default: 'http://loinc.org|29463-7',
                required: false,
                description: 'Observation code to search',
                options: [
                    { value: 'http://loinc.org|29463-7', label: '29463-7 - Body weight' },
                    { value: 'http://loinc.org|8302-2', label: '8302-2 - Body height' },
                    { value: 'http://loinc.org|8480-6', label: '8480-6 - Systolic BP' }
                ]
            },
            {
                name: '_include',
                label: 'Include References',
                type: 'checkbox',
                default: 'Observation:subject',
                checked: true,
                required: false,
                description: 'Include referenced Patient resources'
            },
            {
                name: '_count',
                label: 'Result Count',
                type: 'number',
                default: '3',
                required: false,
                description: 'Maximum results'
            }
        ]
    },

    // ═══════════════════════════════════════════════════════════════════════════════
    // SECONDARY OPERATIONS (Additional Scenarios)
    // ═══════════════════════════════════════════════════════════════════════════════

    // 5. Find Rico by Identifier
    'get-rico': {
        id: 'get-rico',
        name: 'Find Rico by Identifier',
        icon: '🎯',
        method: 'GET',
        endpoint: '/Patient',
        server: 'cdr',
        category: 'secondary',
        description: 'Search for Rico using our own identifier system',
        teaching: {
            title: 'The Round Trip Test',
            content: `
                <p>Search Rico back using our OWN identifier system — not the server-assigned id.</p>
                <p>This is the round trip. In production, this is exactly how one facility would retrieve a patient that another facility created.</p>
                <p><strong>Teaching moment:</strong> Without the identifier <code>system</code> URL, you are searching by a string that could belong to anyone.</p>
                <p>The full identifier <code>http://ntp.doh.gov.ph/ids|PH-TB-2026-0142</code> combines:</p>
                <ul>
                    <li><strong>System:</strong> <code>http://ntp.doh.gov.ph/ids</code> — The namespace/authority</li>
                    <li><strong>Value:</strong> <code>PH-TB-2026-0142</code> — The actual ID within that namespace</li>
                </ul>
            `
        },
        hasBody: false,
        params: [
            {
                name: 'identifier',
                label: 'Identifier (system|value)',
                type: 'text',
                default: 'http://ntp.doh.gov.ph/ids|PH-TB-2026-0142',
                required: true,
                description: 'Full identifier with system and value separated by |'
            }
        ]
    },

    // 6. The identifier-namespace problem (Scenario 1)
    'namespace-problem': {
        id: 'namespace-problem',
        name: 'Namespace Problem Demo',
        icon: '⚠️',
        method: 'GET',
        endpoint: '/Patient',
        server: 'cdr',
        category: 'secondary',
        description: 'Same identifier VALUE, different SYSTEM = no match',
        teaching: {
            title: 'Scenario 1: The Identifier Governance Problem',
            content: `
                <p>Same identifier VALUE. Different identifier SYSTEM. Result: <strong>no match</strong>.</p>
                <p>This is <strong>Scenario 1</strong> in your exercise packet. The receiving hospital assumed the identifier belongs to its own namespace. It doesn't.</p>
                <p><strong>Teaching moment:</strong> Semantic standards can't fix this. Syntactic compliance can't fix this.</p>
                <p>Only <strong>identifier governance</strong> — a Master Patient Index or a national identity layer (PhilSys) — can.</p>
                <p>This is why WHO SMART Guideline L3 (semantic standard) needs an L4 that includes <strong>governance</strong>.</p>
            `
        },
        hasBody: false,
        params: [
            {
                name: 'identifier',
                label: 'Wrong Identifier System',
                type: 'text',
                default: 'http://different-hospital.example.org/mrn|PH-TB-2026-0142',
                required: true,
                description: 'Different system with same value = no results'
            }
        ]
    },

    // 7. Retrieve a specific Patient (by id) - Bonus/Utility
    'get-patient': {
        id: 'get-patient',
        name: 'Get Patient by ID',
        icon: '👤',
        method: 'GET',
        endpoint: '/Patient/{id}',
        server: 'cdr',
        category: 'secondary',
        description: 'Retrieve a specific patient resource by server-assigned ID',
        teaching: {
            title: 'Understanding the Patient Resource Structure',
            content: `
                <p>The classic FHIR Patient resource. Note the structure:</p>
                <ul>
                    <li><code>resourceType</code>, <code>id</code>, <code>meta</code> — Resource metadata</li>
                    <li><code>identifier</code> — Array of system + value (NOT just value!)</li>
                    <li><code>name</code> — Array with use, family, given</li>
                    <li><code>telecom</code>, <code>gender</code>, <code>birthDate</code>, <code>address</code></li>
                </ul>
                <p><strong>Teaching moment:</strong> Every field has a <em>DEFINED place</em>. Compare this to a free-text clinical note where structure is unpredictable.</p>
            `
        },
        hasBody: false,
        params: [
            {
                name: 'id',
                label: 'Patient ID',
                type: 'text',
                default: 'example',
                required: true,
                description: 'Server-assigned patient ID (e.g., "example", "123")'
            }
        ]
    },

    // ═══════════════════════════════════════════════════════════════════════════════
    // ADVANCED/DIAGNOSTICS (Hidden by default)
    // ═══════════════════════════════════════════════════════════════════════════════

    // 8. Server CapabilityStatement (Advanced - for developers)
    'capability': {
        id: 'capability',
        name: 'Server CapabilityStatement',
        icon: '⚙️',
        method: 'GET',
        endpoint: '/metadata',
        server: 'cdr',
        category: 'advanced',
        description: 'Discover what this FHIR server can do (Advanced/Diagnostics)',
        teaching: {
            title: 'Why CapabilityStatement Matters',
            content: `
                <p>Every FHIR server must publish what it can do. This is the "menu" that tells clients:</p>
                <ul>
                    <li><strong>software.name, software.version</strong> — What server software is running</li>
                    <li><strong>rest[0].resource</strong> — Every resource type supported</li>
                    <li><strong>format</strong> — Which serializations (json, xml)</li>
                </ul>
                <p><strong>Teaching moment:</strong> This is the <em>DISCOVERABILITY</em> that HL7 v2 never had.</p>
            `
        },
        hasBody: false,
        params: []
    }
};

// Terminology Operations
const TERMINOLOGY_OPERATIONS = {
    'valueset-search': {
        id: 'valueset-search',
        name: 'Search ValueSets',
        icon: '🔍',
        method: 'GET',
        endpoint: '/ValueSet',
        server: 'tx',
        description: 'Search for ValueSets by name or URL',
        hasBody: false,
        params: [
            {
                name: 'name',
                label: 'Name',
                type: 'text',
                default: '',
                required: false,
                description: 'Search by ValueSet name'
            },
            {
                name: 'url',
                label: 'URL',
                type: 'text',
                default: '',
                required: false,
                description: 'Search by canonical URL'
            }
        ]
    },
    'valueset-expand': {
        id: 'valueset-expand',
        name: 'Expand ValueSet',
        icon: '📖',
        method: 'GET',
        endpoint: '/ValueSet/{id}/$expand',
        server: 'tx',
        description: 'Expand a ValueSet to see all included codes',
        hasBody: false,
        params: [
            {
                name: 'id',
                label: 'ValueSet',
                type: 'dynamic-dropdown',
                default: '',
                required: true,
                description: 'Select a ValueSet to expand',
                fetchSource: 'valuesets',
                optionLabelField: 'name',
                optionValueField: 'id',
                optionSubLabelField: 'status'
            }
        ]
    },
    'code-lookup': {
        id: 'code-lookup',
        name: 'Lookup Code',
        icon: '🔎',
        method: 'GET',
        endpoint: '/CodeSystem/$lookup',
        server: 'tx',
        description: 'Lookup code details (display, properties)',
        hasBody: false,
        params: [
            {
                name: 'system',
                label: 'Code System',
                type: 'select',
                default: 'http://loinc.org',
                required: true,
                description: 'Code system URL',
                options: [
                    { value: 'http://loinc.org', label: 'LOINC (http://loinc.org)' },
                    { value: 'http://snomed.info/sct', label: 'SNOMED CT (http://snomed.info/sct)' },
                    { value: 'http://www.nlm.nih.gov/research/umls/rxnorm', label: 'RxNorm (RxNorm)' },
                    { value: 'http://hl7.org/fhir/sid/icd-10-cm', label: 'ICD-10-CM' },
                    { value: 'http://terminology.hl7.org/CodeSystem/v2-0487', label: 'HL7 v2 Specimen Type' }
                ]
            },
            {
                name: 'code',
                label: 'Code',
                type: 'text',
                default: '29463-7',
                required: true,
                description: 'Code to lookup'
            }
        ]
    }
};

// Pre-defined ValueSet options for common FHIR fields
// These will be used until dynamic fetching is complete
const FHIR_VALUESETS = {
    // Administrative Gender - http://hl7.org/fhir/ValueSet/administrative-gender
    'administrative-gender': [
        { value: 'male', label: 'Male', system: 'http://hl7.org/fhir/administrative-gender' },
        { value: 'female', label: 'Female', system: 'http://hl7.org/fhir/administrative-gender' },
        { value: 'other', label: 'Other', system: 'http://hl7.org/fhir/administrative-gender' },
        { value: 'unknown', label: 'Unknown', system: 'http://hl7.org/fhir/administrative-gender' }
    ],
    // Identifier Use - http://hl7.org/fhir/ValueSet/identifier-use
    'identifier-use': [
        { value: 'usual', label: 'Usual - The identifier recommended for display and use in real-world interactions' },
        { value: 'official', label: 'Official - The authoritative identifier for the person/item' },
        { value: 'temp', label: 'Temp - A temporary identifier (e.g., emergency encounter ID)' },
        { value: 'secondary', label: 'Secondary - An identifier that was assigned in secondary use (e.g., import from external system)' },
        { value: 'old', label: 'Old - The identifier id no longer considered valid (but may be kept for historical reasons)' }
    ],
    // Name Use - http://hl7.org/fhir/ValueSet/name-use
    'name-use': [
        { value: 'usual', label: 'Usual - Known as/conventional/the one you normally use' },
        { value: 'official', label: 'Official - The formal name as registered in an official registry' },
        { value: 'temp', label: 'Temp - A temporary name (e.g., anonymous name during admission)' },
        { value: 'nickname', label: 'Nickname - A name that is used to address the person in an informal manner' },
        { value: 'anonymous', label: 'Anonymous - Anonymous assigned name, alias, or pseudonym' },
        { value: 'old', label: 'Old - This name is no longer in use (or was never correct)' },
        { value: 'maiden', label: 'Maiden - Name changed for Marriage (used for woman who changed her last name)' }
    ],
    // Address Use - http://hl7.org/fhir/ValueSet/address-use
    'address-use': [
        { value: 'home', label: 'Home - A communication address at a home' },
        { value: 'work', label: 'Work - An office address' },
        { value: 'temp', label: 'Temp - A temporary address (e.g., during hospital stay)' },
        { value: 'old', label: 'Old - This address is no longer in use (or was never correct)' },
        { value: 'billing', label: 'Billing - An address to be used to send bills, invoices, or financial statements' }
    ],
    // Contact Point System - http://hl7.org/fhir/ValueSet/contact-point-system
    'contact-point-system': [
        { value: 'phone', label: 'Phone - The value is a telephone number used for voice calls' },
        { value: 'fax', label: 'Fax - The value is a fax machine' },
        { value: 'email', label: 'Email - The value is an email address' },
        { value: 'pager', label: 'Pager - The value is a pager number' },
        { value: 'url', label: 'URL - The value is a URL (e.g., website, email, ftp, etc.)' },
        { value: 'sms', label: 'SMS - The value is a telephone number for SMS/text messages' },
        { value: 'other', label: 'Other - A contact that is not a phone, fax, pager, email, or url' }
    ],
    // Contact Point Use - http://hl7.org/fhir/ValueSet/contact-point-use
    'contact-point-use': [
        { value: 'home', label: 'Home - A communication contact point at a home' },
        { value: 'work', label: 'Work - An office contact point' },
        { value: 'temp', label: 'Temp - A temporary contact point' },
        { value: 'old', label: 'Old - This contact point is no longer in use (or was never correct)' },
        { value: 'mobile', label: 'Mobile - A telecommunication device that moves and stays with its owner' }
    ],
    // Address Type - http://hl7.org/fhir/ValueSet/address-type
    'address-type': [
        { value: 'postal', label: 'Postal - Mailing addresses (PO Boxes, care-of addresses)' },
        { value: 'physical', label: 'Physical - A physical address that can be visited' },
        { value: 'both', label: 'Both - An address that is both physical and postal' }
    ]
};

// Dynamic ValueSet cache (will be populated from server)
const DYNAMIC_VALUESETS = {
    valuesets: [], // Will hold ValueSets fetched from tx.fhirlab.net
    lastFetched: null
};

// Server configurations
const SERVERS = {
    cdr: {
        name: 'Clinical Data Repository',
        url: 'https://cdr.fhirlab.net/fhir',
        description: 'HAPI FHIR test server for clinical resources'
    },
    tx: {
        name: 'Terminology Server',
        url: 'https://tx.fhirlab.net/fhir',
        description: 'FHIR terminology server for ValueSets and CodeSystems'
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FHIR_OPERATIONS, TERMINOLOGY_OPERATIONS, SERVERS };
}
