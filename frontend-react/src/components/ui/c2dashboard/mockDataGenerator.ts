/**
 * AEGIS Mock Data Generator
 */

import type { ThreatNode, ThreatLink, TimingPoint } from './types';
import { getNodeStatus } from './types';

const CONFIG = {
  normalUsers: 150,
  c2Bots: 25,
  c2Controllers: 3,
  lateralMovers: 8,
  beaconIntervals: [300, 500, 1000, 2000],
  humanMinDelay: 500,
  humanMaxDelay: 30000,
  internalPrefix: '192.168.',
  c2Prefix: '45.33.',
};

const randomIP = (prefix: string): string =>
  `${prefix}${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

const randomId = (): string => Math.random().toString(36).substring(2, 10);

const generateHumanTiming = (count: number): TimingPoint[] => {
  const points: TimingPoint[] = [];
  let time = Date.now() - 3600000;
  for (let i = 0; i < count; i++) {
    const delta = CONFIG.humanMinDelay + Math.random() * (CONFIG.humanMaxDelay - CONFIG.humanMinDelay);
    time += delta;
    points.push({ timestamp: time, delta });
  }
  return points;
};

const generateBeaconTiming = (interval: number, count: number, jitter: number = 0.1): TimingPoint[] => {
  const points: TimingPoint[] = [];
  let time = Date.now() - 3600000;
  for (let i = 0; i < count; i++) {
    const jitterAmount = interval * jitter * (Math.random() - 0.5) * 2;
    const delta = interval + jitterAmount;
    time += delta;
    points.push({ timestamp: time, delta });
  }
  return points;
};

const generateNormalNode = (index: number): ThreatNode => {
  const id = `normal-${randomId()}`;
  const confidence = Math.random() * 25;
  return {
    id, ip: randomIP(CONFIG.internalPrefix), label: `User-${index}`,
    confidence, centrality: Math.random() * 0.3, connections: Math.floor(Math.random() * 3) + 1,
    status: getNodeStatus(confidence), lastSeen: Date.now() - Math.random() * 3600000,
    timingData: generateHumanTiming(15 + Math.floor(Math.random() * 20)),
    reasons: [], jitter: 0.5 + Math.random() * 0.5,
  };
};

const generateC2Bot = (index: number): ThreatNode => {
  const id = `bot-${randomId()}`;
  const beaconInterval = CONFIG.beaconIntervals[Math.floor(Math.random() * CONFIG.beaconIntervals.length)];
  const confidence = 65 + Math.random() * 30;
  const jitter = 0.05 + Math.random() * 0.15;
  return {
    id, ip: randomIP(CONFIG.internalPrefix), label: `Infected-${index}`,
    confidence, centrality: 0.3 + Math.random() * 0.4, connections: Math.floor(Math.random() * 8) + 3,
    status: getNodeStatus(confidence), beaconInterval, jitter,
    headerHash: `0x${Math.random().toString(16).substring(2, 10).toUpperCase()}`,
    lastSeen: Date.now() - Math.random() * 300000,
    timingData: generateBeaconTiming(beaconInterval, 40 + Math.floor(Math.random() * 20), jitter),
    reasons: [`Beacon: ${beaconInterval}ms ± ${Math.round(jitter * 100)}%`, 'Low-jitter timing', 'Non-browser fingerprint'],
  };
};

const generateC2Controller = (index: number): ThreatNode => {
  const id = `controller-${randomId()}`;
  const confidence = 90 + Math.random() * 10;
  return {
    id, ip: randomIP(CONFIG.c2Prefix), label: `C2-Controller-${index}`,
    confidence, centrality: 0.85 + Math.random() * 0.15, connections: 15 + Math.floor(Math.random() * 20),
    status: 'controller', beaconInterval: 500, jitter: 0.02,
    headerHash: `0xDEAD${Math.random().toString(16).substring(2, 6).toUpperCase()}`,
    lastSeen: Date.now() - Math.random() * 60000,
    timingData: generateBeaconTiming(500, 100, 0.02),
    reasons: ['⚠️ SHADOW CONTROLLER', 'Star topology center', 'Commands multiple hosts', 'Rigid timing (500ms)', 'Suspicious IP range'],
  };
};

const generateLateralMover = (index: number): ThreatNode => {
  const id = `lateral-${randomId()}`;
  const confidence = 50 + Math.random() * 30;
  return {
    id, ip: randomIP(CONFIG.internalPrefix), label: `Suspicious-${index}`,
    confidence, centrality: 0.4 + Math.random() * 0.3, connections: 5 + Math.floor(Math.random() * 10),
    status: getNodeStatus(confidence), lastSeen: Date.now() - Math.random() * 1800000,
    timingData: generateHumanTiming(25), reasons: ['Unusual connections', 'Internal scanning', 'Elevated access'],
    jitter: 0.3 + Math.random() * 0.2,
  };
};

export interface MockData { nodes: ThreatNode[]; links: ThreatLink[]; }

export function generateMockData(scale: number = 1): MockData {
  const nodes: ThreatNode[] = [];
  const links: ThreatLink[] = [];

  const controllers: ThreatNode[] = [];
  for (let i = 0; i < Math.ceil(CONFIG.c2Controllers * scale); i++) {
    const c = generateC2Controller(i + 1);
    controllers.push(c);
    nodes.push(c);
  }

  const bots: ThreatNode[] = [];
  for (let i = 0; i < Math.ceil(CONFIG.c2Bots * scale); i++) {
    const controller = controllers[Math.floor(Math.random() * controllers.length)];
    const bot = generateC2Bot(i + 1);
    bots.push(bot);
    nodes.push(bot);
    links.push({ source: bot.id, target: controller.id, value: 5, type: 'c2' });
  }

  for (let i = 0; i < bots.length - 1; i++) {
    if (Math.random() > 0.7) {
      links.push({ source: bots[i].id, target: bots[i + 1].id, value: 2, type: 'lateral' });
    }
  }

  for (let i = 0; i < Math.ceil(CONFIG.lateralMovers * scale); i++) {
    const lateral = generateLateralMover(i + 1);
    nodes.push(lateral);
    const targetBot = bots[Math.floor(Math.random() * bots.length)];
    if (targetBot) {
      links.push({ source: lateral.id, target: targetBot.id, value: 2, type: 'lateral' });
    }
  }

  for (let i = 0; i < Math.ceil(CONFIG.normalUsers * scale); i++) {
    const normal = generateNormalNode(i + 1);
    nodes.push(normal);
    for (let j = 0; j < Math.floor(Math.random() * 3); j++) {
      const target = nodes[Math.floor(Math.random() * nodes.length)];
      if (target && target.id !== normal.id && target.status === 'normal') {
        links.push({ source: normal.id, target: target.id, value: 1, type: 'normal' });
      }
    }
  }

  return { nodes, links };
}

export function generateLargeDataset(nodeCount: number = 10000): MockData {
  const nodes: ThreatNode[] = [];
  const links: ThreatLink[] = [];
  const controllerCount = Math.max(5, Math.floor(nodeCount * 0.002));
  const botCount = Math.floor(nodeCount * 0.15);
  const lateralCount = Math.floor(nodeCount * 0.05);
  const normalCount = nodeCount - controllerCount - botCount - lateralCount;

  const controllers: ThreatNode[] = [];
  for (let i = 0; i < controllerCount; i++) {
    const c = generateC2Controller(i);
    controllers.push(c);
    nodes.push(c);
  }

  const bots: ThreatNode[] = [];
  for (let i = 0; i < botCount; i++) {
    const bot = generateC2Bot(i);
    bots.push(bot);
    nodes.push(bot);
    links.push({ source: bot.id, target: controllers[i % controllers.length].id, value: 5, type: 'c2' });
  }

  for (let i = 0; i < lateralCount; i++) {
    const lateral = generateLateralMover(i);
    nodes.push(lateral);
    if (bots.length > 0) {
      links.push({ source: lateral.id, target: bots[i % bots.length].id, value: 2, type: 'lateral' });
    }
  }

  for (let i = 0; i < normalCount; i++) {
    nodes.push(generateNormalNode(i));
  }

  for (let i = 0; i < normalCount * 0.3; i++) {
    const source = nodes[Math.floor(Math.random() * nodes.length)];
    const target = nodes[Math.floor(Math.random() * nodes.length)];
    if (source.id !== target.id) {
      links.push({ source: source.id, target: target.id, value: 1, type: 'normal' });
    }
  }

  return { nodes, links };
}
