document.addEventListener('DOMContentLoaded', () => {
    // --- Element Connections ---
    const canvas = document.getElementById('gcChart');
    const setTempsBtn = document.getElementById('setTempsBtn');
    const injectBtn = document.getElementById('injectBtn');
    const reportContainer = document.getElementById('report-container');
    const sampleSelect = document.getElementById('sampleSelect');
    const initialTempInput = document.getElementById('initialTemp');
    const rampRateInput = document.getElementById('rampRate');
    const runTimeInput = document.getElementById('runTime');
    const liveTimeDisplay = document.getElementById('liveTime');
    const liveTempDisplay = document.getElementById('liveTemp');
    const liveSignalDisplay = document.getElementById('liveSignal');
    const tutorialBtn = document.getElementById('tutorialBtn');

    let gcChart = null;
    let animationId = null;
    const animationDuration = 5000;

    // --- Scientific Data Library for GC Samples ---
    const sampleLibrary = {
        alcohols: [
            { name: 'Methanol', boilingPoint: 65, height: 250 },
            { name: 'Ethanol', boilingPoint: 78, height: 300 },
            { name: 'Propanol', boilingPoint: 97, height: 200 }
        ],
        peppermint: [
            { name: 'Menthol', boilingPoint: 212, height: 300 },
            { name: 'Menthone', boilingPoint: 207, height: 250 }
        ]
    };
    
    // --- Main Execution Workflow ---
    setTempsBtn.addEventListener('click', () => {
        setTempsBtn.disabled = true;
        setTempsBtn.textContent = 'Heating...';
        setTimeout(() => {
            setTempsBtn.textContent = 'System is Equilibrated ✔';
            injectBtn.disabled = false;
        }, 2000);
    });
    
    injectBtn.addEventListener('click', () => {
        if (animationId) cancelAnimationFrame(animationId);
        injectBtn.disabled = true;
        reportContainer.innerHTML = "";

        // Input validation
        const initialTemp = parseFloat(initialTempInput.value) || 50;
        const rampRate = parseFloat(rampRateInput.value) || 10;
        const runTime = parseFloat(runTimeInput.value) || 12;

        const program = {
            initialTemp: initialTemp,
            rampRate: rampRate,
            finalTemp: 250, // Simplified final temp
            runTime: runTime
        };
        const selectedSample = sampleLibrary[sampleSelect.value];
        const peaks = selectedSample.map(compound => ({
            name: compound.name,
            rt: calculateRetentionTime(compound, program),
            height: compound.height
        }));
        const maxPeakHeight = Math.max(...peaks.map(p => p.height), 100);
        program.yMax = maxPeakHeight * 1.2;
        const allDataPoints = generateChromatogramData(peaks, program.runTime);
        startLiveAnimation(allDataPoints, program);
        calculateAndDisplayReport(peaks);
    });

    // --- NEW: GUIDED TOUR LOGIC ---
    function startTutorial() {
        const tour = new Shepherd.Tour({
            useModalOverlay: true,
            defaultStepOptions: {
                classes: 'shepherd-tour',
                scrollTo: { behavior: 'smooth', block: 'center' },
                cancelIcon: { enabled: true },
            }
        });
        tour.addStep({
            title: 'Welcome to the GC Simulator!',
            text: 'This tour explains the temperature-driven workflow of Gas Chromatography.',
            buttons: [{ text: 'Next', action: tour.next }]
        });
        tour.addStep({
            title: 'Oven Temperature Program',
            text: 'In GC, separation is controlled by heat. You must set an initial temperature and a ramp rate (how fast it heats up). This program is crucial for good results.',
            attachTo: { element: '.param-title', on: 'right' },
            buttons: [{ text: 'Back', action: tour.back }, { text: 'Next', action: tour.next }]
        });
        tour.addStep({
            title: 'Step 1: Equilibrate System',
            text: 'Before injecting, the instrument must heat up and stabilize at your set temperatures. Click this button first to begin the process.',
            attachTo: { element: '#setTempsBtn', on: 'right' },
            buttons: [{ text: 'Back', action: tour.back }, { text: 'Next', action: tour.next }]
        });
        tour.addStep({
            title: 'Step 2: Inject Sample',
            text: 'Once the system is hot and stable, this button will become active. Clicking it will inject your sample and begin the analysis.',
            attachTo: { element: '#injectBtn', on: 'right' },
            buttons: [{ text: 'Back', action: tour.back }, { text: 'Next', action: tour.next }]
        });
        tour.addStep({
            title: 'Live Readouts & Graph',
            text: 'As the run progresses, you can watch the live oven temperature ramp up here, while the chromatogram is drawn below.',
            attachTo: { element: '#tour-step-4', on: 'left' },
            buttons: [{ text: 'Back', action: tour.back }, { text: 'Finish', action: tour.complete }]
        });
        tour.start();
    }
    
    // --- Full functions needed for copy-pasting ---
    function initializeChart() {
        if (gcChart) gcChart.destroy();
        const ctx = canvas.getContext('2d');
        gcChart = new Chart(ctx, {
            type: 'line',
            data: { datasets: [{ data: [], borderColor: '#00aeff', backgroundColor: 'rgba(0, 174, 255, 0.1)', borderWidth: 1.5, fill: true, tension: 0.4, pointRadius: 0 }] },
            options: {
                maintainAspectRatio: false, animation: { duration: 0 },
                scales: {
                    x: { type: 'linear', position: 'bottom', title: { display: true, text: 'Time (min)', color: '#a0aec0' }, ticks: { color: '#a0aec0' }, grid: { color: 'rgba(74, 85, 104, 0.4)' }},
                    y: { title: { display: true, text: 'Signal', color: '#a0aec0' }, ticks: { color: '#a0aec0' }, grid: { color: 'rgba(74, 85, 104, 0.4)' }, min: 0 }
                },
                plugins: { legend: { display: false }, tooltip: { enabled: false } }
            }
        });
    }
    function calculateRetentionTime(compound, program) {
        const timeToReachBoilingPoint = (compound.boilingPoint - program.initialTemp) / program.rampRate;
        const columnFactor = 0.5 + (compound.boilingPoint / 500);
        return timeToReachBoilingPoint + columnFactor;
    }
    function generateChromatogramData(peaks, maxTime) {
        const dataPoints = [];
        const resolution = 500;
        for (let i = 0; i <= resolution; i++) {
            const x = (i / resolution) * maxTime;
            let y = 0;
            peaks.forEach(peak => {
                const mean = peak.rt;
                const height = peak.height;
                const stdDev = 0.1;
                y += height * Math.exp(-Math.pow(x - mean, 2) / (2 * Math.pow(stdDev, 2)));
            });
            dataPoints.push({ x: x, y: y });
        }
        return dataPoints;
    }
    function startLiveAnimation(fullData, program) {
        let startTime = null;
        gcChart.options.scales.y.max = program.yMax;
        function animationLoop(timestamp) {
            if (!startTime) startTime = timestamp;
            const elapsedTime = timestamp - startTime;
            const progress = Math.min(elapsedTime / animationDuration, 1);
            const pointsToShow = Math.floor(progress * fullData.length);
            const currentData = fullData.slice(0, pointsToShow);
            const lastPoint = currentData[currentData.length - 1] || { x: 0, y: 0 };
            liveTimeDisplay.textContent = lastPoint.x.toFixed(2);
            liveSignalDisplay.textContent = lastPoint.y.toFixed(0);
            const currentTemp = Math.min(program.initialTemp + (lastPoint.x * program.rampRate), program.finalTemp);
            liveTempDisplay.textContent = currentTemp.toFixed(0);
            gcChart.data.datasets[0].data = currentData;
            gcChart.options.scales.x.max = program.runTime;
            gcChart.update('none');
            if (progress < 1) {
                animationId = requestAnimationFrame(animationLoop);
            } else {
                injectBtn.disabled = false;
            }
        }
        animationId = requestAnimationFrame(animationLoop);
    }
    function calculateAndDisplayReport(peaks) {
        let tableHTML = `<table class="report-table"><tr><th>Peak #</th><th>Name</th><th>Ret. Time (min)</th></tr>`;
        peaks.forEach((peak, index) => {
            if (peak.rt < parseFloat(runTimeInput.value)) {
                tableHTML += `<tr><td>${index + 1}</td><td>${peak.name}</td><td>${peak.rt.toFixed(2)}</td></tr>`;
            }
        });
        tableHTML += `</table>`;
        reportContainer.innerHTML = tableHTML;
    }

    tutorialBtn.addEventListener('click', startTutorial);
    initializeChart();
});