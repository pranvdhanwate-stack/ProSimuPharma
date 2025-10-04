document.addEventListener('DOMContentLoaded', () => {
    // --- Element Connections ---
    const canvas = document.getElementById('ftirChart');
    const statusText = document.getElementById('statusText');
    const backgroundScanBtn = document.getElementById('backgroundScanBtn');
    const sampleScanBtn = document.getElementById('sampleScanBtn');
    const sampleSelect = document.getElementById('sampleSelect');
    const analysisSection = document.getElementById('analysis-section');
    const standardSelect = document.getElementById('standardSelect');
    const overlayBtn = document.getElementById('overlayBtn');
    const tutorialBtn = document.getElementById('tutorialBtn');
    const matchResultContainer = document.getElementById('match-result-container');
    const peakTooltip = document.getElementById('peak-tooltip');

    let ftirChart = null;
    let currentSampleId = null;
    let activePeaks = [];

    // --- Scientific Data Library with Functional Group Info ---
    const spectralData = {
        paracetamol: {
            id: 'paracetamol',
            name: 'Paracetamol',
            peaks: [
                { wn: 3320, intensity: 50, width: 80, group: 'O-H Stretch (Phenol)' },
                { wn: 3160, intensity: 40, width: 50, group: 'N-H Stretch (Amide)' },
                { wn: 1650, intensity: 10, width: 8, group: 'C=O Stretch (Amide I)' },
                { wn: 1560, intensity: 20, width: 15, group: 'N-H Bend (Amide II)' },
                { wn: 1505, intensity: 25, width: 10, group: 'C=C Stretch (Aromatic)' },
                { wn: 1260, intensity: 35, width: 20, group: 'C-O Stretch (Phenol)' },
                { wn: 837, intensity: 45, width: 10, group: 'Para Disubstituted Benzene' }
            ]
        },
        ipa: {
            id: 'ipa',
            name: 'Isopropyl Alcohol',
            peaks: [
                { wn: 3350, intensity: 15, width: 150, group: 'O-H Stretch (Alcohol)' },
                { wn: 2970, intensity: 10, width: 20, group: 'C-H Stretch (Alkane)' },
                { wn: 1380, intensity: 50, width: 10, group: 'C-H Bend (Alkane)' },
                { wn: 1130, intensity: 40, width: 30, group: 'C-O Stretch (Alcohol)' },
                { wn: 950, intensity: 60, width: 15, group: 'C-C Stretch' }
            ]
        }
    };

    function initializeChart() {
        if (ftirChart) { ftirChart.destroy(); }
        const ctx = canvas.getContext('2d');
        ftirChart = new Chart(ctx, {
            type: 'line', data: { datasets: [] },
            options: {
                maintainAspectRatio: false, animation: { duration: 0 },
                scales: {
                    x: { type: 'linear', reverse: true, min: 400, max: 4000, title: { display: true, text: 'Wavenumber (cm⁻¹)', color: '#a0aec0' }, ticks: { color: '#a0aec0' }, grid: { color: 'rgba(74, 85, 104, 0.4)' } },
                    y: { min: 0, max: 110, title: { display: true, text: '% Transmittance', color: '#a0aec0' }, ticks: { color: '#a0aec0' }, grid: { color: 'rgba(74, 85, 104, 0.4)' } }
                },
                plugins: { legend: { labels: { color: '#e2e8f0' } }, tooltip: { enabled: false } }
            }
        });
        canvas.addEventListener('click', handleChartClick);
    }

    function generateSpectrumData(peaks) {
        const dataPoints = []; const resolution = 4;
        for (let wn = 4000; wn >= 400; wn -= resolution) {
            let transmittance = 100 - (Math.random() * 1.5);
            peaks.forEach(peak => {
                const { wn: mean, intensity, width } = peak;
                const stdDev = width / resolution;
                transmittance -= intensity * Math.exp(-Math.pow(wn - mean, 2) / (2 * Math.pow(stdDev, 2)));
            });
            dataPoints.push({ x: wn, y: Math.max(0, transmittance) });
        }
        return dataPoints;
    }

    function handleChartClick(evt) {
        const points = ftirChart.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
        if (points.length === 0 || activePeaks.length === 0) { peakTooltip.style.display = 'none'; return; }
        const clickedX = ftirChart.scales.x.getValueForPixel(evt.offsetX);
        const clickedY = ftirChart.scales.y.getValueForPixel(evt.offsetY);
        let closestPeak = null; let minDistance = Infinity;
        activePeaks.forEach(peak => {
            const dataPoint = ftirChart.data.datasets[0].data.find(d => Math.abs(d.x - peak.wn) < 5);
            if (dataPoint) {
                const distance = Math.hypot(clickedX - peak.wn, clickedY - dataPoint.y);
                if (distance < minDistance && distance < 200) { minDistance = distance; closestPeak = peak; }
            }
        });
        if (closestPeak) {
            peakTooltip.innerHTML = `<strong>${closestPeak.wn} cm⁻¹</strong><br>${closestPeak.group}`;
            peakTooltip.style.left = `${evt.offsetX}px`;
            peakTooltip.style.top = `${evt.offsetY - 10}px`;
            peakTooltip.style.display = 'block';
        } else {
            peakTooltip.style.display = 'none';
        }
    }

    function animateScan(fullData, completeMessage) {
        let startTime = null; const animationDuration = 2500;
        function animationLoop(timestamp) {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / animationDuration, 1);
            const pointsToShow = Math.floor(progress * fullData.length);
            if (ftirChart.data.datasets.length > 0) {
                ftirChart.data.datasets[0].data = fullData.slice(0, pointsToShow);
                ftirChart.update('none');
            }
            if (progress < 1) { requestAnimationFrame(animationLoop); }
            else { statusText.textContent = completeMessage; analysisSection.style.visibility = 'visible'; }
        }
        requestAnimationFrame(animationLoop);
    }

    function calculateMatchScore(sampleId, standardId) {
        if (!sampleId || !standardId || standardId === 'none') { return { score: 0, message: "Please select a valid standard." }; }
        const samplePeaks = spectralData[sampleId].peaks.map(p => p.wn);
        const standardPeaks = spectralData[standardId].peaks.map(p => p.wn);
        const tolerance = 25; let matchedPeaks = 0;
        samplePeaks.forEach(sampleWavenumber => {
            if (standardPeaks.some(standardWavenumber => Math.abs(sampleWavenumber - standardWavenumber) <= tolerance)) { matchedPeaks++; }
        });
        const score = (matchedPeaks / samplePeaks.length) * 100;
        if (sampleId === standardId) {
            const finalScore = 95 + (Math.random() * 4);
            return { score: finalScore, isMatch: true, message: `<span class="match-success">✔ Match Found!</span><br>${finalScore.toFixed(1)}% similarity to ${spectralData[standardId].name}.` };
        } else {
            const finalScore = score * 0.8 + (Math.random() * 10);
            return { score: finalScore, isMatch: false, message: `<span class="match-fail">❌ No Match.</span><br>Only ${finalScore.toFixed(1)}% similarity to ${spectralData[standardId].name}.` };
        }
    }

    backgroundScanBtn.addEventListener('click', () => {
        statusText.textContent = "Scanning Background...";
        backgroundScanBtn.disabled = true;
        peakTooltip.style.display = 'none';
        setTimeout(() => { statusText.textContent = "Ready for Sample"; sampleScanBtn.disabled = false; }, 2000);
    });

    sampleScanBtn.addEventListener('click', () => {
        statusText.textContent = `Analyzing Sample...`;
        sampleScanBtn.disabled = true;
        analysisSection.style.visibility = 'hidden';
        matchResultContainer.style.display = 'none';
        peakTooltip.style.display = 'none';
        currentSampleId = sampleSelect.value;
        activePeaks = spectralData[currentSampleId].peaks;
        const fullData = generateSpectrumData(activePeaks);
        ftirChart.data.datasets = [{
            label: `Sample: ${sampleSelect.options[sampleSelect.selectedIndex].text}`,
            data: [],
            borderColor: '#00aeff', borderWidth: 1.5, tension: 0.4, pointRadius: 0
        }];
        ftirChart.update();
        animateScan(fullData, 'Sample Scan Complete. Click on peaks to identify them.');
    });

    overlayBtn.addEventListener('click', () => {
        const standardId = standardSelect.value;
        if (standardId === 'none') return;
        if (ftirChart.data.datasets.length > 1) { ftirChart.data.datasets.pop(); }
        statusText.textContent = `Overlaying Standard...`;
        const peakData = spectralData[standardId].peaks;
        const fullData = generateSpectrumData(peakData);
        ftirChart.data.datasets.push({
            label: `Standard: ${spectralData[standardId].name}`,
            data: fullData,
            borderColor: '#e74c3c', borderWidth: 1.5, borderDash: [5, 5], tension: 0.4, pointRadius: 0
        });
        ftirChart.update();
        statusText.textContent = `Overlay Complete`;
        const result = calculateMatchScore(currentSampleId, standardId);
        matchResultContainer.innerHTML = result.message;
        matchResultContainer.style.display = 'block';
    });

    // --- FULLY UPDATED TUTORIAL FUNCTION ---
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
            title: 'Welcome to the FTIR Simulator!',
            text: 'This tour explains the authentic workflow of an FTIR analysis.',
            buttons: [{ text: 'Next', action: tour.next }]
        });
        tour.addStep({
            title: 'Step 1: Background Scan',
            text: 'First, scan the empty instrument to measure and subtract the background air (CO₂ and water vapor). Click this button first.',
            attachTo: { element: '#backgroundScanBtn', on: 'right' },
            buttons: [{ text: 'Back', action: tour.back }, { text: 'Next', action: tour.next }]
        });
         tour.addStep({
            title: 'Step 2: Select & Scan Sample',
            text: 'After the background scan, this button becomes active. Choose your sample, then click here to perform the analysis.',
            attachTo: { element: '#sampleScanBtn', on: 'right' },
            buttons: [{ text: 'Back', action: tour.back }, { text: 'Next', action: tour.next }]
        });
        tour.addStep({
            title: 'Step 3: View the Spectrum',
            text: 'The final spectrum, a unique "fingerprint" of the molecule, will be drawn live here.',
            attachTo: { element: '#tour-step-4', on: 'left' },
            buttons: [{ text: 'Back', action: tour.back }, { text: 'Next', action: tour.next }]
        });
        tour.addStep({ // NEW STEP
            title: 'Step 4: Interactive Peak Analysis',
            text: 'This is the most powerful feature! Once the spectrum is generated, you can **click directly on the major peaks** to identify the chemical bonds (functional groups) responsible for them.',
            attachTo: { element: '#tour-step-4', on: 'left' },
            buttons: [{ text: 'Back', action: tour.back }, { text: 'Next', action: tour.next }]
        });
        tour.addStep({
            title: 'Step 5: Compare & Analyze',
            text: 'Finally, use this section to overlay a known standard from the library and calculate a match score to confirm the identity of your unknown sample.',
            attachTo: { element: '#analysis-section', on: 'right' },
            buttons: [{ text: 'Back', action: tour.back }, { text: 'Finish', action: tour.complete }]
        });
        tour.start();
    }
    
    tutorialBtn.addEventListener('click', startTutorial);
    initializeChart();
});