async function initCityMap() {
    try {
        const response = await fetch("http://127.0.0.1:8000/api/city-map");
        const data = await response.json();
        const nodesData = data.nodes;

        // Setup SVG canvas
        const width = document.getElementById("d3-city-map").clientWidth || 500;
        const height = 300;
        
        const svg = d3.select("#d3-city-map")
            .append("svg")
            .attr("width", width)
            .attr("height", height);

        // Create a D3 physics simulation to arrange the nodes in a "cloud"
        const simulation = d3.forceSimulation(nodesData)
            .force("charge", d3.forceManyBody().strength(-20)) // Push them apart
            .force("center", d3.forceCenter(width / 2, height / 2)) // Pull them to center
            .force("collide", d3.forceCollide().radius(8)); // Prevent overlapping

        // Draw the nodes
        const node = svg.append("g")
            .selectAll("circle")
            .data(nodesData)
            .enter()
            .append("circle")
            .attr("r", 5) // Node size
            .attr("fill", d => d.flag_spoofed ? "#ff003c" : "#66fcf1") // Red if compromised, green if safe
            .attr("stroke", "#111")
            .attr("stroke-width", 1.5);

        // Update physics positions on every "tick"
        simulation.on("tick", () => {
            node
                .attr("cx", d => Math.max(5, Math.min(width - 5, d.x)))
                .attr("cy", d => Math.max(5, Math.min(height - 5, d.y)));
        });

    } catch (error) {
        console.error("Failed to load city map data.", error);
    }
}

document.addEventListener("DOMContentLoaded", initCityMap);