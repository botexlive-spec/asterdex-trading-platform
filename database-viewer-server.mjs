/**
 * MySQL Database Web Viewer
 * Access your MySQL database through a web interface
 * Run: node database-viewer-server.mjs
 * Then open: http://localhost:8080 in your browser
 */

import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';

const app = express();
const PORT = 8080; // Web interface on port 8080 (MySQL uses 3306)

app.use(cors());
app.use(express.json());

// MySQL Connection Pool
const pool = mysql.createPool({
  host: 'localhost',
  port: 3306, // MySQL is on port 3306
  user: 'root',
  password: 'root',
  database: 'finaster_mlm',
  waitForConnections: true,
  connectionLimit: 10
});

// Serve the main HTML page
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MySQL Database Viewer - Asterdex MLM</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }

        .header {
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }

        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }

        .status {
            display: inline-block;
            padding: 10px 20px;
            background: rgba(255,255,255,0.2);
            border-radius: 20px;
            margin-top: 15px;
        }

        .status.connected {
            background: rgba(72, 187, 120, 0.3);
        }

        .tabs {
            display: flex;
            background: #f5f5f5;
            border-bottom: 2px solid #ddd;
            overflow-x: auto;
        }

        .tab {
            padding: 15px 30px;
            cursor: pointer;
            border: none;
            background: none;
            font-size: 16px;
            transition: all 0.3s;
            white-space: nowrap;
        }

        .tab:hover {
            background: #e0e0e0;
        }

        .tab.active {
            background: white;
            border-bottom: 3px solid #667eea;
            font-weight: bold;
            color: #667eea;
        }

        .content {
            padding: 30px;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }

        .stat-card h3 {
            font-size: 14px;
            opacity: 0.9;
            margin-bottom: 10px;
        }

        .stat-card .value {
            font-size: 32px;
            font-weight: bold;
        }

        .table-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }

        .table-card {
            background: #f9f9f9;
            padding: 20px;
            border-radius: 10px;
            border: 2px solid #ddd;
            cursor: pointer;
            transition: all 0.3s;
        }

        .table-card:hover {
            border-color: #667eea;
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.2);
            transform: translateY(-2px);
        }

        .table-card h4 {
            color: #667eea;
            margin-bottom: 10px;
            font-size: 18px;
        }

        .table-card .row-count {
            color: #666;
            font-size: 14px;
        }

        .data-table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            margin-top: 20px;
        }

        .data-table th {
            background: #667eea;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
            position: sticky;
            top: 0;
        }

        .data-table td {
            padding: 12px 15px;
            border-bottom: 1px solid #eee;
        }

        .data-table tr:hover {
            background: #f9f9f9;
        }

        .loading {
            text-align: center;
            padding: 60px;
            color: #667eea;
            font-size: 18px;
        }

        .error {
            background: #fed7d7;
            color: #c53030;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
        }

        .success {
            background: #c6f6d5;
            color: #22543d;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
        }

        button {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            background: #667eea;
            color: white;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.3s;
            margin: 5px;
        }

        button:hover {
            background: #5568d3;
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
        }

        .query-input {
            width: 100%;
            padding: 15px;
            border: 2px solid #ddd;
            border-radius: 10px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            margin-bottom: 15px;
            min-height: 100px;
        }

        .section {
            display: none;
        }

        .section.active {
            display: block;
        }

        .back-btn {
            background: #718096;
            margin-bottom: 20px;
        }

        .back-btn:hover {
            background: #4a5568;
        }

        .table-scroll {
            max-height: 600px;
            overflow: auto;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🗄️ MySQL Database Viewer</h1>
            <p style="font-size: 1.2em; opacity: 0.9;">Asterdex MLM Platform</p>
            <div class="status connected" id="status">
                ✓ Connected to finaster_mlm @ localhost:3306
            </div>
        </div>

        <div class="tabs">
            <button class="tab active" onclick="showSection('overview')">📊 Overview</button>
            <button class="tab" onclick="showSection('tables')">📋 Tables</button>
            <button class="tab" onclick="showSection('query')">⚡ Query</button>
        </div>

        <div class="content">
            <!-- Overview Section -->
            <div id="overview" class="section active">
                <h2 style="margin-bottom: 20px;">Database Overview</h2>
                <div class="stats-grid" id="stats">
                    <div class="loading">Loading statistics...</div>
                </div>

                <h3 style="margin: 30px 0 20px 0;">Quick Access Tables</h3>
                <div class="table-list" id="table-list">
                    <div class="loading">Loading tables...</div>
                </div>
            </div>

            <!-- Tables Section -->
            <div id="tables" class="section">
                <button class="back-btn" onclick="showSection('overview')">← Back to Overview</button>
                <h2 style="margin-bottom: 20px;" id="table-title">Table Data</h2>
                <div id="table-details">
                    <div class="loading">Select a table to view</div>
                </div>
            </div>

            <!-- Query Section -->
            <div id="query" class="section">
                <h2 style="margin-bottom: 20px;">Execute SQL Query</h2>
                <textarea class="query-input" id="sql-query" placeholder="Enter your SQL query here...

Example:
SELECT * FROM users LIMIT 10;"></textarea>
                <button onclick="executeQuery()">Execute Query</button>
                <button onclick="document.getElementById('sql-query').value = ''" style="background: #718096;">Clear</button>
                <div id="query-results"></div>
            </div>
        </div>
    </div>

    <script>
        let currentSection = 'overview';

        function showSection(section) {
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));

            document.getElementById(section).classList.add('active');
            event.target.classList.add('active');
            currentSection = section;
        }

        async function loadStats() {
            try {
                const response = await fetch('/api/stats');
                const data = await response.json();

                const statsHTML = \`
                    <div class="stat-card">
                        <h3>TOTAL USERS</h3>
                        <div class="value">\${data.users}</div>
                    </div>
                    <div class="stat-card">
                        <h3>TOTAL INVESTMENT</h3>
                        <div class="value">$\${Math.round(data.investment).toLocaleString()}</div>
                    </div>
                    <div class="stat-card">
                        <h3>TOTAL EARNINGS</h3>
                        <div class="value">$\${Math.round(data.earnings).toLocaleString()}</div>
                    </div>
                    <div class="stat-card">
                        <h3>ACTIVE PACKAGES</h3>
                        <div class="value">\${data.packages}</div>
                    </div>
                \`;

                document.getElementById('stats').innerHTML = statsHTML;
            } catch (error) {
                document.getElementById('stats').innerHTML = \`
                    <div class="error">Error loading stats: \${error.message}</div>
                \`;
            }
        }

        async function loadTables() {
            try {
                const response = await fetch('/api/tables');
                const tables = await response.json();

                let html = '';
                for (const table of tables) {
                    html += \`
                        <div class="table-card" onclick="viewTable('\${table.name}')">
                            <h4>\${table.name}</h4>
                            <div class="row-count">\${table.rows} rows</div>
                        </div>
                    \`;
                }

                document.getElementById('table-list').innerHTML = html;
            } catch (error) {
                document.getElementById('table-list').innerHTML = \`
                    <div class="error">Error loading tables: \${error.message}</div>
                \`;
            }
        }

        async function viewTable(tableName) {
            showSection('tables');
            document.getElementById('table-title').textContent = \`Table: \${tableName}\`;
            document.getElementById('table-details').innerHTML = '<div class="loading">Loading table data...</div>';

            try {
                const response = await fetch(\`/api/table/\${tableName}\`);
                const data = await response.json();

                if (data.length === 0) {
                    document.getElementById('table-details').innerHTML = \`
                        <div class="success">Table "\${tableName}" is empty (0 rows)</div>
                    \`;
                    return;
                }

                const columns = Object.keys(data[0]);
                let html = \`
                    <p style="margin-bottom: 15px; color: #666;">Showing \${data.length} rows</p>
                    <div class="table-scroll">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    \${columns.map(col => \`<th>\${col}</th>\`).join('')}
                                </tr>
                            </thead>
                            <tbody>
                \`;

                data.forEach(row => {
                    html += '<tr>';
                    columns.forEach(col => {
                        let value = row[col];
                        if (value === null) {
                            value = '<em style="color: #999;">NULL</em>';
                        } else if (typeof value === 'number') {
                            value = value.toLocaleString();
                        }
                        html += \`<td>\${value}</td>\`;
                    });
                    html += '</tr>';
                });

                html += '</tbody></table></div>';
                document.getElementById('table-details').innerHTML = html;
            } catch (error) {
                document.getElementById('table-details').innerHTML = \`
                    <div class="error">Error loading table: \${error.message}</div>
                \`;
            }
        }

        async function executeQuery() {
            const query = document.getElementById('sql-query').value.trim();
            if (!query) {
                alert('Please enter a SQL query');
                return;
            }

            document.getElementById('query-results').innerHTML = '<div class="loading">Executing query...</div>';

            try {
                const response = await fetch('/api/query', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query })
                });

                const result = await response.json();

                if (result.error) {
                    document.getElementById('query-results').innerHTML = \`
                        <div class="error"><strong>SQL Error:</strong><br>\${result.error}</div>
                    \`;
                    return;
                }

                const data = result.data || result;

                if (!data || data.length === 0) {
                    document.getElementById('query-results').innerHTML = \`
                        <div class="success">Query executed successfully (0 rows returned or UPDATE/INSERT/DELETE completed)</div>
                    \`;
                    return;
                }

                const columns = Object.keys(data[0]);
                let html = \`
                    <div class="success" style="margin-bottom: 15px;">Query returned \${data.length} rows</div>
                    <div class="table-scroll">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    \${columns.map(col => \`<th>\${col}</th>\`).join('')}
                                </tr>
                            </thead>
                            <tbody>
                \`;

                data.forEach(row => {
                    html += '<tr>';
                    columns.forEach(col => {
                        let value = row[col];
                        if (value === null) {
                            value = '<em style="color: #999;">NULL</em>';
                        } else if (typeof value === 'number') {
                            value = value.toLocaleString();
                        }
                        html += \`<td>\${value}</td>\`;
                    });
                    html += '</tr>';
                });

                html += '</tbody></table></div>';
                document.getElementById('query-results').innerHTML = html;
            } catch (error) {
                document.getElementById('query-results').innerHTML = \`
                    <div class="error">Error: \${error.message}</div>
                \`;
            }
        }

        // Load initial data
        loadStats();
        loadTables();
    </script>
</body>
</html>
  `);
});

// API: Get database statistics
app.get('/api/stats', async (req, res) => {
  try {
    const [users] = await pool.query('SELECT COUNT(*) as count FROM users');
    const [investment] = await pool.query('SELECT COALESCE(SUM(total_investment), 0) as total FROM users');
    const [earnings] = await pool.query('SELECT COALESCE(SUM(total_earnings), 0) as total FROM users');
    const [packages] = await pool.query('SELECT COUNT(*) as count FROM user_packages WHERE status = "active"');

    res.json({
      users: users[0].count,
      investment: parseFloat(investment[0].total),
      earnings: parseFloat(earnings[0].total),
      packages: packages[0].count
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Get all tables
app.get('/api/tables', async (req, res) => {
  try {
    const [tables] = await pool.query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);

    const tableInfo = [];
    for (const name of tableNames) {
      const [count] = await pool.query(`SELECT COUNT(*) as count FROM \`${name}\``);
      tableInfo.push({
        name,
        rows: count[0].count
      });
    }

    res.json(tableInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Get table data
app.get('/api/table/:name', async (req, res) => {
  try {
    const tableName = req.params.name;
    const [rows] = await pool.query(`SELECT * FROM \`${tableName}\` LIMIT 100`);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Execute custom query
app.post('/api/query', async (req, res) => {
  try {
    const { query } = req.body;
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test database connection on startup
pool.getConnection()
  .then(conn => {
    console.log('✓ Database connection successful');
    conn.release();
  })
  .catch(err => {
    console.error('✗ Database connection failed:', err.message);
  });

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('═'.repeat(60));
  console.log('🗄️  MySQL Database Web Viewer');
  console.log('═'.repeat(60));
  console.log(`✓ Server running on: http://localhost:${PORT}`);
  console.log(`✓ Open in browser: http://localhost:${PORT}`);
  console.log(`✓ Database: finaster_mlm @ localhost:3306`);
  console.log('═'.repeat(60));
  console.log('');
  console.log('Press Ctrl+C to stop the server');
  console.log('');
});
