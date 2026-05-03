// ============================================
// Workshop Architecture View - Light Mode Swimlane Diagram
// Based on OpenFHIR architecture style
// ============================================

class ArchitectureView {
    constructor(containerId, svgId) {
        this.container = document.getElementById(containerId);
        this.svg = document.getElementById(svgId);
        this.animationMode = 'packet';
        this.activeAnimations = [];
        
        // Swimlane configuration
        this.swimlanes = {
            rhu: { 
                label: '🏥 RURAL HEALTH UNIT', 
                y: 80, 
                height: 180,
                color: '#dbeafe',
                textColor: '#1e40af'
            },
            shr: { 
                label: '🔶 FHIRLAB SHR', 
                y: 280, 
                height: 140,
                color: '#ffedd5',
                textColor: '#9a3412'
            },
            hospital: { 
                label: '🏨 PROVINCIAL HOSPITAL', 
                y: 440, 
                height: 180,
                color: '#fce7f3',
                textColor: '#9d174d'
            }
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
        this.svg.setAttribute('viewBox', '0 0 900 640');
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

        // Draw swimlanes
        this.drawSwimlanes();
        
        // Draw flow arrows and API calls
        this.drawFlowArrows();
        
        // Draw time axis
        this.drawTimeAxis();
    }

    drawSwimlanes() {
        Object.entries(this.swimlanes).forEach(([key, lane]) => {
            // Swimlane background
            const rect = this.createSVGElement('rect', {
                x: '0',
                y: lane.y,
                width: '900',
                height: lane.height,
                fill: lane.color,
                stroke: '#e2e8f0',
                'stroke-width': '1'
            });
            this.svg.appendChild(rect);

            // Swimlane label
            const label = this.createSVGElement('text', {
                x: '20',
                y: lane.y + 25,
                fill: lane.textColor,
                'font-size': '14',
                'font-weight': 'bold',
                'font-family': 'system-ui, sans-serif'
            });
            label.textContent = lane.label;
            this.svg.appendChild(label);

            // Add role description
            const roleDesc = this.createSVGElement('text', {
                x: '20',
                y: lane.y + 45,
                fill: lane.textColor,
                'font-size': '11',
                'font-family': 'system-ui, sans-serif',
                opacity: '0.7'
            });
            roleDesc.textContent = key === 'rhu' ? 'Creates patient records' :
                                   key === 'shr' ? 'Shared Health Record - stores all data' :
                                   'Searches for patient records';
            this.svg.appendChild(roleDesc);

            // Separator line
            if (key !== 'hospital') {
                const line = this.createSVGElement('line', {
                    x1: '0',
                    y1: lane.y + lane.height,
                    x2: '900',
                    y2: lane.y + lane.height,
                    stroke: '#cbd5e1',
                    'stroke-width': '2'
                });
                this.svg.appendChild(line);
            }
        });
    }

    drawFlowArrows() {
        // Step 1: Group 1/2 CREATE Patient
        this.drawAPICallBox({
            x: 100,
            y: 110,
            width: 200,
            height: 80,
            lane: 'rhu',
            method: 'POST',
            endpoint: '/Patient',
            description: 'Create Patient',
            headers: ['Content-Type: application/fhir+json'],
            body: '{\n  "resourceType": "Patient",\n  "name": [{\n    "family": "Dela Cruz",\n    "given": ["Rico"]\n  }]\n}',
            color: '#3b82f6'
        });

        // Arrow from RHU to SHR
        this.drawArrow({
            x1: 300,
            y1: 150,
            x2: 350,
            y2: 340,
            label: 'Store Patient',
            color: '#3b82f6'
        });

        // Step 2: SHR stores patient
        this.drawAPICallBox({
            x: 380,
            y: 310,
            width: 200,
            height: 80,
            lane: 'shr',
            method: 'STORE',
            endpoint: 'Patient Index',
            description: 'Index Patient',
            headers: ['Tag: group1-case1-create'],
            body: 'Patient stored with ID: {generated}',
            color: '#f97316'
        });

        // Arrow from SHR to Hospital
        this.drawArrow({
            x1: 580,
            y1: 350,
            x2: 630,
            y2: 480,
            label: 'Available for search',
            color: '#64748b',
            dashed: true
        });

        // Step 3: Group 3/4/5 SEARCH Patient
        this.drawAPICallBox({
            x: 650,
            y: 470,
            width: 200,
            height: 80,
            lane: 'hospital',
            method: 'GET',
            endpoint: '/Patient?name=Rico',
            description: 'Search Patient',
            headers: ['Accept: application/fhir+json'],
            body: 'Query: family=Dela Cruz&given=Rico',
            color: '#ec4899'
        });

        // Return arrow with result
        this.drawArrow({
            x1: 650,
            y1: 510,
            x2: 580,
            y2: 370,
            label: 'Return Bundle',
            color: '#10b981',
            dashed: true,
            reverse: true
        });
    }

    drawAPICallBox(config) {
        const { x, y, width, height, method, endpoint, description, headers, body, color } = config;

        // Box background
        const rect = this.createSVGElement('rect', {
            x: x,
            y: y,
            width: width,
            height: height,
            fill: '#ffffff',
            stroke: color,
            'stroke-width': '2',
            rx: '8',
            class: 'api-call-box'
        });
        this.svg.appendChild(rect);

        // Method badge
        const methodBadge = this.createSVGElement('rect', {
            x: x + 10,
            y: y + 10,
            width: 50,
            height: 20,
            fill: color,
            rx: '4'
        });
        this.svg.appendChild(methodBadge);

        const methodText = this.createSVGElement('text', {
            x: x + 35,
            y: y + 24,
            fill: '#ffffff',
            'font-size': '10',
            'font-weight': 'bold',
            'text-anchor': 'middle',
            'font-family': 'system-ui, sans-serif'
        });
        methodText.textContent = method;
        this.svg.appendChild(methodText);

        // Endpoint
        const endpointText = this.createSVGElement('text', {
            x: x + 70,
            y: y + 24,
            fill: '#374151',
            'font-size': '11',
            'font-weight': '600',
            'font-family': 'monospace'
        });
        endpointText.textContent = endpoint;
        this.svg.appendChild(endpointText);

        // Description
        const descText = this.createSVGElement('text', {
            x: x + 10,
            y: y + 45,
            fill: '#6b7280',
            'font-size': '10',
            'font-family': 'system-ui, sans-serif'
        });
        descText.textContent = description;
        this.svg.appendChild(descText);

        // Headers
        let currentY = y + 62;
        headers.forEach(header => {
            const headerText = this.createSVGElement('text', {
                x: x + 10,
                y: currentY,
                fill: '#9ca3af',
                'font-size': '8',
                'font-family': 'monospace'
            });
            headerText.textContent = `H: ${header}`;
            this.svg.appendChild(headerText);
            currentY += 10;
        });

        // Make it clickable for details
        rect.style.cursor = 'pointer';
        rect.addEventListener('click', () => {
            this.showAPIDetails(config);
        });
    }

    drawArrow(config) {
        const { x1, y1, x2, y2, label, color, dashed, reverse } = config;

        // Calculate control points for curved arrow
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        
        // Create path
        const path = this.createSVGElement('path', {
            d: `M ${x1} ${y1} Q ${midX} ${y1} ${midX} ${midY} T ${x2} ${y2}`,
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
            const labelText = this.createSVGElement('text', {
                x: midX,
                y: midY - 5,
                fill: color,
                'font-size': '10',
                'font-weight': '600',
                'text-anchor': 'middle',
                'font-family': 'system-ui, sans-serif',
                class: 'arrow-label'
            });
            labelText.textContent = label;
            this.svg.appendChild(labelText);
        }
    }

    drawTimeAxis() {
        // Time labels at bottom
        const timeLabels = ['Start', 'Request', 'Process', 'Response', 'Complete'];
        const xPositions = [50, 250, 450, 650, 850];

        timeLabels.forEach((label, index) => {
            const x = xPositions[index];
            
            // Vertical line
            const line = this.createSVGElement('line', {
                x1: x,
                y1: 620,
                x2: x,
                y2: 635,
                stroke: '#cbd5e1',
                'stroke-width': '2'
            });
            this.svg.appendChild(line);

            // Label
            const text = this.createSVGElement('text', {
                x: x,
                y: 650,
                fill: '#64748b',
                'font-size': '10',
                'text-anchor': 'middle',
                'font-family': 'system-ui, sans-serif'
            });
            text.textContent = label;
            this.svg.appendChild(text);
        });

        // Time axis line
        const axisLine = this.createSVGElement('line', {
            x1: 50,
            y1: 630,
            x2: 850,
            y2: 630,
            stroke: '#cbd5e1',
            'stroke-width': '2'
        });
        this.svg.appendChild(axisLine);
    }

    showAPIDetails(config) {
        // Show detailed API information
        const event = new CustomEvent('showAPIDetails', {
            detail: config
        });
        document.dispatchEvent(event);
    }

    // ============================================
    // ANIMATIONS
    // ============================================

    animateDataFlow(from, to, data) {
        // Get swimlane positions
        const fromLane = this.swimlanes[from];
        const toLane = this.swimlanes[to];
        
        if (!fromLane || !toLane) return;

        // Create animated packet
        const packet = this.createSVGElement('circle', {
            r: '8',
            fill: data.color || '#3b82f6',
            stroke: '#ffffff',
            'stroke-width': '2',
            class: 'data-packet'
        });

        // Starting position
        const startX = 200;
        const startY = fromLane.y + 50;
        const endX = 600;
        const endY = toLane.y + 50;

        packet.setAttribute('cx', startX);
        packet.setAttribute('cy', startY);
        this.svg.appendChild(packet);

        // Animate
        const duration = 2000;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease out
            const easeOut = 1 - Math.pow(1 - progress, 3);
            
            const currentX = startX + (endX - startX) * easeOut;
            const currentY = startY + (endY - startY) * easeOut;
            
            packet.setAttribute('cx', currentX);
            packet.setAttribute('cy', currentY);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Flash the destination swimlane
                this.flashSwimlane(to);
                
                // Remove packet after delay
                setTimeout(() => {
                    if (packet.parentNode) {
                        packet.parentNode.removeChild(packet);
                    }
                }, 1000);
            }
        };

        requestAnimationFrame(animate);
    }

    flashSwimlane(laneKey) {
        const lane = this.swimlanes[laneKey];
        if (!lane) return;

        // Create flash effect
        const flash = this.createSVGElement('rect', {
            x: '0',
            y: lane.y,
            width: '900',
            height: lane.height,
            fill: '#ffffff',
            opacity: '0.3',
            class: 'lane-flash'
        });
        
        this.svg.appendChild(flash);

        // Fade out
        let opacity = 0.3;
        const fade = () => {
            opacity -= 0.02;
            flash.setAttribute('opacity', opacity);
            
            if (opacity > 0) {
                requestAnimationFrame(fade);
            } else {
                if (flash.parentNode) {
                    flash.parentNode.removeChild(flash);
                }
            }
        };
        
        requestAnimationFrame(fade);
    }

    // ============================================
    // EVENT HANDLERS
    // ============================================

    setupEventListeners() {
        document.addEventListener('fhirDataFlow', (e) => {
            const { from, to, data } = e.detail;
            
            // Map system names to swimlanes
            const laneMap = {
                'group1': 'rhu', 'group2': 'rhu',
                'group3': 'hospital', 'group4': 'hospital', 'group5': 'hospital',
                'shr': 'shr'
            };

            const fromLane = laneMap[from];
            const toLane = laneMap[to];

            if (fromLane && toLane) {
                this.animateDataFlow(fromLane, toLane, data);
            }
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
