const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'evaluations.db');
console.log('🔧 Initializing database at:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err);
    process.exit(1);
  } else {
    console.log('✅ Database connection established');
  }
});

db.serialize(() => {
  // Create evaluations table
  db.run(`
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
  `, (err) => {
    if (err) {
      console.error('❌ Error creating table:', err);
      process.exit(1);
    } else {
      console.log('✅ Evaluations table ready');
    }
    
    db.close(() => {
      console.log('✅ Database initialization complete');
      process.exit(0);
    });
  });
});