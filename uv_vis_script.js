document.addEventListener('DOMContentLoaded', () => {
    // --- Data Store ---
    const compoundData = {
        "paracetamol": { "name": "Paracetamol", "lambdaMax": 245, "absorptivity": 0.715 },
        "ibuprofen": { "name": "Ibuprofen", "lambdaMax": 222, "absorptivity": 0.450 },
        "caffeine": { "name": "Caffeine", "lambdaMax": 273, "absorptivity": 0.504 },
        "aspirin": { "name": "Aspirin", "lambdaMax": 230, "absorptivity": 0.500 },
        "diclofenac": { "name": "Diclofenac Sodium", "lambdaMax": 276, "absorptivity": 0.380 },
        "loratadine": { "name": "Loratadine", "lambdaMax": 247, "absorptivity": 0.420 },
        "ranitidine": { "name": "Ranitidine HCl", "lambdaMax": 314, "absorptivity": 0.405 },
        "salbutamol": { "name": "Salbutamol", "lambdaMax": 276, "absorptivity": 0.055 },
        "theophylline": { "name": "Theophylline", "lambdaMax": 272, "absorptivity": 0.530 },
        "metronidazole": { "name": "Metronidazole", "lambdaMax": 320, "absorptivity": 0.375 }
    };
    let activeCompound = null;
    let calibrationStandards = [];
    let unknownAbsorbance = 0;

    // --- Element Connections ---
    const sampleSelect = document.getElementById('sampleSelect');
    const scanButton = document.getElementById('scanButton');
    const setWavelengthInput = document.getElementById('setWavelengthInput');
    const measureStandardsButton = document.getElementById('measureStandardsButton');
    const unknownConcentrationInput = document.getElementById('unknownConcentrationInput');
    const measureUnknownButton = document.getElementById('measureUnknownButton');
    const resultsDisplay = document.getElementById('results-display');
    const regressionEquationDisplay = document.getElementById('regression-equation');
    const finalResultDisplay = document.getElementById('final-result');
    const tutorialBtn = document.getElementById('tutorialBtn');
    const workflowSections = document.querySelectorAll('.workflow-section');
    const scanChartEl = document.getElementById('scanChart');
    const calibChartEl = document.getElementById('calibChart');
    const scanChartCtx = scanChartEl.getContext('2d');
    const calibChartCtx = calibChartEl.getContext('2d');
    let scanChart, calibChart;

    // --- Data Loading ---
    function populateDropdown() {
        for (const [key, value] of Object.entries(compoundData)) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = value.name;
            sampleSelect.appendChild(option);
        }
    }

    // --- Chart Initialization ---
    function initializeCharts() {
        scanChart = new Chart(scanChartCtx, {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Absorbance', data: [], borderColor: '#00aeff', borderWidth: 2, pointRadius: 0, tension: 0.4 }] },
            options: { maintainAspectRatio: false, scales: { x: { title: { display: true, text: 'Wavelength (nm)', color: '#a0aec0' }, ticks: { color: '#a0aec0' }, grid: { color: 'rgba(74, 85, 104, 0.4)' } }, y: { title: { display: true, text: 'Absorbance', color: '#a0aec0' }, min: 0, ticks: { color: '#a0aec0' }, grid: { color: 'rgba(74, 85, 104, 0.4)' } } }, plugins: { legend: { display: false } } }
        });
        calibChart = new Chart(calibChartCtx, {
            type: 'scatter',
            data: { datasets: [
                { label: 'Standards', data: [], backgroundColor: '#00aeff', pointRadius: 6 },
                { label: 'Regression Line', type: 'line', data: [], borderColor: '#e74c3c', borderWidth: 2, pointRadius: 0, fill: false }
            ] },
            options: { maintainAspectRatio: false, scales: { x: { title: { display: true, text: 'Concentration (mg/L)', color: '#a0aec0' }, min: 0, ticks: { color: '#a0aec0' }, grid: { color: 'rgba(74, 85, 104, 0.4)' } }, y: { title: { display: true, text: 'Absorbance', color: '#a0aec0' }, min: 0, ticks: { color: '#a0aec0' }, grid: { color: 'rgba(74, 85, 104, 0.4)' } } }, plugins: { legend: { display: false } } }
        });
    }

    // --- Workflow Logic ---
    function updateWorkflowState(activeIndex) {
        scanChartEl.style.display = 'none';
        calibChartEl.style.display = 'none';
        workflowSections.forEach((section, index) => {
            if (index === activeIndex) {
                section.classList.add('active');
            } else {
                section.classList.remove('active');
            }
        });

        if (activeIndex === 0 || activeIndex === 1) {
            scanChartEl.style.display = 'block';
        }
        if (activeIndex > 0 && calibrationStandards.length > 0) {
            calibChartEl.style.display = 'block';
            scanChartEl.style.display = 'none';
        }
    }

    function runWavelengthScan() {
        const selectedId = sampleSelect.value;
        activeCompound = compoundData[selectedId];
        const labels = [], data = [];
        const lambdaMax = activeCompound.lambdaMax;
        const peakWidth = 40; 
        for (let wl = 200; wl <= 400; wl += 2) {
            labels.push(wl);
            const noise = (Math.random() - 0.5) * 0.02;
            const absorbance = 0.8 * Math.exp(-Math.pow(wl - lambdaMax, 2) / (2 * Math.pow(peakWidth, 2)));
            data.push(Math.max(0, absorbance + noise));
        }
        scanChart.data.labels = labels;
        scanChart.data.datasets[0].data = data;
        scanChart.update();
        resultsDisplay.innerHTML = `<p>Scan Complete. <br>λmax found at: <strong>${lambdaMax} nm</strong></p>`;
        setWavelengthInput.value = lambdaMax;
        updateWorkflowState(1);
    }

    function runCalibration() {
        if (!activeCompound || !setWavelengthInput.value) return;
        const concentrations = [2, 4, 6, 8, 10];
        calibrationStandards = concentrations.map(conc => {
            const absorbance = activeCompound.absorptivity * conc / 10 + ((Math.random() - 0.5) * 0.015);
            return { x: conc, y: parseFloat(absorbance.toFixed(3)) };
        });
        const { slope, intercept, r2 } = linearRegression(calibrationStandards.map(d => d.x), calibrationStandards.map(d => d.y));
        const regressionLine = [{x: 0, y: intercept}, {x: 10, y: 10 * slope + intercept}];
        calibChart.data.datasets[0].data = calibrationStandards;
        calibChart.data.datasets[1].data = regressionLine;
        calibChart.update();
        regressionEquationDisplay.textContent = `y = ${slope.toFixed(3)}x + ${intercept.toFixed(3)} (R² = ${r2.toFixed(4)})`;
        updateWorkflowState(2);
    }

    function measureUnknown() {
        if (calibrationStandards.length === 0) return;
        const trueConc = parseFloat(unknownConcentrationInput.value);
        if (isNaN(trueConc)) return;
        unknownAbsorbance = activeCompound.absorptivity * trueConc / 10 + ((Math.random() - 0.5) * 0.015);
        const { slope, intercept } = linearRegression(calibrationStandards.map(d => d.x), calibrationStandards.map(d => d.y));
        const calculatedConc = (unknownAbsorbance - intercept) / slope;
        finalResultDisplay.innerHTML = `<p>Measured Absorbance: <strong>${unknownAbsorbance.toFixed(3)}</strong></p><p>Calculated Concentration: <strong>${calculatedConc.toFixed(2)} mg/L</strong></p>`;
    }

    function linearRegression(x, y) {
        const n = x.length; let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        for (let i = 0; i < n; i++) { sumX += x[i]; sumY += y[i]; sumXY += x[i] * y[i]; sumX2 += x[i] * x[i]; }
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        let ssr = 0, sst = 0; const yMean = sumY / n;
        for (let i = 0; i < n; i++) { const predictedY = slope * x[i] + intercept; ssr += (y[i] - predictedY) ** 2; sst += (y[i] - yMean) ** 2; }
        const r2 = 1 - (ssr / sst);
        return { slope, intercept, r2 };
    }

    function startTutorial() {
        const tour = new Shepherd.Tour({
            useModalOverlay: true,
            defaultStepOptions: { classes: 'shepherd-tour', scrollTo: { behavior: 'smooth', block: 'center' }, cancelIcon: { enabled: true } }
        });
        tour.addStep({ title: 'Welcome to the UV-Vis Simulator!', text: 'This tour explains the three-step workflow for quantitative analysis.', buttons: [{ text: 'Next', action: tour.next }] });
        tour.addStep({ title: 'Step 1: Wavelength Scan', text: 'First, select your compound and run a scan to find its λmax (lambda max), the wavelength where it absorbs the most light.', attachTo: { element: '#workflow-1', on: 'right' }, buttons: [{ text: 'Back', action: tour.back }, { text: 'Next', action: tour.next }] });
        tour.addStep({ title: 'Step 2: Create Calibration Curve', text: 'Once you find the λmax, use that wavelength to measure the absorbance of several standard solutions with known concentrations. This creates a calibration curve.', attachTo: { element: '#workflow-2', on: 'right' }, buttons: [{ text: 'Back', action: tour.back }, { text: 'Next', action: tour.next }] });
        tour.addStep({ title: 'Step 3: Analyze Unknown', text: 'Finally, measure the absorbance of your "unknown" sample. The simulator will use the calibration curve to calculate its concentration.', attachTo: { element: '#workflow-3', on: 'right' }, buttons: [{ text: 'Back', action: tour.back }, { text: 'Finish', action: tour.complete }] });
        tour.start();
    }

    // --- Event Listeners & Initialization ---
    populateDropdown();
    initializeCharts();
    scanButton.addEventListener('click', runWavelengthScan);
    measureStandardsButton.addEventListener('click', runCalibration);
    measureUnknownButton.addEventListener('click', measureUnknown);
    tutorialBtn.addEventListener('click', startTutorial);
    updateWorkflowState(0);
});