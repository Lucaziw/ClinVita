const express = require('express');
const router = express.Router();
const disponibilidadeController = require('../controller/disponibilidadeController');

// Middleware de verificação de token
router.use((req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }

    try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        if (!payload || payload.tipoUsuario !== 'medico') {
            return res.status(403).json({ error: 'Acesso não autorizado' });
        }
        req.user = payload;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido' });
    }
});

router.post('/', disponibilidadeController.adicionar);
router.get('/', disponibilidadeController.listar);
router.delete('/:id', disponibilidadeController.excluir);

module.exports = router;