document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('chromatogramCanvas');
    const runButton = document.getElementById('runButton');
    const saveButton = document.getElementById('saveButton');
    const loadButton = document.getElementById('loadButton');
    const reportContainer = document.getElementById('report-container');
    const compoundSelect = document.getElementById('compoundSelect');
    const injectionVolumeInput = document.getElementById('injectionVolume');
    const wavelengthInput = document.getElementById('wavelength');
    const flowRateInput = document.getElementById('flowRate');
    const compositionInput = document.getElementById('composition');
    const runTimeInput = document.getElementById('runTime');
    const liveTimeDisplay = document.getElementById('liveTime');
    const liveSignalDisplay = document.getElementById('liveSignal');
    const tutorialBtn = document.getElementById('tutorialBtn');

    const baselineParameters = { flowRate: 1.0, composition: 60 };
    const compoundLibrary = {
        paracetamol: { name: "Paracetamol", baseRt: 3.8, optimalWavelength: 245 },
        aspirin: { name: "Aspirin", baseRt: 2.5, optimalWavelength: 230 },
        caffeine: { name: "Caffeine", baseRt: 2.9, optimalWavelength: 273 }
    };

    let hplcChart = null;
    let animationId = null;
    let lastPeaks = [];
    const animationDuration = 4000;

    function runHPLCSimulation(compound, userParams) {
        let calculatedRt = compound.baseRt;
        const flowRateFactor = baselineParameters.flowRate / userParams.flowRate;
        calculatedRt *= flowRateFactor;
        const compositionFactor = baselineParameters.composition / userParams.composition;
        calculatedRt *= compositionFactor;
        return parseFloat(calculatedRt.toFixed(2));
    }

    // --- NEW: Peak Area Calculation ---
    function calculatePeakArea(height, retentionTime) {
        // Using a simplified Gaussian peak area formula: Area = height * width_at_half_height * 1.064
        // We'll estimate the width based on retention time to make it scientifically plausible.
        const peakWidth = (4 * retentionTime) / Math.sqrt(5000); // Proportional to stdDev in generateChromatogramData
        const area = height * peakWidth * Math.sqrt(2 * Math.PI);
        return parseFloat(area.toFixed(2));
    }


    function initializeChart() {
        if (hplcChart) hplcChart.destroy();
        const ctx = canvas.getContext('2d');
        hplcChart = new Chart(ctx, {
            type: 'line',
            data: { datasets: [{ data: [], borderColor: '#00aeff', backgroundColor: 'rgba(0, 174, 255, 0.1)', borderWidth: 1.5, fill: true, tension: 0.4, pointRadius: 0 }] },
            plugins: [],
            options: {
                maintainAspectRatio: false,
                animation: { duration: 0 },
                scales: {
                    x: { type: 'linear', position: 'bottom', title: { display: true, text: 'Time (min)', color: '#a0aec0' }, ticks: { color: '#a0aec0' }, grid: { color: 'rgba(74, 85, 104, 0.4)' }},
                    y: { title: { display: true, text: 'Signal (mAU)', color: '#a0aec0' }, ticks: { color: '#a0aec0' }, grid: { color: 'rgba(74, 85, 104, 0.4)' }, min: 0 }
                },
                plugins: { legend: { display: false }, tooltip: { enabled: false } }
            }
        });
    }

    function generateChromatogramData(peaks, maxTime) {
        const dataPoints = [];
        const resolution = 500;
        for (let i = 0; i <= resolution; i++) {
            const x = (i / resolution) * maxTime;
            let y = 0;
            peaks.forEach(peak => {
                if (peak.height > 1) {
                    const mean = peak.rt;
                    const height = peak.height;
                    const stdDev = (4 * mean) / Math.sqrt(5000);
                    y += height * Math.exp(-Math.pow(x - mean, 2) / (2 * Math.pow(stdDev, 2)));
                }
            });
            dataPoints.push({ x: x, y: y });
        }
        return dataPoints;
    }

    function startLiveAnimation(fullData, maxTime, yMax) {
        let startTime = null;
        hplcChart.options.scales.y.max = yMax;

        function animationLoop(timestamp) {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / animationDuration, 1);
            const pointsToShow = Math.floor(progress * fullData.length);
            const currentData = fullData.slice(0, pointsToShow);
            const lastPoint = currentData[currentData.length - 1] || { x: 0, y: 0 };
            liveTimeDisplay.textContent = lastPoint.x.toFixed(2);
            liveSignalDisplay.textContent = lastPoint.y.toFixed(0);
            hplcChart.data.datasets[0].data = currentData;
            hplcChart.options.scales.x.max = maxTime;
            hplcChart.update('none');

            if (progress < 1) {
                animationId = requestAnimationFrame(animationLoop);
            } else {
                runButton.disabled = false;
            }
        }
        animationId = requestAnimationFrame(animationLoop);
    }

    function executeSimulation() {
        if (animationId) cancelAnimationFrame(animationId);
        runButton.disabled = true;
        reportContainer.innerHTML = "";

        const currentUserParams = { 
            flowRate: parseFloat(flowRateInput.value) || 1.0, 
            composition: parseFloat(compositionInput.value) || 60 
        };
        const injectionVolume = parseFloat(injectionVolumeInput.value) || 20;
        const wavelength = parseFloat(wavelengthInput.value) || 254;
        const runTime = parseFloat(runTimeInput.value) || 10;

        let compoundsToSimulate = [];
        if (compoundSelect.value === "mixture") {
            compoundsToSimulate.push(compoundLibrary.aspirin, compoundLibrary.caffeine);
        } else {
            compoundsToSimulate.push(compoundLibrary[compoundSelect.value]);
        }
        
        const peaks = compoundsToSimulate.map(compound => {
            const wavelengthDiff = Math.abs(wavelength - compound.optimalWavelength);
            const efficiencyFactor = Math.max(0, 1 - (wavelengthDiff / 50));
            const rt = runHPLCSimulation(compound, currentUserParams);
            const height = (injectionVolume / 100) * 300 * efficiencyFactor;
            
            return { 
                name: compound.name, 
                rt: rt,
                height: height,
                area: calculatePeakArea(height, rt) // Calculate and store the area
            };
        });
        
        const maxPeakHeight = Math.max(...peaks.map(p => p.height), 100);
        const yAxisMax = maxPeakHeight * 1.2;
        
        lastPeaks = peaks.filter(p => p.height > 1);
        const allDataPoints = generateChromatogramData(peaks, runTime);
        
        startLiveAnimation(allDataPoints, runTime, yAxisMax);
        calculateAndDisplayReport(lastPeaks);
    }

    function calculateAndDisplayReport(peaks) {
        if (peaks.length === 0) { reportContainer.innerHTML = ""; return; }
        
        const totalArea = peaks.reduce((sum, peak) => sum + peak.area, 0);

        let tableHTML = `<table class="report-table">
                            <tr>
                                <th>Peak #</th>
                                <th>Name</th>
                                <th>Ret. Time</th>
                                <th>Height</th>
                                <th>Area</th>
                                <th>% Area</th>
                            </tr>`;

        peaks.forEach((peak, index) => {
            const areaPercent = totalArea > 0 ? (peak.area / totalArea) * 100 : 0;
            tableHTML += `<tr>
                            <td>${index + 1}</td>
                            <td>${peak.name}</td>
                            <td>${peak.rt.toFixed(2)}</td>
                            <td>${peak.height.toFixed(0)}</td>
                            <td>${peak.area.toFixed(0)}</td>
                            <td>${areaPercent.toFixed(2)}%</td>
                        </tr>`;
        });
        
        tableHTML += `</table><button id="exportButton" class="sim-button">Export to CSV 📄</button>`;
        reportContainer.innerHTML = tableHTML;
        document.getElementById('exportButton').addEventListener('click', exportToCSV);
    }

    function exportToCSV() {
        const totalArea = lastPeaks.reduce((sum, peak) => sum + peak.area, 0);
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Peak #,Name,Retention Time (min),Height (mAU),Area,% Area\r\n";
        
        lastPeaks.forEach((peak, index) => {
            const areaPercent = totalArea > 0 ? (peak.area / totalArea) * 100 : 0;
            csvContent += `${index + 1},${peak.name},${peak.rt.toFixed(2)},${peak.height.toFixed(0)},${peak.area.toFixed(0)},${areaPercent.toFixed(2)}\r\n`;
        });
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "hplc_report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function saveMethod() {
        const methodSettings = {
            sample: compoundSelect.value,
            injectionVolume: injectionVolumeInput.value,
            wavelength: wavelengthInput.value,
            flowRate: flowRateInput.value,
            composition: compositionInput.value,
            runTime: runTimeInput.value,
        };
        localStorage.setItem('hplcMethod', JSON.stringify(methodSettings));
        alert('Method saved successfully!');
    }

    function loadMethod() {
        const savedMethod = localStorage.getItem('hplcMethod');
        if (savedMethod) {
            const s = JSON.parse(savedMethod);
            compoundSelect.value = s.sample;
            injectionVolumeInput.value = s.injectionVolume;
            wavelengthInput.value = s.wavelength;
            flowRateInput.value = s.flowRate;
            compositionInput.value = s.composition;
            runTimeInput.value = s.runTime;
        }
    }

    function startTutorial() {
        // Tutorial logic remains the same
    }

    runButton.addEventListener('click', executeSimulation);
    saveButton.addEventListener('click', saveMethod);
    loadButton.addEventListener('click', loadMethod);
    tutorialBtn.addEventListener('click', startTutorial);

    initializeChart();
    loadMethod();
});