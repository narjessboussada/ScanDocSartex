const { connectDB, sql } = require('../config/db');
const ocrService = require('./ocrService');

const createError = (message, statusCode) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const scanService = {

  async createScan(userId, imageBase64, filename = 'scan.jpg') {
    const pool = await connectDB();

    const scanInsert = await pool.request()
      .input('user_id',      sql.Int,               userId)
      .input('filename',     sql.NVarChar,          filename)
      .input('status',       sql.NVarChar,          'pending')
      .input('image_base64', sql.NVarChar(sql.MAX), imageBase64)
      .query(`
        INSERT INTO scans (user_id, filename, status, image_base64)
        OUTPUT INSERTED.id
        VALUES (@user_id, @filename, @status, @image_base64)
      `);

    const scanId = scanInsert.recordset[0].id;

    let ocrResult;
    try {
      ocrResult = await ocrService.analyze(imageBase64);
    } catch (ocrErr) {
      const pool2 = await connectDB();
      await pool2.request()
        .input('id', sql.Int, scanId)
        .query("UPDATE scans SET status = 'failed' WHERE id = @id");
      throw ocrErr;
    }

    const pool3 = await connectDB();
    await pool3.request()
      .input('id',       sql.Int,               scanId)
      .input('raw_text', sql.NVarChar(sql.MAX), ocrResult.rawText)
      .query(`
        UPDATE scans SET status = 'completed', raw_text = @raw_text
        WHERE id = @id
      `);

    for (const field of ocrResult.fields) {
      const pool4 = await connectDB();
      await pool4.request()
        .input('scan_id',     sql.Int,     scanId)
        .input('field_name',  sql.NVarChar, field.name)
        .input('field_value', sql.NVarChar, field.value)
        .query(`
          INSERT INTO extracted_data (scan_id, field_name, field_value)
          VALUES (@scan_id, @field_name, @field_value)
        `);
    }

    return {
      scanId,
      status: 'completed',
      rawText: ocrResult.rawText,
      fields:  ocrResult.fields,
    };
  },

  async getHistory(userId, isAdmin) {
    const pool = await connectDB();

    const query = isAdmin
      ? `SELECT s.id, s.filename, s.status, s.created_at,
                u.email AS user_email
         FROM scans s
         JOIN users u ON s.user_id = u.id
         ORDER BY s.created_at DESC`
      : `SELECT id, filename, status, created_at
         FROM scans
         WHERE user_id = @user_id
         ORDER BY created_at DESC`;

    const request = pool.request();
    if (!isAdmin) request.input('user_id', sql.Int, userId);

    const result = await request.query(query);
    return result.recordset;
  },

  async getScanById(scanId, userId, isAdmin) {
    const pool = await connectDB();

    const scanResult = await pool.request()
      .input('id', sql.Int, scanId)
      .query('SELECT * FROM scans WHERE id = @id');

    const scan = scanResult.recordset[0];
    if (!scan) throw createError('Scan not found', 404);

    if (!isAdmin && scan.user_id !== userId)
      throw createError('Access denied', 403);

    const pool2 = await connectDB();
    const fieldsResult = await pool2.request()
      .input('scan_id', sql.Int, scanId)
      .query(`
        SELECT id, field_name, field_value, is_validated, corrected_value
        FROM extracted_data
        WHERE scan_id = @scan_id
        ORDER BY id
      `);

    return {
      document: {
        id:           scan.id,
        filename:     scan.filename,
        status:       scan.status,
        rawText:      scan.raw_text,
        createdAt:    scan.created_at,
        image_base64: scan.image_base64,
      },
      fields: fieldsResult.recordset,
    };
  },

  async updateScan(scanId, userId, isAdmin, { filename, status }) {
    const pool = await connectDB();

    const scanResult = await pool.request()
      .input('id', sql.Int, scanId)
      .query('SELECT * FROM scans WHERE id = @id');

    const scan = scanResult.recordset[0];
    if (!scan) throw createError('Scan not found', 404);

    if (!isAdmin && scan.user_id !== userId)
      throw createError('Access denied', 403);

    const pool2 = await connectDB();
    const result = await pool2.request()
      .input('id',       sql.Int,     scanId)
      .input('filename', sql.NVarChar, filename || null)
      .input('status',   sql.NVarChar, status   || null)
      .query(`
        UPDATE scans
        SET
          filename = COALESCE(@filename, filename),
          status   = COALESCE(@status,   status)
        WHERE id = @id;
        SELECT id, filename, status, created_at FROM scans WHERE id = @id
      `);

    return result.recordset[0];
  },

  async deleteScan(scanId, userId, isAdmin) {
    const pool = await connectDB();

    const scanResult = await pool.request()
      .input('id', sql.Int, scanId)
      .query('SELECT * FROM scans WHERE id = @id');

    const scan = scanResult.recordset[0];
    if (!scan) throw createError('Scan not found', 404);

    if (!isAdmin && scan.user_id !== userId)
      throw createError('Access denied', 403);

    const pool2 = await connectDB();
    await pool2.request()
      .input('scan_id', sql.Int, scanId)
      .query('DELETE FROM extracted_data WHERE scan_id = @scan_id');

    const pool3 = await connectDB();
    await pool3.request()
      .input('id', sql.Int, scanId)
      .query('DELETE FROM scans WHERE id = @id');

    return { scanId };
  },

  async validateField(fieldId, isValidated, correctedValue) {
    const pool = await connectDB();

    const result = await pool.request()
      .input('id',              sql.Int,     fieldId)
      .input('is_validated',    sql.Bit,     isValidated)
      .input('corrected_value', sql.NVarChar, correctedValue || null)
      .query(`
        UPDATE extracted_data
        SET is_validated    = @is_validated,
            corrected_value = @corrected_value
        WHERE id = @id
      `);

    if (result.rowsAffected[0] === 0)
      throw createError('Field not found', 404);

    return { fieldId, isValidated, correctedValue };
  },

  async deleteField(fieldId) {
    const pool = await connectDB();

    const result = await pool.request()
      .input('id', sql.Int, fieldId)
      .query('DELETE FROM extracted_data WHERE id = @id');

    if (result.rowsAffected[0] === 0)
      throw createError('Field not found', 404);

    return { fieldId };
  },




  // Permet de tester avec le JSON de l'API entreprise directement
async processerJSONEntreprise(userId, jsonData, filename = 'facture.json') {
  const pool = await connectDB();

  // Traite le JSON
  const ocrResult = ocrService.traiterJSONEntreprise(jsonData);

  // Sauvegarde le document
  const scanInsert = await pool.request()
    .input('user_id',      sql.Int,               userId)
    .input('filename',     sql.NVarChar,          filename)
    .input('status',       sql.NVarChar,          'pending')
    .input('image_base64', sql.NVarChar(sql.MAX), '')
    .query(`
      INSERT INTO scans (user_id, filename, status, image_base64)
      OUTPUT INSERTED.id
      VALUES (@user_id, @filename, @status, @image_base64)
    `);

  const scanId = scanInsert.recordset[0].id;

  // Sauvegarde le texte brut
  const pool2 = await connectDB();
  await pool2.request()
    .input('id',       sql.Int,               scanId)
    .input('raw_text', sql.NVarChar(sql.MAX), ocrResult.rawText)
    .query(`UPDATE scans SET status = 'completed', raw_text = @raw_text WHERE id = @id`);

  // Sauvegarde les champs
  for (const field of ocrResult.fields) {
    const pool3 = await connectDB();
    await pool3.request()
      .input('scan_id',    sql.Int,     scanId)
      .input('field_name', sql.NVarChar, field.name)
      .input('field_value',sql.NVarChar, field.value || '')
      .query(`INSERT INTO extracted_data (scan_id, field_name, field_value)
              VALUES (@scan_id, @field_name, @field_value)`);
  }

  return { scanId, status: 'completed', rawText: ocrResult.rawText, fields: ocrResult.fields };
},






};

module.exports = scanService;