import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

const DB_NAME = 'roadguard.db';
const DB_VERSION = '1.0';

class Database {
  constructor() {
    this.db = null;
  }

  /**
   * Initialize database and create tables
   */
  async init() {
    try {
      this.db = await SQLite.openDatabase({
        name: DB_NAME,
        location: 'default',
        createFromLocation: 0,
      });

      console.log('Database opened successfully');
      await this.createTables();
      return this.db;
    } catch (error) {
      console.error('Database initialization error:', error);
      throw error;
    }
  }

  /**
   * Create all necessary tables
   */
  async createTables() {
    try {
      // Complaints table
      await this.db.executeSql(`
        CREATE TABLE IF NOT EXISTS complaints (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          image TEXT,
          latitude REAL,
          longitude REAL,
          address TEXT,
          description TEXT,
          status TEXT DEFAULT 'Pending',
          priority TEXT DEFAULT 'Low',
          timestamp TEXT,
          sync_status TEXT DEFAULT 'pending',
          server_id TEXT,
          created_at TEXT,
          updated_at TEXT
        );
      `);

      // Sync queue table - tracks what needs to be synced
      await this.db.executeSql(`
        CREATE TABLE IF NOT EXISTS sync_queue (
          id TEXT PRIMARY KEY,
          complaint_id TEXT,
          action TEXT,
          data TEXT,
          retry_count INTEGER DEFAULT 0,
          last_retry_at TEXT,
          status TEXT DEFAULT 'pending',
          created_at TEXT,
          FOREIGN KEY(complaint_id) REFERENCES complaints(id)
        );
      `);

      // Sync history table - for audit trail
      await this.db.executeSql(`
        CREATE TABLE IF NOT EXISTS sync_history (
          id TEXT PRIMARY KEY,
          complaint_id TEXT,
          action TEXT,
          status TEXT,
          response TEXT,
          synced_at TEXT,
          FOREIGN KEY(complaint_id) REFERENCES complaints(id)
        );
      `);

      // Images table - store image metadata
      await this.db.executeSql(`
        CREATE TABLE IF NOT EXISTS images (
          id TEXT PRIMARY KEY,
          complaint_id TEXT,
          file_path TEXT,
          local_uri TEXT,
          base64_data TEXT,
          size INTEGER,
          created_at TEXT,
          FOREIGN KEY(complaint_id) REFERENCES complaints(id)
        );
      `);

      console.log('Database tables created successfully');
    } catch (error) {
      console.error('Error creating tables:', error);
      throw error;
    }
  }

  /**
   * Insert a new complaint
   */
  async insertComplaint(complaint) {
    try {
      const {
        id,
        user_id,
        image,
        latitude,
        longitude,
        address,
        description,
        timestamp,
      } = complaint;

      const query = `
        INSERT INTO complaints 
        (id, user_id, image, latitude, longitude, address, description, timestamp, sync_status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `;

      const now = new Date().toISOString();
      const params = [
        id,
        user_id || 'anonymous',
        image || null,
        latitude,
        longitude,
        address || null,
        description,
        timestamp,
        'pending',
        now,
        now,
      ];

      const result = await this.db.executeSql(query, params);
      console.log('Complaint inserted:', id);

      // Add to sync queue
      await this.addToSyncQueue(id, 'CREATE', complaint);

      return { id, ...complaint, sync_status: 'pending' };
    } catch (error) {
      console.error('Error inserting complaint:', error);
      throw error;
    }
  }

  /**
   * Get all complaints
   */
  async getAllComplaints() {
    try {
      const query = `
        SELECT * FROM complaints ORDER BY created_at DESC;
      `;

      const results = await this.db.executeSql(query);
      return this.formatResults(results);
    } catch (error) {
      console.error('Error fetching complaints:', error);
      return [];
    }
  }

  /**
   * Get pending complaints (not synced)
   */
  async getPendingComplaints() {
    try {
      const query = `
        SELECT * FROM complaints 
        WHERE sync_status = 'pending' 
        ORDER BY created_at DESC;
      `;

      const results = await this.db.executeSql(query);
      return this.formatResults(results);
    } catch (error) {
      console.error('Error fetching pending complaints:', error);
      return [];
    }
  }

  /**
   * Get synced complaints
   */
  async getSyncedComplaints() {
    try {
      const query = `
        SELECT * FROM complaints 
        WHERE sync_status = 'synced' 
        ORDER BY created_at DESC;
      `;

      const results = await this.db.executeSql(query);
      return this.formatResults(results);
    } catch (error) {
      console.error('Error fetching synced complaints:', error);
      return [];
    }
  }

  /**
   * Get complaint by ID
   */
  async getComplaintById(id) {
    try {
      const query = `SELECT * FROM complaints WHERE id = ?;`;
      const results = await this.db.executeSql(query, [id]);

      if (results[0].rows.length > 0) {
        return results[0].rows.item(0);
      }
      return null;
    } catch (error) {
      console.error('Error fetching complaint:', error);
      return null;
    }
  }

  /**
   * Update complaint status
   */
  async updateComplaintStatus(id, status, sync_status = null) {
    try {
      const now = new Date().toISOString();
      let query = `UPDATE complaints SET status = ?, updated_at = ?`;
      const params = [status, now];

      if (sync_status) {
        query += `, sync_status = ?`;
        params.push(sync_status);
      }

      query += ` WHERE id = ?;`;
      params.push(id);

      await this.db.executeSql(query, params);
      console.log('Complaint updated:', id);
    } catch (error) {
      console.error('Error updating complaint:', error);
      throw error;
    }
  }

  /**
   * Mark complaint as synced
   */
  async markAsSynced(id, serverId = null) {
    try {
      const now = new Date().toISOString();
      let query = `
        UPDATE complaints 
        SET sync_status = 'synced', updated_at = ?`;

      const params = [now];

      if (serverId) {
        query += `, server_id = ?`;
        params.push(serverId);
      }

      query += ` WHERE id = ?;`;
      params.push(id);

      await this.db.executeSql(query, params);
      console.log('Complaint marked as synced:', id);

      // Remove from sync queue
      await this.removeFromSyncQueue(id);
    } catch (error) {
      console.error('Error marking complaint as synced:', error);
      throw error;
    }
  }

  /**
   * Delete complaint
   */
  async deleteComplaint(id) {
    try {
      await this.db.executeSql(`DELETE FROM complaints WHERE id = ?;`, [id]);
      await this.db.executeSql(`DELETE FROM images WHERE complaint_id = ?;`, [id]);
      console.log('Complaint deleted:', id);
    } catch (error) {
      console.error('Error deleting complaint:', error);
      throw error;
    }
  }

  /**
   * Add item to sync queue
   */
  async addToSyncQueue(complaintId, action, data) {
    try {
      const id = `${complaintId}_${action}_${Date.now()}`;
      const now = new Date().toISOString();
      const query = `
        INSERT INTO sync_queue 
        (id, complaint_id, action, data, created_at)
        VALUES (?, ?, ?, ?, ?);
      `;

      await this.db.executeSql(query, [
        id,
        complaintId,
        action,
        JSON.stringify(data),
        now,
      ]);

      console.log('Item added to sync queue:', id);
    } catch (error) {
      console.error('Error adding to sync queue:', error);
      throw error;
    }
  }

  /**
   * Get sync queue items
   */
  async getSyncQueue() {
    try {
      const query = `
        SELECT * FROM sync_queue 
        WHERE status = 'pending' 
        AND retry_count < 3
        ORDER BY created_at ASC
        LIMIT 10;
      `;

      const results = await this.db.executeSql(query);
      return this.formatResults(results);
    } catch (error) {
      console.error('Error fetching sync queue:', error);
      return [];
    }
  }

  /**
   * Update sync queue item
   */
  async updateSyncQueueItem(id, status, retryCount = null) {
    try {
      let query = `UPDATE sync_queue SET status = ?`;
      const params = [status];

      if (retryCount !== null) {
        query += `, retry_count = ?, last_retry_at = ?`;
        params.push(retryCount, new Date().toISOString());
      }

      query += ` WHERE id = ?;`;
      params.push(id);

      await this.db.executeSql(query, params);
    } catch (error) {
      console.error('Error updating sync queue item:', error);
      throw error;
    }
  }

  /**
   * Remove from sync queue
   */
  async removeFromSyncQueue(complaintId) {
    try {
      await this.db.executeSql(`
        DELETE FROM sync_queue WHERE complaint_id = ?;
      `, [complaintId]);
    } catch (error) {
      console.error('Error removing from sync queue:', error);
    }
  }

  /**
   * Add to sync history
   */
  async addToSyncHistory(complaintId, action, status, response) {
    try {
      const id = `${complaintId}_${Date.now()}`;
      const query = `
        INSERT INTO sync_history 
        (id, complaint_id, action, status, response, synced_at)
        VALUES (?, ?, ?, ?, ?, ?);
      `;

      await this.db.executeSql(query, [
        id,
        complaintId,
        action,
        status,
        JSON.stringify(response),
        new Date().toISOString(),
      ]);
    } catch (error) {
      console.error('Error adding to sync history:', error);
    }
  }

  /**
   * Get sync history for a complaint
   */
  async getSyncHistory(complaintId, limit = 10) {
    try {
      const query = `
        SELECT * FROM sync_history 
        WHERE complaint_id = ? 
        ORDER BY synced_at DESC 
        LIMIT ?;
      `;

      const results = await this.db.executeSql(query, [complaintId, limit]);
      return this.formatResults(results);
    } catch (error) {
      console.error('Error fetching sync history:', error);
      return [];
    }
  }

  /**
   * Insert image metadata
   */
  async insertImage(complaintId, imagePath, base64Data = null) {
    try {
      const id = `img_${complaintId}_${Date.now()}`;
      const query = `
        INSERT INTO images 
        (id, complaint_id, file_path, base64_data, created_at)
        VALUES (?, ?, ?, ?, ?);
      `;

      await this.db.executeSql(query, [
        id,
        complaintId,
        imagePath,
        base64Data,
        new Date().toISOString(),
      ]);

      return id;
    } catch (error) {
      console.error('Error inserting image:', error);
      throw error;
    }
  }

  /**
   * Get images for a complaint
   */
  async getComplaintImages(complaintId) {
    try {
      const query = `
        SELECT * FROM images 
        WHERE complaint_id = ? 
        ORDER BY created_at DESC;
      `;

      const results = await this.db.executeSql(query, [complaintId]);
      return this.formatResults(results);
    } catch (error) {
      console.error('Error fetching images:', error);
      return [];
    }
  }

  /**
   * Format SQL results into object array
   */
  formatResults(results) {
    const output = [];
    if (results.length > 0) {
      for (let i = 0; i < results[0].rows.length; i++) {
        output.push(results[0].rows.item(i));
      }
    }
    return output;
  }

  /**
   * Close database
   */
  async close() {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }

  /**
   * Clear all data (for testing)
   */
  async clearAll() {
    try {
      await this.db.executeSql('DELETE FROM sync_history;');
      await this.db.executeSql('DELETE FROM sync_queue;');
      await this.db.executeSql('DELETE FROM images;');
      await this.db.executeSql('DELETE FROM complaints;');
      console.log('Database cleared');
    } catch (error) {
      console.error('Error clearing database:', error);
    }
  }
}

// Singleton instance
const database = new Database();

export default database;
