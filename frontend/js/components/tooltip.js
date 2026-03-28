/**
 * components/tooltip.js
 * Controls the absolute positioned floating tooltip.
 */
export class Tooltip {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            this.container = document.createElement("div");
            this.container.id = containerId;
            this.container.className = "aegis-tooltip";
            document.body.appendChild(this.container);
        }
    }

    show(event, nodeData) {
        let statusClass = "tt-healthy";
        if (nodeData.http_status >= 500) statusClass = "tt-compromised";
        else if (nodeData.http_status >= 400) statusClass = "tt-unstable";

        this.container.innerHTML = `
            <div class="tt-header ${statusClass}">
                NODE-${nodeData.node_serial}
            </div>
            <div class="tt-body">
                <div>HTTP Status: <span>${nodeData.http_status}</span></div>
                <div>Compromised: <span>${nodeData.status_color === 'RED' ? 'YES' : 'NO'}</span></div>
            </div>
        `;
        
        let x = event.pageX + 15;
        let y = event.pageY + 15;
        this.container.style.left = `${x}px`;
        this.container.style.top = `${y}px`;
        this.container.style.opacity = 1;
        this.container.style.display = "block";
    }

    hide() {
        this.container.style.opacity = 0;
        this.container.style.display = "none";
    }
}
