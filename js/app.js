// app.js - Main application logic for PivotTable app

// Global variables
let currentData = [];
let pivotConfig = {};
let activeFilters = {};
let justRefreshed = false; // Track if pivot table just refreshed
let refreshTimeout = null; // Timeout for resetting refresh flag

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

// Analyze column data types and get unique values
function analyzeColumn(columnName, data) {
    const values = data.map(row => row[columnName]).filter(val => val != null && val !== '');
    const uniqueValues = [...new Set(values)];
    
    // Determine if column is numeric
    const numericValues = values.filter(val => !isNaN(val) && val !== '');
    const isNumeric = numericValues.length > values.length * 0.8; // 80% threshold
    
    let analysis = {
        name: columnName,
        isNumeric: isNumeric,
        uniqueValues: uniqueValues,
        totalValues: values.length
    };
    
    if (isNumeric) {
        const nums = numericValues.map(val => parseFloat(val));
        analysis.min = Math.min(...nums);
        analysis.max = Math.max(...nums);
        analysis.avg = nums.reduce((a, b) => a + b, 0) / nums.length;
    }
    
    return analysis;
}

// Create filter dropdown
function createFilterDropdown(columnName, analysis, element) {
    // Remove any existing dropdown
    removeFilterDropdown();
    
    const dropdown = document.createElement('div');
    dropdown.className = 'filter-dropdown';
    dropdown.id = 'filterDropdown';
    
    // Position dropdown near the clicked element
    const rect = element.getBoundingClientRect();
    dropdown.style.left = rect.left + 'px';
    dropdown.style.top = (rect.bottom + 5) + 'px';
    
    let content = `
        <div class="filter-header">
            <h4>Filter: ${columnName}</h4>
            <button class="filter-close" onclick="removeFilterDropdown()">×</button>
        </div>
        <div class="filter-content">
    `;
    
    if (analysis.isNumeric) {
        // Numeric range filter
        const currentFilter = activeFilters[columnName] || {};
        const minVal = currentFilter.min !== undefined ? currentFilter.min : analysis.min;
        const maxVal = currentFilter.max !== undefined ? currentFilter.max : analysis.max;
        
        content += `
            <div class="filter-section">
                <label>Range Filter:</label>
                <div class="range-inputs">
                    <input type="number" id="minValue" value="${minVal}" 
                           placeholder="Min (${analysis.min})" step="any">
                    <span>to</span>
                    <input type="number" id="maxValue" value="${maxVal}" 
                           placeholder="Max (${analysis.max})" step="any">
                </div>
                <div class="filter-stats">
                    <small>Data range: ${analysis.min.toFixed(2)} - ${analysis.max.toFixed(2)}</small>
                    <br><small>Average: ${analysis.avg.toFixed(2)}</small>
                </div>
            </div>
        `;
    } else {
        // Categorical filter with checkboxes
        const currentFilter = activeFilters[columnName] || {};
        const excludedValues = currentFilter.excludedValues || [];
        
        content += `
            <div class="filter-section">
                <div class="filter-controls">
                    <button onclick="selectAllValues('${columnName}')">Select All</button>
                    <button onclick="deselectAllValues('${columnName}')">Deselect All</button>
                </div>
                <div class="values-list" style="max-height: 200px; overflow-y: auto;">
        `;
        
        analysis.uniqueValues.sort().forEach(value => {
            const isChecked = !excludedValues.includes(value);
            const valueStr = String(value).replace(/'/g, '&#39;');
            content += `
                <label class="value-item">
                    <input type="checkbox" value="${valueStr}" 
                           ${isChecked ? 'checked' : ''} 
                           onchange="updateCategoricalFilter('${columnName}', this)">
                    <span>${value}</span>
                </label>
            `;
        });
        
        content += `
                </div>
                <div class="filter-stats">
                    <small>${analysis.uniqueValues.length} unique values, ${analysis.totalValues} total records</small>
                </div>
            </div>
        `;
    }
    
    content += `
        </div>
        <div class="filter-actions">
            <button class="btn btn-primary" onclick="applyFilter('${columnName}', ${analysis.isNumeric})">Apply Filter</button>
            <button class="btn btn-secondary" onclick="clearFilter('${columnName}')">Clear Filter</button>
        </div>
    `;
    
    dropdown.innerHTML = content;
    document.body.appendChild(dropdown);
    
    // Add click outside to close
    setTimeout(() => {
        document.addEventListener('click', closeFilterOnClickOutside, true);
    }, 100);
    
    log(`Filter dropdown created for ${columnName}`, 'info');
}

// Remove filter dropdown
function removeFilterDropdown() {
    const dropdown = document.getElementById('filterDropdown');
    if (dropdown) {
        dropdown.remove();
        document.removeEventListener('click', closeFilterOnClickOutside, true);
    }
}

// Close filter on click outside
function closeFilterOnClickOutside(event) {
    const dropdown = document.getElementById('filterDropdown');
    if (dropdown && !dropdown.contains(event.target)) {
        removeFilterDropdown();
    }
}

// Update categorical filter
function updateCategoricalFilter(columnName, checkbox) {
    if (!activeFilters[columnName]) {
        activeFilters[columnName] = { excludedValues: [] };
    }
    
    const excludedValues = activeFilters[columnName].excludedValues;
    const value = checkbox.value;
    
    if (checkbox.checked) {
        // Remove from excluded values
        const index = excludedValues.indexOf(value);
        if (index > -1) {
            excludedValues.splice(index, 1);
        }
    } else {
        // Add to excluded values
        if (!excludedValues.includes(value)) {
            excludedValues.push(value);
        }
    }
}

// Select all values
function selectAllValues(columnName) {
    const checkboxes = document.querySelectorAll('#filterDropdown input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.checked = true;
        updateCategoricalFilter(columnName, cb);
    });
}

// Deselect all values
function deselectAllValues(columnName) {
    const checkboxes = document.querySelectorAll('#filterDropdown input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.checked = false;
        updateCategoricalFilter(columnName, cb);
    });
}

// Apply filter
function applyFilter(columnName, isNumeric) {
    if (isNumeric) {
        const minVal = parseFloat(document.getElementById('minValue').value);
        const maxVal = parseFloat(document.getElementById('maxValue').value);
        
        if (!isNaN(minVal) || !isNaN(maxVal)) {
            activeFilters[columnName] = {
                min: isNaN(minVal) ? undefined : minVal,
                max: isNaN(maxVal) ? undefined : maxVal
            };
        }
    }
    // Categorical filters are updated in real-time via updateCategoricalFilter
    
    // Apply filters and re-render
    const filteredData = applyAllFilters(currentData);
    renderPivotTableWithData(filteredData);
    removeFilterDropdown();
    
    const filterCount = Object.keys(activeFilters).length;
    log(`Filter applied to ${columnName}. Active filters: ${filterCount}`, 'success');
    showToast(`Filter applied! ${filterCount} active filter(s)`);
}

// Clear filter
function clearFilter(columnName) {
    delete activeFilters[columnName];
    const filteredData = applyAllFilters(currentData);
    renderPivotTableWithData(filteredData);
    removeFilterDropdown();
    
    log(`Filter cleared for ${columnName}`, 'info');
    showToast('Filter cleared');
}

// Apply all active filters to data
function applyAllFilters(data) {
    if (Object.keys(activeFilters).length === 0) {
        return data;
    }
    
    return data.filter(row => {
        for (const [columnName, filter] of Object.entries(activeFilters)) {
            const value = row[columnName];
            
            if (filter.excludedValues) {
                // Categorical filter
                if (filter.excludedValues.includes(String(value))) {
                    return false;
                }
            } else {
                // Numeric filter
                const numValue = parseFloat(value);
                if (!isNaN(numValue)) {
                    if (filter.min !== undefined && numValue < filter.min) {
                        return false;
                    }
                    if (filter.max !== undefined && numValue > filter.max) {
                        return false;
                    }
                }
            }
        }
        return true;
    });
}

// Enhanced render function with filtered data
function renderPivotTableWithData(data) {
    // Update info panel
    document.getElementById('recordCount').textContent = `${data.length} / ${currentData.length}`;
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
            // Mark that we just refreshed
            justRefreshed = true;
            clearTimeout(refreshTimeout);
            
            // Save current configuration
            pivotConfig = config;
            log('Pivot table updated', 'info');
            
            // Re-attach filter event handlers after refresh
            setTimeout(function() {
                attachFilterHandlers();
                updateFilterIndicators();
            }, 200);
            
            // Reset the refresh flag after a delay
            refreshTimeout = setTimeout(() => {
                justRefreshed = false;
            }, 300); // 300ms should be enough for all events to settle
        }
    };
    
    // Apply saved configuration if exists
    const finalConfig = $.extend(true, {}, defaultConfig, pivotConfig);
    
    // Render the pivot table
    $("#output").pivotUI(data, finalConfig);
    
    // Add touch support
    addTouchSupport();
    
    log('Pivot table rendered with filtered data', 'success');
}

// Render pivot table (original function)
function renderPivotTable(data) {
    currentData = data;
    activeFilters = {}; // Reset filters when loading new data
    renderPivotTableWithData(data);
    
    // Attach filter handlers after the pivot table is rendered
    setTimeout(function() {
        attachFilterHandlers();
    }, 500);
}

// Apply sticky headers to the pivot table
function applyStickyHeaders() {
    // Find the rendered pivot table
    const $pvtTable = $('.pvtTable');
    if ($pvtTable.length === 0) return;
    
    // Wrap the table in a scrollable container if not already wrapped
    if (!$pvtTable.parent().hasClass('pvtTableContainer')) {
        $pvtTable.wrap('<div class="pvtTableContainer"></div>');
    }
    
    // Set container styles
    $('.pvtTableContainer').css({
        'max-height': '600px',
        'overflow': 'auto',
        'position': 'relative',
        'border-radius': '8px',
        'background': 'var(--bg-secondary)'
    });
    
    // Handle multi-level column headers
    let cumulativeHeight = 0;
    $pvtTable.find('thead tr').each(function(index) {
        const $row = $(this);
        const rowHeight = $row.outerHeight();
        
        // Set the sticky top position for all th elements in this row
        $row.find('th').each(function() {
            $(this).css({
                'position': 'sticky',
                'top': cumulativeHeight + 'px',
                'z-index': 20 - index // Higher rows have higher z-index
            });
        });
        
        cumulativeHeight += rowHeight;
    });
    
    // Identify and mark row label cells
    $pvtTable.find('tbody tr').each(function() {
        const $firstCell = $(this).find('th:first, td:first');
        if ($firstCell.is('th') || $firstCell.hasClass('pvtRowLabel')) {
            $firstCell.addClass('pvtStickyRowHeader');
        }
    });
    
    // Handle corner cells (top-left) for all header rows
    $pvtTable.find('thead tr').each(function(index) {
        $(this).find('th:first-child').css({
            'position': 'sticky',
            'left': '0',
            'z-index': 25 - index // Ensure corner cells are on top
        });
    });
    
    // Ensure proper z-index layering for row headers
    $pvtTable.find('.pvtStickyRowHeader').css('z-index', '15');
    
    log('Sticky headers applied with multi-level support', 'info');
}

// Attach filter event handlers to attribute elements
function attachFilterHandlers() {
    log('Attaching filter handlers', 'info');
    
    // Try using mousedown instead of click
    $('.pvtAxisContainer li').off('mousedown.filter').on('mousedown.filter', function(e) {
        // Only handle left mouse button
        if (e.which !== 1) return;
        
        log('Mousedown detected', 'info');
        
        // Store the element and position
        const $element = $(this);
        const startX = e.pageX;
        const startY = e.pageY;
        
        // Watch for mouseup
        $(document).one('mouseup.filter', function(upEvent) {
            const endX = upEvent.pageX;
            const endY = upEvent.pageY;
            const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
            
            log(`Mouse released. Distance moved: ${distance}`, 'info');
            
            // If mouse moved less than 5 pixels, treat as click
            if (distance < 5 && !justRefreshed) {
                const rawText = $element.text().trim();
                const columnName = rawText.replace(/[▾▲▼⇅↕↔]/g, '').trim();
                
                log(`Column clicked: ${columnName}`, 'info');
                
                if (columnName && currentData.length > 0) {
                    const analysis = analyzeColumn(columnName, currentData);
                    createFilterDropdown(columnName, analysis, $element[0]);
                }
            }
        });
    });
    
    log(`Attached handlers to ${$('.pvtAxisContainer li').length} elements`, 'info');
}

// Update visual indicators for filtered columns
function updateFilterIndicators() {
    $('.pvtAxisContainer li').each(function() {
        const columnName = $(this).text().trim();
        const $indicator = $(this).find('.filter-indicator');
        
        if (activeFilters[columnName]) {
            if ($indicator.length === 0) {
                $(this).append('<span class="filter-indicator">🔍</span>');
                $(this).addClass('has-filter');
            }
        } else {
            $indicator.remove();
            $(this).removeClass('has-filter');
        }
    });
}

// Update visual indicators for filtered columns
function updateFilterIndicators() {
    $('.pvtAxisContainer li').each(function() {
        const columnName = $(this).text().trim();
        const $indicator = $(this).find('.filter-indicator');
        
        if (activeFilters[columnName]) {
            if ($indicator.length === 0) {
                $(this).append('<span class="filter-indicator">🔍</span>');
                $(this).addClass('has-filter');
            }
        } else {
            $indicator.remove();
            $(this).removeClass('has-filter');
        }
    });
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
    activeFilters = {};
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
        activeFilters: activeFilters,
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
                activeFilters = config.activeFilters || {};
                
                if (currentData.length > 0) {
                    const filteredData = applyAllFilters(currentData);
                    renderPivotTableWithData(filteredData);
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
                const filteredData = applyAllFilters(currentData);
                renderPivotTableWithData(filteredData);
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

// Make functions globally accessible for onclick handlers
window.removeFilterDropdown = removeFilterDropdown;
window.selectAllValues = selectAllValues;
window.deselectAllValues = deselectAllValues;
window.updateCategoricalFilter = updateCategoricalFilter;
window.applyFilter = applyFilter;
window.clearFilter = clearFilter;
window.loadSampleData = loadSampleData;
window.loadFromServer = loadFromServer;
window.handleFileUpload = handleFileUpload;
window.resetPivot = resetPivot;
window.saveConfiguration = saveConfiguration;
window.loadConfiguration = loadConfiguration;