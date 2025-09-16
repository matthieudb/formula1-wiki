import axios from 'axios'

/**
 * OpenF1 API configuration and client setup
 * This module handles the basic API client configuration for the OpenF1 service
 */

// OpenF1 API base URL - the official Formula 1 telemetry API
const BASE_URL = 'https://api.openf1.org/v1'

/**
 * Create axios instance with default configuration
 * - Sets base URL for all requests
 * - Adds 10 second timeout to prevent hanging requests
 * - Sets JSON content type header for all requests
 */
export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Export the base URL for use in other modules
 * Useful for logging and debugging purposes
 */
export { BASE_URL }