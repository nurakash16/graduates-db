require('dotenv').config(); // Load .env file
const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Helper: check if table exists
async function tableExists(tableName) {
  const query = `
    SELECT EXISTS (
      SELECT 1 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = $1
    );
  `;
  const { rows } = await pool.query(query, [tableName]);
  return rows[0].exists;
}

// Helper: fetch department data with filters + pagination
async function getDepartmentData(departmentTable, search, minCgpa, maxCgpa, registration, offset = 0, limit = 10) {
  const exists = await tableExists(departmentTable);
  if (!exists) return { rows: [], totalRecords: 0 };

  let query = `SELECT * FROM public.${departmentTable} WHERE 1=1`;
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    query += ` AND (name ILIKE $${params.length} OR program ILIKE $${params.length})`;
  }

  if (minCgpa) {
    params.push(minCgpa);
    query += ` AND cgpa::float >= $${params.length}`;
  }

  if (maxCgpa) {
    params.push(maxCgpa);
    query += ` AND cgpa::float <= $${params.length}`;
  }

  if (registration) {
    params.push(`%${registration}%`);
    query += ` AND registration ILIKE $${params.length}`;
  }

  const countQuery = `SELECT COUNT(*) FROM (${query}) AS sub`;
  const countResult = await pool.query(countQuery, params);
  const totalRecords = parseInt(countResult.rows[0].count, 10);

  query += ` ORDER BY date_of_graduation DESC OFFSET $${params.length + 1} LIMIT $${params.length + 2}`;
  params.push(offset, limit);

  const { rows } = await pool.query(query, params);
  return { rows, totalRecords };
}

// API: Get graduates
app.get('/graduates/:department', async (req, res) => {
  const { department } = req.params;
  const { search, minCgpa, maxCgpa, registration, page, limit } = req.query;
  const pageNumber = parseInt(page) || 1;
  const pageSize = parseInt(limit) || 10;
  const offset = (pageNumber - 1) * pageSize;

  const tableName = `graduates_${department.toLowerCase()}`;

  try {
    const result = await getDepartmentData(tableName, search, minCgpa, maxCgpa, registration, offset, pageSize);
    const totalPages = Math.ceil(result.totalRecords / pageSize);

    res.json({
      data: result.rows,
      totalPages,
      currentPage: pageNumber
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// Charts helpers
async function fetchDepartmentChart(departmentTable, field, agg = 'COUNT(*)') {
  const exists = await tableExists(departmentTable);
  if (!exists) return [];

  const query = `SELECT ${field}, ${agg} as value FROM public.${departmentTable} GROUP BY ${field} ORDER BY ${field}`;
  const { rows } = await pool.query(query);
  return rows;
}

// Chart endpoints
app.get('/graduates/:department/chart/convocation', async (req, res) => {
  try {
    const rows = await fetchDepartmentChart(`graduates_${req.params.department.toLowerCase()}`, 'convocation');
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Failed convocation chart' });
  }
});

app.get('/graduates/:department/chart/cgpa', async (req, res) => {
  try {
    const rows = await fetchDepartmentChart(`graduates_${req.params.department.toLowerCase()}`, 'convocation', 'ROUND(AVG(cgpa::numeric),2)');
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Failed cgpa chart' });
  }
});

app.get('/graduates/chart/cgpa-stats-by-dept', async (req, res) => {
  try {
    const departments = ['eee', 'cse', 'mecha','civil','ipe','bba','textile','arch'];
    const results = [];

    for (let dept of departments) {
      const tableName = `graduates_${dept}`;
      const exists = await tableExists(tableName);
      if (!exists) {
        results.push({ department: dept.toUpperCase(), avg_cgpa: 0, min_cgpa: 0, max_cgpa: 0 });
        continue;
      }
      const query = `
        SELECT 
          ROUND(AVG(cgpa::numeric),2) AS avg_cgpa,
          ROUND(MIN(cgpa::numeric),2) AS min_cgpa,
          ROUND(MAX(cgpa::numeric),2) AS max_cgpa
        FROM public.${tableName};
      `;
      const { rows } = await pool.query(query);
      results.push({
        department: dept.toUpperCase(),
        avg_cgpa: rows[0].avg_cgpa ? parseFloat(rows[0].avg_cgpa) : 0,
        min_cgpa: rows[0].min_cgpa ? parseFloat(rows[0].min_cgpa) : 0,
        max_cgpa: rows[0].max_cgpa ? parseFloat(rows[0].max_cgpa) : 0
      });
    }

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch CGPA stats per department' });
  }
});

// Count by department
app.get('/graduates/chart/count-by-dept', async (req, res) => {
  try {
    const departments = ['eee', 'cse', 'mecha','civil','ipe','bba','textile','arch'];
    const results = [];

    for (let dept of departments) {
      const tableName = `graduates_${dept}`;
      const exists = await tableExists(tableName);
      if (!exists) {
        results.push({ department: dept.toUpperCase(), count: 0 });
        continue;
      }
      const { rows } = await pool.query(`SELECT COUNT(*) AS count FROM public.${tableName}`);
      results.push({ department: dept.toUpperCase(), count: parseInt(rows[0].count, 10) });
    }

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch count by department' });
  }
});

// CGPA by department
app.get('/graduates/chart/cgpa-by-dept', async (req, res) => {
  try {
    const departments = ['eee', 'cse', 'mecha','civil','ipe','bba','textile','arch'];
    const results = [];

    for (let dept of departments) {
      const tableName = `graduates_${dept}`;
      const exists = await tableExists(tableName);
      if (!exists) {
        results.push({ department: dept.toUpperCase(), cgpas: [] });
        continue;
      }
      const { rows } = await pool.query(`SELECT cgpa::float AS cgpa FROM public.${tableName} WHERE cgpa IS NOT NULL`);
      results.push({ department: dept.toUpperCase(), cgpas: rows.map(r => r.cgpa) });
    }

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch cgpa by department' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Backend running on http://localhost:3000'));

