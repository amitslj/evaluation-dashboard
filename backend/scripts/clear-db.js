const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'evaluations.db');
const db = new sqlite3.Database(dbPath);

console.log('🗑️ Clearing all data from database...');

db.serialize(() => {
  // Clear all data from evaluations table
  db.run('DELETE FROM evaluations', function(err) {
    if (err) {
      console.error('❌ Error clearing data:', err);
    } else {
      console.log(`✅ Cleared ${this.changes} records from evaluations table`);
    }
    
    // Verify table is empty
    db.get('SELECT COUNT(*) as count FROM evaluations', (err, row) => {
      if (err) {
        console.error('❌ Error verifying data:', err);
      } else {
        console.log(`📊 Total records remaining: ${row.count}`);
        if (row.count === 0) {
          console.log('✅ Database is now empty and ready for real data');
        }
      }
      
      db.close(() => {
        console.log('✅ Database cleared successfully');
      });
    });
  });
});