/**
 * components/inspector.js
 * Controls the right-side details panel when a node is clicked.
 */
export class InspectorPanel {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
    }

    render(nodeData) {
        if (!nodeData) {
            this.container.innerHTML = `<div class="empty-state">Select a node for forensic details.</div>`;
            return;
        }

        const threatClass = nodeData.status_color === "RED" ? "threat-high" : (nodeData.status_color === "YELLOW" ? "threat-warn" : "threat-low");

        this.container.innerHTML = `
            <h3>Node Inspector</h3>
            <div class="inspector-detail">
                <label>Serial ID:</label> <span>NODE-${nodeData.node_serial}</span>
            </div>
            <div class="inspector-detail">
                <label>Location:</label> <span>${nodeData.location}</span>
            </div>
            <div class="inspector-detail">
                <label>HTTP Status:</label> <span class="${threatClass}">${nodeData.http_status}</span>
            </div>
            <div class="inspector-actions">
                <button id="btn-quarantine" class="btn-danger" ${nodeData.status_color === "RED" ? "" : "disabled"}>
                    QUARANTINE NODE
                </button>
            </div>
        `;

        const btn = document.getElementById("btn-quarantine");
        if (btn) {
            btn.addEventListener("click", () => {
                alert(`Quarantine sequence initiated for NODE-${nodeData.node_serial}.`);
                btn.innerText = "ISOLATED";
                btn.disabled = true;
            });
        }
    }
}
