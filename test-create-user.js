// Test the create member API endpoint
const https = require('http');

const data = JSON.stringify({
  fullName: "Test API User",
  email: "testapiuser@asterdex.com",
  phone: "+15551234567",
  password: "testpassword123",
  initialInvestment: 100,
  parentId: "118b4728-3998-4e54-b772-f20948a3057d", // testuser1's ID from seeded data
  position: "left"
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/genealogy/add-member',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    // You'll need to add a valid auth token here
    'Authorization': 'Bearer YOUR_AUTH_TOKEN_HERE'
  }
};

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', responseData);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(data);
req.end();
