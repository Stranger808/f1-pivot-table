# PivotTable.js Vanilla Application

This is a non-React version of the PivotTable application that uses the standard PivotTable.js library directly.

## Key Changes from React Version

1. **No React Dependencies**: This version uses vanilla JavaScript with jQuery (required by PivotTable.js)
2. **No Viewport Monitoring**: Removed all zoom detection and viewport size monitoring that was causing lag
3. **Simplified Architecture**: Clean separation of HTML, CSS, and JavaScript
4. **Direct PivotTable.js Integration**: Uses the standard PivotTable.js library instead of react-pivottable

## Features

- Interactive pivot table with drag-and-drop functionality
- Support for various aggregations (sum, average, count, etc.)
- Plotly-based chart renderers
- SQL query input with results display
- CSV export functionality
- Pagination for large result sets

## Project Structure

```
project-root/
├── .env                    # Environment variables (database connection)
├── backend/
│   ├── main.py            # FastAPI backend server
│   ├── queries/
│   │   └── default-query.sql
│   ├── poetry.lock
│   └── pyproject.toml
└── frontend/
    ├── index.html         # Main HTML file
    ├── app.js            # Application JavaScript
    └── styles.css        # Application styles
```

## Setup Instructions

### Backend Setup (Unchanged)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies using Poetry:
   ```bash
   poetry install
   ```

3. Ensure your `.env` file in the project root contains the database connection string

4. Run the backend server:
   ```bash
   poetry run uvicorn main:app --reload --port 8000
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Serve the files using any static file server:
   ```bash
   # Using Python
   python -m http.server 8080
   
   # Or using Node.js (if installed)
   npx http-server -p 8080
   
   # Or using the Live Server extension in VS Code
   ```

3. Access the application at `http://localhost:8080`

## Dependencies

All frontend dependencies are loaded from CDNs in the HTML file:
- jQuery 3.7.1
- jQuery UI 1.13.2
- PivotTable.js 2.23.0
- Plotly.js 2.27.0

No npm installation required!

## Performance Improvements

- Removed viewport monitoring that was causing lag
- No React re-renders or state management overhead
- Direct DOM manipulation for better performance
- Simplified event handling

## Browser Compatibility

Works in all modern browsers that support:
- ES6+ JavaScript
- Fetch API
- CSS Grid and Flexbox

## Customization

To customize the pivot table defaults, modify the initialization in `app.js`:

```javascript
$('#pivot-output').pivotUI(data, {
    rows: ['driver'],        // Default row fields
    cols: ['year'],          // Default column fields
    vals: ['position'],      // Default value fields
    aggregatorName: 'Average', // Default aggregation
    rendererName: 'Table',    // Default renderer
});
```

## Troubleshooting

1. **CORS Issues**: Ensure the backend server has CORS properly configured
2. **Empty Pivot Table**: Check that the query returns results with proper column names
3. **Chart Renderers Not Working**: Ensure Plotly.js is loaded before the pivot table renderers
4. **Backend Connection Failed**: Verify the backend is running on port 8000

## Migration from React Version

If migrating from the React version:
1. The backend remains completely unchanged
2. Default queries work the same way
3. All SQL queries are compatible
4. CSV export format is identical
5. The pivot table functionality is the same

## Development Tips

- Use browser developer tools to debug JavaScript issues
- Check the Network tab to ensure all CDN resources load correctly
- The console will show any errors in query execution or data processing