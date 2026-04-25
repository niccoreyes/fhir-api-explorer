// ============================================
// FHIR Response Cards - EHR-Style Display
// Renders FHIR resources as expandable cards
// ============================================

class ResponseCards {
    constructor() {
        this.container = null;
    }

    /**
     * Render a FHIR resource or Bundle as cards
     */
    render(data, container) {
        this.container = container;
        this.container.innerHTML = '';

        if (!data) {
            this.container.innerHTML = '<div class="card-empty">No data to display</div>';
            return;
        }

        // Handle different response types
        if (data.resourceType === 'Bundle' && data.entry) {
            this.renderBundle(data);
        } else if (data.resourceType) {
            this.renderResource(data);
        } else if (typeof data === 'object') {
            // Generic object - render as simple card
            this.renderGenericObject(data);
        } else {
            this.container.innerHTML = `<div class="card-empty">${data}</div>`;
        }
    }

    /**
     * Render a Bundle as multiple cards
     */
    renderBundle(bundle) {
        // Bundle header
        const header = document.createElement('div');
        header.className = 'bundle-header';
        header.innerHTML = `
            <span class="bundle-type">${bundle.type || 'unknown'} Bundle</span>
            <span class="bundle-count">${bundle.entry?.length || 0} resources</span>
        `;
        this.container.appendChild(header);

        // Render each entry
        if (bundle.entry && bundle.entry.length > 0) {
            bundle.entry.forEach((entry, index) => {
                const resource = entry.resource;
                if (resource) {
                    const card = this.createResourceCard(resource, index);
                    this.container.appendChild(card);
                }
            });
        }
    }

    /**
     * Render a single resource (wrap in container)
     */
    renderResource(resource) {
        const card = this.createResourceCard(resource);
        this.container.appendChild(card);
    }

    /**
     * Render generic object
     */
    renderGenericObject(obj) {
        const card = document.createElement('div');
        card.className = 'resource-card';
        
        const header = document.createElement('div');
        header.className = 'resource-header';
        header.innerHTML = '<span class="resource-icon">📄</span><span class="resource-type">Response</span>';
        
        const body = document.createElement('div');
        body.className = 'resource-body';
        body.innerHTML = `<pre>${JSON.stringify(obj, null, 2)}</pre>`;
        
        card.appendChild(header);
        card.appendChild(body);
        this.container.appendChild(card);
    }

    /**
     * Create a card for any FHIR resource
     */
    createResourceCard(resource, index = null) {
        const card = document.createElement('div');
        card.className = `resource-card resource-${resource.resourceType?.toLowerCase() || 'generic'}`;
        
        // Create header based on resource type
        const header = this.createResourceHeader(resource, index);
        card.appendChild(header);
        
        // Create body with expandable sections
        const body = document.createElement('div');
        body.className = 'resource-body';
        
        // Resource-specific rendering
        switch (resource.resourceType) {
            case 'Patient':
                body.appendChild(this.renderPatientContent(resource));
                break;
            case 'Observation':
                body.appendChild(this.renderObservationContent(resource));
                break;
            case 'OperationOutcome':
                body.appendChild(this.renderOperationOutcomeContent(resource));
                break;
            case 'CapabilityStatement':
                body.appendChild(this.renderCapabilityStatementContent(resource));
                break;
            case 'ValueSet':
                body.appendChild(this.renderValueSetContent(resource));
                break;
            default:
                body.appendChild(this.renderGenericResourceContent(resource));
        }
        
        card.appendChild(body);
        return card;
    }

    /**
     * Create resource card header
     */
    createResourceHeader(resource, index) {
        const header = document.createElement('div');
        header.className = 'resource-header';
        
        const icon = this.getResourceIcon(resource.resourceType);
        const title = resource.resourceType || 'Unknown';
        const id = resource.id ? `<span class="resource-id">#${resource.id}</span>` : '';
        const indexLabel = index !== null ? `<span class="resource-index">${index + 1}.</span>` : '';
        
        header.innerHTML = `
            ${indexLabel}
            <span class="resource-icon">${icon}</span>
            <span class="resource-type">${title}</span>
            ${id}
        `;
        
        return header;
    }

    /**
     * Get icon for resource type
     */
    getResourceIcon(resourceType) {
        const icons = {
            'Patient': '👤',
            'Observation': '📊',
            'Encounter': '🏥',
            'Condition': '⚕️',
            'MedicationRequest': '💊',
            'Procedure': '🔬',
            'DiagnosticReport': '📋',
            'Practitioner': '👨‍⚕️',
            'Organization': '🏢',
            'Location': '📍',
            'Bundle': '📦',
            'OperationOutcome': '⚠️',
            'CapabilityStatement': '⚙️',
            'ValueSet': '📚',
            'CodeSystem': '🔤',
            'Questionnaire': '📋',
            'QuestionnaireResponse': '✅',
            'Task': '📌',
            'CarePlan': '📋',
            'AllergyIntolerance': '🌡️',
            'Immunization': '💉',
            'DocumentReference': '📄',
            'Composition': '📝',
            'AuditEvent': '🔍',
            'Subscription': '🔔',
            'Patient__$everything': '🔍'
        };
        return icons[resourceType] || '📄';
    }

    // ============================================
    // Resource-Specific Renderers
    // ============================================

    renderPatientContent(patient) {
        const container = document.createElement('div');
        
        // Name (prominent display)
        if (patient.name && patient.name.length > 0) {
            const name = patient.name[0];
            const fullName = this.formatHumanName(name);
            container.appendChild(this.createInfoRow('Name', fullName, 'name-banner'));
        }
        
        // Key demographics row
        const demos = [];
        if (patient.gender) demos.push(`${this.formatGender(patient.gender)}`);
        if (patient.birthDate) demos.push(`Born: ${this.formatDate(patient.birthDate)}`);
        if (patient.deceasedBoolean) demos.push('† Deceased');
        if (demos.length > 0) {
            container.appendChild(this.createInfoRow('Demographics', demos.join(' | '), 'demographics'));
        }
        
        // Expandable: Identifiers
        if (patient.identifier && patient.identifier.length > 0) {
            const idSection = this.createExpandableSection('🆔 Identifiers', patient.identifier.length);
            const idList = document.createElement('div');
            idList.className = 'section-content';
            patient.identifier.forEach(id => {
                idList.appendChild(this.createIdentifierRow(id));
            });
            idSection.querySelector('.expandable-body').appendChild(idList);
            container.appendChild(idSection);
        }
        
        // Expandable: Address
        if (patient.address && patient.address.length > 0) {
            const addrSection = this.createExpandableSection('🏠 Address', patient.address.length);
            const addrList = document.createElement('div');
            addrList.className = 'section-content';
            patient.address.forEach(addr => {
                addrList.appendChild(this.createAddressRow(addr));
            });
            addrSection.querySelector('.expandable-body').appendChild(addrList);
            container.appendChild(addrSection);
        }
        
        // Expandable: Telecom
        if (patient.telecom && patient.telecom.length > 0) {
            const telSection = this.createExpandableSection('📞 Contact', patient.telecom.length);
            const telList = document.createElement('div');
            telList.className = 'section-content';
            patient.telecom.forEach(tel => {
                telList.appendChild(this.createTelecomRow(tel));
            });
            telSection.querySelector('.expandable-body').appendChild(telList);
            container.appendChild(telSection);
        }
        
        return container;
    }

    renderObservationContent(obs) {
        const container = document.createElement('div');
        
        // Main value (prominent)
        const valueDisplay = this.formatObservationValue(obs);
        if (valueDisplay) {
            container.appendChild(this.createInfoRow('Value', valueDisplay, 'observation-value'));
        }
        
        // Code
        if (obs.code) {
            const codeText = this.formatCodeableConcept(obs.code);
            container.appendChild(this.createInfoRow('Type', codeText, 'observation-code'));
        }
        
        // Date
        if (obs.effectiveDateTime || obs.issued) {
            const date = obs.effectiveDateTime || obs.issued;
            container.appendChild(this.createInfoRow('Date', this.formatDate(date), 'date'));
        }
        
        // Reference ranges
        if (obs.referenceRange && obs.referenceRange.length > 0) {
            const range = obs.referenceRange[0];
            const rangeText = this.formatReferenceRange(range);
            container.appendChild(this.createInfoRow('Reference Range', rangeText, 'reference-range'));
        }
        
        // Subject
        if (obs.subject && obs.subject.reference) {
            container.appendChild(this.createInfoRow('Patient', obs.subject.reference, 'reference'));
        }
        
        // Status
        if (obs.status) {
            container.appendChild(this.createInfoRow('Status', obs.status, `status-${obs.status}`));
        }
        
        return container;
    }

    renderOperationOutcomeContent(outcome) {
        const container = document.createElement('div');
        
        if (outcome.issue && outcome.issue.length > 0) {
            outcome.issue.forEach((issue, idx) => {
                const severity = issue.severity || 'information';
                const issueCard = document.createElement('div');
                issueCard.className = `outcome-issue severity-${severity}`;
                
                issueCard.innerHTML = `
                    <div class="outcome-header">
                        <span class="outcome-severity">${severity.toUpperCase()}</span>
                        <span class="outcome-code">${issue.code || 'unknown'}</span>
                    </div>
                    <div class="outcome-message">${issue.diagnostics || issue.details?.text || 'No details'}</div>
                `;
                
                container.appendChild(issueCard);
            });
        }
        
        return container;
    }

    renderCapabilityStatementContent(capability) {
        const container = document.createElement('div');
        
        // Server info
        if (capability.software) {
            container.appendChild(this.createInfoRow('Software', 
                `${capability.software.name} ${capability.software.version || ''}`, 'software'));
        }
        
        if (capability.fhirVersion) {
            container.appendChild(this.createInfoRow('FHIR Version', capability.fhirVersion, 'fhir-version'));
        }
        
        // Formats
        if (capability.format && capability.format.length > 0) {
            container.appendChild(this.createInfoRow('Formats', capability.format.join(', '), 'formats'));
        }
        
        // Resources supported
        if (capability.rest && capability.rest.length > 0 && capability.rest[0].resource) {
            const resources = capability.rest[0].resource;
            const section = this.createExpandableSection('📦 Supported Resources', resources.length);
            const list = document.createElement('div');
            list.className = 'section-content resource-list';
            
            resources.forEach(r => {
                const item = document.createElement('div');
                item.className = 'resource-list-item';
                item.innerHTML = `<strong>${r.type}</strong> ${r.interaction?.map(i => i.code).join(', ') || ''}`;
                list.appendChild(item);
            });
            
            section.querySelector('.expandable-body').appendChild(list);
            container.appendChild(section);
        }
        
        return container;
    }

    renderValueSetContent(vs) {
        const container = document.createElement('div');
        
        if (vs.name) {
            container.appendChild(this.createInfoRow('Name', vs.name, 'name'));
        }
        
        if (vs.url) {
            container.appendChild(this.createInfoRow('URL', vs.url, 'url'));
        }
        
        if (vs.status) {
            container.appendChild(this.createInfoRow('Status', vs.status, `status-${vs.status}`));
        }
        
        if (vs.version) {
            container.appendChild(this.createInfoRow('Version', vs.version, 'version'));
        }
        
        // Expansion
        if (vs.expansion && vs.expansion.contains) {
            const section = this.createExpandableSection('📖 Codes', vs.expansion.contains.length);
            const list = document.createElement('div');
            list.className = 'section-content code-list';
            
            vs.expansion.contains.forEach(code => {
                const item = document.createElement('div');
                item.className = 'code-list-item';
                item.innerHTML = `
                    <code class="code-value">${code.code}</code>
                    <span class="code-display">${code.display || ''}</span>
                    <span class="code-system">${code.system?.split('/').pop() || ''}</span>
                `;
                list.appendChild(item);
            });
            
            section.querySelector('.expandable-body').appendChild(list);
            container.appendChild(section);
        }
        
        return container;
    }

    renderGenericResourceContent(resource) {
        const container = document.createElement('div');
        
        // Show top-level fields
        Object.entries(resource).forEach(([key, value]) => {
            if (key === 'resourceType' || key === 'id' || key === 'meta') return;
            
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                container.appendChild(this.createInfoRow(key, String(value), 'field'));
            } else if (Array.isArray(value) && value.length > 0) {
                const section = this.createExpandableSection(key, value.length);
                const list = document.createElement('div');
                list.className = 'section-content';
                list.innerHTML = `<pre>${JSON.stringify(value, null, 2)}</pre>`;
                section.querySelector('.expandable-body').appendChild(list);
                container.appendChild(section);
            }
        });
        
        return container;
    }

    // ============================================
    // Helper Methods
    // ============================================

    createInfoRow(label, value, extraClass = '') {
        const row = document.createElement('div');
        row.className = `info-row ${extraClass}`;
        row.innerHTML = `
            <span class="info-label">${label}</span>
            <span class="info-value">${value}</span>
        `;
        return row;
    }

    createExpandableSection(title, count) {
        const section = document.createElement('div');
        section.className = 'expandable-section';
        
        const header = document.createElement('div');
        header.className = 'expandable-header';
        header.innerHTML = `
            <span class="expand-icon">▶</span>
            <span class="expand-title">${title}</span>
            <span class="expand-count">(${count})</span>
        `;
        
        const body = document.createElement('div');
        body.className = 'expandable-body';
        body.style.display = 'none';
        
        header.addEventListener('click', () => {
            const isExpanded = body.style.display !== 'none';
            body.style.display = isExpanded ? 'none' : 'block';
            header.querySelector('.expand-icon').textContent = isExpanded ? '▶' : '▼';
            section.classList.toggle('expanded', !isExpanded);
        });
        
        section.appendChild(header);
        section.appendChild(body);
        return section;
    }

    createIdentifierRow(id) {
        const row = document.createElement('div');
        row.className = 'identifier-row';
        const use = id.use ? `<span class="id-use">${id.use}</span>` : '';
        const system = id.system ? `<span class="id-system">${this.truncateUrl(id.system)}</span>` : '';
        row.innerHTML = `${use} ${system}<br><code class="id-value">${id.value || 'N/A'}</code>`;
        return row;
    }

    createAddressRow(addr) {
        const row = document.createElement('div');
        row.className = 'address-row';
        const lines = addr.line || [];
        const city = addr.city || '';
        const country = addr.country || '';
        const use = addr.use ? `<span class="addr-use">${addr.use}</span>` : '';
        const type = addr.type ? `<span class="addr-type">${addr.type}</span>` : '';
        
        row.innerHTML = `
            ${use} ${type}<br>
            ${lines.map(l => `<div class="addr-line">${l}</div>`).join('')}
            <div class="addr-city">${city}${country ? ', ' + country : ''}</div>
        `;
        return row;
    }

    createTelecomRow(tel) {
        const row = document.createElement('div');
        row.className = 'telecom-row';
        const use = tel.use ? `<span class="tel-use">${tel.use}</span>` : '';
        const system = tel.system ? `<span class="tel-system">${tel.system}</span>` : '';
        row.innerHTML = `${use} ${system}<br><code class="tel-value">${tel.value || 'N/A'}</code>`;
        return row;
    }

    formatHumanName(name) {
        const family = name.family || '';
        const given = name.given ? name.given.join(' ') : '';
        const prefix = name.prefix ? name.prefix.join(' ') : '';
        const suffix = name.suffix ? name.suffix.join(' ') : '';
        return `${prefix} ${given} ${family} ${suffix}`.trim();
    }

    formatGender(gender) {
        const symbols = { 'male': '♂', 'female': '♀', 'other': '⚧', 'unknown': '?' };
        return `${symbols[gender] || ''} ${gender.charAt(0).toUpperCase() + gender.slice(1)}`;
    }

    formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        } catch (e) {
            return dateStr;
        }
    }

    formatCodeableConcept(cc) {
        if (!cc) return 'N/A';
        if (cc.text) return cc.text;
        if (cc.coding && cc.coding.length > 0) {
            const coding = cc.coding[0];
            return coding.display || coding.code || 'Unknown';
        }
        return 'N/A';
    }

    formatObservationValue(obs) {
        if (obs.valueQuantity) {
            const q = obs.valueQuantity;
            return `${q.value} ${q.unit || ''}`;
        }
        if (obs.valueCodeableConcept) {
            return this.formatCodeableConcept(obs.valueCodeableConcept);
        }
        if (obs.valueString) return obs.valueString;
        if (obs.valueBoolean !== undefined) return obs.valueBoolean ? 'Yes' : 'No';
        if (obs.valueInteger !== undefined) return String(obs.valueInteger);
        if (obs.valueDateTime) return this.formatDate(obs.valueDateTime);
        if (obs.component && obs.component.length > 0) {
            return obs.component.map(c => this.formatObservationValue(c)).join(', ');
        }
        return null;
    }

    formatReferenceRange(range) {
        const low = range.low ? `${range.low.value}${range.low.unit || ''}` : '';
        const high = range.high ? `${range.high.value}${range.high.unit || ''}` : '';
        if (low && high) return `${low} - ${high}`;
        if (low) return `≥ ${low}`;
        if (high) return `≤ ${high}`;
        return 'N/A';
    }

    truncateUrl(url, maxLen = 40) {
        if (!url) return '';
        if (url.length <= maxLen) return url;
        return url.substring(0, maxLen - 3) + '...';
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ResponseCards };
}
