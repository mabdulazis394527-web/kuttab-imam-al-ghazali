// Netlify Function: seluruh API Express PSB dilayani di /api/*
import serverless from 'serverless-http';
import { withLambda } from '@netlify/aws-lambda-compat';
import { createApp } from '../../server/app.js';

const handler = serverless(createApp(), { binary: ['application/pdf', 'image/*', 'multipart/form-data', 'application/octet-stream'] });

export default withLambda(handler);

export const config = { path: '/api/*' };
