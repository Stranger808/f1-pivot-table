// app.js - Main application logic for PivotTable app

// Global variables
let currentData = [];
let pivotConfig = {};

// Console logging helper
function log(message, type = 'log') {
    const timestamp = new Date().toLocaleTimeString();
    const consoleOutput = document.getElementById('consoleOutput');
    const entry = document.createElement('div');
    entry.className = `console-${type}`;
    entry.textContent = `[${timestamp}] ${message}`;
    consoleOutput.appendChild(entry);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
    
    // Also log to browser console
    console[type](message);
}

// Toast notification
function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// Check server connection
async function checkServerConnection() {
    try {
        const response = await fetch('/data/sample.csv', { method: 'HEAD' });
        if (response.ok) {
            document.getElementById('serverInfo').textContent = 'Local server connected';
            document.querySelector('.status-dot').style.backgroundColor = '#00ff00';
            log('Connected to local development server', 'success');
            return true;
        }
    } catch (error) {
        document.getElementById('serverInfo').textContent = 'Running standalone';
        document.querySelector('.status-dot').style.backgroundColor = '#ffaa00';
        log('Running in standalone mode', 'info');
        return false;
    }
}

// Load sample data
async function loadSampleData() {
    log('Loading sample data...', 'info');
    
    try {
        // Try to load from local server first
        const response = await fetch('/data/sample.csv');
        if (response.ok) {
            const csvText = await response.text();
            const data = $.csv.toObjects(csvText);
            renderPivotTable(data);
            log(`Loaded ${data.length} records from server`, 'success');
            showToast('Sample data loaded successfully!');
            return;
        }
    } catch (error) {
        log('Failed to load from server, using built-in data', 'info');
    }
    
    // Fallback to built-in sample data
    const sampleData = generateSampleData();
    renderPivotTable(sampleData);
    log(`Loaded ${sampleData.length} built-in records`, 'success');
    showToast('Sample data loaded!');
}

// Generate sample data
function generateSampleData() {
    const categories = ['Electronics', 'Furniture', 'Clothing', 'Food', 'Books'];
    const products = {
        'Electronics': ['Laptop', 'Tablet', 'Phone', 'Monitor', 'Keyboard'],
        'Furniture': ['Chair', 'Desk', 'Sofa', 'Table', 'Shelf'],
        'Clothing': ['Shirt', 'Pants', 'Jacket', 'Shoes', 'Hat'],
        'Food': ['Fruits', 'Vegetables', 'Dairy', 'Meat', 'Snacks'],
        'Books': ['Fiction', 'Non-fiction', 'Technical', 'Comics', 'Magazines']
    };
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const regions = ['North', 'South', 'East', 'West', 'Central'];
    
    const data = [];
    
    categories.forEach(category => {
        products[category].forEach(product => {
            quarters.forEach(quarter => {
                regions.forEach(region => {
                    data.push({
                        Category: category,
                        Product: product,
                        Quarter: quarter,
                        Region: region,
                        Sales: Math.floor(Math.random() * 50000) + 10000,
                        Units: Math.floor(Math.random() * 500) + 50,
                        Cost: Math.floor(Math.random() * 30000) + 5000,
                        Profit: Math.floor(Math.random() * 20000) + 1000
                    });
                });
            });
        });
    });
    
    return data;
}

// Load data from server
async function loadFromServer() {
    log('Checking for server data...', 'info');
    
    try {
        // Try JSON server first
        const response = await fetch('http://localhost:3000/data');
        if (response.ok) {
            const data = await response.json();
            renderPivotTable(data);
            log(`Loaded ${data.length} records from JSON server`, 'success');
            showToast('Server data loaded!');
            return;
        }
    } catch (error) {
        log('JSON server not available', 'error');
        showToast('No server data available', 3000);
    }
}

// Handle file upload
function handleFileUpload(event) {
    const files = event.target.files;
    if (files.length === 0) return;
    
    const file = files[0];
    const fileName = file.name.toLowerCase();
    
    log(`Processing file: ${file.name}`, 'info');
    
    if (fileName.endsWith('.csv')) {
        handleCSVFile(file);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        handleExcelFile(file);
    } else if (fileName.endsWith('.json')) {
        handleJSONFile(file);
    } else {
        log('Unsupported file type', 'error');
        showToast('Please upload CSV, Excel, or JSON files');
    }
}

// Handle CSV file
function handleCSVFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csv = e.target.result;
            const data = $.csv.toObjects(csv, {
                dynamicTyping: true,
                skipEmptyLines: true,
                delimitersToGuess: [',', '\t', '|', ';']
            });
            
            // Clean headers (remove whitespace)
            data.forEach(row => {
                Object.keys(row).forEach(key => {
                    const trimmedKey = key.trim();
                    if (trimmedKey !== key) {
                        row[trimmedKey] = row[key];
                        delete row[key];
                    }
                });
            });
            
            renderPivotTable(data);
            log(`Loaded ${data.length} records from CSV`, 'success');
            showToast('CSV file loaded successfully!');
        } catch (error) {
            log(`CSV parsing error: ${error.message}`, 'error');
            showToast('Error parsing CSV file');
        }
    };
    reader.readAsText(file);
}

// Handle Excel file
function handleExcelFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // Get first sheet
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);
            
            renderPivotTable(jsonData);
            log(`Loaded ${jsonData.length} records from Excel`, 'success');
            showToast('Excel file loaded successfully!');
        } catch (error) {
            log(`Excel parsing error: ${error.message}`, 'error');
            showToast('Error parsing Excel file');
        }
    };
    reader.readAsArrayBuffer(file);
}

// Handle JSON file
function handleJSONFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            const arrayData = Array.isArray(data) ? data : [data];
            renderPivotTable(arrayData);
            log(`Loaded ${arrayData.length} records from JSON`, 'success');
            showToast('JSON file loaded successfully!');
        } catch (error) {
            log(`JSON parsing error: ${error.message}`, 'error');
            showToast('Error parsing JSON file');
        }
    };
    reader.readAsText(file);
}

// Render pivot table
function renderPivotTable(data) {
    currentData = data;
    
    // Update info panel
    document.getElementById('recordCount').textContent = data.length;
    document.getElementById('columnCount').textContent = data.length > 0 ? Object.keys(data[0]).length : 0;
    
    // Get all available renderers
    const renderers = $.extend(
        $.pivotUtilities.renderers,
        $.pivotUtilities.c3_renderers,
        $.pivotUtilities.export_renderers
    );
    
    // Default configuration
    const defaultConfig = {
        rows: [],
        cols: [],
        vals: [],
        aggregatorName: "Count",
        rendererName: "Table",
        renderers: renderers,
        rendererOptions: {
            table: {
                clickCallback: function(e, value, filters, pivotData) {
                    log(`Cell clicked: value=${value}, filters=${JSON.stringify(filters)}`, 'info');
                }
            },
            c3: {
                size: {
                    width: Math.min(window.innerWidth - 80, 800),
                    height: 400
                }
            }
        },
        onRefresh: function(config) {
            // Save current configuration
            pivotConfig = config;
            log('Pivot table updated', 'info');
        }
    };
    
    // Apply saved configuration if exists
    const finalConfig = $.extend(true, {}, defaultConfig, pivotConfig);
    
    // Render the pivot table
    $("#output").pivotUI(data, finalConfig);
    
    // Add touch support
    addTouchSupport();
    
    log('Pivot table rendered successfully', 'success');
}

// Add touch support for mobile
function addTouchSupport() {
    // Make draggable elements more touch-friendly
    $('.pvtAxisContainer li').css({
        'cursor': 'move',
        'touch-action': 'none',
        'user-select': 'none',
        '-webkit-user-select': 'none',
        'padding': '10px',
        'margin': '3px'
    });
    
    // Ensure touch punch is working
    if ($.support.touch) {
        $('.pvtAxisContainer li').draggable('option', 'touch', true);
    }
}

// Reset pivot table
function resetPivot() {
    pivotConfig = {};
    $("#output").html(`
        <div class="loading">
            <div class="spinner"></div>
            <p>Ready to analyze your data</p>
            <p class="sub-text">Load sample data or upload your own files</p>
        </div>
    `);
    document.getElementById('recordCount').textContent = '0';
    document.getElementById('columnCount').textContent = '0';
    log('Pivot table reset', 'info');
    showToast('Reset complete');
}

// Save configuration
function saveConfiguration() {
    if (Object.keys(pivotConfig).length === 0) {
        showToast('No configuration to save');
        return;
    }
    
    const config = {
        pivotConfig: pivotConfig,
        timestamp: new Date().toISOString(),
        dataInfo: {
            records: currentData.length,
            columns: currentData.length > 0 ? Object.keys(currentData[0]) : []
        }
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pivot-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    log('Configuration saved', 'success');
    showToast('Configuration saved!');
}

// Load configuration
function loadConfiguration() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const config = JSON.parse(e.target.result);
                pivotConfig = config.pivotConfig || {};
                
                if (currentData.length > 0) {
                    renderPivotTable(currentData);
                    log('Configuration loaded and applied', 'success');
                    showToast('Configuration loaded!');
                } else {
                    log('Configuration loaded (load data to apply)', 'info');
                    showToast('Configuration loaded - now load some data');
                }
            } catch (error) {
                log(`Error loading configuration: ${error.message}`, 'error');
                showToast('Error loading configuration');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// Handle window resize
let resizeTimer;
$(window).on('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
        if ($('.c3').length > 0 && currentData.length > 0) {
            const currentConfig = $("#output").data("pivotUIOptions");
            if (currentConfig) {
                currentConfig.rendererOptions.c3.size = {
                    width: Math.min(window.innerWidth - 80, 800),
                    height: 400
                };
                renderPivotTable(currentData);
            }
        }
    }, 250);
});

// Initialize on page load
$(document).ready(function() {
    log('PivotTable app initialized', 'success');
    checkServerConnection();
    
    // Show keyboard shortcuts
    log('Keyboard shortcuts: Ctrl+S (save config), Ctrl+O (load config), Ctrl+R (reset)', 'info');
    
    // Add keyboard shortcuts
    $(document).on('keydown', function(e) {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 's':
                    e.preventDefault();
                    saveConfiguration();
                    break;
                case 'o':
                    e.preventDefault();
                    loadConfiguration();
                    break;
                case 'r':
                    e.preventDefault();
                    resetPivot();
                    break;
            }
        }
    });
});
