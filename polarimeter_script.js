document.addEventListener('DOMContentLoaded', () => {
    // --- Data Store ---
    const compounds = {
        "s_ibuprofen": { name: "(S)-(+)-Ibuprofen", cid: 98917, rotation: 54.5, formula: "C13H18O2", weight: "206.28 g/mol" },
        "r_ibuprofen": { name: "(R)-(-)-Ibuprofen", cid: 177937, rotation: -54.5, formula: "C13H18O2", weight: "206.28 g/mol" },
        "d_glucose": { name: "D-(+)-Glucose", cid: 5793, rotation: 52.7, formula: "C6H12O6", weight: "180.16 g/mol" },
        "l_glucose": { name: "L-(-)-Glucose", cid: 439533, rotation: -52.7, formula: "C6H12O6", weight: "180.16 g/mol" },
        "s_limonene": { name: "(S)-(-)-Limonene", cid: 440917, rotation: -125.6, formula: "C10H16", weight: "136.23 g/mol" },
        "r_limonene": { name: "(R)-(+)-Limonene", cid: 8033, rotation: 125.6, formula: "C10H16", weight: "136.23 g/mol" }
    };

    // --- Element Connections ---
    const sampleSelect = document.getElementById('sampleSelect');
    const analyzeButton = document.getElementById('analyzeButton');
    const tutorialBtn = document.getElementById('tutorialBtn');
    const resultPanel = document.getElementById('result-panel');
    const resultValue = document.getElementById('result-value');
    const resultConclusion = document.getElementById('result-conclusion');
    const moleculeViewerDiv = document.getElementById('molecule-viewer');
    const structureImg = document.getElementById('structure-2d-img');
    const moleculeName = document.getElementById('molecule-name');
    const moleculeFormula = document.getElementById('molecule-formula');
    const moleculeWeight = document.getElementById('molecule-weight');
    const pubchemLink = document.getElementById('pubchem-link');
    const analyzerElement = document.getElementById('analyzer-group');
    const lightBeam = document.getElementById('light-beam');
    const beamMaskRect = document.getElementById('beam-mask-rect');
    const labels = document.querySelectorAll('.svg-label');
    let viewer;

    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

    function initViewer() {
        try {
            viewer = $3Dmol.createViewer(moleculeViewerDiv, { defaultcolors: $3Dmol.rasmolElementColors });
            viewer.setBackgroundColor(0x000000);
        } catch (e) {
            console.error("Failed to initialize 3D viewer.", e);
            moleculeViewerDiv.innerHTML = "<p style='color: white; text-align: center; padding: 20px;'>Error initializing 3D viewer.</p>";
        }
    }

    async function updateDisplay(compoundId) {
        const compound = compounds[compoundId];
        if (!viewer || !compound) return;
        viewer.clear();
        try {
            await $3Dmol.download(`cid:${compound.cid}`, viewer, { sdf: true });
            viewer.setStyle({}, { stick: {} });
            viewer.zoomTo();
            viewer.render();
            viewer.zoom(0.8, 1000);
        } catch (e) {
            console.error("Failed to load 3D model from PubChem", e);
            viewer.addLabel("Could not load model", { fontColor: "white", backgroundColor: "black" });
            viewer.render();
        }
        structureImg.src = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${compound.cid}/PNG`;
        structureImg.onerror = () => { structureImg.alt = "Image not available"; };
        moleculeName.textContent = compound.name;
        moleculeFormula.textContent = compound.formula;
        moleculeWeight.textContent = compound.weight;
        pubchemLink.href = `https://pubchem.ncbi.nlm.nih.gov/compound/${compound.cid}`;
    }
    
    async function runAnalysis() {
        const selectedId = sampleSelect.value;
        const compound = compounds[selectedId];
        if (!compound) return;
        analyzeButton.disabled = true;
        resultPanel.classList.remove('visible');
        labels.forEach(l => l.classList.remove('visible'));
        [analyzerElement, lightBeam, beamMaskRect].forEach(el => el.style.transition = 'none');
        analyzerElement.style.transform = 'rotate(0deg)';
        lightBeam.style.transform = 'rotate(0deg)';
        beamMaskRect.setAttribute('width', '0');
        void lightBeam.offsetWidth; // Force reflow
        await sleep(500);
        labels.forEach(l => l.classList.add('visible'));
        await sleep(100);
        beamMaskRect.style.transition = 'width 3s ease-in-out';
        beamMaskRect.setAttribute('width', '290');
        await sleep(1100);
        lightBeam.style.transition = 'transform 1.5s ease-in-out';
        lightBeam.style.transform = `rotate(${compound.rotation}deg)`;
        await sleep(800);
        analyzerElement.style.transition = 'transform 1.5s ease-in-out';
        analyzerElement.style.transform = `rotate(${compound.rotation}deg)`;
        await sleep(2000);
        const sign = compound.rotation > 0 ? '+' : '';
        resultValue.textContent = `${sign}${compound.rotation}°`;
        resultConclusion.textContent = compound.rotation > 0 ? "The compound is dextrorotatory." : "The compound is levorotatory.";
        resultPanel.classList.add('visible');
        analyzeButton.disabled = false;
    }

    function startTutorial() {
        const tour = new Shepherd.Tour({
            useModalOverlay: true,
            defaultStepOptions: { classes: 'shepherd-tour', scrollTo: { behavior: 'smooth', block: 'center' }, cancelIcon: { enabled: true } }
        });
        tour.addStep({ title: 'Welcome to the Polarimeter!', text: 'This tour explains how to measure the optical rotation of a chiral compound.', buttons: [{ text: 'Next', action: tour.next }] });
        tour.addStep({ title: 'Step 1: Select a Compound', text: 'Choose a chiral molecule from the dropdown. Its 3D and 2D structures will appear on the right.', attachTo: { element: '#tour-step-1', on: 'right' }, buttons: [{ text: 'Back', action: tour.back }, { text: 'Next', action: tour.next }] });
        tour.addStep({ title: 'Step 2: Live View', text: 'This area shows a 3D model of the molecule and an animation of the instrument. When you run the analysis, you will see the light rotate.', attachTo: { element: '#tour-step-2', on: 'left' }, buttons: [{ text: 'Back', action: tour.back }, { text: 'Next', action: tour.next }] });
        tour.addStep({ title: 'Step 3: Run Analysis', text: 'Click this button to start the simulation. Watch the animation to see how the polarized light is rotated by the sample.', attachTo: { element: '#analyzeButton', on: 'right' }, buttons: [{ text: 'Back', action: tour.back }, { text: 'Next', action: tour.next }] });
        tour.addStep({ title: 'Step 4: See the Result', text: 'The final specific rotation value will be displayed here, indicating whether the compound is dextrorotatory (+) or levorotatory (-).', attachTo: { element: '#result-panel', on: 'right' }, buttons: [{ text: 'Back', action: tour.back }, { text: 'Finish', action: tour.complete }] });
        tour.start();
    }

    function initialize() {
        for (const [id, data] of Object.entries(compounds)) {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = data.name;
            sampleSelect.appendChild(option);
        }
        initViewer();
        updateDisplay(sampleSelect.value);
        sampleSelect.addEventListener('change', () => updateDisplay(sampleSelect.value));
        analyzeButton.addEventListener('click', runAnalysis);
        tutorialBtn.addEventListener('click', startTutorial);
    }
    initialize();
});