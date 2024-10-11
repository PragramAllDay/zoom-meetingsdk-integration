const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors');
const { Buffer } = require('buffer');
const { KJUR } = require('jsrsasign');
const { inNumberArray, isBetween, isRequiredAllOrNone, validateRequest } = require('./validations.js');
// Create an instance of Express
const app = express();
const PORT = 3000;

// Zoom OAuth credentials
const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID; // Replace with your Zoom Client ID
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET; // Replace with your Zoom Client Secret
const REDIRECT_URI = 'http://localhost:5173'; // Must match your Zoom app's Redirect URI

app.use(cors());
app.use(bodyParser.json());

// OAuth Flow: Get Zoom Authorization Code
app.get('/', async (req, res) => {
  const url = `https://zoom.us/oauth/authorize?response_type=code&client_id=${ZOOM_CLIENT_ID}&redirect_uri=${REDIRECT_URI}`;
  res.redirect(url); // Redirect to Zoom OAuth consent page
});

// Exchange Authorization Code for Access Token
app.post('/api/get-zoom-token', async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Authorization code is missing' });
  }

  try {
    const { default: fetch } = await import('node-fetch'); // Dynamic import for fetch
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDIRECT_URI,
    }).toString();

    const response = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to get token');
    }

    res.json(data); // Return the access token
  } catch (error) {
    res.status(500).json({ error: 'Failed to exchange code for token' });
  }
});

// Create a Zoom Meeting
app.post('/api/create-meeting', async (req, res) => {
  const { topic, type, start_time, duration, agenda, accessTokens } = req.body;

  if (!topic || !type || !start_time || !duration) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const response = await axios.post(
      'https://api.zoom.us/v2/users/me/meetings',
      {
        topic,
        type,
        start_time,
        duration,
        agenda,
      },
      {
        headers: {
          Authorization: `Bearer ${accessTokens}`,
          'Content-Type': 'application/json',
        },
      }
    );
    res.json(response.data); // Return meeting details
  } catch (error) {
    res.status(500).json({ error: 'Failed to create meeting' });
  }
});

/**
 * sdk auth signature creation
 * **/
const propValidations = {
  role: inNumberArray([0, 1]),
  expirationSeconds: isBetween(1800, 172800),
};

const schemaValidations = [isRequiredAllOrNone(['meetingNumber', 'role'])];

const coerceRequestBody = (body) => ({
  ...body,
  ...['role', 'expirationSeconds'].reduce((acc, cur) => ({ ...acc, [cur]: typeof body[cur] === 'string' ? parseInt(body[cur]) : body[cur] }), {}),
});

app.post('/sdk_auth', (req, res) => {
  const requestBody = coerceRequestBody(req.body);
  const validationErrors = validateRequest(requestBody, propValidations, schemaValidations);

  if (validationErrors.length > 0) {
    return res.status(400).json({ errors: validationErrors });
  }

  const { meetingNumber, role, expirationSeconds } = requestBody;
  const iat = Math.floor(Date.now() / 1000);
  const exp = expirationSeconds ? iat + expirationSeconds : iat + 60 * 60 * 2;
  const oHeader = { alg: 'HS256', typ: 'JWT' };

  const oPayload = {
    appKey: ZOOM_CLIENT_ID,
    sdkKey: ZOOM_CLIENT_ID,
    mn: meetingNumber,
    role,
    iat,
    exp,
    tokenExp: exp,
  };

  const sHeader = JSON.stringify(oHeader);
  const sPayload = JSON.stringify(oPayload);
  const sdkJWT = KJUR.jws.JWS.sign('HS256', sHeader, sPayload, ZOOM_CLIENT_SECRET);
  return res.json({ signature: sdkJWT });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
