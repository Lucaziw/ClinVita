const db = require('../../config/dbConfig');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const registerFunc = async (req, res) => {
    const {
        nome, cpf, email, senha, ativo, tipousuario,
        logradouro, numero, complemento, bairro, cidade, estado, cep,
        tipocontato, telefone,
        cargofunc, salario, carga_horaria,
    } = req.body;

    try {

        if (!nome || !cpf || !email || !senha || !logradouro || !cidade) {
            return res.status(400).json({ error: 'Por favor, preencha todos os campos obrigatórios.' });
        }

        await db.query('BEGIN');

        const existingUser = await db.query('SELECT * FROM tbUser WHERE cpf = $1 OR email = $2', [cpf, email]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'CPF ou email já cadastrado.' });
        }

        const hashedPassword = await bcrypt.hash(senha, 10);
        const userQuery = `
            INSERT INTO tbUser (nome, cpf, email, senha, ativo, tipousuario)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING idUser
        `;
        const userResult = await db.query(userQuery, [nome, cpf, email, hashedPassword, ativo, cargofunc]);
        const userId = userResult.rows[0]?.iduser;

        if (!userId) throw new Error('Erro ao obter ID do usuário.');

        const enderecoQuery = `
            INSERT INTO tbEndereco (idUser, logradouro, numero, complemento, bairro, cidade, estado, cep)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;
        await db.query(enderecoQuery, [userId, logradouro, numero, complemento, bairro, cidade, estado, cep]);

        const contatoQuery = `
            INSERT INTO tbContato (idUser, tipoContato, telefone)
            VALUES ($1, $2, $3)
        `;
        await db.query(contatoQuery, [userId, tipocontato, telefone]);

        const funcQuery = `
            INSERT INTO tbfunc (idUser, cargofunc, salario, carga_horaria)
            VALUES ($1, $2, $3, $4)
        `;
        await db.query(funcQuery, [userId, cargofunc, salario, carga_horaria]);

        await db.query('COMMIT');

        res.status(201).json({ idUser: userId, message: 'Usuário registrado com sucesso.' });
    } catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Erro ao registrar o usuário.' });
    }
};


const registerFuncMed = async (req, res) => {
    const {
        nome, cpf, email, senha, ativo, tipousuario,
        logradouro, numero, complemento, bairro, cidade, estado, cep,
        tipocontato, telefone,
        cargofunc, salario, carga_horaria, idespecialidade, crm,
    } = req.body;

    try {

        if (!nome || !cpf || !email || !senha || !logradouro || !cidade || !idespecialidade || !crm) {
            return res.status(400).json({ error: 'Por favor, preencha todos os campos obrigatórios.' });
        }

        await db.query('BEGIN');


        const existingUser = await db.query('SELECT * FROM tbUser WHERE cpf = $1 OR email = $2', [cpf, email]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'CPF ou email já cadastrado.' });
        }

        const hashedPassword = await bcrypt.hash(senha, 10);
        const userQuery = `
            INSERT INTO tbUser (nome, cpf, email, senha, ativo, tipousuario)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING idUser
        `;
        const userResult = await db.query(userQuery, [nome, cpf, email, hashedPassword, ativo, cargofunc]);
        const userId = userResult.rows[0]?.iduser;

        if (!userId) throw new Error('Erro ao obter ID do usuário.');


        const enderecoQuery = `
            INSERT INTO tbEndereco (idUser, logradouro, numero, complemento, bairro, cidade, estado, cep)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;
        await db.query(enderecoQuery, [userId, logradouro, numero, complemento, bairro, cidade, estado, cep]);

 
        const contatoQuery = `
            INSERT INTO tbContato (idUser, tipoContato, telefone)
            VALUES ($1, $2, $3)
        `;
        await db.query(contatoQuery, [userId, tipocontato, telefone]);


        const funcQuery = `
            INSERT INTO tbfunc (idUser, cargofunc, salario, carga_horaria)
            VALUES ($1, $2, $3, $4)
            RETURNING idFunc
        `;
        const funcResult = await db.query(funcQuery, [userId, cargofunc, salario, carga_horaria]);
        const idFunc = funcResult.rows[0]?.idfunc;

        if (!idFunc) throw new Error('Erro ao obter ID do funcionário.');


        const medicoQuery = `
            INSERT INTO tbmedico (idFunc, idespecialidade, crm, ativo)
            VALUES ($1, $2, $3, $4)
        `;
        await db.query(medicoQuery, [idFunc, idespecialidade, crm, ativo]);

        await db.query('COMMIT');

        res.status(201).json({ idUser: userId, message: 'Usuário registrado com sucesso.' });
    } catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Erro ao registrar o usuário.' });
    }
};


module.exports = {registerFunc, registerFuncMed};