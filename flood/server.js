const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

// Directory and file paths
const logsDir = path.join(__dirname, 'logs');
const logsFilePath = path.join(logsDir, 'logs.json');
const csvFilePath = path.join(logsDir, 'daily_log.csv');

// Ensure the /logs directory and files exist
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Create and initialize logs.json if it doesn't exist
if (!fs.existsSync(logsFilePath)) {
  fs.writeFileSync(logsFilePath, '[]', 'utf-8'); // Initialize with an empty JSON array
  console.log('logs.json created and initialized.');
} else {
  console.log('logs.json already exists.');
}

// Create and initialize daily_log.csv if it doesn't exist
if (!fs.existsSync(csvFilePath)) {
  const headers = 'ID,Description,Priority\n'; // CSV headers
  fs.writeFileSync(csvFilePath, headers, 'utf-8');
  console.log('daily_log.csv created and initialized.');
} else {
  console.log('daily_log.csv already exists.');
}

// Priority Queue and Stack Implementation
const priorityQueue = [];
const dispatchedServicesStack = [];

// Function to enqueue a request based on priority
function enqueueRequest(request) {
  let inserted = false;
  for (let i = 0; i < priorityQueue.length; i++) {
    if (priorityQueue[i].priority < request.priority) {
      priorityQueue.splice(i, 0, request);
      inserted = true;
      break;
    }
  }
  if (!inserted) {
    priorityQueue.push(request);
  }
}

// Function to dispatch a service
function dispatchService() {
  if (priorityQueue.length === 0) {
    return null;
  }
  const request = priorityQueue.shift();
  dispatchedServicesStack.push(request);
  return request;
}

// API Endpoints

// Endpoint to report a new emergency request
app.post('/report', (req, res) => {
  const { description, priority } = req.body;

  if (!description || typeof priority !== 'number') {
    return res.status(400).send({ error: 'Invalid input' });
  }

  const newRequest = { id: Date.now(), description, priority };
  enqueueRequest(newRequest);

  // Append the new request to logs.json
  const existingLogs = JSON.parse(fs.readFileSync(logsFilePath, 'utf-8'));
  existingLogs.push(newRequest);
  fs.writeFileSync(logsFilePath, JSON.stringify(existingLogs, null, 2), 'utf-8');

  res.status(201).send({ message: 'Request reported successfully', newRequest });
});

// Endpoint to dispatch the highest priority service
app.get('/dispatch', (req, res) => {
  const service = dispatchService();

  if (!service) {
    return res.status(404).send({ message: 'No requests to dispatch' });
  }

  res.status(200).send({ message: 'Service dispatched', service });
});

// Endpoint to undo the last dispatch
app.post('/undo', (req, res) => {
  if (dispatchedServicesStack.length === 0) {
    return res.status(404).send({ message: 'No dispatches to undo' });
  }

  const lastDispatched = dispatchedServicesStack.pop();
  enqueueRequest(lastDispatched);
  res.status(200).send({ message: 'Dispatch undone', lastDispatched });
});

// Endpoint to generate daily logs in a .csv file
app.get('/generate-daily-log', (req, res) => {
  const data = fs.readFileSync(logsFilePath, 'utf-8');
  const logs = JSON.parse(data);

  const csvData = logs.map(log => `${log.id},${log.description},${log.priority}`).join('\n');
  const headers = 'ID,Description,Priority\n';
  fs.writeFileSync(csvFilePath, headers + csvData, 'utf-8');

  res.status(200).send({ message: 'Daily log generated', filePath: 'daily_log.csv' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
