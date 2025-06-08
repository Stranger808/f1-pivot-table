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
