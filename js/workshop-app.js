// ============================================
// Workshop App - Main Application Controller
// ============================================

class WorkshopApp {
    constructor() {
        // State
        this.state = {
            currentCase: null,
            currentGroup: null,
            currentTask: null,
            currentView: 'clinician',
            taskProgress: 0,
            taskComplete: false,
            patientData: null
        };

        // Managers
        this.syncManager = null;
        this.groupStatusSync = null;
        this.architectureView = null;
        this.fhirClient = null;

        // Initialize
        this.init();
    }

    init() {
        this.cacheElements();
        this.bindEvents();
        
        // Initialize managers FIRST (before any UI setup that needs them)
        this.syncManager = new WorkshopSyncManager();
        this.groupStatusSync = new GroupStatusSync();
        this.fhirClient = new FHIRClient();
        
        // Initialize architecture view if container exists
        const archCanvas = document.getElementById('architectureCanvas');
        if (archCanvas) {
            this.architectureView = new ArchitectureView('architectureCanvas', 'architectureSvg');
        }
        
        // Setup sync subscriptions
        this.setupSync();
        
        // Start group status monitoring
        this.setupGroupStatus();
        
        // Check if user has already selected case/group (AFTER managers are ready)
        this.loadSavedSession();
    }

    // ============================================
    // ELEMENT CACHING
    // ============================================

    cacheElements() {
        // Entry gate
        this.entryGate = document.getElementById('entryGate');
        this.caseSelection = document.getElementById('caseSelection');
        this.groupSelection = document.getElementById('groupSelection');
        this.viewSelection = document.getElementById('viewSelection');
        this.workshopApp = document.getElementById('workshopApp');
        
        // Case cards
        this.caseCards = document.querySelectorAll('.case-card');
        
        // Group selection
        this.groupsContainer = document.getElementById('groupsContainer');
        this.backToCases = document.getElementById('backToCases');
        this.selectFacilitator = document.getElementById('selectFacilitator');
        
        // View selection
        this.viewModeBtns = document.querySelectorAll('.view-mode-btn');
        this.backToGroups = document.getElementById('backToGroups');
        this.enterWorkshopBtn = document.getElementById('enterWorkshop');
        
        // Summary display
        this.summaryCase = document.getElementById('summaryCase');
        this.summaryGroup = document.getElementById('summaryGroup');
        this.summaryTask = document.getElementById('summaryTask');
        
        // Workshop app
        this.viewTabs = document.querySelectorAll('.view-tab');
        this.mobileNavBtns = document.querySelectorAll('.mobile-nav-btn');
        this.workshopViews = document.querySelectorAll('.workshop-view');
        
        // Group badge
        this.groupIndicator = document.getElementById('groupIndicator');
        this.groupName = document.getElementById('groupName');
        this.taskName = document.getElementById('taskName');
        this.workshopPhase = document.getElementById('workshopPhase');
        
        // Task card
        this.taskTitle = document.getElementById('taskTitle');
        this.taskDescription = document.getElementById('taskDescription');
        this.taskStatus = document.getElementById('taskStatus');
        this.taskProgressFill = document.getElementById('taskProgressFill');
        this.taskProgressText = document.getElementById('taskProgressText');
        
        // Group status list
        this.groupStatusList = document.getElementById('groupStatusList');
        
        // Workspaces
        this.clinicianWorkspace = document.getElementById('clinicianWorkspace');
        this.developerWorkspace = document.getElementById('developerWorkspace');
        this.devBodyEditor = document.getElementById('devBodyEditor');
        this.devMethod = document.getElementById('devMethod');
        this.devUrl = document.getElementById('devUrl');
        this.devSend = document.getElementById('devSend');
        this.syncStatus = document.getElementById('syncStatus');
        
        // Response
        this.responseContainer = document.getElementById('responseContainer');
        
        // Reset
        this.resetWorkshop = document.getElementById('resetWorkshop');
    }

    // ============================================
    // EVENT BINDING
    // ============================================

    bindEvents() {
        // Case selection
        this.caseCards.forEach(card => {
            card.addEventListener('click', (e) => {
                const caseId = card.getAttribute('data-case');
                this.selectCase(caseId);
            });
        });

        // Back buttons
        this.backToCases?.addEventListener('click', () => this.showCaseSelection());
        this.backToGroups?.addEventListener('click', () => this.showGroupSelection());
        
        // Facilitator selection
        this.selectFacilitator?.addEventListener('click', () => this.selectFacilitatorMode());
        
        // View mode selection
        this.viewModeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = btn.getAttribute('data-mode');
                this.selectViewMode(mode);
            });
        });
        
        // Enter workshop
        this.enterWorkshopBtn?.addEventListener('click', () => this.enterWorkshop());
        
        // View tabs
        this.viewTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const view = tab.getAttribute('data-view');
                this.switchView(view);
            });
        });
        
        // Mobile nav
        this.mobileNavBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = btn.getAttribute('data-view');
                this.switchView(view);
            });
        });
        
        // Developer editor
        this.devBodyEditor?.addEventListener('input', (e) => {
            this.handleDeveloperEdit(e.target.value);
        });
        
        // Developer send
        this.devSend?.addEventListener('click', () => this.sendDeveloperRequest());
        
        // Reset
        this.resetWorkshop?.addEventListener('click', () => this.resetSession());
    }

    // ============================================
    // SESSION MANAGEMENT
    // ============================================

    loadSavedSession() {
        const savedCase = sessionStorage.getItem('fahla_case');
        const savedGroup = sessionStorage.getItem('fahla_group');
        const savedView = sessionStorage.getItem('fahla_view');
        
        if (savedCase && savedGroup) {
            this.state.currentCase = savedCase;
            this.state.currentGroup = parseInt(savedGroup);
            this.state.currentTask = getGroupTask(savedCase, parseInt(savedGroup));
            
            if (savedView) {
                this.state.currentView = savedView;
            }
            
            // Show workshop directly
            this.showWorkshopApp();
            this.setupWorkshopUI();
        }
    }

    saveSession() {
        sessionStorage.setItem('fahla_case', this.state.currentCase);
        sessionStorage.setItem('fahla_group', this.state.currentGroup);
        sessionStorage.setItem('fahla_view', this.state.currentView);
    }

    resetSession() {
        sessionStorage.removeItem('fahla_case');
        sessionStorage.removeItem('fahla_group');
        sessionStorage.removeItem('fahla_view');
        
        this.state.currentCase = null;
        this.state.currentGroup = null;
        this.state.currentTask = null;
        this.state.currentView = 'clinician';
        this.state.taskProgress = 0;
        this.state.taskComplete = false;
        
        this.showEntryGate();
        this.showCaseSelection();
    }

    // ============================================
    // ENTRY FLOW
    // ============================================

    selectCase(caseId) {
        this.state.currentCase = caseId;
        
        // Update UI
        this.caseCards.forEach(card => {
            card.classList.remove('selected');
        });
        document.querySelector(`.case-card[data-case="${caseId}"]`)?.classList.add('selected');
        
        // Populate group selection
        this.populateGroupSelection(caseId);
        
        // Show group selection
        setTimeout(() => {
            this.showGroupSelection();
        }, 300);
    }

    populateGroupSelection(caseId) {
        const caseConfig = getCaseInfo(caseId);
        if (!caseConfig) return;
        
        // Update titles
        document.getElementById('groupSelectionTitle').textContent = 
            `${caseConfig.shortName}: Select Your Group`;
        
        // Create group cards
        this.groupsContainer.innerHTML = '';
        
        Object.values(WORKSHOP_CONFIG.groups).forEach(group => {
            const task = getGroupTask(caseId, group.id);
            if (!task) return;
            
            const isCreate = task.type === 'create';
            const role = WORKSHOP_CONFIG.roles[task.role];
            
            const card = document.createElement('div');
            card.className = 'group-card';
            card.setAttribute('data-group', group.id);
            card.innerHTML = `
                <div class="group-indicator-large" style="color: ${group.color}">${group.indicator}</div>
                <h4>${group.name}</h4>
                <div class="group-role" style="color: ${role.color}">
                    ${role.name} - ${isCreate ? 'Create' : 'Search'}
                </div>
                <div class="group-task-desc">
                    ${task.description}
                </div>
            `;
            
            card.addEventListener('click', () => this.selectGroup(group.id));
            this.groupsContainer.appendChild(card);
        });
    }

    selectGroup(groupId) {
        this.state.currentGroup = groupId;
        this.state.currentTask = getGroupTask(this.state.currentCase, groupId);
        
        // Update UI
        const cards = this.groupsContainer.querySelectorAll('.group-card');
        cards.forEach(card => {
            card.classList.remove('selected');
        });
        document.querySelector(`.group-card[data-group="${groupId}"]`)?.classList.add('selected');
        
        // Update summary
        const caseConfig = getCaseInfo(this.state.currentCase);
        const groupConfig = getGroupInfo(groupId);
        
        this.summaryCase.textContent = caseConfig.shortName;
        this.summaryCase.style.background = caseConfig.color + '20';
        this.summaryCase.style.color = caseConfig.color;
        
        this.summaryGroup.textContent = groupConfig.name;
        this.summaryGroup.style.background = groupConfig.color + '20';
        this.summaryGroup.style.color = groupConfig.color;
        
        this.summaryTask.textContent = this.state.currentTask.title;
        
        // Show view selection
        setTimeout(() => {
            this.showViewSelection();
        }, 200);
    }

    selectFacilitatorMode() {
        this.state.currentGroup = 'facilitator';
        this.state.currentTask = null;
        this.state.currentView = 'facilitator';
        
        this.saveSession();
        this.showWorkshopApp();
        this.setupWorkshopUI();
    }

    selectViewMode(mode) {
        this.state.currentView = mode;
        
        // Update UI
        this.viewModeBtns.forEach(btn => {
            btn.classList.remove('selected');
        });
        document.querySelector(`.view-mode-btn[data-mode="${mode}"]`)?.classList.add('selected');
        
        // Enable enter button
        this.enterWorkshopBtn.disabled = false;
    }

    enterWorkshop() {
        this.saveSession();
        this.showWorkshopApp();
        this.setupWorkshopUI();
    }

    // ============================================
    // UI VISIBILITY
    // ============================================

    showEntryGate() {
        this.entryGate.style.display = 'flex';
        this.workshopApp.style.display = 'none';
    }

    showWorkshopApp() {
        this.entryGate.style.display = 'none';
        this.workshopApp.style.display = 'flex';
    }

    showCaseSelection() {
        this.caseSelection.style.display = 'block';
        this.groupSelection.style.display = 'none';
        this.viewSelection.style.display = 'none';
    }

    showGroupSelection() {
        this.caseSelection.style.display = 'none';
        this.groupSelection.style.display = 'block';
        this.viewSelection.style.display = 'none';
    }

    showViewSelection() {
        this.caseSelection.style.display = 'none';
        this.groupSelection.style.display = 'none';
        this.viewSelection.style.display = 'block';
    }

    // ============================================
    // WORKSHOP UI SETUP
    // ============================================

    setupWorkshopUI() {
        if (this.state.currentGroup === 'facilitator') {
            this.setupFacilitatorView();
        } else {
            this.setupParticipantView();
        }
        
        // Switch to saved or default view
        this.switchView(this.state.currentView);
        
        // Update group status display
        this.updateGroupStatusDisplay();
    }

    setupParticipantView() {
        // SAFETY CHECK: Ensure all managers are initialized
        if (!this.syncManager) {
            console.error('syncManager not initialized - creating now');
            this.syncManager = new WorkshopSyncManager();
            this.setupSync();
        }
        if (!this.groupStatusSync) {
            console.error('groupStatusSync not initialized - creating now');
            this.groupStatusSync = new GroupStatusSync();
            this.setupGroupStatus();
        }
        if (!this.fhirClient) {
            console.error('fhirClient not initialized - creating now');
            this.fhirClient = new FHIRClient();
        }
        
        const caseConfig = getCaseInfo(this.state.currentCase);
        const groupConfig = getGroupInfo(this.state.currentGroup);
        const task = this.state.currentTask;
        
        // Update header
        this.workshopPhase.textContent = `${caseConfig.shortName}: ${caseConfig.patient.name}`;
        this.groupIndicator.textContent = groupConfig.indicator;
        this.groupName.textContent = groupConfig.name;
        this.taskName.textContent = task.title;
        
        // Update task card
        this.taskTitle.textContent = task.title;
        this.taskDescription.textContent = task.description.replace('{patient}', caseConfig.patient.name);
        
        // Setup clinician form
        this.setupClinicianForm();
        
        // Setup developer view
        this.setupDeveloperView();
        
        // Initialize sync
        this.syncManager.init({
            familyName: caseConfig.patient.familyName,
            givenName: caseConfig.patient.givenName
        });
        
        // Update my status
        this.groupStatusSync.updateMyStatus(
            this.state.currentGroup,
            this.state.currentCase,
            task.type,
            'waiting'
        );
    }

    setupFacilitatorView() {
        this.workshopPhase.textContent = 'Facilitator Dashboard';
        this.groupIndicator.textContent = '🎯';
        this.groupName.textContent = 'Facilitator';
        this.taskName.textContent = 'Overview';
        
        // Setup dashboard
        this.setupFacilitatorDashboard();
    }

    setupClinicianForm() {
        const caseConfig = getCaseInfo(this.state.currentCase);
        const isCreate = this.state.currentTask.type === 'create';
        
        this.clinicianWorkspace.innerHTML = `
            <div class="form-section">
                <h3>Patient Information</h3>
                <div class="form-grid">
                    <div class="form-group">
                        <label for="familyName">Family Name</label>
                        <input type="text" id="familyName" name="familyName" 
                               value="${caseConfig.patient.familyName}" 
                               ${!isCreate ? 'readonly' : ''}>
                    </div>
                    <div class="form-group">
                        <label for="givenName">Given Name</label>
                        <input type="text" id="givenName" name="givenName" 
                               value="${caseConfig.patient.givenName}"
                               ${!isCreate ? 'readonly' : ''}>
                    </div>
                    ${isCreate ? `
                    <div class="form-group">
                        <label for="identifier">Patient ID</label>
                        <input type="text" id="identifier" name="identifier" 
                               placeholder="Auto-generated">
                    </div>
                    <div class="form-group">
                        <label for="gender">Gender</label>
                        <select id="gender" name="gender">
                            <option value="">Select...</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                            <option value="unknown">Unknown</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="birthDate">Birth Date</label>
                        <input type="date" id="birthDate" name="birthDate">
                    </div>
                    <div class="form-group">
                        <label for="phone">Phone</label>
                        <input type="tel" id="phone" name="phone" placeholder="+63...">
                    </div>
                    ` : `
                    <div class="form-group">
                        <label for="searchCriteria">Search by</label>
                        <select id="searchCriteria" name="searchCriteria">
                            <option value="name">Name</option>
                            <option value="identifier">Patient ID</option>
                        </select>
                    </div>
                    `}
                </div>
            </div>
            
            <button class="execute-btn" id="executeTaskBtn">
                <span>🚀</span>
                ${isCreate ? 'Create Patient' : 'Search Patient'}
            </button>
        `;
        
        // Bind form inputs
        const inputs = this.clinicianWorkspace.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('input', (e) => {
                if (this.syncManager) {
                    this.syncManager.updateFromForm(e.target.name, e.target.value);
                } else {
                    console.warn('syncManager not ready, skipping form sync');
                }
            });
        });
        
        // Execute button
        document.getElementById('executeTaskBtn')?.addEventListener('click', () => {
            this.executeTask();
        });
    }

    setupDeveloperView() {
        const task = this.state.currentTask;
        
        this.devMethod.value = task.method;
        this.devUrl.value = task.endpoint;
    }

    setupFacilitatorDashboard() {
        const dashboard = document.getElementById('dashboardGrid');
        if (!dashboard) return;
        
        dashboard.innerHTML = '';
        
        // Create cards for each group
        Object.values(WORKSHOP_CONFIG.groups).forEach(group => {
            const card = document.createElement('div');
            card.className = 'dashboard-card';
            card.innerHTML = `
                <div class="dashboard-card-header">
                    <span class="dashboard-card-indicator">${group.indicator}</span>
                    <h4>${group.name}</h4>
                </div>
                <div class="dashboard-status waiting" id="group-status-${group.id}">
                    Waiting to start...
                </div>
                <div class="dashboard-details" id="group-details-${group.id}">
                    No activity yet
                </div>
            `;
            dashboard.appendChild(card);
        });
    }

    // ============================================
    // SYNC SETUP
    // ============================================

    setupSync() {
        // Subscribe to sync updates
        this.syncManager.subscribe('clinician', (state) => {
            // Clinician view updates automatically via form binding
        });
        
        this.syncManager.subscribe('developer', (state) => {
            // Update developer editor
            if (this.devBodyEditor && document.activeElement !== this.devBodyEditor) {
                this.devBodyEditor.value = state.jsonBody;
            }
            
            // Update sync status indicator
            this.updateSyncStatus(state.syncStatus);
        });
    }

    setupGroupStatus() {
        this.groupStatusSync.subscribe((status) => {
            this.updateGroupStatusDisplay(status);
        });
    }

    updateSyncStatus(status) {
        const indicator = this.syncStatus?.querySelector('.sync-indicator');
        const text = this.syncStatus?.querySelector('.sync-text');
        
        if (!indicator || !text) return;
        
        indicator.className = 'sync-indicator ' + status;
        
        switch (status) {
            case 'synced':
                text.textContent = 'Synced with form';
                break;
            case 'syncing':
                text.textContent = 'Syncing...';
                break;
            case 'error':
                text.textContent = 'Sync error';
                break;
        }
    }

    updateGroupStatusDisplay(status = null) {
        if (!status) {
            status = this.groupStatusSync.getAllStatus();
        }
        
        // Update sidebar list
        if (this.groupStatusList) {
            this.groupStatusList.innerHTML = '';
            
            Object.values(WORKSHOP_CONFIG.groups).forEach(group => {
                const groupStatus = status[group.id];
                if (!groupStatus) return;
                
                const item = document.createElement('div');
                item.className = 'group-status-item';
                item.innerHTML = `
                    <span class="group-status-indicator">${group.indicator}</span>
                    <div class="group-status-info">
                        <div class="group-status-name">${group.name}</div>
                        <div class="group-status-task">${groupStatus.taskType || 'Waiting'}</div>
                    </div>
                    <span class="group-status-state ${groupStatus.status}">
                        ${groupStatus.status}
                    </span>
                `;
                this.groupStatusList.appendChild(item);
            });
        }
        
        // Update facilitator dashboard
        if (this.state.currentGroup === 'facilitator') {
            Object.entries(status).forEach(([groupId, groupStatus]) => {
                const statusEl = document.getElementById(`group-status-${groupId}`);
                const detailsEl = document.getElementById(`group-details-${groupId}`);
                
                if (statusEl) {
                    statusEl.className = 'dashboard-status ' + groupStatus.status;
                    statusEl.textContent = groupStatus.status.toUpperCase();
                }
                
                if (detailsEl) {
                    detailsEl.textContent = `${groupStatus.taskType || 'No task'} | ${groupStatus.caseId || 'No case'}`;
                }
            });
        }
    }

    // ============================================
    // VIEW SWITCHING
    // ============================================

    switchView(view) {
        this.state.currentView = view;
        
        // Update tab states
        this.viewTabs.forEach(tab => {
            tab.classList.toggle('active', tab.getAttribute('data-view') === view);
        });
        
        this.mobileNavBtns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-view') === view);
        });
        
        // Show/hide views
        this.workshopViews.forEach(v => {
            v.classList.toggle('active', v.id === view + 'View');
        });
        
        // Save preference
        this.saveSession();
        
        // Trigger architecture animation if switching to architecture
        if (view === 'architecture' && this.architectureView) {
            this.architectureView.highlightGroup(this.state.currentGroup);
        }
    }

    // ============================================
    // TASK EXECUTION
    // ============================================

    async executeTask() {
        const task = this.state.currentTask;
        const caseConfig = getCaseInfo(this.state.currentCase);
        
        // SAFETY CHECK: Ensure managers are initialized
        if (!this.groupStatusSync) {
            console.error('groupStatusSync not initialized - creating now');
            this.groupStatusSync = new GroupStatusSync();
            this.setupGroupStatus();
        }
        if (!this.fhirClient) {
            console.error('fhirClient not initialized - creating now');
            this.fhirClient = new FHIRClient();
        }
        if (!this.syncManager) {
            console.error('syncManager not initialized - creating now');
            this.syncManager = new WorkshopSyncManager();
            this.setupSync();
        }
        
        // Update status
        this.groupStatusSync.updateMyStatus(
            this.state.currentGroup,
            this.state.currentCase,
            task.type,
            'active',
            { message: 'Executing request...' }
        );
        
        // Animate architecture
        if (this.architectureView && this.state.currentView === 'architecture') {
            const fromSystem = task.type === 'create' ? `group${this.state.currentGroup}` : 'shr';
            const toSystem = task.type === 'create' ? 'shr' : `group${this.state.currentGroup}`;
            
            document.dispatchEvent(new CustomEvent('fhirDataFlow', {
                detail: {
                    from: fromSystem,
                    to: toSystem,
                    data: {
                        color: getGroupInfo(this.state.currentGroup).color,
                        icon: task.type === 'create' ? '📝' : '🔍',
                        label: task.title,
                        details: caseConfig.patient.name
                    }
                }
            }));
        }
        
        try {
            // Build request
            const formData = this.syncManager.getState().formData;
            let response;
            
            if (task.type === 'create') {
                // Create patient - get the raw object, not the stringified version
                const body = this.syncManager.state.jsonBody;
                response = await this.fhirClient.createPatient(body);
            } else {
                // Search patient
                response = await this.fhirClient.searchPatient(formData.familyName, formData.givenName);
            }
            
            // Display response
            this.displayResponse(response);
            
            // Mark complete
            this.state.taskComplete = true;
            this.state.taskProgress = 100;
            
            this.taskStatus.textContent = '✅ Complete';
            this.taskStatus.className = 'task-status complete';
            this.taskProgressFill.style.width = '100%';
            this.taskProgressText.textContent = '100%';
            
            // Update group status
            this.groupStatusSync.updateMyStatus(
                this.state.currentGroup,
                this.state.currentCase,
                task.type,
                'complete',
                { 
                    message: task.successMessage,
                    response: response
                }
            );
            
        } catch (error) {
            console.error('Task execution failed:', error);
            
            this.groupStatusSync.updateMyStatus(
                this.state.currentGroup,
                this.state.currentCase,
                task.type,
                'error',
                { message: error.message }
            );
            
            this.displayError(error);
        }
    }

    async sendDeveloperRequest() {
        const method = this.devMethod.value;
        const url = this.devUrl.value;
        const body = this.devBodyEditor.value;
        
        try {
            let response;
            
            switch (method) {
                case 'GET':
                    response = await this.fhirClient.get(url);
                    break;
                case 'POST':
                    response = await this.fhirClient.post(url, JSON.parse(body));
                    break;
                case 'PUT':
                    response = await this.fhirClient.put(url, JSON.parse(body));
                    break;
                case 'DELETE':
                    response = await this.fhirClient.delete(url);
                    break;
            }
            
            this.displayResponse(response);
            
        } catch (error) {
            this.displayError(error);
        }
    }

    handleDeveloperEdit(value) {
        const result = this.syncManager.updateFromJson(value);
        
        if (result.success) {
            this.devBodyEditor.classList.remove('error');
        } else {
            this.devBodyEditor.classList.add('error');
        }
    }

    // ============================================
    // RESPONSE DISPLAY
    // ============================================

    displayResponse(response) {
        this.responseContainer.innerHTML = `
            <div class="response-success">
                <div class="response-header">
                    <span class="status-code success">${response.status || 200}</span>
                    <span class="response-time">${response.responseTime || '0.5s'}</span>
                </div>
                <pre class="response-body">${JSON.stringify(response.data || response, null, 2)}</pre>
            </div>
        `;
    }

    displayError(error) {
        this.responseContainer.innerHTML = `
            <div class="response-error">
                <div class="response-header">
                    <span class="status-code error">Error</span>
                </div>
                <div class="error-message">${error.message || 'Request failed'}</div>
            </div>
        `;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.workshopApp = new WorkshopApp();
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WorkshopApp };
}
