const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'evaluations.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Initializing database...');

db.serialize(() => {
  // Drop table if exists (for fresh start)
  db.run('DROP TABLE IF EXISTS evaluations');
  
  // Create evaluations table
  db.run(`
    CREATE TABLE evaluations (
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
    } else {
      console.log('✅ Evaluations table created successfully');
    }
  });

  // Insert sample data for testing
  const sampleData = [
    {
      id: 'sample-1',
      candidateName: 'John Smith',
      totalExperience: '8+ yrs',
      overallRating: '4/5',
      recommendation: 'Selected',
      interviewDate: '10.03.2026',
      skillsProfile: 'Full Stack Developer',
      technicalStrengths: 'React – 4/5 ; Node.js – 4/5 ; AWS – 3/5 ; Problem solving – 4/5',
      technicalWeaknesses: 'Could improve DevOps knowledge and containerization skills for better deployment practices.',
      originalFileName: 'John_Smith_Evaluation.docx',
      uploadedAt: '2026-03-10T14:30:00.000Z'
    },
    {
      id: 'sample-2',
      candidateName: 'Sarah Wilson',
      totalExperience: '6+ yrs',
      overallRating: '3.5/5',
      recommendation: 'Selected',
      interviewDate: '09.03.2026',
      skillsProfile: 'Data Engineer',
      technicalStrengths: 'Python – 4/5 ; Data Analysis – 4/5 ; SQL – 3/5 ; Machine Learning – 3/5',
      technicalWeaknesses: 'Needs more experience with cloud platforms and big data technologies for senior data engineer role.',
      originalFileName: 'Sarah_Wilson_Evaluation.docx',
      uploadedAt: '2026-03-09T11:15:00.000Z'
    },
    {
      id: 'sample-3',
      candidateName: 'Mike Johnson',
      totalExperience: '5+ yrs',
      overallRating: '2/5',
      recommendation: 'Not Selected',
      interviewDate: '08.03.2026',
      skillsProfile: 'Cloud Support Engineer',
      technicalStrengths: 'Linux – 2/5 ; AWS Services – 2/5 ; Basic troubleshooting – 3/5',
      technicalWeaknesses: 'Needs significant improvement in cloud technologies and advanced troubleshooting skills.',
      originalFileName: 'Mike_Johnson_Evaluation.docx',
      uploadedAt: '2026-03-08T09:00:00.000Z'
    }
  ];

  const stmt = db.prepare(`
    INSERT INTO evaluations (
      id, candidateName, totalExperience, overallRating, recommendation,
      interviewDate, skillsProfile, technicalStrengths, technicalWeaknesses,
      originalFileName, uploadedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  sampleData.forEach(data => {
    stmt.run([
      data.id,
      data.candidateName,
      data.totalExperience,
      data.overallRating,
      data.recommendation,
      data.interviewDate,
      data.skillsProfile,
      data.technicalStrengths,
      data.technicalWeaknesses,
      data.originalFileName,
      data.uploadedAt
    ]);
  });

  stmt.finalize(() => {
    console.log(`✅ Inserted ${sampleData.length} sample evaluations`);
    
    // Verify data
    db.all('SELECT candidateName, recommendation FROM evaluations', (err, rows) => {
      if (err) {
        console.error('❌ Error verifying data:', err);
      } else {
        console.log('📊 Sample data verification:');
        rows.forEach((row, index) => {
          console.log(`${index + 1}. ${row.candidateName}: ${row.recommendation}`);
        });
      }
      
      db.close(() => {
        console.log('✅ Database initialization complete');
      });
    });
  });
});