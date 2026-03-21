const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const mammoth = require('mammoth');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
const corsOptions = {
  origin: NODE_ENV === 'production' 
    ? [
        process.env.FRONTEND_URL, 
        'https://evaluation-dashboard.alpha.vercel.app',
        'https://srs-evaluation-dashboard.vercel.app', 
        /\.vercel\.app$/
      ] 
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      cb(null, true);
    } else {
      cb(new Error('Only .docx files are allowed'));
    }
  }
});

// Initialize SQLite database
const dbPath = path.join(__dirname, 'evaluations.db');
console.log('🔧 Initializing database at:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err);
  } else {
    console.log('✅ Database connection established');
  }
});

// Create evaluations table (non-blocking)
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
  } else {
    console.log('✅ Evaluations table ready');
  }
});

// Parse evaluation data from Word document text
function parseEvaluationData(text) {
  console.log('🔍 Starting to parse evaluation data...');
  console.log('📄 Document text length:', text.length);
  
  // Log a sample of the text around the recommendation section
  const recommendationMatch = text.match(/recommendation[\s\S]{0,200}/i);
  if (recommendationMatch) {
    console.log('📋 Recommendation section text:', recommendationMatch[0]);
  }
  
  const evaluation = {
    id: uuidv4(),
    candidateName: '',
    totalExperience: '',
    overallRating: '',
    recommendation: '',
    interviewDate: '',
    skillsProfile: '',
    technicalStrengths: '',
    technicalWeaknesses: '',
    uploadedAt: new Date().toISOString()
  };

  // Extract Name of Candidate
  const namePatterns = [
    /Name\s*of\s*Candidate[\s:]*([A-Za-z\s]+?)(?:\n|Total\s*Experience)/i,
    /Candidate[\s:]*([A-Za-z\s]+?)(?:\n|Total\s*Experience)/i
  ];
  
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      evaluation.candidateName = match[1].trim();
      console.log('✅ Found candidate name:', evaluation.candidateName);
      break;
    }
  }

  // Extract Total Experience
  const experiencePatterns = [
    /Total\s*Experience[\s:]*([0-9]+\+?\s*yrs?)/i,
    /Experience[\s:]*([0-9]+\+?\s*yrs?)/i
  ];
  
  for (const pattern of experiencePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      evaluation.totalExperience = match[1].trim();
      console.log('✅ Found total experience:', evaluation.totalExperience);
      break;
    }
  }

  // Extract Overall Rating
  const ratingPatterns = [
    /Overall\s*Rating\s*\(L1\)[\s:]*([0-9\.\/]+)/i,
    /Overall\s*Rating[\s:]*([0-9\.\/]+)/i,
    /Rating[\s:]*([0-9\.\/]+)/i
  ];
  
  for (const pattern of ratingPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      evaluation.overallRating = match[1].trim();
      console.log('✅ Found overall rating:', evaluation.overallRating);
      break;
    }
  }

  // Extract Recommendation - handle Word document table format properly
  console.log('🔍 Looking for Recommendation field...');
  
  // Pattern to match "Recommendation:" followed by the value in table format
  const recommendationPatterns = [
    // Pattern 1: "Recommendation:" followed by value (handles table cells)
    /Recommendation[\s:]*([A-Za-z\s]+?)(?=\s*(?:\n|$|Comments|Interview\s*Date|Grade))/i,
    // Pattern 2: Look for recommendation in table row format
    /Recommendation[\s\S]{0,20}?(Selected|Not\s*Selected)/i,
    // Pattern 3: Direct match after colon
    /Recommendation\s*:\s*([A-Za-z\s]+)/i
  ];
  
  let recommendationFound = false;
  
  for (const pattern of recommendationPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let recommendation = match[1].trim();
      
      // Clean up the recommendation text
      recommendation = recommendation.replace(/\s+/g, ' '); // Normalize spaces
      recommendation = recommendation.replace(/[^\w\s]/g, '').trim(); // Remove special chars
      
      console.log('🔍 Raw recommendation found:', `"${recommendation}"`);
      
      // Validate and normalize the recommendation
      const lowerRec = recommendation.toLowerCase();
      if (lowerRec === 'selected') {
        evaluation.recommendation = 'Selected';
        console.log('✅ Found recommendation: Selected');
        recommendationFound = true;
        break;
      } else if (lowerRec === 'not selected' || lowerRec.includes('not') && lowerRec.includes('selected')) {
        evaluation.recommendation = 'Not Selected';
        console.log('✅ Found recommendation: Not Selected');
        recommendationFound = true;
        break;
      } else if (['hire', 'recommend'].includes(lowerRec)) {
        evaluation.recommendation = 'Selected';
        console.log('✅ Found recommendation (converted to Selected):', recommendation);
        recommendationFound = true;
        break;
      } else if (['not hire', 'not recommend'].includes(lowerRec)) {
        evaluation.recommendation = 'Not Selected';
        console.log('✅ Found recommendation (converted to Not Selected):', recommendation);
        recommendationFound = true;
        break;
      } else {
        console.log('⚠️ Unrecognized recommendation format:', `"${recommendation}"`);
      }
    }
  }
  
  // Default to Not Selected if nothing found
  if (!recommendationFound) {
    evaluation.recommendation = 'Not Selected';
    console.log('⚠️ No recommendation found, defaulting to: Not Selected');
  }

  // Extract Interview Date
  console.log('🔍 Looking for Interview Date field...');
  
  const datePatterns = [
    // Pattern 1: "Interview Date:" followed by date
    /Interview\s*Date[\s:]*([0-9._\/\-]+)/i,
    // Pattern 2: Just "Date:" followed by date
    /Date[\s:]*([0-9._\/\-]+)/i,
    // Pattern 3: Date pattern anywhere in the document (DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY)
    /(\d{1,2}[._\/\-]\d{1,2}[._\/\-]\d{4})/g
  ];
  
  let dateFound = false;
  
  for (const pattern of datePatterns) {
    if (pattern.global) {
      // For global patterns, find all matches and pick the most likely interview date
      const matches = [...text.matchAll(pattern)];
      console.log('🔍 Found date matches:', matches.map(m => m[1]));
      
      for (const match of matches) {
        if (match && match[1]) {
          const dateStr = match[1].trim().replace(/_/g, '');
          // Validate it's a reasonable date (not too far in past/future)
          const dateParts = dateStr.split(/[._\/\-]/);
          if (dateParts.length === 3) {
            const day = parseInt(dateParts[0]);
            const month = parseInt(dateParts[1]);
            const year = parseInt(dateParts[2]);
            
            // Basic validation
            if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2020 && year <= 2030) {
              evaluation.interviewDate = dateStr;
              console.log('✅ Found valid interview date:', evaluation.interviewDate);
              dateFound = true;
              break;
            }
          }
        }
      }
    } else {
      const match = text.match(pattern);
      if (match && match[1]) {
        const dateStr = match[1].trim().replace(/_/g, '');
        evaluation.interviewDate = dateStr;
        console.log('✅ Found interview date:', evaluation.interviewDate);
        dateFound = true;
        break;
      }
    }
    
    if (dateFound) break;
  }

  // Extract Skills Profile
  const skillsProfilePatterns = [
    /Skills\s*[–-]\s*Technical\s*\\\s*Functional[\s:]*([A-Za-z\s]+?)(?:\n|$)/i,
    /(Cloud\s*Support\s*Engineer|Software\s*Engineer|Data\s*Engineer|DevOps\s*Engineer|Support\s*Engineer)/i
  ];
  
  for (const pattern of skillsProfilePatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].trim().length > 2) {
      evaluation.skillsProfile = match[1].trim();
      console.log('✅ Found skills profile:', evaluation.skillsProfile);
      break;
    }
  }

  // Extract Technical Skills Strengths
  const strengthsPatterns = [
    /Technical\s*Skills\s*Strengths[\s:]*([^]+?)(?:Technical\s*Weaknesses|$)/i,
    /Strengths[\s:]*([^]+?)(?:Weaknesses|Areas\s*of\s*Improvement|$)/i
  ];
  
  for (const pattern of strengthsPatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].trim().length > 10) {
      let strengths = match[1].trim();
      // Only remove the "Kindly rate candidate" line that's common to all
      strengths = strengths.replace(/Kindly rate candidate basis the JD published.*?with detailed comments\.?/gi, '');
      strengths = strengths.trim();
      
      if (strengths.length > 10) {
        evaluation.technicalStrengths = strengths;
        console.log('✅ Found technical strengths');
      }
      break;
    }
  }

  // Extract Technical Weaknesses
  const weaknessPatterns = [
    /Technical\s*Weaknesses\s*\/?\s*Areas\s*of\s*Improvement[\s:]*([^]+?)(?:\n\n|$)/i,
    /Weaknesses[\s:]*([^]+?)(?:\n\n|$)/i,
    /Areas\s*of\s*Improvement[\s:]*([^]+?)(?:\n\n|$)/i
  ];
  
  for (const pattern of weaknessPatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].trim().length > 10) {
      evaluation.technicalWeaknesses = match[1].trim();
      console.log('✅ Found technical weaknesses');
      break;
    }
  }

  // Set defaults
  if (!evaluation.candidateName) evaluation.candidateName = 'Unknown Candidate';
  if (!evaluation.totalExperience) evaluation.totalExperience = 'Not Specified';
  if (!evaluation.overallRating) evaluation.overallRating = 'Not Rated';
  if (!evaluation.recommendation) evaluation.recommendation = 'Not Selected';
  if (!evaluation.interviewDate) {
    evaluation.interviewDate = 'Not Specified';
    console.log('⚠️ No interview date found, setting to: Not Specified');
  }
  if (!evaluation.skillsProfile) evaluation.skillsProfile = 'General';

  console.log('📊 Parsed evaluation:', {
    candidateName: evaluation.candidateName,
    recommendation: evaluation.recommendation,
    overallRating: evaluation.overallRating
  });

  return evaluation;
}

// API Routes

// Get all evaluations
app.get('/api/evaluations', (req, res) => {
  db.all('SELECT * FROM evaluations ORDER BY uploadedAt DESC', (err, rows) => {
    if (err) {
      console.error('Error fetching evaluations:', err);
      return res.status(500).json({ error: 'Failed to fetch evaluations' });
    }
    res.json(rows);
  });
});

// Get single evaluation
app.get('/api/evaluations/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM evaluations WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error('Error fetching evaluation:', err);
      return res.status(500).json({ error: 'Failed to fetch evaluation' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }
    res.json(row);
  });
});

// Upload and process Word document
app.post('/api/evaluations/upload', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('📄 Processing uploaded file:', req.file.originalname);

    // Extract text from Word document
    const result = await mammoth.extractRawText({ path: req.file.path });
    const text = result.value;

    // Parse evaluation data
    const evaluation = parseEvaluationData(text);
    evaluation.originalFileName = req.file.originalname;

    // Check for duplicate candidate
    console.log('🔍 Checking for duplicate candidate:', evaluation.candidateName);
    
    // Use sqlite3 callback syntax for checking duplicates
    const checkDuplicateQuery = 'SELECT id, candidateName, originalFileName, uploadedAt FROM evaluations WHERE LOWER(candidateName) = LOWER(?)';
    
    const existingCandidate = await new Promise((resolve, reject) => {
      db.get(checkDuplicateQuery, [evaluation.candidateName], (err, row) => {
        if (err) {
          console.error('Error checking for duplicate:', err);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
    
    if (existingCandidate) {
      console.log('⚠️ Duplicate candidate found:', existingCandidate);
      
      // Clean up uploaded file since we're not processing it
      try {
        fs.unlinkSync(req.file.path);
        console.log('🗑️ Cleaned up duplicate file:', req.file.originalname);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
      
      return res.status(409).json({ 
        error: 'Duplicate candidate evaluation',
        message: `Evaluation for candidate "${evaluation.candidateName}" already exists.`,
        existingEvaluation: {
          candidateName: existingCandidate.candidateName,
          originalFileName: existingCandidate.originalFileName,
          uploadedAt: existingCandidate.uploadedAt
        }
      });
    }

    // Insert into database using sqlite3 syntax
    const insertQuery = `
      INSERT INTO evaluations (
        id, candidateName, totalExperience, overallRating, recommendation,
        interviewDate, skillsProfile, technicalStrengths, technicalWeaknesses,
        originalFileName, uploadedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(insertQuery, [
      evaluation.id,
      evaluation.candidateName,
      evaluation.totalExperience,
      evaluation.overallRating,
      evaluation.recommendation,
      evaluation.interviewDate,
      evaluation.skillsProfile,
      evaluation.technicalStrengths,
      evaluation.technicalWeaknesses,
      evaluation.originalFileName,
      evaluation.uploadedAt
    ], function(err) {
      if (err) {
        console.error('Error inserting evaluation:', err);
        return res.status(500).json({ error: 'Failed to save evaluation' });
      }

      console.log('✅ Evaluation saved successfully:', evaluation.candidateName);
      
      // Clean up uploaded file
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting uploaded file:', err);
      });
      
      res.json({
        message: 'Evaluation processed and saved successfully',
        evaluation: evaluation
      });
    });

  } catch (error) {
    console.error('Error processing upload:', error);
    res.status(500).json({ error: 'Failed to process document' });
  }
});

// Delete evaluation
app.delete('/api/evaluations/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM evaluations WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Error deleting evaluation:', err);
      return res.status(500).json({ error: 'Failed to delete evaluation' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }
    res.json({ message: 'Evaluation deleted successfully' });
  });
});

// Get statistics
app.get('/api/stats', (req, res) => {
  const stats = {};
  
  // Get total count
  db.get('SELECT COUNT(*) as total FROM evaluations', (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch statistics' });
    }
    
    stats.totalEvaluations = row.total;
    
    // Get selected count
    db.get(`SELECT COUNT(*) as selected FROM evaluations 
            WHERE recommendation = 'Selected' OR recommendation = 'Hire'`, (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch statistics' });
      }
      
      stats.selectedCandidates = row.selected;
      
      // Get profile distribution
      db.all(`SELECT skillsProfile, COUNT(*) as count 
              FROM evaluations 
              GROUP BY skillsProfile 
              ORDER BY count DESC`, (err, rows) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to fetch statistics' });
        }
        
        stats.profileDistribution = rows;
        res.json(stats);
      });
    });
  });
});

// Serve static files in production (for full-stack deployment)
if (NODE_ENV === 'production') {
  // Serve frontend build files
  const frontendPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(frontendPath));
  
  // Catch-all handler for React Router
  app.get('*', (req, res) => {
    // Skip API routes
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'SRS Infoway Evaluation Dashboard API',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    database: fs.existsSync(dbPath) ? 'Connected' : 'Not Found'
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Evaluation Dashboard API running on port ${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`📊 Database: ${dbPath}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`✅ Server startup complete - ready to accept connections`);
});

// Handle server startup errors
server.on('error', (err) => {
  console.error('❌ Server startup error:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🔄 Shutting down gracefully...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('✅ Database connection closed');
    }
    process.exit(0);
  });
});