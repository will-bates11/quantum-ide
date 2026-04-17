/**
 * OpenQASM 2.0 Import / Export
 *
 * exportToQASM — converts parsed DSL instructions → valid QASM string
 * importFromQASM — converts QASM string → DSL source text
 */

const PI = Math.PI;

// Map numeric angle → symbolic string for clean QASM output
const ANGLE_SYMS = [
  [2 * PI,    '2*pi'],
  [-2 * PI,   '-2*pi'],
  [PI,        'pi'],
  [-PI,       '-pi'],
  [PI / 2,    'pi/2'],
  [-PI / 2,   '-pi/2'],
  [PI / 3,    'pi/3'],
  [-PI / 3,   '-pi/3'],
  [PI / 4,    'pi/4'],
  [-PI / 4,   '-pi/4'],
  [PI / 6,    'pi/6'],
  [-PI / 6,   '-pi/6'],
  [PI / 8,    'pi/8'],
  [-PI / 8,   '-pi/8'],
];

function angleToStr(angle) {
  for (const [val, sym] of ANGLE_SYMS) {
    if (Math.abs(angle - val) < 1e-10) return sym;
  }
  return String(angle);
}

// Single-qubit DSL gate name → QASM gate name (they are identical in this set)
const GATE_TO_QASM = { h: 'h', x: 'x', y: 'y', z: 'z', s: 's', t: 't', sdg: 'sdg', tdg: 'tdg', id: 'id' };

/**
 * Emit one instruction as a QASM line (or several, for measure_all / custom_gate).
 * Returns a string (may contain newlines) or null to skip.
 */
function emitInstruction(inst, nQubits, customGates, qubitOf) {
  const q = qubitOf || (i => i);

  switch (inst.type) {
    case 'qubits':
      return null;

    case 'gate': {
      const name = GATE_TO_QASM[inst.gate];
      if (name) return `${name} q[${q(inst.qubits[0])}];`;
      return `// unsupported: ${inst.gate} q[${q(inst.qubits[0])}]`;
    }

    case 'rotation':
      return `${inst.gate}(${angleToStr(inst.angle)}) q[${q(inst.qubits[0])}];`;

    case 'cx':
      return `cx q[${q(inst.qubits[0])}],q[${q(inst.qubits[1])}];`;

    case 'cz':
      return `cz q[${q(inst.qubits[0])}],q[${q(inst.qubits[1])}];`;

    case 'cs':
      return `// unsupported: cs q[${q(inst.qubits[0])}],q[${q(inst.qubits[1])}]`;

    case 'ct':
      return `// unsupported: ct q[${q(inst.qubits[0])}],q[${q(inst.qubits[1])}]`;

    case 'swap':
      return `swap q[${q(inst.qubits[0])}],q[${q(inst.qubits[1])}];`;

    case 'ccx':
      return `ccx q[${q(inst.qubits[0])}],q[${q(inst.qubits[1])}],q[${q(inst.qubits[2])}];`;

    case 'cswap':
      return `cswap q[${q(inst.qubits[0])}],q[${q(inst.qubits[1])}],q[${q(inst.qubits[2])}];`;

    case 'measure':
      return `measure q[${q(inst.qubits[0])}] -> c[${q(inst.qubits[0])}];`;

    case 'measure_all': {
      const rows = [];
      for (let i = 0; i < nQubits; i++) rows.push(`measure q[${i}] -> c[${i}];`);
      return rows.join('\n');
    }

    case 'barrier':
      return 'barrier q;';

    case 'custom_gate': {
      const def = customGates[inst.name];
      if (!def) return `// unsupported: ${inst.name}`;
      const expanded = [];
      for (const bodyInst of def.body) {
        const remapped = {
          ...bodyInst,
          qubits: bodyInst.qubits?.map(localIdx => inst.qubits[localIdx]),
        };
        const line = emitInstruction(remapped, nQubits, customGates, q);
        if (line !== null) expanded.push(line);
      }
      return expanded.join('\n') || null;
    }

    default:
      return `// unsupported: ${inst.type}`;
  }
}

/**
 * Convert DSL instructions to an OpenQASM 2.0 string.
 *
 * @param {Array}  instructions  - Parsed instruction list from parser.js
 * @param {number} nQubits       - Number of qubits
 * @param {Object} customGates   - Custom gate definitions (for inline expansion)
 * @returns {string} Valid OpenQASM 2.0 source
 */
export function exportToQASM(instructions, nQubits, customGates = {}) {
  const lines = [
    'OPENQASM 2.0;',
    'include "qelib1.inc";',
    '',
    `qreg q[${nQubits}];`,
    `creg c[${nQubits}];`,
    '',
  ];

  for (const inst of instructions) {
    const out = emitInstruction(inst, nQubits, customGates, null);
    if (out !== null) lines.push(out);
  }

  return lines.join('\n');
}

// QASM gate name → DSL instruction type / gate name
const QASM_SINGLE = new Set(['h', 'x', 'y', 'z', 's', 't', 'sdg', 'tdg', 'id']);
const QASM_ROT    = new Set(['rx', 'ry', 'rz']);
const QASM_TWO    = new Set(['cx', 'cz', 'swap']);
const QASM_THREE  = new Set(['ccx', 'cswap']);

/**
 * Convert an OpenQASM 2.0 string back to DSL source text.
 *
 * @param {string} qasmString - OpenQASM 2.0 source
 * @returns {string} DSL source text suitable for the code editor
 */
export function importFromQASM(qasmString) {
  const dsl = [];
  let inGateDef = false;
  let braceDepth = 0;

  for (const rawLine of qasmString.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('//') || line.startsWith('/*')) continue;

    // Track gate definition blocks (brace-delimited)
    if (inGateDef) {
      braceDepth += (line.match(/\{/g) || []).length;
      braceDepth -= (line.match(/\}/g) || []).length;
      if (braceDepth <= 0) inGateDef = false;
      continue;
    }

    // Strip trailing semicolon for easier matching
    const raw = line.replace(/;$/, '').trim();

    if (raw.startsWith('OPENQASM')) continue;
    if (raw.startsWith('include'))  continue;
    if (raw.startsWith('creg'))     continue;

    // gate definitions — skip entire block
    if (/^gate\b/.test(raw)) {
      inGateDef = true;
      braceDepth = (raw.match(/\{/g) || []).length - (raw.match(/\}/g) || []).length;
      if (braceDepth <= 0) inGateDef = false; // single-line gate (rare)
      continue;
    }

    // qreg q[N] → qubits N
    const qregM = raw.match(/^qreg\s+\w+\[(\d+)\]/);
    if (qregM) { dsl.push(`qubits ${qregM[1]}`); continue; }

    // measure q[x] -> c[y] → measure x
    const measM = raw.match(/^measure\s+\w+\[(\d+)\]\s*->\s*\w+\[(\d+)\]/);
    if (measM) { dsl.push(`measure ${measM[1]}`); continue; }

    // barrier (any form) → barrier
    if (/^barrier\b/.test(raw)) { dsl.push('barrier'); continue; }

    // Rotation gates: rx(angle) q[x]
    const rotM = raw.match(/^(rx|ry|rz)\(([^)]+)\)\s+\w+\[(\d+)\]/);
    if (rotM) {
      const angleStr = rotM[2].trim().toLowerCase();
      dsl.push(`${rotM[1]} ${angleStr} ${rotM[3]}`);
      continue;
    }

    // Single-qubit gates: h q[x]
    const sq = raw.match(/^(\w+)\s+\w+\[(\d+)\]$/);
    if (sq && QASM_SINGLE.has(sq[1].toLowerCase())) {
      dsl.push(`${sq[1].toLowerCase()} ${sq[2]}`);
      continue;
    }

    // Two-qubit gates: cx q[x],q[y]
    const twoM = raw.match(/^(\w+)\s+\w+\[(\d+)\]\s*,\s*\w+\[(\d+)\]$/);
    if (twoM && QASM_TWO.has(twoM[1].toLowerCase())) {
      dsl.push(`${twoM[1].toLowerCase()} ${twoM[2]} ${twoM[3]}`);
      continue;
    }

    // Three-qubit gates: ccx q[x],q[y],q[z]
    const threeM = raw.match(/^(\w+)\s+\w+\[(\d+)\]\s*,\s*\w+\[(\d+)\]\s*,\s*\w+\[(\d+)\]$/);
    if (threeM && QASM_THREE.has(threeM[1].toLowerCase())) {
      dsl.push(`${threeM[1].toLowerCase()} ${threeM[2]} ${threeM[3]} ${threeM[4]}`);
      continue;
    }

    // Unknown non-empty line
    if (raw) dsl.push(`# unsupported: ${raw}`);
  }

  return dsl.join('\n');
}