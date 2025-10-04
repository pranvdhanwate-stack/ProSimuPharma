document.addEventListener('DOMContentLoaded', () => {
    const diagramContainer = document.getElementById('instrument-diagram-container');
    const tooltip = document.getElementById('diagram-tooltip');

    if (!diagramContainer || !tooltip) {
        return;
    }

    // Create elements for the tooltip content once to improve performance
    const tooltipTitle = document.createElement('span');
    tooltipTitle.id = 'tooltip-title';
    const tooltipDesc = document.createElement('span');
    tooltipDesc.id = 'tooltip-desc';
    tooltip.appendChild(tooltipTitle);
    tooltip.appendChild(tooltipDesc);

    const components = diagramContainer.querySelectorAll('.diagram-component');

    components.forEach(component => {
        const title = component.getAttribute('data-title');
        const desc = component.getAttribute('data-desc');

        component.addEventListener('mousemove', (e) => {
            const containerRect = diagramContainer.getBoundingClientRect();
            const tooltipRect = tooltip.getBoundingClientRect();
            
            // Calculate position relative to the container
            let x = e.clientX - containerRect.left;
            let y = e.clientY - containerRect.top;

            // --- NEW: Boundary Detection Logic ---
            // If tooltip goes off the right edge, flip it to the left of the cursor
            if (e.clientX + (tooltipRect.width / 2) > window.innerWidth - 20) {
                tooltip.style.transform = 'translate(-100%, -125%)';
            } 
            // If tooltip goes off the left edge, flip it to the right
            else if (e.clientX - (tooltipRect.width / 2) < 20) {
                tooltip.style.transform = 'translate(0%, -125%)';
            }
            // Otherwise, center it normally
            else {
                tooltip.style.transform = 'translate(-50%, -125%)';
            }

            tooltip.style.left = `${x}px`;
            tooltip.style.top = `${y}px`;
        });
        
        component.addEventListener('mouseenter', () => {
            tooltipTitle.textContent = title;
            tooltipDesc.textContent = desc;
            tooltip.style.opacity = 1;
        });

        component.addEventListener('mouseleave', () => {
            tooltip.style.opacity = 0;
        });
    });
});