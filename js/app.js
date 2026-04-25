// ============================================
// FHIR API Explorer - Main Application
// ============================================

class FHIRExplorerApp {
    constructor() {
        this.currentOperation = null;
        this.currentBodyTemplate = null;
        this.currentBodyData = null;
        this.viewMode = 'clinician'; // 'clinician' or 'developer'
        this.diff = new JSONDiff();
        this.client = new FHIRClient();
        this.responseCards = new ResponseCards();
        this.currentResponse = null; // Store last response for view switching
        
        this.init();
    }

    init() {
        this.cacheElements();
        this.bindEvents();
        this.renderOperationsList();
        this.loadOperation('capability'); // Load default operation
        
        // Fetch ValueSets from terminology server for dropdowns
        this.fetchAndCacheValueSets();
        
        // Initialize Developer View Controller
        this.devController = new DeveloperViewController(this);
    }

    /**
     * Fetch ValueSets from tx.fhirlab.net/fhir and cache them
     */
    async fetchAndCacheValueSets() {
        try {
            // Check if we have cached data less than 1 hour old
            const cached = localStorage.getItem('fhir_valuesets');
            const cachedTime = localStorage.getItem('fhir_valuesets_time');
            const oneHour = 60 * 60 * 1000;
            
            if (cached && cachedTime && (Date.now() - parseInt(cachedTime)) < oneHour) {
                DYNAMIC_VALUESETS.valuesets = JSON.parse(cached);
                DYNAMIC_VALUESETS.lastFetched = parseInt(cachedTime);
                console.log('Loaded', DYNAMIC_VALUESETS.valuesets.length, 'ValueSets from cache');
                return;
            }

            // Fetch ValueSets from server
            const response = await fetch(
                'https://tx.fhirlab.net/fhir/ValueSet?_count=100&_elements=name,url,status,version',
                {
                    headers: { 'Accept': 'application/fhir+json' }
                }
            );

            if (!response.ok) {
                console.warn('Failed to fetch ValueSets:', response.status);
                return;
            }

            const data = await response.json();
            
            if (data.entry && data.entry.length > 0) {
                // Process and cache ValueSets
                DYNAMIC_VALUESETS.valuesets = data.entry.map(entry => ({
                    id: entry.resource.id,
                    name: entry.resource.name || entry.resource.id,
                    url: entry.resource.url,
                    status: entry.resource.status,
                    version: entry.resource.version
                }));
                DYNAMIC_VALUESETS.lastFetched = Date.now();
                
                // Save to localStorage
                localStorage.setItem('fhir_valuesets', JSON.stringify(DYNAMIC_VALUESETS.valuesets));
                localStorage.setItem('fhir_valuesets_time', DYNAMIC_VALUESETS.lastFetched.toString());
                
                console.log('Fetched', DYNAMIC_VALUESETS.valuesets.length, 'ValueSets from server');
            }
        } catch (error) {
            console.warn('Error fetching ValueSets:', error);
        }
    }

    /**
     * Get options for a field - handles both static and ValueSet-based options
     */
    getFieldOptions(field) {
        // Handle ValueSet references (e.g., 'valueset:identifier-use')
        if (typeof field.options === 'string' && field.options.startsWith('valueset:')) {
            const valuesetKey = field.options.replace('valueset:', '');
            return FHIR_VALUESETS[valuesetKey] || [];
        }
        
        // Return static options array
        return field.options || [];
    }

    cacheElements() {
        // Main containers
        this.operationsList = document.getElementById('operationsList');
        this.currentOperationTitle = document.getElementById('currentOperationTitle');
        this.currentOperationDesc = document.getElementById('currentOperationDesc');
        this.methodBadge = document.getElementById('methodBadge');
        this.endpointUrl = document.getElementById('endpointUrl');
        this.formContainer = document.getElementById('formContainer');
        this.jsonEditor = document.getElementById('jsonEditor');
        this.diffContent = document.getElementById('diffContent');
        this.diffViewer = document.getElementById('diffViewer');
        
        // View toggles
        this.viewToggle = document.getElementById('viewToggle');
        this.clinicianView = document.getElementById('clinicianView');
        this.developerView = document.getElementById('developerView');
        
        // Teaching panel
        this.teachBtn = document.getElementById('teachBtn');
        this.teachingPanel = document.getElementById('teachingPanel');
        this.teachingContent = document.getElementById('teachingContent');
        
        // Execute button
        this.executeBtn = document.getElementById('executeBtn');
        
        // Response section
        this.responseSection = document.getElementById('responseSection');
        this.statusBadge = document.getElementById('statusBadge');
        this.responseTime = document.getElementById('responseTime');
        this.responseFormatted = document.getElementById('responseFormatted');
        this.responseRaw = document.getElementById('responseRaw');
        this.responseHeaders = document.getElementById('responseHeaders');
        this.responseCardsContainer = document.getElementById('responseCardsContainer');
        
        // Tab buttons
        this.tabBtns = document.querySelectorAll('.tab-btn');
        
        // Mobile nav
        this.mobileNavToggle = document.getElementById('mobileNavToggle');
    }

    bindEvents() {
        // View toggle
        this.viewToggle.addEventListener('change', (e) => {
            this.viewMode = e.target.checked ? 'developer' : 'clinician';
            this.toggleView();
        });

        // Teaching button
        this.teachBtn.addEventListener('click', () => {
            this.toggleTeachingPanel();
        });

        // Execute button
        this.executeBtn.addEventListener('click', () => {
            this.executeRequest();
        });

        // Tab switching
        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // JSON editor changes (old developer view - check if exists)
        if (this.jsonEditor) {
            this.jsonEditor.addEventListener('input', () => {
                this.handleJsonEditorChange();
            });
        }

        // Mobile navigation
        if (this.mobileNavToggle) {
            this.mobileNavToggle.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }

        // Terminology buttons
        document.querySelectorAll('.terminology-list .operation-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const opId = e.currentTarget.dataset.op;
                this.loadTerminologyOperation(opId, e.currentTarget);
            });
        });
    }

    renderOperationsList() {
        this.operationsList.innerHTML = '';
        
        Object.values(FHIR_OPERATIONS).forEach(op => {
            const btn = document.createElement('button');
            btn.className = 'operation-btn';
            btn.dataset.op = op.id;
            btn.innerHTML = `${op.icon} ${op.name}`;
            btn.addEventListener('click', () => this.loadOperation(op.id));
            this.operationsList.appendChild(btn);
        });
    }

    loadOperation(opId) {
        // Update active state
        document.querySelectorAll('.operation-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.op === opId);
        });

        this.currentOperation = FHIR_OPERATIONS[opId];
        if (!this.currentOperation) return;

        // Update header
        this.currentOperationTitle.textContent = this.currentOperation.name;
        this.currentOperationDesc.textContent = this.currentOperation.description;
        
        // Update method badge
        this.methodBadge.className = `method-badge ${this.currentOperation.method.toLowerCase()}`;
        this.methodBadge.textContent = this.currentOperation.method;
        
        // Update endpoint
        const server = SERVERS[this.currentOperation.server];
        this.endpointUrl.textContent = `${server.url}${this.currentOperation.endpoint}`;

        // Reset teaching panel
        this.teachingPanel.style.display = 'none';

        // Render form or body editor
        if (this.currentOperation.hasBody) {
            this.currentBodyTemplate = deepClone(this.currentOperation.bodyTemplate);
            this.currentBodyData = deepClone(this.currentOperation.bodyTemplate);
            this.renderBodyForm();
            if (this.jsonEditor) {
                this.jsonEditor.value = JSON.stringify(this.currentBodyData, null, 2);
            }
            this.diffViewer.style.display = 'block';
            this.updateDiff();
        } else {
            this.currentBodyTemplate = null;
            this.currentBodyData = null;
            this.renderQueryParams();
            if (this.jsonEditor) {
                this.jsonEditor.value = '';
            }
            this.diffViewer.style.display = 'none';
        }

        // Hide response section
        this.responseSection.style.display = 'none';

        // Scroll to top on mobile
        if (window.innerWidth <= 768) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    loadTerminologyOperation(opId, clickedBtn) {
        const op = TERMINOLOGY_OPERATIONS[opId];
        if (!op) return;

        // Create a temporary operation object
        this.currentOperation = {
            ...op,
            params: op.params || [],
            hasBody: false
        };

        // Update UI
        document.querySelectorAll('.operation-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        if (clickedBtn) clickedBtn.classList.add('active');

        this.currentOperationTitle.textContent = op.name;
        this.currentOperationDesc.textContent = op.description;
        
        this.methodBadge.className = `method-badge ${op.method.toLowerCase()}`;
        this.methodBadge.textContent = op.method;
        
        const server = SERVERS[op.server];
        this.endpointUrl.textContent = `${server.url}${op.endpoint}`;

        this.teachingPanel.style.display = 'none';
        this.renderQueryParams();
        if (this.jsonEditor) {
            this.jsonEditor.value = '';
        }
        this.diffViewer.style.display = 'none';
        this.responseSection.style.display = 'none';

        if (window.innerWidth <= 768) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    renderQueryParams() {
        this.formContainer.innerHTML = '';
        
        if (!this.currentOperation.params || this.currentOperation.params.length === 0) {
            this.formContainer.innerHTML = '<p style="color: var(--gray-400);">No parameters required for this operation.</p>';
            return;
        }

        this.currentOperation.params.forEach(param => {
            const formGroup = document.createElement('div');
            formGroup.className = 'form-group';

            const label = document.createElement('label');
            label.innerHTML = `${param.label}${param.required ? '<span class="required">*</span>' : ''}`;
            
            let input;
            if (param.type === 'select') {
                input = document.createElement('select');
                param.options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt.value;
                    option.textContent = opt.label;
                    input.appendChild(option);
                });
            } else if (param.type === 'dynamic-dropdown') {
                // Dynamic dropdown populated from server data
                input = document.createElement('select');
                input.dataset.dynamic = 'true';
                input.dataset.source = param.fetchSource;
                
                // Add placeholder option
                const placeholder = document.createElement('option');
                placeholder.value = '';
                placeholder.textContent = `Select ${param.label}...`;
                input.appendChild(placeholder);
                
                // Populate from cached data
                const sourceData = param.fetchSource === 'valuesets' ? DYNAMIC_VALUESETS.valuesets : [];
                
                if (sourceData && sourceData.length > 0) {
                    sourceData.forEach(item => {
                        const option = document.createElement('option');
                        option.value = item[param.optionValueField || 'id'];
                        const labelText = item[param.optionLabelField || 'name'];
                        const subLabel = item[param.optionSubLabelField || 'status'];
                        option.textContent = subLabel ? `${labelText} (${subLabel})` : labelText;
                        input.appendChild(option);
                    });
                } else {
                    // If no data yet, show loading message
                    const loading = document.createElement('option');
                    loading.value = '';
                    loading.textContent = 'Loading... (or type manually)';
                    loading.disabled = true;
                    input.appendChild(loading);
                }
                
                // Set default if provided
                if (param.default) {
                    input.value = param.default;
                }
            } else if (param.type === 'checkbox') {
                // Proper checkbox rendering
                input = document.createElement('input');
                input.type = 'checkbox';
                input.checked = param.checked !== undefined ? param.checked : true;
                input.value = param.default || '';
                input.style.width = 'auto';
                input.style.marginRight = '10px';
            } else {
                input = document.createElement('input');
                input.type = param.type === 'number' ? 'number' : 'text';
            }

            input.name = param.name;
            if (param.type !== 'checkbox') {
                input.value = param.default || '';
            }
            input.dataset.description = param.description;
            
            if (param.required && param.type !== 'checkbox') {
                input.required = true;
            }

            const help = document.createElement('div');
            help.className = 'form-help';
            help.textContent = param.description;

            formGroup.appendChild(label);
            formGroup.appendChild(input);
            formGroup.appendChild(help);
            this.formContainer.appendChild(formGroup);

            // Listen for changes
            input.addEventListener('input', () => this.updateEndpointDisplay());
            input.addEventListener('change', () => this.updateEndpointDisplay());
        });
    }

    renderBodyForm() {
        this.formContainer.innerHTML = '';
        
        if (!this.currentOperation.formFields) {
            this.formContainer.innerHTML = '<p style="color: var(--gray-400);">Edit JSON directly in the Developer view.</p>';
            return;
        }

        // Simple stacked layout (consistent with renderQueryParams)
        this.currentOperation.formFields.forEach(field => {
            const formGroup = this.createFormField(field);
            this.formContainer.appendChild(formGroup);
        });
    }

    /**
     * Create a form field element
     */
    createFormField(field) {
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';

        const label = document.createElement('label');
        label.textContent = field.label;
        
        let input;
        if (field.type === 'select') {
            input = document.createElement('select');
            
            // Get options (handles both static and ValueSet-based)
            const options = this.getFieldOptions(field);
            
            options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.label;
                input.appendChild(option);
            });
        } else if (field.type === 'date') {
            input = document.createElement('input');
            input.type = 'date';
        } else {
            input = document.createElement('input');
            input.type = 'text';
        }

        input.name = field.name;
        input.dataset.path = field.path;
        input.value = field.default || '';

        formGroup.appendChild(label);
        formGroup.appendChild(input);

        // Listen for changes
        input.addEventListener('input', (e) => {
            this.updateBodyFromForm(field.path, e.target.value);
        });
        input.addEventListener('change', (e) => {
            this.updateBodyFromForm(field.path, e.target.value);
        });
        
        return formGroup;
    }

    updateBodyFromForm(path, value) {
        if (!this.currentBodyData) return;
        
        setValueByPath(this.currentBodyData, path, value);
        
        // Update JSON editor (if exists)
        if (this.jsonEditor) {
            this.jsonEditor.value = JSON.stringify(this.currentBodyData, null, 2);
        }
        
        // Update diff
        this.updateDiff();
    }

    handleJsonEditorChange() {
        if (!this.jsonEditor) return;
        
        try {
            this.currentBodyData = JSON.parse(this.jsonEditor.value);
            this.updateDiff();
            
            // Update form fields if in sync
            this.syncFormFromJson();
        } catch (e) {
            // Invalid JSON, don't update
        }
    }

    syncFormFromJson() {
        if (!this.currentOperation.formFields) return;
        
        this.currentOperation.formFields.forEach(field => {
            const input = document.querySelector(`[data-path="${field.path}"]`);
            if (input) {
                const value = getValueByPath(this.currentBodyData, field.path);
                if (value !== undefined) {
                    input.value = value;
                }
            }
        });
    }

    updateDiff() {
        if (!this.currentBodyTemplate || !this.currentBodyData) return;

        const changes = this.diff.compare(this.currentBodyTemplate, this.currentBodyData);
        this.diffContent.innerHTML = JSONDiff.formatChanges(changes);
    }

    updateEndpointDisplay() {
        if (!this.currentOperation) return;

        const formData = this.getFormData();
        const server = SERVERS[this.currentOperation.server];
        
        let endpoint = this.currentOperation.endpoint;
        const queryParams = { ...formData };
        
        // Replace path params
        endpoint = this.client.replacePathParams(endpoint, queryParams);
        
        // Build query string
        const queryString = this.client.buildQueryString(queryParams);
        
        this.endpointUrl.textContent = `${server.url}${endpoint}${queryString}`;
    }

    toggleView() {
        if (this.viewMode === 'clinician') {
            this.clinicianView.style.display = 'block';
            this.developerView.style.display = 'none';
        } else {
            this.clinicianView.style.display = 'none';
            this.developerView.style.display = 'block';
            
            // Populate developer view with current operation
            if (this.devController && this.currentOperation) {
                this.devController.populateFromOperation(
                    this.currentOperation, 
                    this.currentOperation.server || 'cdr'
                );
            }
        }
        
        // Update response display based on new view mode
        if (this.currentResponse) {
            this.updateResponseDisplay();
        }
    }

    toggleTeachingPanel() {
        const isVisible = this.teachingPanel.style.display === 'block';
        this.teachingPanel.style.display = isVisible ? 'none' : 'block';
        
        if (!isVisible && this.currentOperation && this.currentOperation.teaching) {
            this.teachingContent.innerHTML = `
                <h4>${this.currentOperation.teaching.title}</h4>
                ${this.currentOperation.teaching.content}
            `;
        }
    }

    getFormData() {
        // For body operations, params are defined in operation.params
        // Body fields are in operation.formFields and go to the JSON body
        const data = {};
        
        if (this.currentOperation.params) {
            // Get query params from form (by name matching operation.params)
            this.currentOperation.params.forEach(param => {
                // Search in form container (works for both card and non-card layouts)
                const input = this.formContainer.querySelector(`[name="${param.name}"]`) ||
                              document.querySelector(`input[name="${param.name}"], select[name="${param.name}"]`);
                
                if (input) {
                    // Handle checkbox type
                    if (input.type === 'checkbox') {
                        data[param.name] = input.checked ? input.value : '';
                    } else {
                        data[param.name] = input.value;
                    }
                } else if (param.default !== undefined) {
                    data[param.name] = param.default;
                }
            });
        }
        
        return data;
    }

    async executeRequest() {
        if (!this.currentOperation) return;

        this.executeBtn.disabled = true;
        this.executeBtn.innerHTML = '<span class="btn-icon loading">⏳</span> Sending...';

        const formData = this.getFormData();
        let bodyData = null;

        if (this.currentOperation.hasBody) {
            // Use currentBodyData from form updates
            bodyData = this.currentBodyData;
            
            // Validate we have body data
            if (!bodyData) {
                alert('Request body is empty. Please fill in the form fields.');
                this.executeBtn.disabled = false;
                this.executeBtn.innerHTML = '<span class="btn-icon">🚀</span> Execute Request';
                return;
            }
        }

        const response = await this.client.execute(this.currentOperation, formData, bodyData);

        // Display response
        this.displayResponse(response);

        this.executeBtn.disabled = false;
        this.executeBtn.innerHTML = '<span class="btn-icon">🚀</span> Execute Request';

        // Scroll to response on mobile
        if (window.innerWidth <= 768) {
            setTimeout(() => {
                this.responseSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }

    displayResponse(response) {
        this.currentResponse = response; // Store for view switching
        this.responseSection.style.display = 'block';
        
        // Status badge
        const statusClass = this.client.getStatusClass(response.status);
        this.statusBadge.className = `status-badge ${statusClass}`;
        this.statusBadge.textContent = `${response.status} ${response.statusText}`;
        
        // Response time
        this.responseTime.textContent = `${response.duration}s`;
        
        // Parse response data
        let formattedData;
        if (typeof response.data === 'string') {
            try {
                formattedData = JSON.parse(response.data);
            } catch (e) {
                formattedData = response.data;
            }
        } else {
            formattedData = response.data;
        }
        
        // Store parsed data
        this.currentResponseData = formattedData;
        
        // Display based on current view mode
        this.updateResponseDisplay();
        
        // Raw response
        this.responseRaw.value = this.client.formatResponse(response);
        
        // Headers
        let headersText = '';
        for (const [key, value] of Object.entries(response.headers)) {
            headersText += `${key}: ${value}\n`;
        }
        this.responseHeaders.textContent = headersText || 'No headers available';

        // CORS warning
        if (response.isCorsError) {
            this.responseCardsContainer.innerHTML = `
                <div class="cors-warning">
                    <strong>⚠️ CORS Error</strong><br>
                    The server doesn't allow cross-origin requests from this browser.
                    <br><br>
                    <strong>Solutions:</strong>
                    <ul>
                        <li>Use a browser extension to disable CORS (development only)</li>
                        <li>Run the request from a server-side application</li>
                        <li>Use a CORS proxy (not recommended for production)</li>
                    </ul>
                </div>
            `;
            this.responseFormatted.innerHTML = this.responseCardsContainer.innerHTML;
        }
    }

    /**
     * Update response display based on current view mode
     */
    updateResponseDisplay() {
        if (!this.currentResponseData) return;
        
        if (this.viewMode === 'clinician') {
            // Show cards
            this.responseCardsContainer.style.display = 'block';
            this.responseFormatted.style.display = 'none';
            this.responseCards.render(this.currentResponseData, this.responseCardsContainer);
        } else {
            // Show JSON
            this.responseCardsContainer.style.display = 'none';
            this.responseFormatted.style.display = 'block';
            
            if (typeof this.currentResponseData === 'object') {
                this.responseFormatted.innerHTML = `<code>${syntaxHighlight(this.currentResponseData)}</code>`;
            } else {
                this.responseFormatted.innerHTML = `<code class="string">${this.currentResponseData}</code>`;
            }
        }
    }

    switchTab(tabId) {
        // Update button states
        this.tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
        
        // Update panel visibility
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(`${tabId}Panel`).classList.add('active');
    }
}

// ============================================
// Developer View Controller - Postman Style
// ============================================

class DeveloperViewController {
    constructor(app) {
        this.app = app;
        this.currentServer = 'cdr';
        this.baseUrls = {
            cdr: 'https://cdr.fhirlab.net/fhir',
            tx: 'https://tx.fhirlab.net/fhir'
        };
        
        this.cacheElements();
        this.bindEvents();
        this.loadDefaultHeaders();
    }
    
    cacheElements() {
        this.methodSelect = document.getElementById('devMethodSelect');
        this.baseUrlSpan = document.getElementById('devBaseUrl');
        this.urlInput = document.getElementById('devUrlInput');
        this.sendBtn = document.getElementById('devSendBtn');
        this.paramsTableBody = document.getElementById('devParamsTableBody');
        this.headersTableBody = document.getElementById('devHeadersTableBody');
        this.bodyEditor = document.getElementById('devBodyEditor');
        this.addParamBtn = document.getElementById('devAddParamBtn');
        this.addHeaderBtn = document.getElementById('devAddHeaderBtn');
        
        // Tabs
        this.devTabs = document.querySelectorAll('.dev-tab');
        this.devPanels = document.querySelectorAll('.dev-panel');
    }
    
    bindEvents() {
        // URL input - auto-sync to params
        this.urlInput.addEventListener('input', () => {
            this.syncUrlToParams();
        });
        
        // Send button
        this.sendBtn.addEventListener('click', () => {
            this.sendRequest();
        });
        
        // Add param/header buttons
        this.addParamBtn.addEventListener('click', () => {
            this.addParamRow();
        });
        
        this.addHeaderBtn.addEventListener('click', () => {
            this.addHeaderRow();
        });
        
        // Tab switching
        this.devTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchDevTab(e.target.dataset.tab);
            });
        });
    }
    
    setServer(server) {
        this.currentServer = server;
        this.baseUrlSpan.textContent = this.baseUrls[server];
    }
    
    // Parse URL and sync to params table (like Postman)
    syncUrlToParams() {
        const url = this.urlInput.value;
        const queryIndex = url.indexOf('?');
        
        if (queryIndex === -1) {
            // No query string - clear params table except unchecked rows
            this.paramsTableBody.querySelectorAll('tr').forEach(row => {
                const checkbox = row.querySelector('.param-enabled');
                if (checkbox && checkbox.checked) {
                    row.remove();
                }
            });
            return;
        }
        
        const queryString = url.substring(queryIndex + 1);
        const params = new URLSearchParams(queryString);
        
        // Clear existing params
        this.paramsTableBody.innerHTML = '';
        
        // Add params from URL
        params.forEach((value, key) => {
            this.addParamRow(key, value, true);
        });
    }
    
    // Build URL from path + params
    buildUrl() {
        const baseUrl = this.baseUrls[this.currentServer];
        const pathAndQuery = this.urlInput.value;
        
        // If user typed full URL, extract just the path part
        let path = pathAndQuery;
        if (pathAndQuery.startsWith('http')) {
            const urlObj = new URL(pathAndQuery);
            path = urlObj.pathname + urlObj.search;
        }
        
        // Build query from params table
        const params = [];
        this.paramsTableBody.querySelectorAll('tr').forEach(row => {
            const checkbox = row.querySelector('.param-enabled');
            const keyInput = row.querySelector('.param-key');
            const valueInput = row.querySelector('.param-value');
            
            if (checkbox && checkbox.checked && keyInput && valueInput) {
                const key = keyInput.value.trim();
                const value = valueInput.value.trim();
                if (key) {
                    params.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
                }
            }
        });
        
        // Split path from query in input
        const queryIndex = path.indexOf('?');
        let cleanPath = queryIndex > -1 ? path.substring(0, queryIndex) : path;
        
        // Build final query string
        const queryString = params.length > 0 ? `?${params.join('&')}` : '';
        
        return `${baseUrl}${cleanPath}${queryString}`;
    }
    
    // Update URL input when params change
    updateUrlFromParams() {
        const baseUrl = this.baseUrls[this.currentServer];
        const currentUrl = this.urlInput.value;
        
        // Get current path without query
        const queryIndex = currentUrl.indexOf('?');
        let path = queryIndex > -1 ? currentUrl.substring(0, queryIndex) : currentUrl;
        
        // If path is just the base URL, keep it
        if (path.startsWith('http')) {
            const urlObj = new URL(path);
            path = urlObj.pathname;
        }
        
        // Build query from params table
        const params = [];
        this.paramsTableBody.querySelectorAll('tr').forEach(row => {
            const checkbox = row.querySelector('.param-enabled');
            const keyInput = row.querySelector('.param-key');
            const valueInput = row.querySelector('.param-value');
            
            if (checkbox && checkbox.checked && keyInput && valueInput) {
                const key = keyInput.value.trim();
                const value = valueInput.value.trim();
                if (key) {
                    params.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
                }
            }
        });
        
        const queryString = params.length > 0 ? `?${params.join('&')}` : '';
        this.urlInput.value = `${path}${queryString}`;
    }
    
    // Add param row
    addParamRow(key = '', value = '', enabled = true) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="checkbox" class="param-enabled" ${enabled ? 'checked' : ''}></td>
            <td><input type="text" class="param-key" placeholder="key" value="${key}"></td>
            <td><input type="text" class="param-value" placeholder="value" value="${value}"></td>
            <td><button class="dev-delete-btn" title="Remove">×</button></td>
        `;
        
        // Bind events
        const checkbox = row.querySelector('.param-enabled');
        const keyInput = row.querySelector('.param-key');
        const valueInput = row.querySelector('.param-value');
        const deleteBtn = row.querySelector('.dev-delete-btn');
        
        checkbox.addEventListener('change', () => this.updateUrlFromParams());
        keyInput.addEventListener('input', () => this.updateUrlFromParams());
        valueInput.addEventListener('input', () => this.updateUrlFromParams());
        deleteBtn.addEventListener('click', () => {
            row.remove();
            this.updateUrlFromParams();
        });
        
        this.paramsTableBody.appendChild(row);
    }
    
    // Load default headers from Postman collection
    loadDefaultHeaders() {
        const defaultHeaders = [
            { key: 'Accept', value: 'application/fhir+json', enabled: true }
        ];
        
        defaultHeaders.forEach(h => this.addHeaderRow(h.key, h.value, h.enabled));
    }
    
    // Add header row
    addHeaderRow(key = '', value = '', enabled = true) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="checkbox" class="header-enabled" ${enabled ? 'checked' : ''}></td>
            <td><input type="text" class="header-key" placeholder="Header" value="${key}"></td>
            <td><input type="text" class="header-value" placeholder="Value" value="${value}"></td>
            <td><button class="dev-delete-btn" title="Remove">×</button></td>
        `;
        
        const deleteBtn = row.querySelector('.dev-delete-btn');
        deleteBtn.addEventListener('click', () => row.remove());
        
        this.headersTableBody.appendChild(row);
    }
    
    // Get headers object
    getHeaders() {
        const headers = {};
        this.headersTableBody.querySelectorAll('tr').forEach(row => {
            const checkbox = row.querySelector('.header-enabled');
            const keyInput = row.querySelector('.header-key');
            const valueInput = row.querySelector('.header-value');
            
            if (checkbox && checkbox.checked && keyInput && valueInput) {
                const key = keyInput.value.trim();
                const value = valueInput.value.trim();
                if (key) {
                    headers[key] = value;
                }
            }
        });
        return headers;
    }
    
    // Switch dev tabs
    switchDevTab(tabId) {
        // Update tab buttons
        this.devTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabId);
        });
        
        // Update panels
        this.devPanels.forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(`dev${tabId.charAt(0).toUpperCase() + tabId.slice(1)}Panel`).classList.add('active');
    }
    
    // Populate from operation
    populateFromOperation(operation, server) {
        this.setServer(server);
        
        // Set method
        this.methodSelect.value = operation.method || 'GET';
        
        // Set URL path
        let path = operation.endpoint || '/';
        this.urlInput.value = path;
        
        // Populate params from operation definition
        this.paramsTableBody.innerHTML = '';
        if (operation.params) {
            operation.params.forEach(param => {
                if (param.default) {
                    this.addParamRow(param.name, param.default, true);
                }
            });
            this.updateUrlFromParams();
        }
        
        // Add Content-Type header for POST/PUT
        if (operation.method === 'POST' || operation.method === 'PUT') {
            // Check if Content-Type already exists
            let hasContentType = false;
            this.headersTableBody.querySelectorAll('tr').forEach(row => {
                const keyInput = row.querySelector('.header-key');
                if (keyInput && keyInput.value.toLowerCase() === 'content-type') {
                    hasContentType = true;
                }
            });
            
            if (!hasContentType) {
                this.addHeaderRow('Content-Type', 'application/fhir+json', true);
            }
        }
        
        // Set body if exists
        if (operation.bodyTemplate) {
            this.bodyEditor.value = JSON.stringify(operation.bodyTemplate, null, 2);
        } else {
            this.bodyEditor.value = '';
        }
        
        // Default to Params tab
        this.switchDevTab('params');
    }
    
    // Send request
    async sendRequest() {
        const method = this.methodSelect.value;
        const url = this.buildUrl();
        const headers = this.getHeaders();
        let body = null;
        
        // Add body for POST/PUT/PATCH
        if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
            body = this.bodyEditor.value;
            if (body && !headers['Content-Type']) {
                headers['Content-Type'] = 'application/fhir+json';
            }
        }
        
        // Show loading state
        this.sendBtn.disabled = true;
        this.sendBtn.innerHTML = '⏳';
        
        try {
            const startTime = performance.now();
            const response = await fetch(url, {
                method,
                headers,
                body: body || undefined
            });
            const endTime = performance.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2);
            
            // Parse response
            let responseData = null;
            const contentType = response.headers.get('content-type') || '';
            
            if (contentType.includes('application/fhir+json') || contentType.includes('application/json')) {
                try {
                    responseData = await response.json();
                } catch (e) {
                    responseData = await response.text();
                }
            } else {
                responseData = await response.text();
            }
            
            // Format response for app.displayResponse
            const formattedResponse = {
                success: response.ok,
                status: response.status,
                statusText: response.statusText,
                duration: duration,
                headers: this.parseResponseHeaders(response.headers),
                data: responseData,
                url: url
            };
            
            this.app.displayResponse(formattedResponse);
            
        } catch (error) {
            this.app.displayResponse({
                success: false,
                status: 0,
                statusText: 'Network Error',
                duration: '0.00',
                headers: {},
                data: { error: error.message },
                url: url,
                error: error.message,
                isCorsError: error.message.includes('CORS') || error.message.includes('Failed to fetch')
            });
        } finally {
            this.sendBtn.disabled = false;
            this.sendBtn.innerHTML = '🚀 Send';
        }
    }
    
    parseResponseHeaders(headers) {
        const result = {};
        headers.forEach((value, key) => {
            result[key] = value;
        });
        return result;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new FHIRExplorerApp();
});
