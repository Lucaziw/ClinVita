const express = require('express');
const router = express.Router();
const agendamentoController = require('../controller/agendamentoController');

router.post('/novo', agendamentoController.criarAgendamento);
router.get('/buscar/:idAgendamento', agendamentoController.buscarAgendamento);
router.put('/:idAgendamento', agendamentoController.editarAgendamento);
router.put('/:idAgendamento/cancelar', agendamentoController.cancelarAgendamento);

router.get('/buscar-paciente/:idUser', agendamentoController.buscarPacientePorUserId);
router.get('/paciente/:idPaciente', agendamentoController.listarAgendamentosPaciente);
router.get('/paciente/:idPaciente/agendamentos', agendamentoController.buscarAgendamentosPaciente);

router.get('/medico/:idMedico', agendamentoController.listarAgendamentosMedico);
router.get('/medico/:idMedico/consultas', agendamentoController.buscarConsultasSemanalMedico);
router.get('/medico/:idMedico/disponibilidade', agendamentoController.buscarDisponibilidade);
router.get('/buscar-medico/:idUser', agendamentoController.buscarMedicoPorUserId);

router.get('/disponibilidade/:idMedico', agendamentoController.buscarDisponibilidade);
router.post('/horarios-ocupados', agendamentoController.verificarHorariosOcupados);

router.post('/verificar-horarios-ocupados', agendamentoController.verificarHorariosOcupados);
router.post('/verificar-disponibilidade', agendamentoController.verificarDisponibilidade);

router.get('/especialidades', agendamentoController.listarEspecialidades);
router.get('/especialidades/:idMedico', agendamentoController.listarEspecialidades);
router.get('/medicos/:idEspecialidade', agendamentoController.listarMedicosPorEspecialidade);

router.get('/pacientes/:idPaciente/detalhes', agendamentoController.buscarDetalhesPaciente);
router.put('/:idAgendamento/concluir', agendamentoController.concluirConsulta);


module.exports = router;