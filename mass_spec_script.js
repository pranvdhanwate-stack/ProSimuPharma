document.addEventListener('DOMContentLoaded', () => {
    // --- Element Connections ---
    const canvas = document.getElementById('msChart');
    if (!canvas) { return; } 
    
    const statusText = document.getElementById('statusText');
    const acquireBtn = document.getElementById('acquireBtn');
    const sampleSelect = document.getElementById('sampleSelect');
    const collisionEnergyInput = document.getElementById('collisionEnergy');
    const resolutionInput = document.getElementById('massResolution');
    const tutorialBtn = document.getElementById('tutorialBtn');

    let msChart = null;

    // --- Scientific Data Library (Referenced from NIST WebBook) ---
    const spectralData = {
        paracetamol: {
            molecularIon: { mz: 151, intensity: 35 },
            fragments: [ { mz: 109, intensity: 100 }, { mz: 80, intensity: 20 }, { mz: 43, intensity: 45 } ]
        },
        caffeine: {
            molecularIon: { mz: 194, intensity: 100 },
            fragments: [ { mz: 109, intensity: 55 }, { mz: 82, intensity: 40 }, { mz: 55, intensity: 35 } ]
        },
        aspirin: {
            molecularIon: { mz: 180, intensity: 5 },
            fragments: [ { mz: 120, intensity: 100 }, { mz: 92, intensity: 50 }, { mz: 43, intensity: 85 } ]
        },
        ibuprofen: {
            molecularIon: { mz: 206, intensity: 15 },
            fragments: [ { mz: 161, intensity: 100 }, { mz: 91, intensity: 30 } ]
        },
        lidocaine: {
            molecularIon: { mz: 234, intensity: 5 },
            fragments: [ { mz: 86, intensity: 100 }, { mz: 58, intensity: 20 } ]
        }
    };

    // --- Data Generation Engine ---
    function generateSpectrumData(sample, params) {
        let allPeaks = [...sample.fragments];
        const energyFactor = 1 - ((params.energy - 10) / 90) * 0.9;
        const molecularIon = { ...sample.molecularIon, intensity: sample.molecularIon.intensity * energyFactor };
        allPeaks.push(molecularIon);

        const maxIntensity = Math.max(...allPeaks.map(p => p.intensity));
        const normalizedPeaks = allPeaks.map(p => ({ mz: p.mz, intensity: (p.intensity / maxIntensity) * 100 }));
        
        return normalizedPeaks.sort((a, b) => a.mz - b.mz);
    }

    // --- Main Execution Workflow ---
    function acquireSpectrum() {
        statusText.textContent = "Acquiring...";
        acquireBtn.disabled = true;

        setTimeout(() => {
            const sampleId = sampleSelect.value;
            const userParams = {
                energy: parseFloat(collisionEnergyInput.value),
                resolution: parseFloat(resolutionInput.value)
            };

            const spectrumPoints = generateSpectrumData(spectralData[sampleId], userParams);
            
            msChart.data.labels = spectrumPoints.map(p => p.mz);
            msChart.data.datasets[0].data = spectrumPoints.map(p => p.intensity);
            
            const barThickness = userParams.resolution < 2000 ? 5 : (userParams.resolution < 10000 ? 2 : 1);
            msChart.data.datasets[0].barThickness = barThickness;
            
            msChart.update(); // This will trigger the new, smooth animation

            statusText.textContent = "Acquisition Complete";
            acquireBtn.disabled = false;
        }, 500);
    }
    
    // --- Guided Tour Logic ---
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
            title: 'Welcome to the MS Simulator!',
            text: 'This tour explains the key parameters for Mass Spectrometry.',
            buttons: [{ text: 'Next', action: tour.next }]
        });
        tour.addStep({
            title: 'Sample Selection',
            text: 'Choose the compound you want to analyze. The simulator contains real fragmentation data for each one.',
            attachTo: { element: '#tour-step-1', on: 'right' },
            buttons: [{ text: 'Back', action: tour.back }, { text: 'Next', action: tour.next }]
        });
        tour.addStep({
            title: 'Collision Energy',
            text: 'This is the energy used to break the molecule apart. A higher energy will cause more fragmentation, often reducing the size of the main "molecular ion" peak.',
            attachTo: { element: '#tour-step-2', on: 'right' },
            buttons: [{ text: 'Back', action: tour.back }, { text: 'Next', action: tour.next }]
        });
        tour.addStep({
            title: 'Mass Resolution',
            text: 'Resolution determines how "sharp" the peaks are. Higher resolution gives narrower bars, allowing you to distinguish between two peaks that are very close in mass.',
            attachTo: { element: '#tour-step-3', on: 'right' },
            buttons: [{ text: 'Back', action: tour.back }, { text: 'Next', action: tour.next }]
        });
        tour.addStep({
            title: 'Acquire and View',
            text: 'Click "Acquire Spectrum" to run the analysis. The mass spectrum, a bar chart of abundance vs. mass (m/z), will be generated here.',
            attachTo: { element: '#tour-step-4', on: 'left' },
            buttons: [{ text: 'Back', action: tour.back }, { text: 'Finish', action: tour.complete }]
        });
        tour.start();
    }
    
    // --- Chart.js Setup and Initialization ---
    function initialize() {
        const ctx = canvas.getContext('2d');
        msChart = new Chart(ctx, {
            type: 'bar',
            data: { 
                labels: [], 
                datasets: [{ 
                    label: 'Relative Abundance', 
                    data: [], 
                    backgroundColor: '#00aeff' 
                }] 
            },
            options: {
                maintainAspectRatio: false,
                animation: {
                    duration: 1500,
                    easing: 'easeInOutQuart',
                },
                scales: {
                    x: { title: { display: true, text: 'Mass-to-Charge Ratio (m/z)', color: '#a0aec0' }, ticks: { color: '#a0aec0' }, grid: { color: 'rgba(74, 85, 104, 0.4)' } },
                    y: { title: { display: true, text: 'Relative Abundance (%)', color: '#a0aec0' }, ticks: { color: '#a0aec0' }, grid: { color: 'rgba(74, 85, 104, 0.4)' }, min: 0, max: 110 }
                },
                plugins: { 
                    legend: { display: false } 
                }
            }
        });
        acquireBtn.addEventListener('click', acquireSpectrum);
        tutorialBtn.addEventListener('click', startTutorial);
    }
    
    initialize();
});