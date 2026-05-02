// ============================================
// Workshop Sync Manager - Guaranteed Bidirectional Sync
// ============================================

class WorkshopSyncManager {
    constructor() {
        // State store - single source of truth
        this.state = {
            formData: {},
            jsonBody: null,
            operation: null,
            lastSync: {
                formToJson: null,
                jsonToForm: null
            },
            syncStatus: 'synced', // 'synced', 'syncing', 'error'
            validationErrors: []
        };

        // Subscribers for view updates
        this.subscribers = {
            clinician: [],
            developer: []
        };

        // Debounce timer for form changes
        this.debounceTimer = null;
        this.debounceTime = WORKSHOP_CONFIG.sync.debounceTime || 300;

        // Bind methods
        this.updateFromForm = this.updateFromForm.bind(this);
        this.updateFromJson = this.updateFromJson.bind(this);
        this.notifySubscribers = this.notifySubscribers.bind(this);
    }

    // ============================================
    // PUBLIC API
    // ============================================

    /**
     * Initialize sync with initial data
     */
    init(initialData = {}) {
        this.state.formData = { ...initialData };
        this.state.jsonBody = this.buildFHIRJson(initialData);
        this.state.syncStatus = 'synced';
        this.notifySubscribers('both');
    }

    /**
     * Subscribe to sync updates
     * @param {string} view - 'clinician' or 'developer'
     * @param {function} callback - function(data) to call on update
     */
    subscribe(view, callback) {
        if (this.subscribers[view]) {
            this.subscribers[view].push(callback);
        }
    }

    /**
     * Unsubscribe from sync updates
     */
    unsubscribe(view, callback) {
        if (this.subscribers[view]) {
            this.subscribers[view] = this.subscribers[view].filter(
                cb => cb !== callback
            );
        }
    }

    /**
     * Update from clinician form (with debouncing)
     * @param {string} fieldName - name of the field that changed
     * @param {any} value - new value
     */
    updateFromForm(fieldName, value) {
        // Update form data immediately
        this.state.formData[fieldName] = value;
        this.state.syncStatus = 'syncing';
        
        // Clear existing timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        // Debounce the JSON update
        this.debounceTimer = setTimeout(() => {
            this.performFormToJsonSync();
        }, this.debounceTime);

        // Notify immediate update for UI responsiveness
        this.notifySubscribers('clinician');
    }

    /**
     * Update from developer JSON editor
     * @param {string} jsonString - JSON string from editor
     */
    updateFromJson(jsonString) {
        try {
            // Validate JSON
            const parsed = JSON.parse(jsonString);
            
            // Validate FHIR structure
            const validation = this.validateFHIRResource(parsed);
            
            if (validation.valid) {
                // Update state
                this.state.jsonBody = parsed;
                this.state.formData = this.extractFormData(parsed);
                this.state.syncStatus = 'synced';
                this.state.validationErrors = [];
                this.state.lastSync.jsonToForm = new Date();
                
                // Notify both views
                this.notifySubscribers('both');
                
                return { success: true };
            } else {
                // Validation failed - don't sync but show errors
                this.state.syncStatus = 'error';
                this.state.validationErrors = validation.errors;
                this.notifySubscribers('developer');
                
                return { 
                    success: false, 
                    errors: validation.errors 
                };
            }
        } catch (parseError) {
            // JSON parse error
            this.state.syncStatus = 'error';
            this.state.validationErrors = ['Invalid JSON: ' + parseError.message];
            this.notifySubscribers('developer');
            
            return { 
                success: false, 
                errors: ['Invalid JSON syntax'] 
            };
        }
    }

    /**
     * Get current state
     */
    getState() {
        return {
            formData: { ...this.state.formData },
            jsonBody: this.state.jsonBody ? JSON.stringify(this.state.jsonBody, null, 2) : '',
            syncStatus: this.state.syncStatus,
            validationErrors: [...this.state.validationErrors],
            lastSync: { ...this.state.lastSync }
        };
    }

    /**
     * Force a sync refresh
     */
    refresh() {
        this.notifySubscribers('both');
    }

    // ============================================
    // PRIVATE METHODS
    // ============================================

    /**
     * Perform the actual form to JSON sync
     */
    performFormToJsonSync() {
        const newJsonBody = this.buildFHIRJson(this.state.formData);
        
        this.state.jsonBody = newJsonBody;
        this.state.syncStatus = 'synced';
        this.state.lastSync.formToJson = new Date();
        this.state.validationErrors = [];
        
        this.notifySubscribers('developer');
    }

    /**
     * Build FHIR JSON from form data
     */
    buildFHIRJson(formData) {
        // Default Patient resource structure
        const resource = {
            resourceType: 'Patient',
            meta: {
                tag: [{
                    system: 'http://fahla.workshop/2026',
                    code: 'workshop-demo',
                    display: 'FAHLA Workshop Demo'
                }]
            }
        };

        // Add identifier if provided
        if (formData.identifier) {
            resource.identifier = [{
                use: 'official',
                value: formData.identifier,
                system: 'http://fahla.workshop/patient-id'
            }];
        }

        // Add name
        if (formData.familyName || formData.givenName) {
            resource.name = [{
                use: 'official'
            }];
            
            if (formData.familyName) {
                resource.name[0].family = formData.familyName;
            }
            
            if (formData.givenName) {
                resource.name[0].given = formData.givenName.split(' ');
            }
        }

        // Add gender
        if (formData.gender) {
            resource.gender = formData.gender;
        }

        // Add birthDate
        if (formData.birthDate) {
            resource.birthDate = formData.birthDate;
        }

        // Add phone
        if (formData.phone) {
            resource.telecom = [{
                system: 'phone',
                value: formData.phone,
                use: 'mobile'
            }];
        }

        // Add address
        if (formData.address) {
            resource.address = [{
                use: 'home',
                text: formData.address
            }];
        }

        return resource;
    }

    /**
     * Extract form data from FHIR JSON
     */
    extractFormData(jsonBody) {
        const formData = {};

        // Extract identifier
        if (jsonBody.identifier && jsonBody.identifier.length > 0) {
            formData.identifier = jsonBody.identifier[0].value;
        }

        // Extract name
        if (jsonBody.name && jsonBody.name.length > 0) {
            const name = jsonBody.name[0];
            if (name.family) {
                formData.familyName = name.family;
            }
            if (name.given && name.given.length > 0) {
                formData.givenName = name.given.join(' ');
            }
        }

        // Extract gender
        if (jsonBody.gender) {
            formData.gender = jsonBody.gender;
        }

        // Extract birthDate
        if (jsonBody.birthDate) {
            formData.birthDate = jsonBody.birthDate;
        }

        // Extract phone
        if (jsonBody.telecom && jsonBody.telecom.length > 0) {
            const phone = jsonBody.telecom.find(t => t.system === 'phone');
            if (phone) {
                formData.phone = phone.value;
            }
        }

        // Extract address
        if (jsonBody.address && jsonBody.address.length > 0) {
            formData.address = jsonBody.address[0].text || '';
        }

        return formData;
    }

    /**
     * Validate FHIR resource structure
     */
    validateFHIRResource(resource) {
        const errors = [];

        // Check resourceType
        if (!resource.resourceType) {
            errors.push('Missing required field: resourceType');
        } else if (resource.resourceType !== 'Patient') {
            errors.push(`Unexpected resourceType: ${resource.resourceType}. Expected: Patient`);
        }

        // Check name structure if present
        if (resource.name) {
            if (!Array.isArray(resource.name)) {
                errors.push('name must be an array');
            } else {
                resource.name.forEach((name, index) => {
                    if (name.family && typeof name.family !== 'string') {
                        errors.push(`name[${index}].family must be a string`);
                    }
                    if (name.given && !Array.isArray(name.given)) {
                        errors.push(`name[${index}].given must be an array`);
                    }
                });
            }
        }

        // Check gender if present
        if (resource.gender) {
            const validGenders = ['male', 'female', 'other', 'unknown'];
            if (!validGenders.includes(resource.gender)) {
                errors.push(`Invalid gender: ${resource.gender}. Must be one of: ${validGenders.join(', ')}`);
            }
        }

        // Check birthDate format if present
        if (resource.birthDate) {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(resource.birthDate)) {
                errors.push('birthDate must be in format YYYY-MM-DD');
            }
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Notify subscribers of changes
     */
    notifySubscribers(view) {
        const state = this.getState();

        if (view === 'clinician' || view === 'both') {
            this.subscribers.clinician.forEach(callback => {
                try {
                    callback(state);
                } catch (error) {
                    console.error('Error notifying clinician subscriber:', error);
                }
            });
        }

        if (view === 'developer' || view === 'both') {
            this.subscribers.developer.forEach(callback => {
                try {
                    callback(state);
                } catch (error) {
                    console.error('Error notifying developer subscriber:', error);
                }
            });
        }
    }
}

// ============================================
// Group Status Sync - Real-time coordination
// ============================================

class GroupStatusSync {
    constructor() {
        this.websocket = null;
        this.websocketAvailable = false;
        this.pollingInterval = null;
        this.groupStatus = new Map();
        this.subscribers = [];
        
        this.init();
    }

    async init() {
        // Try WebSocket first
        await this.testWebSocket();
        
        // Fallback to polling if WebSocket not available
        if (!this.websocketAvailable) {
            this.startPolling();
        }
    }

    async testWebSocket() {
        try {
            // Test if WebSocket is available
            const wsUrl = WORKSHOP_CONFIG.sync.websocketTestUrl;
            if (!wsUrl) {
                console.log('WebSocket URL not configured, using polling');
                return false;
            }

            // Attempt connection (will likely fail on FHIR servers without WS support)
            this.websocket = new WebSocket(wsUrl);
            
            return new Promise((resolve) => {
                this.websocket.onopen = () => {
                    console.log('WebSocket connected');
                    this.websocketAvailable = true;
                    resolve(true);
                };

                this.websocket.onerror = () => {
                    console.log('WebSocket not available, using polling fallback');
                    this.websocketAvailable = false;
                    resolve(false);
                };

                this.websocket.onclose = () => {
                    if (this.websocketAvailable) {
                        console.log('WebSocket closed, falling back to polling');
                        this.websocketAvailable = false;
                        this.startPolling();
                    }
                };

                // Timeout after 3 seconds
                setTimeout(() => {
                    if (!this.websocketAvailable) {
                        resolve(false);
                    }
                }, 3000);
            });
        } catch (error) {
            console.log('WebSocket test failed:', error);
            return false;
        }
    }

    startPolling() {
        console.log('Starting polling-based sync');
        
        // Initial fetch
        this.fetchGroupStatus();
        
        // Set up interval
        this.pollingInterval = setInterval(() => {
            this.fetchGroupStatus();
        }, WORKSHOP_CONFIG.sync.pollingInterval);
    }

    async fetchGroupStatus() {
        try {
            // Query FHIRLab for workshop resources
            // In a real implementation, this would search for resources with workshop tags
            
            // For demo purposes, we'll simulate based on localStorage
            // In production, this would be: GET /Patient?_tag=fahla-workshop
            
            const simulatedStatus = this.simulateGroupStatus();
            this.updateGroupStatus(simulatedStatus);
            
        } catch (error) {
            console.error('Error fetching group status:', error);
        }
    }

    simulateGroupStatus() {
        // This is a placeholder - in production, query actual FHIR server
        const status = {};
        
        // Check localStorage for demo purposes
        for (let i = 1; i <= 5; i++) {
            const groupKey = `fahla_group_${i}_status`;
            const stored = localStorage.getItem(groupKey);
            
            if (stored) {
                status[i] = JSON.parse(stored);
            } else {
                status[i] = {
                    groupId: i,
                    status: 'waiting',
                    lastActivity: null,
                    taskComplete: false
                };
            }
        }
        
        return status;
    }

    updateGroupStatus(status) {
        let changed = false;
        
        Object.entries(status).forEach(([groupId, groupStatus]) => {
            const current = this.groupStatus.get(parseInt(groupId));
            if (!current || JSON.stringify(current) !== JSON.stringify(groupStatus)) {
                this.groupStatus.set(parseInt(groupId), groupStatus);
                changed = true;
            }
        });
        
        if (changed) {
            this.notifySubscribers();
        }
    }

    updateMyStatus(groupId, caseId, taskType, status, data = {}) {
        const myStatus = {
            groupId,
            caseId,
            taskType,
            status, // 'waiting', 'active', 'complete', 'error'
            timestamp: new Date().toISOString(),
            ...data
        };
        
        // Store in localStorage for demo
        localStorage.setItem(`fahla_group_${groupId}_status`, JSON.stringify(myStatus));
        
        // Update local cache
        this.groupStatus.set(groupId, myStatus);
        
        // Notify immediately
        this.notifySubscribers();
        
        // Send via WebSocket if available
        if (this.websocketAvailable && this.websocket) {
            this.websocket.send(JSON.stringify({
                type: 'status_update',
                data: myStatus
            }));
        }
    }

    subscribe(callback) {
        this.subscribers.push(callback);
        // Immediately notify with current status
        callback(this.getAllStatus());
    }

    unsubscribe(callback) {
        this.subscribers = this.subscribers.filter(cb => cb !== callback);
    }

    notifySubscribers() {
        const status = this.getAllStatus();
        this.subscribers.forEach(callback => {
            try {
                callback(status);
            } catch (error) {
                console.error('Error notifying group status subscriber:', error);
            }
        });
    }

    getAllStatus() {
        const status = {};
        this.groupStatus.forEach((value, key) => {
            status[key] = value;
        });
        return status;
    }

    destroy() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
        if (this.websocket) {
            this.websocket.close();
        }
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WorkshopSyncManager, GroupStatusSync };
}
