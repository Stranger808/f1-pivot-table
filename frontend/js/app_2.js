// app.js - Main application logic for PivotTable app

// Global variables
let currentData = [];
let pivotConfig = {};
let activeFilters = {};

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
            
            // Apply sticky headers after render
            setTimeout(function() {
                applyStickyHeaders();
            }, 100);
        }
    };
    
    // Apply saved configuration if exists
    const finalConfig = $.extend(true, {}, defaultConfig, pivotConfig);
    
    // Render the pivot table
    $("#output").pivotUI(data, finalConfig);
    
    // Add touch support
    addTouchSupport();
    
    // Apply sticky headers
    setTimeout(function() {
        applyStickyHeaders();
    }, 100);
    
    log('Pivot table rendered successfully', 'success');
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
            <button class="filter-close" onclick="removeFilterDropdown()">Ã—</button>
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
                
<div class="range-mode">
    <label><input type="radio" name="rangeMode" value="between" checked> Between</label>
    <label><input type="radio" name="rangeMode" value="gte"> â‰¥ Min only</label>
    <label><input type="radio" name="rangeMode" value="lte"> â‰¤ Max only</label>
</div>

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
        
        const mode = document.querySelector('input[name="rangeMode"]:checked')?.value || 'between';
        if (!isNaN(minVal) || !isNaN(maxVal)) {
            activeFilters[columnName] = {
                min: isNaN(minVal) ? undefined : minVal,
                max: isNaN(maxVal) ? undefined : maxVal,
                mode: mode
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

