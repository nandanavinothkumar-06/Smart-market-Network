const config = {
    // Production API URL - will use window.__API_URL__ if injected at runtime.
    // Default set to the Render backend you provided.
    API_URL: window.__API_URL__ || "https://smart-market-network.onrender.com",

    // Development API URL
    DEV_API_URL: "http://127.0.0.1:8080"
};

// Export the appropriate URL based on environment
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const BASE_URL = isLocal ? config.DEV_API_URL : config.API_URL;

export default BASE_URL;