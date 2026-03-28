/**
 * visualizations/city_map.js
 * Production-grade D3 Force Graph with viewport constraints,
 * threat-ripple animations, and smooth update transitions.
 */

export class CityMap {
    constructor(containerId, callbacks) {
        this.containerId = containerId;
        this.callbacks = callbacks;
        this.container = document.getElementById(containerId);
        
        // Use ResizeObserver to always match parent bounds
        this.ro = new ResizeObserver(() => this._onResize());
        this.ro.observe(this.container);

        this.WIDTH = this.container.clientWidth || 600;
        this.HEIGHT = this.container.clientHeight || 420;

        this._initSVG();
        this._initSimulation();
        this._initFilters();
    }

    _onResize() {
        this.WIDTH = this.container.clientWidth;
        this.HEIGHT = this.container.clientHeight;
        if (this.svg) {
            this.svg.attr("viewBox", `0 0 ${this.WIDTH} ${this.HEIGHT}`);
            this.simulation.force("center", d3.forceCenter(this.WIDTH / 2, this.HEIGHT / 2));
            this.simulation.alpha(0.2).restart();
        }
    }

    _initSVG() {
        d3.select(`#${this.containerId}`).selectAll("*").remove();

        this.svg = d3.select(`#${this.containerId}`)
            .append("svg")
            .attr("viewBox", `0 0 ${this.WIDTH} ${this.HEIGHT}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .style("width", "100%")
            .style("height", "100%")
            .call(d3.zoom()
                .scaleExtent([0.3, 4])
                .on("zoom", (event) => { this.g.attr("transform", event.transform); })
            );

        this.g = this.svg.append("g");
        this.rippleGroup = this.g.append("g").attr("class", "ripples");
        this.linkGroup  = this.g.append("g").attr("class", "links");
        this.nodeGroup  = this.g.append("g").attr("class", "nodes");
    }

    _initFilters() {
        const defs = this.svg.append("defs");
        // Grid overlay pattern
        const pattern = defs.append("pattern")
            .attr("id", "grid-pattern")
            .attr("width", 40).attr("height", 40)
            .attr("patternUnits", "userSpaceOnUse");
        pattern.append("path")
            .attr("d", "M 40 0 L 0 0 0 40")
            .attr("fill", "none")
            .attr("stroke", "rgba(56,189,248,0.04)")
            .attr("stroke-width", "1");
        // Apply grid to background
        this.svg.insert("rect", ":first-child")
            .attr("width", "100%").attr("height", "100%")
            .attr("fill", "url(#grid-pattern)");
    }

    _initSimulation() {
        this.simulation = d3.forceSimulation()
            .force("link",    d3.forceLink().id(d => d.id).distance(50).strength(0.5))
            .force("charge",  d3.forceManyBody().strength(-60))
            .force("center",  d3.forceCenter(this.WIDTH / 2, this.HEIGHT / 2))
            .force("collide", d3.forceCollide().radius(16))
            .alphaDecay(0.03);

        this.simulation.on("tick", () => {
            const w = this.WIDTH, h = this.HEIGHT;

            this.linkGroup.selectAll("line")
                .attr("x1", d => d.source.x).attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x).attr("y2", d => d.target.y);

            this.nodeGroup.selectAll("circle.network-node")
                .attr("cx", d => (d.x = Math.max(10, Math.min(w - 10, d.x))))
                .attr("cy", d => (d.y = Math.max(10, Math.min(h - 10, d.y))));

            this.rippleGroup.selectAll("circle.threat-ripple")
                .attr("cx", d => d.x)
                .attr("cy", d => d.y);
        });
    }

    _getColorClass(color) {
        if (color === "QUARANTINED") return "node-quarantined";
        if (color === "RED")    return "node-red";
        if (color === "YELLOW") return "node-yellow";
        return "node-green";
    }

    _getBadgeClass(color) {
        if (color === "QUARANTINED") return "badge-quarantined";
        if (color === "RED")    return "badge-red";
        if (color === "YELLOW") return "badge-yellow";
        return "badge-green";
    }

    _getNodeRadius(statusColor) {
        if (statusColor === "QUARANTINED") return 9;
        if (statusColor === "RED") return 10;
        if (statusColor === "YELLOW") return 8;
        return 6;
    }

    update(graphData) {
        const { nodes, links } = graphData;

        /* ──── Links ──── */
        const linkSel = this.linkGroup.selectAll("line").data(links);
        linkSel.exit().remove();
        linkSel.enter().append("line").attr("class", "network-link");

        /* ──── Ripple rings (only for RED nodes) ──── */
        const compromised = nodes.filter(d => d.original_data.status_color === "RED");
        const rippleSel = this.rippleGroup.selectAll("circle.threat-ripple").data(compromised, d => d.id);
        rippleSel.exit().remove();
        rippleSel.enter().append("circle")
            .attr("class", "threat-ripple")
            .attr("r", 8);

        /* ──── Nodes ──── */
        const nodeSel = this.nodeGroup.selectAll("circle.network-node")
            .data(nodes, d => d.id);

        nodeSel.exit().transition().duration(300).attr("r", 0).remove();

        const nodeEnter = nodeSel.enter().append("circle")
            .attr("class", d => `network-node ${this._getColorClass(d.original_data.status_color)}`)
            .attr("r", 0)
            .on("mouseover", (event, d) => this.callbacks.onHover(event, d.original_data))
            .on("mouseout",  () => this.callbacks.onHoverOut())
            .on("click",     (event, d) => this.callbacks.onClick(d.original_data))
            .call(this._dragHandler());

        // Animate new nodes appearing
        nodeEnter.transition().duration(400)
            .attr("r", d => this._getNodeRadius(d.original_data.status_color));

        // Update existing nodes (status changes)
        nodeSel.transition().duration(500)
            .attr("r", d => this._getNodeRadius(d.original_data.status_color))
            .attr("class", d => `network-node ${this._getColorClass(d.original_data.status_color)}`);

        /* ──── Physics restart ──── */
        this.simulation.nodes(nodes);
        this.simulation.force("link").links(links);
        this.simulation.alpha(0.3).restart();
    }

    _dragHandler() {
        return d3.drag()
            .on("start", (event, d) => {
                if (!event.active) this.simulation.alphaTarget(0.3).restart();
                d.fx = d.x; d.fy = d.y;
            })
            .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
            .on("end", (event, d) => {
                if (!event.active) this.simulation.alphaTarget(0);
                d.fx = null; d.fy = null;
            });
    }
}
