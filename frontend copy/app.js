// Global variables
let allResults = [];
let currentPage = 0;
const rowsPerPage = 20;

// Initialize the application
$(document).ready(function() {
    loadDefaultQuery();
});

// Configure API endpoint
const API_BASE_URL = typeof CONFIG !== 'undefined' 
    ? CONFIG.getApiUrl()
    : 'http://localhost:8000';

// Load default query
async function loadDefaultQuery() {
    try {
        const response = await fetch(`${API_BASE_URL}/default-query`);
        const data = await response.json();
        document.getElementById('query-input').value = data.query;
        
        // Auto-submit the default query
        submitQuery();
    } catch (error) {
        console.error('Error loading default query:', error);
        showError('Failed to load default query');
    }
}

// Submit query
async function submitQuery() {
    const query = document.getElementById('query-input').value.trim();
    if (!query) {
        showError('Please enter a query');
        return;
    }
    
    // Show loading state
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Running...';
    hideError();
    
    try {
        const response = await fetch(`${API_BASE_URL}/submit-input`, {
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
        allResults = data.rows || [];
        
        // Update UI with results
        if (allResults.length > 0) {
            updatePivotTable(allResults);
            displayResults();
            document.getElementById('results-section').style.display = 'block';
        } else {
            showError('Query returned no results');
        }
        
    } catch (error) {
        console.error('Error executing query:', error);
        showError('Error executing query: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit';
    }
}

// Update PivotTable with new data
function updatePivotTable(data) {
    const pivotLoading = document.getElementById('pivot-loading');
    pivotLoading.style.display = 'block';
    
    // Clear previous pivot table
    $('#pivot-output').empty();
    
    // Create pivot table with combined renderers
    const renderers = $.extend(
        $.pivotUtilities.renderers,
        $.pivotUtilities.plotly_renderers
    );
    
    // Define custom aggregators that handle duplicate session-level data
    /* const customAggregators = {
        "Sum (No Duplicates)": function() {
            return function(data, rowKey, colKey) {
                const seen = new Set();
                let sum = 0;
                
                data.forEach(record => {
                    // Create a unique key for session-level data
                    const sessionKey = `${record.Driver}-${record["Grand Prix"]}-${record.Session}`;
                    
                    if (!seen.has(sessionKey) && record.Points) {
                        seen.add(sessionKey);
                        sum += parseFloat(record.Points) || 0;
                    }
                });
                
                return {
                    value: function() { return sum; },
                    format: function(x) { return x.toFixed(2); }
                };
            };
        },
        "Average (Session Level)": function() {
            return function(data, rowKey, colKey) {
                const seen = new Set();
                const values = [];
                
                data.forEach(record => {
                    const sessionKey = `${record.Driver}-${record["Grand Prix"]}-${record.Session}`;
                    
                    if (!seen.has(sessionKey) && record.Position) {
                        seen.add(sessionKey);
                        values.push(parseFloat(record.Position) || 0);
                    }
                });
                
                const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
                return {
                    value: function() { return avg; },
                    format: function(x) { return x.toFixed(2); }
                };
            };
        }
    }; */
    
    // Merge custom aggregators with standard ones
    // const allAggregators = $.extend({}, $.pivotUtilities.aggregators, customAggregators);
    
    // Initialize pivot table
    $('#pivot-output').pivotUI(data, {
        renderers: renderers,
        aggregators: $.pivotUtilities.aggregators,
        rows: ['Driver'],
        cols: ['Year'],
        vals: ['Position'],
        aggregatorName: 'Average',
        rendererName: 'Table',
        onRefresh: function(config) {
            pivotLoading.style.display = 'none';
            // Apply scrolling to the table after it's rendered
            applyTableScrolling();
        }
    });
    
    pivotLoading.style.display = 'none';
}

// Apply scrolling behavior to the pivot table
function applyTableScrolling() {
    // Wait a bit for the table to fully render
    setTimeout(() => {
        const pvtTable = document.querySelector('.pvtTable');
        if (pvtTable && !pvtTable.parentElement.classList.contains('pvtTableWrapper')) {
            // Calculate available height
            const windowHeight = window.innerHeight;
            const tableTop = pvtTable.getBoundingClientRect().top;
            const margin = 50; // Leave some margin at the bottom
            const maxHeight = windowHeight - tableTop - margin;
            
            // Create a wrapper div for scrolling
            const wrapper = document.createElement('div');
            wrapper.className = 'pvtTableWrapper';
            wrapper.style.maxHeight = maxHeight + 'px';
            
            // Insert wrapper and move table inside it
            pvtTable.parentNode.insertBefore(wrapper, pvtTable);
            wrapper.appendChild(pvtTable);
            
            // Remove the overflow from the table itself
            pvtTable.style.overflow = 'visible';
            pvtTable.style.maxHeight = 'none';
            pvtTable.style.display = 'table';
            pvtTable.style.border = 'none';
        }
    }, 100);
}

// Adjust table height on window resize
window.addEventListener('resize', () => {
    const wrapper = document.querySelector('.pvtTableWrapper');
    if (wrapper) {
        const windowHeight = window.innerHeight;
        const wrapperTop = wrapper.getBoundingClientRect().top;
        const margin = 50;
        const maxHeight = windowHeight - wrapperTop - margin;
        wrapper.style.maxHeight = maxHeight + 'px';
    }
});

// Display results in table
function displayResults() {
    currentPage = 0;
    updateResultsTable();
}

// Update results table
function updateResultsTable() {
    if (allResults.length === 0) return;
    
    const headers = Object.keys(allResults[0]);
    const start = currentPage * rowsPerPage;
    const end = Math.min(start + rowsPerPage, allResults.length);
    const pageResults = allResults.slice(start, end);
    
    // Update header
    const headerRow = headers.map(h => `<th>${h}</th>`).join('');
    document.getElementById('table-header').innerHTML = `<tr>${headerRow}</tr>`;
    
    // Update body
    const bodyRows = pageResults.map(row => {
        const cells = headers.map(h => `<td>${row[h] || ''}</td>`).join('');
        return `<tr>${cells}</tr>`;
    }).join('');
    document.getElementById('table-body').innerHTML = bodyRows;
    
    // Update pagination info
    const totalPages = Math.ceil(allResults.length / rowsPerPage);
    document.getElementById('current-page').textContent = currentPage + 1;
    document.getElementById('total-pages').textContent = totalPages;
    document.getElementById('total-rows').textContent = allResults.length;
    
    // Update pagination buttons
    document.getElementById('prev-btn').disabled = currentPage === 0;
    document.getElementById('next-btn').disabled = currentPage >= totalPages - 1;
}

// Pagination functions
function previousPage() {
    if (currentPage > 0) {
        currentPage--;
        updateResultsTable();
    }
}

function nextPage() {
    const totalPages = Math.ceil(allResults.length / rowsPerPage);
    if (currentPage < totalPages - 1) {
        currentPage++;
        updateResultsTable();
    }
}

// Download CSV
function downloadCSV(event) {
    event.preventDefault();
    
    if (allResults.length === 0) return;
    
    const headers = Object.keys(allResults[0]);
    const csvContent = [
        headers.join(','),
        ...allResults.map(row => 
            headers.map(h => {
                const value = row[h] || '';
                // Escape quotes and wrap in quotes if contains comma or newline
                const escaped = String(value).replace(/"/g, '""');
                return /[,\n"]/.test(escaped) ? `"${escaped}"` : escaped;
            }).join(',')
        )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'f1_query_results.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Error handling
function showError(message) {
    const errorElement = document.getElementById('error-message');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function hideError() {
    document.getElementById('error-message').style.display = 'none';
}