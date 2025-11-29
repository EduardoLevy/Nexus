// --- GERENCIAMENTO DE ESTADO E DADOS ---
const KEYS = {
    USERS: 'nexus_users',
    PROJECTS: 'nexus_projects',
    TASKS: 'nexus_tasks',
    SESSION: 'nexus_session'
};

// Estado em memória
let state = {
    user: null,
    users: [],
    projects: [],
    tasks: []
};

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    initStorage();
    loadState();
    checkSession();
});

function initStorage() {
    // Cria usuário Admin padrão se não existir
    if (!localStorage.getItem(KEYS.USERS)) {
        const admin = {
            id: 'admin-1',
            name: 'Administrador',
            email: 'admin@sys.com',
            password: '123',
            role: 'admin',
            joinedAt: new Date().toISOString()
        };
        localStorage.setItem(KEYS.USERS, JSON.stringify([admin]));
    }
    if (!localStorage.getItem(KEYS.PROJECTS)) localStorage.setItem(KEYS.PROJECTS, JSON.stringify([]));
    if (!localStorage.getItem(KEYS.TASKS)) localStorage.setItem(KEYS.TASKS, JSON.stringify([]));
}

function loadState() {
    state.users = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    state.projects = JSON.parse(localStorage.getItem(KEYS.PROJECTS) || '[]');
    state.tasks = JSON.parse(localStorage.getItem(KEYS.TASKS) || '[]');
    state.user = JSON.parse(localStorage.getItem(KEYS.SESSION));
}

function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
    loadState(); // Atualiza estado local
}

// --- AUTENTICAÇÃO ---
let isLoginMode = true;

const authForm = document.getElementById('auth-form');
const authToggleBtn = document.getElementById('auth-toggle-btn');
const authToggleText = document.getElementById('auth-toggle-text');
const fieldNameContainer = document.getElementById('field-name-container');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authError = document.getElementById('auth-error');

if (authToggleBtn) {
    authToggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        if (isLoginMode) {
            fieldNameContainer.classList.add('hidden');
            authSubmitBtn.innerText = 'Entrar';
            authToggleText.innerText = 'Não tem uma conta?';
            authToggleBtn.innerText = 'Criar conta';
            document.getElementById('auth-name').required = false;
        } else {
            fieldNameContainer.classList.remove('hidden');
            authSubmitBtn.innerText = 'Cadastrar';
            authToggleText.innerText = 'Já tem conta?';
            authToggleBtn.innerText = 'Fazer Login';
            document.getElementById('auth-name').required = true;
        }
        authError.classList.add('hidden');
    });
}

if (authForm) {
    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email').value;
        const pass = document.getElementById('auth-pass').value;
        const name = document.getElementById('auth-name').value;
        authError.classList.add('hidden');

        if (isLoginMode) {
            // Login
            const user = state.users.find(u => u.email === email && u.password === pass);
            if (user) {
                loginUser(user);
            } else {
                showError('Credenciais inválidas.');
            }
        } else {
            // Registro
            if (state.users.find(u => u.email === email)) {
                showError('Email já está em uso.');
                return;
            }
            const newUser = {
                id: 'user-' + Date.now(),
                name: name,
                email: email,
                password: pass,
                role: 'user', // Default
                joinedAt: new Date().toISOString()
            };
            const newUsers = [...state.users, newUser];
            saveData(KEYS.USERS, newUsers);
            loginUser(newUser);
        }
    });
}

function showError(msg) {
    authError.innerText = msg;
    authError.classList.remove('hidden');
}

function loginUser(user) {
    saveData(KEYS.SESSION, user);
    checkSession();
}

// Expose logout to global scope
window.logout = function() {
    localStorage.removeItem(KEYS.SESSION);
    state.user = null;
    checkSession();
}

function checkSession() {
    const authView = document.getElementById('auth-view');
    const appView = document.getElementById('app-view');

    if (state.user) {
        authView.classList.add('hidden');
        appView.classList.remove('hidden');
        document.getElementById('user-name-display').innerText = state.user.name;
        document.getElementById('user-role-display').innerText = state.user.role === 'admin' ? 'Administrador' : 'Usuário';
        document.getElementById('user-avatar').innerText = state.user.name.charAt(0).toUpperCase();
        
        // Define permissões de UI
        if(state.user.role === 'admin') {
            document.getElementById('admin-actions-header').classList.remove('hidden');
            document.getElementById('btn-new-user').classList.remove('hidden');
        } else {
            document.getElementById('admin-actions-header').classList.add('hidden');
            document.getElementById('btn-new-user').classList.add('hidden');
        }

        navTo('dashboard'); 
    } else {
        authView.classList.remove('hidden');
        appView.classList.add('hidden');
    }
}

// --- NAVEGAÇÃO ---
window.navTo = function(viewId) {
    // Esconde todas as views
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    
    // Remove active style dos botões
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('bg-blue-600', 'text-white', 'shadow-md');
        el.classList.add('text-gray-600', 'hover:bg-gray-50');
    });

    // Mostra view atual
    const target = document.getElementById(`view-${viewId}`);
    if (target) {
        target.classList.remove('hidden');
        // Animação de entrada
        target.classList.remove('fade-in');
        void target.offsetWidth; // Trigger reflow
        target.classList.add('fade-in');
    }

    // Ativa botão
    const btn = document.getElementById(`nav-${viewId}`);
    if (btn) {
        btn.classList.remove('text-gray-600', 'hover:bg-gray-50');
        btn.classList.add('bg-blue-600', 'text-white', 'shadow-md');
    }

    // Executa lógica específica da tela
    if (viewId === 'dashboard') renderDashboard();
    if (viewId === 'projects') renderProjects();
    if (viewId === 'tasks') renderTasks();

    // Mobile menu close
    const sidebar = document.querySelector('aside');
    if(window.innerWidth < 768 && !sidebar.classList.contains('hidden')) {
            toggleMobileMenu();
    }
}

window.toggleMobileMenu = function() {
    const sidebar = document.querySelector('aside');
    sidebar.classList.toggle('hidden');
    sidebar.classList.toggle('fixed');
    sidebar.classList.toggle('inset-0');
    sidebar.classList.toggle('bg-white');
    sidebar.classList.toggle('z-50');
}

// --- LÓGICA: DASHBOARD E USUÁRIOS (CRUD 1) ---
let chartInstance = null;

function renderDashboard() {
    // Atualiza KPIs
    document.getElementById('kpi-users').innerText = state.users.length;
    document.getElementById('kpi-projects').innerText = state.projects.length;
    
    const completed = state.projects.filter(p => p.status === 'Concluído').length;
    const active = state.projects.filter(p => p.status === 'Ativo').length;
    const pending = state.projects.filter(p => p.status === 'Pendente').length;
    
    document.getElementById('kpi-completed').innerText = completed;
    document.getElementById('kpi-active').innerText = active;

    // Renderiza Gráfico
    const ctxElement = document.getElementById('projectsChart');
    if (ctxElement) {
        const ctx = ctxElement.getContext('2d');
        if (chartInstance) chartInstance.destroy();

        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Ativo', 'Pendente', 'Concluído'],
                datasets: [{
                    label: 'Projetos por Status',
                    data: [active, pending, completed],
                    backgroundColor: ['#3b82f6', '#f59e0b', '#10b981'],
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, grid: { display: false } } }
            }
        });
    }

    // Lógica de Admin vs User
    const adminPanel = document.getElementById('admin-users-panel');
    const welcomePanel = document.getElementById('user-welcome-panel');
    const tbody = document.getElementById('users-table-body');

    if (state.user.role === 'admin') {
        adminPanel.classList.remove('hidden');
        welcomePanel.classList.add('hidden');
        
        tbody.innerHTML = '';
        state.users.forEach(u => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-gray-100 last:border-0 hover:bg-gray-50';
            
            let actions = '';
            if (u.id !== state.user.id) { // Não pode deletar a si mesmo aqui
                 actions = `
                    <div class="flex gap-2">
                        <button onclick="editUser('${u.id}')" class="text-blue-500 hover:text-blue-700 p-1"><i class="fas fa-edit"></i></button>
                        <button onclick="deleteUser('${u.id}')" class="text-red-500 hover:text-red-700 p-1"><i class="fas fa-trash"></i></button>
                    </div>
                 `;
            } else {
                 actions = `<span class="text-xs text-gray-400 italic">Você</span>`;
            }

            tr.innerHTML = `
                <td class="py-3 font-medium text-gray-800">${u.name}</td>
                <td class="py-3 text-gray-600">${u.email}</td>
                <td class="py-3"><span class="px-2 py-1 text-xs rounded-full ${u.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}">${u.role}</span></td>
                <td class="py-3 text-right">${actions}</td>
            `;
            tbody.appendChild(tr);
        });
    } else {
        adminPanel.classList.add('hidden');
        welcomePanel.classList.remove('hidden');
    }
}

// User CRUD Operations
window.openUserModal = function() {
    document.getElementById('form-user').reset();
    document.getElementById('user-id').value = '';
    document.getElementById('modal-user-title').innerText = 'Novo Usuário';
    document.getElementById('modal-user').classList.remove('hidden');
}

window.editUser = function(id) {
    const u = state.users.find(x => x.id == id);
    if(!u) return;

    document.getElementById('user-id').value = u.id;
    document.getElementById('user-name').value = u.name;
    document.getElementById('user-email').value = u.email;
    document.getElementById('user-role').value = u.role;
    // Password não preenchemos por segurança, só se for trocar

    document.getElementById('modal-user-title').innerText = 'Editar Usuário';
    document.getElementById('modal-user').classList.remove('hidden');
}

const formUser = document.getElementById('form-user');
if (formUser) {
    formUser.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('user-id').value;
        const name = document.getElementById('user-name').value;
        const email = document.getElementById('user-email').value;
        const role = document.getElementById('user-role').value;
        const pass = document.getElementById('user-pass').value;

        let newUsers = [...state.users];
        
        if (id) {
            // Edit
            const idx = newUsers.findIndex(u => u.id == id);
            if (idx > -1) {
                newUsers[idx] = { ...newUsers[idx], name, email, role };
                if (pass) newUsers[idx].password = pass; // Só atualiza senha se fornecida
            }
        } else {
            // Create
            if (state.users.find(u => u.email === email)) {
                alert('Email já existe!');
                return;
            }
            newUsers.push({
                id: 'user-' + Date.now(),
                name,
                email,
                role,
                password: pass || '123456', // Senha padrão se vazia no create
                joinedAt: new Date().toISOString()
            });
        }

        saveData(KEYS.USERS, newUsers);
        closeModal('modal-user');
        renderDashboard();
    });
}

window.deleteUser = function(id) {
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
        const newUsers = state.users.filter(u => u.id != id);
        saveData(KEYS.USERS, newUsers);
        renderDashboard();
    }
}


// --- LÓGICA: PROJETOS (CRUD 2) ---
window.renderProjects = function() {
    const grid = document.getElementById('projects-grid');
    grid.innerHTML = '';
    
    const search = document.getElementById('project-search').value.toLowerCase();
    const filter = document.getElementById('project-filter-status').value;
    const emptyMsg = document.getElementById('no-projects-msg');

    const filtered = state.projects.filter(p => {
        const matchSearch = p.title.toLowerCase().includes(search) || p.institution.toLowerCase().includes(search);
        const matchStatus = filter ? p.status === filter : true;
        return matchSearch && matchStatus;
    });

    if (filtered.length === 0) {
        emptyMsg.classList.remove('hidden');
    } else {
        emptyMsg.classList.add('hidden');
        filtered.forEach(p => {
            // Badge Color
            let badgeClass = 'bg-gray-100 text-gray-600';
            if(p.status === 'Ativo') badgeClass = 'bg-blue-100 text-blue-700';
            if(p.status === 'Concluído') badgeClass = 'bg-green-100 text-green-700';
            if(p.status === 'Pendente') badgeClass = 'bg-yellow-100 text-yellow-700';

            const div = document.createElement('div');
            div.className = 'bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition flex flex-col';
            div.innerHTML = `
                <div class="flex justify-between items-start mb-3">
                    <span class="px-2 py-1 rounded text-xs font-bold uppercase ${badgeClass}">${p.status}</span>
                    <div class="flex gap-2">
                        <button onclick="editProject(${p.id})" class="text-gray-400 hover:text-blue-500"><i class="fas fa-edit"></i></button>
                        <button onclick="deleteProject(${p.id})" class="text-gray-400 hover:text-red-500"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <h3 class="text-lg font-bold text-gray-800 mb-1 line-clamp-1">${p.title}</h3>
                <div class="flex items-center text-sm text-gray-500 mb-3">
                    <i class="fas fa-building mr-1.5"></i> ${p.institution}
                </div>
                <p class="text-gray-600 text-sm mb-4 line-clamp-3 flex-1">${p.objective}</p>
                <div class="pt-4 border-t border-gray-50 text-xs text-gray-400 flex items-center">
                    <i class="far fa-calendar-alt mr-1.5"></i> ${new Date(p.startDate).toLocaleDateString()}
                </div>
            `;
            grid.appendChild(div);
        });
    }
}

// Project Modal Logic
const formProject = document.getElementById('form-project');

window.openProjectModal = function() {
    document.getElementById('form-project').reset();
    document.getElementById('project-id').value = '';
    document.getElementById('modal-project-title').innerText = 'Novo Projeto';
    document.getElementById('modal-project').classList.remove('hidden');
}

window.editProject = function(id) {
    const p = state.projects.find(x => x.id == id);
    if (!p) return;

    document.getElementById('project-id').value = p.id;
    document.getElementById('project-title').value = p.title;
    document.getElementById('project-institution').value = p.institution;
    document.getElementById('project-objective').value = p.objective;
    document.getElementById('project-start').value = p.startDate;
    document.getElementById('project-end').value = p.endDate;
    document.getElementById('project-status').value = p.status;
    document.getElementById('project-results').value = p.results;

    document.getElementById('modal-project-title').innerText = 'Editar Projeto';
    document.getElementById('modal-project').classList.remove('hidden');
}

if (formProject) {
    formProject.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('project-id').value;
        
        const projectData = {
            id: id ? Number(id) : Date.now(),
            title: document.getElementById('project-title').value,
            institution: document.getElementById('project-institution').value,
            objective: document.getElementById('project-objective').value,
            startDate: document.getElementById('project-start').value,
            endDate: document.getElementById('project-end').value,
            status: document.getElementById('project-status').value,
            results: document.getElementById('project-results').value,
        };

        let newProjects = [...state.projects];
        if (id) {
            const idx = newProjects.findIndex(p => p.id == id);
            if (idx > -1) newProjects[idx] = projectData;
        } else {
            newProjects.push(projectData);
        }

        saveData(KEYS.PROJECTS, newProjects);
        closeModal('modal-project');
        renderProjects();
        renderDashboard(); // Update charts
    });
}

window.deleteProject = function(id) {
    if (confirm('Tem certeza que deseja excluir?')) {
        const newProjects = state.projects.filter(p => p.id != id);
        saveData(KEYS.PROJECTS, newProjects);
        renderProjects();
        renderDashboard();
    }
}

// --- LÓGICA: TAREFAS (CRUD 3) ---
window.renderTasks = function() {
    const cols = {
        'Todo': document.getElementById('col-todo'),
        'InProgress': document.getElementById('col-progress'),
        'Done': document.getElementById('col-done')
    };
    const counts = {
        'Todo': document.getElementById('count-todo'),
        'InProgress': document.getElementById('count-progress'),
        'Done': document.getElementById('count-done')
    };

    // Limpa colunas
    Object.values(cols).forEach(el => el.innerHTML = '');

    // Popula
    state.tasks.forEach(task => {
        const project = state.projects.find(p => p.id == task.projectId);
        const projectTitle = project ? project.title : 'Sem Projeto';

        const card = document.createElement('div');
        card.className = 'bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition group';
        card.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <span class="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded truncate max-w-[150px]">${projectTitle}</span>
                <button onclick="deleteTask('${task.id}')" class="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><i class="fas fa-times"></i></button>
            </div>
            <h4 class="font-bold text-gray-800 mb-1 text-sm">${task.title}</h4>
            <p class="text-xs text-gray-500 mb-3 line-clamp-2">${task.description || ''}</p>
            
            <div class="flex justify-between items-center pt-2 border-t border-gray-50 mt-2">
                <div class="flex gap-1">
                    ${task.status !== 'Todo' ? `<button onclick="moveTask('${task.id}', 'Todo')" title="Mover para Fazer" class="p-1 hover:bg-gray-100 rounded text-gray-500 text-xs"><i class="fas fa-arrow-left"></i></button>` : ''}
                    ${task.status === 'Todo' ? `<button onclick="moveTask('${task.id}', 'InProgress')" title="Mover para Progresso" class="p-1 hover:bg-gray-100 rounded text-gray-500 text-xs"><i class="fas fa-arrow-right"></i></button>` : ''}
                    ${task.status === 'InProgress' ? `<button onclick="moveTask('${task.id}', 'Done')" title="Mover para Concluído" class="p-1 hover:bg-gray-100 rounded text-gray-500 text-xs"><i class="fas fa-arrow-right"></i></button>` : ''}
                    ${task.status === 'Done' ? `<button onclick="moveTask('${task.id}', 'InProgress')" title="Voltar para Progresso" class="p-1 hover:bg-gray-100 rounded text-gray-500 text-xs"><i class="fas fa-arrow-left"></i></button>` : ''}
                </div>
            </div>
        `;
        if(cols[task.status]) cols[task.status].appendChild(card);
    });

    // Update counts
    counts['Todo'].innerText = state.tasks.filter(t => t.status === 'Todo').length;
    counts['InProgress'].innerText = state.tasks.filter(t => t.status === 'InProgress').length;
    counts['Done'].innerText = state.tasks.filter(t => t.status === 'Done').length;
}

const formTask = document.getElementById('form-task');

window.openTaskModal = function() {
    document.getElementById('form-task').reset();
    const select = document.getElementById('task-project');
    select.innerHTML = '';
    if (state.projects.length === 0) {
        const opt = document.createElement('option');
        opt.innerText = "Crie um projeto primeiro";
        select.appendChild(opt);
    } else {
        state.projects.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.innerText = p.title;
            select.appendChild(opt);
        });
    }
    document.getElementById('modal-task').classList.remove('hidden');
}

if (formTask) {
    formTask.addEventListener('submit', (e) => {
        e.preventDefault();
        const newTask = {
            id: 'task-' + Date.now(),
            title: document.getElementById('task-title').value,
            projectId: document.getElementById('task-project').value,
            description: document.getElementById('task-desc').value,
            status: document.getElementById('task-status').value
        };

        const newTasks = [...state.tasks, newTask];
        saveData(KEYS.TASKS, newTasks);
        closeModal('modal-task');
        renderTasks();
    });
}

window.moveTask = function(id, newStatus) {
    const newTasks = state.tasks.map(t => t.id === id ? {...t, status: newStatus} : t);
    saveData(KEYS.TASKS, newTasks);
    renderTasks();
}

window.deleteTask = function(id) {
    if(confirm('Excluir tarefa?')) {
        const newTasks = state.tasks.filter(t => t.id !== id);
        saveData(KEYS.TASKS, newTasks);
        renderTasks();
    }
}

// --- UTILITÁRIOS ---
window.closeModal = function(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

window.onclick = function(event) {
    if (event.target.classList.contains('bg-black/50')) {
        event.target.classList.add('hidden');
    }
}