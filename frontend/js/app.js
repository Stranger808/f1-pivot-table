// app.js - Main application logic for PivotTable app with backend integration

// Global variables
let currentData = [];
let pivotConfig = {};
let activeFilters = {};
let justRefreshed = false;
let refreshTimeout = null;
let savedConfigurations = {};
let configCounter = 1;
let isLoadingConfig = false;

// Console logging helper
function log(message, type = 'log') {
    const timestamp = new Date().toLocaleTimeString();
    const consoleOutput = document.getElementById('consoleOutput');

    if (!consoleOutput) {
        console.error('Console output element not found!');
        console.log(`[${timestamp}] ${message}`);
        return;
    }

    const entry = document.createElement('div');
    entry.className = `console-${type}`;
    entry.textContent = `[${timestamp}] ${message}`;
    consoleOutput.appendChild(entry);

    setTimeout(() => {
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }, 10);

    const validTypes = ['log', 'error', 'warn', 'info', 'debug'];
    const consoleType = validTypes.includes(type) ? type : 'log';
    console[consoleType](`[${timestamp}] ${message}`);
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

// Get API base URL
function getApiUrl() {
    return '/api';
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

// Load default query from backend
async function loadDefaultQueryFromBackend() {
    try {
        const response = await fetch(`${getApiUrl()}/default-query`);
        if (!response.ok) {
            throw new Error('Failed to fetch default query');
        }
        const data = await response.json();
        return data.query;
    } catch (error) {
        log(`Error loading default query: ${error.message}`, 'error');
        return null;
    }
}

// Execute query on backend
async function executeBackendQuery(query) {
    try {
        const response = await fetch(`${getApiUrl()}/submit-input`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ input: query })
        });

        if (!response.ok) {
            throw new Error('Query execution failed');
        }

        const data = await response.json();
        return data.rows || [];
    } catch (error) {
        log(`Error executing query: ${error.message}`, 'error');
        showToast('Error executing backend query');
        return null;
    }
}

// Load data from backend server
async function loadFromServer() {
    log('Loading data from backend server...', 'info');
    showToast('Connecting to backend...');

    const defaultQuery = await loadDefaultQueryFromBackend();
    if (!defaultQuery) {
        log('Could not load default query from backend', 'error');
        showToast('Failed to connect to backend', 3000);
        return;
    }

    log('Default query loaded, executing...', 'info');

    const results = await executeBackendQuery(defaultQuery);
    if (results && results.length > 0) {
        renderPivotTable(results);
        log(`Loaded ${results.length} records from backend database`, 'success');
        showToast(`Loaded ${results.length} records from database!`);

        document.getElementById('serverInfo').textContent = 'Backend connected';
        document.querySelector('.status-dot').style.backgroundColor = '#00ff00';
    } else {
        log('No results returned from backend query', 'error');
        showToast('Query returned no results', 3000);
    }
}

// Load sample data
async function loadSampleData() {
    log('Loading sample data...', 'info');

    try {
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

            // Clean headers
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
    log(`Analyzing column: ${columnName}`, 'info');

    const values = data.map(row => row[columnName]).filter(val => val != null && val !== '');
    const uniqueValues = [...new Set(values)];

    log(`Found ${values.length} non-null values, ${uniqueValues.length} unique`, 'info');

    const numericValues = values.filter(val => !isNaN(val) && val !== '');
    const isNumeric = numericValues.length > values.length * 0.8;

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
        log(`Numeric column: min=${analysis.min}, max=${analysis.max}, avg=${analysis.avg}`, 'info');
    } else {
        log(`Categorical column with values: ${uniqueValues.slice(0, 5).join(', ')}${uniqueValues.length > 5 ? '...' : ''}`, 'info');
    }

    return analysis;
}

// Create filter dropdown
function createFilterDropdown(columnName, analysis, element) {
    removeFilterDropdown();

    const dropdown = document.createElement('div');
    dropdown.className = 'filter-dropdown';
    dropdown.id = 'filterDropdown';

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

    setTimeout(() => {
        document.addEventListener('click', closeFilterOnClickOutside, true);
    }, 100);

    log(`Filter dropdown created for ${columnName}`, 'info');
}

// Filter helper functions
function removeFilterDropdown() {
    const dropdown = document.getElementById('filterDropdown');
    if (dropdown) {
        dropdown.remove();
        document.removeEventListener('click', closeFilterOnClickOutside, true);
    }
}

function closeFilterOnClickOutside(event) {
    const dropdown = document.getElementById('filterDropdown');
    if (dropdown && !dropdown.contains(event.target)) {
        removeFilterDropdown();
    }
}

function updateCategoricalFilter(columnName, checkbox) {
    if (!activeFilters[columnName]) {
        activeFilters[columnName] = { excludedValues: [] };
    }

    const excludedValues = activeFilters[columnName].excludedValues;
    const value = checkbox.value;

    if (checkbox.checked) {
        const index = excludedValues.indexOf(value);
        if (index > -1) {
            excludedValues.splice(index, 1);
        }
    } else {
        if (!excludedValues.includes(value)) {
            excludedValues.push(value);
        }
    }
}

function selectAllValues(columnName) {
    const checkboxes = document.querySelectorAll('#filterDropdown input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.checked = true;
        updateCategoricalFilter(columnName, cb);
    });
}

function deselectAllValues(columnName) {
    const checkboxes = document.querySelectorAll('#filterDropdown input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.checked = false;
        updateCategoricalFilter(columnName, cb);
    });
}

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

    const filteredData = applyAllFilters(currentData);
    renderPivotTableWithData(filteredData);
    removeFilterDropdown();

    const filterCount = Object.keys(activeFilters).length;
    log(`Filter applied to ${columnName}. Active filters: ${filterCount}`, 'success');
    showToast(`Filter applied! ${filterCount} active filter(s)`);
}

function clearFilter(columnName) {
    delete activeFilters[columnName];
    const filteredData = applyAllFilters(currentData);
    renderPivotTableWithData(filteredData);
    removeFilterDropdown();

    log(`Filter cleared for ${columnName}`, 'info');
    showToast('Filter cleared');
}

function applyAllFilters(data) {
    if (Object.keys(activeFilters).length === 0) {
        return data;
    }

    return data.filter(row => {
        for (const [columnName, filter] of Object.entries(activeFilters)) {
            const value = row[columnName];

            if (filter.excludedValues) {
                if (filter.excludedValues.includes(String(value))) {
                    return false;
                }
            } else {
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

// Get pivot table configuration object
function getPivotTableConfig(customConfig = {}) {
    const renderers = $.extend(
        $.pivotUtilities.renderers,
        $.pivotUtilities.c3_renderers,
        $.pivotUtilities.export_renderers
    );
    
    const aggregators = $.pivotUtilities.aggregators;

    const defaultConfig = {
        rows: [],
        cols: [],
        vals: [],
        aggregatorName: "Count",
        rendererName: "Table",
        renderers: renderers,
        aggregators: aggregators,
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
            justRefreshed = true;
            clearTimeout(refreshTimeout);

            if (!isLoadingConfig) {
                pivotConfig = config;
            }
            
            log('Pivot table updated', 'info');

            setTimeout(function() {
                attachFilterHandlers();
                updateFilterIndicators();
            }, 200);

            refreshTimeout = setTimeout(() => {
                justRefreshed = false;
            }, 300);
        }
    };

    return $.extend(true, {}, defaultConfig, customConfig);
}

// Render pivot table with filtered data
function renderPivotTableWithData(data) {
    document.getElementById('recordCount').textContent = `${data.length} / ${currentData.length}`;
    document.getElementById('columnCount').textContent = data.length > 0 ? Object.keys(data[0]).length : 0;

    const finalConfig = getPivotTableConfig(pivotConfig);
    
    log(`Rendering with config: rows=[${finalConfig.rows.join(',')}], cols=[${finalConfig.cols.join(',')}], vals=[${finalConfig.vals.join(',')}], aggregator=${finalConfig.aggregatorName}, renderer=${finalConfig.rendererName}`, 'info');
    
    $("#output").empty();
    $("#output").pivotUI(data, finalConfig);

    addTouchSupport();
    log('Pivot table rendered with filtered data', 'success');
}

// Render pivot table
function renderPivotTable(data, preserveConfig = true) {
    currentData = data;
    if (!preserveConfig) {
        activeFilters = {};
    }
    renderPivotTableWithData(data);

    setTimeout(function() {
        attachFilterHandlers();
    }, 500);
}

// Attach filter event handlers
function attachFilterHandlers() {
    log('Attaching filter handlers', 'info');

    $('.pvtUi').off('click.triangleFilter').on('click.triangleFilter', '.pvtTriangle', function(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
    });

    setTimeout(function() {
        $('.pvtAxisContainer li span.pvtAttr').each(function() {
            const $span = $(this);
            const $li = $span.parent();

            $span.off('click touchend');

            const activateFilter = function(e) {
                e.preventDefault();
                e.stopPropagation();

                if ($li.hasClass('ui-draggable-dragging')) {
                    return false;
                }

                const fullText = $li.text().trim();
                const columnName = fullText.replace(/[▾▲▼⇅↕↔🔍]/g, '').trim();

                log(`Custom filter activated on: ${columnName}`, 'info');

                if (columnName && currentData.length > 0) {
                    if (currentData[0].hasOwnProperty(columnName)) {
                        const analysis = analyzeColumn(columnName, currentData);
                        createFilterDropdown(columnName, analysis, $li[0]);
                    } else {
                        log(`Column "${columnName}" not found in data`, 'error');
                        showToast(`Column "${columnName}" not found in data`);
                    }
                }

                return false;
            };

            $span.on('click.customFilter', activateFilter);

            // Touch support
            let touchStartTime, touchStartX, touchStartY;

            $span.on('touchstart.customFilter', function(e) {
                touchStartTime = Date.now();
                const touch = e.originalEvent.touches[0];
                touchStartX = touch.clientX;
                touchStartY = touch.clientY;
            });

            $span.on('touchend.customFilter', function(e) {
                e.preventDefault();

                const touchEndTime = Date.now();
                const touchDuration = touchEndTime - touchStartTime;

                if (touchDuration < 500) {
                    const touch = e.originalEvent.changedTouches[0];
                    const touchEndX = touch.clientX;
                    const touchEndY = touch.clientY;

                    const distance = Math.sqrt(
                        Math.pow(touchEndX - touchStartX, 2) + 
                        Math.pow(touchEndY - touchStartY, 2)
                    );

                    if (distance < 10) {
                        activateFilter(e);
                    }
                }
            });
        });

        log(`Attached custom filter handlers to ${$('.pvtAxisContainer li span.pvtAttr').length} elements`, 'info');
    }, 100);
}

// Update visual indicators for filtered columns
function updateFilterIndicators() {
    $('.pvtAxisContainer li').each(function() {
        const rawText = $(this).text().trim();
        const columnName = rawText.replace(/[▾▲▼⇅↕↔🔍]/g, '').trim();
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
    $('.pvtAxisContainer li').css({
        'cursor': 'move',
        'touch-action': 'manipulation',
        'user-select': 'none',
        '-webkit-user-select': 'none',
        'padding': '10px',
        'margin': '3px',
        '-webkit-tap-highlight-color': 'rgba(0,0,0,0)'
    });

    if (typeof $.support !== 'undefined' && $.support.touch) {
        $('.pvtAxisContainer li').draggable('option', 'touch', true);
    }

    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        log('Touch device detected, enhancing mobile support', 'info');

        $('.pvtAxisContainer li span.pvtAttr').css({
            'padding': '5px',
            'display': 'inline-block',
            'width': '100%'
        });
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

// Configuration management functions
function saveConfiguration() {
    if (!pivotConfig || Object.keys(pivotConfig).length === 0) {
        showToast('No configuration to save - modify the pivot table first');
        return;
    }

    const configName = `Config-${configCounter}`;
    const config = {
        pivotConfig: JSON.parse(JSON.stringify(pivotConfig)),
        activeFilters: JSON.parse(JSON.stringify(activeFilters)),
        timestamp: new Date().toISOString(),
        dataInfo: {
            records: currentData.length,
            columns: currentData.length > 0 ? Object.keys(currentData[0]) : []
        }
    };

    savedConfigurations[configName] = config;
    configCounter++;

    log(`Configuration saved as: ${configName}`, 'success');
    showToast(`Configuration saved as ${configName}!`);
    
    const pc = config.pivotConfig;
    log(`Saved: rows=[${pc.rows ? pc.rows.join(',') : ''}], cols=[${pc.cols ? pc.cols.join(',') : ''}], vals=[${pc.vals ? pc.vals.join(',') : ''}], aggregator=${pc.aggregatorName}, renderer=${pc.rendererName}`, 'info');
    
    updateConfigurationList();
}

function loadConfiguration() {
    const configNames = Object.keys(savedConfigurations);
    
    if (configNames.length === 0) {
        showToast('No saved configurations found');
        log('No configurations available to load', 'warn');
        return;
    }

    const dropdown = document.createElement('div');
    dropdown.className = 'config-selector';
    dropdown.id = 'configSelector';
    dropdown.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--bg-secondary);
        border: 2px solid var(--accent-blue);
        border-radius: 12px;
        padding: 20px;
        z-index: 10000;
        min-width: 300px;
        max-width: 90vw;
    `;

    let content = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h4 style="margin: 0; color: var(--accent-blue);">Load Configuration</h4>
            <button onclick="removeConfigSelector()" style="background: none; border: none; color: var(--text-primary); font-size: 20px; cursor: pointer;">×</button>
        </div>
        <div style="margin-bottom: 15px;">
    `;

    configNames.forEach(name => {
        const config = savedConfigurations[name];
        const date = new Date(config.timestamp).toLocaleString();
        const pc = config.pivotConfig;
        content += `
            <div style="margin-bottom: 10px; padding: 10px; background: var(--bg-tertiary); border-radius: 6px; cursor: pointer;" 
                 onclick="selectConfiguration('${name}')">
                <strong>${name}</strong><br>
                <small style="color: var(--text-secondary);">
                    ${date} - ${config.dataInfo.records} records<br>
                    Rows: ${pc.rows ? pc.rows.join(', ') : 'None'}<br>
                    Cols: ${pc.cols ? pc.cols.join(', ') : 'None'}<br>
                    Vals: ${pc.vals ? pc.vals.join(', ') : 'None'}<br>
                    Aggregator: ${pc.aggregatorName || 'Count'}<br>
                    Renderer: ${pc.rendererName || 'Table'}
                </small>
            </div>
        `;
    });

    content += `
        </div>
        <div style="display: flex; gap: 10px;">
            <button onclick="removeConfigSelector()" style="flex: 1; padding: 10px; background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer;">Cancel</button>
            <button onclick="clearAllConfigurations()" style="flex: 1; padding: 10px; background: var(--accent-red); color: white; border: none; border-radius: 6px; cursor: pointer;">Clear All</button>
        </div>
    `;

    dropdown.innerHTML = content;
    document.body.appendChild(dropdown);

    log(`Configuration selector opened with ${configNames.length} options`, 'info');
}

function removeConfigSelector() {
    const selector = document.getElementById('configSelector');
    if (selector) {
        selector.remove();
    }
}

function selectConfiguration(configName) {
    const config = savedConfigurations[configName];
    if (!config) {
        log(`Configuration ${configName} not found`, 'error');
        return;
    }

    isLoadingConfig = true;

    pivotConfig = JSON.parse(JSON.stringify(config.pivotConfig));
    activeFilters = JSON.parse(JSON.stringify(config.activeFilters));

    removeConfigSelector();

    if (currentData.length > 0) {
        const filteredData = applyAllFilters(currentData);
        
        log(`Loading config: rows=[${pivotConfig.rows.join(',')}], cols=[${pivotConfig.cols.join(',')}], vals=[${pivotConfig.vals.join(',')}], aggregator=${pivotConfig.aggregatorName}, renderer=${pivotConfig.rendererName}`, 'info');
        
        // Completely destroy and recreate the pivot table
        $("#output").empty();
        $("#output").removeData();
        $("#output").html('<div id="pivot-container"></div>');
        
        setTimeout(() => {
            const loadConfig = getPivotTableConfig(pivotConfig);
            
            $("#pivot-container").pivotUI(filteredData, loadConfig);
            
            setTimeout(() => {
                isLoadingConfig = false;
            }, 500);
            
            log(`Configuration ${configName} loaded and applied`, 'success');
            showToast(`Configuration ${configName} loaded!`);
            
            addTouchSupport();
        }, 100);
    } else {
        isLoadingConfig = false;
        log(`Configuration ${configName} loaded (load data to apply)`, 'info');
        showToast(`Configuration ${configName} loaded - now load some data`);
    }
}

function clearAllConfigurations() {
    savedConfigurations = {};
    configCounter = 1;
    removeConfigSelector();
    updateConfigurationList();
    log('All configurations cleared', 'info');
    showToast('All configurations cleared');
}

function updateConfigurationList() {
    const count = Object.keys(savedConfigurations).length;
    log(`${count} configurations in memory`, 'info');
}

// Handle window resize
let resizeTimer;
$(window).on('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
        if ($('.c3').length > 0 && currentData.length > 0) {
            const filteredData = applyAllFilters(currentData);
            renderPivotTableWithData(filteredData);
        }
    }, 250);
});

// Initialize on page load
$(document).ready(function() {
    log('PivotTable app initialized', 'success');
    checkServerConnection();

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

    loadFromServer();
});

// Make functions globally accessible for onclick handlers
window.removeFilterDropdown = removeFilterDropdown;
window.selectAllValues = selectAllValues;
window.deselectAllValues = deselectAllValues;
window.updateCategoricalFilter = updateCategoricalFilter;
window.applyFilter = applyFilter;
window.clearFilter = clearFilter;
window.removeConfigSelector = removeConfigSelector;
window.selectConfiguration = selectConfiguration;
window.clearAllConfigurations = clearAllConfigurations;
window.loadSampleData = loadSampleData;
window.loadFromServer = loadFromServer;
window.handleFileUpload = handleFileUpload;
window.resetPivot = resetPivot;
window.saveConfiguration = saveConfiguration;
window.loadConfiguration = loadConfiguration;