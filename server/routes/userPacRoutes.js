const express = require('express');
const router = express.Router();
const userController = require('../controller/userPacController');

router.post('/registerPaciente', userController.registerPaciente);
router.post('/login', userController.login);

module.exports = router;
