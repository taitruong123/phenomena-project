// Require the Client constructor from the pg package
const { Client } = require('pg');
// Create a constant, CONNECTION_STRING, from either process.env.DATABASE_URL or postgres://localhost:5432/phenomena-dev
// Create the client using new Client(CONNECTION_STRING)
const client = new Client(process.env.DATABASE_URL || 'postgres://localhost:5432/phenomena-dev');
// Do not connect to the client in this file!

async function getOpenReports() {
  try {
    const { rows: reports } = await client.query(`
      SELECT *
      FROM reports
      WHERE "isOpen"='true';
    `);

    const { rows: comments } = await client.query(`
      SELECT *
      FROM comments
      WHERE "reportId" IN (${reports.map((report) => report.id).join(', ')})
    `);

    reports.forEach((report) => {
      delete report.password;
      report.isExpired = report.expirationDate < new Date();
      report.comments = comments.filter((comment) => comment.reportId === report.id);
    });

    return reports;

  } catch (error) {
    throw error;
  }
}

/**
 * You should use the reportFields parameter (which is
 * an object with properties: title, location, description, password)
 * to insert a new row into the reports table.
 * 
 * On success, you should return the new report object,
 * and on failure you should throw the error up the stack.
 * 
 * Make sure to remove the password from the report object
 * before returning it.
 */
async function createReport(reportFields) {
  // Get all of the fields from the passed in object
  const { title, location, description, password } = reportFields;

  try {
    // insert the correct fields into the reports table
    // remember to return the new row from the query
    const { rows } = await client.query(`
      INSERT INTO reports(title, location, description, password)
      VALUES($1, $2, $3, $4)
      RETURNING *;
    `, [title, location, description, password]);

    // remove the password from the returned row
    delete rows[0].password;

    // return the new report
    return rows[0];

  } catch (error) {
    throw error;
  }
}

async function _getReport(reportId) {
  try {
    const { rows: [report] } = await client.query(`
      SELECT *
      FROM reports
      WHERE id=${reportId};
    `);

    return report;

  } catch (error) {
    throw error;
  }
}

async function closeReport(reportId, password) {
  try {
    const report = await _getReport(reportId);

    if (!report) {
      throw new Error('Report does not exist with that id');
    };
  
    if (report.password !== password) {
      throw new Error('Password incorrect for this report, please try again');
    };

    if (!report.isOpen) {
      throw new Error('This report has already been closed')
    };

    await client.query(`
      UPDATE reports
      SET "isOpen"=false
      WHERE id=${reportId};
    `);

    return {message: 'Report successfully closed!'}

  } catch (error) {
    throw error;
  }
}


async function createReportComment(reportId, commentFields) {
  const { content } = commentFields;

  try {
    const { rows: [report] } = await client.query(`
      SELECT *
      FROM reports
      WHERE id=${reportId};
    `);

    if (!report) {
      throw new Error('That report does not exist, no comment has been made');
    };

    if (!report.isOpen) {
      throw new Error('That report has been closed, no comment has been made');
    };

    if (Date.parse(report.expirationDate) < new Date()) {
      throw new Error('The discussion time on this report has expired, no comment has been made');
    };

    const { rows: [comment] } = await client.query(`
      INSERT INTO comments("reportId", content)
      VALUES ($1, $2)
      RETURNING *;
    `, [report.id, content]);

    await client.query(`
      UPDATE reports
      SET "expirationDate"= CURRENT_TIMESTAMP + interval '1 day'
      WHERE id=${reportId}
    `);

    return comment;

  } catch (error) {
    throw error;
  }
}

module.exports = {
  client,
  createReport,
  getOpenReports,
  _getReport,
  closeReport,
  createReportComment
};