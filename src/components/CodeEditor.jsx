import { useMemo, useRef, useCallback } from 'react';
import { T } from '../styles/tokens.js';

const SYNTAX_PATTERNS = {
  keywords: /^(qubits|qreg|measure|barrier|m)\b/i,
  gates: /^(h|x|y|z|s|t|sdg|tdg|id|cx|cnot|cz|cs|ct|ccx|toffoli|cswap|swap|rx|ry|rz)\b/i,
};

/**
 * Code editor with syntax highlighting overlay.
 *
 * Architecture: transparent textarea on top of a colored div overlay.
 * The textarea captures input; the overlay renders highlighted text.
 * Both scroll together via synchronized scroll positions.
 */
export default function CodeEditor({ code, onChange, activeLine, errorLines }) {
  const overlayRef = useRef(null);
  const textareaRef = useRef(null);

  const handleScroll = useCallback(() => {
    if (overlayRef.current && textareaRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop;
      overlayRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  const handleKeyDown = useCallback((e) => {
    const ta = textareaRef.current;
    if (!ta) return;

    // Tab: insert 2 spaces instead of shifting focus
    if (e.key === 'Tab') {
      e.preventDefault();
      const { selectionStart: start, selectionEnd: end } = ta;
      const newCode = code.slice(0, start) + '  ' + code.slice(end);
      onChange(newCode);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }

    // Escape: clear focus from editor
    else if (e.key === 'Escape') {
      ta.blur();
    }

    // Ctrl+/: toggle # comment on the current line
    else if (e.ctrlKey && e.key === '/') {
      e.preventDefault();
      const { selectionStart: pos } = ta;
      const lines = code.split('\n');
      // Find which line the cursor is on
      let lineStart = 0;
      let lineIdx = lines.length - 1;
      for (let i = 0; i < lines.length; i++) {
        const lineEnd = lineStart + lines[i].length;
        if (pos <= lineEnd || i === lines.length - 1) {
          lineIdx = i;
          break;
        }
        lineStart = lineEnd + 1; // +1 for the '\n'
      }
      const line = lines[lineIdx];
      const trimmed = line.trimStart();
      const indent = line.length - trimmed.length;
      let newLine;
      if (trimmed.startsWith('# ')) {
        newLine = line.slice(0, indent) + trimmed.slice(2);
      } else if (trimmed.startsWith('#')) {
        newLine = line.slice(0, indent) + trimmed.slice(1);
      } else {
        newLine = line.slice(0, indent) + '# ' + trimmed;
      }
      const delta = newLine.length - line.length;
      lines[lineIdx] = newLine;
      onChange(lines.join('\n'));
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = Math.max(lineStart, pos + delta);
      });
    }

    // Prevent native textarea undo/redo - App's global handler owns history
    else if (e.ctrlKey && !e.shiftKey && e.key === 'z') {
      e.preventDefault();
      // don't stopPropagation - let the window handler call handleUndo
    }
    else if (e.ctrlKey && ((!e.shiftKey && e.key === 'y') || (e.shiftKey && e.key === 'Z'))) {
      e.preventDefault();
      // don't stopPropagation - let the window handler call handleRedo
    }
  }, [code, onChange]);

  const highlightedLines = useMemo(() => {
    return code.split("\n").map((line, i) => {
      const trimmed = line.trim();
      const isActive = activeLine === i;
      const isError = errorLines?.includes(i);

      let content;
      if (trimmed.startsWith("#") || trimmed.startsWith("//")) {
        content = <span style={{ color: T.text.dim, fontStyle: "italic" }}>{line}</span>;
      } else {
        const match = line.match(/^(\s*)([\w/]+)(.*)$/);
        if (match) {
          const [, ws, first, rest] = match;
          let color = T.text.primary;
          if (SYNTAX_PATTERNS.keywords.test(first)) color = T.semantic.warning;
          else if (SYNTAX_PATTERNS.gates.test(first)) color = T.accent.light;
          content = (
            <>
              {ws}
              <span style={{ color, fontWeight: "bold" }}>{first}</span>
              <span style={{ color: T.text.muted }}>{rest}</span>
            </>
          );
        } else {
          content = <span style={{ color: T.text.primary }}>{line || " "}</span>;
        }
      }

      return (
        <div
          key={i}
          style={{
            display: "flex",
            height: 21,
            lineHeight: "21px",
            background: isActive
              ? T.bg.activeLine
              : isError
              ? T.bg.errorLine
              : "transparent",
            borderLeft: isActive
              ? `3px solid ${T.semantic.info}`
              : isError
              ? `3px solid ${T.semantic.error}`
              : "3px solid transparent",
            transition: "background 0.15s",
          }}
        >
          <span
            style={{
              width: 36,
              textAlign: "right",
              paddingRight: 8,
              color: isActive ? T.accent.activeNum : T.text.disabled,
              userSelect: "none",
              flexShrink: 0,
              fontSize: T.font.size.md,
            }}
          >
            {i + 1}
          </span>
          <span style={{ whiteSpace: "pre" }}>{content}</span>
        </div>
      );
    });
  }, [code, activeLine, errorLines]);

  return (
    <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
      {/* Highlighted overlay */}
      <div
        ref={overlayRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: "hidden",
          padding: "4px 0",
          fontSize: 13,
          lineHeight: "21px",
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        {highlightedLines}
      </div>

      {/* Actual textarea */}
      <textarea
        ref={textareaRef}
        value={code}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          padding: "4px 0 4px 44px",
          fontSize: 13,
          lineHeight: "21px",
          fontFamily: "inherit",
          background: "transparent",
          color: "transparent",
          caretColor: T.accent.soft,
          border: "none",
          outline: "none",
          resize: "none",
          zIndex: 2,
          whiteSpace: "pre",
          overflowWrap: "normal",
          overflow: "auto",
          tabSize: 2,
        }}
      />
    </div>
  );
}
