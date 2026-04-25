// ============================================
// JSON Diff Utility
// Compares two JSON objects and returns changes
// ============================================

class JSONDiff {
    constructor() {
        this.changes = [];
    }

    /**
     * Compare two objects and return array of changes
     * @param {Object} original - The original/base object
     * @param {Object} modified - The modified object
     * @param {string} path - Current path (for recursion)
     * @returns {Array} Array of change objects
     */
    compare(original, modified, path = '') {
        this.changes = [];
        this._diffRecursive(original, modified, path);
        return this.changes;
    }

    /**
     * Recursive diff function
     */
    _diffRecursive(original, modified, path) {
        // Handle null/undefined
        if (original === null && modified === null) return;
        if (original === undefined && modified === undefined) return;

        // One is null/undefined, the other isn't
        if (original === null || original === undefined) {
            this.changes.push({
                type: 'added',
                path: path,
                value: modified
            });
            return;
        }

        if (modified === null || modified === undefined) {
            this.changes.push({
                type: 'removed',
                path: path,
                value: original
            });
            return;
        }

        // Different types
        if (typeof original !== typeof modified) {
            this.changes.push({
                type: 'changed',
                path: path,
                oldValue: original,
                newValue: modified
            });
            return;
        }

        // Arrays
        if (Array.isArray(original) && Array.isArray(modified)) {
            this._diffArrays(original, modified, path);
            return;
        }

        // Objects
        if (typeof original === 'object' && typeof modified === 'object') {
            this._diffObjects(original, modified, path);
            return;
        }

        // Primitive values
        if (original !== modified) {
            this.changes.push({
                type: 'changed',
                path: path,
                oldValue: original,
                newValue: modified
            });
        }
    }

    /**
     * Diff two arrays
     */
    _diffArrays(original, modified, path) {
        const maxLen = Math.max(original.length, modified.length);
        
        for (let i = 0; i < maxLen; i++) {
            const itemPath = path ? `${path}[${i}]` : `[${i}]`;
            
            if (i >= original.length) {
                // Added element
                this.changes.push({
                    type: 'added',
                    path: itemPath,
                    value: modified[i]
                });
            } else if (i >= modified.length) {
                // Removed element
                this.changes.push({
                    type: 'removed',
                    path: itemPath,
                    value: original[i]
                });
            } else {
                // Compare elements
                this._diffRecursive(original[i], modified[i], itemPath);
            }
        }
    }

    /**
     * Diff two objects
     */
    _diffObjects(original, modified, path) {
        const allKeys = new Set([
            ...Object.keys(original),
            ...Object.keys(modified)
        ]);

        for (const key of allKeys) {
            const propPath = path ? `${path}.${key}` : key;

            if (!(key in original)) {
                // Added property
                this.changes.push({
                    type: 'added',
                    path: propPath,
                    value: modified[key]
                });
            } else if (!(key in modified)) {
                // Removed property
                this.changes.push({
                    type: 'removed',
                    path: propPath,
                    value: original[key]
                });
            } else {
                // Compare properties
                this._diffRecursive(original[key], modified[key], propPath);
            }
        }
    }

    /**
     * Format changes for display
     */
    static formatChanges(changes) {
        if (changes.length === 0) {
            return '<div class="diff-empty">No changes from template</div>';
        }

        return changes.map(change => {
            let formatted = '';
            let value = '';

            switch (change.type) {
                case 'added':
                    value = JSON.stringify(change.value, null, 2);
                    formatted = `<div class="diff-line added">
                        <span class="diff-path">${change.path}</span>: ${value}
                    </div>`;
                    break;
                
                case 'removed':
                    value = JSON.stringify(change.value, null, 2);
                    formatted = `<div class="diff-line removed">
                        <span class="diff-path">${change.path}</span>: ${value}
                    </div>`;
                    break;
                
                case 'changed':
                    const oldVal = JSON.stringify(change.oldValue, null, 2);
                    const newVal = JSON.stringify(change.newValue, null, 2);
                    formatted = `<div class="diff-line changed">
                        <span class="diff-path">${change.path}</span>:<br>
                        &nbsp;&nbsp;<span style="text-decoration: line-through; opacity: 0.6;">${oldVal}</span><br>
                        &nbsp;&nbsp;${newVal}
                    </div>`;
                    break;
            }

            return formatted;
        }).join('');
    }

    /**
     * Get simple summary of changes
     */
    static getSummary(changes) {
        const added = changes.filter(c => c.type === 'added').length;
        const removed = changes.filter(c => c.type === 'removed').length;
        const changed = changes.filter(c => c.type === 'changed').length;

        const parts = [];
        if (added > 0) parts.push(`${added} added`);
        if (removed > 0) parts.push(`${removed} removed`);
        if (changed > 0) parts.push(`${changed} changed`);

        return parts.length > 0 ? parts.join(', ') : 'No changes';
    }
}

/**
 * Get value from object by path
 * @param {Object} obj - The object
 * @param {string} path - Dot-notation path (e.g., "name.0.family")
 * @returns {*} The value at path, or undefined
 */
function getValueByPath(obj, path) {
    if (!path) return obj;
    
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
        if (current === null || current === undefined) return undefined;
        
        // Handle array indices
        if (/^\d+$/.test(part)) {
            current = current[parseInt(part, 10)];
        } else {
            current = current[part];
        }
    }
    
    return current;
}

/**
 * Set value in object by path
 * @param {Object} obj - The object to modify
 * @param {string} path - Dot-notation path
 * @param {*} value - Value to set
 */
function setValueByPath(obj, path, value) {
    if (!path) return;
    
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        const nextPart = parts[i + 1];
        
        if (/^\d+$/.test(part)) {
            const index = parseInt(part, 10);
            if (!current[index]) {
                current[index] = /^\d+$/.test(nextPart) ? [] : {};
            }
            current = current[index];
        } else {
            if (!current[part]) {
                current[part] = /^\d+$/.test(nextPart) ? [] : {};
            }
            current = current[part];
        }
    }
    
    const lastPart = parts[parts.length - 1];
    if (/^\d+$/.test(lastPart)) {
        current[parseInt(lastPart, 10)] = value;
    } else {
        current[lastPart] = value;
    }
}

/**
 * Deep clone an object
 */
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Syntax highlight JSON string
 */
function syntaxHighlight(json) {
    if (typeof json !== 'string') {
        json = JSON.stringify(json, null, 2);
    }
    
    return json
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/(".*?"):/g, '<span class="key">$1</span>:')
        .replace(/: "(.*?)"/g, ': <span class="string">"$1"</span>')
        .replace(/: (\d+)/g, ': <span class="number">$1</span>')
        .replace(/: (true|false)/g, ': <span class="boolean">$1</span>')
        .replace(/: null/g, ': <span class="null">null</span>');
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { JSONDiff, getValueByPath, setValueByPath, deepClone, syntaxHighlight };
}
