const Toast = {
    show(msg, type = 'success') {
        const toast = document.getElementById('toast');
        toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
        document.getElementById('toastIcon').textContent = type === 'success' ? '✓' : '✕';
        document.getElementById('toastMsg').textContent = msg;
        toast.className = 'toast show ' + type;
        clearTimeout(this.timer);
        this.timer = setTimeout(() => toast.classList.remove('show'), 3000);
    }
};

const Modal = {
    activeId: null,
    lastFocused: null,
    confirmCallback: null,
    promptCallback: null,

    getFocusable(root) {
        return Array.from(root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
            .filter(el => !el.disabled && el.offsetParent !== null);
    },

    onKeyDown(e) {
        if (!this.activeId) return;
        const modal = document.getElementById(this.activeId);
        if (!modal || !modal.classList.contains('open')) return;

        if (e.key === 'Escape') {
            e.preventDefault();
            this.close(this.activeId);
            return;
        }

        if (e.key !== 'Tab') return;
        const focusables = this.getFocusable(modal);
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;

        if (e.shiftKey && active === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && active === last) {
            e.preventDefault();
            first.focus();
        }
    },

    open(id) {
        const modal = document.getElementById(id);
        if (!modal) return;
        this.lastFocused = document.activeElement;
        this.activeId = id;
        modal.classList.add('open');

        const focusables = this.getFocusable(modal);
        if (focusables.length > 0) focusables[0].focus();
        else modal.focus();

        if (!this._boundKeyDown) {
            this._boundKeyDown = this.onKeyDown.bind(this);
            document.addEventListener('keydown', this._boundKeyDown);
        }
    },

    close(id) {
        const modal = document.getElementById(id);
        if (!modal) return;
        modal.classList.remove('open');

        if (this.activeId === id) {
            this.activeId = null;
            if (this._boundKeyDown) {
                document.removeEventListener('keydown', this._boundKeyDown);
                this._boundKeyDown = null;
            }
            if (this.lastFocused && typeof this.lastFocused.focus === 'function') {
                this.lastFocused.focus();
            }
            this.lastFocused = null;
        }
    },
    confirm(title, msg, cb) {
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMsg').textContent = msg;
        this.confirmCallback = cb;
        this.open('confirmModal');
    },

    prompt(title, msg, defaultValue, options = {}, cb) {
        document.getElementById('promptTitle').textContent = title || 'Input Required';
        document.getElementById('promptMsg').textContent = msg || 'Please enter a value.';

        const input = document.getElementById('promptInput');
        const label = document.getElementById('promptInputLabel');
        if (label) label.textContent = options.label || 'Value';

        if (input) {
            input.value = defaultValue || '';
            input.placeholder = options.placeholder || 'Enter value...';
            if (options.selectAll) {
                setTimeout(() => {
                    input.focus();
                    input.select();
                }, 0);
            }
        }

        this.promptCallback = cb;
        this.open('promptModal');
    }
};

