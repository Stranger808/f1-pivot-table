// Proxy mode configuration - single port
const CONFIG = {
    SERVER_IP: window.location.hostname,
    BACKEND_PORT: window.location.port || '8899',
    
    getApiUrl: function() {
        const protocol = window.location.protocol;
        const host = window.location.hostname;
        const port = window.location.port || '8899';
        return `${protocol}//${host}:${port}/api`;
    }
};
