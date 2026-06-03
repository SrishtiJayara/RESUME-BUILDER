// src/api.js
// Determine API base URL based on environment

const API_BASE = process.env.NODE_ENV === 'production' 
  ? '/.netlify/functions' 
  : 'http://localhost:5173/.netlify/functions';

/**
 * Generate a resume with the provided data
 * @param {Object} data - Resume data (name, email, skills, etc.)
 * @returns {Promise<Object>} API response
 */
export const generateResume = async (data) => {
  try {
    const response = await fetch(`${API_BASE}/api/generate-resume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error generating resume:', error);
    throw error;
  }
};

/**
 * Generate content using Groq AI
 * @param {string} prompt - The prompt for AI generation
 * @returns {Promise<Object>} Generated content
 */
export const groqGenerate = async (prompt) => {
  try {
    const response = await fetch(`${API_BASE}/groq/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error calling Groq:', error);
    throw error;
  }
};

/**
 * Get a specific resume
 * @param {string} id - Resume ID
 * @returns {Promise<Object>} Resume data
 */
export const getResume = async (id) => {
  try {
    const response = await fetch(`${API_BASE}/api/resume/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching resume:', error);
    throw error;
  }
};

/**
 * Update a resume
 * @param {string} id - Resume ID
 * @param {Object} data - Updated resume data
 * @returns {Promise<Object>} API response
 */
export const updateResume = async (id, data) => {
  try {
    const response = await fetch(`${API_BASE}/api/resume/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating resume:', error);
    throw error;
  }
};

// Health check
export const checkHealth = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
};