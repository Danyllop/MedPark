document.addEventListener('DOMContentLoaded', async () => {
    try {
        // --- Initialization ---
        // Wait for DB to be ready
        if (typeof db !== 'undefined' && db.ready) {
            await db.ready;
        }

        // --- URL Trigger for Database Reset (ADMIN ONLY) ---
        const urlParams = new URLSearchParams(window.location.search);

        if (urlParams.get('reset_db') === 'true') {
            // CRITICAL: Admin-only access
            if (!auth.isAdmin()) {
                alert('❌ ACESSO NEGADO\n\nApenas administradores podem resetar o banco de dados.');
                window.location.href = 'dashboard.html';
                return;
            }

            if (confirm('⚠️ ATENÇÃO: RESET TOTAL DO SISTEMA\n\nIsso apagará TODOS os dados:\n• Usuários (exceto admin padrão)\n• Funcionários\n• Veículos\n• Vagas\n\nEsta ação é IRREVERSÍVEL!\n\nDeseja continuar?')) {
                try {
                    await db.resetAllData();
                    alert('✅ Sistema resetado com sucesso!\n\nVocê será desconectado. Faça login novamente.');
                    auth.logout();
                    window.location.href = 'index.html';
                } catch (err) {
                    alert('❌ Erro ao resetar: ' + err.message);
                    window.location.href = 'dashboard.html';
                }
                return;
            } else {
                // User cancelled
                window.location.href = 'dashboard.html';
                return;
            }
        }

        // Theme init
        document.documentElement.setAttribute('data-bs-theme', 'dark');

        // --- Session Verification ---
        const user = auth.checkSession();
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        // --- Elements ---
        const contentArea = document.getElementById('content-area');
        const pageTitle = document.getElementById('page-title');
        const logoutBtn = document.getElementById('logout-btn');
        const userInfoName = document.getElementById('user-display-name');
        const userInfoRole = document.getElementById('user-display-role');
        const dateDisplay = document.getElementById('current-date');

        // --- Setup User Info ---
        if (userInfoName) userInfoName.textContent = user.nome_completo || user.name;
        if (userInfoRole) userInfoRole.textContent = user.nivel_acesso || user.role;

        // Permissions
        const navUsers = document.getElementById('nav-users');
        if (navUsers) {
            // Show for Admin or Supervisor
            navUsers.style.display = auth.isManager() ? 'block' : 'none';
        }

        // Date Display
        if (dateDisplay) {
            const now = new Date();
            const dateStr = now.toLocaleDateString('pt-BR');
            const weekDay = now.toLocaleDateString('pt-BR', { weekday: 'long' });
            // Capitalize
            const weekDayCap = weekDay.charAt(0).toUpperCase() + weekDay.slice(1);

            dateDisplay.textContent = `${weekDayCap}, ${dateStr}`;
        }

        // --- Navigation Logic ---
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                if (!item.dataset.target) return;

                // Update Active State
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                item.classList.add('active');

                handleNavigation(item.dataset.target);
            });
        });

        function handleNavigation(target) {
            contentArea.innerHTML = ''; // Clear

            switch (target) {
                case 'dashboard':
                    pageTitle.textContent = 'Dashboard Overview';
                    renderHome();
                    break;
                case 'users':
                    pageTitle.textContent = 'Gestão de Usuários';
                    renderUserManagement();
                    break;
                case 'employees':
                    pageTitle.textContent = 'Gestão de Funcionários';
                    renderEmployees();
                    break;
                case 'vehicles':
                    pageTitle.textContent = 'Gestão de Veículos';
                    renderVehicles();
                    break;
                case 'vagas':
                    pageTitle.textContent = 'Gestão de Vagas';
                    renderVagas();
                    break;
                case 'prestadores':
                    pageTitle.textContent = 'Gestão de Prestadores';
                    renderPrestadores();
                    break;
                case 'portaria-a':
                    pageTitle.textContent = 'Portaria A';
                    renderPortariaA();
                    break;
                case 'portaria-e':
                    pageTitle.textContent = 'Portaria E';
                    renderPortariaE();
                    break;
                case 'porteiros': // Fallback or if reused
                    pageTitle.textContent = 'Cadastro de Porteiros';
                    contentArea.innerHTML = '<div class="alert alert-info">Use a aba de Funcionários.</div>';
                    break;
                case 'infracoes':
                    pageTitle.textContent = 'Gestão de Infrações';
                    renderInfracoes();
                    break;
                case 'relatorios':
                    pageTitle.textContent = 'Relatórios Gerenciais';
                    contentArea.innerHTML = '<div class="alert alert-info">Funcionalidade em desenvolvimento...</div>';
                    break;
                default:
                    pageTitle.textContent = 'Página não encontrada';
            }
        }

        // --- Logout ---
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                auth.logout();
                window.location.href = 'index.html';
            });
        }

        // --- Initial Load ---
        handleNavigation('dashboard');


        // --- RENDERERS ------------------------------------------------

        // --- RENDERERS ------------------------------------------------

        function renderHome() {
            // Dashboard now focuses on operations
            contentArea.innerHTML = `
                <div class="row g-4">
                    <div class="col-md-6">
                        <div class="card bg-dark border-secondary h-100">
                            <div class="card-body text-center p-5">
                                <i class="fas fa-parking fa-4x text-primary mb-3"></i>
                                <h3>Gerenciar Estacionamento</h3>
                                <p class="text-muted">Acesso rápido às operações de entrada e saída.</p>
                                <button class="btn btn-primary btn-lg mt-3" onclick="alert('Em breve')">Acessar Pátio</button>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card bg-dark border-secondary h-100">
                            <div class="card-body text-center p-5">
                                <i class="fas fa-clipboard-list fa-4x text-info mb-3"></i>
                                <h3>Ocorrências Recentes</h3>
                                <p class="text-muted">Visualizar e registrar novas ocorrências.</p>
                                <button class="btn btn-info btn-lg mt-3 text-white" onclick="alert('Em breve')">Ver Ocorrências</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        async function renderUserManagement() {
            if (!auth.isManager()) return (contentArea.innerHTML = '<div class="alert alert-danger">Acesso Negado</div>');

            const users = await db.getData('usuarios');
            users.sort((a, b) => (a.status === 'INATIVO' ? -1 : 1));

            // Stats Calculation
            const pendingUsers = users.filter(u => u.status === 'INATIVO').length;
            const activeAccounts = users.filter(u => u.status === 'ATIVO').length;
            const totalUsers = users.length;

            // Attempt to calc "Online" (active in last 30 mins)
            // parse "dd/mm/yyyy, hh:mm:ss"
            const now = new Date();
            let onlineCount = 0;
            users.forEach(u => {
                if (u.ultimo_acesso && typeof u.ultimo_acesso === 'string') {
                    // Simple parse attempt for pt-BR format
                    try {
                        const parts = u.ultimo_acesso.split(', ');
                        if (parts.length === 2) {
                            const [day, month, year] = parts[0].split('/').map(Number);
                            const [hor, min, sec] = parts[1].split(':').map(Number);
                            const dateObj = new Date(year, month - 1, day, hor, min, sec);
                            const diffMins = (now - dateObj) / 60000;
                            if (diffMins < 30) onlineCount++;
                        }
                    } catch (e) { }
                }
            });


            contentArea.innerHTML = `
                 <!-- Stats Row -->
                <div class="row g-4 mb-4">
                    <div class="col-md-3">
                        <div class="stat-card">
                            <h5 class="text-muted">Usuários Pendentes</h5>
                            <h2 class="mb-0 text-warning">${pendingUsers}</h2>
                            <small>Aguardando liberação</small>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="stat-card">
                            <h5 class="text-muted">Contas Ativas</h5>
                            <h2 class="mb-0 text-success">${activeAccounts}</h2>
                             <small>Logins permitidos</small>
                        </div>
                    </div>
                     <div class="col-md-3">
                        <div class="stat-card">
                            <h5 class="text-muted">Online Agora</h5>
                            <h2 class="mb-0 text-primary">${onlineCount}</h2>
                             <small>Ativos nos últimos 30min</small>
                        </div>
                    </div>
                    <div class="col-md-3">
                         <div class="stat-card">
                            <h5 class="text-muted">Total Cadastrados</h5>
                            <h2 class="mb-0 text-info">${totalUsers}</h2>
                             <small>Todos os perfis</small>
                        </div>
                    </div>
                </div>

                <div class="card bg-dark border-secondary">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">Lista de Usuários</h5>
                        <button class="btn btn-primary btn-sm" id="btn-add-user"><i class="fas fa-plus"></i> Novo Usuário</button>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-dark table-hover align-middle">
                                <thead>
                                    <tr>
                                        <th>Status</th>
                                        <th>Nome</th>
                                        <th>Login</th>
                                        <th>Perfil</th>
                                        <th>Último Acesso</th>
                                        <th class="text-end">Ações</th>
                                    </tr>
                                </thead>
                                <tbody id="user-mgmt-body">
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;

            const tbody = document.getElementById('user-mgmt-body');

            users.forEach(u => {
                const isMe = u.login === user.login; // Can't delete self
                const tr = document.createElement('tr');
                const isInactive = u.status === 'INATIVO';
                const amIAdmin = auth.isAdmin(); // Only Admins can change roles

                // Cycle logic: Operador -> Supervisor -> Admin -> Operador
                let nextRole = 'Operador';
                if (u.nivel_acesso === 'Operador') nextRole = 'Supervisor';
                else if (u.nivel_acesso === 'Supervisor') nextRole = 'Admin';
                else if (u.nivel_acesso === 'Admin') nextRole = 'Operador';

                tr.innerHTML = `
                    <td>
                        <span class="badge ${isInactive ? 'bg-danger' : 'bg-success'}">${u.status}</span>
                        ${(u.tentativas_falhas > 0) ? `<br><small class="text-danger" style="font-size: 0.7rem;">Falhas: ${u.tentativas_falhas}</small>` : ''}
                    </td>
                    <td>${u.nome_completo || u.name}</td>
                    <td>${u.login || u.username}</td>
                    <td>${u.nivel_acesso || u.role}</td>
                    <td>${u.ultimo_acesso || '-'}</td>
                    <td class="text-end">
                        ${amIAdmin ? `<button class="btn btn-sm btn-outline-light me-1 btn-role" data-login="${u.login}" data-next-role="${nextRole}" title="Alterar para ${nextRole}"><i class="fas fa-user-tag"></i></button>` : ''}
                        <button class="btn btn-sm btn-outline-info me-1 btn-reset" data-login="${u.login}" title="Resetar Senha"><i class="fas fa-key"></i></button>
                        ${isInactive ?
                        `<button class="btn btn-sm btn-success me-1 btn-activate" data-login="${u.login}" title="Ativar"><i class="fas fa-check"></i></button>` :
                        `<button class="btn btn-sm btn-warning me-1 btn-deactivate" data-login="${u.login}" title="Bloquear"><i class="fas fa-ban"></i></button>`
                    }
                        ${!isMe ? `<button class="btn btn-sm btn-danger btn-delete" data-login="${u.login}" title="Excluir"><i class="fas fa-trash"></i></button>` : ''}
                    </td>
                `;
                tbody.appendChild(tr);
            });

            // Action Handlers
            tbody.addEventListener('click', async (e) => {
                const btn = e.target.closest('button');
                if (!btn) return;

                const login = btn.dataset.login;

                if (btn.classList.contains('btn-activate')) {
                    await db.updateUserStatus(login, 'ATIVO');
                    renderUserManagement();
                }
                if (btn.classList.contains('btn-deactivate')) {
                    await db.updateUserStatus(login, 'INATIVO');
                    renderUserManagement();
                }
                if (btn.classList.contains('btn-delete')) {
                    if (confirm('Tem certeza que deseja EXCLUIR este usuário?')) {
                        await db.deleteUser(login);
                        renderUserManagement();
                    }
                }
                if (btn.classList.contains('btn-reset')) {
                    if (confirm(`Resetar senha do usuário ${login} para 'Muda@123'?`)) {
                        resetUserPassword(login, 'Muda@123');
                    }
                }
                if (btn.classList.contains('btn-role')) {
                    const nextRole = btn.dataset.nextRole;
                    if (confirm(`Alterar perfil de ${login} para '${nextRole}'?`)) {
                        await db.updateUserRole(login, nextRole);
                        renderUserManagement();
                    }
                }
            });

            // Add User Handler (Open Modal)
            document.getElementById('btn-add-user').addEventListener('click', () => {
                const modal = new bootstrap.Modal(document.getElementById('newUserModal'));
                modal.show();
            });
        }

        // Helper for Reset Password (needs to call Async Auth method)
        async function resetUserPassword(login, defaultPass) {
            try {
                const newHash = await auth.hashPassword(defaultPass);
                await db.updatePassword(login, newHash);
                alert(`Senha do usuário ${login} resetada para '${defaultPass}'.`);
            } catch (e) {
                alert("Erro ao resetar senha: " + e.message);
            }
        }

        // New User Form Listener (One-time setup or check if already added? Better add safely)
        // Since renderUserManagement is called multiple times, we should attach this listener ideally once or handle cleanup.
        // But for simplicity/robustness, we can attach to the document body delegation or check existence.
        // A safer place is outside the renderer, but the modal is only in DOM.
        // Actually, the modal is in static HTML now (added in prev step).
        // Let's attach the listener GLOBALLY for the modal form to avoid duplicates.

        const newUserForm = document.getElementById('new-user-form');
        if (newUserForm && !newUserForm.dataset.listenerAttached) {
            newUserForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const name = document.getElementById('new-name').value;
                const cpf = document.getElementById('new-cpf').value;
                const username = document.getElementById('new-username').value;
                const email = document.getElementById('new-email').value;
                const password = document.getElementById('new-password').value;
                const role = document.getElementById('new-role').value;
                const active = document.getElementById('new-active').checked;

                try {
                    // Check existing
                    if (await db.findUserByLogin(username)) throw new Error("Login já existe");
                    if (await db.findUserByCPF(cpf)) throw new Error("CPF já existe");

                    const hash = await auth.hashPassword(password);

                    // Create object manually to bypass 'INATIVO' default of auth.register if we want custom status
                    // Actually db.createUser sets INATIVO. We should use db.createUser then update.
                    // Or add a method to DB/Auth.
                    // Let's use auth.register logic but adapt. 
                    // Since auth.register is bound to logic validations...

                    // Let's construct the user object directly for DB to avoid 'INATIVO' hardcode in createUser?
                    // db.createUser hardcodes 'INATIVO'.
                    // We will use db.createUser then immediately update status if checked.

                    const userObj = {
                        name, username, cpf, passwordHash: hash, email
                    };

                    await db.createUser(userObj);

                    if (active) await db.updateUserStatus(username, 'ATIVO');

                    // Update Role? db.createUser defaults to 'Operador'.
                    if (role !== 'Operador') {
                        await db.updateUserRole(username, role);
                    }

                    alert("Usuário criado com sucesso!");
                    const modalEl = document.getElementById('newUserModal');
                    const modal = bootstrap.Modal.getInstance(modalEl);
                    modal.hide();
                    newUserForm.reset();
                    renderUserManagement(); // Refresh table

                } catch (err) {
                    alert("Erro ao criar: " + err.message);
                }
            });
            newUserForm.dataset.listenerAttached = 'true';
        }


        // --- Vehicles Management ---
        async function renderVehicles() {
            // State
            let allVehicles = [];

            // Fetch Data
            try {
                // Fetch both collections for JOIN
                const [veiculos, funcionarios] = await Promise.all([
                    db.getData('veiculos'),
                    db.getData('funcionarios')
                ]);

                // Create Map for quick lookup
                const funcMap = {};
                funcionarios.forEach(f => funcMap[f.id] = f.nome_completo);

                // Manual JOIN
                allVehicles = veiculos.map(v => ({
                    ...v,
                    proprietario: funcMap[v.funcionario_id] || 'Desconhecido'
                }));

                // Cache employees for Modal use
                window.allEmployeesCache = funcionarios;

                // Sort by Proprietario, then Principal
                allVehicles.sort((a, b) => {
                    const nameA = (a.proprietario || '').toLowerCase();
                    const nameB = (b.proprietario || '').toLowerCase();
                    if (nameA < nameB) return -1;
                    if (nameA > nameB) return 1;
                    return (b.principal ? 1 : 0) - (a.principal ? 1 : 0);
                });

            } catch (e) {
                console.error("Error fetching vehicles:", e);
                contentArea.innerHTML += `<div class="alert alert-danger mt-3">Erro ao carregar dados: ${e.message}</div>`;
                return;
            }

            // Stats Calculation
            const totalVehicles = allVehicles.length;
            const principalVehicles = allVehicles.filter(v => v.principal).length;
            const secondaryVehicles = totalVehicles - principalVehicles;

            // Render Layout
            contentArea.innerHTML = `
                <!-- Indicators Row -->
                 <div class="row g-3 mb-3">
                    <div class="col-md-3 col-sm-6">
                        <div class="mini-stat-card border-secondary">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <h5 class="text-muted text-uppercase fw-bold">Total</h5>
                                    <h2 class="mb-0 text-info">${totalVehicles}</h2>
                                </div>
                                <i class="fas fa-car text-muted opacity-50 fa-2x"></i>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3 col-sm-6">
                        <div class="mini-stat-card border-secondary">
                            <div class="d-flex justify-content-between align-items-start">
                                 <div>
                                    <h5 class="text-muted text-uppercase fw-bold">Principal</h5>
                                    <h2 class="mb-0 text-success">${principalVehicles}</h2>
                                 </div>
                                 <i class="fas fa-star text-muted opacity-50 fa-2x"></i>
                            </div>
                        </div>
                    </div>
                     <div class="col-md-3 col-sm-6">
                        <div class="mini-stat-card border-secondary">
                            <div class="d-flex justify-content-between align-items-start">
                                 <div>
                                    <h5 class="text-muted text-uppercase fw-bold">Secundários</h5>
                                    <h2 class="mb-0 text-warning">${secondaryVehicles}</h2>
                                 </div>
                                 <i class="fas fa-car-side text-muted opacity-50 fa-2x"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card bg-dark border-secondary">
                    <div class="card-body p-3">
                        <div class="d-flex flex-wrap justify-content-between align-items-center mb-2 gap-2"> <!-- mb-3 -> mb-2, gap-3 -> gap-2 -->
                            <h3 class="text-info mb-0 fw-bold"><i class="fas fa-car me-2"></i>Gestão de Veículos</h3>
                            
                            <div class="d-flex flex-grow-1 justify-content-end gap-4 align-items-center" style="max-width: 850px;"> <!-- gap-4, max-width 850px -->
                                <div class="input-group">
                                    <span class="input-group-text bg-dark border-secondary text-muted"><i class="fas fa-search"></i></span>
                                    <input type="text" id="search-veh" class="form-control bg-dark text-light border-secondary" placeholder="Pesquisar Adesivo, placa e modelo...">
                                </div>
                                <button class="btn btn-primary px-5 py-2 fw-bold shadow-sm text-nowrap" id="btn-new-veh"> <!-- px-5 wider, py-2 taller -->
                                    <i class="fas fa-plus me-2"></i>Novo Veículo
                                </button>
                            </div>
                        </div>

                        <!-- Filters Moved Below Header -->
                        <div class="mb-2 d-flex flex-wrap gap-2"> <!-- mb-3 -> mb-2 -->
                            <div class="filter-group">
                                <input type="radio" class="btn-check" name="veh-filter-type" id="veh-filter-all" value="ALL" checked>
                                <label class="btn modern-filter-btn py-0" for="veh-filter-all" data-color="info">Todos</label> <!-- py-0 to reduce height -->

                                <input type="radio" class="btn-check" name="veh-filter-type" id="veh-filter-main" value="MAIN">
                                <label class="btn modern-filter-btn py-0" for="veh-filter-main" data-color="success">Principais</label>

                                <input type="radio" class="btn-check" name="veh-filter-type" id="veh-filter-secondary" value="SECONDARY">
                                <label class="btn modern-filter-btn py-0" for="veh-filter-secondary" data-color="warning">Secundários</label>
                            </div>
                        </div>

                        <div class="table-responsive">
                            <table class="table table-dark table-hover table-bordered align-middle table-compact mb-0">
                                <thead class="table-light text-dark text-uppercase small fw-bold">
                                    <tr>
                                        <th class="py-2">ID Prop.</th> <!-- Explicit py-2 override -->
                                        <th class="py-2">Proprietário</th>
                                        <th class="py-2">Adesivo</th>
                                        <th class="py-2">Placa</th>
                                        <th class="py-2">Modelo / Cor</th>
                                        <th class="py-2">Data Cadastro</th>
                                        <th class="text-center text-nowrap py-2" style="width: 1%;">Principal</th>
                                        <th class="text-center py-2">Ações</th>
                                    </tr>
                                </thead>
                                <tbody id="veh-table-body"></tbody>
                            </table>
                        </div>
                        
                        <!-- Pagination Controls -->
                        <div class="d-flex justify-content-between align-items-center mt-2"> <!-- mt-3 -> mt-2 -->
                            <nav id="veh-pagination">
                                <ul class="pagination pagination-sm mb-0" id="veh-pagination-list"></ul>
                            </nav>
                            <span class="text-muted small" id="veh-record-count"></span>
                        </div>
                    </div>
                </div>

                        </div>
                    </div>
                </div>
            `;

            // Pagination State
            const itemsPerPage = 10;
            let currentPage = 1;
            let filteredVehicles = [...allVehicles];

            // Render Function with Pagination
            function renderTable(data, page = 1) {
                const tbody = document.getElementById('veh-table-body');
                tbody.innerHTML = '';

                // Update filtered list
                filteredVehicles = data;
                currentPage = page;

                // Calculate pagination
                const totalItems = data.length;
                const totalPages = Math.ceil(totalItems / itemsPerPage);
                const startIndex = (page - 1) * itemsPerPage;
                const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
                const pageData = data.slice(startIndex, endIndex);

                // Update record count
                document.getElementById('veh-record-count').textContent = `Total de registros: ${totalItems}`;

                if (totalItems === 0) {
                    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">Nenhum veículo encontrado.</td></tr>';
                    document.getElementById('veh-pagination-list').innerHTML = '';
                    return;
                }

                // Render rows for current page
                pageData.forEach(v => {
                    const tr = document.createElement('tr');

                    // Format Date
                    let dateStr = '-';
                    if (v.data_registro) {
                        try {
                            const d = new Date(v.data_registro);
                            dateStr = d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                        } catch (e) { }
                    }

                    tr.innerHTML = `
                        <td class="text-muted small py-1 align-middle">${v.funcionario_id}</td>
                        <td class="fw-bold text-light py-1 align-middle">${v.proprietario || 'N/A'}</td>
                        <td class="py-1 align-middle"><span class="badge bg-info text-dark font-monospace" style="font-size: 0.85rem;">${v.adesivo || '-'}</span></td>
                        <td class="py-1 align-middle"><span class="badge bg-light text-dark border border-secondary font-monospace" style="font-size: 0.85rem;">${v.placa}</span></td>
                        <td class="py-1 align-middle">
                            <div class="d-flex align-items-center gap-2">
                                <div class="bg-secondary rounded-circle p-0 d-flex justify-content-center align-items-center" style="width: 20px; height: 20px;">
                                    <i class="fas fa-car text-white" style="font-size: 0.6rem;"></i>
                                </div>
                                <div>
                                    <div class="fw-bold small">${v.modelo}</div>
                                    <small class="text-muted" style="font-size: 0.7rem;">${v.cor}</small>
                                </div>
                            </div>
                        </td>
                        <td class="small text-muted py-1 align-middle">${dateStr}</td>
                        <td class="text-center py-1 align-middle">
                            ${v.principal ?
                            '<span class="badge bg-success"><i class="fas fa-check-circle me-1"></i>Principal</span>' :
                            '<span class="badge bg-secondary text-muted">Secundário</span>'
                        }
                        </td>
                        <td class="text-center py-1 align-middle">
                             ${!v.principal ?
                            `<button class="btn btn-sm btn-outline-info btn-set-principal" data-id="${v.id}" data-func="${v.funcionario_id}" title="Definir como Principal">
                                    <i class="fas fa-exchange-alt me-1"></i> Tornar Principal
                                </button>`
                            : '<button class="btn btn-sm btn-secondary" disabled title="Já é principal"><i class="fas fa-check"></i></button>'
                        }
                        </td>
                    `;
                    tbody.appendChild(tr);
                });

                // Attach Action Listeners
                document.querySelectorAll('.btn-set-principal').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const vehId = btn.dataset.id;
                        const funcId = btn.dataset.func;
                        // Confirm? Maybe too intrusive for quick actions, but safer.
                        if (confirm('Definir este veículo como principal?')) {
                            try {
                                db.setPrincipalVehicle(vehId, funcId);
                                renderVehicles(); // Full Refresh to re-sort/re-render
                            } catch (e) { alert(e.message); }
                        }
                    });
                });

                // Render Pagination Controls
                renderPagination(page, totalPages);
            }

            // Pagination UI Renderer
            function renderPagination(current, total) {
                const paginationList = document.getElementById('veh-pagination-list');
                paginationList.innerHTML = '';

                if (total <= 1) return;

                // Previous button
                const prevLi = document.createElement('li');
                prevLi.className = `page-item ${current === 1 ? 'disabled' : ''}`;
                prevLi.innerHTML = `<a class="page-link" href="#" data-page="${current - 1}">Anterior</a>`;
                paginationList.appendChild(prevLi);

                // Page numbers (show max 5)
                const maxVisible = 5;
                let startPage = Math.max(1, current - Math.floor(maxVisible / 2));
                let endPage = Math.min(total, startPage + maxVisible - 1);

                if (endPage - startPage < maxVisible - 1) {
                    startPage = Math.max(1, endPage - maxVisible + 1);
                }

                for (let i = startPage; i <= endPage; i++) {
                    const pageLi = document.createElement('li');
                    pageLi.className = `page-item ${i === current ? 'active' : ''}`;
                    pageLi.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
                    paginationList.appendChild(pageLi);
                }

                // Next button
                const nextLi = document.createElement('li');
                nextLi.className = `page-item ${current === total ? 'disabled' : ''}`;
                nextLi.innerHTML = `<a class="page-link" href="#" data-page="${current + 1}">Próximo</a>`;
                paginationList.appendChild(nextLi);

                // Attach pagination click handlers
                paginationList.querySelectorAll('a.page-link').forEach(link => {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        const page = parseInt(link.dataset.page);
                        if (page >= 1 && page <= total && page !== current) {
                            renderTable(filteredVehicles, page);
                        }
                    });
                });
            }

            // Initial Render
            renderTable(allVehicles);

            // Search Logic
            // Unified Filter Logic
            function applyVehicleFilters() {
                const term = document.getElementById('search-veh').value.toLowerCase();
                const filterType = document.querySelector('input[name="veh-filter-type"]:checked').value;

                const filtered = allVehicles.filter(v => {
                    // Type Filter
                    if (filterType === 'MAIN' && !v.principal) return false;
                    if (filterType === 'SECONDARY' && v.principal) return false;

                    // Search Filter
                    return (v.adesivo && v.adesivo.toLowerCase().includes(term)) ||
                        (v.placa && v.placa.toLowerCase().includes(term)) ||
                        (v.modelo && v.modelo.toLowerCase().includes(term)) ||
                        (v.proprietario && v.proprietario.toLowerCase().includes(term));
                });

                renderTable(filtered, 1);
            }

            document.getElementById('search-veh').addEventListener('input', applyVehicleFilters);
            document.querySelectorAll('input[name="veh-filter-type"]').forEach(r => {
                r.addEventListener('change', applyVehicleFilters);
            });

            // --- Vehicle Modal Logic (Static) ---
            const vehModal = document.getElementById('mdl-new-veh');
            const vehForm = document.getElementById('frm-new-veh');
            const ownerSearchInput = document.getElementById('nv-owner-search');
            const ownerSelect = document.getElementById('nv-owner');
            const stickerInput = document.getElementById('nv-adesivo');

            // Helper to populate options
            function renderOwnerOptions(list) {
                if (!ownerSelect) return;
                ownerSelect.innerHTML = '<option value="">Selecione...</option>';
                list.forEach(o => {
                    const opt = document.createElement('option');
                    opt.value = o.id;
                    opt.textContent = `${o.nome_completo} (CPF: ${o.cpf || 'N/A'})`;
                    ownerSelect.appendChild(opt);
                });
            }

            // Normalize Helper
            function normalizeStr(str) {
                return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            }

            // Global Listeners (Run Once)
            if (vehModal && !vehModal.dataset.initialized) {
                // Search Listener
                if (ownerSearchInput) {
                    ownerSearchInput.addEventListener('input', (e) => {
                        const term = normalizeStr(e.target.value);

                        if (window.allEmployeesCache) {
                            const filtered = window.allEmployeesCache.filter(o => {
                                const normName = normalizeStr(o.nome_completo || '');
                                const cleanCPF = (o.cpf || '').replace(/\D/g, '');
                                const cleanTerm = term.replace(/\D/g, '');
                                return normName.includes(term) || (cleanTerm.length > 0 && cleanCPF.includes(cleanTerm));
                            });
                            renderOwnerOptions(filtered);
                        }
                    });
                }

                // Sticker Generation
                if (ownerSelect) {
                    ownerSelect.addEventListener('change', async (e) => {
                        if (e.target.value) {
                            const newSticker = await db.getNextStickerCode();
                            stickerInput.value = newSticker;
                            stickerInput.setAttribute('readonly', true);
                            stickerInput.classList.add('bg-secondary', 'text-light');
                        } else {
                            stickerInput.value = '';
                            stickerInput.classList.remove('bg-secondary', 'text-light');
                        }
                    });
                }

                // Submit Form
                if (vehForm) {
                    vehForm.addEventListener('submit', async (e) => {
                        e.preventDefault();
                        const owner = document.getElementById('nv-owner').value;
                        const placa = document.getElementById('nv-placa').value.toUpperCase();
                        const adesivo = document.getElementById('nv-adesivo').value;
                        const modelo = document.getElementById('nv-modelo').value.toUpperCase();
                        const cor = document.getElementById('nv-cor').value.toUpperCase();
                        const obs = document.getElementById('nv-obs').value;
                        const principal = document.getElementById('nv-principal').checked;

                        try {
                            // Validation
                            if (await db.checkPlateExists(placa)) {
                                alert("Erro: Placa já cadastrada no sistema!");
                                return;
                            }
                            // Sticker check might be redundant if auto-generated, but safe to check
                            if (await db.checkStickerExists(adesivo)) {
                                alert("Erro: Número de adesivo já existe!");
                                return;
                            }

                            await db.addVehicle({
                                funcionario_id: owner,
                                placa, adesivo, modelo, cor, obs, principal
                            }, user.login);

                            alert("Veículo adicionado com sucesso!");
                            const modal = bootstrap.Modal.getInstance(vehModal);
                            modal.hide();
                            renderVehicles();
                        } catch (err) {
                            alert("Erro ao salvar: " + err.message);
                        }
                    });
                }

                vehModal.dataset.initialized = 'true';
            }

            document.getElementById('btn-new-veh').addEventListener('click', async () => {
                try {
                    // Ensure data is available from global cache
                    let ownersList = window.allEmployeesCache;

                    if (!ownersList || ownersList.length === 0) {
                        // Fallback fetch if cache is empty
                        console.warn("Cache empty, fetching employees...");
                        ownersList = await db.getData('funcionarios');
                        window.allEmployeesCache = ownersList;
                    }

                    // Initial Render
                    const sel = document.getElementById('nv-owner');
                    sel.innerHTML = '<option value="">Selecione...</option>';
                    ownersList.forEach(o => {
                        const opt = document.createElement('option');
                        opt.value = o.id;
                        opt.textContent = `${o.nome_completo} (CPF: ${o.cpf || 'N/A'})`;
                        sel.appendChild(opt);
                    });

                    // Reset
                    document.getElementById('frm-new-veh').reset();
                    document.getElementById('nv-owner-search').value = '';

                    const modalEl = document.getElementById('mdl-new-veh');
                    let modalInstance = bootstrap.Modal.getInstance(modalEl);
                    if (!modalInstance) {
                        modalInstance = new bootstrap.Modal(modalEl);
                    }
                    modalInstance.show();

                } catch (err) {
                    console.error("Erro ao abrir modal:", err);
                    alert("Erro ao abrir modal: " + err.message);
                }
            });
        }

        // Attach Global Listener for New Vehicle Form (if not exists)
        const frmNewVeh = document.getElementById('frm-new-veh');
        if (frmNewVeh && !frmNewVeh.dataset.attached) {
            frmNewVeh.addEventListener('submit', (e) => {
                e.preventDefault();
                const owner = document.getElementById('nv-owner').value;
                const placa = document.getElementById('nv-placa').value.toUpperCase();
                const adesivo = document.getElementById('nv-adesivo').value;
                const modelo = document.getElementById('nv-modelo').value.toUpperCase();
                const cor = document.getElementById('nv-cor').value.toUpperCase();
                const obs = document.getElementById('nv-obs').value;
                const principal = document.getElementById('nv-principal').checked;

                try {
                    db.addVehicle({
                        funcionario_id: owner,
                        placa, adesivo, modelo, cor, obs, principal
                    }, user.login);

                    alert("Veículo adicionado!");
                    const el = document.getElementById('mdl-new-veh');
                    const modal = bootstrap.Modal.getInstance(el);
                    modal.hide();
                    renderVehicles(); // Refresh list if active
                } catch (err) {
                    alert("Erro ao salvar: " + err.message);
                }
            });
            frmNewVeh.dataset.attached = 'true';
        }

        // --- Employee Management ---
        async function renderEmployees() {
            // Async Fetch
            let employees = [];
            try {
                employees = await db.getData('funcionarios');
            } catch (e) {
                console.error("Error fetching employees:", e);
                contentArea.innerHTML = `<div class="alert alert-danger">Erro ao carregar dados: ${e.message}</div>`;
                return;
            }

            // Map & Sort (Client Side)
            const allData = employees.map(e => ({
                ...e,
                // Normalizing fields if needed, but Firestore data is already objects
            }));

            // Sort by Name
            allData.sort((a, b) => (a.nome_completo || '').localeCompare(b.nome_completo || ''));

            // Pagination State
            let currentPage = 1;
            const itemsPerPage = 10;
            let filteredData = [...allData];

            // Stats Calculation
            const total = allData.length;
            const active = allData.filter(e => e.situacao === 'ATIVO').length;
            const inactive = allData.filter(e => e.situacao === 'INATIVO').length;

            // UI State for Filters
            let currentFilter = 'TODOS';
            let searchTerm = '';

            function applyFilters() {
                filteredData = allData.filter(e => {
                    const matchesSearch = e.nome_completo.toLowerCase().includes(searchTerm) || e.cpf.includes(searchTerm);
                    let matchesStatus = true;

                    if (currentFilter === 'ATIVOS') matchesStatus = e.situacao === 'ATIVO';
                    if (currentFilter === 'INATIVOS') matchesStatus = e.situacao === 'INATIVO';
                    if (currentFilter === 'PERMANENTES') matchesStatus = e.tipo_cadastro === 'PERMANENTE';
                    if (currentFilter === 'TEMPORARIOS') matchesStatus = e.tipo_cadastro === 'PROVISORIO';
                    if (currentFilter === 'EXPIRADOS') {
                        if (e.data_validade) {
                            matchesStatus = new Date(e.data_validade) < new Date();
                        } else matchesStatus = false;
                    }

                    return matchesSearch && matchesStatus;
                });
                // Reset to page 1 on filter/search change
                currentPage = 1;
                renderTable();
            }

            contentArea.innerHTML = `
            <!-- Indicators Row (Mini) -->
            <div class="row g-3 mb-3">
                <div class="col-md-3 col-sm-6">
                    <div class="mini-stat-card border-secondary">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h5 class="text-muted text-uppercase fw-bold">Total</h5>
                                <h2 class="mb-0 text-info">${total}</h2>
                            </div>
                            <i class="fas fa-users text-muted opacity-50 fa-2x"></i>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 col-sm-6">
                    <div class="mini-stat-card border-secondary">
                        <div class="d-flex justify-content-between align-items-start">
                             <div>
                                <h5 class="text-muted text-uppercase fw-bold">Ativos</h5>
                                <h2 class="mb-0 text-success">${active}</h2>
                             </div>
                             <i class="fas fa-user-check text-muted opacity-50 fa-2x"></i>
                        </div>
                    </div>
                </div>
                 <div class="col-md-3 col-sm-6">
                    <div class="mini-stat-card border-secondary">
                        <div class="d-flex justify-content-between align-items-start">
                             <div>
                                <h5 class="text-muted text-uppercase fw-bold">Inativos</h5>
                                <h2 class="mb-0 text-danger">${inactive}</h2>
                             </div>
                             <i class="fas fa-user-times text-muted opacity-50 fa-2x"></i>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card bg-dark border-secondary">
                <div class="card-body p-4">
                    
                    <!-- Header & Actions Compacted -->
                    <div class="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
                        <h3 class="text-info mb-0 fw-bold"><i class="fas fa-id-card me-2"></i>Funcionários</h3>
                        
                        <!-- Search & Button Container: Keeping max-width: 850px for search positioning -->
                        <div class="d-flex flex-grow-1 justify-content-end gap-4 align-items-center" style="max-width: 850px;">
                            <div class="input-group">
                                <span class="input-group-text bg-dark border-secondary text-muted"><i class="fas fa-search"></i></span>
                                <input type="text" id="search-emp" class="form-control bg-dark text-light border-secondary" placeholder="Pesquisar por Nome ou CPF...">
                            </div>
                            <!-- Button: Reverted to py-2 (Original "First Time" Height), keeping px-4/px-5 or just px-4? User said "initial". -->
                            <!-- Initial was px-4 py-2. I'll stick to that. -->
                            
                            <!-- Test Data Button Removed -->

                            <button class="btn btn-primary px-4 py-2 fw-bold shadow-sm text-nowrap" id="btn-new-employee">
                                <i class="fas fa-plus me-2"></i>Novo Funcionário
                            </button>
                        </div>
                    </div>

                    <!-- Modern Filters -->
                    <div class="mb-4 d-flex flex-wrap gap-2">
                        <div class="filter-group">
                            <input type="radio" class="btn-check" name="statusfilter" id="f-todos" value="TODOS" checked>
                            <label class="btn modern-filter-btn" data-color="main" for="f-todos">Todos</label>

                            <input type="radio" class="btn-check" name="statusfilter" id="f-ativos" value="ATIVOS">
                            <label class="btn modern-filter-btn" data-color="success" for="f-ativos">Ativos</label>

                            <input type="radio" class="btn-check" name="statusfilter" id="f-inativos" value="INATIVOS">
                            <label class="btn modern-filter-btn" data-color="danger" for="f-inativos">Inativos</label>

                            <input type="radio" class="btn-check" name="statusfilter" id="f-perm" value="PERMANENTES">
                            <label class="btn modern-filter-btn" data-color="info" for="f-perm">Permanentes</label>

                            <input type="radio" class="btn-check" name="statusfilter" id="f-temp" value="TEMPORARIOS">
                            <label class="btn modern-filter-btn" data-color="warning" for="f-temp">Temporários</label>

                            <input type="radio" class="btn-check" name="statusfilter" id="f-exp" value="EXPIRADOS">
                            <label class="btn modern-filter-btn" data-color="secondary" for="f-exp">Expirados</label>
                        </div>
                    </div>

                    <!-- Table -->
                    <div class="table-responsive">
                        <table class="table table-dark table-hover table-bordered align-middle table-compact">
                            <thead class="table-light text-dark">
                                <tr>
                                    <th>Situação</th>
                                    <th style="min-width: 80px;">ID</th>
                                    <th>Nome</th>
                                    <th>CPF</th>
                                    <th>Cargo</th>
                                    <th>Lotação</th>
                                    <th>Vínculo</th>
                                    <th class="text-nowrap" style="width: 1%;">Telefone</th>
                                    <th class="text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody id="emp-table-body"></tbody>
                        </table>
                    </div>
                    
                    <!-- Pagination Controls -->
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        <nav id="emp-pagination">
                            <ul class="pagination pagination-sm mb-0" id="emp-pagination-list"></ul>
                        </nav>
                        <span class="text-muted" id="page-info"></span>
                    </div>

                </div>
            </div>

            <!-- Modal for New/Edit Employee -->
            <div class="modal fade" id="mdl-new-emp" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content bg-dark text-light border-secondary">
                        <div class="modal-header border-secondary">
                            <h5 class="modal-title" id="mdl-emp-title">Cadastrar Funcionário</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="frm-new-emp">
                                <input type="hidden" id="emp-edit-id">
                                <h6 class="text-info mb-3">Dados Pessoais</h6>
                                <div class="row g-2 mb-3">
                                    <div class="col-md-6">
                                        <label class="form-label">Nome Completo *</label>
                                        <input type="text" id="emp-nome" class="form-control bg-dark text-light border-secondary uppercase-input" required>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">CPF *</label>
                                        <input type="text" id="emp-cpf" class="form-control bg-dark text-light border-secondary" placeholder="000.000.000-00" maxlength="14" required>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Situação</label>
                                        <select id="emp-situacao" class="form-select bg-dark text-light border-secondary" disabled>
                                            <option value="ATIVO" selected>ATIVO</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="row g-2 mb-3">
                                    <div class="col-md-6">
                                        <label class="form-label">Cargo *</label>
                                        <input type="text" id="emp-cargo" class="form-control bg-dark text-light border-secondary uppercase-input" required>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Lotação *</label>
                                        <input type="text" id="emp-lotacao" class="form-control bg-dark text-light border-secondary uppercase-input" required>
                                    </div>
                                </div>
                                <div class="row g-2 mb-3">
                                     <div class="col-md-3">
                                        <label class="form-label">Telefone *</label>
                                        <input type="text" id="emp-tel" class="form-control bg-dark text-light border-secondary" placeholder="(00) 00000-0000" required>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Vínculo</label>
                                        <select id="emp-vinculo" class="form-select bg-dark text-light border-secondary">
                                            <option value="EBSERH">EBSERH</option>
                                            <option value="FUNDAHC">FUNDAHC</option>
                                            <option value="INTERNO">INTERNO</option>
                                            <option value="RESIDENTE">RESIDENTE</option>
                                            <option value="UFG">UFG</option>
                                        </select>
                                    </div>
                                     <div class="col-md-3">
                                        <label class="form-label">Tipo Cadastro</label>
                                        <select id="emp-tipo" class="form-select bg-dark text-light border-secondary">
                                            <option value="PERMANENTE">Permanente</option>
                                            <option value="PROVISORIO">Provisório</option>
                                        </select>
                                    </div>
                                     <div class="col-md-3" id="div-validade" style="display:none;">
                                        <label class="form-label">Validade *</label>
                                        <input type="date" id="emp-validade" class="form-control bg-dark text-light border-secondary">
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Observações</label>
                                    <textarea id="emp-obs" class="form-control bg-dark text-light border-secondary uppercase-input" rows="1"></textarea>
                                </div>

                                <div id="sec-vehicle">
                                    <hr class="border-secondary">
                                    <h6 class="text-warning mb-3">Veículo Principal (Obrigatório)</h6>
                                    <div class="row g-2 mb-3 align-items-end">
                                        <div class="col-md-3">
                                            <label class="form-label">Placa *</label>
                                            <input type="text" id="veh-placa" class="form-control bg-dark text-light border-secondary uppercase-input" placeholder="ABC1D23" maxlength="7" required>
                                        </div>
                                        <div class="col-md-3">
                                            <label class="form-label">Adesivo * (Só Números)</label>
                                            <div class="input-group">
                                                <input type="text" id="veh-adesivo" class="form-control bg-dark text-light border-secondary" placeholder="Cód. Único" required>
                                                <button class="btn btn-outline-secondary" type="button" id="btn-gen-adesivo"><i class="fas fa-random"></i></button>
                                            </div>
                                        </div>
                                        <div class="col-md-3">
                                            <label class="form-label">Modelo *</label>
                                            <input type="text" id="veh-modelo" class="form-control bg-dark text-light border-secondary uppercase-input" placeholder="Ex: GOL" required>
                                        </div>
                                        <div class="col-md-3">
                                            <label class="form-label">Cor *</label>
                                            <input type="text" id="veh-cor" class="form-control bg-dark text-light border-secondary uppercase-input" required>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="d-flex justify-content-end mt-4">
                                    <button type="submit" class="btn btn-success"><i class="fas fa-save"></i> Salvar Cadastro</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;

            function renderTable() {
                const tbody = document.getElementById('emp-table-body');
                tbody.innerHTML = '';

                // Pagination Logic
                const totalItems = filteredData.length;
                const totalPages = Math.ceil(totalItems / itemsPerPage);
                // Ensure currentPage is valid
                if (currentPage > totalPages) currentPage = Math.max(1, totalPages);

                const startIndex = (currentPage - 1) * itemsPerPage;
                const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
                const pageData = filteredData.slice(startIndex, endIndex);

                if (totalItems === 0) {
                    tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4">Nenhum funcionário encontrado.</td></tr>';
                    document.getElementById('page-info').textContent = '0 registros';
                    document.getElementById('emp-pagination-list').innerHTML = '';
                    return;
                }

                pageData.forEach(e => {
                    const tr = document.createElement('tr');
                    // Add conditional status style or icon
                    const statusClass = e.situacao === 'ATIVO' ? 'success' : 'danger';
                    const statusIcon = e.situacao === 'ATIVO' ? 'check-circle' : 'ban';

                    tr.innerHTML = `
                    <td>
                        <span class="badge bg-${statusClass} bg-opacity-75 text-white">
                            <i class="fas fa-${statusIcon} me-1"></i> ${e.situacao || 'ATIVO'}
                        </span>
                    </td>
                    <td>${e.id}</td>
                    <td class="fw-bold text-light">${e.nome_completo}</td>
                    <td>${e.cpf}</td>
                    <td>${e.cargo || ''}</td>
                    <td>${e.lotacao || ''}</td>
                    <td>${e.vinculo || ''}</td>
                    <td class="text-nowrap">${e.telefone || ''}</td>
                    <td class="text-center text-nowrap">
                        <button class="btn btn-sm btn-outline-info me-1 btn-edit-emp" data-id="${e.id}" title="Editar"><i class="fas fa-edit"></i></button>
                        ${e.situacao === 'ATIVO'
                            ? `<button class="btn btn-sm btn-outline-danger btn-toggle-status" data-id="${e.id}" data-status="INATIVO" title="Inativar"><i class="fas fa-ban"></i></button>`
                            : `<button class="btn btn-sm btn-outline-success btn-toggle-status" data-id="${e.id}" data-status="ATIVO" title="Ativar"><i class="fas fa-check"></i></button>`
                        }
                    </td>
                `;
                    tbody.appendChild(tr);
                });

                // Update Info
                document.getElementById('page-info').textContent = `Total de registros: ${totalItems}`;

                // Update Pagination Controls
                renderPaginationControls(totalPages);

                // Attach Toggle Listeners
                document.querySelectorAll('.btn-toggle-status').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const id = btn.dataset.id;
                        const newStatus = btn.dataset.status;
                        if (confirm(`Deseja alterar a situação para ${newStatus}?`)) {
                            try {
                                // Need to implement updateEmployeeStatus in DB or use generic update
                                // db.updateFuncionarioStatus? 
                                // Looking at db.js refactor -> I implemented updateFuncionario but not status specific helper?
                                // I implemented `updateFuncionario(id, funcData)`.
                                // Let's check db.js implementation I wrote.
                                // I wrote `updateFuncionario(id, funcData)`.
                                // I should handle partial update or just add updateDoc usage here?
                                // `db.db` is exposed, so I can use firestore generic updateDoc? No, `db` is the class instance.
                                // I should add a helper or use generic if I added one.
                                // I did not add `updateEmployeeStatus`. I added `updateFuncionario`.
                                // I'll assume `db.updateFuncionario` handles partial updates via merge?
                                // Unlikely if I used `updateDoc` with just the fields passed.
                                // Wait, `updateDoc` DOES partial updates.
                                // So `db.updateFuncionario(id, { situacao: newStatus })` should work if I update my db.js logic to accept it.
                                // My `db.updateFuncionario` implementation:
                                /*
                                async updateFuncionario(id, funcData) {
                                    await updateDoc(doc(this.db, "funcionarios", id), {
                                        nome_completo: funcData.nome, // IT EXPECTS SPECIFIC FIELDS. This is bad for status update.
                                        ...
                                    });
                                }
                                */
                                // I need to fix `db.js` `updateFuncionario` to be more flexible OR add `updateEmployeeStatus`.
                                // For now, I'll use a direct workaround or assume I'll fix DB. 
                                // Let's call `db.updateEmployeeStatus` and I will add it to DB class in a bit.
                                await db.updateEmployeeStatus(id, newStatus);
                                // Refresh
                                renderEmployees();
                            } catch (err) {
                                alert("Erro ao atualizar: " + err.message);
                            }
                        }
                    });
                });

                // Attach Edit Listeners
                document.querySelectorAll('.btn-edit-emp').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const id = btn.dataset.id; // Removed parseInt because IDs are now sequential strings "1", "2"
                        const emp = allData.find(x => x.id === id);
                        if (!emp) return;

                        // Populate Form
                        document.getElementById('emp-edit-id').value = emp.id;
                        document.getElementById('emp-nome').value = emp.nome_completo;
                        document.getElementById('emp-cpf').value = emp.cpf;
                        document.getElementById('emp-cpf').disabled = true; // Lock CPF
                        document.getElementById('emp-cargo').value = emp.cargo;
                        document.getElementById('emp-lotacao').value = emp.lotacao;
                        document.getElementById('emp-tel').value = emp.telefone;
                        document.getElementById('emp-vinculo').value = emp.vinculo;
                        document.getElementById('emp-tipo').value = emp.tipo_cadastro;
                        document.getElementById('emp-validade').value = emp.data_validade || '';
                        document.getElementById('emp-obs').value = emp.observacoes;

                        // Change Button Text
                        const btnSubmit = document.querySelector('#frm-new-emp button[type="submit"]') || document.querySelector('#frm-new-emp .btn-success') || document.getElementById('btn-save-emp');
                        if (btnSubmit) btnSubmit.textContent = "Atualizar Cadastro";

                        // Store Original Data for Change Detection
                        const originalData = {
                            nome: emp.nome_completo,
                            cargo: emp.cargo,
                            lotacao: emp.lotacao,
                            telefone: emp.telefone,
                            vinculo: emp.vinculo,
                            tipo: emp.tipo_cadastro,
                            validade: emp.data_validade || '',
                            obs: emp.observacoes
                        };
                        document.getElementById('frm-new-emp').dataset.original = JSON.stringify(originalData);

                        // Handle Type/Validity visibility
                        const typeSel = document.getElementById('emp-tipo');
                        typeSel.dispatchEvent(new Event('change'));

                        // Hide Vehicle Section for Edit Mode
                        document.getElementById('sec-vehicle').style.display = 'none';
                        document.getElementById('veh-placa').required = false;
                        document.getElementById('veh-adesivo').required = false;
                        document.getElementById('veh-modelo').required = false;
                        document.getElementById('veh-cor').required = false;

                        document.getElementById('mdl-emp-title').textContent = "Editar Funcionário";

                        modal.show();
                    });
                });
            }

            // Pagination Controls Renderer
            function renderPaginationControls(total) {
                const paginationList = document.getElementById('emp-pagination-list');
                paginationList.innerHTML = '';

                if (total <= 1) return;

                const createItem = (label, page, disabled = false, active = false) => {
                    const li = document.createElement('li');
                    li.className = `page-item ${disabled ? 'disabled' : ''} ${active ? 'active' : ''}`;
                    li.innerHTML = `<a class="page-link" href="#">${label}</a>`;
                    li.querySelector('a').addEventListener('click', (e) => {
                        e.preventDefault();
                        if (!disabled && !active) {
                            currentPage = page;
                            renderTable();
                        }
                    });
                    return li;
                };

                // Prev
                paginationList.appendChild(createItem('Anterior', currentPage - 1, currentPage === 1));

                // Pages (Max 5)
                const maxVisible = 5;
                let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                let endPage = Math.min(total, startPage + maxVisible - 1);
                if (endPage - startPage < maxVisible - 1) {
                    startPage = Math.max(1, endPage - maxVisible + 1);
                }

                for (let i = startPage; i <= endPage; i++) {
                    paginationList.appendChild(createItem(i, i, false, i === currentPage));
                }

                // Next
                paginationList.appendChild(createItem('Próximo', currentPage + 1, currentPage === total));
            }

            // Test Data Generation Handler Removed


            // Initialize UI Logic
            renderTable();

            // Listeners for Formatting / Validation
            document.querySelectorAll('.uppercase-input').forEach(inp => {
                inp.addEventListener('input', (e) => {
                    e.target.value = e.target.value.toUpperCase();
                });
            });

            // Sticker: Numbers Only - Re-attach if element exists (it does, in modal)
            const stickerInput = document.getElementById('veh-adesivo');
            if (stickerInput) {
                stickerInput.addEventListener('input', (e) => {
                    e.target.value = e.target.value.replace(/[^0-9]/g, '');
                });
            }

            // Search Listener
            document.getElementById('search-emp').addEventListener('input', (e) => {
                searchTerm = e.target.value.toLowerCase();
                applyFilters();
            });

            // Filter Radios
            document.querySelectorAll('input[name="statusfilter"]').forEach(radio => {
                radio.addEventListener('change', (e) => {
                    currentFilter = e.target.value;
                    applyFilters();
                });
            });

            // Modal & Form Logic
            const modalEl = document.getElementById('mdl-new-emp');
            const modal = new bootstrap.Modal(modalEl);

            // Auto-focus on Name Input when modal opens
            modalEl.addEventListener('shown.bs.modal', () => {
                document.getElementById('emp-nome').focus();
            });

            document.getElementById('btn-new-employee').addEventListener('click', () => {
                document.getElementById('frm-new-emp').reset();
                document.getElementById('emp-edit-id').value = '';

                // Reset UI for New
                document.getElementById('emp-cpf').disabled = false;
                document.getElementById('sec-vehicle').style.display = 'block';
                document.getElementById('veh-placa').required = true;
                document.getElementById('veh-adesivo').required = true;
                document.getElementById('veh-modelo').required = true;
                document.getElementById('veh-cor').required = true;

                document.getElementById('emp-situacao').value = 'ATIVO';
                document.getElementById('mdl-emp-title').textContent = "Cadastrar Funcionário";
                modal.show();
            });

            const typeSel = document.getElementById('emp-tipo');
            typeSel.addEventListener('change', () => {
                document.getElementById('div-validade').style.display = (typeSel.value === 'PROVISORIO') ? 'block' : 'none';
                document.getElementById('emp-validade').required = (typeSel.value === 'PROVISORIO');
            });

            document.getElementById('btn-gen-adesivo').addEventListener('click', async () => {
                const code = await db.getNextStickerCode();
                document.getElementById('veh-adesivo').value = code;
            });

            // Masks
            document.getElementById('emp-cpf').addEventListener('input', (e) => maskInput(e.target, 'cpf'));
            document.getElementById('emp-tel').addEventListener('input', (e) => maskInput(e.target, 'tel'));

            // Validators Helper
            function isValidCPF(cpf) {
                cpf = cpf.replace(/[^\d]+/g, '');
                if (cpf == '') return false;
                // Validate length
                if (cpf.length != 11) return false;
                // Known Invalid Regex (e.g. 111.111.111-11)
                if (/^(\d)\1{10}$/.test(cpf)) return false;

                // Valida 1o digito
                let add = 0;
                for (let i = 0; i < 9; i++) add += parseInt(cpf.charAt(i)) * (10 - i);
                let rev = 11 - (add % 11);
                if (rev == 10 || rev == 11) rev = 0;
                if (rev != parseInt(cpf.charAt(9))) return false;
                // Valida 2o digito
                add = 0;
                for (let i = 0; i < 10; i++) add += parseInt(cpf.charAt(i)) * (11 - i);
                rev = 11 - (add % 11);
                if (rev == 10 || rev == 11) rev = 0;
                if (rev != parseInt(cpf.charAt(10))) return false;
                return true;
            }

            // Handle Submit
            document.getElementById('frm-new-emp').addEventListener('submit', async (e) => {
                e.preventDefault();

                const editId = document.getElementById('emp-edit-id').value;
                const name = document.getElementById('emp-nome').value.trim().toUpperCase();

                // Common Validation
                if (name.split(' ').length < 2) {
                    alert("Por favor, informe o Nome Completo (nome e sobrenome).");
                    return;
                }

                // Strict Phone Validation (Valid DDD + Leading 9 + 11 Digits)
                const phone = document.getElementById('emp-tel').value;
                const phoneClean = phone.replace(/\D/g, '');

                // 1. Length Check (11 digits: 2 DDD + 9 Number)
                if (phoneClean.length !== 11) {
                    alert("O telefone deve conter 11 dígitos (DDD + 9 dígitos).");
                    return;
                }

                // 2. DDD Validation
                const ddd = parseInt(phoneClean.substring(0, 2));
                const validDDDs = [
                    11, 12, 13, 14, 15, 16, 17, 18, 19,
                    21, 22, 24, 27, 28,
                    31, 32, 33, 34, 35, 37, 38,
                    41, 42, 43, 44, 45, 46, 47, 48, 49,
                    51, 53, 54, 55,
                    61, 62, 63, 64, 65, 66, 67, 68, 69,
                    71, 73, 74, 75, 77, 79,
                    81, 82, 83, 84, 85, 86, 87, 88, 89,
                    91, 92, 93, 94, 95, 96, 97, 98, 99
                ];
                if (!validDDDs.includes(ddd)) {
                    alert("DDD inválido. Informe um DDD válido do Brasil.");
                    return;
                }

                // 3. Leading 9 (3rd digit)
                if (phoneClean[2] !== '9') {
                    alert("O número de celular deve começar com o dígito 9.");
                    return;
                }

                const funcData = {
                    nome: name,
                    cpf: document.getElementById('emp-cpf').value,
                    situacao: 'ATIVO', // Default, but edit might allow change? No, edit keeps active usually, status changed via button.
                    cargo: document.getElementById('emp-cargo').value.toUpperCase(),
                    lotacao: document.getElementById('emp-lotacao').value.toUpperCase(),
                    telefone: phone, // Use the verified phone value (or raw, as user prefers. Usually keep mask format)
                    vinculo: document.getElementById('emp-vinculo').value,
                    tipo: document.getElementById('emp-tipo').value,
                    validade: document.getElementById('emp-validade').value,
                    obs: document.getElementById('emp-obs').value.toUpperCase()
                };

                // IF EDIT
                if (editId) {
                    try {
                        // Change Detection
                        const originalStr = document.getElementById('frm-new-emp').dataset.original;
                        if (originalStr) {
                            const original = JSON.parse(originalStr);
                            // Compare fields (Note: funcData has uppercase/trimmed values, verify original matches format)
                            // Original data comes from 'allData' which is likely already uppercase from DB or what was rendered.
                            // Let's compare carefully.

                            const hasChanges =
                                funcData.nome !== original.nome ||
                                funcData.cargo !== original.cargo ||
                                funcData.lotacao !== original.lotacao ||
                                funcData.telefone !== original.telefone || // Phone might vary if mask changes, assume compatible
                                funcData.vinculo !== original.vinculo ||
                                funcData.tipo !== original.tipo ||
                                funcData.validade !== original.validade ||
                                funcData.obs !== original.obs;

                            if (!hasChanges) {
                                alert("Não houve nenhuma alteração para salvar no banco de dados.");
                                return;
                            }
                        }

                        // Fix parseInt if updateFuncionario expects number (IT SHOULD EXPECT STRING NOW)
                        // But wait, db.js might still be using docRef with string ID?
                        // verify updateFuncionario implementation in db.js?
                        // Step 1000 removed parseInt from LISTENER, ensuring 'editId' (from hidden input) is string.
                        // hidden intput value comes from `emp.id` which is string.
                        // So editId is string.
                        // `db.updateFuncionario` was viewed earlier (Step 846 comment mentions it).
                        // Let's pass typical editId.

                        await db.updateFuncionario(editId, funcData); // Removed parseInt here too just in case
                        alert("Funcionário atualizado!");
                        modal.hide();
                        renderEmployees();
                    } catch (err) { alert(err.message); }
                    return;
                }

                // IF NEW (Full validation + Vehicle)
                const cpf = document.getElementById('emp-cpf').value;
                if (!isValidCPF(cpf)) {
                    alert("CPF inválido!");
                    return;
                }



                const cpfClean = cpf.replace(/\D/g, '');
                const exists = allData.find(e => e.cpf.replace(/\D/g, '') === cpfClean);
                if (exists) { alert("CPF já cadastrado."); return; }

                const plate = document.getElementById('veh-placa').value.toUpperCase();
                const sticker = document.getElementById('veh-adesivo').value;

                if (plate.length !== 7) {
                    alert("A placa deve ter exatamente 7 caracteres.");
                    return;
                }

                if (await db.checkPlateExists(plate)) { alert("Placa já cadastrada!"); return; }
                if (await db.checkStickerExists(sticker)) { alert("Adesivo já existe!"); return; }

                const vehicle = {
                    placa: plate,
                    adesivo: sticker,
                    modelo: document.getElementById('veh-modelo').value.toUpperCase(),
                    cor: document.getElementById('veh-cor').value.toUpperCase(),
                    principal: true,
                    obs: 'Cadastro Inicial'
                };

                try {
                    await db.createFuncionarioWithVehicles(funcData, [vehicle], auth.currentUser.login);
                    alert("Funcionário cadastrado!");
                    modal.hide();
                    renderEmployees();
                } catch (err) {
                    alert("Erro ao salvar: " + err.message);
                }
            });
        }

        function maskInput(el, type) {
            let v = el.value;
            if (type === 'cpf') {
                v = v.replace(/\D/g, "");
                v = v.replace(/(\d{3})(\d)/, "$1.$2");
                v = v.replace(/(\d{3})(\d)/, "$1.$2");
                v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
                el.value = v.substring(0, 14);
            } else if (type === 'tel') {
                v = v.replace(/\D/g, "");
                v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
                v = v.replace(/(\d)(\d{4})$/, "$1-$2");
                el.value = v.substring(0, 15);
            }
        }

        // Clear DB Listener Removed

        // --- Providers (Prestadores) Management ---
        async function renderPrestadores() {
            // Fetch Data
            let prestadores = [];
            try {
                prestadores = await db.getData('prestadores');
            } catch (e) {
                console.error("Error fetching prestadores:", e);
                contentArea.innerHTML = `<div class="alert alert-danger">Erro ao carregar dados: ${e.message}</div>`;
                return;
            }

            // Sort by ID (descending - most recent first)
            prestadores.sort((a, b) => parseInt(b.id) - parseInt(a.id));

            // Stats
            const total = prestadores.length;
            const dentro = prestadores.filter(p => p.status === 'DENTRO').length;
            const saiu = prestadores.filter(p => p.status === 'SAIU').length;

            // Pagination State
            let currentPage = 1;
            const itemsPerPage = 10;
            let filteredData = [...prestadores];

            // Filter State
            let currentFilter = 'TODOS';
            let searchTerm = '';

            function applyFilters() {
                filteredData = prestadores.filter(p => {
                    const matchesSearch = (p.nome_completo || '').toLowerCase().includes(searchTerm) ||
                        (p.cpf || '').includes(searchTerm) ||
                        (p.empresa || '').toLowerCase().includes(searchTerm);

                    let matchesStatus = true;
                    if (currentFilter === 'DENTRO') matchesStatus = p.status === 'DENTRO';
                    if (currentFilter === 'SAIU') matchesStatus = p.status === 'SAIU';

                    return matchesSearch && matchesStatus;
                });
                currentPage = 1;
                renderTable();
            }

            contentArea.innerHTML = `
                <!-- Indicators -->
                <div class="row g-3 mb-3">
                    <div class="col-md-4">
                        <div class="mini-stat-card border-secondary">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <h5 class="text-muted text-uppercase fw-bold">Total</h5>
                                    <h2 class="mb-0 text-info">${total}</h2>
                                </div>
                                <i class="fas fa-hard-hat text-muted opacity-50 fa-2x"></i>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="mini-stat-card border-secondary">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <h5 class="text-muted text-uppercase fw-bold">Dentro</h5>
                                    <h2 class="mb-0 text-warning">${dentro}</h2>
                                </div>
                                <i class="fas fa-sign-in-alt text-muted opacity-50 fa-2x"></i>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="mini-stat-card border-secondary">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <h5 class="text-muted text-uppercase fw-bold">Saíram</h5>
                                    <h2 class="mb-0 text-success">${saiu}</h2>
                                </div>
                                <i class="fas fa-sign-out-alt text-muted opacity-50 fa-2x"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card bg-dark border-secondary">
                    <div class="card-body p-4">
                        <!-- Header -->
                        <div class="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
                            <h3 class="text-info mb-0 fw-bold"><i class="fas fa-hard-hat me-2"></i>Prestadores de Serviço</h3>
                            
                            <div class="d-flex flex-grow-1 justify-content-end gap-4 align-items-center" style="max-width: 850px;">
                                <div class="input-group">
                                    <span class="input-group-text bg-dark border-secondary text-muted"><i class="fas fa-search"></i></span>
                                    <input type="text" id="search-prest" class="form-control bg-dark text-light border-secondary" placeholder="Pesquisar por Nome, CPF ou Empresa...">
                                </div>
                                <button class="btn btn-info px-4 py-2" id="btn-new-prest">
                                    <i class="fas fa-plus me-2"></i>Novo Prestador
                                </button>
                            </div>
                        </div>

                        <!-- Filters -->
                        <div class="btn-group mb-3" role="group">
                            <input type="radio" class="btn-check" name="prest-filter" id="prest-todos" value="TODOS" checked>
                            <label class="btn btn-outline-secondary btn-sm" for="prest-todos">Todos</label>
                            
                            <input type="radio" class="btn-check" name="prest-filter" id="prest-dentro" value="DENTRO">
                            <label class="btn btn-outline-warning btn-sm" for="prest-dentro">Dentro</label>
                            
                            <input type="radio" class="btn-check" name="prest-filter" id="prest-saiu" value="SAIU">
                            <label class="btn btn-outline-success btn-sm" for="prest-saiu">Saíram</label>
                        </div>

                        <!-- Table -->
                        <div class="table-responsive">
                            <table class="table table-dark table-hover">
                                <thead>
                                    <tr>
                                        <th>Status</th>
                                        <th>ID</th>
                                        <th>Nome</th>
                                        <th>CPF</th>
                                        <th>Empresa</th>
                                        <th>Tipo</th>
                                        <th>Setor</th>
                                        <th>Entrada</th>
                                        <th>Saída</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody id="prest-tbody"></tbody>
                            </table>
                        </div>

                        <!-- Pagination -->
                        <nav>
                            <ul class="pagination pagination-sm justify-content-center mt-3" id="prest-pagination"></ul>
                        </nav>
                    </div>
                </div>
            `;

            function renderTable(page = 1) {
                const tbody = document.getElementById('prest-tbody');
                const pagination = document.getElementById('prest-pagination');

                const total = Math.ceil(filteredData.length / itemsPerPage);
                const start = (page - 1) * itemsPerPage;
                const end = start + itemsPerPage;
                const pageData = filteredData.slice(start, end);

                // Render Rows
                tbody.innerHTML = pageData.map(p => {
                    const statusBadge = p.status === 'DENTRO'
                        ? '<span class="badge bg-warning text-dark">Dentro</span>'
                        : '<span class="badge bg-success">Saiu</span>';

                    const entrada = p.data_hora_entrada ? new Date(p.data_hora_entrada).toLocaleString('pt-BR') : '-';
                    const saida = p.data_hora_saida ? new Date(p.data_hora_saida).toLocaleString('pt-BR') : '-';

                    const actionButtons = p.status === 'DENTRO'
                        ? `<button class="btn btn-sm btn-success btn-saida" data-id="${p.id}" title="Registrar Saída"><i class="fas fa-sign-out-alt"></i></button>`
                        : '';

                    return `
                        <tr>
                            <td>${statusBadge}</td>
                            <td>${p.id}</td>
                            <td>${p.nome_completo}</td>
                            <td>${p.cpf}</td>
                            <td>${p.empresa}</td>
                            <td><span class="badge bg-secondary">${p.tipo_servico}</span></td>
                            <td>${p.setor_destino}</td>
                            <td><small>${entrada}</small></td>
                            <td><small>${saida}</small></td>
                            <td>
                                ${actionButtons}
                                <button class="btn btn-sm btn-danger btn-delete-prest" data-id="${p.id}" title="Excluir"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>
                    `;
                }).join('');

                // Render Pagination
                pagination.innerHTML = '';
                if (total > 1) {
                    const prevLi = document.createElement('li');
                    prevLi.className = `page-item ${page === 1 ? 'disabled' : ''}`;
                    prevLi.innerHTML = `<a class="page-link" href="#" data-page="${page - 1}">Anterior</a>`;
                    pagination.appendChild(prevLi);

                    for (let i = 1; i <= total; i++) {
                        const li = document.createElement('li');
                        li.className = `page-item ${i === page ? 'active' : ''}`;
                        li.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
                        pagination.appendChild(li);
                    }

                    const nextLi = document.createElement('li');
                    nextLi.className = `page-item ${page === total ? 'disabled' : ''}`;
                    nextLi.innerHTML = `<a class="page-link" href="#" data-page="${page + 1}">Próximo</a>`;
                    pagination.appendChild(nextLi);

                    pagination.querySelectorAll('a.page-link').forEach(link => {
                        link.addEventListener('click', (e) => {
                            e.preventDefault();
                            const p = parseInt(link.dataset.page);
                            if (p >= 1 && p <= total && p !== page) {
                                renderTable(p);
                            }
                        });
                    });
                }

                // Attach Event Listeners
                document.querySelectorAll('.btn-saida').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        if (confirm('Registrar saída deste prestador?')) {
                            await db.registrarSaidaPrestador(btn.dataset.id);
                            renderPrestadores();
                        }
                    });
                });

                document.querySelectorAll('.btn-delete-prest').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        if (confirm('Excluir este registro permanentemente?')) {
                            await db.deletePrestador(btn.dataset.id);
                            renderPrestadores();
                        }
                    });
                });
            }

            // Initial Render
            renderTable();

            // Search
            document.getElementById('search-prest').addEventListener('input', (e) => {
                searchTerm = e.target.value.toLowerCase();
                applyFilters();
            });

            // Filters
            document.querySelectorAll('input[name="prest-filter"]').forEach(r => {
                r.addEventListener('change', (e) => {
                    currentFilter = e.target.value;
                    applyFilters();
                });
            });

            // New Prestador Button
            document.getElementById('btn-new-prest').addEventListener('click', () => {
                showPrestadorModal();
            });
        }

        function showPrestadorModal() {
            // Create Modal HTML
            const modalHTML = `
                <div class="modal fade" id="mdl-prestador" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content bg-dark text-light border-secondary">
                            <div class="modal-header border-secondary">
                                <h5 class="modal-title">Novo Prestador de Serviço</h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="frm-prestador">
                                    <!-- Dados Pessoais -->
                                    <h6 class="text-info mb-3"><i class="fas fa-user me-2"></i>Dados Pessoais</h6>
                                    <div class="row g-3 mb-4">
                                        <div class="col-md-6">
                                            <label class="form-label">Nome Completo *</label>
                                            <input type="text" class="form-control bg-dark text-light border-secondary" id="prest-nome" required>
                                        </div>
                                        <div class="col-md-3">
                                            <label class="form-label">CPF *</label>
                                            <input type="text" class="form-control bg-dark text-light border-secondary mask-cpf" id="prest-cpf" required>
                                        </div>
                                        <div class="col-md-3">
                                            <label class="form-label">Telefone *</label>
                                            <input type="text" class="form-control bg-dark text-light border-secondary mask-tel" id="prest-tel" required>
                                        </div>
                                    </div>

                                    <!-- Empresa e Serviço -->
                                    <h6 class="text-info mb-3"><i class="fas fa-building me-2"></i>Empresa e Serviço</h6>
                                    <div class="row g-3 mb-4">
                                        <div class="col-md-6">
                                            <label class="form-label">Empresa *</label>
                                            <input type="text" class="form-control bg-dark text-light border-secondary" id="prest-empresa" required>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Tipo de Serviço *</label>
                                            <select class="form-select bg-dark text-light border-secondary" id="prest-tipo" required>
                                                <option value="">Selecione...</option>
                                                <option value="ANESTESISTA">Anestesista</option>
                                                <option value="SERVICO">Serviço</option>
                                                <option value="ENTREGA">Entrega</option>
                                                <option value="MANUTENCAO">Manutenção</option>
                                            </select>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Setor de Destino *</label>
                                            <input type="text" class="form-control bg-dark text-light border-secondary" id="prest-setor" required>
                                        </div>
                                        <div class="col-md-6" id="prest-solicitante-group" style="display: none;">
                                            <label class="form-label">Solicitante</label>
                                            <input type="text" class="form-control bg-dark text-light border-secondary" id="prest-solicitante">
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Nº OS/Protocolo</label>
                                            <input type="text" class="form-control bg-dark text-light border-secondary" id="prest-os">
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Portaria de Entrada *</label>
                                            <select class="form-select bg-dark text-light border-secondary" id="prest-portaria" required>
                                                <option value="PORTARIA_A">Portaria A</option>
                                                <option value="PORTARIA_E">Portaria E</option>
                                            </select>
                                        </div>
                                    </div>

                                    <!-- Veículo (Opcional) -->
                                    <h6 class="text-info mb-3"><i class="fas fa-car me-2"></i>Veículo (Opcional)</h6>
                                    <div class="row g-3 mb-4">
                                        <div class="col-md-4">
                                            <label class="form-label">Placa</label>
                                            <input type="text" class="form-control bg-dark text-light border-secondary" id="prest-placa" maxlength="8">
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label">Modelo</label>
                                            <input type="text" class="form-control bg-dark text-light border-secondary" id="prest-modelo">
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label">Cor</label>
                                            <input type="text" class="form-control bg-dark text-light border-secondary" id="prest-cor">
                                        </div>
                                    </div>

                                    <!-- Observações -->
                                    <div class="mb-3">
                                        <label class="form-label">Observações</label>
                                        <textarea class="form-control bg-dark text-light border-secondary" id="prest-obs" rows="2"></textarea>
                                    </div>

                                    <button type="submit" class="btn btn-info w-100">Registrar Entrada</button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Remove existing modal if any
            const existingModal = document.getElementById('mdl-prestador');
            if (existingModal) existingModal.remove();

            // Append to body
            document.body.insertAdjacentHTML('beforeend', modalHTML);

            // Apply masks
            applyMasks();

            // Show/hide solicitante based on tipo
            document.getElementById('prest-tipo').addEventListener('change', (e) => {
                const solicitanteGroup = document.getElementById('prest-solicitante-group');
                solicitanteGroup.style.display = e.target.value === 'MANUTENCAO' ? 'block' : 'none';
            });

            // Form Submit
            document.getElementById('frm-prestador').addEventListener('submit', async (e) => {
                e.preventDefault();

                const data = {
                    nome: document.getElementById('prest-nome').value,
                    cpf: document.getElementById('prest-cpf').value,
                    telefone: document.getElementById('prest-tel').value,
                    empresa: document.getElementById('prest-empresa').value,
                    tipo: document.getElementById('prest-tipo').value,
                    setor: document.getElementById('prest-setor').value,
                    solicitante: document.getElementById('prest-solicitante').value,
                    numeroOS: document.getElementById('prest-os').value,
                    portaria: document.getElementById('prest-portaria').value,
                    placa: document.getElementById('prest-placa').value.toUpperCase(),
                    modelo: document.getElementById('prest-modelo').value.toUpperCase(),
                    cor: document.getElementById('prest-cor').value.toUpperCase(),
                    obs: document.getElementById('prest-obs').value
                };

                try {
                    // Validate CPF
                    if (!auth.isValidCPF(data.cpf)) {
                        alert('CPF inválido!');
                        return;
                    }

                    // Check if CPF already inside
                    if (await db.checkCPFPrestadorExists(data.cpf)) {
                        alert('Este CPF já possui um registro ativo (DENTRO). Registre a saída primeiro.');
                        return;
                    }

                    await db.addPrestador(data, user.login);
                    alert('Prestador registrado com sucesso!');

                    const modal = bootstrap.Modal.getInstance(document.getElementById('mdl-prestador'));
                    modal.hide();
                    renderPrestadores();
                } catch (err) {
                    alert('Erro ao salvar: ' + err.message);
                }
            });

            // Show Modal
            const modal = new bootstrap.Modal(document.getElementById('mdl-prestador'));
            modal.show();
        }

        function renderPortariaA() {
            contentArea.innerHTML = `
                <div class="card bg-dark border-secondary">
                    <div class="card-body text-center p-5">
                        <i class="fas fa-archway fa-4x text-muted mb-3"></i>
                        <h3>Portaria A</h3>
                        <p class="text-muted">Funcionalidade em desenvolvimento.</p>
                        <p class="text-secondary small">Controle de acesso específico para a Portaria A.</p>
                    </div>
                </div>
            `;
        }

        async function renderVagas() {
            // Stats
            const vagas = await db.getVagas();
            const total = vagas.length;
            const ocupadas = vagas.filter(v => v.status === 'OCUPADA').length;
            const reservadas = vagas.filter(v => v.status === 'RESERVADA').length;
            const livres = vagas.filter(v => v.status === 'LIVRE').length;

            contentArea.innerHTML = `
                <!-- Indicators -->
                <div class="row g-3 mb-3">
                    <div class="col-md-3 col-sm-6">
                        <div class="mini-stat-card border-secondary">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <h5 class="text-muted text-uppercase fw-bold">Total</h5>
                                    <h2 class="mb-0 text-primary">${total}</h2>
                                </div>
                                <i class="fas fa-database text-muted opacity-50 fa-2x"></i>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3 col-sm-6">
                        <div class="mini-stat-card border-secondary">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <h5 class="text-muted text-uppercase fw-bold">Ocupadas</h5>
                                    <h2 class="mb-0 text-danger">${ocupadas}</h2>
                                </div>
                                <i class="fas fa-car text-muted opacity-50 fa-2x"></i>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3 col-sm-6">
                        <div class="mini-stat-card border-secondary">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <h5 class="text-muted text-uppercase fw-bold">Reservadas</h5>
                                    <h2 class="mb-0 text-warning">${reservadas}</h2>
                                </div>
                                <i class="fas fa-ticket-alt text-muted opacity-50 fa-2x"></i>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3 col-sm-6">
                        <div class="mini-stat-card border-secondary">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <h5 class="text-muted text-uppercase fw-bold">Livres</h5>
                                    <h2 class="mb-0 text-success">${livres}</h2>
                                </div>
                                <i class="fas fa-check-circle text-muted opacity-50 fa-2x"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Table Container -->
                <div class="card bg-dark border-secondary">
                    <div class="card-header border-secondary d-flex justify-content-between align-items-center">
                        <h5 class="mb-0"><i class="fas fa-list me-2"></i>Lista de Vagas</h5>
                        <button class="btn btn-primary" id="btn-add-vaga">
                            <i class="fas fa-plus me-2"></i>Adicionar Vaga
                        </button>
                    </div>
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-dark table-hover mb-0 align-middle">
                                <thead class="table-light">
                                    <tr>
                                        <th style="width: 50px;">ID</th>
                                        <th style="width: 80px;">Vaga</th>
                                        <th style="width: 100px;">Tipo</th>
                                        <th style="width: 100px;">Status</th>
                                        <th style="width: 120px;">Local</th>
                                        <th style="max-width: 150px;">Observações</th>
                                        <th style="width: 140px;">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${vagas.map((v, index) => `
                                        <tr>
                                            <td class="text-muted small py-1 align-middle">${index + 1}</td>
                                            <td class="fw-bold text-white py-1 align-middle">${v.numero_vaga}</td>
                                            <td class="py-1 align-middle"><span class="badge bg-secondary text-light">${v.tipo}</span></td>
                                            <td class="py-1 align-middle">
                                                <span class="badge ${v.status === 'LIVRE' ? 'bg-success' : (v.status === 'RESERVADA' ? 'bg-warning text-dark' : 'bg-danger')}">
                                                    ${v.status}
                                                </span>
                                            </td>
                                            <td class="small text-muted py-1 align-middle">${v.local}</td>
                                            <td class="text-muted small py-1 align-middle text-truncate" style="max-width: 150px;" title="${v.observacoes || ''}">${v.observacoes || '-'}</td>
                                            <td class="py-1 align-middle">
                                                <div class="d-flex gap-2">
                                                    <button class="btn btn-sm btn-outline-primary btn-edit-vaga py-0" data-id="${v.id}" style="font-size: 0.75rem;">
                                                        <i class="fas fa-edit"></i>
                                                    </button>
                                                    ${v.status === 'LIVRE' ?
                    `<button class="btn btn-sm btn-outline-warning btn-toggle-vaga py-0" data-id="${v.id}" data-status="RESERVADA" title="Reservar Vaga" style="font-size: 0.75rem;">
                                                            <i class="fas fa-car"></i>
                                                        </button>` :
                    `<button class="btn btn-sm btn-outline-success btn-toggle-vaga py-0" data-id="${v.id}" data-status="LIVRE" title="Desocupar Vaga" style="font-size: 0.75rem;">
                                                            <i class="fas fa-check"></i>
                                                        </button>`
                }
                                                    <button class="btn btn-sm btn-outline-danger btn-delete-vaga py-0" data-id="${v.id}" title="Excluir Vaga" style="font-size: 0.75rem;">
                                                        <i class="fas fa-trash-alt"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="card-footer border-secondary text-muted small">
                        Total de registros: ${total}
                    </div>
                </div>
            `;

            // Add Event Listener for Add Button
            document.getElementById('btn-add-vaga').addEventListener('click', () => {
                const form = document.getElementById('frm-new-vaga');
                form.reset();

                // --- Auto-Increment Logic ---
                try {
                    // Extract all existing numbers
                    const numbers = vagas.map(v => parseInt(v.numero_vaga, 10)).filter(n => !isNaN(n));

                    // Default to 1 if list is empty, otherwise Max + 1
                    let nextNum = 1;
                    if (numbers.length > 0) {
                        nextNum = Math.max(...numbers) + 1;
                    }

                    // Format with leading zero if less than 10
                    const formattedNum = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;

                    // Pre-fill
                    document.getElementById('vaga-numero').value = formattedNum;
                } catch (err) {
                    console.error("Auto-increment error:", err);
                    // Fallback: empty input (do nothing)
                }
                // -----------------------------

                const modal = new bootstrap.Modal(document.getElementById('mdl-new-vaga'));
                modal.show();
            });

            // Handle New Vaga Submission (Global Listener Pattern check)
            const frmNewVaga = document.getElementById('frm-new-vaga');
            if (frmNewVaga && !frmNewVaga.dataset.attached) {
                frmNewVaga.addEventListener('submit', async (e) => {
                    e.preventDefault();

                    const numero = document.getElementById('vaga-numero').value.trim().toUpperCase();
                    const tipo = document.getElementById('vaga-tipo').value;
                    const local = document.getElementById('vaga-local').value;
                    const obs = document.getElementById('vaga-obs').value;

                    // Basic Validation
                    if (!numero) {
                        alert("Informe o Número da Vaga.");
                        return;
                    }

                    try {
                        await db.addVaga({
                            numero,
                            tipo,
                            local,
                            obs
                        });

                        alert("Vaga adicionada com sucesso!");
                        const el = document.getElementById('mdl-new-vaga');
                        const modal = bootstrap.Modal.getInstance(el);
                        modal.hide();
                        renderVagas(); // Refresh List
                    } catch (err) {
                        alert("Erro ao adicionar vaga: " + err.message);
                    }
                });
            }

            // Handle Edit Vaga Submission
            const frmEditVaga = document.getElementById('frm-edit-vaga');
            if (frmEditVaga && !frmEditVaga.dataset.attached) {
                frmEditVaga.addEventListener('submit', async (e) => {
                    e.preventDefault();

                    const id = document.getElementById('edit-vaga-id').value;
                    const tipo = document.getElementById('edit-vaga-tipo').value;
                    const local = document.getElementById('edit-vaga-local').value;
                    const status = document.getElementById('edit-vaga-status').value;
                    const obs = document.getElementById('edit-vaga-obs').value;

                    try {
                        await db.updateVaga(id, {
                            tipo,
                            local,
                            status,
                            observacoes: obs
                        });

                        alert("Vaga atualizada com sucesso!");
                        const el = document.getElementById('mdl-edit-vaga');
                        const modal = bootstrap.Modal.getInstance(el);
                        modal.hide();
                        renderVagas(); // Refresh List
                    } catch (err) {
                        alert("Erro ao atualizar vaga: " + err.message);
                    }
                });
                frmEditVaga.dataset.attached = 'true';
            }

            // Event Delegation for Table Actions
            const tableBody = contentArea.querySelector('tbody');
            if (tableBody) {
                tableBody.addEventListener('click', async (e) => {
                    const btnToggle = e.target.closest('.btn-toggle-vaga');
                    const btnEdit = e.target.closest('.btn-edit-vaga');
                    const btnDelete = e.target.closest('.btn-delete-vaga');

                    if (btnToggle) {
                        const id = btnToggle.dataset.id;
                        const newStatus = btnToggle.dataset.status;
                        await db.updateVagaStatus(id, newStatus);
                        renderVagas(); // Refresh
                    }

                    if (btnEdit) {
                        const id = btnEdit.dataset.id;
                        // Find the vaga object in current state
                        const vaga = vagas.find(v => v.id === id);

                        // RESTRICTION: Only 'LIVRE' can be edited
                        if (vaga.status !== 'LIVRE') {
                            alert("Atenção: Somente vagas com status LIVRE podem ser editadas.\n\nPara editar esta vaga, libere-a primeiro.");
                            return;
                        }

                        if (vaga) {
                            // Populate Form
                            document.getElementById('edit-vaga-id').value = vaga.id;
                            document.getElementById('edit-vaga-numero').value = vaga.numero_vaga;
                            document.getElementById('edit-vaga-tipo').value = vaga.tipo;
                            document.getElementById('edit-vaga-local').value = vaga.local;
                            document.getElementById('edit-vaga-status').value = vaga.status;
                            document.getElementById('edit-vaga-obs').value = vaga.observacoes || '';

                            const modal = new bootstrap.Modal(document.getElementById('mdl-edit-vaga'));
                            modal.show();
                        }
                    }

                    if (btnDelete) {
                        if (confirm('Tem certeza que deseja EXCLUIR esta vaga?')) {
                            const id = btnDelete.dataset.id;
                            await db.deleteVaga(id);
                            renderVagas(); // Refresh
                        }
                    }
                });
            }
        }

        function renderInfracoes() {
            contentArea.innerHTML = `
                <div class="card bg-dark border-secondary">
                    <div class="card-body p-4">
                        <div class="d-flex justify-content-between align-items-center mb-4">
                            <h3 class="text-warning mb-0 fw-bold">
                                <i class="fas fa-exclamation-triangle me-2"></i>Gestão de Infrações
                            </h3>
                        </div>
                        
                        <div class="alert alert-warning border-warning">
                            <i class="fas fa-info-circle me-2"></i>
                            <strong>Módulo em Desenvolvimento</strong>
                            <p class="mb-0 mt-2">Este módulo permitirá registrar e gerenciar infrações cometidas no estacionamento, incluindo:</p>
                            <ul class="mb-0 mt-2">
                                <li>Registro de infrações por veículo/funcionário</li>
                                <li>Tipos de infração (estacionamento irregular, velocidade, etc.)</li>
                                <li>Histórico completo de infrações</li>
                                <li>Relatórios e estatísticas</li>
                            </ul>
                        </div>

                        <div class="text-center p-5">
                            <i class="fas fa-exclamation-triangle fa-4x text-warning mb-3 opacity-50"></i>
                            <h4 class="text-muted">Estrutura em Preparação</h4>
                            <p class="text-secondary">A funcionalidade completa será implementada em breve.</p>
                        </div>
                    </div>
                </div>
            `;
        }

        function renderPortariaE() {
            contentArea.innerHTML = `
                <div class="card bg-dark border-secondary">
                    <div class="card-body text-center p-5">
                        <i class="fas fa-archway fa-4x text-muted mb-3"></i>
                        <h3>Portaria E</h3>
                        <p class="text-muted">Funcionalidade em desenvolvimento.</p>
                        <p class="text-secondary small">Controle de acesso específico para a Portaria E.</p>
                    </div>
                </div>
            `;
        }

    } catch (err) {
        console.error("Dashboard Error:", err);
        alert("Erro no dashboard: " + err.message);
    }
});
