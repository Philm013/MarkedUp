const Emojis = {
    categories: {
        'Smileys': ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😉','😊','😇','🥰','😍','🤩','😘','😋','😛','😜','🤪','😝','🤗','🤔','🤐','😐','😏','😒','🙄','😬','😌','😔','😪','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','😵','🤯','🤠','🥳','😎','🤓','😕','😟','🙁','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','😤','😡','😠','🤬','😈','👿','💀','💩','🤡','👹','👺','👻','👽','👾','🤖'],
        'Gestures': ['👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🧠','🦷','🦴','👀','👁️','👅','👄'],
        'People': ['👶','🧒','👦','👧','🧑','👱','👨','🧔','👩','🧓','👴','👵','🙍','🙎','🙅','🙆','💁','🙋','🧏','🙇','🤦','🤷','👮','🕵️','💂','🥷','👷','🤴','👸','👳','👲','🧕','🤵','👰','🤰','🤱','👼','🎅','🤶','🦸','🦹','🧙','🧚','🧛','🧜','🧝','🧞','🧟','💆','💇','🚶','🧍','🧎','🏃','💃','🕺'],
        'Animals': ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐒','🐔','🐧','🐦','🐤','🐣','🐥','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🦟','🦗','🕷️','🦂','🐢','🐍','🦎','REX','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🦧','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐈','🐓','🦃','🦚','🦜','🦢','🦩','🕊️','🐇','🦝','🦨','🦡','🦫','🦦','🦥','🐁','🐀','🐿️','🦔'],
        'Food': ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🫑','🌽','🥕','🧄','🧅','🥔','🍠','🥐','🥯','🍞','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🥪','🥙','🧆','🌮','🌯','🥗','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🍤','🍙','🍚','🍘','🍥','🥠','🍢','🍡','🍧','🍨','🍦','🥧','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯','🥛','🍼','☕','🍵','🧃','🥤','🧋','🍶','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧉','🍾'],
        'Objects': ['⌚','📱','💻','⌨️','🖥️','🖨️','🖱️','💽','💾','💿','📀','📷','📹','🎥','📞','☎️','📺','📻','🎙️','⏰','⌛','⏳','📡','🔋','🔌','💡','🔦','🕯️','💸','💵','💴','💶','💷','💰','💳','💎','🔧','🔨','🛠️','⚙️','🔩','🔫','💣','🔪','🗡️','⚔️','🛡️','🔮','💊','💉','🧬','🧪','🌡️','🧹','🧺','🧻','🚽','🧼','🔑','🗝️','🚪','🛋️','🛏️','🧸','🎁','🎈','🎀','🎊','🎉'],
        'Symbols': ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','⭐','🌟','✨','⚡','🔥','💥','❌','⭕','🛑','⛔','📛','🚫','💯','💢','♨️','🚷','🚯','🚳','🚱','🔞','📵','🚭','❗','❕','❓','❔','‼️','⁉️','🔅','🔆','⚠️','🚸','🔱','⚜️','🔰','♻️','✅','💹','❇️','✳️','❎','✔️','☑️','🔘','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🟤','🔺','🔻','🔸','🔹','🔶','🔷','🔳','🔲','▪️','▫️','◾','◽','◼️','◻️','🟥','🟧','🟨','🟩','🟦','🟪','⬛','⬜','🟫'],
    },
    
    currentCategory: 'Smileys',
    filtered: [],
    selected: null,

    init() {
        this.filtered = this.categories[this.currentCategory];
        this.renderCategories();
        this.render();
    },

    renderCategories() {
        const chips = document.getElementById('categoryChips');
        chips.innerHTML = '';
        Object.keys(this.categories).forEach(cat => {
            const chip = document.createElement('div');
            chip.className = 'chip' + (cat === this.currentCategory ? ' active' : '');
            chip.textContent = cat;
            chip.addEventListener('click', () => this.setCategory(cat));
            chips.appendChild(chip);
        });
    },

    setCategory(cat) {
        this.currentCategory = cat;
        this.filtered = this.categories[cat];
        this.renderCategories();
        this.render();
    },

    search(query) {
        if (!query) {
            this.filtered = this.categories[this.currentCategory];
        } else {
            this.filtered = Object.values(this.categories).flat().filter(e => e.includes(query));
        }
        this.render();
    },

    render() {
        const grid = document.getElementById('emojisGrid');
        grid.innerHTML = '';
        
        if (this.filtered.length === 0) {
            grid.innerHTML = '<div class="no-results" style="grid-column:1/-1;">No emojis found</div>';
            return;
        }
        
        this.filtered.forEach(emoji => {
            const el = document.createElement('div');
            el.className = 'emoji-item' + (this.selected === emoji ? ' selected' : '');
            el.textContent = emoji;

            const star = document.createElement('div');
            star.className = 'favorite-btn' + (Library.isFavorite(emoji) ? ' active' : '');
            star.innerHTML = '⭐';
            star.onclick = (e) => Library.toggleFavorite(emoji, e);
            el.appendChild(star);

            el.addEventListener('click', () => this.select(emoji));
            grid.appendChild(el);
        });
    },

    select(emoji) {
        this.selected = emoji;
        Editor.pendingAsset = { type: 'emoji', data: emoji };
        Editor.setTool('image', true);
        
        // Close sidebar on mobile
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebarOverlay').classList.remove('active');
        
        Toast.show('Emoji selected - tap canvas to place');
        Library.setTab('captures');
        this.render();
    }
};

