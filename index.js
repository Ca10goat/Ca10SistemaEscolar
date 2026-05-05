// =========================================
// 1. CONFIGURAÇÕES, DADOS E GAMIFICAÇÃO
// =========================================
const COLORS = ['#E0D8D0', '#a3b19b', '#8096a6', '#b67b7b', '#b47bff', '#d4b58e', '#e07bb5', '#4A4A4A'];
const AVATARS = ['😎', '🤓', '🦊', '🐱', '🦄', '👽', '👾', '👻', '🦉', '🐺', '🐯', '🐼', '🐶', '🐨', '🦖'];
const TRIMS = ['1º Período', '2º Período', '3º Período'];
const BADGES_DB = {
    'first_task': { title: 'Organizado', desc: 'Criaste a primeira tarefa', icon: '📅' },
    'tasks_3': { title: 'Produtivo', desc: 'Concluíste 3 tarefas', icon: '✅' },
    'notes_5': { title: 'Estudioso', desc: 'Criaste 5 anotações', icon: '📚' },
    'xp_100': { title: 'Iniciante', desc: 'Alcançaste 100 XP', icon: '⭐' },
    'files_1': { title: 'Arquivista', desc: 'Primeiro upload de estudo', icon: '📎' },
    'subj_3': { title: 'Dedicado', desc: 'Adicionaste 3 matérias', icon: '🎒' }
};

function getRank(totalXP) {
    if (totalXP < 100) return { title: 'Iniciante', icon: '🥱', color: '#4A4A4A' };
    if (totalXP < 250) return { title: 'Estudante', icon: '📘', color: '#8096a6' };
    if (totalXP < 500) return { title: 'Dedicado', icon: '📗', color: '#a3b19b' };
    if (totalXP < 1000) return { title: 'Avançado', icon: '🧠', color: '#8c82ff' };
    return { title: 'Lenda', icon: '👑', color: '#E0D8D0' };
}

let DB = null; let S = null; let selColor = COLORS[0]; let yMode = 'add';
let currentFileSubjectId = null;
let _searchFilter = 'all';

function initDefaultProfile() {
    const y = { 
        id: 'y1', year: new Date().getFullYear(), serie: '—', passG: 10, recG: 8, 
        subjects: [],
        schedule: ["08:00", "09:00", "10:00", "11:00", "12:00"],
        days: ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"],
        grid: Array(5).fill().map(() => Array(5).fill(''))
    };
    return { id: 'p1', name: 'Estudante', avatar: '😎', xp: 0, level: 1, planner: [], achievements: [], stats: { tasksDone: 0, notesCreated: 0, filesAdded: 0, tasksCreated: 0 }, cid: y.id, tri: 0, years: [y] };
}

async function load() {
    // Tenta carregar do Firebase primeiro
    if (typeof window.carregarDoFirebase === 'function') {
        const remoto = await window.carregarDoFirebase();
        if (remoto) {
            DB = remoto;
            // Actualiza também o localStorage como cache
            try { localStorage.setItem('ca10_os_v9_master', JSON.stringify(DB)); } catch(e) {}
            // Continua para o restante da inicialização (validações)
            inicializarDB(); return;
        }
    }
    // Fallback: localStorage
    try {
        const data = localStorage.getItem('ca10_os_v9_master');
        if (data) DB = JSON.parse(data);
       else {
    DB = initDefaultProfile();
}
    } catch (e) { console.error('Erro no load:', e); }
    inicializarDB();

    if (!DB || !DB.profiles || !DB.profiles.length) DB = { activeProfile: 'p1', profiles: [initDefaultProfile()] };
    S = DB.profiles.find(p => p.id === DB.activeProfile) || DB.profiles[0];

    if (S.xp === undefined) S.xp = 0;
    if (S.level === undefined) S.level = 1;
    if (!S.planner) S.planner = [];
    if (!S.achievements) S.achievements = [];
    if (!S.stats) S.stats = { tasksDone: 0, notesCreated: 0, filesAdded: 0, tasksCreated: 0 };
    if (!S.stats.tasksCreated) S.stats.tasksCreated = 0;
    if (!S.avatar) S.avatar = '😎';
    if (S.tri === undefined) S.tri = 0;
    const defaultY = { 
        id: 'y1', year: new Date().getFullYear(), serie: '—', passG: 10, recG: 8, subjects: [],
        schedule: ["08:00", "09:00", "10:00", "11:00", "12:00"],
        days: ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"],
        grid: Array(5).fill().map(() => Array(5).fill(''))
    };
    if (!S.years || !S.years.length) S.years = [defaultY];
    if (!S.cid) S.cid = S.years[0].id;

    S.years.forEach(y => {
        if (!y.subjects) y.subjects = [];
        if (y.passG === undefined) y.passG = 10;
        if (y.recG === undefined) y.recG = 8;
        if (!y.schedule) y.schedule = ["08:00", "09:00", "10:00", "11:00", "12:00"];
        if (!y.days) y.days = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];
        if (!y.grid) y.grid = Array(y.schedule.length).fill().map(() => Array(y.days.length).fill(''));
        
        // Ensure grid has correct dimensions
        if (y.grid.length !== y.schedule.length || (y.grid[0] && y.grid[0].length !== y.days.length)) {
            const oldGrid = y.grid;
            y.grid = Array(y.schedule.length).fill().map((_, i) => 
                Array(y.days.length).fill().map((_, j) => (oldGrid[i] && oldGrid[i][j]) ? oldGrid[i][j] : '')
            );
        }

        y.subjects.forEach(s => {
            if (s.expanded === undefined) s.expanded = false;
            if (!s.activeTab) s.activeTab = 'provas';
            if (!s.notes) s.notes = [];
            if (!s.files) s.files = [];
            if (!s.g) s.g = {};
            if (s.teacher === undefined) s.teacher = '';
        });
    });
}

function save() {
    try { localStorage.setItem('ca10_os_v9_master', JSON.stringify(DB)); }
    catch (e) { console.warn('Quota exceeded no localStorage'); }
    // Sincroniza com Firebase se utilizador estiver autenticado
    if (typeof window.salvarNoFirebase === 'function') {
        window.salvarNoFirebase(DB);
    }
}      
function addXP(amount, msg) {
    if (!S) return;
    S.xp += amount;
    let targetXP = S.level * 100;
    let leveledUp = false;
    while (S.xp >= targetXP) { S.xp -= targetXP; S.level++; targetXP = S.level * 100; leveledUp = true; }
    if (leveledUp) {
        const lvlEl = document.getElementById('lvlUpNum');
        if (lvlEl) lvlEl.innerText = S.level;
        openModal('levelUpOverlay');
    } else {
        showToast(`+${amount} XP: ${msg}`, 'ok');
    }
    showFloatingXP(amount);
    checkAchievements();
    save(); rTop();
    if (!document.getElementById('progressOverlay').classList.contains('hidden')) {
        updateProgressDashboard();
    }
}

function showFloatingXP(amount) {
    const el = document.createElement('div');
    el.className = 'floating-xp'; el.innerText = `+${amount} XP`;
    el.style.left = '50%'; el.style.top = '120px'; el.style.transform = 'translateX(-50%)';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1200);
}

function showToast(msg, type = 'info') {
    const box = document.getElementById('toastBox');
    const toast = document.createElement('div');
    toast.className = 'toast pop-in';
    if (type === 'ok') toast.style.borderLeftColor = 'var(--ok)';
    if (type === 'warn') toast.style.borderLeftColor = 'var(--warn)';
    if (type === 'bad') toast.style.borderLeftColor = 'var(--bad)';
    toast.innerHTML = msg;
    box.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function checkAchievements() {
    if (!S.achievements) S.achievements = [];
    if (!S.stats) S.stats = { tasksDone: 0, notesCreated: 0, filesAdded: 0, tasksCreated: 0 };
    const checkBadge = (id, condition) => {
        if (condition && !S.achievements.includes(id)) {
            S.achievements.push(id);
            showToast(`🏆 Conquista: ${BADGES_DB[id].title} desbloqueada!`, 'ok');
            document.getElementById('achvBadge').style.display = 'block';
        }
    };
    const totalXP = ((S.level - 1) * 100) + S.xp;
    checkBadge('first_task', S.stats.tasksCreated > 0 || S.planner.length > 0 || S.stats.tasksDone > 0);
    checkBadge('tasks_3', S.stats.tasksDone >= 3);
    checkBadge('notes_5', S.stats.notesCreated >= 5);
    checkBadge('xp_100', totalXP >= 100);
    checkBadge('files_1', S.stats.filesAdded >= 1);
    checkBadge('subj_3', cy() && cy().subjects && cy().subjects.length >= 3);
}

// 2. NÚCLEO DE CÁLCULO E RENDERIZAÇÃO
function cy() {
    if (!S || !S.years || !S.years.length) return null;
    return S.years.find(y => y.id === S.cid) || S.years[0];
}

function initGrades(s) {
    if (!s.g) s.g = {};
    if (!s.g[S.tri] || Array.isArray(s.g[S.tri])) s.g[S.tri] = { AS: [''], part: '', sim: '', trim: '' };
    if (!s.g[S.tri].AS || !Array.isArray(s.g[S.tri].AS)) s.g[S.tri].AS = [''];
    if (s.g[S.tri].part === undefined) s.g[S.tri].part = '';
    if (s.g[S.tri].sim === undefined) s.g[S.tri].sim = '';
    if (s.g[S.tri].trim === undefined) s.g[S.tri].trim = '';
    return s.g[S.tri];
}

function calcSubjectAvg(gr) {
    if (!gr) return null;
    let asVals = (gr.AS || []).filter(v => v !== '' && v !== null && !isNaN(+v)).map(Number);
    let media_AS = asVals.length > 0 ? asVals.reduce((a, b) => a + b, 0) / asVals.length : null;
    let nota_PS = (gr.part !== '' || gr.sim !== '') ? (Number(gr.part || 0) + Number(gr.sim || 0)) : null;
    let trimestral = gr.trim !== '' && gr.trim !== undefined ? Number(gr.trim) : null;
    let sum = 0, count = 0;
    if (media_AS !== null) { sum += media_AS; count++; }
    if (nota_PS !== null) { sum += nota_PS; count++; }
    if (trimestral !== null) { sum += trimestral; count++; }
    return count === 0 ? null : +(sum / count).toFixed(1);
}

function render(forceStagger = false) {
    if (!window.hasRenderedOnce) { forceStagger = true; window.hasRenderedOnce = true; }
    window.skipStagger = !forceStagger;
    try { rTop(); rChips(); rGrid(); rTabs(); rHub(); rSubjects(); rAchievements(); checkAlerts(); }
    catch (e) { console.error('Erro no render:', e); }
}

function rTop() {
    document.getElementById('topName').textContent = S.name;
    document.getElementById('topAv').textContent = S.avatar || '😎';
    const totalXP = ((S.level - 1) * 100) + S.xp;
    const rank = getRank(totalXP);
    document.getElementById('topRankIcon').textContent = rank.icon;
    document.getElementById('topRankName').textContent = rank.title;
    document.getElementById('topRankName').style.color = rank.color;
    const targetXP = S.level * 100;
    document.getElementById('xpBarFill').style.width = `${(S.xp / targetXP) * 100}%`;
    // Show planner badge dot only if there are pending tasks in active year context
    const currentTasks = window.CALENDAR ? window.CALENDAR.getTasksForActiveYear() : [];
    const pendingTasks = currentTasks.filter(t => t.status !== 'concluído') || [];
    document.getElementById('plannerBadge').style.display = pendingTasks.length > 0 ? 'block' : 'none';
}

function rChips() {
    document.getElementById('yearChips').innerHTML = S.years.map((y, i) => `
        <div class="y-chip fade-slide-in ${y.id === S.cid ? 'active' : ''}" data-yid="${y.id}" onclick="changeYear('${y.id}')" style="animation-delay:${i * 0.05}s;">
            ${y.year} <span style="font-size:10px;opacity:.7">${y.serie}</span>
        </div>`).join('');
}

function changeYear(yid) {
    if (S.cid === yid) return;
    
    const hub = document.getElementById('studentHub');
    const subjList = document.getElementById('subjectsList');
    
    // Etapa 1 (Saída)
    if(hub) hub.classList.add('slide-left-out');
    if(subjList) subjList.classList.add('slide-left-out');
    if(hub) hub.classList.remove('slide-right-in', 'fade-trimester-in');
    if(subjList) subjList.classList.remove('slide-right-in', 'fade-trimester-in');

    setTimeout(() => {
        S.cid = yid;
        S.tri = 0;
        save();
        render(); // Reset DOM elements
        
        // Etapa 2 (Entrada)
        const hubNew = document.getElementById('studentHub');
        const subjListNew = document.getElementById('subjectsList');
        
        if(hubNew) { hubNew.classList.remove('slide-left-out'); hubNew.classList.add('slide-right-in'); }
        if(subjListNew) { subjListNew.classList.remove('slide-left-out'); subjListNew.classList.add('slide-right-in'); }
    }, 250);
}

function rTabs() {
    document.getElementById('triTabs').innerHTML = TRIMS.map((t, i) =>
        `<button class="tri-tab ${S.tri === i ? 'active' : ''}" onclick="changeTri(${i})">${t}</button>`).join('');
}

function changeTri(i) {
    if (S.tri === i) return;
    
    // Animate stats row out
    const hub = document.getElementById('studentHub');
    const subjList = document.getElementById('subjectsList');
    
    if(hub) hub.classList.add('fade-trimester-out');
    if(subjList) subjList.classList.add('fade-trimester-out');
    if(hub) hub.classList.remove('fade-trimester-in');
    if(subjList) subjList.classList.remove('fade-trimester-in');

    setTimeout(() => {
        S.tri = i;
        render(); // This recalculates numbers and HTML
        
        // Re-grab the elements as render changes innerHTML, though container remains.
        const hubNew = document.getElementById('studentHub');
        const subjListNew = document.getElementById('subjectsList');
        
        if(hubNew) { hubNew.classList.remove('fade-trimester-out'); hubNew.classList.add('fade-trimester-in'); }
        if(subjListNew) { subjListNew.classList.remove('fade-trimester-out'); subjListNew.classList.add('fade-trimester-in'); }
    }, 250);
}

// -----------------------------------------
// GRADE DE AULAS (GRID)
// -----------------------------------------
const GRID = {
    toggleVisibility() {
        const wrapper = document.getElementById('gridWrapper');
        const btn = document.getElementById('gridToggleBtn');
        const controls = document.getElementById('gridControls');
        
        if (wrapper.style.maxHeight === '0px') {
            wrapper.style.maxHeight = '1000px';
            wrapper.style.opacity = '1';
            wrapper.style.marginTop = '0px';
            btn.textContent = 'Ocultar grade';
            if (controls) controls.style.display = 'flex';
            localStorage.setItem('ca10_grid_collapsed', 'false');
        } else {
            wrapper.style.maxHeight = '0px';
            wrapper.style.opacity = '0';
            wrapper.style.marginTop = '-20px';
            btn.textContent = 'Mostrar grade';
            if (controls) controls.style.display = 'none';
            localStorage.setItem('ca10_grid_collapsed', 'true');
        }
    },
    refresh() {
        save();
        const container = document.querySelector('.grid-table-container');
        if (container) {
            container.style.opacity = '0';
            setTimeout(() => {
                rGrid();
                const gridEl = document.getElementById('scheduleGrid');
                gridEl.classList.remove('fade-slide-in');
                void gridEl.offsetWidth;
                gridEl.classList.add('fade-slide-in');
                container.style.opacity = '1';
                setTimeout(() => rSubjects(), 10); // Sync teachers
            }, 100);
        } else {
            save(); render();
        }
    },
    addDay() {
        const y = cy(); if(!y) return;
        showPrompt("Novo Dia", "Sábado", (newDay) => {
            if(newDay && newDay.trim()) {
                y.days.push(newDay.trim());
                y.grid.forEach(row => row.push(''));
                this.refresh();
            }
        });
    },
    delDay(cIdx) {
        showConfirm("Remover Dia?", "Remover este dia e todas as suas aulas?", () => {
            const y = cy();
            y.days.splice(cIdx, 1);
            y.grid.forEach(row => row.splice(cIdx, 1));
            this.refresh();
        });
    },
    addTime() {
        const y = cy(); if(!y) return;
        y.schedule.push("00:00");
        y.grid.push(Array(y.days.length).fill(''));
        this.refresh();
    },
    delTime(rIdx) {
        showConfirm("Remover Horário?", "Apagar esta linha de horários?", () => {
            const y = cy();
            y.schedule.splice(rIdx, 1);
            y.grid.splice(rIdx, 1);
            this.refresh();
        });
    },
    editTime(rIdx, el) {
        const y = cy();
        y.schedule[rIdx] = el.value.trim() || '00:00';
        save();
    },
    editDay(cIdx, el) {
        const y = cy();
        y.days[cIdx] = el.value.trim() || 'Dia';
        save();
    },
    editTeacher(subjId) {
        const y = cy();
        const s = y.subjects.find(sub => sub.id === subjId);
        if(!s) return;
        showPrompt(`Professor de ${s.name}:`, s.teacher || "", (newT) => {
            if(newT !== null) {
                s.teacher = newT.trim();
                this.refresh();
            }
        });
    },
    showCtx(rIdx, cIdx, subjId, event) {
        event.preventDefault();
        if (event && event.stopPropagation) event.stopPropagation();
        const y = cy();
        
        let items = [];
        
        if (rIdx !== null && cIdx !== null) {
            // Context menu in Grid cell
            if(subjId) {
                items.push({ icon: '🔄', label: 'Trocar Matéria', action: `hideContextMenu(); setTimeout(() => GRID.openSubjSelector(${rIdx}, ${cIdx}, event), 50);` });
                items.push({ icon: '✏️', label: 'Editar Professor', action: `GRID.editTeacher('${subjId}'); hideContextMenu();` });
                items.push({ icon: '📋', label: 'Copiar (Em breve)', action: `hideContextMenu();` });
                items.push({ icon: '🗑️', label: 'Limpar Célula', action: `GRID.setCell(${rIdx}, ${cIdx}, ''); hideContextMenu();`, danger: true });
            } else {
                items.push({ icon: '➕', label: 'Atribuir Matéria', action: `hideContextMenu(); setTimeout(() => GRID.openSubjSelector(${rIdx}, ${cIdx}, event), 50);` });
            }
        } else {
            // Context menu on Subject Card
            if(subjId) {
                items.push({ icon: '✏️', label: 'Editar Professor', action: `GRID.editTeacher('${subjId}'); hideContextMenu();` });
            }
        }
        
        showContextMenu(event, items);
    },
    openSubjSelector(rIdx, cIdx, event = null) {
        if (event && event.stopPropagation) event.stopPropagation();
        const y = cy();
        if(!y.subjects || y.subjects.length === 0) {
            showToast("Precisas de adicionar disciplinas primeiro!", "warn"); return;
        }
        
        let items = y.subjects.map(s => ({
            icon: `<span style="color:${s.color}">●</span>`,
            label: `${s.name} ${s.teacher ? '(' + s.teacher + ')' : ''}`,
            action: `GRID.setCell(${rIdx}, ${cIdx}, '${s.id}'); hideContextMenu();`
        }));
        
        if (y.grid[rIdx][cIdx]) {
            items.unshift({ icon: '🗑️', label: 'Limpar Célula', action: `GRID.setCell(${rIdx}, ${cIdx}, ''); hideContextMenu();`, danger: true });
        }
        
        const e = event || { clientX: 0, clientY: 0, preventDefault: () => {} };
        if (!event) {
            // Se foi clique esquerdo na table (sem event), usar centro da tela
            // ou dar override - mas vamos passar um falso click event
            const td = document.querySelector(`#scheduleGrid tr:nth-child(${rIdx+1}) td:nth-child(${cIdx+2})`);
            if (td) {
                const rect = td.getBoundingClientRect();
                e.clientX = rect.left + rect.width / 2;
                e.clientY = rect.top + rect.height / 2;
            }
        }
        
        showContextMenu(e, items);
    },
    setCell(rIdx, cIdx, subjId) {
        const y = cy();
        y.grid[rIdx][cIdx] = subjId;
        
        // localized highlight on the cell
        const gridEl = document.getElementById('scheduleGrid');
        if (gridEl) {
            const td = gridEl.querySelector(`tr:nth-child(${rIdx+1}) td:nth-child(${cIdx+2})`);
            if (td) {
                td.classList.remove('highlight-update');
                void td.offsetWidth;
                td.classList.add('highlight-update');
            }
        }
        
        hideContextMenu();
        this.refresh();
    }
};

// -----------------------------------------
// CALENDÁRIO / PLANNER INTEGRADO
// -----------------------------------------
const CALENDAR = {
    currentDate: new Date(),
    selectedDate: null,
    editingTaskId: null,
    
    getActiveYear() {
        const cYear = cy();
        if (cYear && cYear.year) {
            // Pode vir como string ex: "2027", "2027/2028"
            const match = String(cYear.year).match(/\d{4}/);
            if (match) return parseInt(match[0], 10);
        }
        return new Date().getFullYear();
    },
    
    init() {
        const activeYear = this.getActiveYear();
        const now = new Date();
        // Set the active year and the current month (or default to 0 if we wanted, but now.getMonth() is better)
        this.currentDate = new Date(activeYear, now.getMonth(), 1);
    },
    
    prevMonth() {
        const grid = document.getElementById('calendarGrid');
        grid.style.opacity = '0';
        grid.style.transform = 'translateX(20px)';
        setTimeout(() => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.render();
            grid.style.opacity = '1';
            grid.style.transform = 'translateX(0)';
        }, 200);
    },
    
    nextMonth() {
        const grid = document.getElementById('calendarGrid');
        grid.style.opacity = '0';
        grid.style.transform = 'translateX(-20px)';
        setTimeout(() => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.render();
            grid.style.opacity = '1';
            grid.style.transform = 'translateX(0)';
        }, 200);
    },
    
    getTasksForActiveYear() {
        const activeYear = String(this.getActiveYear());
        const currentYearObjId = cy() ? cy().id : null;
        return (S.planner || []).filter(t => {
            if (t.yid && currentYearObjId) return t.yid === currentYearObjId;
            return t.date && t.date.startsWith(activeYear);
        });
    },

    render() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        document.getElementById('calMonthYear').textContent = `${monthNames[month]} ${year}`;
        
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Populate Subject Selects
        const subjects = cy() && cy().subjects ? cy().subjects : [];
        const subjOpts = `<option value="Geral">Geral</option>` + subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        document.getElementById('tSubj').innerHTML = subjOpts;
        
        // Populate Subject Filter Options
        const filterSubjOpts = `<option value="all">Todas as Disciplinas</option>` + subjOpts;
        const subjFilterEl = document.getElementById('calFilterSubj');
        const currSubjFilter = subjFilterEl.value;
        subjFilterEl.innerHTML = filterSubjOpts;
        if(currSubjFilter) subjFilterEl.value = currSubjFilter;
        
        let html = '';
        const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        dayNames.forEach(d => {
            html += `<div class="calendar-day-header">${d}</div>`;
        });
        
        // Previous month filler days
        let prevDays = firstDay;
        const prevMonthDays = new Date(year, month, 0).getDate();
        for (let i = prevDays - 1; i >= 0; i--) {
            html += `<div class="calendar-cell other-month"><div class="calendar-date">${prevMonthDays - i}</div></div>`;
        }
        
        const today = new Date();
        const allTasks = this.getTasksForActiveYear();
        
        // Format YYYY-MM-DD local exactly avoiding timezone offset issues
        const formatLocal = (d) => {
            const yr = d.getFullYear();
            const mo = String(d.getMonth() + 1).padStart(2, '0');
            const dy = String(d.getDate()).padStart(2, '0');
            return `${yr}-${mo}-${dy}`;
        };

        const todayStr = formatLocal(today);
        
        // Obter valores dos filtros
        const filterType = document.getElementById('calFilterType').value;
        const filterSubj = document.getElementById('calFilterSubj').value;
        
        for (let i = 1; i <= daysInMonth; i++) {
            const currentIterDate = new Date(year, month, i);
            const dateStr = formatLocal(currentIterDate);
            
            const isToday = dateStr === todayStr;
            let dayTasks = allTasks.filter(t => t.date === dateStr);
            
            // Aplicar Filtros
            if (filterType !== 'all') {
                dayTasks = dayTasks.filter(t => {
                    const ty = t.type || 'geral';
                    return ty === filterType;
                });
            }
            if (filterSubj !== 'all') {
                dayTasks = dayTasks.filter(t => {
                    const sid = t.subjId || (t.subj === 'Geral' ? 'Geral' : null);
                    return sid === filterSubj;
                });
            }
            
            let tasksHtml = '';
            // Show up to 3 tasks
            dayTasks.slice(0,3).forEach(t => {
                const isConcluido = t.status === 'concluído' ? 'concluído' : '';
                const subjColor = subjects.find(s => s.id === t.subjId)?.color || 'var(--t2)';
                const taskTypeClass = `task-type-${t.type || 'geral'}`;
                
                tasksHtml += `
                <div class="task-pill ${isConcluido} ${taskTypeClass}" title="${t.title}" 
                     onclick="event.stopPropagation(); CALENDAR.openTaskForm('${dateStr}', ${t.id})">
                    ${t.title}
                </div>`;
            });
            
            if (dayTasks.length > 3) {
                tasksHtml += `<div style="font-size:9px;color:var(--t2);text-align:center;">+${dayTasks.length - 3} mais</div>`;
            }
            
            html += `
            <div class="calendar-cell ${isToday ? 'today' : ''}" onclick="CALENDAR.showDayTasks('${dateStr}')">
                <div class="calendar-date">${i}</div>
                ${tasksHtml}
            </div>`;
        }
        
        document.getElementById('calendarGrid').innerHTML = html;
        
        // Ensure standard planner list acts appropriately when triggered via other means, but we use calendar so do nothing.
    },
    
    showDayTasks(dateStr) {
        this.selectedDate = dateStr;
        const allTasks = this.getTasksForActiveYear();
        const dayTasks = allTasks.filter(t => t.date === dateStr);
        const subjects = cy() && cy().subjects ? cy().subjects : [];
        
        const [y, m, d] = dateStr.split('-');
        document.getElementById('dayTasksTitle').textContent = `Tarefas - ${d}/${m}/${y}`;
        
        let html = '';
        if (dayTasks.length === 0) {
            html = `<div style="text-align:center; color:var(--t3); font-size:13px; padding:20px;">Nenhuma tarefa agendada.</div>`;
        } else {
            html = dayTasks.map(t => {
                const sub = subjects.find(s => s.id === t.subjId);
                const subName = sub ? sub.name : (t.subj || 'Geral');
                const isConcluido = t.status === 'concluído';
                const typeLabel = t.type ? (t.type.charAt(0).toUpperCase() + t.type.slice(1)) : 'Geral';
                
                return `
                <div class="task-list-item">
                    <div class="task-details">
                        <div style="font-weight:600; font-size:14px; text-decoration: ${isConcluido ? 'line-through' : 'none'}; opacity: ${isConcluido ? 0.6 : 1};">${t.title}</div>
                        <div style="font-size:11px; color:var(--t2); margin-top:4px;">
                            📚 ${subName} &nbsp;•&nbsp; 🏷️ ${typeLabel} 
                            ${t.description ? `<div style="margin-top:4px; opacity:0.8; font-style:italic;">${t.description}</div>` : ''}
                        </div>
                    </div>
                    <div class="task-actions">
                        ${!isConcluido ? `<button class="btn-outline" style="border-color:var(--ok); color:var(--ok); font-size:11px; padding:6px 10px;" onclick="CALENDAR.toggleTaskStatus(${t.id})">✓</button>` : `<button class="btn-outline" style="font-size:11px; padding:6px 10px;" onclick="CALENDAR.toggleTaskStatus(${t.id})">Desfazer</button>`}
                        <button class="btn-outline" style="font-size:11px; padding:6px 10px;" onclick="CALENDAR.openTaskForm('${dateStr}', ${t.id})">✏️</button>
                    </div>
                </div>`;
            }).join('');
        }
        
        document.getElementById('dayTasksList').innerHTML = html;
        document.getElementById('dayTasksModal').classList.remove('hidden');
        document.getElementById('newTaskForm').classList.add('hidden');
    },
    
    toggleTaskStatus(taskId) {
        const t = S.planner.find(t => t.id === taskId);
        if (t) {
            t.status = t.status === 'concluído' ? 'pendente' : 'concluído';
            save();
            if (t.status === 'concluído') {
                addXP(50, 'Tarefa concluída!');
                S.stats.tasksDone = (S.stats.tasksDone || 0) + 1;
                checkBadge('first_task', S.stats.tasksDone > 0);
            }
            this.render();
            if (this.selectedDate) this.showDayTasks(this.selectedDate);
            rTop();
        }
    },
    
    openTaskForm(dateStr = '', taskId = null) {
        document.getElementById('dayTasksModal').classList.add('hidden');
        document.getElementById('newTaskForm').classList.remove('hidden');
        this.editingTaskId = taskId;
        
        if (taskId) {
            const t = S.planner.find(t => t.id === taskId);
            if (t) {
                document.getElementById('taskFormTitle').textContent = "Editar Tarefa";
                document.getElementById('tTitle').value = t.title;
                document.getElementById('tDate').value = t.date;
                document.getElementById('tSubj').value = t.subjId || t.subj || 'Geral';
                document.getElementById('tType').value = t.type || 'geral';
                document.getElementById('tStatus').value = t.status || 'pendente';
                document.getElementById('tDesc').value = t.description || '';
                document.getElementById('btnDelTask').style.display = 'block';
            }
        } else {
            document.getElementById('taskFormTitle').textContent = "Adicionar Tarefa";
            document.getElementById('tTitle').value = '';
            document.getElementById('tDate').value = dateStr || formatYYYYMMDD(new Date());
            document.getElementById('tType').value = 'geral';
            document.getElementById('tStatus').value = 'pendente';
            document.getElementById('tDesc').value = '';
            document.getElementById('btnDelTask').style.display = 'none';
        }
    },
    
    closeTaskForm() {
        document.getElementById('newTaskForm').classList.add('hidden');
        this.editingTaskId = null;
    },
    
    saveTask() {
        const title = document.getElementById('tTitle').value.trim();
        const date = document.getElementById('tDate').value;
        const subjVal = document.getElementById('tSubj').value;
        const type = document.getElementById('tType').value;
        const status = document.getElementById('tStatus').value;
        const desc = document.getElementById('tDesc').value.trim();
        
        if (!title || !date) {
            showToast('Erro: Título e Data são obrigatórios!', 'bad');
            return;
        }
        
        if (!S.planner) S.planner = [];
        
        const subjObj = cy() && cy().subjects ? cy().subjects.find(s => s.id === subjVal) : null;
        let subjName = subjObj ? subjObj.name : (subjVal !== 'Geral' ? subjVal : 'Geral');
        
        if (this.editingTaskId) {
            const t = S.planner.find(t => t.id === this.editingTaskId);
            if (t) {
                t.title = title;
                t.date = date;
                t.subjId = subjObj ? subjObj.id : null;
                t.subj = subjName;
                t.type = type;
                t.status = status;
                t.description = desc;
                if(!t.yid) t.yid = cy().id;
            }
        } else {
            S.planner.push({
                id: Date.now(),
                title,
                date,
                subjId: subjObj ? subjObj.id : null,
                subj: subjName,
                type,
                status,
                description: desc,
                yid: cy().id
            });
            S.stats.tasksCreated = (S.stats.tasksCreated || 0) + 1;
        }
        
        save();
        this.closeTaskForm();
        this.render();
        rTop();
        
        if (this.selectedDate === date) {
            this.showDayTasks(date);
        }
    },
    
    deleteEditingTask() {
        if(!this.editingTaskId) return;
        showConfirm("Excluir", "Tens a certeza que desejas excluir esta tarefa?", () => {
            S.planner = S.planner.filter(t => t.id !== this.editingTaskId);
            save();
            this.closeTaskForm();
            this.render();
            rTop();
            if (this.selectedDate) {
                const rem = S.planner.filter(t => t.date === this.selectedDate);
                if(rem.length === 0) document.getElementById('dayTasksModal').classList.add('hidden');
                else this.showDayTasks(this.selectedDate);
            }
        });
    }
};
window.CALENDAR = CALENDAR;

function formatYYYYMMDD(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function rGrid() {
    const el = document.getElementById('scheduleGrid');
    if(!el) return;
    const y = cy();
    if(!y || !y.schedule || !y.days) {
        el.innerHTML = ''; return;
    }
    
    let html = `<thead><tr>
        <th style="width:80px;">Hr/Dia</th>`;
    
    y.days.forEach((day, c) => {
        html += `<th>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <input class="edit-day-input" value="${day}" onchange="GRID.editDay(${c}, this)">
                <button style="color:var(--bad); margin-left:5px;" onclick="GRID.delDay(${c})">✕</button>
            </div>
        </th>`;
    });
    html += `</tr></thead><tbody>`;

    y.schedule.forEach((time, r) => {
        html += `<tr>
            <th style="font-family:var(--font-mono); position:relative;">
                <input class="edit-time-input" type="time" value="${time}" onchange="GRID.editTime(${r}, this)">
                <button style="position:absolute; bottom:2px; right:2px; font-size:10px; color:var(--bad);" onclick="GRID.delTime(${r})">✕</button>
            </th>`;
        
        for(let c = 0; c < y.days.length; c++) {
            const subjId = y.grid[r] && y.grid[r][c];
            const subj = subjId ? y.subjects.find(s => s.id === subjId) : null;
            if(subj) {
                html += `<td class="has-content" style="border-bottom:3px solid ${subj.color}" 
                             onclick="GRID.openSubjSelector(${r}, ${c}, event)"
                             oncontextmenu="GRID.showCtx(${r}, ${c}, '${subj.id}', event); return false;">
                    <div class="grid-subj-name">${subj.name}</div>
                    ${subj.teacher ? `<div class="grid-teacher-name">${subj.teacher}</div>` : ''}
                </td>`;
            } else {
                html += `<td onclick="GRID.openSubjSelector(${r}, ${c}, event)"
                             oncontextmenu="GRID.showCtx(${r}, ${c}, null, event); return false;">
                    <div class="grid-add-text" style="color:var(--text-mut); font-size:10px; opacity:0; transition:opacity 0.2s;">+ Adicionar</div>
                </td>`;
            }
        }
        html += `</tr>`;
    });
    html += `</tbody>`;
    el.innerHTML = html;
    
    // Apply visual state
    if (localStorage.getItem('ca10_grid_collapsed') === 'true') {
        const wrapper = document.getElementById('gridWrapper');
        const btn = document.getElementById('gridToggleBtn');
        const controls = document.getElementById('gridControls');
        if (wrapper && btn) {
            wrapper.style.maxHeight = '0px';
            wrapper.style.opacity = '0';
            wrapper.style.marginTop = '-20px';
            btn.textContent = 'Mostrar grade';
            if (controls) controls.style.display = 'none';
        }
    }
}

function rHub() {
    const el = document.getElementById('studentHub');
    if(!el) return;
    const yData = cy();
    if (!yData) { el.innerHTML = ''; return; }

    const stg = window.skipStagger ? '' : 'fade-slide-in';
    const stgD = (d) => window.skipStagger ? '' : `style="animation-delay: ${d}s;"`;

    // format today as YYYY-MM-DD
    const t = new Date();
    const todayStr = `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;

    // Get Active Tasks for this year
    const plannerTasks = window.CALENDAR ? window.CALENDAR.getTasksForActiveYear() : [];
    
    // Sort tasks logically by date
    const sortedTasks = [...plannerTasks].sort((a,b) => a.date.localeCompare(b.date));
    
    // Upcoming Tasks (A) -> Future tasks only
    const upcomingTasks = sortedTasks.filter(tsk => tsk.date >= todayStr && tsk.status !== 'concluído');
    
    // Próxima Prova (D)
    const nextExam = upcomingTasks.find(tsk => tsk.type === 'prova');

    // Resumo Rápido (E)
    const pendingTotal = plannerTasks.filter(tsk => tsk.status !== 'concluído').length;
    const completedTotal = plannerTasks.filter(tsk => tsk.status === 'concluído').length;

    // Subjects and Averages (B and C)
    const subs = yData.subjects || [];
    let subjectAvgs = [];
    subs.forEach(s => {
        const avg = calcSubjectAvg(initGrades(s));
        if(avg !== null) subjectAvgs.push({ ...s, avg });
    });

    const currOvAvg = subjectAvgs.length ? +(subjectAvgs.reduce((a, b) => a + b.avg, 0) / subjectAvgs.length).toFixed(1) : null;
    const subjectsAtRisk = subjectAvgs.filter(s => s.avg < yData.passG);

    // ============================================
    // BUILD HTML
    // ============================================
    
    // 1. Resumo & Média
    let cardMédia = '';
    if (currOvAvg === null) {
        cardMédia = `
            <div class="hub-card ${stg}" ${stgD(0)} style="cursor:pointer;" onclick="goToSubjects()">
                <div class="hub-card-header">
                    <div class="hub-card-title"><i>🎓</i> Desempenho Geral</div>
                </div>
                <div class="hub-card-content" style="display:flex; flex-direction:column; justify-content:center; align-items:center; opacity:0.7;">
                    <div class="hub-empty">Adicione notas para visualizar o seu desempenho escolar.</div>
                </div>
                <div class="hub-btn" onclick="event.stopPropagation(); goToSubjects()">Ir para Disciplinas</div>
            </div>
        `;
    } else {
        const avgColor = currOvAvg >= yData.passG ? 'var(--ok)' : currOvAvg >= yData.recG ? 'var(--warn)' : 'var(--bad)';
        const maxExpectedAvg = yData.passG <= 10 ? 20 : 100; // auto detect scale usually out of 20 or 100
        const scaleMax = yData.passG > 10 ? 100 : 20;
        const progressPct = Math.min((currOvAvg / scaleMax) * 100, 100);
        
        let bestSubj = subjectAvgs.reduce((prev, curr) => (prev.avg > curr.avg) ? prev : curr, subjectAvgs[0]);
        let worstSubj = subjectAvgs.reduce((prev, curr) => (prev.avg < curr.avg) ? prev : curr, subjectAvgs[0]);

        cardMédia = `
            <div class="hub-card ${stg}" ${stgD(0)} style="cursor:pointer;" onclick="openProgressDashboard()">
                <div class="hub-card-header">
                    <div class="hub-card-title"><i>🎓</i> Desempenho Geral</div>
                </div>
                <div class="hub-card-content" style="display:flex; flex-direction:column;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-end;">
                        <div>
                            <div class="hub-card-val" style="color: ${avgColor}; font-size:36px;">${currOvAvg}</div>
                            <div style="font-size:12px; color:var(--t2);">Média Geral Atual</div>
                        </div>
                    </div>
                    
                    <div style="margin-top:20px;">
                        <div style="height:6px; background:rgba(0,0,0,0.3); border-radius:3px; overflow:hidden;">
                            <div style="height:100%; width:${progressPct}%; background:${avgColor}; border-radius:3px; transition:width 1s cubic-bezier(0.16, 1, 0.3, 1);"></div>
                        </div>
                    </div>
                    
                    <div style="margin-top:20px; display:flex; flex-direction:column; gap:10px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; background:rgba(16, 185, 129, 0.1); border-left:2px solid var(--ok); padding:6px 10px; border-radius:4px;">
                            <span style="color:var(--t2)">Melhor: <span style="font-weight:600; color:var(--text-main)">${bestSubj.name}</span></span>
                            <span style="font-weight:700; color:var(--ok)">${bestSubj.avg}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; background:rgba(239, 68, 68, 0.1); border-left:2px solid var(--bad); padding:6px 10px; border-radius:4px;">
                            <span style="color:var(--t2)">Pior: <span style="font-weight:600; color:var(--text-main)">${worstSubj.name}</span></span>
                            <span style="font-weight:700; color:var(--bad)">${worstSubj.avg}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // 2. Próximas Tarefas
    let tasksHtml = '';
    if(upcomingTasks.length > 0) {
        tasksHtml = `<div class="hub-item-list" style="margin-bottom:15px;">` + upcomingTasks.slice(0, 3).map(tsk => `
            <div class="hub-item" onclick="openPlanner(); setTimeout(()=> CALENDAR.showDayTasks('${tsk.date}'), 300);">
                <div class="hub-item-top">
                    <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${tsk.title}</span>
                    <span style="font-size:11px; font-weight:normal; color:var(--t2); margin-left:10px; flex-shrink:0;">${tsk.date.split('-').reverse().join('/')}</span>
                </div>
                <div class="hub-item-bot">
                    <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${tsk.subj}</span>
                    <span style="text-transform:capitalize; color:var(--acc-light); margin-left:10px; flex-shrink:0;">${tsk.type}</span>
                </div>
            </div>
        `).join('') + `</div>`;
    } else {
        tasksHtml = `
            <div class="hub-card-content" style="display:flex; flex-direction:column; justify-content:center; align-items:center; opacity:0.7; margin-bottom:15px;">
                <div class="hub-empty" style="margin-bottom:0; padding-bottom:5px;">Nenhuma tarefa futura 👌</div>
                <div style="font-size:12px; color:var(--t2);">Que tal adicionar uma?</div>
            </div>
        `;
    }

    const cardTarefas = `
        <div class="hub-card ${stg}" ${stgD(0.1)} style="cursor:pointer;" onclick="openPlanner()">
            <div class="hub-card-header">
                <div class="hub-card-title"><i>📅</i> Próximas Tarefas</div>
            </div>
            <div class="hub-card-content" style="display:flex; flex-direction:column; justify-content:space-between;">
                ${tasksHtml}
                <div class="hub-btn" onclick="event.stopPropagation(); openPlanner(); setTimeout(() => CALENDAR.openTaskForm(formatYYYYMMDD(new Date())), 300);">Criar Tarefa</div>
            </div>
        </div>
    `;

    // 3. Situação Escolar
    let alertContentHtml = '';
    
    // Check if week is overloaded (e.g. >= 4 tasks in the next 7 days)
    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);
    const next7DaysStr = `${next7Days.getFullYear()}-${String(next7Days.getMonth()+1).padStart(2,'0')}-${String(next7Days.getDate()).padStart(2,'0')}`;
    
    const overloadedWeek = upcomingTasks.filter(tsk => tsk.date <= next7DaysStr).length >= 4;

    if (subjectsAtRisk.length > 0) {
        let worst = subjectAvgs.reduce((prev, curr) => (prev.avg < curr.avg) ? prev : curr, subjectAvgs[0]);
        alertContentHtml = `
            <div style="font-size:14px; margin-bottom:15px; color:var(--text-main); line-height:1.4;">
                Atenção em <span style="font-weight:600; color:var(--bad);">${worst.name}</span> (média ${worst.avg}). Recomendado revisar.
            </div>
            <div class="hub-item-list">` + subjectsAtRisk.slice(0,2).map(s => `
                <div class="hub-item" style="border-color: rgba(239, 68, 68, 0.4)">
                    <div class="hub-item-top">
                        <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.name}</span>
                        <span style="color:var(--bad); margin-left:10px;">${s.avg}</span>
                    </div>
                </div>
            `).join('') + `</div>`;
    } else if (overloadedWeek) {
        alertContentHtml = `
            <div style="font-size:14px; margin-bottom:15px; color:var(--text-main); line-height:1.4;">
                Sua semana está carregada com <span style="font-weight:600; color:var(--warn);">${upcomingTasks.filter(tsk => tsk.date <= next7DaysStr).length} tarefas</span> nos próximos 7 dias. Organize seus estudos.
            </div>
            <div class="hub-item-list">` + upcomingTasks.filter(tsk => tsk.date <= next7DaysStr).slice(0,2).map(tsk => `
                <div class="hub-item" style="border-color: rgba(245, 158, 11, 0.4)">
                    <div class="hub-item-top">
                        <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${tsk.subj}</span>
                        <span style="color:var(--warn); margin-left:10px; flex-shrink:0;">${tsk.date.split('-').reverse().join('/')}</span>
                    </div>
                    <div class="hub-item-bot" style="margin-top:5px; font-size:12px; font-weight:600; white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                        ${tsk.title}
                    </div>
                </div>
            `).join('') + `</div>`;
    } else {
        alertContentHtml = `
            <div class="hub-card-content" style="display:flex; flex-direction:column; justify-content:center; align-items:center; opacity:0.8; height:100%;">
                <div style="font-size:40px; margin-bottom:10px;">👍</div>
                <div style="font-size:14px; text-align:center; line-height:1.5;">Você está indo bem!<br>Nenhuma matéria crítica no momento.</div>
            </div>
        `;
    }

    let alertTitle = subjectsAtRisk.length > 0 ? `<i style="color:var(--bad)">⚠️</i> Atenção Necessária` : 
                     (overloadedWeek ? `<i style="color:var(--warn)">🗓️</i> Semana Carregada` : `<i>🎯</i> Situação em Dia`);

    const actionBtn = subjectsAtRisk.length > 0 ? `<div class="hub-btn" onclick="event.stopPropagation(); goToSubjects()">Ver disciplinas</div>` :
                      (overloadedWeek ? `<div class="hub-btn" onclick="event.stopPropagation(); openPlanner()">Ver calendário</div>` : `<div class="hub-btn" style="visibility:hidden">.</div>`);
                      
    const clickAction = subjectsAtRisk.length > 0 ? `goToSubjects()` :
                        (overloadedWeek ? `openPlanner()` : ``);

    const cardAlertas = `
        <div class="hub-card ${stg}" ${stgD(0.2)} style="${clickAction ? 'cursor:pointer;' : ''}" ${clickAction ? `onclick="${clickAction}"` : ''}>
            <div class="hub-card-header">
                <div class="hub-card-title">${alertTitle}</div>
            </div>
            <div class="hub-card-content" style="display:flex; flex-direction:column; justify-content:space-between;">
                <div>${alertContentHtml}</div>
                ${actionBtn}
            </div>
        </div>
    `;

    el.innerHTML = cardMédia + cardTarefas + cardAlertas;
}

function rSubjects() {
    const el = document.getElementById('subjectsList');
    const yData = cy();
    if (!yData || !yData.subjects || !yData.subjects.length) {
        el.innerHTML = `<div class="stat-cell" style="text-align:center;color:var(--t3)">Nenhuma disciplina. Adiciona uma para começar!</div>`;
        return;
    }
    const stg = window.skipStagger ? '' : 'fade-slide-in';
    const stgD = (si) => window.skipStagger ? '' : `style="animation-delay:${si * 0.08}s;"`;
    el.innerHTML = yData.subjects.map((s, si) => {
        const gr = initGrades(s);
        const a = calcSubjectAvg(gr);
        const maxGrade = yData.passG >= 10 ? 20 : 10;
        const pct = a !== null ? Math.min(100, (a / maxGrade) * 100) : 0;
        const dColor = a === null ? 'var(--t3)' : a >= yData.passG ? 'var(--ok)' : a >= yData.recG ? 'var(--warn)' : 'var(--bad)';
        return `
        <div class="s-card ${stg} ${s.expanded ? 'expanded' : ''}" data-si="${si}" ${stgD(si)}>
            <div class="s-bg-glow" style="background:${s.color};"></div>
            <div class="s-top" onclick="toggleSubj(${si})">
                <div class="s-accent-bar" style="background:${s.color};color:${s.color}"></div>
                <div style="flex:1;">
                    <div class="s-name" style="margin-bottom: ${s.teacher ? '2px' : '0'};">${s.name}</div>
                    ${s.teacher ? `<div style="font-size:11px;color:var(--text-mut);">👩‍🏫 Prof. ${s.teacher}</div>` : ''}
                </div>
                <div class="s-avg" style="color:${dColor}">${a !== null ? a : '—'}</div>
                <div class="s-chevron">▼</div>
            </div>
            <div class="prog-track"><div class="prog-fill" style="width:${pct}%;background:${dColor};box-shadow:0 0 10px ${dColor}80"></div></div>
            <div class="s-body">
                <div class="tabs-nav">
                    <button class="tab-btn ${s.activeTab === 'provas' ? 'active' : ''}" onclick="switchTab(${si},'provas')">📝 Provas</button>
                    <button class="tab-btn ${s.activeTab === 'notas' ? 'active' : ''}" onclick="switchTab(${si},'notas')">📚 Anotações</button>
                    <button class="tab-btn ${s.activeTab === 'arquivos' ? 'active' : ''}" onclick="switchTab(${si},'arquivos')">📎 Arquivos</button>
                    <button class="tab-btn ${s.activeTab === 'graficos' ? 'active' : ''}" onclick="switchTab(${si},'graficos')">📊 Desempenho</button>
                    <button class="tab-btn" style="margin-left:auto;color:var(--bad);" onclick="delSubject(${si})">Apagar</button>
                </div>
                <div class="tab-pane ${s.activeTab === 'provas' ? 'active' : ''}">${renderProvas(si, gr)}</div>
                <div class="tab-pane ${s.activeTab === 'notas' ? 'active' : ''}">${renderNotas(s, si)}</div>
                <div class="tab-pane ${s.activeTab === 'arquivos' ? 'active' : ''}">${renderArquivos(s, si)}</div>
                <div class="tab-pane ${s.activeTab === 'graficos' ? 'active' : ''}">${renderGraficos(s, yData)}</div>
            </div>
        </div>`;
    }).join('');
}

function renderProvas(si, gr) {
    return `
    <div class="grades-grid pop-in">
        <div class="gc-col">
            <div class="gc-head">Av. Semanais <button class="gc-add" onclick="addAS(${si})">+</button></div>
            <div class="gc-row">${gr.AS.map((val, idx) => `<input class="g-input" type="number" min="0" step="0.1" value="${val}" placeholder="—" onchange="setAS(${si},${idx},this.value)">`).join('')}</div>
        </div>
        <div class="gc-col">
            <div class="gc-head">Part (4) + Sim (6)</div>
            <div class="gc-row">
                <input class="g-input" type="number" max="4" step="0.1" value="${gr.part}" placeholder="—" onchange="setOther(${si},'part',this.value,4)">
                <span style="color:var(--t3);align-self:center">+</span>
                <input class="g-input" type="number" max="6" step="0.1" value="${gr.sim}" placeholder="—" onchange="setOther(${si},'sim',this.value,6)">
            </div>
        </div>
        <div class="gc-col">
            <div class="gc-head">Trimestral (10)</div>
            <div class="gc-row"><input class="g-input" type="number" max="10" step="0.1" value="${gr.trim}" placeholder="—" onchange="setOther(${si},'trim',this.value,10)"></div>
        </div>
    </div>
    <div class="simulator-box pop-in" style="animation-delay:0.1s;">
        <span>💡 <b>Simulador:</b> Se eu tirar</span>
        <input type="number" class="sim-input" placeholder="0.0" onkeyup="simularNota(${si}, this.value)">
        <span>na Trimestral, a média será:</span>
        <strong id="simRes_${si}" style="font-size:24px;color:var(--acc);font-family:var(--f-mono);">--</strong>
    </div>`;
}

function renderNotas(s, si) {
    const notes = s.notes.filter(n => n.tri === S.tri);
    return `
    <div class="note-creator pop-in">
        <input type="text" id="nTitle_${si}" class="note-title-inp" placeholder="Título da anotação...">
        <textarea id="nText_${si}" class="note-input" placeholder="Escreve o teu resumo, fórmula ou conceito chave..."></textarea>
        <button class="btn-acc" style="align-self:flex-start" onclick="saveNote(${si})">Guardar e Ganhar XP</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:12px;">
        ${notes.map((n, i) => `
        <div class="note-card pop-in" id="nCard_${n.id}" style="animation-delay:${i * 0.05}s">
            <h4>${n.title || 'Anotação Sem Título'} <button class="tab-btn" style="color:var(--bad);padding:0;margin-left:auto;" onclick="delNote(${si},${n.id})">✕</button></h4>
            <div class="note-text">${n.text}</div>
            <div class="note-footer"><span>Criado a:</span><span>${n.date}</span></div>
        </div>`).join('')}
    </div>`;
}

function renderArquivos(s, si) {
    const files = s.files.filter(f => f.tri === S.tri);
    return `
    <div class="drop-zone pop-in" onclick="triggerFileInput(${si})">
        <span style="font-size:32px;display:block;margin-bottom:12px;opacity: 0.6;">📸 / 📄</span>
        Clica para adicionar foto do caderno ou PDF
    </div>
    <div class="file-grid">
        ${files.map((f, i) => `
        <div class="file-card pop-in" id="fCard_${f.id}" style="animation-delay:${i * 0.05}s;${f.fav ? 'border-color:var(--warn);' : ''}">
            <button class="fav-btn ${f.fav ? 'active' : ''}" onclick="toggleFav(${si},'${f.id}')">★</button>
            <button class="del-f-btn" onclick="delFile(${si},'${f.id}')">✕</button>
            ${f.isImg
                ? `<div class="file-preview-wrap"><img src="${f.data}" class="file-preview" onclick="openImg('${f.data}')"></div>`
                : `<div class="file-icon">📄</div>`}
            <div class="file-info">
                <div class="file-name" title="${f.name}">${f.name}</div>
                <div class="file-date">${f.date}</div>
            </div>
        </div>`).join('')}
    </div>`;
}

function renderGraficos(s, yData) {
    let barsHtml = '';
    for (let i = 0; i < 3; i++) {
        const gr = s.g[i] || null;
        const a = calcSubjectAvg(gr);
        const pct = a !== null ? Math.min(100, (a / (yData.passG >= 10 ? 20 : 10)) * 100) : 0;
        const color = a === null ? 'var(--bg3)' : a >= yData.passG ? 'var(--ok)' : a >= yData.recG ? 'var(--warn)' : 'var(--bad)';
        barsHtml += `
        <div class="bar-wrap">
            <div class="bar-fill" style="height:${pct}%;background:${color}"><div class="bar-val">${a !== null ? a : '-'}</div></div>
            <div class="bar-label">${TRIMS[i].substring(0, 2)}</div>
        </div>`;
    }
    return `<div class="chart-container pop-in">${barsHtml}</div><p style="text-align:center;font-size:10px;color:var(--t3);margin-top:10px;text-transform:uppercase;letter-spacing:1px;">Evolução da Média nos 3 Períodos</p>`;
}

function rAchievements() {
    const grid = document.getElementById('achievementsGrid');
    if (!grid) return;
    grid.innerHTML = Object.keys(BADGES_DB).map(key => {
        const b = BADGES_DB[key];
        const unlocked = S.achievements && S.achievements.includes(key);
        return `<div class="badge-card ${unlocked ? 'unlocked' : ''}"><div class="badge-icon">${b.icon}</div><div class="badge-title">${b.title}</div><div class="badge-desc">${b.desc}</div></div>`;
    }).join('');
}

function checkAlerts() {}

function toggleSubj(si) {
    const s = cy().subjects[si];
    s.expanded = !s.expanded;
    save();
    
    // Instead of re-rendering all subjects, just update the DOM for the specific card
    const sCard = document.querySelector(`.s-card[data-si="${si}"]`);
    if (sCard) {
        if (s.expanded) {
            sCard.classList.add('expanded');
        } else {
            sCard.classList.remove('expanded');
        }
    } else {
        // Fallback if card isn't found
        rSubjects();
    }
}
function switchTab(si, tab) { cy().subjects[si].activeTab = tab; save(); rSubjects(); }
function setAS(si, idx, val) { 
    let gr = initGrades(cy().subjects[si]); 
    gr.AS[idx] = val === '' ? '' : Math.max(0, +val); 
    save(); 
    render(); 
    highlightUpdate(`card_${si}`);
    highlightUpdate(`statValGlob`);
}
function addAS(si) { initGrades(cy().subjects[si]).AS.push(''); save(); rSubjects(); }
function setOther(si, f, val, max) { 
    let gr = initGrades(cy().subjects[si]); 
    gr[f] = val === '' ? '' : Math.min(max, Math.max(0, +val)); 
    save(); 
    render(); 
    highlightUpdate(`card_${si}`);
    highlightUpdate(`statValGlob`);
}

function highlightUpdate(id) {
    const el = document.getElementById(id) || document.querySelector(`[data-si="${id.replace('card_', '')}"]`);
    if (!el) return;
    const parent = el.closest('.simulator-box') || el.closest('.stat-cell') || el.closest('.s-card') || el;
    parent.classList.remove('highlight-update');
    void parent.offsetWidth; // force reflow
    parent.classList.add('highlight-update');
    
    // Animate the actual value element if possible
    let valEl = el;
    if (parent.classList.contains('s-card')) {
        valEl = parent.querySelector('.s-avg');
    }
    if (valEl && (valEl.tagName === 'DIV' || valEl.tagName === 'SPAN')) {
        valEl.classList.remove('num-update');
        void valEl.offsetWidth;
        valEl.classList.add('num-update');
    }
}

function simularNota(si, inputVal) {
    const gr = initGrades(cy().subjects[si]);
    const tempGr = JSON.parse(JSON.stringify(gr));
    tempGr.trim = inputVal === '' ? null : +inputVal;
    const res = calcSubjectAvg(tempGr);
    const el = document.getElementById(`simRes_${si}`);
    if (el) el.innerText = res !== null ? res : '--';
}

function saveNote(si) {
    const title = document.getElementById(`nTitle_${si}`).value;
    const text = document.getElementById(`nText_${si}`).value;
    if (!text) return;
    cy().subjects[si].notes.unshift({ id: Date.now(), title, text, date: new Date().toLocaleDateString('pt-PT'), tri: S.tri });
    S.stats.notesCreated = (S.stats.notesCreated || 0) + 1;
    addXP(15, 'Excelente resumo!');
    save(); rSubjects();
}
function delNote(si, id) { 
    const el = document.getElementById(`nCard_${id}`);
    if (el) el.classList.add('item-removing');
    setTimeout(() => {
        cy().subjects[si].notes = cy().subjects[si].notes.filter(n => n.id !== id); 
        save(); 
        rSubjects(); 
    }, 300);
}

function triggerFileInput(si) { currentFileSubjectId = si; document.getElementById('fInpGlobal').click(); }

document.getElementById('fInpGlobal').addEventListener('change', e => {
    if (currentFileSubjectId === null || !e.target.files.length) return;
    const si = currentFileSubjectId;
    const files = e.target.files;
    const s = cy().subjects[si];
    Array.from(files).forEach(file => {
        const isImg = file.type.startsWith('image/');
        if (isImg) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX = 1000; let w = img.width, h = img.height;
                    if (w > MAX) { h *= (MAX / w); w = MAX; }
                    canvas.width = w; canvas.height = h;
                    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                    s.files.unshift({ id: 'f' + Date.now(), name: file.name, isImg: true, data: canvas.toDataURL('image/jpeg', 0.7), date: new Date().toLocaleDateString('pt-PT'), tri: S.tri, fav: false });
                    S.stats.filesAdded = (S.stats.filesAdded || 0) + 1;
                    save(); rSubjects(); addXP(20, 'Imagem otimizada!');
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        } else {
            s.files.unshift({ id: 'f' + Date.now(), name: file.name, isImg: false, data: null, date: new Date().toLocaleDateString('pt-PT'), tri: S.tri, fav: false });
            S.stats.filesAdded = (S.stats.filesAdded || 0) + 1;
            save(); rSubjects(); addXP(10, 'Ficheiro PDF guardado!');
        }
    });
    e.target.value = '';
    currentFileSubjectId = null;
});

function delFile(si, id) { 
    const el = document.getElementById(`fCard_${id}`);
    if (el) el.classList.add('item-removing');
    setTimeout(() => {
        cy().subjects[si].files = cy().subjects[si].files.filter(f => f.id !== id); 
        save(); 
        rSubjects(); 
    }, 300);
}
function toggleFav(si, id) { const f = cy().subjects[si].files.find(x => x.id === id); f.fav = !f.fav; save(); rSubjects(); }
function openImg(src) { document.getElementById('previewImgSrc').src = src; openModal('imageOverlay'); }

const CALC = {
    expression: '',
    append(val) { this.expression += val; this.updateDisplay(); },
    action(type) {
        if (type === 'clear') this.expression = '';
        else if (type === 'backspace') this.expression = this.expression.slice(0, -1);
        this.updateDisplay();
    },
    calculate() {
        try {
            let mathExpr = this.expression.replace(/×/g, '*').replace(/÷/g, '/').replace(/%/g, '/100');
            const result = eval(mathExpr);
            document.getElementById('calcHistory').innerText = this.expression + ' =';
            this.expression = String(+(Math.round(result + "e+6") + "e-6"));
            this.updateDisplay();
        } catch (e) {
            document.getElementById('calcInput').innerText = 'Erro';
            setTimeout(() => { this.expression = ''; this.updateDisplay(); }, 1000);
        }
    },
    updateDisplay() {
        const vis = this.expression.replace(/\*\*/g, '^').replace(/\*/g, '×').replace(/\//g, '÷').replace(/Math.sqrt\(/g, '√(');
        document.getElementById('calcInput').innerText = vis || '0';
    }
};

function openPlanner() {
    document.getElementById('plannerBadge').style.display = 'none';
    CALENDAR.init();
    CALENDAR.render();
    openModal('plannerOverlay');
}

function goToSubjects() {
    const el = document.getElementById('subjectsList');
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // The header is quite large, subtract 60px to account for it
        setTimeout(() => {
            window.scrollBy({ top: -60, behavior: 'smooth' });
        }, 300);
    }
}

function openSearch() {
    document.getElementById('gSearchInp').value = '';
    document.getElementById('searchResults').innerHTML = '';
    _searchFilter = 'all';
    openModal('searchOverlay');
    setTimeout(() => document.getElementById('gSearchInp').focus(), 100);
}

function filterSearch(type) {
    _searchFilter = type;
    doGlobalSearch();
}

function doGlobalSearch() {
    const term = document.getElementById('gSearchInp').value.toLowerCase();
    const resBox = document.getElementById('searchResults');
    if (!term) { resBox.innerHTML = ''; return; }

    let results = [];
    S.years.forEach(y => {
        (y.subjects || []).forEach(s => {
            if ((_searchFilter === 'all' || _searchFilter === 'disc') && s.name.toLowerCase().includes(term))
                results.push({ icon: '🎯', cat: 'Disciplina', title: `${s.name}`, sub: `Ano ${y.year} • ${y.serie}` });
            if (_searchFilter === 'all' || _searchFilter === 'nota')
                s.notes.forEach(n => {
                    if ((n.title && n.title.toLowerCase().includes(term)) || n.text.toLowerCase().includes(term))
                        results.push({ icon: '📝', cat: 'Anotação', title: `${n.title || 'Sem título'}`, sub: `${s.name} • ${TRIMS[n.tri] || ''}` });
                });
            if (_searchFilter === 'all' || _searchFilter === 'fich')
                s.files.forEach(f => {
                    if (f.name.toLowerCase().includes(term))
                        results.push({ icon: '📎', cat: 'Ficheiro', title: f.name, sub: `${s.name} • ${TRIMS[f.tri] || ''}` });
                });
        });
    });
    if (_searchFilter === 'all' || _searchFilter === 'task')
        S.planner.forEach(t => {
            if (t.title.toLowerCase().includes(term) || (t.subj && t.subj.toLowerCase().includes(term)))
                results.push({ icon: '📅', cat: 'Tarefa', title: t.title, sub: `${t.subj} • ${t.date}` });
        });

    resBox.innerHTML = results.length
        ? results.map(r => `
            <div class="list-item">
                <div>
                    <div class="list-item-title">${r.icon} ${r.cat}: ${r.title}</div>
                    <div class="list-item-sub">${r.sub}</div>
                </div>
            </div>`).join('')
        : '<div style="color:var(--t3);text-align:center;padding:30px;font-size:14px;">Nenhum resultado encontrado.</div>';
}

function exportJSON() {
    try {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(DB));
        const dl = document.createElement('a');
        dl.setAttribute('href', dataStr);
        dl.setAttribute('download', `ca10_os_backup_${new Date().toISOString().slice(0, 10)}.json`);
        dl.click();
        showToast('💾 Backup exportado com sucesso!', 'ok');
    } catch (e) { showToast('Erro ao exportar backup.'); }
}

function openModal(id) {
    const el = document.getElementById(id);
    el.classList.remove('hidden');
    // Force reflow
    void el.offsetWidth;
    el.style.opacity = '1';
    
    const menuEl = el.querySelector('.modal, .calc-modal, .level-up-box');
    if (menuEl) {
        menuEl.style.transform = 'scale(1) translateY(0)';
    }

    if (id === 'achievementsOverlay') document.getElementById('achvBadge').style.display = 'none';
}
function closeModal(id) { 
    const el = document.getElementById(id);
    const menuEl = el.querySelector('.modal, .calc-modal, .level-up-box');
    
    if (menuEl) {
        menuEl.style.transform = 'scale(0.95) translateY(15px)';
    }
    el.style.opacity = '0';
    
    setTimeout(() => {
        el.classList.add('hidden');
    }, 250);
}

function saveYear() {
    const year = parseInt(document.getElementById('yInput').value) || new Date().getFullYear();
    const serie = document.getElementById('serieInput').value || '—';
    const passG = parseFloat(document.getElementById('yPass').value) || 10.0;
    const recG = parseFloat(document.getElementById('yRec').value) || 8.0;
    if (yMode === 'add') {
        const y = { id: 'y' + Date.now(), year, serie, passG, recG, subjects: [] };
        S.years.push(y); S.cid = y.id; S.tri = 0;
    } else {
        const y = cy(); y.year = year; y.serie = serie; y.passG = passG; y.recG = recG;
    }
    save(); closeModal('yearOverlay'); render();
}

function openEditYear() {
    yMode = 'edit'; const y = cy();
    document.getElementById('yInput').value = y.year;
    document.getElementById('serieInput').value = y.serie;
    document.getElementById('yPass').value = y.passG;
    document.getElementById('yRec').value = y.recG;
    document.getElementById('yModalTitle').textContent = `Editar ${y.year}`;
}

function rColorRow() {
    const box = document.getElementById('colorRow');
    if (box) box.innerHTML = COLORS.map(c => `<div class="col-dot ${selColor === c ? 'sel' : ''}" style="background:${c}" onclick="selColor='${c}';rColorRow()"></div>`).join('');
}

function openAddSubject() {
    selColor = COLORS[0];
    const inp = document.getElementById('subjName');
    if (inp) inp.value = '';
    rColorRow();
    openModal('subjOverlay');
    setTimeout(() => { if (inp) inp.focus(); }, 100);
}

let _confirmAction = null;
function showConfirm(title, msg, action) {
    document.getElementById('confirmTitle').innerText = title;
    document.getElementById('confirmMessage').innerText = msg;
    _confirmAction = action;
    openModal('confirmOverlay');
}

let _promptAction = null;
function showPrompt(title, defaultVal, action) {
    document.getElementById('promptTitle').innerText = title;
    document.getElementById('promptInput').value = defaultVal || '';
    _promptAction = action;
    openModal('promptOverlay');
    setTimeout(() => document.getElementById('promptInput').focus(), 100);
}

// Context Menu Actions
window.ctxEditSubject = function(si) {
    hideContextMenu();
    const s = cy().subjects[si];
    showPrompt('Editar Matéria', s.name, (newName) => {
        if(newName.trim()) { s.name = newName.trim(); save(); rSubjects(); }
    });
};
window.ctxDupSubject = function(si) {
    hideContextMenu();
    const base = cy().subjects[si];
    if(!base) return;
    const copy = JSON.parse(JSON.stringify(base));
    copy.id = 's' + Date.now();
    copy.name = base.name + ' (Cópia)';
    cy().subjects.push(copy);
    save(); rSubjects();
    showToast('Matéria duplicada!', 'ok');
};
window.ctxDelSubject = function(si) {
    hideContextMenu();
    delSubject(si);
};
window.ctxCreateSubject = function(yid) {
    hideContextMenu();
    S.cid = yid;
    save(); render();
    openAddSubject();
};
window.ctxRenameYear = function(yid) {
    hideContextMenu();
    const y = S.years.find(x => x.id === yid);
    if(!y) return;
    showPrompt('Renomear Ano (Semestre/Periodo)', y.year, (newVal) => {
        if(newVal.trim()) { y.year = newVal.trim(); save(); rChips(); }
    });
};
window.ctxDelYear = function(yid) {
    hideContextMenu();
    if(S.years.length <= 1) {
        showToast('Não podes apagar o único ano letivo.', 'warn');
        return;
    }
    const y = S.years.find(x => x.id === yid);
    showConfirm('Apagar Ano?', `Tem a certeza que deseja apagar ${y.year}?`, () => {
        const yChip = document.querySelector(`.y-chip[data-yid="${yid}"]`);
        if (yChip) yChip.classList.add('item-removing');
        
        setTimeout(() => {
            S.years = S.years.filter(x => x.id !== yid);
            if(S.cid === yid) S.cid = S.years[0].id;
            save(); render();
        }, 300);
    });
};
window.ctxCreateYear = function() {
    hideContextMenu();
    yMode = 'add';
    document.getElementById('yInput').value = '';
    document.getElementById('serieInput').value = '';
    document.getElementById('yModalTitle').textContent = 'Novo Ano Letivo';
    openModal('yearOverlay');
};

function showContextMenu(e, items) {
    e.preventDefault();
    const menu = document.getElementById('ctxMenu');
    menu.innerHTML = items.map(item =>
        `<div class="ctx-item ${item.danger ? 'danger' : ''}" onclick="${item.action}">
            <span class="ctx-icon">${item.icon}</span>
            <span class="ctx-label">${item.label}</span>
        </div>`
    ).join('');

    menu.style.display = 'flex';
    menu.offsetHeight; // Force reflow

    let x = e.clientX;
    let y = e.clientY;
    const mw = menu.offsetWidth;
    const mh = menu.offsetHeight;

    if (x + mw > window.innerWidth) x = window.innerWidth - mw - 5;
    if (y + mh > window.innerHeight) y = window.innerHeight - mh - 5;

    menu.style.left = `${Math.max(5, x)}px`;
    menu.style.top = `${Math.max(5, y)}px`;

    menu.classList.add('visible');
}

function hideContextMenu() {
    const menu = document.getElementById('ctxMenu');
    menu.classList.remove('visible');
    setTimeout(() => { if (!menu.classList.contains('visible')) menu.style.display = 'none'; }, 150);
}

function saveSubject() {
    const nameInp = document.getElementById('subjName');
    const teacherInp = document.getElementById('subjTeacher');
    const name = nameInp.value.trim();
    const teacher = teacherInp ? teacherInp.value.trim() : '';
    if (!name) { showToast('Por favor, dá um nome à disciplina.', 'warn'); return; }
    const yearData = cy();
    if (!yearData) { showToast('Tens de adicionar um Ano Letivo primeiro.', 'warn'); return; }
    if (!yearData.subjects) yearData.subjects = [];
    yearData.subjects.push({ id: 's' + Date.now(), name, teacher, color: selColor, expanded: true, activeTab: 'provas', notes: [], files: [], g: {} });
    nameInp.value = '';
    if (teacherInp) teacherInp.value = '';
    save(); 
    closeModal('subjOverlay'); 
    rSubjects(); rStats(); 
    addXP(30, 'Disciplina adicionada!');
}

function delSubject(si) {
    showConfirm('Apagar Disciplina?', 'Tem a certeza que deseja apagar esta disciplina e todos os seus dados?', () => {
        const sCard = document.querySelector(`.s-card[data-si="${si}"]`);
        if (sCard) sCard.classList.add('item-removing');
        setTimeout(() => {
            cy().subjects.splice(si, 1); 
            save(); 
            render();
        }, 300);
    });
}

function openProgressDashboard() {
    updateProgressDashboard();
    document.getElementById('dashAvatarSelector').innerHTML = AVATARS.map(av =>
        `<div class="av-dot ${S.avatar === av ? 'sel' : ''}" onclick="changeAvatar('${av}')">${av}</div>`
    ).join('');
    document.getElementById('dashProfList').innerHTML = DB.profiles.map(p => `
        <div class="list-item" style="padding:10px 16px;margin-bottom:0;${p.id === DB.activeProfile ? 'border-color:var(--acc);' : ''}" onclick="switchProfile('${p.id}')">
            <div style="display:flex;align-items:center;gap:10px;">
                <div class="p-av" style="width:30px;height:30px;font-size:16px;">${p.avatar || '😎'}</div>
                <div class="list-item-title" style="margin:0;font-size:13px;">${p.name}</div>
            </div>
            ${DB.profiles.length > 1 && p.id !== DB.activeProfile
                ? `<button class="btn-outline" style="padding:4px 8px;color:var(--bad);" onclick="event.stopPropagation();deleteProfile('${p.id}')">✕</button>`
                : ''}
        </div>`).join('');
    openModal('progressOverlay');
}

function updateProgressDashboard() {
    document.getElementById('dashAv').textContent = S.avatar || '😎';
    document.getElementById('dashName').textContent = S.name;
    document.getElementById('dashLevel').textContent = S.level;
    const targetXP = S.level * 100;
    document.getElementById('dashXp').textContent = Math.floor(S.xp);
    document.getElementById('dashTargetXp').textContent = targetXP;
    document.getElementById('dashXpFill').style.width = `${(S.xp / targetXP) * 100}%`;
    const totalXP = ((S.level - 1) * 100) + S.xp;
    const rank = getRank(totalXP);
    const rankBadge = document.getElementById('dashRankBadge');
    rankBadge.innerHTML = `${rank.icon} ${rank.title}`;
    document.getElementById('dashStatTasks').textContent = S.stats.tasksDone || 0;
    document.getElementById('dashStatNotes').textContent = S.stats.notesCreated || 0;
    document.getElementById('dashStatFiles').textContent = S.stats.filesAdded || 0;
}

function changeAvatar(av) { S.avatar = av; save(); rTop(); openProgressDashboard(); }
function switchProfile(id) { DB.activeProfile = id; save(); load(); render(); closeModal('progressOverlay'); showToast('Perfil alterado!', 'ok'); }
function deleteProfile(id) { 
    showConfirm('Apagar Perfil?', 'Tem a certeza que deseja apagar este perfil e todos os seus dados?', () => {
        DB.profiles = DB.profiles.filter(p => p.id !== id); 
        if (!DB.profiles.length) DB.profiles = [initDefaultProfile()]; 
        DB.activeProfile = DB.profiles[0].id; 
        save(); load(); render(); openProgressDashboard(); 
    }); 
}
function saveNewProfile() {
    const name = document.getElementById('newProfName').value.trim(); if (!name) return;
    const p = initDefaultProfile(); p.id = 'p' + Date.now(); p.name = name;
    DB.profiles.push(p); DB.activeProfile = p.id;
    document.getElementById('newProfName').value = '';
    save(); load(); render(); closeModal('progressOverlay');
    showToast(`Perfil "${name}" criado!`, 'ok');
}

/* =========================================
   SISTEMA DE INTELIGÊNCIA ARTIFICIAL (IA)
========================================= */

const EngineHelpers = {
    getWorst(averages) {
        if (!averages || !averages.length) return null;
        let worst = averages[0];
        averages.forEach(a => { if (a.avg < worst.avg) worst = a; });
        return worst;
    },
    getBest(averages) {
        if (!averages || !averages.length) return null;
        let best = averages[0];
        averages.forEach(a => { if (a.avg > best.avg) best = a; });
        return best;
    },
    getGeneralAverage(averages) {
        if (!averages || !averages.length) return 0;
        const sum = averages.reduce((ac, a) => ac + a.avg, 0);
        return +(sum / averages.length).toFixed(1);
    },
    generatePlan(averages, tasks) {
        const priorities = averages.slice().sort((a,b) => a.avg - b.avg);
        return { priorities, tasks };
    }
};

const SCHOOL_AI = {
    isOpen: false,
    chatHistory: [],
    context: { lastIntent: null, lastData: null },

    // 1. DATA LAYER (Coletor de Dados)
    Data: {
        getUserData() { return window.S || null; },
        getActiveYear() {
            const S = this.getUserData();
            if (!S || !S.years || !S.years.length) return null;
            return S.years.find(y => y.id === S.cid) || S.years[0];
        },
        getSubjects() {
            const year = this.getActiveYear();
            return year ? year.subjects : [];
        },
        getPlannerTasks() {
            const S = this.getUserData();
            return S ? S.planner || [] : [];
        },
        calculateAverages() {
            const subjects = this.getSubjects();
            const year = this.getActiveYear();
            if (!year || !subjects.length) return [];
            
            const passGrade = year.passG !== undefined ? year.passG : 10;
            const currentTri = window.S ? window.S.tri || 1 : 1;
            
            return subjects.map(subj => {
                if (!subj.g || !subj.g[currentTri]) return { name: subj.name, avg: null, isPassing: null };
                const gr = subj.g[currentTri];
                let asVals = (gr.AS || []).filter(v => v !== '' && v !== null && !isNaN(+v)).map(Number);
                let media_AS = asVals.length > 0 ? asVals.reduce((a, b) => a + b, 0) / asVals.length : null;
                let nota_PS = (gr.part !== '' || gr.sim !== '') ? (Number(gr.part || 0) + Number(gr.sim || 0)) : null;
                let trimestral = gr.trim !== '' && gr.trim !== undefined ? Number(gr.trim) : null;
                
                let sum = 0, count = 0;
                if (media_AS !== null) { sum += media_AS; count++; }
                if (nota_PS !== null) { sum += nota_PS; count++; }
                if (trimestral !== null) { sum += trimestral; count++; }
                
                let avg = count > 0 ? +(sum / count).toFixed(1) : null;
                return { 
                    name: subj.name, 
                    avg: avg, 
                    isPassing: avg !== null ? avg >= passGrade : null 
                };
            }).filter(s => s.avg !== null);
        }
    },

    // 2. INPUT PARSER (Interpretador de Linguagem)
    Parser: {
        normalize(text) {
            return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s\?]/g, "");
        },
        parseUserInput(input, context) {
            const norm = this.normalize(input);
            const intent = { action: "unknown", entities: {} };

            // Continuation logic based on memory context
            if (norm.match(/e (a|o) (melhor|maior)/) && context.lastIntent === "worst_subject") {
                intent.action = "best_subject"; return intent;
            }
            if (norm.match(/e (a|o) (pior|menor)/) && context.lastIntent === "best_subject") {
                intent.action = "worst_subject"; return intent;
            }

            // Patterns & Keywords
            if (norm.match(/pior|menor media|maior dificuldade|focar|dificil/)) {
                intent.action = "worst_subject";
            } else if (norm.match(/melhor|maior media|mais facil|bem/)) {
                intent.action = "best_subject";
            } else if (norm.match(/resumo|media|notas|como estou/)) {
                intent.action = "general_average";
            } else if (norm.match(/melhorar|dicas|plano|estud/)) {
                intent.action = "study_plan";
            } else if (norm.match(/tarefas|hoje|agenda/)) {
                intent.action = "tasks";
            } else if (norm.match(/oi|ola|bom dia|boa tarde|boa noite|ajuda(r|me|)/)) {
                intent.action = "greeting";
            }

            return intent;
        }
    },

    // 3. LOGIC ENGINE (Motor de Decisão)
    Engine: {
        process(intent, dataLayer) {
            const averages = dataLayer.calculateAverages();
            
            switch (intent.action) {
                case "worst_subject":
                    return { type: "worst_subject", data: EngineHelpers.getWorst(averages) };
                case "best_subject":
                    return { type: "best_subject", data: EngineHelpers.getBest(averages) };
                case "general_average":
                    return { type: "general_average", data: { averages, general: EngineHelpers.getGeneralAverage(averages) } };
                case "study_plan":
                    return { type: "study_plan", data: EngineHelpers.generatePlan(averages, dataLayer.getPlannerTasks()) };
                case "tasks":
                    return { type: "tasks", data: dataLayer.getPlannerTasks() };
                case "greeting":
                    return { type: "greeting", data: null };
                default:
                    return { type: "unknown", data: null };
            }
        }
    },

    // 4. RESPONSE GENERATOR (Gerador de Resposta em Linguagem Natural)
    Generator: {
        generateResponse(result) {
            const { type, data } = result;
            const greet = ["Olá!", "Oi!", "Tudo ótimo?"];
            const rGreet = greet[Math.floor(Math.random() * greet.length)];

            if (type === "greeting") return `${rGreet} Sou seu assistente escolar. Posso analisar suas médias, encontrar sua pior ou melhor matéria, ou criar um plano de estudos focado no seu desempenho.\n\nExperimente perguntar: *"Qual a minha pior matéria?"* ou *"Crie um plano de estudos"*.`;
            
            if (type === "worst_subject") {
                if (!data) return "Ainda não tem notas suficientes para eu analisar qual a sua matéria com maior dificuldade neste trimestre.";
                return `Sua matéria com pior desempenho atualmente é **${data.name}**, com média **${data.avg}**. Seria interessante focarmos os seus estudos nela nas próximas semanas!`;
            }
            
            if (type === "best_subject") {
                if (!data) return "Ainda não tenho dados e notas para encontrar sua melhor matéria. Continue registando!";
                return `Mandou bem! Sua melhor matéria no momento é **${data.name}**, com uma ótima média de **${data.avg}**. Continue assim! 🎉`;
            }

            if (type === "general_average") {
                if (!data.averages || data.averages.length === 0) return "Ainda não encontramos notas suficientes neste trimestre para uma visão geral.";
                let text = `Sua **Média Geral** atual é **${data.general}**.\n\n`;
                const baixas = data.averages.filter(a => !a.isPassing).map(a => `**${a.name}**`);
                if (baixas.length) {
                    text += `⚠️ Atenção às matérias abaixo da média e com risco: ${baixas.join(', ')}. `;
                } else {
                    text += `✅ Muito bom! Você está com notas positivas em todas as matérias avaliadas até agora.`;
                }
                return text;
            }

            if (type === "study_plan") {
                if (!data || !data.priorities || data.priorities.length === 0) return "Ainda não há notas para que eu monte um plano de estudos baseado nas suas prioridades.";
                let text = "🗓️ **Plano de Estudos Inteligente:**\n\nBaseado no seu desempenho atual, você deve focar nesta ordem de prioridade durante a semana:\n";
                data.priorities.slice(0, 3).forEach((p, i) => {
                    text += `<br>**${i+1}º Foco:** ${p.name} (Média atual: ${p.avg})`;
                });
                text += "<br><br>💡 **Dica:** Divida o estudo destas matérias ao longo dos dias, priorizando a mais difícil nos momentos de pico de energia!";
                return text;
            }

            if (type === "tasks") {
                if (!data || data.length === 0) return "A sua agenda está livre no momento! Aproveite para revisar alguma matéria ou simplesmente descansar.";
                const soon = data.sort((a, b) => new Date(a.date) - new Date(b.date))[0];
                return `Sua próxima tarefa é **${soon.title}** da disciplina **${soon.subj}** (Data Limite: ${soon.date}). Vamos nessa!`;
            }

            return "Hmm, não consegui entender bem o que você quis dizer. Posso tentar mais tarde? \n\nPode tentar perguntar qual sua média, qual a pior/melhor matéria, ou até para eu criar um plano de estudos inteligente!";
        }
    },

    // 5. CHAT INTERFACE & CONTROLLERS (A Integração UI)
    init() {
        document.getElementById('sai-fab').addEventListener('click', () => this.togglePanel());
        document.getElementById('sai-close').addEventListener('click', () => this.togglePanel());
        document.getElementById('sai-send').addEventListener('click', () => this.handleInput());
        document.getElementById('sai-input').addEventListener('keypress', (e) => { 
            if (e.key === 'Enter') this.handleInput(); 
        });
        
        const saved = localStorage.getItem('ca10_ai_chat_v2');
        if (saved) { 
            this.chatHistory = JSON.parse(saved); 
            this.renderChat(); 
        } else { 
            this.addMessage('bot', '👋 Olá! Sou o teu **novo Assistente Pessoal Escolar Inteligente**.\n\nAo contrário dos robôs comuns, eu baseio as minhas respostas na tua verdadeira performance escolar!\n\nExperimenta perguntar: *"Qual a minha pior matéria?"*, *"Qual a minha média geral?"* ou *"Gera um plano de estudos inteligente!"*.'); 
        }
    },

    togglePanel() {
        this.isOpen = !this.isOpen;
        const panel = document.getElementById('sai-panel');
        if (this.isOpen) { 
            panel.classList.remove('sai-hidden'); 
            this.scrollToBottom(); 
            document.getElementById('sai-input').focus(); 
        } else { 
            panel.classList.add('sai-hidden'); 
        }
    },

    handleInput() {
        const inputEl = document.getElementById('sai-input');
        const text = inputEl.value.trim(); 
        if (!text) return;

        this.addMessage('user', text); 
        inputEl.value = '';

        // UI Feedback: Typing animation
        this.showTyping();

        // Delay para simular IA pensando
        setTimeout(() => {
            this.removeTyping();
            this.processMessage(text);
        }, 800 + Math.random() * 800); 
    },

    addMessage(sender, text) {
        this.chatHistory.push({ sender, text });
        localStorage.setItem('ca10_ai_chat_v2', JSON.stringify(this.chatHistory)); 
        this.renderChat();
    },

    showTyping() {
        const body = document.getElementById('sai-chat-body');
        const typingHtml = `<div class="sai-msg sai-bot typing-indicator" id="sai-typing"><span></span><span></span><span></span></div>`;
        body.insertAdjacentHTML('beforeend', typingHtml);
        this.scrollToBottom();
    },

    removeTyping() {
        const el = document.getElementById('sai-typing');
        if (el) el.remove();
    },

    renderChat() {
        const body = document.getElementById('sai-chat-body');
        body.innerHTML = this.chatHistory.map(msg => {
            // Parser simples de markdown para Negrito (**texto**) e Quebra de linha
            let styledText = msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            styledText = styledText.replace(/\n/g, '<br>');
            return `<div class="sai-msg sai-${msg.sender}">${styledText}</div>`;
        }).join('');
        this.scrollToBottom();
    },

    scrollToBottom() { 
        const b = document.getElementById('sai-chat-body'); 
        b.scrollTop = b.scrollHeight; 
    },

    // Orquestrador Central da IA
    processMessage(text) {
        // Passo 1: Interpretar Input
        const intent = this.Parser.parseUserInput(text, this.context);
        
        // Memória Contextual
        if (intent.action !== "unknown") {
            this.context.lastIntent = intent.action;
        }

        // Passo 2: Motor Lógico & Dados
        const result = this.Engine.process(intent, this.Data);

        // Passo 3: Geração de Resposta em Linguagem Natural
        const responseText = this.Generator.generateResponse(result);

        // Passo 4: Exibir e Salvar Mensagem
        this.addMessage('bot', responseText);
    }
};

const CONV = {
    category: 'length',
    units: {
        length: [
            { id: 'mm',  label: 'Milímetro (mm)',   toBase: v => v * 0.001,        fromBase: v => v * 1000     },
            { id: 'cm',  label: 'Centímetro (cm)',  toBase: v => v * 0.01,         fromBase: v => v * 100      },
            { id: 'm',   label: 'Metro (m)',         toBase: v => v,                fromBase: v => v            },
            { id: 'km',  label: 'Quilómetro (km)',  toBase: v => v * 1000,         fromBase: v => v * 0.001    },
            { id: 'in',  label: 'Polegada (in)',    toBase: v => v * 0.0254,       fromBase: v => v / 0.0254   },
            { id: 'ft',  label: 'Pé (ft)',           toBase: v => v * 0.3048,       fromBase: v => v / 0.3048   },
            { id: 'yd',  label: 'Jarda (yd)',        toBase: v => v * 0.9144,       fromBase: v => v / 0.9144   },
            { id: 'mi',  label: 'Milha (mi)',        toBase: v => v * 1609.344,     fromBase: v => v / 1609.344 },
            { id: 'nmi', label: 'Milha náutica',    toBase: v => v * 1852,         fromBase: v => v / 1852     },
        ],
        mass: [
            { id: 'mg',  label: 'Miligrama (mg)',   toBase: v => v * 0.000001,     fromBase: v => v * 1000000  },
            { id: 'g',   label: 'Grama (g)',         toBase: v => v * 0.001,        fromBase: v => v * 1000     },
            { id: 'kg',  label: 'Quilograma (kg)',  toBase: v => v,                fromBase: v => v            },
            { id: 't',   label: 'Tonelada (t)',      toBase: v => v * 1000,         fromBase: v => v * 0.001    },
            { id: 'lb',  label: 'Libra (lb)',        toBase: v => v * 0.45359237,   fromBase: v => v / 0.45359237 },
            { id: 'oz',  label: 'Onça (oz)',         toBase: v => v * 0.02834952,   fromBase: v => v / 0.02834952 },
            { id: 'st',  label: 'Stone (st)',        toBase: v => v * 6.35029318,   fromBase: v => v / 6.35029318 },
        ],
        temp: [
            { id: 'C',   label: 'Celsius (°C)',     toBase: v => v,                fromBase: v => v            },
            { id: 'F',   label: 'Fahrenheit (°F)',  toBase: v => (v - 32) * 5/9,  fromBase: v => v * 9/5 + 32 },
            { id: 'K',   label: 'Kelvin (K)',        toBase: v => v - 273.15,       fromBase: v => v + 273.15   },
        ]
    },
    formulas: {
        'mm→m':  'mm ÷ 1 000 = m',      'm→mm':  'm × 1 000 = mm',
        'cm→m':  'cm ÷ 100 = m',         'm→cm':  'm × 100 = cm',
        'km→m':  'km × 1 000 = m',       'm→km':  'm ÷ 1 000 = km',
        'in→m':  'in × 0,0254 = m',      'm→in':  'm ÷ 0,0254 = in',
        'ft→m':  'ft × 0,3048 = m',      'm→ft':  'm ÷ 0,3048 = ft',
        'yd→m':  'yd × 0,9144 = m',      'm→yd':  'm ÷ 0,9144 = yd',
        'mi→m':  'mi × 1 609,344 = m',   'm→mi':  'm ÷ 1 609,344 = mi',
        'km→mi': 'km ÷ 1,60934 = mi',    'mi→km': 'mi × 1,60934 = km',
        'cm→mm': 'cm × 10 = mm',         'mm→cm': 'mm ÷ 10 = cm',
        'cm→in': 'cm ÷ 2,54 = in',       'in→cm': 'in × 2,54 = cm',
        'mg→kg': 'mg ÷ 1 000 000 = kg',  'kg→mg': 'kg × 1 000 000 = mg',
        'g→kg':  'g ÷ 1 000 = kg',        'kg→g':  'kg × 1 000 = g',
        't→kg':  't × 1 000 = kg',         'kg→t':  'kg ÷ 1 000 = t',
        'lb→kg': 'lb × 0,45359 = kg',     'kg→lb': 'kg ÷ 0,45359 = lb',
        'oz→kg': 'oz × 0,02835 = kg',     'kg→oz': 'kg ÷ 0,02835 = oz',
        'g→lb':  'g ÷ 453,59 = lb',       'lb→g':  'lb × 453,59 = g',
        'g→oz':  'g ÷ 28,35 = oz',        'oz→g':  'oz × 28,35 = g',
        'C→F':   '(°C × 9/5) + 32 = °F', 'F→C':   '(°F − 32) × 5/9 = °C',
        'C→K':   '°C + 273,15 = K',       'K→C':   'K − 273,15 = °C',
        'F→K':   '(°F − 32) × 5/9 + 273,15 = K', 'K→F': '(K − 273,15) × 9/5 + 32 = °F',
    },
    setCategory(cat) {
        this.category = cat;
        document.querySelectorAll('.conv-cat-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`convCat-${cat}`).classList.add('active');
        this.buildSelects();
        document.getElementById('convFromVal').value = '';
        document.getElementById('convToVal').value = '';
        document.getElementById('convResultNum').textContent = '—';
        document.getElementById('convResultUnit').textContent = '';
        document.getElementById('convFormula').innerHTML = 'Insere um valor para ver a conversão.';
    },
    buildSelects() {
        const units = this.units[this.category];
        const opts = units.map(u => `<option value="${u.id}">${u.label}</option>`).join('');
        document.getElementById('convFromUnit').innerHTML = opts;
        document.getElementById('convToUnit').innerHTML = opts;
        if (units.length > 1) document.getElementById('convToUnit').value = units[1].id;
    },
    swap() {
        const fromSel = document.getElementById('convFromUnit');
        const toSel   = document.getElementById('convToUnit');
        const fromVal = document.getElementById('convFromVal');
        const toVal   = document.getElementById('convToVal');
        [fromSel.value, toSel.value] = [toSel.value, fromSel.value];
        const newFrom = toVal.value && toVal.value !== '—' ? toVal.value : '';
        fromVal.value = newFrom;
        this.calculate();
    },
    calculate() {
        const fromId  = document.getElementById('convFromUnit').value;
        const toId    = document.getElementById('convToUnit').value;
        const rawVal  = document.getElementById('convFromVal').value;
        const resultEl     = document.getElementById('convToVal');
        const bigNumEl     = document.getElementById('convResultNum');
        const bigUnitEl    = document.getElementById('convResultUnit');
        const formulaEl    = document.getElementById('convFormula');

        if (rawVal === '' || rawVal === null) {
            resultEl.value = '';
            bigNumEl.textContent = '—';
            bigUnitEl.textContent = '';
            formulaEl.innerHTML = 'Insere um valor para ver a conversão.';
            return;
        }

        const input = parseFloat(rawVal);
        if (isNaN(input)) {
            resultEl.value = 'Inválido';
            bigNumEl.textContent = '!';
            formulaEl.innerHTML = '⚠️ Valor inválido.';
            return;
        }

        const units    = this.units[this.category];
        const fromUnit = units.find(u => u.id === fromId);
        const toUnit   = units.find(u => u.id === toId);
        if (!fromUnit || !toUnit) return;

        const inBase = fromUnit.toBase(input);
        const output = toUnit.fromBase(inBase);

        const formatted = this._format(output);

        resultEl.value = formatted;
        bigNumEl.textContent = formatted;
        bigUnitEl.textContent = this._shortLabel(toUnit);

        const fKey = `${fromId}→${toId}`;
        const formula = this.formulas[fKey];
        if (fromId === toId) {
            formulaEl.innerHTML = `<strong>${input}</strong> ${this._shortLabel(fromUnit)} = <strong>${formatted}</strong> ${this._shortLabel(toUnit)} &nbsp;(mesma unidade)`;
        } else if (formula) {
            formulaEl.innerHTML = `<strong>${formula}</strong>`;
        } else {
            formulaEl.innerHTML = `Conversão via unidade base &nbsp;→&nbsp; <strong>${this._format(inBase)} ${this.category === 'length' ? 'm' : this.category === 'mass' ? 'kg' : '°C'}</strong>`;
        }
    },
    _format(v) {
        if (Math.abs(v) >= 1e9 || (Math.abs(v) < 1e-6 && v !== 0)) return v.toExponential(4);
        if (Math.abs(v) >= 100) return parseFloat(v.toFixed(4)).toString();
        if (Math.abs(v) >= 1)   return parseFloat(v.toFixed(6)).toString();
        return parseFloat(v.toPrecision(6)).toString();
    },
    _shortLabel(unit) {
        const m = unit.label.match(/\((.+?)\)/);
        return m ? m[1] : unit.label;
    }
};

function openConverter() {
    if (!document.getElementById('convFromUnit').options.length) {
        CONV.buildSelects();
    }
    openModal('converterOverlay');
}

const ALL_MODALS = ['yearOverlay', 'subjOverlay', 'progressOverlay', 'searchOverlay', 'plannerOverlay', 'imageOverlay', 'levelUpOverlay', 'calcOverlay', 'achievementsOverlay', 'converterOverlay', 'confirmOverlay', 'promptOverlay'];

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        ALL_MODALS.forEach(closeModal);
        if (SCHOOL_AI.isOpen) SCHOOL_AI.togglePanel();
        hideContextMenu();
    }
});

ALL_MODALS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', ev => { if (ev.target === el) closeModal(id); });
});

document.addEventListener('DOMContentLoaded', () => {
    load();
    render();
    SCHOOL_AI.init();
    
    document.getElementById('subjOverlay').addEventListener('click', () => {
        if (document.getElementById('colorRow').innerHTML === '') rColorRow();
    });

    const confirmOkBtn = document.getElementById('confirmOkBtn');
    if (confirmOkBtn) {
        confirmOkBtn.addEventListener('click', () => {
            if (_confirmAction) _confirmAction();
            closeModal('confirmOverlay');
            _confirmAction = null;
        });
    }

    const promptOkBtn = document.getElementById('promptOkBtn');
    if (promptOkBtn) {
        promptOkBtn.addEventListener('click', () => {
            if (_promptAction) _promptAction(document.getElementById('promptInput').value);
            closeModal('promptOverlay');
            _promptAction = null;
        });
    }

    // Context Menu global bindings
    document.addEventListener('contextmenu', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            hideContextMenu();
            return;
        }
        
        if (e.target.closest('#scheduleGrid')) {
            // Already handled by inline oncontextmenu in rGrid()
            return;
        }

        e.preventDefault();
        
        const sCard = e.target.closest('.s-card');
        const yChip = e.target.closest('.y-chip');

        if (sCard) {
            const si = sCard.getAttribute('data-si');
            const subjectId = cy().subjects[si].id;
            showContextMenu(e, [
                { label: 'Editar matéria', icon: '✏️', action: `ctxEditSubject(${si})` },
                { label: 'Editar professor', icon: '👩‍🏫', action: `GRID.editTeacher('${subjectId}'); hideContextMenu();` },
                { label: 'Duplicar matéria', icon: '📋', action: `ctxDupSubject(${si})` },
                { label: 'Deletar matéria', icon: '🗑️', action: `ctxDelSubject(${si})`, danger: true }
            ]);
            return;
        }

        if (yChip) {
            const yid = yChip.getAttribute('data-yid');
            showContextMenu(e, [
                { label: 'Criar nova matéria', icon: '➕', action: `ctxCreateSubject('${yid}')` },
                { label: 'Renomear ano', icon: '🏷️', action: `ctxRenameYear('${yid}')` },
                { label: 'Deletar ano', icon: '🗑️', action: `ctxDelYear('${yid}')`, danger: true }
            ]);
            return;
        }

        showContextMenu(e, [
            { label: 'Criar novo ano', icon: '📅', action: `ctxCreateYear()` },
            { label: 'Atualizar página', icon: '🔄', action: `window.location.reload()` }
        ]);
    });

    document.addEventListener('click', (e) => {
        if (e.target.closest('#scheduleGrid')) return; // handled locally
        if (!e.target.closest('#ctxMenu')) hideContextMenu();
    });

    window.addEventListener('scroll', () => { hideContextMenu(); }, true);

    // Parallax effect
    document.addEventListener('mousemove', (e) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 30; // Max shift X
        const y = (e.clientY / window.innerHeight - 0.5) * 30; // Max shift Y
        document.body.style.setProperty('--px', `${x}px`);
        document.body.style.setProperty('--py', `${y}px`);
    });
