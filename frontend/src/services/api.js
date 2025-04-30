import axios from 'axios';

// Get the backend API URL from Vite's environment variables
// Variables must start with VITE_ in the .env file
// import.meta.env.MODE gives 'development', 'production', etc.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

console.log(`API Base URL (${import.meta.env.MODE}): ${API_BASE_URL}`); // For debugging

// Create an Axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    // Add other default headers if needed (e.g., Authorization)
  },
  // timeout: 10000, // Optional: Set a timeout for requests (in milliseconds)
});

// --- Optional: Add interceptors for request/response handling ---

// Request interceptor (e.g., add auth token)
apiClient.interceptors.request.use(
  (config) => {
    // Example: Add auth token if available
    // const token = localStorage.getItem('authToken');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    // Do something with request error
    return Promise.reject(error);
  }
);

// Response interceptor (e.g., handle global errors)
apiClient.interceptors.response.use(
  (response) => {
    // Any status code that lie within the range of 2xx cause this function to trigger
    // Do something with response data
    return response;
  },
  (error) => {
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    // Do something with response error
    console.error('API Error:', error.response ? `${error.response.status} - ${JSON.stringify(error.response.data)}` : error.message);

    // Example: Handle 401 Unauthorized globally
    // if (error.response && error.response.status === 401) {
    //   // Redirect to login, clear token, etc.
    //   // Make sure this doesn't cause infinite loops if login page also uses apiClient
    //   console.log('Unauthorized, redirecting to login...');
    //   // window.location.href = '/login';
    // }

    // Important: Reject the promise so calling code (.catch()) can handle specific errors
    return Promise.reject(error);
  }
);

export default apiClient;