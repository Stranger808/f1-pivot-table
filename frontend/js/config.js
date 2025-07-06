// config.js - Configuration settings for PivotTable app


const APP_CONFIG = {
    // Server configuration
    server: {
        localPort: 8080,
        jsonServerPort: 8899,
        pythonServerPort: 8000
    },
    
    // File size limits
    files: {
        maxSizeMB: 50,
        supportedTypes: ['.csv', '.xlsx', '.xls', '.json'],
        encoding: 'UTF-8'
    },
    
    // Pivot table defaults
    pivotDefaults: {
        rendererName: 'Table',
        aggregatorName: 'Sum',
        thousandsSep: ',',
        decimalSep: '.',
        digitsAfterDecimal: 2
    },
    
    // Chart configurations
    charts: {
        defaultColors: [
            '#00d4ff', '#0099ff', '#00ff88', '#ffaa00', '#ff4444',
            '#aa44ff', '#ff44aa', '#44ffaa', '#aaff44', '#4444ff'
        ],
        maxDataPoints: 1000,
        animationDuration: 750
    },
    
    // Mobile optimizations
    mobile: {
        breakpoint: 768,
        zoomFactor: 0.8,
        touchDelay: 300
    },
    
    // Export options
    export: {
        csvDelimiter: ',',
        excelSheetName: 'PivotData',
        jsonIndent: 2
    },
    
    // Performance settings
    performance: {
        maxRecords: 100000,
        chunkSize: 1000,
        debounceDelay: 250
    }
};

// Utility functions
const Utils = {
    // Format numbers with thousands separator
    formatNumber: function(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, APP_CONFIG.pivotDefaults.thousandsSep);
    },
    
    // Check if mobile device
    isMobile: function() {
        return window.innerWidth <= APP_CONFIG.mobile.breakpoint;
    },
    
    // Get file extension
    getFileExtension: function(filename) {
        return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2).toLowerCase();
    },
    
    // Validate file
    validateFile: function(file) {
        const ext = '.' + this.getFileExtension(file.name);
        const sizeMB = file.size / (1024 * 1024);
        
        if (!APP_CONFIG.files.supportedTypes.includes(ext)) {
            return { valid: false, error: 'Unsupported file type' };
        }
        
        if (sizeMB > APP_CONFIG.files.maxSizeMB) {
            return { valid: false, error: `File too large (max ${APP_CONFIG.files.maxSizeMB}MB)` };
        }
        
        return { valid: true };
    },
    
    // Debounce function
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};



// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { APP_CONFIG, Utils};
}
