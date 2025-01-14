const db = require('../../config/dbConfig');

const agendamentoController = {
    buscarPacientePorUserId: async (req, res) => {
        try {
            const idUser = req.params.idUser;
            
            const query = 'SELECT idpaciente FROM tbpaciente WHERE iduser = $1';
            const result = await db.query(query, [idUser]);
    
            if (result.rows.length === 0) {
                return res.status(404).json({
                    message: 'Paciente não encontrado'
                });
            }
    
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Erro ao buscar paciente:', error);
            res.status(500).json({
                message: 'Erro ao buscar paciente',
                error: error.message
            });
        }
    },


     
    criarAgendamento: async (req, res) => {
        try {
            const { idPaciente, idMedico, dataConsulta, horaConsulta, status } = req.body;
    
            
            const disponibilidadeQuery = `
                SELECT * FROM tbdisponibilidade
                WHERE idmedico = $1 
                AND diasemana = EXTRACT(DOW FROM $2::DATE)
                AND $3::TIME BETWEEN horainicio AND horafim`;
    
            const disponibilidade = await db.query(disponibilidadeQuery, [
                idMedico,
                dataConsulta,
                horaConsulta
            ]);
    
            if (disponibilidade.rows.length === 0) {
                return res.status(400).json({
                    message: 'Horário fora da disponibilidade do médico'
                });
            }
    
           
            const verificacaoQuery = `
                SELECT * FROM tbagendamento 
                WHERE idmedico = $1 
                AND dataconsulta = $2 
                AND horaconsulta = $3
                AND status != 'cancelado'`;
    
            const verificacao = await db.query(verificacaoQuery, [
                idMedico,
                dataConsulta,
                horaConsulta
            ]);
    
            if (verificacao.rows.length > 0) {
                return res.status(400).json({
                    message: 'Horário já está ocupado'
                });
            }
    
           
            const novoAgendamento = await db.query(
                'INSERT INTO tbagendamento (idpaciente, idmedico, dataconsulta, horaconsulta, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [idPaciente, idMedico, dataConsulta, horaConsulta, status]
            );
    
            res.status(201).json({
                message: 'Agendamento criado com sucesso',
                agendamento: novoAgendamento.rows[0]
            });
    
        } catch (error) {
            console.error('Erro ao criar agendamento:', error);
            res.status(500).json({
                message: 'Erro ao criar agendamento',
                error: error.message
            });
        }
    },


   
    async listarAgendamentosPaciente(req, res) {
        const { idPaciente } = req.params;

        if (!idPaciente || isNaN(idPaciente)) {
            return res.status(400).json({ message: 'ID do paciente inválido ou não fornecido.' });
        }

        try {
            const query = `
                SELECT 
                    a.*,
                    m.crm,
                    u.nome as nome_medico,
                    e.nome as especialidade
                FROM tbagendamento a
                JOIN tbmedico m ON a.idmedico = m.idmedico
                JOIN tbfunc f ON m.idfunc = f.idfunc
                JOIN tbuser u ON f.iduser = u.iduser
                JOIN tbespecialidade e ON m.idespecialidade = e.idespecialidade
                WHERE a.idpaciente = $1
                ORDER BY 
                    CASE 
                        WHEN a.status = 'confirmado' AND (
                            a.dataconsulta > CURRENT_DATE 
                            OR (a.dataconsulta = CURRENT_DATE AND a.horaconsulta > CURRENT_TIME)
                        ) THEN 1
                        WHEN a.status = 'confirmado' THEN 2
                        WHEN a.status = 'concluido' THEN 3
                        WHEN a.status = 'cancelado' THEN 4
                        ELSE 5
                    END,
                    a.dataconsulta DESC,
                    a.horaconsulta DESC
            `;
            const result = await db.query(query, [parseInt(idPaciente)]);
            res.json(result.rows);
        } catch (error) {
            console.error('Erro ao listar agendamentos do paciente:', error);
            res.status(500).json({ message: 'Erro interno ao listar agendamentos.', error: error.message });
        }
    },

    
    editarAgendamento: async (req, res) => {
        const { idAgendamento } = req.params;
        const { dataConsulta, horaConsulta } = req.body;

        if (!idAgendamento || isNaN(idAgendamento)) {
            return res.status(400).json({ message: 'ID do agendamento inválido ou não fornecido.' });
        }

        if (!dataConsulta || !horaConsulta) {
            return res.status(400).json({ message: 'Data e hora são obrigatórias.' });
        }

        try {
           
            const agendamentoAtual = await db.query(
                'SELECT * FROM tbAgendamento WHERE idAgendamento = $1',
                [parseInt(idAgendamento)]
            );

            if (agendamentoAtual.rows.length === 0) {
                return res.status(404).json({ message: 'Agendamento não encontrado.' });
            }

            if (agendamentoAtual.rows[0].status === 'cancelado') {
                return res.status(400).json({ message: 'Não é possível editar um agendamento cancelado.' });
            }

           
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            const novaData = new Date(dataConsulta);
            novaData.setHours(0, 0, 0, 0);

            if (novaData < hoje) {
                return res.status(400).json({ message: 'Não é possível reagendar para uma data passada.' });
            }

            
            const disponibilidade = await verificarDisponibilidadeHelper(
                agendamentoAtual.rows[0].idmedico,
                dataConsulta,
                horaConsulta,
                parseInt(idAgendamento)
            );

            if (!disponibilidade) {
                return res.status(400).json({ message: 'Novo horário não disponível.' });
            }

            const query = `
                UPDATE tbAgendamento
                SET dataConsulta = $1, horaConsulta = $2
                WHERE idAgendamento = $3
                RETURNING *
            `;
            const result = await db.query(query, [dataConsulta, horaConsulta, parseInt(idAgendamento)]);
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Erro ao editar agendamento:', error);
            res.status(500).json({ message: 'Erro interno ao editar agendamento.', error: error.message });
        }
    },


    async cancelarAgendamento(req, res) {
        const { idAgendamento } = req.params;
    
        if (!idAgendamento || isNaN(idAgendamento)) {
            return res.status(400).json({ 
                message: 'ID do agendamento inválido ou não fornecido.' 
            });
        }
    
        try {
  
            const verificacao = await db.query(`
                SELECT *
                FROM tbagendamento
                WHERE idagendamento = $1
                AND status != 'cancelado'
                AND (
                    dataconsulta > CURRENT_DATE
                    OR (
                        dataconsulta = CURRENT_DATE
                        AND horaconsulta > CURRENT_TIME
                    )
                )
            `, [idAgendamento]);
    
            if (verificacao.rows.length === 0) {
                return res.status(400).json({
                    message: 'Agendamento não pode ser cancelado'
                });
            }
    

            const query = `
                UPDATE tbagendamento
                SET status = 'cancelado'
                WHERE idagendamento = $1
                RETURNING *
            `;
    
            const result = await db.query(query, [idAgendamento]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({
                    message: 'Agendamento não encontrado'
                });
            }
    
            res.json({
                message: 'Agendamento cancelado com sucesso',
                agendamento: result.rows[0]
            });
        } catch (error) {
            console.error('Erro ao cancelar agendamento:', error);
            res.status(500).json({
                message: 'Erro ao cancelar agendamento',
                error: error.message
            });
        }
    },


    async buscarDisponibilidade(req, res) {
        const { idMedico } = req.params;

        if (!idMedico || isNaN(idMedico)) {
            return res.status(400).json({ message: 'ID do médico inválido ou não fornecido.' });
        }

        try {
            const query = `
                SELECT *
                FROM tbDisponibilidade
                WHERE idMedico = $1
                ORDER BY diaSemana, horaInicio
            `;
            const result = await db.query(query, [parseInt(idMedico)]);
            res.json(result.rows);
        } catch (error) {
            console.error('Erro ao buscar disponibilidade:', error);
            res.status(500).json({ message: 'Erro interno ao buscar disponibilidade.', error: error.message });
        }
    },


    async listarEspecialidades(req, res) {
        try {
            const query = 'SELECT * FROM tbEspecialidade ORDER BY nome';
            const result = await db.query(query);
            res.json(result.rows);
        } catch (error) {
            console.error('Erro ao listar especialidades:', error);
            res.status(500).json({ message: 'Erro interno ao listar especialidades.', error: error.message });
        }
    },

    async listarMedicosPorEspecialidade(req, res) {
        const { idEspecialidade } = req.params;

        if (!idEspecialidade || isNaN(idEspecialidade)) {
            return res.status(400).json({ message: 'ID da especialidade inválido ou não fornecido.' });
        }

        try {
            const query = `
                SELECT 
                    m.*,
                    u.nome,
                    f.cargoFunc,
                    array_agg(DISTINCT d.diaSemana) as dias_atendimento
                FROM tbMedico m
                JOIN tbFunc f ON m.idFunc = f.idFunc
                JOIN tbUser u ON f.idUser = u.idUser
                LEFT JOIN tbDisponibilidade d ON m.idMedico = d.idMedico
                WHERE m.idEspecialidade = $1 AND m.ativo = true
                GROUP BY m.idMedico, u.nome, f.cargoFunc
                ORDER BY u.nome
            `;
            const result = await db.query(query, [parseInt(idEspecialidade)]);
            res.json(result.rows);
        } catch (error) {
            console.error('Erro ao listar médicos por especialidade:', error);
            res.status(500).json({ message: 'Erro interno ao listar médicos.', error: error.message });
        }
    },

    
    verificarHorariosOcupados: async (req, res) => {
        try {
            const { idMedico, data } = req.body;
            
            
            console.log('Dados recebidos:', {
                idMedico: idMedico,
                data: data,
                body: req.body
            });

            
            if (!idMedico) {
                return res.status(400).json({
                    success: false,
                    message: 'ID do médico é obrigatório'
                });
            }

            if (!data) {
                return res.status(400).json({
                    success: false,
                    message: 'Data é obrigatória'
                });
            }

            
            const query = `
                SELECT horaconsulta 
                FROM tbagendamento 
                WHERE idmedico = $1 
                AND dataconsulta = $2
                AND status != 'cancelado'
            `;

            const result = await db.query(query, [idMedico, data]);
            
            
            console.log('Resultado da query:', result.rows);

            
            const horariosOcupados = result.rows.map(row => {
                
                if (row.horaconsulta && typeof row.horaconsulta === 'string') {
                    return row.horaconsulta.slice(0, 5);
                }
                return null;
            }).filter(Boolean); 

           
            res.json({
                success: true,
                horariosOcupados: horariosOcupados
            });

        } catch (error) {
            console.error('Erro ao verificar horários:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao verificar horários',
                error: error.message
            });
        }
    },
    
    verificarDisponibilidade: async (req, res) => {
        try {
            const { idAgendamento, dataConsulta, horaConsulta, idMedico } = req.body;
    
          
            if (!dataConsulta || !horaConsulta || !idMedico) {
                return res.status(400).json({
                    success: false,
                    message: 'Data, hora e ID do médico são obrigatórios'
                });
            }
    
            
            const disponibilidadeQuery = `
                SELECT * FROM tbdisponibilidade
                WHERE idmedico = $1 
                AND diasemana = EXTRACT(DOW FROM $2::DATE)
                AND $3::TIME BETWEEN horainicio AND horafim`;
    
            const disponibilidade = await db.query(disponibilidadeQuery, [
                idMedico,
                dataConsulta,
                horaConsulta
            ]);
    
            if (disponibilidade.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Horário fora da disponibilidade do médico'
                });
            }
    
          
            const verificacaoQuery = `
                SELECT * FROM tbagendamento 
                WHERE idmedico = $1 
                AND dataconsulta = $2 
                AND horaconsulta = $3
                AND status != 'cancelado'
                AND idagendamento != $4`;
    
            const verificacao = await db.query(verificacaoQuery, [
                idMedico,
                dataConsulta,
                horaConsulta,
                idAgendamento
            ]);
    
            if (verificacao.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Horário já está ocupado por outro agendamento ativo'
                });
            }
    
            
            res.json({
                success: true,
                message: 'Horário disponível para agendamento',
                disponivel: true
            });
    
        } catch (error) {
            console.error('Erro ao verificar disponibilidade:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao verificar disponibilidade',
                error: error.message
            });
        }
    },



    async buscarAgendamentosPaciente(req, res) {
        const { idPaciente } = req.params;
        console.log('ID do paciente recebido:', idPaciente);
        try {
            const query = `
                SELECT 
                    a.idagendamento,
                    a.dataconsulta,
                    a.horaconsulta,
                    a.status,
                    m.crm,
                    u.nome as nome_medico,
                    e.nome as especialidade
                FROM tbagendamento a
                JOIN tbmedico m ON a.idmedico = m.idmedico
                JOIN tbfunc f ON m.idfunc = f.idfunc
                JOIN tbuser u ON f.iduser = u.iduser
                JOIN tbespecialidade e ON m.idespecialidade = e.idespecialidade
                WHERE a.idpaciente = $1
                AND a.status = 'confirmado'
                AND (
                    a.dataconsulta > CURRENT_DATE 
                    OR (
                        a.dataconsulta = CURRENT_DATE 
                        AND a.horaconsulta > CURRENT_TIME
                    )
                )
                ORDER BY a.dataconsulta, a.horaconsulta
            `;

            const result = await db.query(query, [idPaciente]);
            res.json(result.rows);
        } catch (error) {
            console.error('Erro ao buscar agendamentos do paciente:', error);
            res.status(500).json({
                message: 'Erro ao buscar agendamentos',
                error: error.message
            });
        }
    },


    async buscarConsultasSemanalMedico(req, res) {
        const { idMedico } = req.params;

        try {
            const query = `
                SELECT 
                    a.*,
                    p.*,
                    u.nome AS nome_paciente,
                    CASE 
                        WHEN a.dataConsulta = CURRENT_DATE THEN true
                        ELSE false
                    END AS eh_hoje
                FROM tbAgendamento a
                JOIN tbPaciente p ON a.idPaciente = p.idPaciente
                JOIN tbUser u ON p.idUser = u.idUser
                WHERE a.idMedico = $1
                AND a.status IN ('confirmado', 'pendente') -- Modificado para incluir mais status
                ORDER BY 
                    a.dataConsulta ASC,
                    a.horaConsulta ASC
            `;

            const result = await db.query(query, [idMedico]);
            res.json(result.rows);
        } catch (error) {
            console.error('Erro ao buscar consultas do médico:', error);
            res.status(500).json({
                message: 'Erro ao buscar consultas',
                error: error.message
            });
        }
    },


    async cancelarAgendamento(req, res) {
        const { idAgendamento } = req.params;

        try {
        
            const verificacao = await db.query(`
                SELECT *
                FROM tbagendamento
                WHERE idagendamento = $1
                AND status = 'confirmado'
                AND (
                    dataconsulta > CURRENT_DATE
                    OR (
                        dataconsulta = CURRENT_DATE
                        AND horaconsulta > CURRENT_TIME
                    )
                )
            `, [idAgendamento]);

            if (verificacao.rows.length === 0) {
                return res.status(400).json({
                    message: 'Agendamento não pode ser cancelado'
                });
            }

           
            const query = `
                UPDATE tbagendamento
                SET status = 'cancelado'
                WHERE idagendamento = $1
                RETURNING *
            `;

            const result = await db.query(query, [idAgendamento]);
            res.json({
                message: 'Agendamento cancelado com sucesso',
                agendamento: result.rows[0]
            });
        } catch (error) {
            console.error('Erro ao cancelar agendamento:', error);
            res.status(500).json({
                message: 'Erro ao cancelar agendamento',
                error: error.message
            });
        }
    },


    async atualizarAgendamento(req, res) {
        const { idAgendamento } = req.params;
        const { dataConsulta, horaConsulta } = req.body;

        try {
        
            const verificacao = await db.query(`
                SELECT a.*, m.idmedico
                FROM tbagendamento a
                JOIN tbmedico m ON a.idmedico = m.idmedico
                WHERE a.idagendamento = $1
                AND a.status = 'confirmado'
                AND (
                    a.dataconsulta > CURRENT_DATE
                    OR (
                        a.dataconsulta = CURRENT_DATE
                        AND a.horaconsulta > CURRENT_TIME
                    )
                )
            `, [idAgendamento]);

            if (verificacao.rows.length === 0) {
                return res.status(400).json({
                    message: 'Agendamento não pode ser atualizado'
                });
            }

            const idMedico = verificacao.rows[0].idmedico;

            
            const disponibilidade = await verificarDisponibilidade(
                idMedico,
                dataConsulta,
                horaConsulta
            );

            if (!disponibilidade) {
                return res.status(400).json({
                    message: 'Horário não disponível'
                });
            }

            
            const query = `
                UPDATE tbagendamento
                SET dataconsulta = $1, horaconsulta = $2
                WHERE idagendamento = $3
                RETURNING *
            `;

            const result = await db.query(query, [
                dataConsulta,
                horaConsulta,
                idAgendamento
            ]);

            res.json({
                message: 'Agendamento atualizado com sucesso',
                agendamento: result.rows[0]
            });
        } catch (error) {
            console.error('Erro ao atualizar agendamento:', error);
            res.status(500).json({
                message: 'Erro ao atualizar agendamento',
                error: error.message
            });
        }
    },
    async listarAgendamentosMedico(req, res) {
        const { idMedico } = req.params;
        console.log('Buscando agendamentos para o médico:', idMedico);
        if (!idMedico || isNaN(idMedico)) {
            return res.status(400).json({ message: 'ID do médico inválido ou não fornecido.' });
        }

        try {
            const query = `
                SELECT 
                    a.*,
                    p.*,
                    u.nome AS nome_paciente,
                    CASE 
                        WHEN a.dataConsulta = CURRENT_DATE THEN true
                        ELSE false
                    END AS eh_hoje
                FROM tbAgendamento a
                JOIN tbPaciente p ON a.idPaciente = p.idPaciente
                JOIN tbUser u ON p.idUser = u.idUser
                WHERE a.idMedico = $1
                ORDER BY 
                    CASE 
                        WHEN a.status = 'confirmado' AND (
                            a.dataconsulta > CURRENT_DATE 
                            OR (a.dataconsulta = CURRENT_DATE AND a.horaconsulta > CURRENT_TIME)
                        ) THEN 1
                        WHEN a.status = 'confirmado' THEN 2
                        WHEN a.status = 'concluido' THEN 3
                        WHEN a.status = 'cancelado' THEN 4
                        ELSE 5
                    END,
                    a.dataconsulta DESC,
                    a.horaconsulta DESC
            `;
            const result = await db.query(query, [parseInt(idMedico)]);
            console.log('Agendamentos encontrados:', result.rows.length);
            res.json(result.rows);
        } catch (error) {
            console.error('Erro ao listar agendamentos do médico:', error);
            res.status(500).json({ message: 'Erro interno ao listar agendamentos.', error: error.message });
        }
    },
    buscarAgendamento: async (req, res) => {
        const { idAgendamento } = req.params;
    
        try {
            const query = `
                SELECT 
                    a.*,
                    m.idmedico,
                    m.crm,
                    u.nome AS nome_medico,
                    e.nome AS especialidade
                FROM tbagendamento a
                JOIN tbmedico m ON a.idmedico = m.idmedico
                JOIN tbfunc f ON m.idfunc = f.idfunc
                JOIN tbuser u ON f.iduser = u.iduser
                JOIN tbespecialidade e ON m.idespecialidade = e.idespecialidade
                WHERE a.idagendamento = $1
            `;
            
            const result = await db.query(query, [idAgendamento]);
    
            if (result.rows.length === 0) {
                return res.status(404).json({
                    message: 'Agendamento não encontrado'
                });
            }
    
            res.json(result.rows[0]);
        } catch (error) {
            res.status(500).json({ 
                message: 'Erro ao buscar agendamento',
                error: error.message 
            });
        }
    },
   
    buscarMedicoPorUserId: async (req, res) => {
        try {
            const idUser = req.params.idUser;
            
            const query = `
                SELECT m.idmedico 
                FROM tbmedico m
                JOIN tbfunc f ON m.idfunc = f.idfunc
                WHERE f.iduser = $1`;
                
            const result = await db.query(query, [idUser]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    message: 'Médico não encontrado'
                });
            }

            res.json(result.rows[0]);
        } catch (error) {
            console.error('Erro ao buscar médico:', error);
            res.status(500).json({
                message: 'Erro ao buscar médico',
                error: error.message
            });
        }
    },
    buscarDetalhesPaciente: async (req, res) => {
        const { idPaciente } = req.params;
        
        
        if (!idPaciente || isNaN(idPaciente)) {
            return res.status(400).json({
                message: 'ID do paciente inválido'
            });
        }
        
        try {
            const query = `
                SELECT 
                    p.*,
                    u.nome,
                    u.cpf,
                    u.email,
                    p.datanasc,
                    p.genero,
                    p.tipo_sanguineo,
                    p.observacoes
                FROM tbpaciente p
                JOIN tbuser u ON p.iduser = u.iduser
                WHERE p.idpaciente = $1
            `;
            
            console.log('Query params:', [idPaciente]);
            const result = await db.query(query, [idPaciente]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({
                    message: 'Paciente não encontrado'
                });
            }
            
            
            res.setHeader('Content-Type', 'application/json');
            res.json(result.rows[0]);
            
        } catch (error) {
            console.error('Erro detalhado:', error);
            res.status(500).json({
                message: 'Erro ao buscar detalhes do paciente',
                error: error.message
            });
        }
    },

    concluirConsulta: async (req, res) => {
        const { idAgendamento } = req.params;
        console.log('Recebido idAgendamento:', idAgendamento);
    
        try {
            const query = `
                UPDATE tbagendamento
                SET status = 'concluido'
                WHERE idagendamento = $1
                RETURNING *
            `;
            console.log('Executando query:', query, 'com parâmetros:', [idAgendamento]);
    
            const result = await db.query(query, [idAgendamento]);
            console.log('Resultado da query:', result.rows);
    
            if (result.rows.length === 0) {
                return res.status(404).json({
                    message: 'Agendamento não encontrado'
                });
            }
    
            res.json({
                message: 'Consulta concluída com sucesso',
                agendamento: result.rows[0]
            });
        } catch (error) {
            console.error('Erro ao concluir consulta:', error);
            res.status(500).json({
                message: 'Erro ao concluir consulta',
                error: error.message
            });
        }
    }

        
};


async function verificarDisponibilidade(idMedico, data, hora) {
    if (!idMedico || isNaN(idMedico)) {
        return false;
    }

    try {
        const diaSemana = new Date(data).getDay();
        
        const disponibilidadeQuery = `
            SELECT *
            FROM tbDisponibilidade
            WHERE idMedico = $1
            AND diaSemana = $2
            AND horaInicio <= $3
            AND horaFim > $3
        `;
        const disponibilidade = await db.query(disponibilidadeQuery, [parseInt(idMedico), diaSemana, hora]);

        if (disponibilidade.rows.length === 0) {
            return false;
        }

        const conflitosQuery = `
            SELECT *
            FROM tbAgendamento
            WHERE idMedico = $1
            AND dataConsulta = $2
            AND horaConsulta = $3
            AND status != 'cancelado' 
        `;
        const conflitos = await db.query(conflitosQuery, [parseInt(idMedico), data, hora]);

        return conflitos.rows.length === 0;
    } catch (error) {
        console.error('Erro ao verificar disponibilidade:', error);
        return false;
    }
}

async function verificarDisponibilidadeHelper(idMedico, dataConsulta, horaConsulta, idAgendamento) {

    const disponibilidadeQuery = `
        SELECT * FROM tbdisponibilidade
        WHERE idmedico = $1 
        AND diasemana = EXTRACT(DOW FROM $2::DATE)
        AND $3::TIME BETWEEN horainicio AND horafim`;

    const disponibilidade = await db.query(disponibilidadeQuery, [
        idMedico,
        dataConsulta,
        horaConsulta
    ]);

    if (disponibilidade.rows.length === 0) {
        return false;
    }

    const verificacaoQuery = `
        SELECT * FROM tbagendamento 
        WHERE idmedico = $1 
        AND dataconsulta = $2 
        AND horaconsulta = $3
        AND status != 'cancelado'
        AND idagendamento != $4`;

    const verificacao = await db.query(verificacaoQuery, [
        idMedico,
        dataConsulta,
        horaConsulta,
        idAgendamento
    ]);

    return verificacao.rows.length === 0;
}


module.exports = agendamentoController;
