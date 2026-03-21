import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { 
  type Evaluation, 
  evaluationAPI, 
  calculateStatsFromEvaluations,
  getRatingNumber
} from '../services/evaluationAPI';

interface DashboardStats {
  totalEvaluations: number;
  selectedCandidates: number;
  evaluationsByDay: Array<{ day: string; count: number }>;
  dailyStats: Array<{ day: string; interviewed: number; selected: number }>;
  profileDistribution: Array<{ skillsProfile: string; count: number }>;
}

  
export default function Dashboard() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState<string>('');
  const [modalData, setModalData] = useState<any[]>([]);
  const [selectedEvaluation, setSelectedEvaluation] = useState<any>(null);
  const [dateRange, setDateRange] = useState<string>('7days');
  const [profileFilter, setProfileFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (evaluations.length > 0) {
      const filteredData = getFilteredByProfile();
      const statsData = calculateStatsFromEvaluations(filteredData);
      setStats(statsData);
    }
  }, [evaluations, dateRange, profileFilter]);

  const loadData = async () => {
    try {
      console.log('🔄 Checking backend connection...');
      await evaluationAPI.healthCheck();
      console.log('✅ Backend connected successfully');
      
      const evaluationsData = await evaluationAPI.getAllEvaluations();
      setEvaluations(evaluationsData);
      
      if (evaluationsData.length === 0) {
        console.log('📊 Database is empty - ready for real evaluations');
        setMessage('Database is ready. Upload your first evaluation document to get started.');
        setMessageType('success');
      } else {
        console.log(`📊 Loaded ${evaluationsData.length} evaluations from database`);
      }
      
      const statsData = calculateStatsFromEvaluations(evaluationsData);
      setStats(statsData);
    } catch (error) {
      console.error('❌ Error loading data:', error);
      setMessage('Failed to connect to backend. Please make sure the server is running.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // Filter data based on date range
  const getFilteredData = () => {
    if (dateRange === 'all') return evaluations;
    
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
      default:
        return evaluations;
    }
    
    return evaluations.filter(e => new Date(e.uploadedAt) >= filterDate);
  };

  // Modal handlers
  const showAllEvaluations = () => {
    setModalContent('all-evaluations');
    setModalData(getFilteredData());
    setShowModal(true);
  };

  const showSelectedCandidates = () => {
    const selected = getFilteredData().filter(e => 
      e.recommendation === 'Selected' || 
      e.recommendation === 'Hire' || 
      e.recommendation === 'Recommend'
    );
    
    console.log('📊 Selected candidates for modal:', selected.map(e => `${e.candidateName}: ${e.recommendation}`));
    
    setModalContent('selected');
    setModalData(selected);
    setShowModal(true);
  };

  const getFilteredByProfile = () => {
    let filtered = getFilteredData();
    if (profileFilter !== 'all') {
      filtered = filtered.filter(e => e.skillsProfile === profileFilter);
    }
    return filtered;
  };

  const showMonthlyEvaluations = () => {
    const thisMonth = new Date();
    thisMonth.setDate(1); // First day of current month
    const monthlyEvals = evaluations.filter(e => new Date(e.uploadedAt) >= thisMonth);
    setModalContent('monthly');
    setModalData(monthlyEvals);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedEvaluation(null);
  };

  const toggleEvaluationDetails = (evaluation: any) => {
    setSelectedEvaluation(selectedEvaluation?.id === evaluation.id ? null : evaluation);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Validate all files are .docx
    const invalidFiles = Array.from(files).filter(file => !file.name.toLowerCase().endsWith('.docx'));
    if (invalidFiles.length > 0) {
      setMessage(`❌ Please select only .docx files. Invalid: ${invalidFiles.map(f => f.name).join(', ')}`);
      setMessageType('error');
      return;
    }

    setUploading(true);
    setMessage(`Processing ${files.length} document(s)...`);
    setMessageType('');

    const results = {
      successful: [] as string[],
      failed: [] as string[],
      duplicates: [] as string[]
    };

    try {
      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          setMessage(`Processing ${i + 1}/${files.length}: ${file.name}...`);
          
          const evaluation = await evaluationAPI.uploadEvaluation(file);
          
          results.successful.push(`${evaluation.candidateName} (${evaluation.overallRating})`);
          
        } catch (error: any) {
          console.error(`Error processing ${file.name}:`, error);
          
          // Handle duplicate candidate error specifically
          if (error.isDuplicate && error.existingEvaluation) {
            results.duplicates.push(`${error.existingEvaluation.candidateName} - already exists`);
          } else {
            results.failed.push(file.name);
          }
        }
      }
      
      // Reload all data after uploads
      await loadData();
      
      // Show final results
      let resultMessage = '';
      if (results.successful.length > 0) {
        resultMessage += `✅ Successfully processed ${results.successful.length} file(s): ${results.successful.join(', ')}`;
      }
      if (results.duplicates.length > 0) {
        resultMessage += `${resultMessage ? '\n' : ''}⚠️ Duplicate candidates found (${results.duplicates.length}): ${results.duplicates.join(', ')}`;
      }
      if (results.failed.length > 0) {
        resultMessage += `${resultMessage ? '\n' : ''}❌ Failed to process ${results.failed.length} file(s): ${results.failed.join(', ')}`;
      }
      
      setMessage(resultMessage);
      
      // Determine message type based on results
      if (results.failed.length > 0) {
        setMessageType('error');
      } else if (results.duplicates.length > 0 && results.successful.length === 0) {
        setMessageType('error'); // All duplicates, no success
      } else if (results.successful.length > 0) {
        setMessageType('success'); // At least some success
      } else {
        setMessageType('error');
      }
      
      // Reset file input
      event.target.value = '';
      
      // Clear message after 8 seconds
      setTimeout(() => {
        setMessage('');
        setMessageType('');
      }, 8000);
      
    } catch (error) {
      console.error('Error during batch processing:', error);
      setMessage(`❌ Error during batch processing: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
      
      setTimeout(() => {
        setMessage('');
        setMessageType('');
      }, 8000);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="header">
        <div className="container">
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '10px' }}>
            📊 SRS Infoway - Evaluation Dashboard
          </h1>
          <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>
            Track and analyze candidate evaluations for better hiring decisions
          </p>
        </div>
      </div>

      <div className="container">
        {/* Upload Section */}
        <div className="upload-area">
          <h2 style={{ fontSize: '1.5rem', marginBottom: '15px' }}>📄 Upload Evaluation Document</h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Upload Word document(s) (.docx) containing candidate evaluation results. Multiple files supported.
          </p>
          
          <div className="file-input-wrapper">
            <input
              type="file"
              accept=".docx"
              multiple
              onChange={handleFileUpload}
              disabled={uploading}
            />
            <div className={`file-input-button ${uploading ? 'disabled' : ''}`}>
              {uploading ? '🔄 Processing Documents...' : '📤 Choose & Upload Document(s)'}
            </div>
          </div>
          
          {message && (
            <div style={{
              padding: '15px',
              borderRadius: '6px',
              marginTop: '15px',
              whiteSpace: 'pre-line',
              fontSize: '0.9rem',
              backgroundColor: messageType === 'success' ? '#d4edda' : '#f8d7da',
              color: messageType === 'success' ? '#155724' : '#721c24',
              border: `1px solid ${messageType === 'success' ? '#c3e6cb' : '#f5c6cb'}`
            }}>
              {message}
            </div>
          )}
        </div>

        {/* Stats Overview */}
        <div className="stats-grid">
          <div className="stat-card clickable" onClick={showAllEvaluations}>
            <div className="stat-number">{stats?.totalEvaluations || 0}</div>
            <div className="stat-label">Total Evaluations</div>
            <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '5px' }}>Click to view all</div>
          </div>
          <div className="stat-card clickable" onClick={showSelectedCandidates}>
            <div className="stat-number">{stats?.selectedCandidates || 0}</div>
            <div className="stat-label">Selected</div>
            <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '5px' }}>Click to view details</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats?.profileDistribution?.length || 0}</div>
            <div className="stat-label">Profile Types</div>
          </div>
        </div>

        {/* Charts */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
            <h3 style={{ fontSize: '1.3rem', color: '#333', margin: 0 }}>
              📊 Analytics Dashboard
            </h3>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="date-range-selector">
                <label style={{ marginRight: '10px', color: '#666' }}>Date Range:</label>
                <select 
                  value={dateRange} 
                  onChange={(e) => setDateRange(e.target.value)}
                >
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="90days">Last 90 Days</option>
                  <option value="1year">Last Year</option>
                  <option value="all">All Time</option>
                </select>
              </div>
              <div className="date-range-selector">
                <label style={{ marginRight: '10px', color: '#666' }}>Profile:</label>
                <select 
                  value={profileFilter} 
                  onChange={(e) => {
                    console.log('Profile filter changed to:', e.target.value);
                    setProfileFilter(e.target.value);
                  }}
                >
                  <option value="all">All Profiles</option>
                  {evaluations.length > 0 && [...new Set(evaluations.map(e => e.skillsProfile).filter(Boolean))].map(profile => (
                    <option key={profile} value={profile}>{profile}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          <div className="charts-grid">
            {/* Daily Trends Chart */}
            <div className="card">
              <h4 style={{ fontSize: '1.1rem', marginBottom: '15px', color: '#333' }}>
                📈 Daily Interview Trends
              </h4>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats?.evaluationsByDay || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="day" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px'
                    }}
                    labelFormatter={(value) => `Date: ${new Date(value).toLocaleDateString()}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 7, fill: '#059669' }}
                    name="Interviews"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Daily Stats Chart */}
            <div className="card">
              <h4 style={{ fontSize: '1.1rem', marginBottom: '15px', color: '#333' }}>
                📊 Daily Interview vs Selection
              </h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats?.dailyStats || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="day" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px'
                    }}
                    labelFormatter={(value) => `Date: ${new Date(value).toLocaleDateString()}`}
                  />
                  <Bar 
                    dataKey="interviewed" 
                    fill="#667eea" 
                    radius={[4, 4, 0, 0]}
                    name="Interviewed"
                  />
                  <Bar 
                    dataKey="selected" 
                    fill="#10b981" 
                    radius={[4, 4, 0, 0]}
                    name="Selected"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Evaluations */}
        <div className="card">
          <h3 style={{ fontSize: '1.5rem', marginBottom: '25px', color: '#333' }}>
            📋 Recent Evaluations
          </h3>
          {evaluations.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px 20px', 
              color: '#666',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              border: '2px dashed #ddd'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '20px' }}>📄</div>
              <h4 style={{ color: '#333', marginBottom: '10px' }}>No Evaluations Yet</h4>
              <p>Upload your first Word document to get started with candidate evaluations.</p>
            </div>
          ) : (
            <div className="evaluations-list">
              {evaluations.slice(-10).reverse().map((evaluation) => (
              <div key={evaluation.id} className={`evaluation-item clickable ${selectedEvaluation?.id === evaluation.id ? 'expanded' : ''}`} onClick={() => toggleEvaluationDetails(evaluation)}>
                <div className="evaluation-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div className="candidate-name">{evaluation.candidateName}</div>
                    <div className="evaluation-details">
                      {evaluation.skillsProfile} • Experience: {evaluation.totalExperience}
                    </div>
                    <div className="evaluation-details">
                      Interview: {evaluation.interviewDate} • Uploaded: {new Date(evaluation.uploadedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div className={`rating-badge ${
                      getRatingNumber(evaluation.overallRating) >= 7 ? 'high' :
                      getRatingNumber(evaluation.overallRating) >= 4 ? 'medium' : 'low'
                    }`}>
                      {evaluation.overallRating}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>
                      {evaluation.recommendation}
                    </div>
                  </div>
                </div>
                
                {selectedEvaluation?.id === evaluation.id && (
                  <div className="evaluation-expanded">
                    {evaluation.technicalStrengths && (
                      <div style={{ marginTop: '15px' }}>
                        <strong>💪 Technical Skills Strengths:</strong>
                        <div style={{ marginTop: '10px', padding: '15px', backgroundColor: '#e8f5e8', borderRadius: '6px', fontSize: '0.9rem', color: '#2d5016' }}>
                          {evaluation.technicalStrengths}
                        </div>
                      </div>
                    )}
                    
                    {evaluation.technicalWeaknesses && (
                      <div style={{ marginTop: '15px' }}>
                        <strong>📝 Technical Weaknesses / Areas of Improvement:</strong>
                        <div style={{ marginTop: '10px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '6px', fontSize: '0.9rem', color: '#856404' }}>
                          {evaluation.technicalWeaknesses}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {!selectedEvaluation && (evaluation.technicalStrengths || evaluation.technicalWeaknesses) && (
                  <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '6px', fontSize: '0.9rem', color: '#555' }}>
                    💼 Click to view detailed technical feedback and skill breakdown
                  </div>
                )}
              </div>
            ))}
          </div>
          )}
        </div>

      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>×</button>
            
            {modalContent === 'all-evaluations' && (
              <div>
                <h2 className="modal-title">All Evaluations ({modalData.length})</h2>
                <div className="evaluations-list">
                  {modalData.map((evaluation) => (
                    <div key={evaluation.id} className={`evaluation-detail ${selectedEvaluation?.id === evaluation.id ? 'expanded' : ''}`}>
                      <div className="evaluation-summary" onClick={() => toggleEvaluationDetails(evaluation)}>
                        <div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{evaluation.candidateName}</div>
                          <div style={{ color: '#666' }}>{evaluation.skillsProfile} • Experience: {evaluation.totalExperience}</div>
                          <div style={{ fontSize: '0.9rem', color: '#888' }}>
                            Interview: {evaluation.interviewDate} • Uploaded: {new Date(evaluation.uploadedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div>
                          <div className={`rating-badge ${
                            getRatingNumber(evaluation.overallRating) >= 7 ? 'high' :
                            getRatingNumber(evaluation.overallRating) >= 4 ? 'medium' : 'low'
                          }`}>
                            {evaluation.overallRating}
                          </div>
                        </div>
                      </div>
                      
                      {selectedEvaluation?.id === evaluation.id && (
                        <div className="evaluation-expanded">
                          <div style={{ marginBottom: '15px' }}>
                            <strong>Recommendation:</strong> {evaluation.recommendation}
                          </div>
                          
                          
                          {evaluation.technicalStrengths && (
                            <div style={{ marginBottom: '15px' }}>
                              <strong>💪 Technical Strengths:</strong>
                              <div style={{ marginTop: '5px', padding: '10px', backgroundColor: '#e8f5e8', borderRadius: '6px', color: '#2d5016' }}>
                                {evaluation.technicalStrengths}
                              </div>
                            </div>
                          )}
                          
                          {evaluation.feedback && (
                            <div style={{ marginBottom: '15px' }}>
                              <strong>💬 Feedback:</strong>
                              <div style={{ marginTop: '5px', padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '6px', color: '#1565c0' }}>
                                {evaluation.feedback}
                              </div>
                            </div>
                          )}
                          
                          {evaluation.technicalWeaknesses && (
                            <div style={{ marginBottom: '15px' }}>
                              <strong>📝 Areas of Improvement:</strong>
                              <div style={{ marginTop: '5px', padding: '10px', backgroundColor: '#fff3cd', borderRadius: '6px', color: '#856404' }}>
                                {evaluation.technicalWeaknesses}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {modalContent === 'selected' && (
              <div>
                <h2 className="modal-title">Selected Candidates ({modalData.length})</h2>
                <div className="evaluations-list">
                  {modalData.map((evaluation) => (
                    <div key={evaluation.id} className="evaluation-detail" style={{ borderLeftColor: '#10b981' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{evaluation.candidateName}</div>
                          <div style={{ color: '#666' }}>{evaluation.skillsProfile} • Experience: {evaluation.totalExperience}</div>
                          <div style={{ fontSize: '0.9rem', color: '#10b981', fontWeight: 'bold' }}>
                            {evaluation.recommendation}
                          </div>
                        </div>
                        <div className="rating-badge high">
                          {evaluation.overallRating}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {modalContent === 'monthly' && (
              <div>
                <h2 className="modal-title">This Month's Evaluations ({modalData.length})</h2>
                <div className="evaluations-list">
                  {modalData.map((evaluation) => (
                    <div key={evaluation.id} className="evaluation-detail">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{evaluation.candidateName}</div>
                          <div style={{ color: '#666' }}>{evaluation.skillsProfile} • Experience: {evaluation.totalExperience}</div>
                          <div style={{ fontSize: '0.9rem', color: '#888' }}>
                            Interview: {evaluation.interviewDate}
                          </div>
                        </div>
                        <div className={`rating-badge ${
                          getRatingNumber(evaluation.overallRating) >= 7 ? 'high' :
                          getRatingNumber(evaluation.overallRating) >= 4 ? 'medium' : 'low'
                        }`}>
                          {evaluation.overallRating}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}