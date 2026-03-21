const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'evaluations.db');

console.log('🔄 Resetting database...');

try {
  // Delete the database file if it exists
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('🗑️ Deleted existing database file');
  }

  // Create new database
  const db = new Database(dbPath);
  
  // Create evaluations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS evaluations (
      id TEXT PRIMARY KEY,
      candidateName TEXT NOT NULL,
      totalExperience TEXT,
      overallRating TEXT,
      recommendation TEXT,
      interviewDate TEXT,
      skillsProfile TEXT,
      technicalStrengths TEXT,
      technicalWeaknesses TEXT,
      originalFileName TEXT,
      uploadedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      createdBy TEXT DEFAULT 'system'
    )
  `);

  console.log('✅ Created new database with fresh schema');
  
  db.close();
  
  console.log('📊 Database reset complete!');
  console.log('🔗 You can now upload new evaluation documents');
  
} catch (error) {
  console.error('❌ Error resetting database:', error.message);
  process.exit(1);
}