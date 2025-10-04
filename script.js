document.addEventListener('DOMContentLoaded', () => {
    // --- GLOBAL SCROLL ANIMATION (Works on all pages) ---
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('show');
            }
        });
    }, { threshold: 0.15 });

    const hiddenElements = document.querySelectorAll('.hidden');
    hiddenElements.forEach((el) => observer.observe(el));

    // --- HOMEPAGE-SPECIFIC LOGIC ---
    if (document.body.id === 'home-page') {
        const flippingTextContainer = document.getElementById("flipping-text");
        if (flippingTextContainer) {
            const words = flippingTextContainer.querySelectorAll("span");
            let currentIndex = 0;
            words[0].classList.add('active');
            setInterval(() => {
                const currentWord = words[currentIndex];
                const nextIndex = (currentIndex + 1) % words.length;
                const nextWord = words[nextIndex];
                currentWord.classList.remove('active');
                currentWord.classList.add('inactive');
                nextWord.classList.remove('inactive');
                nextWord.classList.add('active');
                setTimeout(() => currentWord.classList.remove('inactive'), 500);
                currentIndex = nextIndex;
            }, 2500);
        }
    }

    // --- QUIZ ZONE LOGIC (COMPLETE & EXPANDED) ---
    if (document.body.id === 'quiz-page') {
        const questions = [
            // Original Questions
            { question: "In HPLC, what does the 'HP' stand for?", options: ["High Purity", "High Pressure", "High Performance", "Both High Pressure & High Performance"], correctAnswer: "Both High Pressure & High Performance" },
            { question: "What physical property does FTIR spectroscopy primarily measure?", options: ["Absorption of UV light", "Molecular mass", "Absorption of Infrared radiation by chemical bonds", "Nuclear spin"], correctAnswer: "Absorption of Infrared radiation by chemical bonds" },
            { question: "Gas Chromatography is most suitable for analyzing compounds that are:", options: ["Highly soluble in water", "Very large proteins", "Volatile or can be vaporized", "Inorganic salts"], correctAnswer: "Volatile or can be vaporized" },
            { question: "The component where separation occurs in HPLC and GC is called the:", options: ["Injector", "Pump", "Column", "Detector"], correctAnswer: "Column" },
            { question: "An FTIR spectrum is typically plotted as % Transmittance vs:", options: ["Time", "Wavenumber (cm⁻¹)", "Wavelength (nm)", "Magnetic Field Strength"], correctAnswer: "Wavenumber (cm⁻¹)" },
            { question: "Which part of a GC system is responsible for heating the column?", options: ["The detector", "The injector", "The oven", "The gas tank"], correctAnswer: "The oven" },
            { question: "In Mass Spectrometry, what does 'm/z' on the x-axis represent?", options: ["Molecular Size", "Magnetic Zone", "Mass-to-charge ratio", "Molecule-to-z-axis ratio"], correctAnswer: "Mass-to-charge ratio" },
            { question: "In the HPLC simulator, increasing the Methanol % in the mobile phase for a C18 column will typically cause the retention time to:", options: ["Increase", "Decrease", "Stay the same", "Become unpredictable"], correctAnswer: "Decrease" },
            { question: "Why is a 'Background Scan' performed before a sample scan in FTIR?", options: ["To heat up the instrument", "To calibrate the laser frequency", "To measure and subtract the spectrum of air (CO₂ and H₂O)", "To clean the sample holder"], correctAnswer: "To measure and subtract the spectrum of air (CO₂ and H₂O)" },
            { question: "In a GC temperature program, what is the 'ramp rate'?", options: ["The speed of the carrier gas", "The rate at which the oven temperature increases", "The speed of the detector", "The rate of sample injection"], correctAnswer: "The rate at which the oven temperature increases" },
            { question: "In a mass spectrum, the peak with the highest m/z value often represents the:", options: ["Smallest fragment", "Solvent", "Base peak", "Molecular ion (the intact molecule)"], correctAnswer: "Molecular ion (the intact molecule)" },
            { question: "In the HPLC simulator, what happens to the peak size if you set the detector wavelength far from the compound's optimal wavelength?", options: ["The peak gets larger", "The peak gets smaller or disappears", "The retention time changes", "The peak splits in two"], correctAnswer: "The peak gets smaller or disappears" },
            
            // --- NEW QUESTIONS ---
            { question: "In reverse-phase HPLC, the stationary phase is ___ and the mobile phase is ___.", options: ["Polar, Non-polar", "Non-polar, Polar", "Ionic, Non-ionic", "Acidic, Basic"], correctAnswer: "Non-polar, Polar" },
            { question: "What is the most common detector in Gas Chromatography, which uses a hydrogen flame to ionize compounds?", options: ["Thermal Conductivity Detector (TCD)", "Electron Capture Detector (ECD)", "Flame Ionization Detector (FID)", "Mass Spectrometer (MS)"], correctAnswer: "Flame Ionization Detector (FID)" },
            { question: "The region of an FTIR spectrum below 1500 cm⁻¹ is often called the:", options: ["Functional Group Region", "Aromatic Region", "Fingerprint Region", "Hydrogen Bonding Region"], correctAnswer: "Fingerprint Region" },
            { question: "In a mass spectrum, what is the name for the most intense peak in the spectrum?", options: ["Molecular Ion Peak", "Parent Peak", "Fragment Peak", "Base Peak"], correctAnswer: "Base Peak" },
            { question: "The time it takes for a compound to travel from the injector to the detector in chromatography is called:", options: ["Elution Time", "Dead Time", "Retention Time", "Separation Time"], correctAnswer: "Retention Time" },
            { question: "Which ionization technique in Mass Spectrometry is considered a 'hard' technique that causes extensive fragmentation?", options: ["Electrospray Ionization (ESI)", "Electron Impact (EI)", "Chemical Ionization (CI)", "MALDI"], correctAnswer: "Electron Impact (EI)" },
            { question: "In chromatography, what does the area under a peak generally represent?", options: ["Molecular weight of the compound", "Boiling point of the compound", "Concentration of the compound", "Purity of the compound"], correctAnswer: "Concentration of the compound" },
            { question: "A common method for preparing solid samples for FTIR analysis is by grinding them with:", options: ["Sodium Chloride (NaCl)", "Silicon Dioxide (SiO₂)", "Potassium Bromide (KBr)", "Water (H₂O)"], correctAnswer: "Potassium Bromide (KBr)" }
        ];
        
        const quizContainer = document.querySelector('.quiz-container');
        const questionTextEl = document.getElementById('question-text');
        const optionsContainerEl = document.getElementById('options-container');
        const scoreEl = document.getElementById('quiz-score');
        const progressBar = document.getElementById('quiz-progress-bar');
        const feedbackTextEl = document.getElementById('feedback-text');
        
        if (quizContainer && questionTextEl) {
            let currentQuestionIndex = 0;
            let score = 0;

            function loadQuestion() {
                if (feedbackTextEl) feedbackTextEl.textContent = '';
                if (currentQuestionIndex < questions.length) {
                    const q = questions[currentQuestionIndex];
                    questionTextEl.textContent = q.question;
                    optionsContainerEl.innerHTML = '';
                    const shuffledOptions = [...q.options].sort(() => Math.random() - 0.5);
                    shuffledOptions.forEach(opt => {
                        const btn = document.createElement('button');
                        btn.textContent = opt;
                        btn.classList.add('option-btn');
                        btn.onclick = () => selectAnswer(btn, opt, q.correctAnswer);
                        optionsContainerEl.appendChild(btn);
                    });
                    progressBar.style.width = `${((currentQuestionIndex) / questions.length) * 100}%`;
                    scoreEl.textContent = `Score: ${score}/${questions.length}`;
                } else {
                    showFinalScore();
                }
            }

            function selectAnswer(button, selected, correct) {
                Array.from(optionsContainerEl.children).forEach(b => {
                    b.disabled = true;
                    if (b.textContent === correct) {
                        b.classList.add('correct');
                    }
                });

                if (selected === correct) {
                    score++;
                } else {
                    button.classList.add('incorrect');
                    if (feedbackTextEl) {
                        feedbackTextEl.textContent = `The correct answer was: ${correct}`;
                        feedbackTextEl.style.color = '#721c24';
                    }
                }
                
                scoreEl.textContent = `Score: ${score}/${questions.length}`;

                setTimeout(() => {
                    currentQuestionIndex++;
                    loadQuestion();
                }, 2500);
            }
            
            function showFinalScore() {
                progressBar.style.width = '100%';
                quizContainer.innerHTML = `
                    <div class="final-score-container">
                        <h2>Quiz Complete!</h2><p>Your final score is:</p>
                        <div class="final-score-circle">${score} / ${questions.length}</div>
                        <button id="restart-quiz-btn" class="btn">Try Again</button>
                    </div>`;
                document.getElementById('restart-quiz-btn').onclick = () => window.location.reload();
            }

            loadQuestion();
        }
    }
});