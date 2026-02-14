import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, limit, setDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBQPJsxqou6HNgDPKRa1hHGW3KHY_SxjK4",
    authDomain: "projeto-med-park.firebaseapp.com",
    projectId: "projeto-med-park",
    storageBucket: "projeto-med-park.firebasestorage.app",
    messagingSenderId: "396979141525",
    appId: "1:396979141525:web:ff236857019818536c149c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const dbFirestore = getFirestore(app);

class Database {
    constructor() {
        this.db = dbFirestore;
        this.init(); // Fire and forget init
    }

    async init() {
        // Check if seeded
        await this.checkAndSeed();
        console.log('Firebase Database Connected');
    }

    async checkAndSeed() {
        try {
            const usersRef = collection(this.db, "usuarios");
            const q = query(usersRef, limit(1));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                console.log("Seeding initial data to Firebase...");
                await this.seedData();
            }
        } catch (e) {
            console.error("Error checking seed:", e);
        }
    }

    async seedData() {
        const batch = writeBatch(this.db);

        // Seed Admin User
        const adminUser = {
            nome_completo: 'Administrador',
            login: 'admin',
            cpf: '000.000.000-00',
            senha_hash: 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', // "123"
            email: 'admin@hospital.com',
            nivel_acesso: 'Admin',
            status: 'ATIVO',
            data_registro: '2023-01-01',
            hora_registro: '00:00:00',
            tentativas_falhas: 0
        };
        const newUserRef = doc(collection(this.db, "usuarios"));
        batch.set(newUserRef, adminUser);

        // Seed 90 Vagas
        for (let i = 1; i <= 90; i++) {
            let num = i.toString().padStart(2, '0');
            let tipo = 'NORMAL';
            let local = 'EXTERNA';
            let obs = '';

            if (i > 50 && i <= 70) local = 'SUBSOLO 1';
            if (i > 70 && i <= 85) local = 'SUBSOLO 2';
            if (i >= 86 && i <= 88) { tipo = 'DIRETORIA'; local = 'SUBSOLO 1'; }
            if (i === 89) { tipo = 'IDOSO'; local = 'EXTERNA'; }
            if (i === 90) { tipo = 'PNE'; local = 'EXTERNA'; }

            const vagaRef = doc(collection(this.db, "vagas"));
            batch.set(vagaRef, { numero_vaga: num, tipo, local, status: 'LIVRE', observacoes: obs, id_legacy: i });
        }

        // Seed Stats
        const statsRef = doc(this.db, "stats", "main");
        batch.set(statsRef, { occupied: 0, total: 200, entriesToday: 0, incidentsToday: 0 });

        await batch.commit();
        console.log("Seeding complete.");
    }

    // --- GENERIC GET ---
    async getData(collectionName) {
        try {
            const q = query(collection(this.db, collectionName));
            const querySnapshot = await getDocs(q);
            const data = [];
            querySnapshot.forEach((doc) => {
                data.push({ id: doc.id, ...doc.data() });
            });
            return data;
        } catch (e) {
            console.error(`Error getting ${collectionName}:`, e);
            return [];
        }
    }

    // --- USERS ---
    async findUserByLogin(login) {
        try {
            const q = query(collection(this.db, "usuarios"), where("login", "==", login));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (e) {
            console.error("Error finding user:", e);
            return null;
        }
    }

    async findUserByCPF(cpf) {
        try {
            const q = query(collection(this.db, "usuarios"), where("cpf", "==", cpf));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                return { id: doc.id, ...doc.data() };
            }
        } catch (e) { return null; }
        return null;
    }

    async createUser(user) {
        try {
            const fullUser = {
                nome_completo: user.name,
                login: user.username,
                cpf: user.cpf,
                senha_hash: user.passwordHash,
                email: user.email,
                nivel_acesso: 'Operador',
                status: 'INATIVO',
                data_registro: new Date().toLocaleDateString('pt-BR'),
                hora_registro: new Date().toLocaleTimeString('pt-BR'),
                tentativas_falhas: 0
            };
            await addDoc(collection(this.db, "usuarios"), fullUser);
            return true;
        } catch (err) {
            throw err;
        }
    }

    async updateUserStatus(login, newStatus) {
        const user = await this.findUserByLogin(login);
        if (user) {
            await updateDoc(doc(this.db, "usuarios", user.id), { status: newStatus });
        }
    }

    async updateLastAccess(login) {
        const user = await this.findUserByLogin(login);
        if (user) {
            const now = new Date().toLocaleString('pt-BR');
            await updateDoc(doc(this.db, "usuarios", user.id), { ultimo_acesso: now });
        }
    }

    async updatePassword(login, newHash) {
        const user = await this.findUserByLogin(login);
        if (user) {
            await updateDoc(doc(this.db, "usuarios", user.id), { senha_hash: newHash });
        }
    }

    async resetFailedAttempts(login) {
        const user = await this.findUserByLogin(login);
        if (user) await updateDoc(doc(this.db, "usuarios", user.id), { tentativas_falhas: 0 });
    }

    async incrementFailedAttempts(login) {
        const user = await this.findUserByLogin(login);
        if (user) {
            const fails = (user.tentativas_falhas || 0) + 1;
            await updateDoc(doc(this.db, "usuarios", user.id), { tentativas_falhas: fails });
        }
    }

    async updateUserRole(login, newRole) {
        const user = await this.findUserByLogin(login);
        if (user) await updateDoc(doc(this.db, "usuarios", user.id), { nivel_acesso: newRole });
    }

    async deleteUser(login) {
        const user = await this.findUserByLogin(login);
        if (user) await deleteDoc(doc(this.db, "usuarios", user.id));
    }


    // --- VAGAS ---
    async getVagas() {
        // Return sorted by number
        try {
            const q = query(collection(this.db, "vagas"), orderBy("numero_vaga"));
            const snapshot = await getDocs(q);
            const vagas = [];
            snapshot.forEach(doc => vagas.push({ id: doc.id, ...doc.data() }));
            return vagas;
        } catch (e) {
            // If index is missing for sort, it might error. Fallback to client sort.
            console.warn("Firestore sort might require index. Falling back to client sort.", e);
            const snap = await getDocs(collection(this.db, "vagas"));
            const vagas = [];
            snap.forEach(doc => vagas.push({ id: doc.id, ...doc.data() }));
            return vagas.sort((a, b) => a.numero_vaga.localeCompare(b.numero_vaga));
        }
    }

    async addVaga(vagaData) {
        // Check duplicate
        const q = query(collection(this.db, "vagas"), where("numero_vaga", "==", vagaData.numero));
        const snap = await getDocs(q);
        if (!snap.empty) throw new Error("Número de Vaga já existe.");

        await addDoc(collection(this.db, "vagas"), {
            numero_vaga: vagaData.numero,
            tipo: vagaData.tipo,
            local: vagaData.local,
            status: 'LIVRE',
            observacoes: vagaData.obs
        });
    }

    async updateVaga(id, updateData) {
        const vagaRef = doc(this.db, "vagas", id);
        await updateDoc(vagaRef, updateData);
    }

    async updateVagaStatus(id, newStatus) {
        await updateDoc(doc(this.db, "vagas", id), { status: newStatus });
    }

    async deleteVaga(id) {
        await deleteDoc(doc(this.db, "vagas", id));
    }

    // --- EMPLOYEES / VEHICLES ---
    async getEmployeesWithVehicles() {
        // Fetch all employees and vehicles? Or just standard structure.
        // Legacy used getEmployeesBase.
        // Let's implement generic fetches.
        return await this.getData("funcionarios");
    }

    // For legacy getAll
    async getEmployeesBase() {
        const all = await this.getData("funcionarios");
        return all.map(f => ({ id: f.id, nome: f.nome_completo, cpf: f.cpf }));
    }

    async getNextNumericId(collectionName) {
        try {
            // Get all docs to find max numeric ID
            // Optimize: maintain a counter doc. But for now, scan is safer to recover state.
            const q = query(collection(this.db, collectionName));
            const snap = await getDocs(q);
            let max = 0;
            snap.forEach(doc => {
                const id = parseInt(doc.id);
                if (!isNaN(id) && id > max) max = id;
            });
            return (max + 1).toString();
        } catch (e) {
            console.error("Error generating ID:", e);
            return Date.now().toString(); // Fallback
        }
    }

    async createFuncionarioWithVehicles(funcData, vehiclesList, createdBy) {
        // Generate Sequential ID
        const newId = await this.getNextNumericId("funcionarios");

        const batch = writeBatch(this.db);
        const funcRef = doc(this.db, "funcionarios", newId);

        batch.set(funcRef, {
            nome_completo: funcData.nome,
            cpf: funcData.cpf,
            cargo: funcData.cargo,
            lotacao: funcData.lotacao,
            telefone: funcData.telefone,
            vinculo: funcData.vinculo,
            situacao: funcData.situacao,
            data_registro: new Date().toISOString(),
            tipo_cadastro: funcData.tipo,
            data_validade: funcData.validade,
            observacoes: funcData.obs,
            usuario_cadastro: createdBy
        });

        // Vehicles
        vehiclesList.forEach(v => {
            const vehRef = doc(collection(this.db, "veiculos"));
            batch.set(vehRef, {
                funcionario_id: newId, // Link by numeric string ID
                placa: v.placa,
                modelo: v.modelo,
                cor: v.cor,
                adesivo: v.adesivo,
                principal: v.principal ? 1 : 0,
                observacoes: v.obs,
                data_registro: new Date().toISOString(),
                usuario_cadastro: createdBy
            });
        });

        await batch.commit();
        return newId;
    }

    async updateFuncionario(id, funcData) {
        await updateDoc(doc(this.db, "funcionarios", id), {
            nome_completo: funcData.nome,
            cargo: funcData.cargo,
            lotacao: funcData.lotacao,
            telefone: funcData.telefone,
            vinculo: funcData.vinculo,
            tipo_cadastro: funcData.tipo,
            data_validade: funcData.validade,
            observacoes: funcData.obs
        });
    }

    async updateEmployeeStatus(id, newStatus) {
        await updateDoc(doc(this.db, "funcionarios", id), { situacao: newStatus });
    }

    async addVehicle(vehData, createdBy) {
        if (vehData.principal) {
            // Unset others
            const q = query(collection(this.db, "veiculos"), where("funcionario_id", "==", vehData.funcionario_id));
            const snap = await getDocs(q);
            const updates = [];
            snap.forEach(d => {
                updates.push(updateDoc(doc(this.db, "veiculos", d.id), { principal: 0 }));
            });
            await Promise.all(updates);
        }

        await addDoc(collection(this.db, "veiculos"), {
            funcionario_id: vehData.funcionario_id,
            placa: vehData.placa,
            modelo: vehData.modelo,
            cor: vehData.cor,
            adesivo: vehData.adesivo,
            principal: vehData.principal ? 1 : 0,
            observacoes: vehData.obs,
            data_registro: new Date().toISOString(),
            usuario_cadastro: createdBy
        });
    }

    async setPrincipalVehicle(vehId, funcId) {
        // 1. Unset current principal for this employee
        const q = query(collection(this.db, "veiculos"), where("funcionario_id", "==", funcId));
        const snap = await getDocs(q);
        const batch = writeBatch(this.db);

        snap.forEach(d => {
            if (d.data().principal) {
                batch.update(doc(this.db, "veiculos", d.id), { principal: 0 });
            }
        });

        // 2. Set new principal
        batch.update(doc(this.db, "veiculos", vehId), { principal: 1 });
        await batch.commit();
    }

    async checkPlateExists(plate) {
        const q = query(collection(this.db, "veiculos"), where("placa", "==", plate));
        const snap = await getDocs(q);
        return !snap.empty;
    }

    async checkStickerExists(sticker) {
        const q = query(collection(this.db, "veiculos"), where("adesivo", "==", sticker));
        const snap = await getDocs(q);
        return !snap.empty;
    }

    async getNextStickerCode() {
        try {
            // Fetch all vehicles to find the true numeric maximum
            // Strings "9111" > "11000" cause issues with simple database sorting.
            // Client-side numeric sort is safer for this scale.
            const q = query(collection(this.db, "veiculos"));
            const snap = await getDocs(q);

            let max = 0;
            snap.forEach(doc => {
                const val = parseInt(doc.data().adesivo);
                if (!isNaN(val) && val > max) max = val;
            });

            // Start at 11000. If max found is 9111, that's < 11000, so we return 11000.
            // If max is 11004, we return 11005.
            if (max < 11000) return "11000";
            return (max + 1).toString();
        } catch (e) {
            console.error("Error generating sticker:", e);
            return "11000";
        }
    }

    // --- PRESTADORES (SERVICE PROVIDERS) ---
    async addPrestador(data, createdBy) {
        // Generate sequential ID
        const newId = await this.getNextNumericId('prestadores');

        await setDoc(doc(this.db, "prestadores", newId), {
            nome_completo: data.nome,
            cpf: data.cpf,
            telefone: data.telefone,
            empresa: data.empresa,
            tipo_servico: data.tipo,
            setor_destino: data.setor,
            solicitante: data.solicitante || '',
            numero_os: data.numeroOS || '',
            autorizador: data.autorizador || createdBy,
            veiculo_placa: data.placa || '',
            veiculo_modelo: data.modelo || '',
            veiculo_cor: data.cor || '',
            portaria_entrada: data.portaria || 'PORTARIA_A',
            data_hora_entrada: new Date().toISOString(),
            data_hora_saida: null,
            status: 'DENTRO',
            observacoes: data.obs || '',
            usuario_registro: createdBy,
            data_cadastro: new Date().toISOString()
        });

        return newId;
    }

    async updatePrestador(id, data) {
        await updateDoc(doc(this.db, "prestadores", id), {
            nome_completo: data.nome,
            telefone: data.telefone,
            empresa: data.empresa,
            tipo_servico: data.tipo,
            setor_destino: data.setor,
            solicitante: data.solicitante || '',
            numero_os: data.numeroOS || '',
            veiculo_placa: data.placa || '',
            veiculo_modelo: data.modelo || '',
            veiculo_cor: data.cor || '',
            observacoes: data.obs || ''
        });
    }

    async registrarSaidaPrestador(id) {
        await updateDoc(doc(this.db, "prestadores", id), {
            data_hora_saida: new Date().toISOString(),
            status: 'SAIU'
        });
    }

    async deletePrestador(id) {
        await deleteDoc(doc(this.db, "prestadores", id));
    }

    async checkCPFPrestadorExists(cpf) {
        const q = query(collection(this.db, "prestadores"),
            where("cpf", "==", cpf),
            where("status", "==", "DENTRO"));
        const snap = await getDocs(q);
        return !snap.empty;
    }

    async resetAllData() {
        console.log("Starting Full Database Reset...");
        const collections = ["usuarios", "funcionarios", "veiculos", "vagas", "prestadores", "stats"];

        for (const colName of collections) {
            const q = query(collection(this.db, colName));
            const snapshot = await getDocs(q);
            const batch = writeBatch(this.db);
            let count = 0;

            snapshot.forEach(doc => {
                batch.delete(doc.ref);
                count++;
            });

            if (count > 0) {
                await batch.commit();
                console.log(`Cleared ${count} docs from ${colName}`);
            }
        }
        console.log("Database reset complete. Reload to re-seed.");
    }
}

// Global Export
window.Database = Database;
window.db = new Database(); // Initialize globally
