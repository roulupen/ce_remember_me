// JsonDiff.js - Side-by-side JSON Diff Tool with session persistence
class JsonDiff {
    constructor() {
        this.util        = window.Utility;
        this.mode        = 'edit'; // 'edit' | 'diff'
        this.hunks       = [];
        this.currentHunk = -1;
        this.STORAGE_KEY = 'jsondiff_state';
    }

    async init() {
        this.setupEventListeners();
        await this.loadState();
        console.log('[JsonDiff] Initialized');
    }

    setupEventListeners() {
        document.getElementById('jd-format-left')?.addEventListener('click',  () => this.formatJson('left'));
        document.getElementById('jd-format-right')?.addEventListener('click', () => this.formatJson('right'));
        document.getElementById('jd-clear-left')?.addEventListener('click',   () => this.clearPanel('left'));
        document.getElementById('jd-clear-right')?.addEventListener('click',  () => this.clearPanel('right'));
        document.getElementById('jd-run-btn')?.addEventListener('click',      () => this.runDiff());
        document.getElementById('jd-edit-btn')?.addEventListener('click',     () => this.resetToEdit());
        document.getElementById('jd-prev-btn')?.addEventListener('click',     () => this.navigate(-1));
        document.getElementById('jd-next-btn')?.addEventListener('click',     () => this.navigate(1));

        // Auto-save while the user types (debounced so we don't thrash storage)
        const debouncedSave = this.util.debounce(() => this.saveState(), 800);
        document.getElementById('jd-textarea-left')?.addEventListener('input',  debouncedSave);
        document.getElementById('jd-textarea-right')?.addEventListener('input', debouncedSave);
    }

    // ── Persistence ────────────────────────────────────────────────────────────

    async loadState() {
        try {
            const state = await this.util.loadFromStorage(this.STORAGE_KEY, null);
            if (!state) return;

            const leftTa  = document.getElementById('jd-textarea-left');
            const rightTa = document.getElementById('jd-textarea-right');

            if (leftTa  && state.left)  leftTa.value  = state.left;
            if (rightTa && state.right) rightTa.value = state.right;

            // Re-run diff if the user left in diff mode
            if (state.mode === 'diff' && (state.left || state.right)) {
                this.runDiff();
            }

            console.log('[JsonDiff] State restored (mode:', state.mode, ')');
        } catch (e) {
            console.error('[JsonDiff] Error restoring state:', e);
        }
    }

    async saveState() {
        try {
            const left  = document.getElementById('jd-textarea-left')?.value  ?? '';
            const right = document.getElementById('jd-textarea-right')?.value ?? '';
            await this.util.saveToStorage(this.STORAGE_KEY, { left, right, mode: this.mode });
        } catch (e) {
            console.error('[JsonDiff] Error saving state:', e);
        }
    }

    // ── Format JSON ────────────────────────────────────────────────────────────

    formatJson(side) {
        const ta = document.getElementById(`jd-textarea-${side}`);
        if (!ta) return;

        const text = ta.value.trim();
        if (!text) {
            this.util.showWarning(`${side === 'left' ? 'Original' : 'Modified'} panel is empty`);
            return;
        }

        try {
            ta.value = JSON.stringify(JSON.parse(text), null, 2);
            this.util.showSuccess('JSON formatted');
            this.saveState();
        } catch (e) {
            this.util.showError(`Invalid JSON: ${e.message}`);
        }
    }

    // ── Clear ──────────────────────────────────────────────────────────────────

    clearPanel(side) {
        const ta = document.getElementById(`jd-textarea-${side}`);
        if (ta) ta.value = '';
        if (this.mode === 'diff') this.resetToEdit();
        this.saveState();
    }

    // ── Run Diff ───────────────────────────────────────────────────────────────

    runDiff() {
        const leftRaw  = document.getElementById('jd-textarea-left')?.value  ?? '';
        const rightRaw = document.getElementById('jd-textarea-right')?.value ?? '';

        if (!leftRaw.trim() && !rightRaw.trim()) {
            this.util.showWarning('Both panels are empty');
            return;
        }

        const leftLines  = this._toLines(leftRaw);
        const rightLines = this._toLines(rightRaw);

        const diff            = this._computeDiff(leftLines, rightLines);
        const { rows, hunks } = this._buildRows(diff);

        this.hunks       = hunks;
        this.currentHunk = -1;

        this._renderDiff(rows);
        this._enterDiffMode(hunks.length);
        this.saveState();
    }

    // Convert raw text → lines, pretty-printing JSON when possible
    _toLines(text) {
        if (!text.trim()) return [];
        try {
            return JSON.stringify(JSON.parse(text), null, 2).split('\n');
        } catch {
            return text.split('\n');
        }
    }

    // ── LCS Diff ───────────────────────────────────────────────────────────────

    _computeDiff(oldL, newL) {
        const m = oldL.length;
        const n = newL.length;

        // For very large inputs fall back to a simple delete-all / insert-all diff
        if (m * n > 5_000_000) {
            return [
                ...oldL.map(v => ({ type: 'delete', value: v })),
                ...newL.map(v => ({ type: 'insert', value: v })),
            ];
        }

        // Build LCS table using flat Uint32Array for memory efficiency
        const dp = new Uint32Array((m + 1) * (n + 1));
        const W  = n + 1;

        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (oldL[i - 1] === newL[j - 1]) {
                    dp[i * W + j] = dp[(i - 1) * W + (j - 1)] + 1;
                } else {
                    const up   = dp[(i - 1) * W + j];
                    const left = dp[i * W + (j - 1)];
                    dp[i * W + j] = up > left ? up : left;
                }
            }
        }

        // Backtrack
        const result = [];
        let i = m, j = n;
        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && oldL[i - 1] === newL[j - 1]) {
                result.push({ type: 'equal', value: oldL[i - 1] });
                i--; j--;
            } else if (j > 0 && (i === 0 || dp[i * W + (j - 1)] >= dp[(i - 1) * W + j])) {
                result.push({ type: 'insert', value: newL[j - 1] });
                j--;
            } else {
                result.push({ type: 'delete', value: oldL[i - 1] });
                i--;
            }
        }

        return result.reverse();
    }

    // ── Build display rows ─────────────────────────────────────────────────────

    _buildRows(diff) {
        const rows  = [];
        const hunks = [];
        let leftNum  = 1;
        let rightNum = 1;
        let i = 0;

        while (i < diff.length) {
            const item = diff[i];

            if (item.type === 'equal') {
                rows.push({ kind: 'equal', leftNum: leftNum++, rightNum: rightNum++, content: item.value });
                i++;
                continue;
            }

            const hunkIdx = hunks.length;
            hunks.push(rows.length);

            const dels = [], ins = [];
            while (i < diff.length && diff[i].type !== 'equal') {
                if (diff[i].type === 'delete') dels.push(diff[i].value);
                else                           ins.push(diff[i].value);
                i++;
            }

            const maxLen = Math.max(dels.length, ins.length);
            for (let k = 0; k < maxLen; k++) {
                const hasDel = k < dels.length;
                const hasIns = k < ins.length;
                rows.push({
                    kind:         'change',
                    hunkIdx,
                    isHunkStart:  k === 0,
                    leftType:     hasDel ? 'deleted'  : 'placeholder',
                    rightType:    hasIns ? 'inserted' : 'placeholder',
                    leftNum:      hasDel ? leftNum++  : null,
                    rightNum:     hasIns ? rightNum++ : null,
                    leftContent:  hasDel ? dels[k]   : '',
                    rightContent: hasIns ? ins[k]    : '',
                });
            }
        }

        return { rows, hunks };
    }

    // ── Render ─────────────────────────────────────────────────────────────────

    _renderDiff(rows) {
        const view = document.getElementById('jd-diff-view');
        if (!view) return;

        const frag = document.createDocumentFragment();

        // Sticky column headers
        const header = document.createElement('div');
        header.className = 'jd-row jd-header-row';
        header.innerHTML = `
            <div class="jd-cell"><span class="jd-col-label">Original</span></div>
            <div class="jd-cell"><span class="jd-col-label">Modified</span></div>`;
        frag.appendChild(header);

        for (const row of rows) {
            const el = document.createElement('div');
            el.className = 'jd-row';

            if (row.kind === 'equal') {
                el.appendChild(this._cell('equal', row.leftNum,  row.content));
                el.appendChild(this._cell('equal', row.rightNum, row.content));
            } else {
                el.setAttribute('data-hunk-group', row.hunkIdx);
                if (row.isHunkStart) el.setAttribute('data-hunk-start', row.hunkIdx);
                el.appendChild(this._cell(row.leftType,  row.leftNum,  row.leftContent));
                el.appendChild(this._cell(row.rightType, row.rightNum, row.rightContent));
            }

            frag.appendChild(el);
        }

        view.innerHTML = '';
        view.appendChild(frag);
    }

    _cell(type, lineNum, content) {
        const cell = document.createElement('div');
        cell.className = `jd-cell jd-${type}`;

        const num  = document.createElement('span');
        num.className = 'jd-num';
        num.textContent = lineNum !== null ? lineNum : '';

        const sign = document.createElement('span');
        sign.className = 'jd-sign';
        sign.textContent = type === 'deleted' ? '-' : type === 'inserted' ? '+' : '\u00a0';

        const text = document.createElement('span');
        text.className = 'jd-text';
        text.textContent = content;

        cell.append(num, sign, text);
        return cell;
    }

    // ── Mode switching ─────────────────────────────────────────────────────────

    _enterDiffMode(hunkCount) {
        this.mode = 'diff';

        this._show('jd-diff-view');
        this._hide('jd-editor-panels');
        this._hide('jd-run-btn');
        this._show('jd-edit-btn');
        ['jd-format-left', 'jd-clear-left', 'jd-format-right', 'jd-clear-right']
            .forEach(id => this._hide(id));

        const nav     = document.getElementById('jd-nav');
        const summary = document.getElementById('jd-summary');

        if (hunkCount === 0) {
            nav.style.display = 'none';
            summary.textContent = 'Files are identical';
            summary.className = 'jd-summary jd-identical';
        } else {
            nav.style.display = 'flex';
            summary.textContent = `${hunkCount} difference${hunkCount !== 1 ? 's' : ''}`;
            summary.className = 'jd-summary jd-has-diffs';
            this.navigate(1);
        }
    }

    resetToEdit() {
        this.mode        = 'edit';
        this.hunks       = [];
        this.currentHunk = -1;

        this._show('jd-editor-panels');
        this._hide('jd-diff-view');
        this._show('jd-run-btn');
        this._hide('jd-edit-btn');
        ['jd-format-left', 'jd-clear-left', 'jd-format-right', 'jd-clear-right']
            .forEach(id => this._show(id));

        document.getElementById('jd-nav').style.display     = 'none';
        document.getElementById('jd-summary').textContent   = '';
        document.getElementById('jd-diff-view').innerHTML   = '';

        this.saveState();
    }

    // ── Navigation ─────────────────────────────────────────────────────────────

    navigate(direction) {
        if (!this.hunks.length) return;

        this.currentHunk = Math.max(0, Math.min(
            this.hunks.length - 1,
            this.currentHunk + direction
        ));

        this._updateNav();
        this._scrollToHunk(this.currentHunk);
    }

    _updateNav() {
        const counter = document.getElementById('jd-counter');
        if (counter) {
            counter.textContent = this.currentHunk >= 0
                ? `${this.currentHunk + 1} / ${this.hunks.length}`
                : `0 / ${this.hunks.length}`;
        }
        const prev = document.getElementById('jd-prev-btn');
        const next = document.getElementById('jd-next-btn');
        if (prev) prev.disabled = this.currentHunk <= 0;
        if (next) next.disabled = this.currentHunk >= this.hunks.length - 1;
    }

    _scrollToHunk(hunkIdx) {
        const view = document.getElementById('jd-diff-view');
        if (!view) return;

        view.querySelectorAll('.jd-hunk-active').forEach(el => el.classList.remove('jd-hunk-active'));
        view.querySelectorAll(`[data-hunk-group="${hunkIdx}"]`).forEach(el => el.classList.add('jd-hunk-active'));

        const first = view.querySelector(`[data-hunk-start="${hunkIdx}"]`);
        if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    _show(id) {
        const el = document.getElementById(id);
        if (el) el.style.display = '';
    }

    _hide(id) {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    }
}

window.JsonDiff = new JsonDiff();
