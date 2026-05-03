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
            patientData: null,
            lastResponse: null,  // Store last response for view switching
            isExecuting: false,  // Prevent double-clicks
            lastRequestTime: 0,  // Rate limiting
            minRequestInterval: 2000  // Min 2 seconds between requests (100 users / 5 groups = 20 users per group, staggered)
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
        this.fhirClient = new FHIRClient();
        this.groupStatusSync = new GroupStatusSync(this.fhirClient);
        
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
        
        // Cross-tab sync via storage event
        window.addEventListener('storage', (e) => this.handleStorageEvent(e));
        
        // Check for reset when window regains focus
        window.addEventListener('focus', () => this.checkForReset());
    }
    
    /**
     * Handle storage events for cross-tab synchronization
     */
    handleStorageEvent(e) {
        // Handle group status updates from other tabs
        if (e.key && e.key.startsWith('workshop_group_') && e.key.endsWith('_status')) {
            // Update group status display if we're in facilitator mode
            if (this.state.currentGroup === 'facilitator' && this.groupStatusSync) {
                this.groupStatusSync.fetchGroupStatusFromFHIR();
            }
        }
        
        // Handle session reset from another tab
        if (e.key === 'workshop_session_reset' && e.newValue) {
            const resetTime = parseInt(e.newValue, 10);
            const now = Date.now();
            // Only reload if reset happened in last 5 seconds (avoid stale resets)
            if (now - resetTime < 5000) {
                window.location.reload();
            }
        }
    }
    
    /**
     * Check for reset from other tabs when window gains focus
     */
    checkForReset() {
        const resetTime = localStorage.getItem('workshop_session_reset');
        if (resetTime) {
            const resetTimestamp = parseInt(resetTime, 10);
            const now = Date.now();
            // If reset happened in last 5 seconds and we have a session, reload
            if (now - resetTimestamp < 5000 && sessionStorage.getItem('workshop_case')) {
                window.location.reload();
            }
        }
    }

    // ============================================
    // SESSION MANAGEMENT
    // ============================================

    loadSavedSession() {
        const savedCase = sessionStorage.getItem('workshop_case');
        const savedGroup = sessionStorage.getItem('workshop_group');
        const savedView = sessionStorage.getItem('workshop_view');
        const savedTaskComplete = sessionStorage.getItem('workshop_task_complete');
        const savedTaskProgress = sessionStorage.getItem('workshop_task_progress');
        const savedLastResponse = sessionStorage.getItem('workshop_last_response');
        
        if (savedCase && savedGroup) {
            this.state.currentCase = savedCase;
            this.state.currentGroup = parseInt(savedGroup);
            this.state.currentTask = getGroupTask(savedCase, parseInt(savedGroup));
            
            if (savedView) {
                this.state.currentView = savedView;
            }
            
            if (savedTaskComplete === 'true') {
                this.state.taskComplete = true;
                this.state.taskProgress = parseInt(savedTaskProgress || '100', 10);
            }
            
            if (savedLastResponse) {
                try {
                    this.state.lastResponse = JSON.parse(savedLastResponse);
                } catch (e) {
                    console.warn('Failed to restore last response:', e);
                }
            }
            
            // Show workshop directly
            this.showWorkshopApp();
            this.setupWorkshopUI();
            
            // Restore task UI state if task was complete
            if (this.state.taskComplete) {
                this.restoreTaskUIState();
            }
        }
    }
    
    restoreTaskUIState() {
        if (this.taskStatus) {
            this.taskStatus.textContent = '✅ Complete';
            this.taskStatus.className = 'task-status complete';
        }
        if (this.taskProgressFill) {
            this.taskProgressFill.style.width = '100%';
        }
        if (this.taskProgressText) {
            this.taskProgressText.textContent = '100%';
        }
        
        // Re-display last response if available
        if (this.state.lastResponse && this.responseContainer) {
            this.displayResponse(this.state.lastResponse);
        }
    }

    saveSession() {
        sessionStorage.setItem('workshop_case', this.state.currentCase);
        sessionStorage.setItem('workshop_group', this.state.currentGroup);
        sessionStorage.setItem('workshop_view', this.state.currentView);
        sessionStorage.setItem('workshop_task_complete', this.state.taskComplete);
        sessionStorage.setItem('workshop_task_progress', this.state.taskProgress);
        if (this.state.lastResponse) {
            sessionStorage.setItem('workshop_last_response', JSON.stringify(this.state.lastResponse));
        }
    }

    resetSession() {
        // Stop all async operations first
        if (this.groupStatusSync) {
            this.groupStatusSync.destroy();
        }
        
        // Clear any pending debounce timers
        if (this.syncManager && this.syncManager.debounceTimer) {
            clearTimeout(this.syncManager.debounceTimer);
        }
        
        // Reset executing flag
        this.state.isExecuting = false;
        
        // Clear session storage
        sessionStorage.removeItem('workshop_case');
        sessionStorage.removeItem('workshop_group');
        sessionStorage.removeItem('workshop_view');
        
        // Reset state
        this.state.currentCase = null;
        this.state.currentGroup = null;
        this.state.currentTask = null;
        this.state.currentView = 'clinician';
        this.state.taskProgress = 0;
        this.state.taskComplete = false;
        this.state.lastResponse = null;
        
        // Notify other tabs about reset with timestamp (they'll check this on focus)
        localStorage.setItem('workshop_session_reset', Date.now().toString());
        
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
        if (!this.fhirClient) {
            console.error('fhirClient not initialized - creating now');
            this.fhirClient = new FHIRClient();
        }
        if (!this.groupStatusSync) {
            console.error('groupStatusSync not initialized - creating now');
            this.groupStatusSync = new GroupStatusSync(this.fhirClient);
            this.setupGroupStatus();
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
        
        // Initialize sync with all patient data including gender and birthDate
        this.syncManager.init({
            familyName: caseConfig.patient.familyName,
            givenName: caseConfig.patient.givenName,
            gender: caseConfig.patient.gender,
            birthDate: caseConfig.patient.birthDate
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
                    <!-- Name Fields - ALL EDITABLE for variations -->
                    <div class="form-group">
                        <label for="familyName">Family Name *</label>
                        <input type="text" id="familyName" name="familyName" 
                               value="${caseConfig.patient.familyName}"
                               placeholder="Dela Cruz">
                    </div>
                    <div class="form-group">
                        <label for="givenName">Given Name(s) *</label>
                        <input type="text" id="givenName" name="givenName" 
                               value="${caseConfig.patient.givenName}"
                               placeholder="Rico Juan">
                    </div>
                    <div class="form-group">
                        <label for="nameUse">Name Type</label>
                        <select id="nameUse" name="nameUse" ${!isCreate ? 'disabled' : ''}>
                            <option value="official" selected>Official (Legal)</option>
                            <option value="usual">Usual (Common)</option>
                            <option value="nickname">Nickname</option>
                        </select>
                    </div>
                    
                    ${isCreate ? `
                    <!-- Identifier Fields -->
                    <div class="form-group">
                        <label for="identifier">Patient ID</label>
                        <input type="text" id="identifier" name="identifier" 
                               placeholder="e.g., PT-12345">
                    </div>
                    <div class="form-group">
                        <label for="identifierType">ID Type</label>
                        <select id="identifierType" name="identifierType">
                            <option value="MR">Medical Record Number</option>
                            <option value="PHN">Philippine Health Number</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    
                    <!-- Gender and Birth - PRE-FILLED from case config -->
                    <div class="form-group">
                        <label for="gender">Gender *</label>
                        <select id="gender" name="gender" required>
                            <option value="">Select...</option>
                            <option value="male" ${caseConfig.patient.gender === 'male' ? 'selected' : ''}>Male</option>
                            <option value="female" ${caseConfig.patient.gender === 'female' ? 'selected' : ''}>Female</option>
                            <option value="other" ${caseConfig.patient.gender === 'other' ? 'selected' : ''}>Other</option>
                            <option value="unknown" ${caseConfig.patient.gender === 'unknown' ? 'selected' : ''}>Unknown</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="birthDate">Birth Date *</label>
                        <input type="date" id="birthDate" name="birthDate" 
                               value="${caseConfig.patient.birthDate || ''}" required>
                    </div>
                    
                    <!-- Contact Information -->
                    <div class="form-group">
                        <label for="phone">Phone Number</label>
                        <input type="tel" id="phone" name="phone" placeholder="+63 912 345 6789">
                    </div>
                    <div class="form-group">
                        <label for="email">Email</label>
                        <input type="email" id="email" name="email" placeholder="patient@email.com">
                    </div>
                    <div class="form-group full-width">
                        <label for="address">Address</label>
                        <textarea id="address" name="address" rows="2" placeholder="Street, Barangay, City, Province"></textarea>
                    </div>
                    <div class="form-group">
                        <label for="addressCity">City/Municipality</label>
                        <input type="text" id="addressCity" name="addressCity" placeholder="Kalibo">
                    </div>
                    <div class="form-group">
                        <label for="addressProvince">Province</label>
                        <input type="text" id="addressProvince" name="addressProvince" placeholder="Aklan">
                    </div>
                    <div class="form-group">
                        <label for="addressPostal">Postal Code</label>
                        <input type="text" id="addressPostal" name="addressPostal" placeholder="5600">
                    </div>
                    
                    <!-- Status -->
                    <div class="form-group">
                        <label for="status">Record Status</label>
                        <select id="status" name="status">
                            <option value="active" selected>Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                    ` : `
                    <!-- Search Fields -->
                    <div class="form-group">
                        <label for="searchCriteria">Search By</label>
                        <select id="searchCriteria" name="searchCriteria">
                            <option value="name" selected>Name</option>
                            <option value="identifier">Patient ID</option>
                            <option value="birthDate">Birth Date</option>
                            <option value="phone">Phone</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="searchValue">Search Value</label>
                        <input type="text" id="searchValue" name="searchValue" 
                               placeholder="Enter search term...">
                    </div>
                    `}
                </div>
            </div>
            
            <div class="form-info">
                <small>* Required fields</small>
                <small class="sync-hint">💡 All fields sync to JSON in Developer view</small>
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
        
        // Create cards for each group with enhanced layout
        Object.values(WORKSHOP_CONFIG.groups).forEach(group => {
            const card = document.createElement('div');
            card.className = 'dashboard-card';
            card.style.borderLeft = `4px solid ${group.color}`;
            card.innerHTML = `
                <div class="dashboard-card-header">
                    <span class="dashboard-card-indicator" style="color: ${group.color}">${group.indicator}</span>
                    <div class="dashboard-card-title">
                        <h4>${group.name}</h4>
                        <span class="dashboard-role" id="group-role-${group.id}">Not assigned</span>
                    </div>
                </div>
                <div class="dashboard-status waiting" id="group-status-${group.id}">
                    <span class="status-icon">⏳</span>
                    <span class="status-text">Waiting</span>
                </div>
                <div class="dashboard-stats" id="group-stats-${group.id}">
                    <div class="stat">
                        <span class="stat-value" id="patient-count-${group.id}">0</span>
                        <span class="stat-label">Patients</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value" id="search-count-${group.id}">0</span>
                        <span class="stat-label">Searches</span>
                    </div>
                </div>
                <div class="dashboard-details" id="group-details-${group.id}">
                    No activity yet
                </div>
            `;
            dashboard.appendChild(card);
        });
        
        // Add summary statistics at the top
        this.updateFacilitatorStats();
    }
    
    updateFacilitatorStats() {
        // Update the main stats counters
        const totalPatients = document.getElementById('totalPatients');
        const totalSearches = document.getElementById('totalSearches');
        const activeGroups = document.getElementById('activeGroups');
        
        if (totalPatients && totalSearches && activeGroups) {
            const status = this.groupStatusSync.getAllStatus();
            let patientTotal = 0;
            let searchTotal = 0;
            let activeCount = 0;
            
            Object.values(status).forEach(groupStatus => {
                if (groupStatus.patientCount) patientTotal += groupStatus.patientCount;
                if (groupStatus.searchCount) searchTotal += groupStatus.searchCount;
                if (groupStatus.status !== 'waiting') activeCount++;
            });
            
            totalPatients.textContent = patientTotal;
            totalSearches.textContent = searchTotal;
            activeGroups.textContent = activeCount;
        }
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

    updateSyncStatus(status, message = null) {
        const indicator = this.syncStatus?.querySelector('.sync-indicator');
        const text = this.syncStatus?.querySelector('.sync-text');
        
        if (!indicator || !text) return;
        
        indicator.className = 'sync-indicator ' + status;
        
        if (message) {
            text.textContent = message;
            return;
        }
        
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
            case 'sending':
                text.textContent = 'Sending to FHIR server...';
                break;
            case 'polling':
                text.textContent = 'Checking server status...';
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
                const roleEl = document.getElementById(`group-role-${groupId}`);
                const patientCountEl = document.getElementById(`patient-count-${groupId}`);
                const searchCountEl = document.getElementById(`search-count-${groupId}`);
                
                if (statusEl) {
                    statusEl.className = 'dashboard-status ' + groupStatus.status;
                    const icon = groupStatus.status === 'complete' ? '✅' : 
                                groupStatus.status === 'active' ? '🔄' : '⏳';
                    statusEl.innerHTML = `<span class="status-icon">${icon}</span><span class="status-text">${groupStatus.status.toUpperCase()}</span>`;
                }
                
                if (detailsEl) {
                    const time = groupStatus.timestamp ? new Date(groupStatus.timestamp).toLocaleTimeString() : '';
                    detailsEl.textContent = `${groupStatus.taskType || 'No task'} | ${groupStatus.caseId || 'No case'} ${time}`;
                }
                
                if (roleEl && groupStatus.taskType) {
                    roleEl.textContent = groupStatus.taskType === 'create' ? 'RHU (Create)' : 'Hospital (Search)';
                }
                
                if (patientCountEl && groupStatus.patientCount !== undefined) {
                    patientCountEl.textContent = groupStatus.patientCount;
                }
                
                if (searchCountEl && groupStatus.searchCount !== undefined) {
                    searchCountEl.textContent = groupStatus.searchCount;
                }
            });
            
            // Update overall stats
            this.updateFacilitatorStats();
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
        
        // Re-render last response when switching to clinician or developer view
        if ((view === 'clinician' || view === 'developer') && this.state.lastResponse) {
            this.displayResponse(this.state.lastResponse);
        }
        
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
        // DEBOUNCE: Prevent double-clicks
        if (this.state.isExecuting) {
            console.log('Task already executing, ignoring double-click');
            return;
        }
        
        // RATE LIMITING: Ensure minimum interval between requests
        const now = Date.now();
        const timeSinceLastRequest = now - this.state.lastRequestTime;
        if (timeSinceLastRequest < this.state.minRequestInterval) {
            const waitTime = this.state.minRequestInterval - timeSinceLastRequest;
            console.log(`Rate limit: waiting ${waitTime}ms before next request`);
            this.showToast(`Please wait ${Math.ceil(waitTime / 1000)} seconds before submitting again`, 'warning');
            return;
        }
        
        const task = this.state.currentTask;
        const caseConfig = getCaseInfo(this.state.currentCase);
        
        // NULL CHECK: Ensure task is assigned
        if (!task) {
            console.error('No task assigned to this group');
            this.displayError(new Error('No task assigned. Please select a case and group first.'));
            return;
        }
        
        // FORM VALIDATION: Validate required fields before submission
        const validation = this.validateFormData();
        if (!validation.valid) {
            const errorMessage = 'Please fix the following errors:\n• ' + validation.errors.join('\n• ');
            this.showToast(errorMessage, 'error', 8000);
            return;
        }
        
        // Update last request time for rate limiting
        this.state.lastRequestTime = now;
        
        // Set executing flag and show loading state
        this.state.isExecuting = true;
        const executeBtn = document.getElementById('executeTaskBtn');
        if (executeBtn) {
            executeBtn.disabled = true;
            executeBtn.innerHTML = '<span>⏳</span> Processing...';
        }
        
        // SAFETY CHECK: Ensure managers are initialized
        if (!this.fhirClient) {
            console.error('fhirClient not initialized - creating now');
            this.fhirClient = new FHIRClient();
        }
        if (!this.groupStatusSync) {
            console.error('groupStatusSync not initialized - creating now');
            this.groupStatusSync = new GroupStatusSync(this.fhirClient);
            this.setupGroupStatus();
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
        
        // Show loading state
        this.showLoadingState(task.type === 'create' ? 'Creating patient...' : 'Searching patients...');
        
        try {
            // Build request
            const formData = this.syncManager.getState().formData;
            let response;
            
            if (task.type === 'create') {
                // Create patient - get the raw object and add workshop metadata
                const body = { ...this.syncManager.state.jsonBody };
                
                // Add metadata to track which group created this patient
                if (!body.meta) body.meta = {};
                if (!body.meta.tag) body.meta.tag = [];
                
                // Add workshop tag with group info (for facilitator search)
                body.meta.tag.push({
                    system: 'http://workshop.fhir.example.org/2026',
                    code: `group${this.state.currentGroup}-${this.state.currentCase}-create`,
                    display: `Group ${this.state.currentGroup} - ${this.state.currentCase}`
                });
                
                // Add global workshop tag for facilitator dashboard search
                body.meta.tag.push({
                    system: 'http://workshop.fhir.example.org/2026',
                    code: 'workshop-2026',
                    display: 'Aklan FHIR Fundamentals 2026'
                });
                
                // Add identifier with group info
                if (!body.identifier) body.identifier = [];
                body.identifier.push({
                    use: 'secondary',
                    system: 'http://workshop.fhir.example.org/group',
                    value: this.state.currentGroup.toString()
                });
                
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
        } finally {
            // Always reset executing flag and hide loading state
            this.state.isExecuting = false;
            this.hideLoadingState();
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
        // Store response for view switching
        this.state.lastResponse = response;
        
        // Check current view to determine display format
        const isClinicianView = this.state.currentView === 'clinician';
        
        if (isClinicianView) {
            this.displayClinicianResponse(response);
        } else {
            this.displayDeveloperResponse(response);
        }
    }

    displayClinicianResponse(response) {
        const isSuccess = response.success !== false;
        const data = response.data;
        
        let cardsHtml = '';
        
        if (isSuccess && data) {
            if (data.resourceType === 'Patient') {
                // Patient card
                const name = this.formatPatientName(data.name);
                const id = data.id || 'Pending';
                const gender = data.gender || 'Not specified';
                const birthDate = data.birthDate || 'Not specified';
                
                cardsHtml = `
                    <div class="response-cards">
                        <div class="patient-card success">
                            <div class="card-header">
                                <span class="card-icon">👤</span>
                                <span class="card-status">✅ Created</span>
                            </div>
                            <div class="card-body">
                                <div class="patient-field">
                                    <label>Name</label>
                                    <value>${name}</value>
                                </div>
                                <div class="patient-field">
                                    <label>Patient ID</label>
                                    <value class="patient-id">${id}</value>
                                </div>
                                <div class="patient-field">
                                    <label>Gender</label>
                                    <value>${gender}</value>
                                </div>
                                <div class="patient-field">
                                    <label>Birth Date</label>
                                    <value>${birthDate}</value>
                                </div>
                            </div>
                            <div class="card-footer">
                                <span class="response-time">⏱️ ${response.responseTime || '0.5s'}</span>
                            </div>
                        </div>
                    </div>
                `;
            } else if (data.resourceType === 'Bundle') {
                // Search results - multiple patient cards
                const entries = data.entry || [];
                const patientEntries = entries.filter(e => e.resource?.resourceType === 'Patient');
                
                if (patientEntries.length === 0) {
                    cardsHtml = `
                        <div class="response-cards">
                            <div class="patient-card warning">
                                <div class="card-header">
                                    <span class="card-icon">⚠️</span>
                                    <span class="card-status">No Results</span>
                                </div>
                                <div class="card-body">
                                    <p>No patients found matching your search criteria.</p>
                                    <p class="hint">Try searching with a different name or wait for other groups to create patients.</p>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    const patientCards = patientEntries.map((entry, index) => {
                        const patient = entry.resource;
                        const name = this.formatPatientName(patient.name);
                        const id = patient.id || `Result ${index + 1}`;
                        
                        return `
                            <div class="patient-card ${index === 0 ? 'success' : 'neutral'}">
                                <div class="card-header">
                                    <span class="card-icon">👤</span>
                                    <span class="card-status">${index === 0 ? '✅ Match' : 'Similar'}</span>
                                </div>
                                <div class="card-body">
                                    <div class="patient-field">
                                        <label>Name</label>
                                        <value>${name}</value>
                                    </div>
                                    <div class="patient-field">
                                        <label>Patient ID</label>
                                        <value class="patient-id">${id}</value>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('');
                    
                    cardsHtml = `
                        <div class="response-cards">
                            <div class="search-summary">
                                <h4>🔍 Search Results</h4>
                                <p>Found ${patientEntries.length} patient(s)</p>
                            </div>
                            ${patientCards}
                        </div>
                    `;
                }
            }
        } else {
            // Error card
            cardsHtml = `
                <div class="response-cards">
                    <div class="patient-card error">
                        <div class="card-header">
                            <span class="card-icon">❌</span>
                            <span class="card-status">Error</span>
                        </div>
                        <div class="card-body">
                            <p>${response.statusText || 'Request failed'}</p>
                            <p class="hint">Please try again or contact support.</p>
                        </div>
                    </div>
                </div>
            `;
        }
        
        this.responseContainer.innerHTML = cardsHtml;
    }

    displayDeveloperResponse(response) {
        const isSuccess = response.success !== false;
        const statusClass = isSuccess ? 'success' : 'error';
        const icon = isSuccess ? '✅' : '❌';
        const title = isSuccess ? 'Success' : 'Error';
        
        // Format the response data nicely
        let responseContent = '';
        let rawJson = '';
        if (response.data) {
            rawJson = JSON.stringify(response.data, null, 2);
            if (response.data.resourceType === 'Patient') {
                // Extract key patient info for display
                const name = response.data.name?.[0] ? 
                    `${response.data.name[0].given?.join(' ')} ${response.data.name[0].family}` : 
                    'Unknown';
                const id = response.data.id || 'N/A';
                responseContent = `📋 Patient Created\n👤 Name: ${name}\n🆔 ID: ${id}\n\n📄 Full Response:\n${rawJson}`;
            } else if (response.data.resourceType === 'Bundle') {
                const count = response.data.entry?.length || 0;
                responseContent = `🔍 Search Results\n📊 Found: ${count} patient(s)\n\n📄 Full Response:\n${rawJson}`;
            } else {
                responseContent = rawJson;
            }
        } else {
            rawJson = JSON.stringify(response, null, 2);
            responseContent = rawJson;
        }
        
        this.responseContainer.innerHTML = `
            <div class="response-${statusClass}">
                <div class="response-header">
                    <span class="status-code ${statusClass}">${icon} ${response.status || (isSuccess ? 200 : 'Error')}</span>
                    <span class="response-time">${response.responseTime || '0.5s'}</span>
                </div>
                <div class="response-summary">
                    <strong>${title}</strong> - ${isSuccess ? 'Request completed successfully' : 'Request failed'}
                </div>
                <div class="response-actions">
                    <button class="copy-btn" onclick="navigator.clipboard.writeText(\`${rawJson.replace(/`/g, '\\`')}\`).then(() => { this.textContent = '✓ Copied!'; setTimeout(() => this.textContent = '📋 Copy JSON', 2000); })">📋 Copy JSON</button>
                </div>
                <pre class="response-body">${responseContent}</pre>
            </div>
        `;
    }

    formatPatientName(nameArray) {
        if (!nameArray || !nameArray.length) return 'Unknown';
        const name = nameArray[0];
        const given = name.given ? name.given.join(' ') : '';
        const family = name.family || '';
        return `${given} ${family}`.trim() || 'Unknown';
    }

    /**
     * Show loading state on execute button
     */
    showLoadingState(message = 'Processing...') {
        const executeBtn = document.getElementById('executeTaskBtn');
        if (executeBtn) {
            executeBtn.disabled = true;
            executeBtn.innerHTML = `<span class="spinner">⏳</span> ${message}`;
            executeBtn.classList.add('loading');
        }
        
        // Update sync status
        this.updateSyncStatus('sending', 'Sending to FHIR server...');
        
        // Show loading indicator in response area
        if (this.responseContainer) {
            this.responseContainer.innerHTML = `
                <div class="loading-indicator">
                    <div class="spinner"></div>
                    <p>${message}</p>
                </div>
            `;
        }
    }
    
    /**
     * Hide loading state and restore button
     */
    hideLoadingState() {
        const executeBtn = document.getElementById('executeTaskBtn');
        if (executeBtn) {
            executeBtn.disabled = false;
            const isCreate = this.state.currentTask?.type === 'create';
            executeBtn.innerHTML = `<span>🚀</span> ${isCreate ? 'Create Patient' : 'Search Patient'}`;
            executeBtn.classList.remove('loading');
        }
    }

    displayError(error) {
        let errorMessage = error.message || 'Request failed';
        let errorHelp = '';
        
        // Provide helpful error messages
        if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
            errorMessage = 'Network connection failed';
            errorHelp = '💡 Check your internet connection and try again.';
        } else if (errorMessage.includes('CORS')) {
            errorMessage = 'Cross-origin request blocked';
            errorHelp = '💡 This might be a server configuration issue.';
        } else if (errorMessage.includes('parse')) {
            errorMessage = 'Invalid JSON in request body';
            errorHelp = '💡 Check that your JSON is properly formatted in the Developer view.';
        }
        
        // Show card-based error for clinician view
        if (this.state.currentView === 'clinician') {
            this.responseContainer.innerHTML = `
                <div class="response-cards">
                    <div class="patient-card error">
                        <div class="card-header">
                            <span class="card-icon">❌</span>
                            <span class="card-status">Error</span>
                        </div>
                        <div class="card-body">
                            <p><strong>${errorMessage}</strong></p>
                            ${errorHelp ? `<p class="hint">${errorHelp}</p>` : ''}
                        </div>
                    </div>
                </div>
            `;
        } else {
            this.responseContainer.innerHTML = `
                <div class="response-error">
                    <div class="response-header">
                        <span class="status-code error">❌ Error</span>
                    </div>
                    <div class="error-message">
                        <strong>${errorMessage}</strong>
                        ${errorHelp ? `<div class="error-help">${errorHelp}</div>` : ''}
                    </div>
                </div>
            `;
        }
    }

    // ============================================
    // TOAST NOTIFICATIONS
    // ============================================

    /**
     * Show a toast notification
     * @param {string} message - Message to display
     * @param {string} type - Type: 'info', 'success', 'warning', 'error'
     * @param {number} duration - Duration in ms (default 5000)
     */
    showToast(message, type = 'info', duration = 5000) {
        const container = document.getElementById('toastContainer');
        if (!container) {
            console.warn('Toast container not found');
            return;
        }

        const icons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icons[type]}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;

        container.appendChild(toast);

        // Auto remove after duration
        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // ============================================
    // FORM VALIDATION
    // ============================================

    /**
     * Validate form data before submission
     * @returns {Object} - { valid: boolean, errors: string[] }
     */
    validateFormData() {
        const errors = [];
        const formData = this.syncManager?.getState().formData || {};
        const task = this.state.currentTask;

        if (!task) {
            errors.push('No task assigned');
            return { valid: false, errors };
        }

        if (task.type === 'create') {
            // Required fields for create
            if (!formData.familyName || formData.familyName.trim() === '') {
                errors.push('Family Name is required');
            }
            if (!formData.givenName || formData.givenName.trim() === '') {
                errors.push('Given Name is required');
            }
            if (!formData.gender) {
                errors.push('Gender is required');
            }
            if (!formData.birthDate) {
                errors.push('Birth Date is required');
            } else {
                // Validate date format
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (!dateRegex.test(formData.birthDate)) {
                    errors.push('Birth Date must be in format YYYY-MM-DD');
                }
            }
        } else {
            // Required fields for search
            if ((!formData.familyName || formData.familyName.trim() === '') &&
                (!formData.givenName || formData.givenName.trim() === '')) {
                errors.push('At least one name field is required for search');
            }
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
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
