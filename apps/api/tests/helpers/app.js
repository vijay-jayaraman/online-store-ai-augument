// Builds the Express app for Supertest. No port is opened.

import request from 'supertest';
import { createApp } from '../../src/app.js';

export const buildApp = () => createApp();

export const api = () => request(buildApp());
