const db = require('../../config/dbConfig');

const disponibilidadeController = {
    async adicionar(req, res) {
        const { diaSemana, horaInicio, horaFim } = req.body;
        const idUser = req.user.id;

        try {
            const funcResult = await db.query(
                'SELECT idFunc FROM tbFunc WHERE idUser = $1',
                [idUser]
            );

            if (funcResult.rowCount === 0) {
                return res.status(404).json({ error: 'Funcionário não encontrado' });
            }

            const idFunc = funcResult.rows[0].idfunc;

            const medicoResult = await db.query(
                'SELECT idMedico FROM tbMedico WHERE idFunc = $1',
                [idFunc]
            );

            if (medicoResult.rowCount === 0) {
                return res.status(404).json({ error: 'Médico não encontrado' });
            }

            const idMedico = medicoResult.rows[0].idmedico;

           
            console.log('Dados recebidos:', { idUser, idFunc, idMedico, diaSemana, horaInicio, horaFim });

           
            const horaInicioDate = new Date(`2000-01-01T${horaInicio}`);
            const horaFimDate = new Date(`2000-01-01T${horaFim}`);
            const minTime = new Date(`2000-01-01T07:00`);
            const maxTime = new Date(`2000-01-01T20:00`);

            if (horaInicioDate < minTime || horaFimDate > maxTime) {
                return res.status(400).json({ error: 'Horário deve estar entre 7h e 20h' });
            }

            if (horaInicioDate >= horaFimDate) {
                return res.status(400).json({ error: 'Hora de início deve ser menor que hora de fim' });
            }

            const sobreposicao = await db.query(
                `SELECT * FROM tbDisponibilidade 
                 WHERE idMedico = $1 
                 AND diaSemana = $2 
                 AND (
                     (horaInicio <= $3 AND horaFim > $3) 
                     OR (horaInicio < $4 AND horaFim >= $4) 
                     OR (horaInicio >= $3 AND horaFim <= $4)
                 )`,
                [idMedico, diaSemana, horaInicio, horaFim]
            );

            if (sobreposicao.rowCount > 0) {
                return res.status(400).json({ error: 'Já existe disponibilidade cadastrada neste horário' });
            }

            const result = await db.query(
                `INSERT INTO tbDisponibilidade 
                 (idMedico, diaSemana, horaInicio, horaFim) 
                 VALUES ($1, $2, $3, $4) 
                 RETURNING *`,
                [idMedico, diaSemana, horaInicio, horaFim]
            );

            res.json(result.rows[0]);
        } catch (error) {
            console.error('Erro detalhado:', error);
            res.status(500).json({ 
                error: 'Erro interno do servidor',
                details: error.message
            });
        }
    },

    async listar(req, res) {
        const idUser = req.user.id;

        try {

            const funcResult = await db.query(
                'SELECT idFunc FROM tbFunc WHERE idUser = $1',
                [idUser]
            );

            if (funcResult.rowCount === 0) {
                return res.status(404).json({ error: 'Funcionário não encontrado' });
            }

            const idFunc = funcResult.rows[0].idfunc;


            const medicoResult = await db.query(
                'SELECT idMedico FROM tbMedico WHERE idFunc = $1',
                [idFunc]
            );

            if (medicoResult.rowCount === 0) {
                return res.status(404).json({ error: 'Médico não encontrado' });
            }

            const idMedico = medicoResult.rows[0].idmedico;

            const result = await db.query(
                'SELECT * FROM tbDisponibilidade WHERE idMedico = $1 ORDER BY diaSemana, horaInicio',
                [idMedico]
            );

            res.json(result.rows);
        } catch (error) {
            console.error('Erro ao listar disponibilidades:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    },

    async excluir(req, res) {
        const { id } = req.params;
        const idMedico = req.user.id;

        try {
            const result = await db.query(
                'DELETE FROM tbDisponibilidade WHERE idDisponibilidade = $1 AND idMedico = $2 RETURNING *',
                [id, idMedico]
            );
            
            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'Disponibilidade não encontrada' });
            }
            
            res.json({ message: 'Disponibilidade excluída com sucesso' });
        } catch (error) {
            console.error('Erro ao excluir disponibilidade:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
};

module.exports = disponibilidadeController;