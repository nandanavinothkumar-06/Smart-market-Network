const config = {
    // Production API URL - change this to your deployed backend URL
    API_URL: "https://your-backend-url.herokuapp.com",
    
    // Development API URL
    DEV_API_URL: "http://127.0.0.1:8080"
};

// Export the appropriate URL based on environment
const BASE_URL = window.location.hostname === "localhost" ? config.DEV_API_URL : config.API_URL;

export default BASE_URL;