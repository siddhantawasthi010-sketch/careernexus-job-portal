const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'job-portal-api',
    message: 'API is running successfully.'
  });
});

app.get('/api/jobs', (req, res) => {
  res.json([
    { id: 1, title: 'Frontend Developer', location: 'Remote', type: 'Full-time' },
    { id: 2, title: 'Backend Engineer', location: 'Bengaluru', type: 'Full-time' },
    { id: 3, title: 'UI/UX Designer', location: 'Hyderabad', type: 'Contract' }
  ]);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
