import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import mammoth from 'mammoth';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
await fs.ensureDir(uploadsDir);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      cb(null, true);
    } else {
      cb(new Error('Only .docx files are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// In-memory storage for evaluations (in production, use a database)
let evaluations = [];

// Add some sample data for demonstration
function addSampleData() {
  const sampleEvaluations = [
    {
      id: 'sample-1',
      candidateName: 'John Doe',
      position: 'Senior Developer',
      interviewer: 'Jane Smith',
      date: '2026-03-10',
      scores: { technical: 8, communication: 7, problemSolving: 9, experience: 8, culturalFit: 7 },
      overallRating: 8,
      comments: 'Strong technical skills with good problem-solving abilities.',
      recommendation: 'Hire',
      uploadedAt: '2026-03-10T10:00:00.000Z'
    },
    {
      id: 'sample-2',
      candidateName: 'Alice Johnson',
      position: 'Frontend Developer',
      interviewer: 'Bob Wilson',
      date: '2026-03-09',
      scores: { technical: 9, communication: 8, problemSolving: 8, experience: 7, culturalFit: 9 },
      overallRating: 8,
      comments: 'Excellent frontend skills and great team fit.',
      recommendation: 'Hire',
      uploadedAt: '2026-03-09T14:30:00.000Z'
    },
    {
      id: 'sample-3',
      candidateName: 'Mike Brown',
      position: 'Backend Developer',
      interviewer: 'Sarah Davis',
      date: '2026-03-08',
      scores: { technical: 6, communication: 6, problemSolving: 7, experience: 6, culturalFit: 6 },
      overallRating: 6,
      comments: 'Adequate skills but needs more experience.',
      recommendation: 'Maybe',
      uploadedAt: '2026-03-08T11:15:00.000Z'
    }
  ];
  
  evaluations.push(...sampleEvaluations);
  console.log('📊 Added sample evaluation data');
}

// Add sample data on startup
addSampleData();

// Helper function to extract evaluation data from document text
function parseEvaluationData(text) {
  console.log('📄 Parsing document text:', text.substring(0, 200) + '...');
  
  const evaluation = {
    id: uuidv4(),
    candidateName: '',
    position: '',
    interviewer: '',
    date: new Date().toISOString().split('T')[0],
    scores: {},
    overallRating: 0,
    comments: '',
    recommendation: '',
    uploadedAt: new Date().toISOString()
  };

  // More flexible patterns for candidate name extraction
  const namePatterns = [
    /(?:candidate\s*name|name|candidate)[\s:]*([A-Za-z\s.]+?)(?:\n|$|interviewer|position|role)/i,
    /^([A-Za-z\s.]+?)(?:\s*-|\s*\n|\s*position|\s*role)/m,
    /evaluation.*?(?:for|of)[\s:]*([A-Za-z\s.]+)/i
  ];
  
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1].trim().length > 2) {
      evaluation.candidateName = match[1].trim().replace(/[^\w\s.]/g, '');
      console.log('✅ Found candidate name:', evaluation.candidateName);
      break;
    }
  }

  // More flexible position extraction
  const positionPatterns = [
    /(?:position|role|job\s*title|designation)[\s:]*([A-Za-z\s]+?)(?:\n|interviewer|technical|communication)/i,
    /(?:applying\s*for|role\s*of)[\s:]*([A-Za-z\s]+)/i,
    /(developer|engineer|analyst|manager|consultant|lead|senior|junior)[\s\w]*/i
  ];
  
  for (const pattern of positionPatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].trim().length > 2) {
      evaluation.position = match[1].trim().replace(/[^\w\s]/g, '');
      console.log('✅ Found position:', evaluation.position);
      break;
    }
  }

  // More flexible interviewer extraction
  const interviewerPatterns = [
    /(?:interviewer|conducted\s*by|evaluated\s*by|assessor)[\s:]*([A-Za-z\s.]+?)(?:\n|$|date|technical)/i,
    /(?:by|interviewer)[\s:]*([A-Za-z\s.]+)/i
  ];
  
  for (const pattern of interviewerPatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].trim().length > 2) {
      evaluation.interviewer = match[1].trim().replace(/[^\w\s.]/g, '');
      console.log('✅ Found interviewer:', evaluation.interviewer);
      break;
    }
  }

  // Enhanced score extraction with more flexible patterns
  const scorePatterns = [
    { name: 'technical', patterns: [
      /technical[\s\w]*[\s:]*(\d+)(?:\/10|\/5|\s*out\s*of\s*10)?/i,
      /programming[\s:]*(\d+)/i,
      /coding[\s:]*(\d+)/i
    ]},
    { name: 'communication', patterns: [
      /communication[\s:]*(\d+)(?:\/10|\/5|\s*out\s*of\s*10)?/i,
      /verbal[\s:]*(\d+)/i,
      /speaking[\s:]*(\d+)/i
    ]},
    { name: 'problemSolving', patterns: [
      /problem[\s\w]*solving[\s:]*(\d+)(?:\/10|\/5|\s*out\s*of\s*10)?/i,
      /analytical[\s:]*(\d+)/i,
      /logic[\s:]*(\d+)/i
    ]},
    { name: 'experience', patterns: [
      /experience[\s:]*(\d+)(?:\/10|\/5|\s*out\s*of\s*10)?/i,
      /background[\s:]*(\d+)/i,
      /expertise[\s:]*(\d+)/i
    ]},
    { name: 'culturalFit', patterns: [
      /cultural[\s\w]*fit[\s:]*(\d+)(?:\/10|\/5|\s*out\s*of\s*10)?/i,
      /team[\s\w]*fit[\s:]*(\d+)/i,
      /attitude[\s:]*(\d+)/i
    ]}
  ];
  
  scorePatterns.forEach(({ name, patterns }) => {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        let score = parseInt(match[1]);
        // Convert 5-point scale to 10-point scale
        if (score <= 5 && text.includes('/5')) {
          score = score * 2;
        }
        evaluation.scores[name] = Math.min(score, 10); // Cap at 10
        console.log(`✅ Found ${name} score:`, evaluation.scores[name]);
        break;
      }
    }
  });

  // Calculate overall rating as average of scores
  const scores = Object.values(evaluation.scores);
  if (scores.length > 0) {
    evaluation.overallRating = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    console.log('✅ Calculated overall rating:', evaluation.overallRating);
  } else {
    // Try to find overall rating directly
    const overallMatch = text.match(/(?:overall|total|final)[\s\w]*(?:rating|score)[\s:]*(\d+)(?:\/10)?/i);
    if (overallMatch) {
      evaluation.overallRating = parseInt(overallMatch[1]);
      console.log('✅ Found direct overall rating:', evaluation.overallRating);
    }
  }

  // Enhanced recommendation extraction
  const recommendationPatterns = [
    /(?:recommendation|decision|conclusion)[\s:]*([A-Za-z\s]+?)(?:\n|$|comments|notes)/i,
    /(?:hire|reject|recommend|not\s*recommend|proceed|do\s*not\s*proceed)/i,
    /(?:selected|not\s*selected|approved|rejected)/i
  ];
  
  for (const pattern of recommendationPatterns) {
    const match = text.match(pattern);
    if (match) {
      evaluation.recommendation = match[1] ? match[1].trim() : match[0];
      console.log('✅ Found recommendation:', evaluation.recommendation);
      break;
    }
  }

  // Enhanced comments extraction
  const commentPatterns = [
    /(?:comments|notes|feedback|remarks)[\s:]*([^]+?)(?:\n\n|\n(?:[A-Z]|$))/i,
    /(?:additional\s*notes|observations)[\s:]*([^]+?)(?:\n\n|$)/i
  ];
  
  for (const pattern of commentPatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].trim().length > 10) {
      evaluation.comments = match[1].trim().substring(0, 500); // Limit length
      console.log('✅ Found comments:', evaluation.comments.substring(0, 100) + '...');
      break;
    }
  }

  // If no comments found, use the last substantial paragraph
  if (!evaluation.comments) {
    const paragraphs = text.split('\n').filter(p => p.trim().length > 20);
    if (paragraphs.length > 0) {
      evaluation.comments = paragraphs[paragraphs.length - 1].trim().substring(0, 500);
    }
  }

  // Set default values if nothing was found
  if (!evaluation.candidateName) evaluation.candidateName = 'Unknown Candidate';
  if (!evaluation.position) evaluation.position = 'Not Specified';
  if (!evaluation.interviewer) evaluation.interviewer = 'Unknown Interviewer';
  if (!evaluation.recommendation) evaluation.recommendation = 'Under Review';

  console.log('📊 Final parsed evaluation:', {
    name: evaluation.candidateName,
    position: evaluation.position,
    interviewer: evaluation.interviewer,
    scores: evaluation.scores,
    overallRating: evaluation.overallRating,
    recommendation: evaluation.recommendation
  });

  return evaluation;
}

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'SRS Evaluation Dashboard API is running' });
});

// Upload and process evaluation document
app.post('/api/upload-evaluation', upload.single('document'), async (req, res) => {
  try {
    console.log('📤 File upload request received');
    
    if (!req.file) {
      console.log('❌ No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('📁 File details:', {
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    const filePath = req.file.path;
    
    // Extract text from Word document
    console.log('📄 Extracting text from Word document...');
    const result = await mammoth.extractRawText({ path: filePath });
    const documentText = result.value;
    
    console.log('📝 Extracted text length:', documentText.length);
    console.log('📝 First 300 characters:', documentText.substring(0, 300));

    if (!documentText || documentText.trim().length < 50) {
      console.log('❌ Document appears to be empty or too short');
      await fs.remove(filePath);
      return res.status(400).json({ 
        error: 'Document appears to be empty or contains insufficient text for parsing' 
      });
    }

    // Parse evaluation data
    console.log('🔍 Parsing evaluation data...');
    const evaluationData = parseEvaluationData(documentText);
    
    // Store evaluation
    evaluations.push(evaluationData);
    console.log('💾 Stored evaluation. Total evaluations:', evaluations.length);

    // Clean up uploaded file
    await fs.remove(filePath);
    console.log('🗑️ Cleaned up uploaded file');

    res.json({
      success: true,
      message: 'Evaluation processed successfully',
      evaluation: evaluationData,
      debug: {
        textLength: documentText.length,
        extractedFields: {
          candidateName: !!evaluationData.candidateName,
          position: !!evaluationData.position,
          interviewer: !!evaluationData.interviewer,
          scoresFound: Object.keys(evaluationData.scores).length,
          overallRating: evaluationData.overallRating,
          recommendation: !!evaluationData.recommendation
        }
      }
    });

  } catch (error) {
    console.error('❌ Error processing evaluation:', error);
    
    // Clean up file if it exists
    if (req.file && req.file.path) {
      try {
        await fs.remove(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }
    
    res.status(500).json({ 
      error: 'Failed to process evaluation document',
      details: error.message 
    });
  }
});

// Get all evaluations
app.get('/api/evaluations', (req, res) => {
  res.json(evaluations);
});

// Get evaluation by ID
app.get('/api/evaluations/:id', (req, res) => {
  const evaluation = evaluations.find(e => e.id === req.params.id);
  if (!evaluation) {
    return res.status(404).json({ error: 'Evaluation not found' });
  }
  res.json(evaluation);
});

// Get dashboard statistics with optional date range
app.get('/api/dashboard-stats', (req, res) => {
  const { dateRange } = req.query;
  let filteredEvaluations = evaluations;
  
  if (dateRange && dateRange !== 'all') {
    const now = new Date();
    const filterDate = new Date();
    
    switch (dateRange) {
      case '7days':
        filterDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        filterDate.setDate(now.getDate() - 30);
        break;
      case '90days':
        filterDate.setDate(now.getDate() - 90);
        break;
      case '1year':
        filterDate.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    filteredEvaluations = evaluations.filter(e => new Date(e.uploadedAt) >= filterDate);
  }
  const stats = {
    totalEvaluations: filteredEvaluations.length,
    averageRating: filteredEvaluations.length > 0 
      ? Math.round(filteredEvaluations.reduce((sum, e) => sum + e.overallRating, 0) / filteredEvaluations.length * 10) / 10
      : 0,
    recommendedCandidates: filteredEvaluations.filter(e => 
      e.recommendation.toLowerCase().includes('hire') || 
      e.recommendation.toLowerCase().includes('recommend') ||
      e.overallRating >= 7
    ).length,
    evaluationsByMonth: getEvaluationsByMonth(filteredEvaluations),
    scoreDistribution: getScoreDistribution(filteredEvaluations),
    topPerformers: getTopPerformers(filteredEvaluations)
  };
  
  res.json(stats);
});

// Helper functions for statistics
function getEvaluationsByMonth(evals = evaluations) {
  const monthCounts = {};
  evals.forEach(e => {
    const month = new Date(e.uploadedAt).toISOString().slice(0, 7); // YYYY-MM
    monthCounts[month] = (monthCounts[month] || 0) + 1;
  });
  
  return Object.entries(monthCounts).map(([month, count]) => ({
    month,
    count
  })).sort((a, b) => a.month.localeCompare(b.month));
}

function getScoreDistribution(evals = evaluations) {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };
  
  evals.forEach(e => {
    if (e.overallRating > 0) {
      distribution[e.overallRating] = (distribution[e.overallRating] || 0) + 1;
    }
  });
  
  return Object.entries(distribution).map(([score, count]) => ({
    score: parseInt(score),
    count
  }));
}

function getTopPerformers(evals = evaluations) {
  return evals
    .filter(e => e.overallRating >= 8)
    .sort((a, b) => b.overallRating - a.overallRating)
    .slice(0, 5)
    .map(e => ({
      name: e.candidateName,
      position: e.position,
      rating: e.overallRating,
      date: e.date
    }));
}

// Delete evaluation
app.delete('/api/evaluations/:id', (req, res) => {
  const index = evaluations.findIndex(e => e.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Evaluation not found' });
  }
  
  evaluations.splice(index, 1);
  res.json({ success: true, message: 'Evaluation deleted successfully' });
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
  }
  
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 SRS Evaluation Dashboard API running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
});