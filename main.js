import { DecisionOrchestrator } from './src/core/DecisionOrchestrator.js';
import Chart from 'chart.js/auto';

const cropProfile = {
    name: 'Corn (Golden Variety)',
    maxYield: 10000,
    baseTemp: 10
};

const farmProfile = {
    budget: 5000,
    laborAvailable: 40,
    currentTemp: 22,
    soilMoisture: 0.15
};

const orchestrator = new DecisionOrchestrator(cropProfile, farmProfile);

const elements = {
    chatMessages: document.getElementById('chat-messages'),
    chatInput: document.getElementById('chat-input'),
    btnSend: document.getElementById('btn-send'),
    btnAdvance: document.getElementById('btn-advance'),
    btnShock: document.getElementById('btn-shock'),
    sidebarToggle: document.getElementById('sidebar-toggle'),
    sidebar: document.getElementById('sidebar'),
    stage: document.getElementById('stage-value'),
    potential: document.getElementById('potential-value'),
    health: document.getElementById('health-value'),
    potentialBar: document.getElementById('potential-progress'),
    healthBar: document.getElementById('health-progress'),
    gddBar: document.getElementById('gdd-progress'),
    themeToggle: document.getElementById('theme-toggle'),
    themeIcon: document.getElementById('theme-icon'),
    resourceChartCanvas: document.getElementById('resource-chart'),
    particles: document.getElementById('particles'),
    timeline: document.getElementById('activity-timeline'),
    weatherTemp: document.getElementById('weather-temp'),
    weatherDesc: document.getElementById('weather-desc'),
    btnMic: document.getElementById('btn-mic'),
    voiceWave: document.getElementById('voice-wave')
};

function initParticles() {
    const count = 15;
    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const size = Math.random() * 5 + 2;
        p.style.width = `${size}px`;
        p.style.height = `${size}px`;
        p.style.left = `${Math.random() * 100}%`;
        p.style.top = `${Math.random() * 100}%`;
        p.style.setProperty('--p-x', `${(Math.random() - 0.5) * 200}px`);
        p.style.setProperty('--p-y', `${(Math.random() - 0.5) * 200}px`);
        p.style.animationDelay = `${Math.random() * -20}s`;
        elements.particles.appendChild(p);
    }
}

initParticles();

function addToTimeline(content) {
    const item = document.createElement('div');
    item.className = 'timeline-item';
    item.innerHTML = `
        <div class="timeline-dot"></div>
        <div class="timeline-content">${content}</div>
        <div class="timeline-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
    `;
    elements.timeline.prepend(item);
}

let resourceChart = null;

function initChart() {
    const ctx = elements.resourceChartCanvas.getContext('2d');
    resourceChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Water', 'Nutrients', 'Stability'],
            datasets: [{
                data: [70, 20, 10],
                backgroundColor: ['#32FF7E', '#00D97E', '#1B9D4F'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            cutout: '70%',
            plugins: {
                legend: { display: false },
                tooltip: { enabled: true }
            },
            maintainAspectRatio: false
        }
    });
}

initChart();

function addMessage(text, sender = 'assistant') {
    const wrapper = document.createElement('div');
    wrapper.className = 'message-wrapper';

    const msg = document.createElement('div');
    msg.className = `message ${sender}`;
    msg.innerHTML = text;

    wrapper.appendChild(msg);
    elements.chatMessages.appendChild(wrapper);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

function showTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'typing-indicator';
    indicator.className = 'typing';
    indicator.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
    elements.chatMessages.appendChild(indicator);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    return indicator;
}

function updateWeather(temp) {
    elements.weatherTemp.textContent = `${temp.toFixed(1)}°C`;
    const descriptions = ["Perfect Sowing Conditions", "Optimal Growth Index", "Biologically Stable", "Heat Stress Warning", "Humidity Alert"];
    let desc = descriptions[Math.floor(Math.random() * 2)];
    if (temp > 30) desc = descriptions[3];
    elements.weatherDesc.textContent = desc;
}

function updateUI(state) {
    elements.stage.textContent = state.stage;
    elements.potential.textContent = `${state.potential.toFixed(0)} kg/ha`;
    elements.health.textContent = `${(state.health * 100).toFixed(0)}%`;

    elements.potentialBar.style.width = `${(state.potential / 10000) * 100}%`;
    elements.healthBar.style.width = `${state.health * 100}%`;
    elements.gddBar.style.width = `${(state.gdd / 2000) * 100}%`;

    // Pro Weather Update
    updateWeather(orchestrator.farm.currentTemp);

    // Dynamic Chart Update
    if (resourceChart) {
        const water = (state.moisture || 0.15) * 100;
        const stability = state.health * 100;
        const nutrients = Math.max(0, 100 - water);

        resourceChart.data.datasets[0].data = [water, nutrients, stability];
        resourceChart.update();
    }

    if (state.damaged) {
        elements.sidebar.style.borderColor = "#da3633";
        addMessage("🚨 <b>Biological Alert:</b> Irreversible damage detected.", "assistant");
        addToTimeline("Biological Damage Detected");
    }
}

// Sidebar Toggle Logic
elements.sidebarToggle.addEventListener('click', () => {
    elements.sidebar.classList.toggle('active');
});

elements.btnSend.addEventListener('click', async () => {
    const text = elements.chatInput.value.trim();
    if (!text) return;

    addMessage(text, 'user');
    elements.chatInput.value = '';

    const typing = showTypingIndicator();

    try {
        const result = await orchestrator.processAction(text);
        typing.remove();
        addMessage(result.explanation, 'assistant');
        updateUI(result.newState);
    } catch (error) {
        console.error(error);
        typing.remove();
        addMessage("I'm sorry, I'm having trouble matching your intent with my biological models. Could you try phrasing that differently?", 'assistant');
    }
});

elements.btnAdvance.addEventListener('click', () => {
    orchestrator.stateEngine.advanceStage(100, orchestrator.farm.soilMoisture);
    const newState = orchestrator.stateEngine.getState();
    addMessage("100 Heat Units (GDD) accumulated. The biological clock progresses.", "assistant");
    updateUI(newState);
});

elements.btnShock.addEventListener('click', () => {
    const result = orchestrator.injectShock({ type: 'Drought', severity: 0.2 });
    addMessage(`🚨 Impact: ${result.explanation}`, "assistant");
    updateUI(result.newState);
});

elements.chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') elements.btnSend.click();
});

// Sidebar Toggle
elements.sidebarToggle.addEventListener('click', () => {
    elements.sidebar.classList.toggle('collapsed');
});

// Theme Toggle Logic
elements.themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    elements.themeIcon.innerText = newTheme === 'light' ? '☀️' : '🌙';
    addToTimeline(`UI Switched to ${newTheme.toUpperCase()} mode`);
});

// --- Real Voice-to-Text (Web Speech API) ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US'; // Can be tuned for local languages if supported

    recognition.onstart = () => {
        elements.voiceWave.classList.add('active');
    };

    recognition.onsoundstart = () => {
        elements.voiceWave.classList.add('active');
    };

    recognition.onsoundend = () => {
        // We can keep it active until the whole recognition ends or use sound detection
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        elements.chatInput.value = transcript;
        elements.btnMic.classList.remove('listening');
        elements.voiceWave.classList.remove('active');
        // Auto-send on result
        setTimeout(() => elements.btnSend.click(), 500);
        addToTimeline(`Voice Transcript: "${transcript}"`);
    };

    recognition.onerror = (event) => {
        console.error("Speech Recognition Error:", event.error);
        elements.btnMic.classList.remove('listening');
        elements.voiceWave.classList.remove('active');
        addMessage(`<i>Voice system error: ${event.error}</i>`, "assistant");
    };

    recognition.onend = () => {
        elements.btnMic.classList.remove('listening');
        elements.voiceWave.classList.remove('active');
    };

    elements.btnMic.addEventListener('click', () => {
        if (elements.btnMic.classList.contains('listening')) {
            recognition.stop();
        } else {
            elements.btnMic.classList.add('listening');
            recognition.start();
        }
    });

} else {
    elements.btnMic.addEventListener('click', () => {
        addMessage("<i>Voice recognition is not supported in this browser.</i>", "assistant");
    });
}
