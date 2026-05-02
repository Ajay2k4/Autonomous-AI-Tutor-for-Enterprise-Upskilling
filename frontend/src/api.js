import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000';

const client = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth token to requests
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global Error Interceptor for Session Expiry
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Force clean logout on unauthorized access
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const learnerApi = {
  login: async (username, password) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    const response = await client.post('/login', formData);
    return response.data;
  },
  register: async (username, password) => {
    const response = await client.post('/register', { username, password });
    return response.data;
  },
  onboard: async (onboardingData) => {
    const response = await client.post('/run', onboardingData);
    return response.data;
  },
  getProfile: async () => {
    const response = await client.get('/get-profile');
    return response.data;
  },
  markTopicComplete: async (topicName) => {
    const response = await client.post('/progress', { topic: topicName });
    return response.data;
  },
  sendChatMessage: async (message, skill, topic) => {
    const response = await client.post('/tutor/chat', { message, skill, topic });
    return response.data;
  },
  startModule: async (topic, skill) => {
    // Backend uses current_module_index from profile, but we pass topic/skill for context if it supports it
    const response = await client.post('/tutor/start', { topic, skill });
    // Robust extraction: backend returns { lecture: "..." }
    return response.data?.lecture || "";
  },
  generateQuiz: async (topic) => {
    // Ensure we send a valid JSON body even if the current backend endpoint 
    // mainly relies on session state, to prevent 400/422 errors.
    const response = await client.post('/tutor/quiz', { 
      topic: topic || "Active Module" 
    });
    return response.data?.quiz || [];
  },
  submitAssessment: async (answers, feedback) => {
    const response = await client.post('/tutor/submit', { answers, feedback });
    return response.data;
  },
  submitPedagogyFeedback: async (text) => {
    const response = await client.post('/tutor/feedback', { feedback: text });
    return response.data;
  },
  fetchLessonAndQuiz: async (topicName) => {
    // Mocked for now as per directive
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          lessonText: `# ${topicName}\n\nThis is a specialized lesson about **${topicName}**. In this module, you will learn the core principles and advanced techniques required to master this specific topic.\n\n### Key Concepts\n1. Understanding the fundamentals.\n2. Implementing best practices.\n3. Optimizing for performance.\n\nPlease read this content thoroughly before attempting the assessment at the bottom of the page.`,
          quiz: [
            {
              id: 1,
              question: `What is the primary goal of ${topicName}?`,
              options: ["To improve performance", "To increase complexity", "To reduce scalability", "None of the above"],
              answer: 0
            },
            {
              id: 2,
              question: "Which of the following is a core principle discussed in the text?",
              options: ["Manual configuration", "Automated deployment", "Understanding fundamentals", "Legacy support"],
              answer: 2
            },
            {
              id: 3,
              question: "True or False: Best practices are optional in this module.",
              options: ["True", "False"],
              answer: 1
            },
            {
              id: 4,
              question: "Optimization should be done:",
              options: ["At the very beginning", "For performance", "To confuse others", "Randomly"],
              answer: 1
            },
            {
              id: 5,
              question: "This assessment requires a passing score of:",
              options: ["50%", "60%", "70%", "100%"],
              answer: 2
            }
          ]
        });
      }, 800);
    });
  }
};

export default client;
