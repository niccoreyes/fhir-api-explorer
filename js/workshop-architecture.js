// ============================================
// Workshop Architecture View - SVG Swimlane Diagram
// ============================================

class ArchitectureView {
    constructor(containerId, svgId) {
        this.container = document.getElementById(containerId);
        this.svg = document.getElementById(svgId);
        this.animationMode = 'packet'; // 'packet' or 'progress'
        this.activeAnimations = [];
        
        // System positions (calculated based on SVG size)
        this.systems = {
            group1: { x: 100, y: 100, label: 'Group 1', color: '#3b82f6' },
            group2: { x: 100, y: 200, label: 'Group 2', color: '#8b5cf6' },
            group3: { x: 700, y: 100, label: 'Group 3', color: '#ec4899' },
            group4: { x: 700, y: 200, label: 'Group 4', color: '#10b981' },
            group5: { x: 700, y: 300, label: 'Group 5', color: '#f59e0b' },
            shr: { x: 400, y: 200, label: 'FHIRLab SHR', color: '#f97316' }
        };

        this.init();
    }

    init() {
        this.renderBaseDiagram();
        this.setupEventListeners();
    }

    // ============================================
    // RENDER BASE DIAGRAM
    // ============================================

    renderBaseDiagram() {
        // Clear existing content
        this.svg.innerHTML = '';

        // Define gradients and markers
        const defs = this.createSVGElement('defs');
        
        // Arrow marker
        const marker = this.createSVGElement('marker', {
            id: 'arrowhead',
            markerWidth: '10',
            markerHeight: '7',
            refX: '9',
            refY: '3.5',
            orient: 'auto'
        });
        const polygon = this.createSVGElement('polygon', {
            points: '0 0, 10 3.5, 0 7',
            fill: '#94a3b8'
        });
        marker.appendChild(polygon);
        defs.appendChild(marker);
        
        this.svg.appendChild(defs);

        // Draw connections (lines between systems)
        this.drawConnections();

        // Draw systems (nodes)
        Object.entries(this.systems).forEach(([key, system]) => {
            this.drawSystem(system, key);
        });

        // Draw swimlane labels
        this.drawSwimlaneLabels();
    }

    drawConnections() {
        // Connections from groups to SHR
        const leftGroups = ['group1', 'group2'];
        const rightGroups = ['group3', 'group4', 'group5'];

        // Left side connections
        leftGroups.forEach(groupKey => {
            const group = this.systems[groupKey];
            const path = this.createConnectionPath(
                group.x + 60, group.y,
                this.systems.shr.x - 60, this.systems.shr.y,
                group.color
            );
            this.svg.appendChild(path);
        });

        // Right side connections
        rightGroups.forEach(groupKey => {
            const group = this.systems[groupKey];
            const path = this.createConnectionPath(
                this.systems.shr.x + 60, this.systems.shr.y,
                group.x - 60, group.y,
                group.color
            );
            this.svg.appendChild(path);
        });
    }

    createConnectionPath(x1, y1, x2, y2, color) {
        const path = this.createSVGElement('path', {
            d: `M ${x1} ${y1} L ${x2} ${y2}`,
            stroke: color || '#94a3b8',
            'stroke-width': '2',
            fill: 'none',
            'stroke-dasharray': '5,5',
            opacity: '0.4',
            class: 'connection-line'
        });
        return path;
    }

    drawSystem(system, key) {
        const group = this.createSVGElement('g', {
            class: 'system-node',
            'data-system': key,
            transform: `translate(${system.x}, ${system.y})`
        });

        // Outer glow
        const glow = this.createSVGElement('circle', {
            r: '45',
            fill: system.color,
            opacity: '0.2',
            class: 'system-glow'
        });

        // Main circle
        const circle = this.createSVGElement('circle', {
            r: '35',
            fill: '#1e293b',
            stroke: system.color,
            'stroke-width': '3',
            class: 'system-circle'
        });

        // Icon/indicator
        const icon = this.createSVGElement('text', {
            x: '0',
            y: '-5',
            'text-anchor': 'middle',
            fill: system.color,
            'font-size': '20',
            class: 'system-icon'
        });
        icon.textContent = key === 'shr' ? '🔶' : '🔷';

        // Label
        const label = this.createSVGElement('text', {
            x: '0',
            y: '15',
            'text-anchor': 'middle',
            fill: '#ffffff',
            'font-size': '10',
            'font-weight': 'bold',
            class: 'system-label'
        });
        label.textContent = system.label;

        // Sub-label for SHR
        if (key === 'shr') {
            const sublabel = this.createSVGElement('text', {
                x: '0',
                y: '55',
                'text-anchor': 'middle',
                fill: '#94a3b8',
                'font-size': '9',
                class: 'system-sublabel'
            });
            sublabel.textContent = 'Shared Health Record';
            group.appendChild(sublabel);
        }

        group.appendChild(glow);
        group.appendChild(circle);
        group.appendChild(icon);
        group.appendChild(label);

        // Add click handler
        group.addEventListener('click', () => this.onSystemClick(key));

        this.svg.appendChild(group);
    }

    drawSwimlaneLabels() {
        // Left side label (RHU)
        const leftLabel = this.createSVGElement('text', {
            x: '50',
            y: '50',
            'text-anchor': 'middle',
            fill: '#64748b',
            'font-size': '12',
            'font-weight': 'bold'
        });
        leftLabel.textContent = '🏥 RURAL HEALTH UNIT';
        this.svg.appendChild(leftLabel);

        // Right side label (Hospital)
        const rightLabel = this.createSVGElement('text', {
            x: '750',
            y: '50',
            'text-anchor': 'middle',
            fill: '#64748b',
            'font-size': '12',
            'font-weight': 'bold'
        });
        rightLabel.textContent = '🏨 PROVINCIAL HOSPITAL';
        this.svg.appendChild(rightLabel);

        // Center label (SHR)
        const centerLabel = this.createSVGElement('text', {
            x: '400',
            y: '120',
            'text-anchor': 'middle',
            fill: '#f97316',
            'font-size': '11',
            'font-weight': 'bold'
        });
        centerLabel.textContent = '🔶 FHIRLAB SHARED HEALTH RECORD';
        this.svg.appendChild(centerLabel);
    }

    // ============================================
    // ANIMATIONS
    // ============================================

    animateDataFlow(fromSystem, toSystem, data, mode = null) {
        const animationMode = mode || this.animationMode;
        const from = this.systems[fromSystem];
        const to = this.systems[toSystem];
        
        if (!from || !to) {
            console.error('Invalid system:', fromSystem, toSystem);
            return;
        }

        if (animationMode === 'packet') {
            this.animatePacket(from, to, data);
        } else {
            this.animateProgress(from, to, data);
        }
    }

    animatePacket(from, to, data) {
        // Create packet
        const packet = this.createSVGElement('g', {
            class: 'data-packet'
        });

        // Packet circle
        const circle = this.createSVGElement('circle', {
            r: '8',
            fill: data.color || '#3b82f6',
            stroke: '#ffffff',
            'stroke-width': '2'
        });

        // Packet icon
        const icon = this.createSVGElement('text', {
            x: '0',
            y: '3',
            'text-anchor': 'middle',
            fill: '#ffffff',
            'font-size': '8'
        });
        icon.textContent = data.icon || '📄';

        packet.appendChild(circle);
        packet.appendChild(icon);

        // Position at start
        packet.setAttribute('transform', `translate(${from.x}, ${from.y})`);
        this.svg.appendChild(packet);

        // Animate along path
        const duration = WORKSHOP_CONFIG.animation.packetSpeed || 1000;
        const startTime = performance.now();
        const startX = from.x;
        const startY = from.y;
        const endX = to.x;
        const endY = to.y;

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            
            const currentX = startX + (endX - startX) * easeOut;
            const currentY = startY + (endY - startY) * easeOut;
            
            packet.setAttribute('transform', `translate(${currentX}, ${currentY})`);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Animation complete - pulse the target system
                this.pulseSystem(toSystem);
                
                // Show tooltip
                this.showDataTooltip(to.x, to.y, data);
                
                // Remove packet after delay
                setTimeout(() => {
                    if (packet.parentNode) {
                        packet.parentNode.removeChild(packet);
                    }
                }, 2000);
            }
        };

        requestAnimationFrame(animate);

        // Track animation
        this.activeAnimations.push({
            type: 'packet',
            element: packet,
            startTime
        });
    }

    animateProgress(from, to, data) {
        // Create progress line
        const lineId = `progress-${Date.now()}`;
        const path = this.createSVGElement('line', {
            id: lineId,
            x1: from.x,
            y1: from.y,
            x2: from.x,
            y2: from.y,
            stroke: data.color || '#3b82f6',
            'stroke-width': '4',
            'stroke-linecap': 'round',
            opacity: '0.8'
        });
        
        this.svg.appendChild(path);

        // Animate line extension
        const duration = WORKSHOP_CONFIG.animation.progressSpeed || 500;
        const startTime = performance.now();
        const startX = from.x;
        const endX = to.x;

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const currentX = startX + (endX - startX) * progress;
            path.setAttribute('x2', currentX);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Pulse target
                this.pulseSystem(toSystem);
                
                // Fade out
                setTimeout(() => {
                    path.style.transition = 'opacity 0.5s';
                    path.style.opacity = '0';
                    setTimeout(() => {
                        if (path.parentNode) {
                            path.parentNode.removeChild(path);
                        }
                    }, 500);
                }, 1000);
            }
        };

        requestAnimationFrame(animate);
    }

    pulseSystem(systemKey) {
        const system = this.systems[systemKey];
        if (!system) return;

        // Find the system glow element
        const systemNodes = this.svg.querySelectorAll('.system-node');
        systemNodes.forEach(node => {
            if (node.getAttribute('data-system') === systemKey) {
                const glow = node.querySelector('.system-glow');
                if (glow) {
                    glow.style.transition = 'all 0.3s';
                    glow.setAttribute('r', '55');
                    glow.setAttribute('opacity', '0.5');
                    
                    setTimeout(() => {
                        glow.setAttribute('r', '45');
                        glow.setAttribute('opacity', '0.2');
                    }, 300);
                }
            }
        });
    }

    showDataTooltip(x, y, data) {
        const tooltip = this.createSVGElement('g', {
            class: 'data-tooltip',
            transform: `translate(${x}, ${y - 60})`
        });

        // Background
        const bg = this.createSVGElement('rect', {
            x: '-80',
            y: '0',
            width: '160',
            height: '40',
            rx: '8',
            fill: '#1e293b',
            stroke: data.color || '#3b82f6',
            'stroke-width': '2'
        });

        // Text
        const text = this.createSVGElement('text', {
            x: '0',
            y: '18',
            'text-anchor': 'middle',
            fill: '#ffffff',
            'font-size': '11',
            'font-weight': 'bold'
        });
        text.textContent = data.label || 'Data received';

        const subtext = this.createSVGElement('text', {
            x: '0',
            y: '32',
            'text-anchor': 'middle',
            fill: '#94a3b8',
            'font-size': '9'
        });
        subtext.textContent = data.details || '';

        tooltip.appendChild(bg);
        tooltip.appendChild(text);
        tooltip.appendChild(subtext);

        this.svg.appendChild(tooltip);

        // Fade out and remove
        setTimeout(() => {
            tooltip.style.transition = 'opacity 0.5s';
            tooltip.style.opacity = '0';
            setTimeout(() => {
                if (tooltip.parentNode) {
                    tooltip.parentNode.removeChild(tooltip);
                }
            }, 500);
        }, 3000);
    }

    // ============================================
    // EVENT HANDLERS
    // ============================================

    onSystemClick(systemKey) {
        console.log('System clicked:', systemKey);
        
        // Show system details (could expand to show more info)
        const system = this.systems[systemKey];
        
        // Trigger custom event
        const event = new CustomEvent('architectureSystemClick', {
            detail: { system: systemKey, systemData: system }
        });
        document.dispatchEvent(event);
    }

    setupEventListeners() {
        // Listen for animation mode changes
        document.addEventListener('animationModeChange', (e) => {
            this.animationMode = e.detail.mode;
        });

        // Listen for data flow events
        document.addEventListener('fhirDataFlow', (e) => {
            const { from, to, data } = e.detail;
            this.animateDataFlow(from, to, data);
        });
    }

    setAnimationMode(mode) {
        this.animationMode = mode;
    }

    // ============================================
    // UTILITIES
    // ============================================

    createSVGElement(tag, attributes = {}) {
        const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
        Object.entries(attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });
        return element;
    }

    clearAnimations() {
        this.activeAnimations.forEach(anim => {
            if (anim.element && anim.element.parentNode) {
                anim.element.parentNode.removeChild(anim.element);
            }
        });
        this.activeAnimations = [];
    }

    highlightGroup(groupId) {
        // Highlight a specific group's system
        const systemKey = `group${groupId}`;
        this.pulseSystem(systemKey);
    }

    updateGroupStatus(groupId, status) {
        // Update visual status of a group
        const systemKey = `group${groupId}`;
        const systemNodes = this.svg.querySelectorAll('.system-node');
        
        systemNodes.forEach(node => {
            if (node.getAttribute('data-system') === systemKey) {
                const circle = node.querySelector('.system-circle');
                if (circle) {
                    if (status === 'active') {
                        circle.setAttribute('stroke-width', '5');
                    } else if (status === 'complete') {
                        circle.setAttribute('stroke', '#22c55e');
                    } else {
                        circle.setAttribute('stroke-width', '3');
                    }
                }
            }
        });
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ArchitectureView };
}
