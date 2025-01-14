const db = require('../../config/dbConfig');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const registerPaciente = async (req, res) => {
    const {
        nome, cpf, email, senha, ativo, tipousuario,
        logradouro, numero, complemento, bairro, cidade, estado, cep,
        tipocontato, telefone,
        datanasc, genero, tipo_sanguineo, observacoes,
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
        const userResult = await db.query(userQuery, [nome, cpf, email, hashedPassword, ativo, tipousuario]);
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


        const pacienteQuery = `
            INSERT INTO tbPaciente (idUser, datanasc, genero, tipo_sanguineo, observacoes)
            VALUES ($1, $2, $3, $4, $5)
        `;
        await db.query(pacienteQuery, [userId, datanasc, genero, tipo_sanguineo, observacoes]);

        await db.query('COMMIT');

        res.status(201).json({ idUser: userId, message: 'Usuário registrado com sucesso.' });
    } catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Erro ao registrar o usuário.' });
    }
};



const login = async (req, res) => {
    const { cpf, senha } = req.body;
    try {
        const query = 'SELECT * FROM tbuser WHERE cpf = $1';
        const result = await db.query(query, [cpf]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });

        const user = result.rows[0];
        const isPasswordValid = await bcrypt.compare(senha, user.senha);
        if (!isPasswordValid) return res.status(401).json({ error: 'Senha incorreta' });


        const func = result.rows[0]
        const token = jwt.sign(
            { id: user.iduser, tipoUsuario: user.tipousuario},
            'secreta',
            { expiresIn: '1h' }
        );

        res.json({ token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao fazer login' });
    }
};

module.exports = {registerPaciente, login };