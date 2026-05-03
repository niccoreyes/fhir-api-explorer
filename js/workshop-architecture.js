// ============================================
// Workshop Architecture View - Steps as Rows, Entities as Columns
// Traditional swimlane showing workflow progression
// ============================================

class ArchitectureView {
    constructor(containerId, svgId) {
        this.container = document.getElementById(containerId);
        this.svg = document.getElementById(svgId);
        this.animationMode = 'packet';
        this.activeAnimations = [];
        
        // Configuration: Steps (rows) and Entities (columns)
        this.config = {
            steps: [
                { id: 'step1', label: 'Step 1: Create/Search Request', height: 120 },
                { id: 'step2', label: 'Step 2: FHIR Server Processing', height: 120 },
                { id: 'step3', label: 'Step 3: Store/Retrieve Results', height: 120 },
                { id: 'step4', label: 'Step 4: Return Response', height: 120 }
            ],
            entities: [
                { id: 'rhu', label: '🏥 RHU', sublabel: 'Rural Health Unit', color: '#3b82f6', x: 150 },
                { id: 'shr', label: '🔶 SHR', sublabel: 'Shared Health Record', color: '#f97316', x: 450 },
                { id: 'hospital', label: '🏨 Hospital', sublabel: 'Provincial Hospital', color: '#ec4899', x: 750 }
            ]
        };

        this.init();
    }

    init() {
        this.renderSwimlaneDiagram();
        this.setupEventListeners();
    }

    // ============================================
    // RENDER SWIMLANE DIAGRAM
    // ============================================

    renderSwimlaneDiagram() {
        // Clear existing content
        this.svg.innerHTML = '';
        
        // Set viewBox for proper scaling
        const totalHeight = 150 + (this.config.steps.length * 130) + 50;
        this.svg.setAttribute('viewBox', `0 0 900 ${totalHeight}`);
        this.svg.style.background = '#f8fafc';

        // Define arrow marker
        const defs = this.createSVGElement('defs');
        const marker = this.createSVGElement('marker', {
            id: 'arrowhead',
            markerWidth: '10',
            markerHeight: '10',
            refX: '9',
            refY: '3',
            orient: 'auto'
        });
        const polygon = this.createSVGElement('polygon', {
            points: '0 0, 10 3, 0 6',
            fill: '#64748b'
        });
        marker.appendChild(polygon);
        defs.appendChild(marker);
        this.svg.appendChild(defs);

        // Draw column headers (entities)
        this.drawColumnHeaders();
        
        // Draw grid lines
        this.drawGridLines(totalHeight);
        
        // Draw step labels (rows)
        this.drawStepLabels();
        
        // Draw workflow content
        this.drawWorkflowSteps();
    }

    drawColumnHeaders() {
        // Header background
        const headerBg = this.createSVGElement('rect', {
            x: '0',
            y: '0',
            width: '900',
            height: '100',
            fill: '#ffffff',
            stroke: '#e2e8f0',
            'stroke-width': '1'
        });
        this.svg.appendChild(headerBg);

        // Entity columns
        this.config.entities.forEach(entity => {
            // Column background
            const colBg = this.createSVGElement('rect', {
                x: entity.x - 100,
                y: '0',
                width: '200',
                height: '100',
                fill: entity.color + '15', // 15 = ~8% opacity in hex
                stroke: entity.color,
                'stroke-width': '2',
                rx: '8'
            });
            this.svg.appendChild(colBg);

            // Entity icon/label
            const label = this.createSVGElement('text', {
                x: entity.x,
                y: '35',
                fill: entity.color,
                'font-size': '16',
                'font-weight': 'bold',
                'text-anchor': 'middle',
                'font-family': 'system-ui, sans-serif'
            });
            label.textContent = entity.label;
            this.svg.appendChild(label);

            // Entity sublabel
            const sublabel = this.createSVGElement('text', {
                x: entity.x,
                y: '55',
                fill: '#64748b',
                'font-size': '11',
                'text-anchor': 'middle',
                'font-family': 'system-ui, sans-serif'
            });
            sublabel.textContent = entity.sublabel;
            this.svg.appendChild(sublabel);

            // Role description
            const role = this.createSVGElement('text', {
                x: entity.x,
                y: '75',
                fill: '#94a3b8',
                'font-size': '10',
                'text-anchor': 'middle',
                'font-family': 'system-ui, sans-serif'
            });
            role.textContent = entity.id === 'rhu' ? 'Creates patients' : 
                              entity.id === 'shr' ? 'Stores & indexes' : 
                              'Searches records';
            this.svg.appendChild(role);
        });

        // Separator line
        const separator = this.createSVGElement('line', {
            x1: '0',
            y1: '100',
            x2: '900',
            y2: '100',
            stroke: '#cbd5e1',
            'stroke-width': '2'
        });
        this.svg.appendChild(separator);
    }

    drawGridLines(totalHeight) {
        // Vertical lines between columns
        this.config.entities.forEach((entity, index) => {
            if (index < this.config.entities.length - 1) {
                const nextEntity = this.config.entities[index + 1];
                const midX = (entity.x + nextEntity.x) / 2;
                
                const line = this.createSVGElement('line', {
                    x1: midX,
                    y1: '100',
                    x2: midX,
                    y2: totalHeight - 50,
                    stroke: '#e2e8f0',
                    'stroke-width': '1',
                    'stroke-dasharray': '5,5'
                });
                this.svg.appendChild(line);
            }
        });
    }

    drawStepLabels() {
        let currentY = 150;
        
        this.config.steps.forEach((step, index) => {
            // Step label background
            const labelBg = this.createSVGElement('rect', {
                x: '10',
                y: currentY - 15,
                width: '120',
                height: '30',
                fill: '#f1f5f9',
                stroke: '#cbd5e1',
                'stroke-width': '1',
                rx: '4'
            });
            this.svg.appendChild(labelBg);

            // Step label
            const label = this.createSVGElement('text', {
                x: '70',
                y: currentY + 5,
                fill: '#475569',
                'font-size': '11',
                'font-weight': '600',
                'text-anchor': 'middle',
                'font-family': 'system-ui, sans-serif'
            });
            label.textContent = `Step ${index + 1}`;
            this.svg.appendChild(label);

            // Horizontal separator
            const separator = this.createSVGElement('line', {
                x1: '0',
                y1: currentY + step.height / 2 + 10,
                x2: '900',
                y2: currentY + step.height / 2 + 10,
                stroke: '#e2e8f0',
                'stroke-width': '1'
            });
            this.svg.appendChild(separator);

            currentY += step.height + 10;
        });
    }

    drawWorkflowSteps() {
        let currentY = 150;

        // Step 1: Create Request (RHU) → SHR receives
        this.drawAPIBox({
            x: 150,
            y: currentY - 10,
            entity: 'rhu',
            method: 'POST',
            endpoint: '/Patient',
            description: 'Create patient record',
            color: '#3b82f6'
        });

        this.drawArrow({
            x1: 250,
            y1: currentY + 40,
            x2: 350,
            y2: currentY + 40,
            color: '#3b82f6',
            label: 'Request'
        });

        currentY += 130;

        // Step 2: SHR processes
        this.drawAPIBox({
            x: 450,
            y: currentY - 10,
            entity: 'shr',
            method: 'PROCESS',
            endpoint: 'Validate & Store',
            description: 'FHIR server validates and stores',
            color: '#f97316'
        });

        currentY += 130;

        // Step 3: SHR indexes / Search available
        this.drawAPIBox({
            x: 450,
            y: currentY - 10,
            entity: 'shr',
            method: 'INDEX',
            endpoint: 'Patient Index',
            description: 'Available for search',
            color: '#f97316'
        });

        this.drawArrow({
            x1: 550,
            y1: currentY + 40,
            x2: 650,
            y2: currentY + 40,
            color: '#64748b',
            label: 'Available',
            dashed: true
        });

        // Search request from Hospital
        this.drawAPIBox({
            x: 750,
            y: currentY - 10,
            entity: 'hospital',
            method: 'GET',
            endpoint: '/Patient?name=',
            description: 'Search for patient',
            color: '#ec4899'
        });

        currentY += 130;

        // Step 4: Return results
        this.drawArrow({
            x1: 650,
            y1: currentY + 40,
            x2: 550,
            y2: currentY + 40,
            color: '#10b981',
            label: 'Bundle',
            dashed: true,
            reverse: true
        });

        this.drawAPIBox({
            x: 450,
            y: currentY - 10,
            entity: 'shr',
            method: 'RETURN',
            endpoint: 'Bundle',
            description: 'Return search results',
            color: '#10b981'
        });

        this.drawArrow({
            x1: 350,
            y1: currentY + 40,
            x2: 250,
            y2: currentY + 40,
            color: '#10b981',
            label: 'Response',
            dashed: true,
            reverse: true
        });

        this.drawAPIBox({
            x: 750,
            y: currentY - 10,
            entity: 'hospital',
            method: 'RECEIVE',
            endpoint: 'Patient Data',
            description: 'Display results',
            color: '#10b981'
        });
    }

    drawAPIBox(config) {
        const { x, y, method, endpoint, description, color } = config;
        const boxWidth = 180;
        const boxHeight = 80;

        // Box background
        const rect = this.createSVGElement('rect', {
            x: x - boxWidth/2,
            y: y,
            width: boxWidth,
            height: boxHeight,
            fill: '#ffffff',
            stroke: color,
            'stroke-width': '2',
            rx: '8',
            class: 'api-box'
        });
        this.svg.appendChild(rect);

        // Method badge
        const methodBg = this.createSVGElement('rect', {
            x: x - boxWidth/2 + 8,
            y: y + 8,
            width: 50,
            height: 18,
            fill: color,
            rx: '3'
        });
        this.svg.appendChild(methodBg);

        const methodText = this.createSVGElement('text', {
            x: x - boxWidth/2 + 33,
            y: y + 21,
            fill: '#ffffff',
            'font-size': '9',
            'font-weight': 'bold',
            'text-anchor': 'middle',
            'font-family': 'system-ui, sans-serif'
        });
        methodText.textContent = method;
        this.svg.appendChild(methodText);

        // Endpoint
        const endpointText = this.createSVGElement('text', {
            x: x - boxWidth/2 + 65,
            y: y + 21,
            fill: '#374151',
            'font-size': '9',
            'font-weight': '600',
            'font-family': 'monospace'
        });
        endpointText.textContent = endpoint.length > 18 ? endpoint.substring(0, 18) + '...' : endpoint;
        this.svg.appendChild(endpointText);

        // Description
        const descText = this.createSVGElement('text', {
            x: x,
            y: y + 50,
            fill: '#6b7280',
            'font-size': '9',
            'text-anchor': 'middle',
            'font-family': 'system-ui, sans-serif'
        });
        descText.textContent = description.length > 25 ? description.substring(0, 25) + '...' : description;
        this.svg.appendChild(descText);

        // Make interactive
        rect.style.cursor = 'pointer';
        rect.addEventListener('click', () => {
            this.showAPIDetails(config);
        });
    }

    drawArrow(config) {
        const { x1, y1, x2, y2, label, color, dashed, reverse } = config;

        // Create curved path
        const midX = (x1 + x2) / 2;
        const controlY = y1 - 20;

        const path = this.createSVGElement('path', {
            d: `M ${x1} ${y1} Q ${midX} ${controlY} ${x2} ${y2}`,
            fill: 'none',
            stroke: color,
            'stroke-width': '2',
            'marker-end': reverse ? '' : 'url(#arrowhead)',
            'marker-start': reverse ? 'url(#arrowhead)' : '',
            'stroke-dasharray': dashed ? '5,5' : '0'
        });
        this.svg.appendChild(path);

        // Label
        if (label) {
            const labelBg = this.createSVGElement('rect', {
                x: midX - 30,
                y: controlY - 10,
                width: 60,
                height: 16,
                fill: '#ffffff',
                stroke: color,
                'stroke-width': '1',
                rx: '3',
                opacity: '0.9'
            });
            this.svg.appendChild(labelBg);

            const labelText = this.createSVGElement('text', {
                x: midX,
                y: controlY,
                fill: color,
                'font-size': '8',
                'font-weight': '600',
                'text-anchor': 'middle',
                'font-family': 'system-ui, sans-serif'
            });
            labelText.textContent = label;
            this.svg.appendChild(labelText);
        }
    }

    showAPIDetails(config) {
        const event = new CustomEvent('showAPIDetails', {
            detail: config
        });
        document.dispatchEvent(event);
    }

    // ============================================
    // ANIMATIONS
    // ============================================

    animateDataFlow(from, to, data) {
        // Map system names to entities
        const entityMap = {
            'rhu': 150, 'group1': 150, 'group2': 150,
            'shr': 450, 'fhirlab': 450,
            'hospital': 750, 'group3': 750, 'group4': 750, 'group5': 750
        };

        const startX = entityMap[from];
        const endX = entityMap[to];
        
        if (!startX || !endX) return;

        // Create animated packet
        const packet = this.createSVGElement('circle', {
            r: '8',
            fill: data.color || '#3b82f6',
            stroke: '#ffffff',
            'stroke-width': '2',
            class: 'data-packet'
        });

        // Animate through the steps
        const yPositions = [190, 320, 450, 580];
        let currentStep = 0;

        const animateStep = () => {
            if (currentStep >= yPositions.length) {
                if (packet.parentNode) {
                    packet.parentNode.removeChild(packet);
                }
                return;
            }

            const y = yPositions[currentStep];
            const x = currentStep % 2 === 0 ? startX : endX;
            
            packet.setAttribute('cx', x);
            packet.setAttribute('cy', y);
            
            if (!packet.parentNode) {
                this.svg.appendChild(packet);
            }

            currentStep++;
            setTimeout(animateStep, 600);
        };

        animateStep();
    }

    // ============================================
    // EVENT HANDLERS
    // ============================================

    setupEventListeners() {
        document.addEventListener('fhirDataFlow', (e) => {
            const { from, to, data } = e.detail;
            this.animateDataFlow(from, to, data);
        });
    }

    createSVGElement(tag, attributes = {}) {
        const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
        Object.entries(attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });
        return element;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ArchitectureView };
}
