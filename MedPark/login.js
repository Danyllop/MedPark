document.addEventListener('DOMContentLoaded', async () => {
    try {
        // --- Initialization ---
        // Wait for DB to be ready
        if (typeof db !== 'undefined' && db.ready) {
            try {
                await db.ready;
            } catch (dbErr) {
                console.error("DB Init Error:", dbErr);
                alert("Erro ao carregar banco de dados: " + dbErr.message);
            }
        }

        // Theme init
        document.documentElement.setAttribute('data-bs-theme', 'dark');

        // --- Elements ---
        // Elements
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const changePassForm = document.getElementById('change-password-form');

        // Toggles
        const showRegisterBtn = document.getElementById('show-register-btn');
        const showCpBtn = document.getElementById('show-cp-btn');
        const btnBacks = document.querySelectorAll('.btn-back-login');

        // --- Auth Check ---
        // If user is already logged in, redirect to dashboard
        if (auth.checkSession()) {
            window.location.href = 'dashboard.html';
        }

        // --- Event Listeners ---

        // Display Logic
        function showForm(form) {
            loginForm.style.display = 'none';
            registerForm.style.display = 'none';
            changePassForm.style.display = 'none';
            form.style.display = 'block';

            // Header Logic
            const headerTitle = document.querySelector('.login-header h2');
            const headerSubtitle = document.querySelector('.login-header p');

            if (form === registerForm) {
                headerTitle.textContent = 'Cadastro de Usuários';
                headerSubtitle.style.display = 'none';
                headerTitle.classList.add('small-header');
            } else if (form === changePassForm) {
                headerTitle.textContent = 'Alterar Senha';
                headerSubtitle.style.display = 'none';
                headerTitle.classList.add('small-header');
            } else {
                // Login Form
                headerTitle.textContent = 'Med Park';
                headerSubtitle.style.display = 'block';
                headerSubtitle.textContent = 'Acesso Restrito';
                headerTitle.classList.remove('small-header');
            }
        }

        // Initially show login form
        // Initially show login form
        showForm(loginForm);

        // --- New Features Logic ---

        // 1. Show/Hide Password
        const togglePassBtn = document.getElementById('toggle-password');
        const passInput = document.getElementById('password');

        if (togglePassBtn && passInput) {
            togglePassBtn.addEventListener('click', () => {
                const type = passInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passInput.setAttribute('type', type);

                // Toggle Icon
                const icon = togglePassBtn.querySelector('i');
                if (type === 'text') {
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            });
        }

        // 2. Remember Me Init (Implicit)
        const savedUser = localStorage.getItem('medpark_user');

        if (savedUser) {
            document.getElementById('username').value = savedUser;
        }

        showRegisterBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showForm(registerForm);
        });

        showCpBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showForm(changePassForm);
        });

        btnBacks.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                showForm(loginForm);
            });
        });

        // Login Handle
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const btn = loginForm.querySelector('button');
            // const remember = document.getElementById('remember-me').checked; // Removed

            try {
                btn.disabled = true;
                btn.textContent = 'Entrando...';

                const user = await auth.login(username, password);

                if (user) {
                    // Implicitly Save LocalStorage (Professional Convenience)
                    localStorage.setItem('medpark_user', username);

                    window.location.href = 'dashboard.html';
                } else {
                    alert('Credenciais inválidas!');
                }
            } catch (error) {
                alert(error.message);
            } finally {
                btn.disabled = false;
                btn.textContent = 'Entrar';
            }
        });

        // Register Handle
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));

            const name = document.getElementById('reg-name').value;
            const cpf = document.getElementById('reg-cpf').value;
            const email = document.getElementById('reg-email').value;
            const username = document.getElementById('reg-username').value;
            const password = document.getElementById('reg-password').value;
            const confirmPassword = document.getElementById('reg-confirm-password').value;
            const btn = registerForm.querySelector('button');

            if (password !== confirmPassword) {
                showError('reg-confirm-password', 'As senhas não coincidem.');
                return;
            }

            try {
                btn.disabled = true;
                btn.textContent = 'Cadastrando...';

                await auth.register({ name, cpf, email, username, password });

                alert('Cadastro realizado com sucesso! Aguarde aprovação do administrador.');
                showForm(loginForm);
                registerForm.reset();

            } catch (error) {
                if (error.message.includes('Nome')) showError('reg-name', error.message);
                else if (error.message.includes('CPF')) showError('reg-cpf', error.message);
                else if (error.message.includes('Senha')) showError('reg-password', error.message);
                else if (error.message.includes('Usuário')) showError('reg-username', error.message);
                else alert('Erro: ' + error.message);
            } finally {
                btn.disabled = false;
                btn.textContent = 'Registrar';
            }
        });

        // Change Password Handle
        changePassForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = document.getElementById('cp-username').value;
            const oldPass = document.getElementById('cp-old-pass').value;
            const newPass = document.getElementById('cp-new-pass').value;
            const confirmPass = document.getElementById('cp-confirm-pass').value;
            const btn = changePassForm.querySelector('button');

            if (newPass !== confirmPass) {
                alert("A nova senha e a confirmação não coincidem.");
                return;
            }

            try {
                btn.disabled = true;
                await auth.changePassword(user, oldPass, newPass);
                alert("Senha alterada com sucesso! Faça login com a nova senha.");
                showForm(loginForm);
                changePassForm.reset();
            } catch (err) {
                alert("Erro ao alterar senha: " + err.message);
            } finally {
                btn.disabled = false;
            }
        });


        function showError(fieldId, message) {
            const field = document.getElementById(fieldId);
            const feedback = document.getElementById(fieldId + '-feedback');
            if (field) {
                field.classList.add('is-invalid');
                if (feedback) feedback.textContent = message;
            } else alert(message);
        }

    } catch (err) {
        console.error("Login Page Error:", err);
    }
});
