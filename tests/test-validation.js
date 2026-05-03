// Setup mocks BEFORE requiring workshop-app
const mockDocument = {
    addEventListener: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: (id) => {
        if (id === 'toastContainer') return { appendChild: () => {} };
        return null;
    },
    activeElement: null
};

global.document = mockDocument;
global.window = {
    addEventListener: () => {},
    location: { reload: () => {} }
};
global.sessionStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
};
global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
};
global.navigator = { clipboard: { writeText: () => Promise.resolve() } };

// Mock helper functions
global.getCaseInfo = (caseId) => ({
    shortName: 'Case 1',
    patient: { name: 'Rico Dela Cruz', familyName: 'Dela Cruz', givenName: 'Rico' },
    color: '#14b8a6'
});
global.getGroupInfo = (groupId) => ({
    id: groupId, name: 'Group 1', indicator: '🔷', color: '#3b82f6'
});
global.getGroupTask = (caseId, groupId) => ({
    type: 'create',
    title: 'Create Patient',
    description: 'Create patient record',
    method: 'POST',
    endpoint: '/Patient',
    successMessage: 'Patient created!'
});
global.WORKSHOP_CONFIG = {
    groups: {
        1: { id: 1, name: 'Group 1', indicator: '🔷', color: '#3b82f6' }
    }
};

// Mock WorkshopSyncManager
global.WorkshopSyncManager = class {
    constructor() {
        this.state = { formData: {}, jsonBody: null };
    }
    init() {}
    subscribe() {}
    getState() { return { formData: {}, jsonBody: '' }; }
    updateFromForm() {}
};

// Mock other classes
global.GroupStatusSync = class {
    constructor() {}
    init() { return Promise.resolve(); }
    subscribe() {}
    updateMyStatus() {}
    getAllStatus() { return {}; }
    destroy() {}
};
global.FHIRClient = class {
    constructor() {}
};
global.ArchitectureView = class {
    constructor() {}
    highlightGroup() {}
};

// Now require the app
const { WorkshopApp } = require('../js/workshop-app.js');

// Test validation with different form states
console.log('Testing form validation with different states...\n');

// State 1: Empty form (user just loaded, hasn't filled anything)
console.log('=== State 1: Empty form (no user input) ===');
const app1 = new WorkshopApp();
app1.state.currentCase = 'case1';
app1.state.currentGroup = 1;
app1.state.currentTask = getGroupTask('case1', 1);

// Mock sync manager with empty form data
app1.syncManager = {
    getState: () => ({ formData: {} })
};

const validation1 = app1.validateFormData();
console.log('Valid:', validation1.valid);
console.log('Errors:', validation1.errors);
console.log('');

// State 2: Partial form (only name filled)
console.log('=== State 2: Partial form (name only) ===');
const app2 = new WorkshopApp();
app2.state.currentCase = 'case1';
app2.state.currentGroup = 1;
app2.state.currentTask = getGroupTask('case1', 1);
app2.syncManager = {
    getState: () => ({
        formData: {
            familyName: 'Dela Cruz',
            givenName: 'Rico'
        }
    })
};

const validation2 = app2.validateFormData();
console.log('Valid:', validation2.valid);
console.log('Errors:', validation2.errors);
console.log('');

// State 3: Complete form
console.log('=== State 3: Complete form ===');
const app3 = new WorkshopApp();
app3.state.currentCase = 'case1';
app3.state.currentGroup = 1;
app3.state.currentTask = getGroupTask('case1', 1);
app3.syncManager = {
    getState: () => ({
        formData: {
            familyName: 'Dela Cruz',
            givenName: 'Rico',
            gender: 'male',
            birthDate: '1992-03-15'
        }
    })
};

const validation3 = app3.validateFormData();
console.log('Valid:', validation3.valid);
console.log('Errors:', validation3.errors);
