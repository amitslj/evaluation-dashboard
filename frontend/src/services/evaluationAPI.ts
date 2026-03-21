const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.PROD 
    ? 'https://srs-evaluation-backend.onrender.com/api'  // Production backend URL
    : 'http://localhost:3001/api');
console.log('🔗 API Base URL:', API_BASE_URL);

export interface Evaluation {
  id: string;
  candidateName: string;
  totalExperience: string;
  overallRating: string;
  recommendation: string;
  interviewDate: string;
  skillsProfile: string;
  uploadedAt: string;
  
  // Detailed feedback (optional)
  technicalStrengths?: string;
  technicalWeaknesses?: string;
  originalFileName?: string;
  createdBy?: string;
}

export interface DashboardStats {
  totalEvaluations: number;
  selectedCandidates: number;
  profileDistribution: Array<{ skillsProfile: string; count: number }>;
}

// API Service Class
class EvaluationAPI {
  // Get all evaluations
  async getAllEvaluations(): Promise<Evaluation[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/evaluations`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching evaluations:', error);
      throw new Error('Failed to fetch evaluations');
    }
  }

  // Get single evaluation
  async getEvaluation(id: string): Promise<Evaluation> {
    try {
      const response = await fetch(`${API_BASE_URL}/evaluations/${id}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching evaluation:', error);
      throw new Error('Failed to fetch evaluation');
    }
  }

  // Upload Word document and create evaluation
  async uploadEvaluation(file: File): Promise<Evaluation> {
    try {
      const formData = new FormData();
      formData.append('document', file);

      const response = await fetch(`${API_BASE_URL}/evaluations/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle duplicate candidate error specifically
        if (response.status === 409 && errorData.error === 'Duplicate candidate evaluation') {
          const duplicateError = new Error(errorData.message || 'Candidate evaluation already exists');
          (duplicateError as any).isDuplicate = true;
          (duplicateError as any).existingEvaluation = errorData.existingEvaluation;
          throw duplicateError;
        }
        
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.evaluation;
    } catch (error) {
      console.error('Error uploading evaluation:', error);
      throw error;
    }
  }

  // Delete evaluation
  async deleteEvaluation(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/evaluations/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error deleting evaluation:', error);
      throw new Error('Failed to delete evaluation');
    }
  }

  // Get statistics
  async getStats(): Promise<DashboardStats> {
    try {
      const response = await fetch(`${API_BASE_URL}/stats`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching stats:', error);
      throw new Error('Failed to fetch statistics');
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: string; message: string; timestamp: string }> {
    try {
      const healthUrl = API_BASE_URL.replace('/api', '/health');
      console.log('🔍 Health check URL:', healthUrl);
      const response = await fetch(healthUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Backend health check failed:', error);
      throw new Error('Backend server is not responding');
    }
  }
}

// Create singleton instance
export const evaluationAPI = new EvaluationAPI();

// Helper function to calculate statistics from evaluations
export function calculateStatsFromEvaluations(evaluations: Evaluation[]) {
  console.log('📊 Calculating stats from evaluations...');
  console.log('📊 Total evaluations:', evaluations.length);
  
  // Debug each evaluation's recommendation
  evaluations.forEach((e, index) => {
    console.log(`${index + 1}. ${e.candidateName}: "${e.recommendation}"`);
  });
  
  const selectedCount = evaluations.filter(e => {
    const isSelected = e.recommendation === 'Selected' || 
                      e.recommendation === 'Hire' || 
                      e.recommendation === 'Recommend';
    return isSelected;
  }).length;
  
  console.log('📊 Selected count calculated:', selectedCount);
  
  const profileDistribution = evaluations.reduce((acc: { [key: string]: number }, e) => {
    const profile = e.skillsProfile || 'General';
    acc[profile] = (acc[profile] || 0) + 1;
    return acc;
  }, {});

  const profileArray = Object.entries(profileDistribution).map(([skillsProfile, count]) => ({
    skillsProfile,
    count
  })).sort((a, b) => b.count - a.count);

  // Calculate daily stats based on interview date, not upload date
  const dailyStats = evaluations.reduce((acc: { [key: string]: { interviewed: number; selected: number } }, e) => {
    // Parse interview date from various formats (DD.MM.YYYY, DD/MM/YYYY, etc.)
    let day: string;
    
    if (e.interviewDate && e.interviewDate !== 'Not Specified') {
      try {
        // Handle formats like "11.03.2026", "11/03/2026", "11-03-2026"
        const dateParts = e.interviewDate.split(/[._\/\-]/);
        if (dateParts.length === 3) {
          const dayNum = parseInt(dateParts[0]);
          const monthNum = parseInt(dateParts[1]);
          const yearNum = parseInt(dateParts[2]);
          
          // Create date in YYYY-MM-DD format for consistency
          const formattedDate = new Date(yearNum, monthNum - 1, dayNum);
          day = formattedDate.toISOString().slice(0, 10);
        } else {
          // Fallback to parsing as regular date
          day = new Date(e.interviewDate).toISOString().slice(0, 10);
        }
      } catch (error) {
        console.warn('Failed to parse interview date:', e.interviewDate, 'for candidate:', e.candidateName);
        // Fallback to upload date if interview date parsing fails
        day = new Date(e.uploadedAt).toISOString().slice(0, 10);
      }
    } else {
      // Use upload date if no interview date available
      day = new Date(e.uploadedAt).toISOString().slice(0, 10);
    }
    
    if (!acc[day]) {
      acc[day] = { interviewed: 0, selected: 0 };
    }
    acc[day].interviewed += 1;
    
    if (e.recommendation === 'Selected' || 
        e.recommendation === 'Hire' || 
        e.recommendation === 'Recommend') {
      acc[day].selected += 1;
    }
    return acc;
  }, {});

  const dailyStatsArray = Object.entries(dailyStats).map(([day, stats]) => ({
    day,
    interviewed: stats.interviewed,
    selected: stats.selected
  })).sort((a, b) => a.day.localeCompare(b.day));

  // Calculate evaluations by day
  const evaluationsByDay = dailyStatsArray.map(item => ({
    day: item.day,
    count: item.interviewed
  }));

  return {
    totalEvaluations: evaluations.length,
    selectedCandidates: selectedCount,
    profileDistribution: profileArray,
    dailyStats: dailyStatsArray,
    evaluationsByDay
  };
}

// Convert rating to numeric for calculations
export function getRatingNumber(rating: string): number {
  if (rating.includes('/')) {
    const [num, denom] = rating.split('/').map(n => parseFloat(n.trim()));
    return (num / denom) * 10; // Convert to 0-10 scale
  }
  return parseFloat(rating) || 0;
}