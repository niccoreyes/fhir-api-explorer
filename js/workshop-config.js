// ============================================
// FAHLA 2026 Workshop Configuration
// ============================================

const WORKSHOP_CONFIG = {
    version: '1.0.0',
    name: 'Aklan FHIR Fundamentals Training 2026',
    
    // Case configurations
    cases: {
        case1: {
            id: 'case1',
            name: 'Unique Name Success',
            shortName: 'Case 1',
            patient: {
                name: 'Rico Dela Cruz',
                familyName: 'Dela Cruz',
                givenName: 'Rico',
                id: 'UNIQUE_ID',
                description: 'Unique name, easy to identify'
            },
            color: '#14b8a6',
            learning: 'Basic FHIR exchange works smoothly when patient names are unique',
            outcomes: [
                { icon: '✅', text: 'Easy to search', type: 'success' },
                { icon: '✅', text: 'Quick match', type: 'success' },
                { icon: '✅', text: 'Single result', type: 'success' }
            ],
            // Group assignments for Case 1
            groups: {
                create: [1, 2],  // Groups 1 & 2 CREATE
                search: [3, 4, 5]  // Groups 3, 4, 5 SEARCH
            }
        },
        case2: {
            id: 'case2',
            name: 'Common Name Challenge',
            shortName: 'Case 2',
            patient: {
                name: 'Jose Dimasalang',
                familyName: 'Dimasalang',
                givenName: 'Jose',
                id: 'NATIONAL_ID',
                description: 'Common name, potential duplicates'
            },
            color: '#f59e0b',
            learning: 'Why MPI and Patient Registry are critical for common names',
            outcomes: [
                { icon: '⚠️', text: 'Multiple matches', type: 'warning' },
                { icon: '❌', text: 'Wrong patient risk', type: 'error' },
                { icon: '💡', text: 'Need National ID', type: 'solution' }
            ],
            // Group assignments for Case 2 (swapped)
            groups: {
                create: [3, 4, 5],  // Groups 3, 4, 5 CREATE
                search: [1, 2]      // Groups 1 & 2 SEARCH
            }
        }
    },

    // Group definitions with consistent colors
    groups: {
        1: {
            id: 1,
            name: 'Group 1',
            indicator: '🔷',
            color: '#3b82f6',
            shortName: 'G1'
        },
        2: {
            id: 2,
            name: 'Group 2',
            indicator: '💜',
            color: '#8b5cf6',
            shortName: 'G2'
        },
        3: {
            id: 3,
            name: 'Group 3',
            indicator: '🩷',
            color: '#ec4899',
            shortName: 'G3'
        },
        4: {
            id: 4,
            name: 'Group 4',
            indicator: '💚',
            color: '#10b981',
            shortName: 'G4'
        },
        5: {
            id: 5,
            name: 'Group 5',
            indicator: '💛',
            color: '#f59e0b',
            shortName: 'G5'
        }
    },

    // System roles
    roles: {
        rhu: {
            name: 'RHU',
            fullName: 'Rural Health Unit',
            description: 'Primary care facility - sending system',
            color: '#3b82f6'
        },
        hospital: {
            name: 'Hospital',
            fullName: 'Provincial Hospital',
            description: 'Secondary care - receiving system',
            color: '#ec4899'
        },
        shr: {
            name: 'FHIRLab SHR',
            fullName: 'Shared Health Record',
            description: 'Central FHIR repository',
            color: '#f97316'
        }
    },

    // Task definitions
    tasks: {
        create: {
            type: 'create',
            title: 'Create Patient',
            description: 'Create patient record in FHIRLab SHR',
            method: 'POST',
            endpoint: '/Patient',
            icon: '📝',
            role: 'rhu',
            successMessage: 'Patient created successfully!',
            waitingMessage: 'Other groups will now search for this patient'
        },
        search: {
            type: 'search',
            title: 'Search Patient',
            description: 'Find the patient in FHIRLab SHR',
            method: 'GET',
            endpoint: '/Patient',
            icon: '🔍',
            role: 'hospital',
            successMessage: 'Patient found!',
            waitingMessage: 'Waiting for patient to be created...'
        }
    },

    // FHIR server configuration
    servers: {
        cdr: {
            name: 'Clinical Data Repository',
            url: 'https://cdr.fhirlab.net/fhir',
            type: 'CDR'
        },
        tx: {
            name: 'Terminology Server',
            url: 'https://tx.fhirlab.net/fhir',
            type: 'TX'
        }
    },

    // Sync configuration
    sync: {
        pollingInterval: 5000,  // 5 seconds
        websocketEnabled: true,
        websocketTestUrl: 'wss://cdr.fhirlab.net/ws',
        debounceTime: 300  // ms for form changes
    },

    // Animation configuration
    animation: {
        packetSpeed: 1000,  // ms
        progressSpeed: 500,
        fadeDuration: 300
    }
};

// Utility to get group task for a case
function getGroupTask(caseId, groupId) {
    const caseConfig = WORKSHOP_CONFIG.cases[caseId];
    if (!caseConfig) return null;

    if (caseConfig.groups.create.includes(groupId)) {
        return {
            ...WORKSHOP_CONFIG.tasks.create,
            groupId,
            caseId,
            role: 'rhu'
        };
    } else if (caseConfig.groups.search.includes(groupId)) {
        return {
            ...WORKSHOP_CONFIG.tasks.search,
            groupId,
            caseId,
            role: 'hospital'
        };
    }
    return null;
}

// Utility to get group info
function getGroupInfo(groupId) {
    return WORKSHOP_CONFIG.groups[groupId] || null;
}

// Utility to get case info
function getCaseInfo(caseId) {
    return WORKSHOP_CONFIG.cases[caseId] || null;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WORKSHOP_CONFIG, getGroupTask, getGroupInfo, getCaseInfo };
}
