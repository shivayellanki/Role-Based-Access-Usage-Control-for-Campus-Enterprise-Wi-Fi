const mysql = require('mysql2/promise');
require('dotenv').config();

// Determine database configuration, switching default port to 3306 and user to root for MySQL
const config = process.env.DATABASE_URL
  ? {
      uri: process.env.DATABASE_URL,
      multipleStatements: true
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      database: process.env.DB_NAME || 'rbwifi',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true
    };

const mysqlPool = mysql.createPool(config);

/**
 * Utility to convert PostgreSQL-style query and values to MySQL format.
 * - Converts $1, $2, etc. placeholders to ?
 * - Detects and handles RETURNING clauses on INSERT queries
 * - Stringifies JSON/Array values for MySQL JSON columns
 */
function convertPgToMysql(sql, values = []) {
  if (typeof sql !== 'string') {
    return { sql, values };
  }

  // 1. Detect and handle INSERT with RETURNING clause
  const returningMatch = sql.match(/insert\s+into\s+(\w+)[^]*returning\s+([\w\s,]+)/i);
  let returningFields = null;
  let tableName = null;
  let cleanSql = sql;
  
  if (returningMatch) {
    tableName = returningMatch[1];
    returningFields = returningMatch[2].trim();
    // Remove the RETURNING clause from the clean SQL statement
    cleanSql = sql.replace(/returning\s+[\w\s,]+/i, '');
  }

  // 2. Map PostgreSQL parameter placeholders ($1, $2, etc.) to MySQL placeholders (?)
  const newValues = [];
  cleanSql = cleanSql.replace(/\$(\d+)/g, (match, p1) => {
    const pgIdx = parseInt(p1, 10) - 1;
    newValues.push(values[pgIdx]);
    return '?';
  });

  // 3. Stringify complex JavaScript types (arrays or objects) to JSON strings for MySQL, excluding Date objects
  const finalValues = newValues.map(val => {
    if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
      return JSON.stringify(val);
    }
    return val;
  });

  return { sql: cleanSql, values: finalValues, tableName, returningFields };
}

/**
 * Safely parse typical JSON/array columns returned by MySQL
 */
function parseRowJsonFields(row) {
  if (!row) return row;
  const jsonFields = ['blocked_categories', 'domain_whitelist', 'details'];
  for (const field of jsonFields) {
    if (row[field] !== undefined) {
      if (typeof row[field] === 'string') {
        try {
          row[field] = JSON.parse(row[field]);
        } catch (e) {
          // Leave as is if parse fails
        }
      }
    }
  }
  return row;
}

// Wrapper object mimicking the PostgreSQL pg Pool API
const pool = {
  async query(sql, values = []) {
    const { sql: mysqlSql, values: mysqlValues, tableName, returningFields } = convertPgToMysql(sql, values);
    
    try {
      const statements = mysqlSql.split(';').map(s => s.trim()).filter(Boolean);
      const hasMultipleStatements = statements.length > 1;

      // Use query method for all statements for seamless parameter substitution (including LIMIT and booleans)
      const [rows, fields] = await mysqlPool.query(mysqlSql, mysqlValues);
        
      // For INSERT queries with RETURNING, perform a second query to fetch the requested fields using the inserted ID
      if (tableName && returningFields) {
        const insertId = rows.insertId;
        const selectSql = `SELECT ${returningFields} FROM ${tableName} WHERE id = ?`;
        const [selectRows] = await mysqlPool.query(selectSql, [insertId]);
        const parsedRows = selectRows.map(parseRowJsonFields);
        return { rows: parsedRows, rowCount: parsedRows.length };
      }

      // If rows is not an array (e.g. for UPDATE/DELETE/INSERT without RETURNING, rows is ResultSetHeader)
      if (!Array.isArray(rows)) {
        return { rows: [], rowCount: rows.affectedRows || 0 };
      }

      const parsedRows = rows.map(parseRowJsonFields);
      return { rows: parsedRows, rowCount: parsedRows.length };
    } catch (err) {
      console.error('MySQL Query Error:', err);
      console.error('Original SQL:', sql);
      console.error('MySQL SQL:', mysqlSql);
      console.error('MySQL Values:', mysqlValues);
      throw err;
    }
  },

  async end() {
    await mysqlPool.end();
  },

  on(event, handler) {
    mysqlPool.on(event, handler);
    return this;
  }
};

module.exports = pool;
