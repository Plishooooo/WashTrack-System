// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' 
  ? 'https://washtrack-system-production.up.railway.app'
  : 'http://localhost:8081');

export const API_ENDPOINTS = {
  // Auth endpoints
  LOGIN_USER: `${API_BASE_URL}/loginuser`,
  LOGIN_ADMIN: `${API_BASE_URL}/loginadmin`,
  SIGNUP_USER: `${API_BASE_URL}/signupuser`,
  SEND_VERIFICATION_CODE: `${API_BASE_URL}/send-verification-code`,
  VERIFY_CODE: `${API_BASE_URL}/verify-code`,
  
  // User endpoints
  GET_USER: (email) => `${API_BASE_URL}/getuser/${email}`,
  GET_USER_BY_ID: (userId) => `${API_BASE_URL}/getuser/id/${userId}`,
  GET_ALL_USERS: `${API_BASE_URL}/allusers`,
  UPDATE_USER: `${API_BASE_URL}/updateuser`,
  
  // Profile endpoints
  GET_PROFILE: (userId) => `${API_BASE_URL}/getprofile/${userId}`,
  UPDATE_PROFILE: `${API_BASE_URL}/updateprofile`,
  
  // Password endpoints
  VERIFY_PASSWORD: `${API_BASE_URL}/verifypassword`,
  UPDATE_PASSWORD: `${API_BASE_URL}/updatepassword`,
  
  // Services endpoints
  GET_SERVICES: `${API_BASE_URL}/services`,
  CREATE_SERVICE: `${API_BASE_URL}/services`,
  UPDATE_SERVICE: (id) => `${API_BASE_URL}/services/${id}`,
  DELETE_SERVICE: (id) => `${API_BASE_URL}/services/${id}`,
  
  // Orders endpoints
  GET_ORDERS: `${API_BASE_URL}/orders`,
  GET_ORDERS_BY_USER: (userID) => `${API_BASE_URL}/orders?userID=${userID}`,
  CREATE_ORDER: `${API_BASE_URL}/orders`,
  UPDATE_ORDER: (id) => `${API_BASE_URL}/orders/${id}`,
  DELETE_ORDER: (id) => `${API_BASE_URL}/orders/${id}`,
  
  // Staff endpoints
  GET_STAFF: `${API_BASE_URL}/staff`,
  CREATE_STAFF: `${API_BASE_URL}/staff`,
  UPDATE_STAFF: (id) => `${API_BASE_URL}/staff/${id}`,
  DELETE_STAFF: (id) => `${API_BASE_URL}/staff/${id}`,
  
  // Reports endpoints
  GET_REPORTS: `${API_BASE_URL}/reports`,
  CREATE_REPORT: `${API_BASE_URL}/reports`,
};

export default API_ENDPOINTS;
