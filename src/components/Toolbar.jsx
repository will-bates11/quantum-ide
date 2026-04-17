import { memo } from 'react';
import { T } from '../styles/tokens.js';
import EXAMPLES from '../data/examples.js';

// ── Button style factories ────────────────────────────────────────────────────

const btnBase = {
  padding: "5px 13px",
  borderRadius: T.radius.lg,
  cursor: "pointer",
  fontSize: T.font.size.md,
  fontWeight: 600,
  fontFamily: "inherit",
  transition: "opacity 0.15s",
};

const btnPrimary = {
  ...btnBase,
  border: "none",
  background: T.accent.primary,
  color: T.text.inverse,
};

const btnGhost = {
  ...btnBase,
  border: `1px solid ${T.border.muted}`,
  background: "transparent",
  color: T.text.muted,
};

// Thin vertical separator
function Sep() {
  return (
    <div
      aria-hidden="true"
      style={{
        width: 1,
        height: 20,
        background: T.border.subtle,
        marginLeft: T.space[1],
        marginRight: T.space[1],
        flexShrink: 0,
      }}
    />
  );
}

// ── Toolbar ───────────────────────────────────────────────────────────────────

function Toolbar({
  onRun, onStep, onReset, onUndo, onRedo, canUndo, canRedo,
  onOpen, onSave, onSaveAs,
  onExportQASM, onImportQASM,
  onLoadExample,
  currentFilePath, isDirty,
  shots, onShotsChange,
  showPalette, onTogglePalette,
}) {
  const fileName = currentFilePath
    ? currentFilePath.split(/[\\/]/).pop()
    : 'untitled.qs';

  return (
    <div
      role="toolbar"
      aria-label="IDE controls"
      style={{
        display: "flex",
        alignItems: "center",
        gap: T.space[3],
        padding: `${T.space[3]}px ${T.space[5]}px`,
        background: T.bg.toolbar,
        borderBottom: `1px solid ${T.border.subtle}`,
        flexShrink: 0,
        flexWrap: "wrap",
      }}
    >
      {/* Logo */}
      <div aria-hidden="true" style={{ display: "flex", alignItems: "center", gap: T.space[3], marginRight: T.space[4] }}>
        <svg width="16" height="16" viewBox="0 0 32 32" aria-hidden="true">
          <circle cx="16" cy="16" r="14" fill={T.accent.primary} />
          <circle cx="16" cy="16" r="6" fill="none" stroke="white" strokeWidth="2" />
          <circle cx="16" cy="10" r="2" fill="white" />
        </svg>
        <span style={{ fontSize: T.font.size.lg, fontWeight: 700, color: T.accent.light, letterSpacing: 1.5 }}>
          QUANTUM IDE
        </span>
        <span style={{ fontSize: T.font.size.xs, color: T.text.dim, marginLeft: T.space[1] }}>v1.0</span>
      </div>

      <Sep />

      {/* File operations */}
      <button
        onClick={onOpen}
        aria-label="Open file (Ctrl+O)"
        title="Open file  (Ctrl+O)"
        style={btnGhost}
      >
        📂 Open
      </button>

      <button
        onClick={onSave}
        aria-label={isDirty ? "Save file — unsaved changes (Ctrl+S)" : "Save file (Ctrl+S)"}
        title={currentFilePath ? "Save  (Ctrl+S)" : "Save As  (Ctrl+S)"}
        style={{
          ...btnGhost,
          color:       isDirty ? T.accent.light : T.text.muted,
          borderColor: isDirty ? T.accent.secondary : T.border.muted,
        }}
      >
        💾 Save
      </button>

      <button
        onClick={onSaveAs}
        aria-label="Save as new file (Ctrl+Shift+S)"
        title="Save As  (Ctrl+Shift+S)"
        style={btnGhost}
      >
        Save As…
      </button>

      <Sep />

      <button
        onClick={onExportQASM}
        aria-label="Export as OpenQASM 2.0"
        title="Export OpenQASM 2.0"
        style={btnGhost}
      >
        ↑ QASM
      </button>

      <button
        onClick={onImportQASM}
        aria-label="Import OpenQASM 2.0 file"
        title="Import OpenQASM 2.0"
        style={btnGhost}
      >
        ↓ QASM
      </button>

      {/* Filename pill */}
      <div
        aria-label={`Current file: ${fileName}${isDirty ? ', unsaved changes' : ''}`}
        role="status"
        style={{
          display: "flex",
          alignItems: "center",
          gap: T.space[2],
          padding: `2px ${T.space[4]}px`,
          borderRadius: T.radius.pill,
          background: T.bg.panel,
          border: `1px solid ${T.border.subtle}`,
          maxWidth: 200,
          overflow: "hidden",
        }}
      >
        {isDirty && (
          <span
            aria-hidden="true"
            style={{ color: T.accent.primary, fontSize: 14, lineHeight: 1, flexShrink: 0 }}
          >
            ●
          </span>
        )}
        <span style={{
          fontSize: T.font.size.sm,
          color: isDirty ? T.accent.light : T.text.dim,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {fileName}
        </span>
      </div>

      <Sep />

      {/* Simulator controls */}
      <label
        htmlFor="shots-input"
        style={{ fontSize: T.font.size.sm, color: T.text.dim, flexShrink: 0 }}
      >
        Shots:
      </label>
      <input
        id="shots-input"
        type="number"
        min={1}
        max={10000}
        value={shots}
        onChange={e => {
          const v = parseInt(e.target.value, 10);
          onShotsChange(Number.isFinite(v) ? Math.max(1, Math.min(10000, v)) : 1);
        }}
        aria-label="Number of shots"
        title="Number of times to run the circuit (1–10000)"
        style={{
          width: 62,
          padding: '4px 6px',
          borderRadius: T.radius.lg,
          border: `1px solid ${shots > 1 ? T.accent.secondary : T.border.muted}`,
          background: T.bg.panel,
          color: shots > 1 ? T.accent.light : T.text.primary,
          fontSize: T.font.size.sm,
          fontFamily: 'inherit',
          textAlign: 'center',
          flexShrink: 0,
          outline: 'none',
        }}
      />
      <button
        onClick={onRun}
        aria-label={shots > 1 ? `Run program ${shots} times (Ctrl+Enter)` : "Run program (Ctrl+Enter)"}
        title="Run program  (Ctrl+Enter)"
        style={btnPrimary}
      >
        ▶ Run{shots > 1 ? ` (${shots.toLocaleString()}×)` : ''}
      </button>

      <button
        onClick={onStep}
        aria-label="Step one gate (Ctrl+Shift+Enter)"
        title="Step  (Ctrl+Shift+Enter)"
        style={{
          ...btnGhost,
          color: T.accent.soft,
          borderColor: T.accent.secondary,
        }}
      >
        ⏩ Step
      </button>

      <button
        onClick={onReset}
        aria-label="Reset simulation (Ctrl+R)"
        title="Reset  (Ctrl+R)"
        style={btnGhost}
      >
        ↺ Reset
      </button>

      <Sep />

      <button
        onClick={onUndo}
        disabled={!canUndo}
        aria-label="Undo (Ctrl+Z)"
        title="Undo  (Ctrl+Z)"
        style={{
          ...btnGhost,
          opacity: canUndo ? 1 : 0.35,
          cursor: canUndo ? 'pointer' : 'default',
        }}
      >
        ↩ Undo
      </button>

      <button
        onClick={onRedo}
        disabled={!canRedo}
        aria-label="Redo (Ctrl+Shift+Z)"
        title="Redo  (Ctrl+Shift+Z / Ctrl+Y)"
        style={{
          ...btnGhost,
          opacity: canRedo ? 1 : 0.35,
          cursor: canRedo ? 'pointer' : 'default',
        }}
      >
        ↪ Redo
      </button>

      {/* Examples dropdown + palette toggle — right-aligned */}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: T.space[3] }}>
        <button
          onClick={onTogglePalette}
          aria-label={showPalette ? "Hide gate palette" : "Show gate palette"}
          title="Toggle gate palette"
          style={{
            ...btnGhost,
            borderColor: showPalette ? T.accent.secondary : T.border.muted,
            color:       showPalette ? T.accent.soft     : T.text.muted,
          }}
        >
          🎨 Palette
        </button>
        <Sep />
        <label
          htmlFor="examples-select"
          style={{ fontSize: T.font.size.sm, color: T.text.dim }}
        >
          Examples:
        </label>
        <select
          id="examples-select"
          aria-label="Load an example quantum program"
          onChange={(e) => {
            if (e.target.value) {
              onLoadExample(e.target.value);
              e.target.value = "";
            }
          }}
          style={{
            padding: `${T.space[2]}px ${T.space[4]}px`,
            borderRadius: T.radius.lg,
            border: `1px solid ${T.border.muted}`,
            fontSize: T.font.size.sm,
            fontFamily: "inherit",
            background: T.bg.panel,
            color: T.accent.soft,
            cursor: "pointer",
          }}
        >
          <option value="">Load program…</option>
          {Object.entries(EXAMPLES).map(([name, { description }]) => (
            <option key={name} value={name} title={description}>
              {name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default memo(Toolbar);
