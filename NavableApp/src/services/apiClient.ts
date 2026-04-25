import axios from 'axios';
import { APP_CONFIG } from '../config/env';

export const apiClient = axios.create({
  baseURL: APP_CONFIG.apiBaseUrl,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
    'x-api-version': APP_CONFIG.apiVersion,
    'x-navable-api-key': APP_CONFIG.navableApiKey,
  },
});
