// Demo frontend logic
// - Streams camera into <video>
// - Runs a loop (optional for future real-time)
// - Capture button triggers backend API call

const video = document.getElementById('video');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const captureBtn = document.getElementById('captureBtn');
const statusEl = document.getElementById('status');
const apiLatencyEl = document.getElementById('apiLatency');
const lastPredictionEl = document.getElementById('lastPrediction');
const eventsEl = document.getElementById('events');
const classCountsEl = document.getElementById('classCounts');
const clearLogBtn = document.getElementById('clearLogBtn');
const loadingSpinner = document.getElementById('loadingSpinner');

// Result Card Elements
const resultCard = document.getElementById('resultCard');
const binColorBox = document.getElementById('binColorBox');
const resultObject = document.getElementById('resultObject');
const resultCategory = document.getElementById('resultCategory');
const resultPoints = document.getElementById('resultPoints');
const resultTip = document.getElementById('resultTip');


let stream = null;
let rafId = null;
let ctx = null;
let w = 640, h = 480;
// We set overlay size dynamically based on video size

overlay.width = w;
overlay.height = h;
ctx = overlay.getContext('2d');

const CLASSES = ['Highlight', 'Details'];
const counts = {};

// Chart.js throughput chart
const throughputCtx = document.getElementById('throughputChart').getContext('2d');
const throughputData = {
  labels: [], datasets: [{
    label: 'items/min',
    data: [],
    backgroundColor: '#2563eb',
    borderRadius: 6
  }]
};
const throughputChart = new Chart(throughputCtx, {
  type: 'bar',
  data: throughputData,
  options: { scales: { y: { beginAtZero: true } }, animation: false }
});

function updateCountsUI() {
  classCountsEl.innerHTML = '';
  for (const [c, count] of Object.entries(counts)) {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.innerHTML = `<span style="font-size:0.85rem">${c}</span><strong>${count}</strong>`;
    classCountsEl.appendChild(chip);
  }
}

function logEvent(text) {
  const ts = new Date().toLocaleTimeString();
  const li = document.createElement('li');
  li.className = 'list-group-item';
  li.innerHTML = `<span>${text}</span><span class="text-muted">${ts}</span>`;
  eventsEl.prepend(li); // Newest first

  // keep last 50
  if (eventsEl.children.length > 50) {
    eventsEl.removeChild(eventsEl.lastChild);
  }
}

function pushThroughput(value) {
  const label = new Date().toLocaleTimeString();
  throughputData.labels.push(label);
  throughputData.datasets[0].data.push(value);
  // keep last 10
  if (throughputData.labels.length > 10) {
    throughputData.labels.shift();
    throughputData.datasets[0].data.shift();
  }
  throughputChart.update();
}

/**
 * Capture frame and send to Backend API
 */
async function analyzeImage() {
  if (!stream) {
    logEvent("Camera not started!");
    return;
  }

  // UI Loading State
  loadingSpinner.style.display = 'block';
  captureBtn.disabled = true;
  statusEl.textContent = 'Status: Analyzing...';

  try {
    // 1. Capture frame to blob
    const cap = document.createElement('canvas');
    cap.width = video.videoWidth;
    cap.height = video.videoHeight;
    cap.getContext('2d').drawImage(video, 0, 0, cap.width, cap.height);

    // Convert to blob
    const blob = await new Promise(resolve => cap.toBlob(resolve, 'image/jpeg', 0.8));

    const formData = new FormData();
    formData.append('image', blob, 'capture.jpg');

    // 2. Send to Backend
    const t0 = performance.now();
    const response = await fetch('http://localhost:8000/predict-waste', {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json'
      }
    });
    const t1 = performance.now();
    const latency = Math.round(t1 - t0);
    apiLatencyEl.textContent = `Latency: ${latency}ms`;

    if (!response.ok) {
      let errorDetail = `Server error: ${response.status}`;
      try {
        const errData = await response.json();
        if (errData.detail) errorDetail = errData.detail;
      } catch (e) { /* ignore json parse error on error response */ }
      throw new Error(errorDetail);
    }

    const result = await response.json();
    console.log("AI Result:", result);

    // 3. Update UI
    displayResult(result);
    logEvent(`Analyzed: ${result.object} (${result.category})`);

    // Update simple stats
    const cat = result.category || 'Unknown';
    counts[cat] = (counts[cat] || 0) + 1;
    updateCountsUI();

    // Update throughput
    // (Simple hack: just increment items/min by 1 for this minute block - visualization is approximate)
    const currentVal = throughputData.datasets[0].data[throughputData.datasets[0].data.length - 1] || 0;
    throughputData.datasets[0].data[throughputData.datasets[0].data.length - 1] = currentVal + 1;
    throughputChart.update();

  } catch (err) {
    console.error(err);
    logEvent(`Error: ${err.message}`);
    alert("Analysis failed. See log.");
  } finally {
    loadingSpinner.style.display = 'none';
    captureBtn.disabled = false;
    statusEl.textContent = 'Status: running';
  }
}

function displayResult(data) {
  // Expects: { object, category, highlight_color, bin, tip, points }
  resultCard.style.display = 'block';

  resultObject.textContent = data.object || "Unknown Object";
  resultCategory.textContent = data.category || "Unknown Category";
  resultPoints.textContent = `+${data.points || 0}`;
  resultTip.textContent = data.tip || "No tip available.";

  // Bin Color Box
  binColorBox.style.backgroundColor = data.highlight_color || '#ccc';
  // If highlight_color is meant for bounding box, maybe the bin color is data.bin (string)
  // The prompt says: "Assign highlight color... Recommend correct dustbin color."
  // Let's use `highlight_color` for the box as per the prompt logic mapping (Green=Wet, Blue=Dry).

  lastPredictionEl.textContent = `${data.object} -> ${data.bin} bin`;
}


// Camera Loop (Mainly just to keep video active, we removed mock inference loop)
async function processFrameLoop() {
  if (video.readyState < 2) {
    rafId = requestAnimationFrame(processFrameLoop);
    return;
  }
  // We can add real-time bounding box visualization here if the API returned coordinates, 
  // but for now it's just a static classification on capture.

  // Clear overlay
  ctx.clearRect(0, 0, overlay.width, overlay.height);

  rafId = requestAnimationFrame(processFrameLoop);
}

startBtn.addEventListener('click', async () => {
  if (stream) return;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
    video.srcObject = stream;
    statusEl.textContent = 'Status: running';

    video.addEventListener('loadedmetadata', () => {
      overlay.width = video.videoWidth;
      overlay.height = video.videoHeight;
      w = video.videoWidth;
      h = video.videoHeight;
    });

    rafId = requestAnimationFrame(processFrameLoop);
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Status: camera error';
    alert("Could not access camera. Ensure you have given permission.");
  }
});

stopBtn.addEventListener('click', () => {
  if (rafId) cancelAnimationFrame(rafId);
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }
  statusEl.textContent = 'Status: stopped';
  video.srcObject = null;
});

captureBtn.addEventListener('click', () => {
  analyzeImage();
});

clearLogBtn.addEventListener('click', () => {
  eventsEl.innerHTML = '';
});


// Initialization
updateCountsUI();
// Add initial empty data point for chart
pushThroughput(0);

// Update chart every minute (just shift)
setInterval(() => {
  pushThroughput(0);
}, 60000);
