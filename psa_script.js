document.addEventListener('DOMContentLoaded', () => {
    // --- Element Connections ---
    const runButton = document.getElementById('runButton');
    const tutorialBtn = document.getElementById('tutorialBtn');
    const zAverageEl = document.getElementById('zAverage');
    const pdiEl = document.getElementById('pdi');
    const interceptEl = document.getElementById('intercept');
    const qualityEl = document.getElementById('quality');
    const peakTableSummaryBody = document.querySelector('#peak-table-summary tbody');
    const peakTableDetailsBody = document.querySelector('#peak-table-details tbody');
    const canvas = document.getElementById('psaChart');
    const sampleTypeSelect = document.getElementById('sampleType');
    const runLogEl = document.getElementById('run-log');
    const reportQualityCheckEl = document.getElementById('report-quality-check');
    const dispersantSelect = document.getElementById('dispersantSelect');
    const dispersantViscosityInput = document.getElementById('dispersantViscosity');

    let psaChart = null;
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

    // --- Data Libraries ---
    const dispersants = {
        water: { name: 'Water', viscosity: 0.89 },
        ethanol: { name: 'Ethanol', viscosity: 1.07 }
    };

    const samplePresets = {
        liposomes: { name: "Liposomal Drug Delivery", peaks: [{ mean: 120, stdDev: 18, intensity: 100 }] },
        microemulsion: { name: "Microemulsion", peaks: [{ mean: 50, stdDev: 15, intensity: 100 }] },
        raw_powder: { name: "Unprocessed Drug Powder", peaks: [{ mean: 800, stdDev: 55, intensity: 100 }] },
        aggregated_protein: { name: "Aggregated Protein Solution", peaks: [{ mean: 15, stdDev: 10, intensity: 80 }, { mean: 250, stdDev: 40, intensity: 20 }] }
    };

    // --- Data Generation & Calculation ---
    function generateDistributionData(preset) {
        const dataPoints = [];
        const resolution = 250;
        for (let i = 0; i < resolution; i++) {
            const x = Math.pow(10, (i / (resolution - 1)) * 4);
            let y = 0;
            preset.peaks.forEach(peak => {
                y += peak.intensity * (1 / (x * (peak.stdDev / 100) * Math.sqrt(2 * Math.PI))) * Math.exp(-Math.pow(Math.log(x) - Math.log(peak.mean), 2) / (2 * Math.pow((peak.stdDev / 100), 2)));
            });
            dataPoints.push({ x, y });
        }
        const maxY = Math.max(...dataPoints.map(p => p.y));
        return dataPoints.map(p => ({ x: p.x, y: (p.y / maxY) * 100 }));
    }

    function calculateResults(preset) {
        const totalIntensity = preset.peaks.reduce((sum, p) => sum + p.intensity, 0);
        const weightedMean = preset.peaks.reduce((sum, p) => sum + (p.mean * p.intensity / totalIntensity), 0);
        const zAverage = weightedMean * (1 + (Math.random() - 0.5) * 0.05);
        let pdi;
        if (preset.peaks.length > 1 || preset.peaks[0].stdDev > 30) {
            pdi = 0.3 + Math.random() * 0.2;
        } else {
            pdi = 0.05 + Math.random() * 0.1;
        }
        const intercept = 0.9 - (pdi * 0.5) + (Math.random() - 0.5) * 0.05;
        const quality = (pdi < 0.25 && intercept > 0.8) ? 'Good' : 'Warning';
        const peaksData = preset.peaks.map((p, i) => ({
            num: `Peak ${i + 1}`,
            size: p.mean,
            intensity: p.intensity,
            width: p.stdDev * 2
        }));
        return { zAverage: zAverage, pdi: pdi, intercept: intercept, quality: quality, peaks: peaksData };
    }

    // --- UI Update Functions ---
    function clearPreviousResults() {
        zAverageEl.textContent = '--';
        pdiEl.textContent = '--';
        interceptEl.textContent = '--';
        qualityEl.textContent = '--';
        peakTableSummaryBody.innerHTML = '';
        peakTableDetailsBody.innerHTML = '';
        reportQualityCheckEl.textContent = '--';
        if (psaChart) {
            psaChart.data.datasets[0].data = [];
            psaChart.update();
        }
    }

    function populateResults(results) {
        zAverageEl.textContent = results.zAverage.toFixed(2);
        pdiEl.textContent = results.pdi.toFixed(3);
        interceptEl.textContent = results.intercept.toFixed(3);
        qualityEl.textContent = results.quality;
        qualityEl.className = results.quality.toLowerCase();
        reportQualityCheckEl.textContent = results.quality;
        reportQualityCheckEl.className = results.quality.toLowerCase();

        peakTableSummaryBody.innerHTML = '';
        results.peaks.forEach(p => {
            const row = `<tr><td>${p.num}</td><td>${p.size.toFixed(2)}</td><td>${p.intensity.toFixed(1)}</td><td>${p.width.toFixed(2)}</td></tr>`;
            peakTableSummaryBody.innerHTML += row;
        });

        peakTableDetailsBody.innerHTML = `
            <tr><td>Z-Average (d.nm)</td><td>${results.zAverage.toFixed(2)}</td></tr>
            <tr><td>PDI</td><td>${results.pdi.toFixed(3)}</td></tr>
            <tr><td>Intercept</td><td>${results.intercept.toFixed(3)}</td></tr>
        `;
    }

    // --- Charting ---
    function initializeChart() {
        if (psaChart) psaChart.destroy();
        const ctx = canvas.getContext('2d');
        psaChart = new Chart(ctx, {
            type: 'line',
            data: { datasets: [{ data: [], borderColor: '#dcddde', backgroundColor: 'rgba(88, 101, 242, 0.2)', borderWidth: 2, fill: true, tension: 0.1, pointRadius: 0 }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    x: { type: 'logarithmic', title: { display: true, text: 'Size (d.nm)', color: '#8e9297' }, ticks: { color: '#8e9297' }, grid: { color: '#40444b' } },
                    y: { title: { display: true, text: 'Intensity (%)', color: '#8e9297' }, ticks: { color: '#8e9297' }, grid: { color: '#40444b' }, min: 0, max: 110 }
                },
                plugins: { legend: { display: false }, tooltip: { enabled: true } }
            }
        });
    }

    // --- Main Workflow ---
    async function runAnalysis() {
        runButton.disabled = true;
        clearPreviousResults();
        
        const sampleType = sampleTypeSelect.value;
        const preset = samplePresets[sampleType];
        const equilibrationTime = document.getElementById('equilibrationTime').value;
        const numberOfRuns = document.getElementById('numberOfRuns').value;
        const dispersantInfo = dispersants[dispersantSelect.value];
        
        runLogEl.innerHTML = `[${new Date().toLocaleTimeString()}] Analysis started...\n`;
        runLogEl.innerHTML += `> Sample: ${preset.name}\n`;
        runLogEl.innerHTML += `> Dispersant: ${dispersantInfo.name}\n`;
        runLogEl.innerHTML += `> Equilibration: ${equilibrationTime}s, Runs: ${numberOfRuns}\n`;
        runLogEl.innerHTML += `[${new Date().toLocaleTimeString()}] Equilibrating at target temperature...`;
        
        await sleep(1000);
        
        runLogEl.innerHTML += ` Done.\n[${new Date().toLocaleTimeString()}] Acquiring data...`;
        await sleep(1500);
        
        const results = calculateResults(preset);
        const chartData = generateDistributionData(preset);
        
        runLogEl.innerHTML += ` Complete.\n[${new Date().toLocaleTimeString()}] Processing results...`;
        await sleep(500);
        
        populateResults(results);
        psaChart.data.datasets[0].data = chartData;
        psaChart.update();
        
        runLogEl.innerHTML += ` Complete.\n[${new Date().toLocaleTimeString()}] Report Generated. Analysis Finished.`;
        runButton.disabled = false;
    }

    // --- TUTORIAL FUNCTION ---
    function startTutorial() {
        const tour = new Shepherd.Tour({
            useModalOverlay: true,
            defaultStepOptions: {
                classes: 'shepherd-tour',
                scrollTo: { behavior: 'smooth', block: 'center' },
                cancelIcon: { enabled: true }
            }
        });

        tour.addStep({
            title: 'Welcome to the PSA Simulator!',
            text: 'This dashboard simulates a Particle Size Analyzer.',
            attachTo: { element: '#tour-step-1', on: 'bottom' },
            buttons: [{ text: 'Next', action: tour.next }]
        });
        tour.addStep({
            title: 'Step 1: Set Parameters',
            text: '<strong>Step 1:</strong> Customize the experiment here. Choose different sample types and instrument settings to see how they affect the results.',
            attachTo: { element: '#tour-step-3', on: 'right' },
            buttons: [{ text: 'Back', action: tour.back }, { text: 'Next', action: tour.next }]
        });
        tour.addStep({
            title: 'Step 2: Run Analysis',
            text: '<strong>Step 2:</strong> Once your parameters are set, click this main "Run Analysis" button to start a simulation.',
            attachTo: { element: '#tour-step-2', on: 'right' },
            buttons: [{ text: 'Back', action: tour.back }, { text: 'Next', action: tour.next }]
        });
        tour.addStep({
            title: 'Step 3: View Main Results',
            text: '<strong>Step 3:</strong> After the analysis, the main results appear here. You will see the overall Z-Average, PDI, a summary table, and the size distribution graph.',
            attachTo: { element: '#tour-step-4', on: 'bottom' },
            buttons: [{ text: 'Back', action: tour.back }, { text: 'Next', action: tour.next }]
        });
        tour.addStep({
            title: 'Step 4: Check the Log',
            text: '<strong>Step 4:</strong> The bottom panels provide a step-by-step log of the analysis and a detailed breakdown of the results for your report.',
            attachTo: { element: '#tour-step-5', on: 'top' },
            buttons: [{ text: 'Back', action: tour.back }, { text: 'Finish', action: tour.complete }]
        });
        
        tour.start();
    }

    // --- Event Listeners & Initialization ---
    dispersantSelect.addEventListener('change', (e) => {
        dispersantViscosityInput.value = dispersants[e.target.value].viscosity;
    });

    runButton.addEventListener('click', runAnalysis);
    tutorialBtn.addEventListener('click', startTutorial);
    initializeChart();
});