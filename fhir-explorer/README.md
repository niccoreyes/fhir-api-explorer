# FHIR API Explorer - FAHLA 2026

An interactive web application for exploring FHIR APIs, designed for both clinicians and developers. Built for the FAHLA 2026 Workshop 3 on FHIR Interoperability.

## Features

### Dual Interface
- **Clinician View**: User-friendly forms for entering patient data and search parameters
- **Developer View**: Direct JSON editing with syntax highlighting

### Live JSON Diff
- See real-time JSON changes as you modify forms
- Color-coded diff showing additions (green), removals (red), and changes (yellow)

### All 8 Operations from Postman Collection
1. **Server CapabilityStatement** - Discover server capabilities
2. **Search Patients by Name** - Demonstrates the name-collision problem
3. **Get Patient by ID** - Retrieve specific patient resources
4. **Search Observations** - Filter by LOINC codes
5. **Create Patient (Rico)** - Create patient with PUT (conditional update)
6. **Find Rico by Identifier** - Search by business identifier
7. **Namespace Problem Demo** - Shows identifier governance issues
8. **Search with _include** - Efficient multi-resource retrieval

### Terminology Browser
- Search ValueSets from tx.fhirlab.net/fhir
- Expand ValueSets to see codes — Now with dropdown of 100+ real ValueSets from the server!
- Lookup code details with dropdown for common code systems (LOINC, SNOMED CT, RxNorm, ICD-10-CM)

### ValueSet-Powered Dropdowns for Clinicians
All coded fields in the Create Patient form now use real FHIR ValueSet dropdowns:
- **Gender** — Uses `administrative-gender` ValueSet (Male, Female, Other, Unknown)
- **Identifier Use** — Uses `identifier-use` ValueSet (Official, Usual, Temp, Secondary, Old)
- **Name Use** — Uses `name-use` ValueSet (Official, Usual, Nickname, Maiden, etc.)
- **Address Use** — Uses `address-use` ValueSet (Home, Work, Temp, Billing)
- **Address Type** — Uses `address-type` ValueSet (Postal, Physical, Both)

The app fetches ValueSets from tx.fhirlab.net/fhir on startup and caches them for 1 hour.

### Educational Tooltips
Each operation includes "Learn More" panels explaining:
- Clinical relevance
- FHIR concepts
- Real-world interoperability challenges

## Quick Start

### Option 1: Open Directly
Simply open `index.html` in your browser:
```bash
# On macOS
open fhir-explorer/index.html

# On Windows
start fhir-explorer/index.html

# On Linux
xdg-open fhir-explorer/index.html
```

### Option 2: Use a Local Server (Recommended for CORS)
```bash
# Using Python 3
cd fhir-explorer && python3 -m http.server 8080

# Using Python 2
cd fhir-explorer && python -m SimpleHTTPServer 8080

# Using Node.js (npx serve)
cd fhir-explorer && npx serve

# Using Bun
cd fhir-explorer && bunx serve
```

Then open: http://localhost:8080

### Option 3: Using bunx serve (as suggested)
```bash
cd fhir-explorer
bunx serve
```

## File Structure

```
fhir-explorer/
├── index.html          # Main HTML file
├── css/
│   └── styles.css      # All styling with mobile responsiveness
├── js/
│   ├── operations.js   # FHIR operation configurations
│   ├── diff.js         # JSON diff algorithm and utilities
│   ├── fhir-client.js  # API client for CDR + TX servers
│   └── app.js          # Main application logic
└── README.md           # This file
```

## Server Endpoints

| Server | URL | Purpose |
|--------|-----|---------|
| CDR (Clinical Data) | `https://cdr.fhirlab.net/fhir` | Patient, Observation resources |
| TX (Terminology) | `https://tx.fhirlab.net/fhir` | ValueSets, CodeSystems |

## Mobile Support

The app is fully responsive and mobile-friendly:
- Horizontal scrolling operation list on mobile
- Touch-friendly inputs (min 44px touch targets)
- Optimized layouts for small screens
- Floating action button for quick scroll-to-top

## Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+
- Mobile Safari (iOS 13+)
- Chrome Mobile (Android 10+)

## Usage Guide

### For Clinicians
1. Select an operation from the left sidebar
2. Fill in the form fields (Family Name, Given Name, etc.)
3. Watch the JSON Diff panel show your changes
4. Click "Execute Request" to send to the FHIR server
5. View the response in the formatted JSON viewer

### For Developers
1. Toggle to "Developer View" using the switch in the header
2. Edit JSON directly in the text area
3. Or use the Clinician form to generate JSON
4. See live diff of your changes from the template
5. Execute and inspect raw HTTP responses

### Using the Terminology Browser
1. Click on "Search ValueSets" in the Terminology section
2. Enter a name or URL to search
3. Execute to see results from tx.fhirlab.net/fhir

## Troubleshooting

### CORS Errors
If you see CORS errors in the response:
- The FHIR servers must allow cross-origin requests
- For local testing, you can use a browser extension to disable CORS
- Or use a CORS proxy (not recommended for production)

### Mobile Issues
- Make sure you're using a modern mobile browser
- The app requires JavaScript to be enabled
- For iOS: Use Safari or Chrome (both work well)

## Educational Content

The app preserves all teaching moments from the original Postman collection:

### Scenario 1: The Identifier Namespace Problem
The "Namespace Problem Demo" operation shows how the same identifier value with a different system URL returns no results. This demonstrates why Master Patient Index / PhilSys governance is critical.

### The Name Collision Problem
The "Search Patients by Name" operation shows how searching by name alone can return multiple patients, highlighting the need for unique identifiers.

### Semantic Interoperability
The "Search Observations" operation demonstrates how LOINC codes enable semantic interoperability across different systems.

## Credits

- **Original Postman Collection**: FAHLA 2026 Workshop 3 by FHIRLAB
- **FHIR Servers**: cdr.fhirlab.net and tx.fhirlab.net (HAPI FHIR test servers)
- **Design**: Clinical theme with accessibility in mind

## License

This is an educational tool for the FAHLA 2026 workshop. Not for production use with real patient data.

## Safety Warning

⚠️ **DO NOT use with real patient data.** All requests go to public test servers. Data may be visible to others and wiped at any time.
