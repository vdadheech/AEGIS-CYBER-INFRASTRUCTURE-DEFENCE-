import { useEffect, useRef, useCallback, useState } from 'react';
import * as d3 from 'd3';
import { Panel } from '../components/ui/Panel';
import { fetchCityMap } from '../api/endpoints';
import { useInterval } from '../hooks/useInterval';
import type { CityMapNode, GraphNode, GraphLink } from '../types';
import styles from './ForensicCityMap.module.css';
import '../styles/map.css';

interface ForensicCityMapProps {
  onNodeHover: (event: MouseEvent, data: CityMapNode) => void;
  onNodeHoverOut: () => void;
  onNodeClick: (data: CityMapNode) => void;
  className?: string;
}

export function ForensicCityMap({
  onNodeHover,
  onNodeHoverOut,
  onNodeClick,
  className = '',
}: ForensicCityMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<d3.Selection<SVGSVGElement, unknown, null, undefined> | undefined>(undefined);
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | undefined>(undefined);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | undefined>(undefined);
  const linkGroupRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | undefined>(undefined);
  const nodeGroupRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | undefined>(undefined);
  const rippleGroupRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | undefined>(undefined);
  const dimensionsRef = useRef({ width: 600, height: 420 });
  const [error, setError] = useState(false);
  const callbacksRef = useRef({ onNodeHover, onNodeHoverOut, onNodeClick });
  callbacksRef.current = { onNodeHover, onNodeHoverOut, onNodeClick };

  // Initialize D3
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const w = container.clientWidth || 600;
    const h = container.clientHeight || 420;
    dimensionsRef.current = { width: w, height: h };

    // Clear previous
    d3.select(container).selectAll('*').remove();

    const svg = d3
      .select(container)
      .append('svg')
      .attr('viewBox', `0 0 ${w} ${h}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('width', '100%')
      .style('height', '100%')
      .call(
        d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.3, 4]).on('zoom', (event) => {
          gRef.current?.attr('transform', event.transform);
        })
      );

    // Grid background
    const defs = svg.append('defs');
    const pattern = defs
      .append('pattern')
      .attr('id', 'grid-pattern')
      .attr('width', 40)
      .attr('height', 40)
      .attr('patternUnits', 'userSpaceOnUse');
    pattern
      .append('path')
      .attr('d', 'M 40 0 L 0 0 0 40')
      .attr('fill', 'none')
      .attr('stroke', 'rgba(56,189,248,0.04)')
      .attr('stroke-width', '1');
    svg
      .insert('rect', ':first-child')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('fill', 'url(#grid-pattern)');

    const g = svg.append('g');
    const rippleGroup = g.append('g').attr('class', 'ripples');
    const linkGroup = g.append('g').attr('class', 'links');
    const nodeGroup = g.append('g').attr('class', 'nodes');

    svgRef.current = svg;
    gRef.current = g;
    rippleGroupRef.current = rippleGroup;
    linkGroupRef.current = linkGroup;
    nodeGroupRef.current = nodeGroup;

    // Simulation
    const simulation = d3
      .forceSimulation<GraphNode>()
      .force(
        'link',
        d3.forceLink<GraphNode, GraphLink>().id((d) => d.id).distance(80).strength(0.3)
      )
      .force('charge', d3.forceManyBody().strength(-120))
      .force('center', d3.forceCenter(w / 2, h / 2))
      .force('collide', d3.forceCollide().radius(20))
      .alphaDecay(0.015);

    simulation.on('tick', () => {
      const currentW = dimensionsRef.current.width || w;
      const currentH = dimensionsRef.current.height || h;

      linkGroupRef.current
        ?.selectAll<SVGLineElement, GraphLink>('line')
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      nodeGroupRef.current
        ?.selectAll<SVGCircleElement, GraphNode>('circle.network-node')
        .attr('cx', (d) => (d.x = Math.max(10, Math.min(currentW - 10, d.x || 0))))
        .attr('cy', (d) => (d.y = Math.max(10, Math.min(currentH - 10, d.y || 0))));

      rippleGroupRef.current
        ?.selectAll<SVGCircleElement, GraphNode>('circle.threat-ripple')
        .attr('cx', (d) => d.x || 0)
        .attr('cy', (d) => d.y || 0);
    });

    simulationRef.current = simulation;

    // Resize observer
    const ro = new ResizeObserver((entries) => {
      if (!entries.length) return;
      const { width: newW, height: newH } = entries[0].contentRect;
      
      // Prevent collapse when tab is hidden or transitioning
      if (newW < 50 || newH < 50) return;

      dimensionsRef.current = { width: newW, height: newH };
      svg.attr('viewBox', `0 0 ${newW} ${newH}`);
      simulation.force('center', d3.forceCenter(newW / 2, newH / 2));
      simulation.alpha(0.3).restart();
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      simulation.stop();
    };
  }, []);

  const getColorClass = (color: string) => {
    if (color === 'QUARANTINED') return 'node-quarantined';
    if (color === 'RED') return 'node-red';
    if (color === 'YELLOW') return 'node-yellow';
    return 'node-green';
  };

  const getNodeRadius = (color: string) => {
    if (color === 'QUARANTINED') return 9;
    if (color === 'RED') return 10;
    if (color === 'YELLOW') return 8;
    return 6;
  };

  const updateGraph = useCallback(
    (nodes: GraphNode[], links: GraphLink[]) => {
      const linkGroup = linkGroupRef.current;
      const nodeGroup = nodeGroupRef.current;
      const rippleGroup = rippleGroupRef.current;
      const simulation = simulationRef.current;
      if (!linkGroup || !nodeGroup || !rippleGroup || !simulation) return;

      // Links
      const linkSel = linkGroup.selectAll<SVGLineElement, GraphLink>('line').data(links);
      linkSel.exit().remove();
      linkSel.enter().append('line').attr('class', 'network-link');

      // Ripples (RED nodes only)
      const compromised = nodes.filter((d) => d.original_data.status_color === 'RED');
      const rippleSel = rippleGroup
        .selectAll<SVGCircleElement, GraphNode>('circle.threat-ripple')
        .data(compromised, (d) => d.id);
      rippleSel.exit().remove();
      rippleSel.enter().append('circle').attr('class', 'threat-ripple').attr('r', 8);

      // Nodes
      const nodeSel = nodeGroup
        .selectAll<SVGCircleElement, GraphNode>('circle.network-node')
        .data(nodes, (d) => d.id);

      nodeSel.exit().transition().duration(300).attr('r', 0).remove();

      const dragHandler = d3
        .drag<SVGCircleElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        });

      const nodeEnter = nodeSel
        .enter()
        .append('circle')
        .attr(
          'class',
          (d) => `network-node ${getColorClass(d.original_data.status_color)}`
        )
        .attr('r', 0)
        .on('mouseover', (event, d) =>
          callbacksRef.current.onNodeHover(event, d.original_data)
        )
        .on('mouseout', () => callbacksRef.current.onNodeHoverOut())
        .on('click', (_event, d) => callbacksRef.current.onNodeClick(d.original_data))
        .call(dragHandler);

      nodeEnter
        .transition()
        .duration(400)
        .attr('r', (d) => getNodeRadius(d.original_data.status_color));

      nodeSel
        .transition()
        .duration(500)
        .attr('r', (d) => getNodeRadius(d.original_data.status_color))
        .attr(
          'class',
          (d) => `network-node ${getColorClass(d.original_data.status_color)}`
        );

      // Restart simulation
      simulation.nodes(nodes);
      (simulation.force('link') as d3.ForceLink<GraphNode, GraphLink>).links(links);
      simulation.alpha(0.3).restart();
    },
    []
  );

  const loadMap = useCallback(async () => {
    try {
      const data = await fetchCityMap();

      const pipelineNodes: GraphNode[] = data.nodes.map((n) => ({
        id: n.node_serial,
        original_data: n,
      }));

      const pipelineLinks: GraphLink[] = [];
      for (let i = 0; i < pipelineNodes.length; i++) {
        // Build organic mesh topology
        if (i > 0)
          pipelineLinks.push({ source: pipelineNodes[i].id, target: pipelineNodes[i - 1].id });
        if (i % 3 === 0 && i + 4 < pipelineNodes.length)
          pipelineLinks.push({ source: pipelineNodes[i].id, target: pipelineNodes[i + 4].id });
        if (i % 7 === 0 && i + 12 < pipelineNodes.length)
          pipelineLinks.push({ source: pipelineNodes[i].id, target: pipelineNodes[i + 12].id });
        if (i % 11 === 0 && i + 25 < pipelineNodes.length)
          pipelineLinks.push({ source: pipelineNodes[i].id, target: pipelineNodes[i + 25].id });
      }

      updateGraph(pipelineNodes, pipelineLinks);
      setError(false);
    } catch (err) {
      console.error('City map fetch failed', err);
      setError(true);
    }
  }, [updateGraph]);

  useEffect(() => {
    loadMap();
  }, [loadMap]);

  useInterval(loadMap, 5000);

  const legend = (
    <div className={styles.legend} aria-label="Map legend">
      <span className={styles.legendItem}>
        <span className={`${styles.legendDot} ${styles.dotGreen}`} />
        HEALTHY
      </span>
      <span className={styles.legendItem}>
        <span className={`${styles.legendDot} ${styles.dotYellow}`} />
        UNSTABLE
      </span>
      <span className={styles.legendItem}>
        <span className={`${styles.legendDot} ${styles.dotRed}`} />
        COMPROMISED
      </span>
    </div>
  );

  return (
    <Panel
      title="FORENSIC CITY MAP"
      headerRight={legend}
      className={`${styles.wrapper} ${className}`}
      ariaLabel="Forensic City Map — Network topology visualization"
    >
      <div className={styles.mapBody}>
        {error ? (
          <div className={styles.errorOverlay} role="alert">
            ⚠ DATA CONNECTION SEVERED
            <br />
            FORENSIC MAP OFFLINE
          </div>
        ) : (
          <div
            ref={containerRef}
            className={styles.mapContainer}
            role="img"
            aria-label="Network force graph visualization"
          />
        )}
      </div>
    </Panel>
  );
}
