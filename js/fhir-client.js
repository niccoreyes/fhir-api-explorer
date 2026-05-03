// ============================================
// FHIR Client
// Handles API requests to CDR and TX servers
// ============================================

class FHIRClient {
    constructor() {
        this.servers = {
            cdr: 'https://cdr.fhirlab.net/fhir',
            tx: 'https://tx.fhirlab.net/fhir'
        };
        this.defaultHeaders = {
            'Accept': 'application/fhir+json',
            'Content-Type': 'application/fhir+json'
        };
        this.defaultTimeout = 15000; // 15 seconds default timeout
        this.maxRetries = 2; // Max retry attempts for transient failures
    }

    /**
     * Build full URL from server type and endpoint
     */
    buildUrl(server, endpoint) {
        const baseUrl = this.servers[server];
        if (!baseUrl) {
            throw new Error(`Unknown server type: ${server}`);
        }
        return `${baseUrl}${endpoint}`;
    }

    /**
     * Build query string from parameters
     */
    buildQueryString(params) {
        if (!params || Object.keys(params).length === 0) {
            return '';
        }

        const queryParts = [];
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== null && value !== '') {
                // Handle checkbox arrays
                if (Array.isArray(value)) {
                    value.forEach(v => {
                        queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
                    });
                } else {
                    queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
                }
            }
        }

        return queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    }

    /**
     * Replace path parameters in endpoint
     */
    replacePathParams(endpoint, params) {
        let result = endpoint;
        const usedKeys = [];
        
        for (const [key, value] of Object.entries(params)) {
            const placeholder = `{${key}}`;
            if (result.includes(placeholder)) {
                result = result.replace(placeholder, encodeURIComponent(value));
                usedKeys.push(key);
            }
        }
        
        // Remove used params from the params object
        usedKeys.forEach(key => delete params[key]);
        
        return result;
    }

    /**
     * Fetch with timeout support
     */
    async fetchWithTimeout(url, options, timeout = this.defaultTimeout) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(id);
            return response;
        } catch (error) {
            clearTimeout(id);
            if (error.name === 'AbortError') {
                throw new Error(`Request timeout after ${timeout}ms`);
            }
            throw error;
        }
    }

    /**
     * Execute a FHIR request with retry logic
     */
    async execute(operation, formData, bodyData = null, timeout = this.defaultTimeout, retries = this.maxRetries) {
        const startTime = performance.now();
        
        try {
            // Build URL
            let endpoint = operation.endpoint;
            const queryParams = { ...formData };
            
            // Replace path parameters (like {id})
            endpoint = this.replacePathParams(endpoint, queryParams);
            
            // Build query string for remaining params
            const queryString = this.buildQueryString(queryParams);
            const url = this.buildUrl(operation.server, endpoint) + queryString;

            // Build request options
            const options = {
                method: operation.method,
                headers: { ...this.defaultHeaders }
            };

            // Add body for POST/PUT
            if ((operation.method === 'POST' || operation.method === 'PUT') && bodyData) {
                options.body = typeof bodyData === 'string' 
                    ? bodyData 
                    : JSON.stringify(bodyData, null, 2);
            }

            // Make the request with timeout
            const response = await this.fetchWithTimeout(url, options, timeout);
            
            // Retry on transient server errors (503, 504) or rate limiting (429)
            if ((response.status === 503 || response.status === 504 || response.status === 429) && retries > 0) {
                const delay = (this.maxRetries - retries + 1) * 2000; // Exponential backoff: 2s, 4s
                console.warn(`Server error ${response.status}, retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.execute(operation, formData, bodyData, timeout, retries - 1);
            }
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

            return {
                success: response.ok,
                status: response.status,
                statusText: response.statusText,
                duration: duration,
                headers: this.parseHeaders(response.headers),
                data: responseData,
                url: url,
                requestMethod: operation.method,
                requestBody: options.body
            };

        } catch (error) {
            const endTime = performance.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2);

            return {
                success: false,
                status: 0,
                statusText: 'Network Error',
                duration: duration,
                headers: {},
                data: { error: error.message },
                url: 'Failed to make request',
                error: error.message,
                isCorsError: error.message.includes('CORS') || error.message.includes('Failed to fetch')
            };
        }
    }

    /**
     * Parse response headers into object
     */
    parseHeaders(headers) {
        const result = {};
        headers.forEach((value, key) => {
            result[key] = value;
        });
        return result;
    }

    /**
     * Format request for display
     */
    formatRequest(url, method, body = null) {
        let formatted = `${method} ${url}\n`;
        formatted += `Host: ${new URL(url).host}\n`;
        formatted += `Accept: application/fhir+json\n`;
        
        if (body) {
            formatted += `Content-Type: application/fhir+json\n\n`;
            formatted += typeof body === 'string' ? body : JSON.stringify(body, null, 2);
        }
        
        return formatted;
    }

    /**
     * Format response for display
     */
    formatResponse(response) {
        let formatted = `HTTP/1.1 ${response.status} ${response.statusText}\n`;
        
        // Add headers
        for (const [key, value] of Object.entries(response.headers)) {
            formatted += `${key}: ${value}\n`;
        }
        
        formatted += '\n';
        
        // Add body
        if (typeof response.data === 'string') {
            formatted += response.data;
        } else {
            formatted += JSON.stringify(response.data, null, 2);
        }
        
        return formatted;
    }

    /**
     * Get status badge class based on status code
     */
    getStatusClass(status) {
        if (status >= 200 && status < 300) return 'success';
        if (status >= 400 && status < 500) return 'warning';
        if (status >= 500 || status === 0) return 'error';
        return 'info';
    }

    /**
     * Common FHIR resource templates
     */
    getTemplates() {
        return {
            patient: {
                resourceType: 'Patient',
                identifier: [{
                    use: 'official',
                    system: 'http://hospital.example.org/mrn',
                    value: 'P123456'
                }],
                name: [{
                    use: 'official',
                    family: 'Dela Cruz',
                    given: ['Rico']
                }],
                gender: 'male',
                birthDate: '1992-03-15'
            },
            observation: {
                resourceType: 'Observation',
                status: 'final',
                category: [{
                    coding: [{
                        system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                        code: 'vital-signs',
                        display: 'Vital Signs'
                    }]
                }],
                code: {
                    coding: [{
                        system: 'http://loinc.org',
                        code: '29463-7',
                        display: 'Body weight'
                    }]
                },
                subject: {
                    reference: 'Patient/example'
                },
                valueQuantity: {
                    value: 70,
                    unit: 'kg',
                    system: 'http://unitsofmeasure.org',
                    code: 'kg'
                }
            }
        };
    }

    /**
     * Workshop-specific: Create a patient
     */
    async createPatient(patientData, timeout = this.defaultTimeout) {
        const url = `${this.servers.cdr}/Patient`;
        
        // Ensure patientData is an object, not already stringified
        const body = typeof patientData === 'string' ? patientData : JSON.stringify(patientData);
        
        try {
            const response = await this.fetchWithTimeout(url, {
                method: 'POST',
                headers: this.defaultHeaders,
                body: body
            }, timeout);
            
            const data = await response.json();
            
            return {
                success: response.ok,
                status: response.status,
                statusText: response.statusText,
                data: data,
                responseTime: '0.5s'
            };
        } catch (error) {
            return {
                success: false,
                status: 0,
                statusText: error.message || 'Network Error',
                data: { error: error.message },
                responseTime: '0s',
                isTimeout: error.message.includes('timeout')
            };
        }
    }

    /**
     * Workshop-specific: Search for a patient by name
     */
    async searchPatient(familyName, givenName, timeout = this.defaultTimeout) {
        const params = new URLSearchParams();
        if (familyName) params.append('family', familyName);
        if (givenName) params.append('given', givenName);
        
        const url = `${this.servers.cdr}/Patient?${params.toString()}`;
        
        try {
            const response = await this.fetchWithTimeout(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/fhir+json'
                }
            }, timeout);
            
            const data = await response.json();
            
            return {
                success: response.ok,
                status: response.status,
                statusText: response.statusText,
                data: data,
                responseTime: '0.5s'
            };
        } catch (error) {
            return {
                success: false,
                status: 0,
                statusText: error.message || 'Network Error',
                data: { error: error.message },
                responseTime: '0s',
                isTimeout: error.message.includes('timeout')
            };
        }
    }

    /**
     * Generic GET request
     */
    async get(endpoint, timeout = this.defaultTimeout) {
        const url = endpoint.startsWith('http') ? endpoint : `${this.servers.cdr}${endpoint}`;
        
        try {
            const response = await this.fetchWithTimeout(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/fhir+json'
                }
            }, timeout);
            
            const data = await response.json();
            
            return {
                success: response.ok,
                status: response.status,
                data: data,
                responseTime: '0.5s'
            };
        } catch (error) {
            return {
                success: false,
                status: 0,
                statusText: error.message || 'Network Error',
                data: { error: error.message },
                responseTime: '0s',
                isTimeout: error.message.includes('timeout')
            };
        }
    }

    /**
     * Generic POST request
     */
    async post(endpoint, body, timeout = this.defaultTimeout) {
        const url = endpoint.startsWith('http') ? endpoint : `${this.servers.cdr}${endpoint}`;
        
        try {
            const response = await this.fetchWithTimeout(url, {
                method: 'POST',
                headers: this.defaultHeaders,
                body: JSON.stringify(body)
            }, timeout);
            
            const data = await response.json();
            
            return {
                success: response.ok,
                status: response.status,
                data: data,
                responseTime: '0.5s'
            };
        } catch (error) {
            return {
                success: false,
                status: 0,
                statusText: error.message || 'Network Error',
                data: { error: error.message },
                responseTime: '0s',
                isTimeout: error.message.includes('timeout')
            };
        }
    }

    /**
     * Generic PUT request
     */
    async put(endpoint, body, timeout = this.defaultTimeout) {
        const url = endpoint.startsWith('http') ? endpoint : `${this.servers.cdr}${endpoint}`;
        
        try {
            const response = await this.fetchWithTimeout(url, {
                method: 'PUT',
                headers: this.defaultHeaders,
                body: JSON.stringify(body)
            }, timeout);
            
            const data = await response.json();
            
            return {
                success: response.ok,
                status: response.status,
                data: data,
                responseTime: '0.5s'
            };
        } catch (error) {
            return {
                success: false,
                status: 0,
                statusText: error.message || 'Network Error',
                data: { error: error.message },
                responseTime: '0s',
                isTimeout: error.message.includes('timeout')
            };
        }
    }

    /**
     * Generic DELETE request
     */
    async delete(endpoint, timeout = this.defaultTimeout) {
        const url = endpoint.startsWith('http') ? endpoint : `${this.servers.cdr}${endpoint}`;
        
        try {
            const response = await this.fetchWithTimeout(url, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/fhir+json'
                }
            }, timeout);
            
            return {
                success: response.ok,
                status: response.status,
                data: {},
                responseTime: '0.5s'
            };
        } catch (error) {
            return {
                success: false,
                status: 0,
                statusText: error.message || 'Network Error',
                data: { error: error.message },
                responseTime: '0s',
                isTimeout: error.message.includes('timeout')
            };
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FHIRClient };
}
