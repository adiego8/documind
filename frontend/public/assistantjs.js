/**
 * AssistantJS - Frontend SDK for Persona
 * Secure client-side integration for AI assistants
 * 
 * Usage:
 *   AssistantJS.init('proj_abc123_public')
 *     .then(() => AssistantJS.send({
 *       assistantId: 'customer_support',
 *       message: 'Hello!'
 *     }))
 *     .then(response => console.log(response.message))
 * 
 * @version 1.0.0
 * @license MIT
 */

class AssistantJS {
    constructor() {
        this.projectId = null;
        this.sessionToken = null;
        this.baseUrl = null;
        this.isInitialized = false;
        this.projectInfo = null;

        // Configuration
        this.config = {
            autoRetry: true,
            maxRetries: 3,
            retryDelay: 1000,
            timeout: 30000
        };
    }

    /**
     * Initialize AssistantJS with a project ID
     * @param {string} projectId - The public project ID (format: proj_xxxxx_public)
     * @param {Object} options - Configuration options
     * @returns {Promise<AssistantJS>} This instance for chaining
     */
    async init(projectId, options = {}) {
        if (!projectId || typeof projectId !== 'string') {
            throw new Error('Project ID is required and must be a string');
        }

        // Validate project ID format
        if (!/^proj_[a-zA-Z0-9_]+_public$/.test(projectId)) {
            throw new Error('Invalid project ID format');
        }

        // Set configuration
        this.projectId = projectId;
        this.baseUrl = options.baseUrl || this._detectBaseUrl();
        Object.assign(this.config, options.config || {});

        // Validate base URL is HTTPS in production
        if (!this.baseUrl.includes('localhost') && !this.baseUrl.includes('127.0.0.1') && !this.baseUrl.startsWith('https://')) {
            throw new Error('HTTPS required for production usage');
        }

        try {
            // Get project info first
            await this._fetchProjectInfo();

            // Create session
            const sessionResponse = await this._createSession(options.userIdentifier, options.metadata);
            this.sessionToken = sessionResponse.session_token;
            this.isInitialized = true;

            return this;
        } catch (error) {
            this.isInitialized = false;
            throw new Error(`Failed to initialize AssistantJS: ${error.message}`);
        }
    }

    /**
     * Send a message to an assistant
     * @param {Object} options - Message options
     * @param {string} options.assistantId - ID of the assistant to message
     * @param {string} options.message - The message to send
     * @param {Object} options.metadata - Optional metadata
     * @returns {Promise<Object>} Assistant response
     */
    async send(options) {
        if (!this.isInitialized) {
            throw new Error('AssistantJS not initialized. Call init() first.');
        }

        if (!options || !options.assistantId || !options.message) {
            throw new Error('assistantId and message are required');
        }

        // Validate input types and lengths
        if (typeof options.assistantId !== 'string' || typeof options.message !== 'string') {
            throw new Error('assistantId and message must be strings');
        }

        // Validate message length (prevent abuse)
        if (options.message.length > 10000) {
            throw new Error('Message too long (max 10,000 characters)');
        }

        if (options.message.trim().length === 0) {
            throw new Error('Message cannot be empty');
        }

        // Validate assistant ID format (allow spaces and common characters)
        if (!/^[a-zA-Z0-9_\s-]+$/.test(options.assistantId)) {
            throw new Error('Invalid assistant ID format');
        }

        // Validate assistant is allowed
        if (this.projectInfo.allowed_assistants.length > 0 &&
            !this.projectInfo.allowed_assistants.includes(options.assistantId)) {
            throw new Error(`Assistant not available for this project`);
        }

        // Sanitize metadata to prevent injection
        const sanitizedMetadata = {};
        if (options.metadata && typeof options.metadata === 'object') {
            for (const [key, value] of Object.entries(options.metadata)) {
                if (typeof key === 'string' && key.length <= 100 && /^[a-zA-Z0-9_-]+$/.test(key)) {
                    if (typeof value === 'string' && value.length <= 1000) {
                        sanitizedMetadata[key] = value;
                    }
                }
            }
        }

        const requestData = {
            session_token: this.sessionToken,
            assistant_id: options.assistantId,
            message: options.message.trim(),
            metadata: sanitizedMetadata
        };

        try {
            const response = await this._makeRequest('/assistants/message', {
                method: 'POST',
                body: JSON.stringify(requestData)
            });

            return {
                message: response.message,
                conversationId: response.conversation_id,
                processingTime: response.processing_time_ms
            };
        } catch (error) {
            // Sanitize error messages to not expose internal details
            if (error.status === 429) {
                throw new Error('Rate limit exceeded. Please wait before sending another message.');
            } else if (error.status === 403) {
                throw new Error('Access denied. Please check your project configuration.');
            } else if (error.status === 404) {
                throw new Error('Assistant not found.');
            } else if (error.status >= 500) {
                throw new Error('Service temporarily unavailable. Please try again later.');
            } else if (error.name === 'AbortError') {
                throw new Error('Request timeout. Please try again.');
            } else {
                // Generic error without exposing internals
                throw new Error('Unable to process request. Please try again.');
            }
        }
    }

    /**
     * Get project information
     * @returns {Object} Project info
     */
    getProjectInfo() {
        return this.projectInfo;
    }

    /**
     * Check if AssistantJS is initialized
     * @returns {boolean} Initialization status
     */
    isReady() {
        return this.isInitialized && this.sessionToken !== null;
    }

    /**
     * Reset the session (useful for re-initialization)
     */
    reset() {
        this.projectId = null;
        this.sessionToken = null;
        this.isInitialized = false;
        this.projectInfo = null;
    }

    // Private methods

    /**
     * Auto-detect base URL from current domain
     * @private
     */
    _detectBaseUrl() {
        if (typeof window !== 'undefined') {
            if (window.location.host.includes('3000') || window.location.host.includes('localhost')) {
                return 'http://localhost:8082/api/public';
            }
            const protocol = window.location.protocol;
            const host = window.location.host;
            return `${protocol}//${host}/api/public`;
        }
        throw new Error('Base URL must be provided in non-browser environments');
    }

    /**
     * Fetch project information
     * @private
     */
    async _fetchProjectInfo() {
        try {
            const response = await this._makeRequest(`/projects/${this.projectId}/info`);
            this.projectInfo = response;
        } catch (error) {
            if (error.status === 403) {
                throw new Error('Domain not allowed for this project');
            } else if (error.status === 404) {
                throw new Error('Project not found or inactive');
            }
            throw error;
        }
    }

    /**
     * Create a new session
     * @private
     */
    async _createSession(userIdentifier, metadata) {
        const requestData = {
            project_id: this.projectId,
            user_identifier: userIdentifier,
            metadata: metadata || {}
        };

        return await this._makeRequest('/sessions/create', {
            method: 'POST',
            body: JSON.stringify(requestData)
        });
    }

    /**
     * Make HTTP request with retry logic
     * @private
     */
    async _makeRequest(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'Cache-Control': 'no-cache'
            }
        };

        const requestOptions = { ...defaultOptions, ...options };

        for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

                const response = await fetch(url, {
                    ...requestOptions,
                    signal: controller.signal,
                    credentials: 'same-origin',
                    mode: 'cors'
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    const error = new Error('Request failed');
                    error.status = response.status;
                    error.response = {};
                    throw error;
                }

                return await response.json();
            } catch (error) {
                // Don't retry on client errors (4xx) except 429 (rate limit)
                if (error.status >= 400 && error.status < 500 && error.status !== 429) {
                    throw error;
                }

                // If this is the last attempt, throw the error
                if (attempt === this.config.maxRetries) {
                    throw error;
                }

                // Wait before retrying
                if (this.config.autoRetry) {
                    await new Promise(resolve =>
                        setTimeout(resolve, this.config.retryDelay * (attempt + 1))
                    );
                }
            }
        }
    }
}

// Create global instance
const assistantJS = new AssistantJS();

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    // Node.js
    module.exports = AssistantJS;
    module.exports.default = assistantJS;
} else if (typeof define === 'function' && define.amd) {
    // AMD
    define(() => AssistantJS);
} else {
    // Browser global
    window.AssistantJS = assistantJS;
    window.AssistantJSClass = AssistantJS;
}

// Add helper for direct usage (like EmailJS)
if (typeof window !== 'undefined') {
    window.assistantjs = {
        init: (projectId, options) => assistantJS.init(projectId, options),
        send: (options) => assistantJS.send(options),
        getProjectInfo: () => assistantJS.getProjectInfo(),
        isReady: () => assistantJS.isReady(),
        reset: () => assistantJS.reset()
    };
}