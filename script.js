document.addEventListener('DOMContentLoaded', () => {
    const lists = document.querySelectorAll('.card-list');
    const addButtons = document.querySelectorAll('.add-card-btn');
    const fileInput = document.querySelector('#json-input');
    const sidebarButtons = document.querySelectorAll('.sidebar-action');
    const dropzone = document.getElementById('dropzone');

    const storageKey = 'open-todo-data';
    const projectTitleHeader = document.querySelector('.project-title-header');

    function getNormalizedText(el) {
        if (!el) return '';
        return (el.textContent || '')
            .replace(/\u00A0/g, '')
            .replace(/\n/g, '')
            .trim();
    }

    function dataCollect() {
        const data = { projectTitle: '', lists: [] };
        data.projectTitle = getNormalizedText(projectTitleHeader);

        lists.forEach(list => {
            const listId = list.id;
            const columnName = listId.replace('list-', '').toUpperCase();

            const cards = [];
            const cardElements = list.querySelectorAll('.card');

            cardElements.forEach(card => {
                const titleEl = card.querySelector('.card-title');
                if (!titleEl) return;

                const cardTitle = titleEl.textContent.replace(/\s+/g, ' ').trim();

                if (cardTitle.length > 0 && cardTitle !== '✖') {
                    cards.push({ title: cardTitle });
                }
            });

            data.lists.push({
                name: columnName,
                cards: cards
            });
        });

        return data;
    }

    function loadData(data) {
        lists.forEach(list => list.innerHTML = '');

        if (projectTitleHeader) {
            projectTitleHeader.textContent = data.projectTitle || '';
            if (getNormalizedText(projectTitleHeader).length === 0) {
                projectTitleHeader.classList.add('empty');
                projectTitleHeader.innerHTML = '';
            } else {
                projectTitleHeader.classList.remove('empty');
            }
        }

        data.lists.forEach(list => {
            const listElement = document.getElementById('list-' + (list.name || '').toLowerCase()) || document.getElementById(list.id);
            if (!listElement) return;

            list.cards.forEach(card => {
                const newCard = document.createElement('div');
                newCard.className = 'card';

                newCard.innerHTML = `
                    <div class="drag-handle">⠿</div>
                    <div class="card-body">
                        <div class="card-title" contenteditable="true" data-placeholder="New task..."></div>
                    </div>
                    <button class="delete-btn">✖</button>
                `;

                newCard.querySelector('.card-title').textContent = card.title;

                listElement.appendChild(newCard);
            });
        });
    }

    function saveToStorage() {
        const data = dataCollect();
        localStorage.setItem(storageKey, JSON.stringify(data));
    }

    function loadFromStorage() {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return;

        try {
            const data = JSON.parse(raw);
            loadData(data);
        } catch (e) {
            console.error('localStorage data failed', e);
        }
    }

    lists.forEach(list => {
        new Sortable(list, {
            group: 'shared',
            draggable: '.card',
            animation: 0,
            ghostClass: 'card-ghost',
            chosenClass: 'chosen-card',
            fallbackClass: 'sortable-fallback',
            forceFallback: true,
            swapThreshold: 0.65,
            filter: '.delete-btn',
            onEnd: () => {
                saveToStorage();
            }
        });
    });

    addButtons.forEach(button => {
        button.addEventListener('click', () => {
            const columnId = button.getAttribute('data-column');
            const list = document.getElementById(columnId);
            if (!list) return;

            const newCard = document.createElement('div');
            newCard.className = 'card';

            newCard.innerHTML = `
                <div class="drag-handle">⠿</div>
                <div class="card-body">
                    <div class="card-title" contenteditable="true" data-placeholder="New task..."></div>
                </div>
                <button class="delete-btn">✖</button>
            `;

            list.appendChild(newCard);

            const title = newCard.querySelector('.card-title');
            title.focus();


            initPlaceholderFor(title);

            saveToStorage();
        });
    });

    document.addEventListener('click', e => {
        if (e.target.classList.contains('delete-btn')) {
            const card = e.target.closest('.card');
            if (card) {
                card.remove();
                saveToStorage();
            }
        }
    });

    document.addEventListener('input', e => {
        if (e.target.classList.contains('card-title') || e.target.classList.contains('project-title-header')) {
            saveToStorage();
        }
    });

    document.addEventListener('keydown', e => {
        if (e.target.classList.contains('project-title-header') && (e.key === 'Enter' || e.key === 'NumpadEnter')) {
            e.preventDefault();
            e.target.blur();
        }
    });

    function initPlaceholderFor(el) {
        if (!el) return;

        function updateEmptyState() {

            const txt = (el.textContent || '').replace(/\u00A0/g, '').replace(/\n/g, '').trim();
            if (txt.length === 0) {
                el.classList.add('empty');
                el.innerHTML = '';
            } else {
                el.classList.remove('empty');
            }
        }

        el.addEventListener('blur', () => {
            updateEmptyState();
            saveToStorage();
        });

        el.addEventListener('input', () => {
            updateEmptyState();
        });

        updateEmptyState();
    }

    lists.forEach(list => {
        list.querySelectorAll('.card-title').forEach(initPlaceholderFor);
    });

    if (projectTitleHeader) {
        initPlaceholderFor(projectTitleHeader);
    }

    sidebarButtons.forEach(button => {
        button.addEventListener('click', () => {

            if (button.classList.contains('sidebar-arrow-up')) {
                fileInput.click();

            } else if (button.classList.contains('sidebar-arrow-down')) {

                const data = dataCollect();
                const hasCards = data.lists.some(list => list.cards.length > 0);

                if (!hasCards) {
                    console.log("Nothing to export");
                    return;
                }

                const jsonStr = JSON.stringify(data, null, 2);
                const blob = new Blob([jsonStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);

                const link = document.createElement('a');
                link.href = url;
                const fileName = (data.projectTitle && data.projectTitle.trim() !== "") 
                    ? data.projectTitle.trim() 
                    : "todo-data";
                const cleanFileName = fileName.replace(/[/\\?%*:|"<>]/g, '-');
                link.download = `${cleanFileName}.json`;
                link.click();

                URL.revokeObjectURL(url);
            }
        });
    });

    fileInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = () => {
            try {
                const data = JSON.parse(reader.result);
                loadData(data);
                saveToStorage();
            } catch (err) {
                console.error('Invalid file', err);
            }
        };

        reader.readAsText(file);
        fileInput.value = "";
    });

    let dragDepth = 0;

    window.addEventListener('dragover', e => e.preventDefault());

    window.addEventListener('dragenter', e => {
        if (e.dataTransfer?.types.includes('Files')) {
            dragDepth++;
            dropzone?.classList.remove('hidden');
        }
    });

    window.addEventListener('dragleave', () => {
        dragDepth--;

        if (dragDepth <= 0) {
            dragDepth = 0;
            dropzone?.classList.add('hidden');
        }
    });

    window.addEventListener('drop', e => {
        e.preventDefault();

        dragDepth = 0;
        dropzone?.classList.add('hidden');

        const file = e.dataTransfer?.files?.[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = () => {
            try {
                const data = JSON.parse(reader.result);
                loadData(data);
                saveToStorage();
            } catch (err) {
                console.error('Invalid file', err);
            }
        };

        reader.readAsText(file);
    });

    setInterval(() => {
        saveToStorage();
    }, 1000);

    loadFromStorage();
});
