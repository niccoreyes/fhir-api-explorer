// ============================================
// Group Status Sync - Server-side using FHIR
// ============================================

class GroupStatusSync {
    constructor(fhirClient) {
        this.pollingInterval = null;
        this.groupStatus = new Map();
        this.subscribers = [];
        this.fhirClient = fhirClient;
        
        this.init();
    }

    async init() {
        console.log('Starting FHIR-based group sync');
        
        // Initial fetch from FHIR server
        await this.fetchGroupStatusFromFHIR();
        
        // Start polling
        this.startPolling();
    }

    startPolling() {
        console.log('Polling FHIR server for group status');
        
        // Poll every 5 seconds
        this.pollingInterval = setInterval(() => {
            this.fetchGroupStatusFromFHIR();
        }, 5000);
    }

    async fetchGroupStatusFromFHIR() {
        try {
            // Query FHIR server for patients created by workshop participants
            // We can identify them by the tag we add to resources
            const searchUrl = '/Patient?_tag=fahla-workshop-2026&_count=100';
            const response = await this.fhirClient.get(searchUrl);
            
            if (response.success && response.data && response.data.entry) {
                // Process patients to determine group status
                const patients = response.data.entry.map(entry => entry.resource);
                this.updateStatusFromPatients(patients);
            }
            
            // Also search for any search queries (can track via AuditEvent if server supports)
            // For now, we'll rely on the patient creation as the primary indicator
            
        } catch (error) {
            console.error('Error fetching from FHIR:', error);
            // Fallback to localStorage for demo mode
            this.fetchFromLocalStorage();
        }
    }

    updateStatusFromPatients(patients) {
        const newStatus = {};
        
        // Reset all groups to waiting
        for (let i = 1; i <= 5; i++) {
            newStatus[i] = {
                groupId: i,
                status: 'waiting',
                caseId: null,
                taskType: null,
                timestamp: null,
                patientCount: 0
            };
        }
        
        // Count patients per group based on identifier or tag
        patients.forEach(patient => {
            // Try to extract group info from patient metadata
            let groupId = null;
            let caseId = null;
            
            // Check identifier for group tag
            if (patient.identifier) {
                const workshopId = patient.identifier.find(id => 
                    id.system === 'http://fahla.workshop/group'
                );
                if (workshopId) {
                    groupId = parseInt(workshopId.value);
                }
            }
            
            // Check tags
            if (patient.meta && patient.meta.tag) {
                const workshopTag = patient.meta.tag.find(tag => 
                    tag.system === 'http://fahla.workshop/2026'
                );
                if (workshopTag && workshopTag.code) {
                    // Tag format could be "group1-case1-create"
                    const parts = workshopTag.code.split('-');
                    if (parts.length >= 2) {
                        groupId = parseInt(parts[0].replace('group', ''));
                        caseId = parts[1];
                    }
                }
            }
            
            if (groupId && newStatus[groupId]) {
                newStatus[groupId].status = 'complete';
                newStatus[groupId].patientCount++;
                newStatus[groupId].taskType = 'create';
                newStatus[groupId].timestamp = patient.meta?.lastUpdated || new Date().toISOString();
            }
        });
        
        this.updateGroupStatus(newStatus);
    }

    fetchFromLocalStorage() {
        // Fallback for demo/testing when FHIR query fails
        const status = {};
        
        for (let i = 1; i <= 5; i++) {
            const stored = localStorage.getItem(`fahla_group_${i}_status`);
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
        
        this.updateGroupStatus(status);
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

    async updateMyStatus(groupId, caseId, taskType, status, data = {}) {
        const myStatus = {
            groupId,
            caseId,
            taskType,
            status, // 'waiting', 'active', 'complete', 'error'
            timestamp: new Date().toISOString(),
            ...data
        };
        
        // Store locally for immediate feedback
        localStorage.setItem(`fahla_group_${groupId}_status`, JSON.stringify(myStatus));
        
        // Update local cache
        this.groupStatus.set(groupId, myStatus);
        
        // Notify immediately
        this.notifySubscribers();
        
        // The FHIR server will be the source of truth
        // Next poll will pick up any patients created by this group
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
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GroupStatusSync };
}
