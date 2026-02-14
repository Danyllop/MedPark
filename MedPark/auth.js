
class Auth {
    constructor(db) {
        this.db = db;
        this.currentUser = null;
    }

    // --- Role Helpers ---
    isAdmin() {
        return this.currentUser && this.currentUser.nivel_acesso === 'Admin';
    }

    isManager() {
        // Admin OR Supervisor
        return this.currentUser && ['Admin', 'Supervisor'].includes(this.currentUser.nivel_acesso);
    }

    // --- Hashing & Security ---
    async hashPassword(password) {
        const msgBuffer = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    // --- Validation Helpers ---
    isValidCPF(cpf) {
        // Remove non-digits
        cpf = cpf.replace(/[^\d]+/g, '');
        if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;

        let soma = 0;
        let resto;

        for (let i = 1; i <= 9; i++)
            soma = soma + parseInt(cpf.substring(i - 1, i)) * (11 - i);
        resto = (soma * 10) % 11;
        if ((resto === 10) || (resto === 11)) resto = 0;
        if (resto !== parseInt(cpf.substring(9, 10))) return false;

        soma = 0;
        for (let i = 1; i <= 10; i++)
            soma = soma + parseInt(cpf.substring(i - 1, i)) * (12 - i);
        resto = (soma * 10) % 11;
        if ((resto === 10) || (resto === 11)) resto = 0;
        if (resto !== parseInt(cpf.substring(10, 11))) return false;

        return true;
    }

    validatePasswordRule(password) {
        // Min 8 chars, 1 Upper, 1 Lower, 1 Number, 1 Special
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
        return regex.test(password);
    }

    // --- Auth Actions ---
    async login(username, password) {
        let user = await this.db.findUserByLogin(username);

        if (!user) return null; // User not found

        // Check Lockout
        if ((user.tentativas_falhas || 0) >= 5) {
            // Ensure strict status
            if (user.status !== 'INATIVO') {
                await this.db.updateUserStatus(user.login, 'INATIVO');
            }
            throw new Error('Conta bloqueada por excesso de tentativas (5). Contate o admin.');
        }

        if (user.status !== 'ATIVO') {
            throw new Error('Conta inativa ou pendente de aprovação.');
        }

        const passwordHash = await this.hashPassword(password);

        if (user.senha_hash === passwordHash) {
            // Success
            await this.db.resetFailedAttempts(user.login);
            await this.db.updateLastAccess(user.login); // Update last access time

            // Re-fetch to get clean state
            user = await this.db.findUserByLogin(username);

            this.currentUser = user;
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            return user;
        } else {
            // Failed
            await this.db.incrementFailedAttempts(user.login);
            // Re-check count
            user = await this.db.findUserByLogin(username);

            if (user.tentativas_falhas >= 5) {
                await this.db.updateUserStatus(user.login, 'INATIVO');
                throw new Error('5 tentativas falhas. Conta BLOQUEADA.');
            }

            return null; // Signals invalid credentials (or simple false)
        }
    }

    async changePassword(username, oldPassword, newPassword) {
        const user = await this.db.findUserByLogin(username);
        if (!user) throw new Error("Usuário não encontrado.");

        const oldHash = await this.hashPassword(oldPassword);
        if (user.senha_hash !== oldHash) throw new Error("Senha atual incorreta.");

        if (!this.validatePasswordRule(newPassword)) {
            throw new Error('Nova senha fraca (Req: 8 chars, Maiusc, Minusc, Num, Especial).');
        }

        const newHash = await this.hashPassword(newPassword);
        await this.db.updatePassword(username, newHash);

        // Also reset failures just in case
        await this.db.resetFailedAttempts(username);
        return true;
    }

    async register(data) {
        // data: { name, username, cpf, email, password }

        if (!data.name || data.name.trim().split(/\s+/).length < 2) {
            throw new Error('Nome deve conter pelo menos duas palavras.');
        }

        if (!this.isValidCPF(data.cpf)) {
            throw new Error('CPF inválido.');
        }

        if (!this.validatePasswordRule(data.password)) {
            throw new Error('Senha fraca. Requisitos: 8 caracteres, Maiúscula, Minúscula, Número, Especial.');
        }

        if (await this.db.findUserByLogin(data.username)) {
            throw new Error('Usuário (login) já existe.');
        }
        if (await this.db.findUserByCPF(data.cpf)) {
            throw new Error('CPF já cadastrado.');
        }

        const passwordHash = await this.hashPassword(data.password);

        const userPayload = {
            name: data.name,
            username: data.username,
            cpf: data.cpf,
            email: data.email,
            passwordHash: passwordHash
        };

        return await this.db.createUser(userPayload);
    }

    async adminResetPassword(targetLogin) {
        if (!this.isAdmin()) throw new Error("Acesso negado");

        // Reset to "Senh@123"
        const defaultHash = await this.hashPassword("Senh@123");
        await this.db.updatePassword(targetLogin, defaultHash);
        return true;
    }

    logout() {
        this.currentUser = null;
        sessionStorage.removeItem('currentUser');
    }

    checkSession() {
        const stored = sessionStorage.getItem('currentUser');
        if (stored) {
            this.currentUser = JSON.parse(stored);
            return this.currentUser;
        }
        return null;
    }

    isAdmin() {
        return this.currentUser && (this.currentUser.nivel_acesso === 'Admin' || this.currentUser.nivel_acesso === 'Supervisor');
    }
}

window.auth = new Auth(window.db);
