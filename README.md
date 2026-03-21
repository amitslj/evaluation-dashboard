# SRS Infoway - Evaluation Dashboard

A comprehensive web application for managing and analyzing candidate evaluation results from Word documents (.docx). Built with React frontend and Node.js backend with SQLite database.

## 🚀 Features

- **Document Upload**: Upload multiple Word documents (.docx) containing candidate evaluations
- **Duplicate Detection**: Prevents duplicate candidate entries with intelligent name matching
- **Data Extraction**: Automatically extracts key information from evaluation documents:
  - Candidate Name
  - Total Experience
  - Overall Rating (L1)
  - Recommendation (Selected/Not Selected)
  - Interview Date
  - Skills Profile
  - Technical Strengths
  - Technical Weaknesses

- **Analytics Dashboard**: 
  - Daily interview trends
  - Interview vs selection statistics
  - Profile-based filtering
  - Date range filtering (customizable)
  - Interactive charts and graphs

- **Data Management**: 
  - View all evaluations
  - Filter by recommendation status
  - Detailed candidate profiles
  - Export capabilities

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **npm** (v8 or higher)
- **Git** (for version control)

## 🛠️ Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd evaluation-dashboard
```

### 2. Install Dependencies

**Backend Setup:**
```bash
cd backend
npm install
```

**Frontend Setup:**
```bash
cd ../frontend
npm install
```

### 3. Initialize Database
```bash
cd ../backend
npm run init-db
```

### 4. Start the Application

**Option A: Using the Batch Script (Windows)**
```bash
# From the root directory
start-servers.bat
```

**Option B: Manual Start**

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 5. Access the Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## 📁 Project Structure

```
evaluation-dashboard/
├── backend/                    # Node.js Express server
│   ├── scripts/               # Database management scripts
│   │   ├── init-db.js        # Initialize database with sample data
│   │   └── clear-db.js       # Clear all database records
│   ├── uploads/              # Temporary file storage
│   ├── server.js             # Main server file
│   ├── evaluations.db        # SQLite database
│   └── package.json
├── frontend/                  # React application
│   ├── src/
│   │   ├── components/       # React components
│   │   │   └── Dashboard.tsx # Main dashboard component
│   │   └── services/         # API services
│   │       └── evaluationAPI.ts # Backend API integration
│   ├── public/               # Static assets
│   └── package.json
├── start-servers.bat         # Windows batch script to start both servers
├── requirements.txt          # Project requirements documentation
└── README.md                # This file
```

## 🗄️ Database Management

### Database Schema
```sql
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
);
```

### Available Database Commands

**Initialize Database with Sample Data:**
```bash
cd backend
npm run init-db
```

**Clear All Database Records:**
```bash
cd backend
npm run clear-db
```

**Manual Database Access:**
```bash
cd backend
sqlite3 evaluations.db
```

**Common SQL Queries:**
```sql
-- View all evaluations
SELECT * FROM evaluations;

-- Count total evaluations
SELECT COUNT(*) FROM evaluations;

-- View selected candidates only
SELECT candidateName, recommendation, interviewDate 
FROM evaluations 
WHERE recommendation = 'Selected';

-- Delete specific candidate
DELETE FROM evaluations WHERE candidateName = 'Candidate Name';

-- View evaluation statistics
SELECT 
  recommendation,
  COUNT(*) as count 
FROM evaluations 
GROUP BY recommendation;
```

## 📄 Document Format Requirements

The system expects Word documents (.docx) with the following format:

### Required Fields:
- **Candidate Name**: Should be clearly mentioned in the document
- **Overall Rating (L1)**: Format like "3.5/5" or "3.5 out of 5"
- **Recommendation**: "Selected", "Not Selected", "Hire", "Not Hire"
- **Interview Date**: Format like "11.03.2026", "11/03/2026", or "11-03-2026"

### Optional Fields:
- **Total Experience**: e.g., "5+ years", "3 years"
- **Skills Profile**: e.g., "Software Engineer", "DevOps Engineer"
- **Technical Strengths**: Detailed feedback
- **Technical Weaknesses**: Areas of improvement

### Sample Document Structure:
```
Candidate Name: John Doe
Total Experience: 5+ years
Overall Rating (L1): 3.5/5
Recommendation: Selected
Interview Date: 11.03.2026
Skills – Technical \ Functional: Software Engineer

Technical Strengths:
- Strong programming skills
- Good understanding of cloud services

Areas of Improvement:
- Needs more experience with microservices
```

## 🔧 API Endpoints

### Evaluations
- `GET /api/evaluations` - Get all evaluations
- `POST /api/evaluations/upload` - Upload evaluation document
- `DELETE /api/evaluations/:id` - Delete evaluation
- `GET /api/stats` - Get dashboard statistics

### System
- `GET /health` - Health check endpoint

## 🚨 Troubleshooting

### Common Issues:

**1. Port Already in Use**
```bash
# Kill processes on ports 3001 and 5173
netstat -ano | findstr :3001
taskkill /PID <process_id> /F

netstat -ano | findstr :5173
taskkill /PID <process_id> /F
```

**2. Database Issues**
```bash
# Reset database
cd backend
npm run clear-db
npm run init-db
```

**3. File Upload Issues**
- Ensure files are in .docx format
- Check file size (should be reasonable)
- Verify document contains required fields

**4. Duplicate Detection**
- System prevents duplicate candidates based on name matching
- Case-insensitive comparison
- Shows warning message for duplicates

### Logs and Debugging:
- Backend logs: Check terminal running `npm run dev` in backend folder
- Frontend logs: Open browser developer tools (F12)
- Database queries: Enable SQL logging in server.js if needed

## 🔄 Development Workflow

### Making Changes:
1. **Backend changes**: Server auto-restarts with nodemon
2. **Frontend changes**: Hot reload enabled with Vite
3. **Database changes**: Run migration scripts in backend/scripts/

### Testing:
1. Upload sample Word documents
2. Verify data extraction accuracy
3. Test duplicate detection
4. Check analytics calculations
5. Validate filtering functionality

## 📊 Analytics Features

### Dashboard Widgets:
- **Total Evaluations**: Click to view all candidates
- **Selected Candidates**: Click to view selected candidates only
- **Today's Interviews**: Daily interview count
- **Profile Types**: Distribution by skills profile

### Charts:
- **Daily Interview Trends**: Shows interview volume over time
- **Interview vs Selection**: Compares interviewed vs selected candidates
- **Customizable Date Ranges**: 7 days, 30 days, 90 days, or custom

### Filtering Options:
- **Date Range**: Filter by interview date
- **Profile**: Filter by skills/technical profile
- **Recommendation Status**: Selected/Not Selected

## 🔒 Security Notes

- Files are temporarily stored in backend/uploads/ and cleaned up after processing
- Database uses SQLite for local development
- No authentication implemented (suitable for internal use)
- Input validation on file types and content

## 🚀 Production Deployment

For production deployment:
1. Use environment variables for configuration
2. Implement proper authentication
3. Use production database (PostgreSQL/MySQL)
4. Add HTTPS/SSL certificates
5. Implement proper logging and monitoring
6. Add backup strategies for database

## 📝 License

This project is developed for SRS Infoway internal use.

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review console logs for error messages
3. Verify document format requirements
4. Test with sample documents first

---

**Last Updated**: March 2026  
**Version**: 1.0.0