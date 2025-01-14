const express = require('express');
const router = express.Router();
const funcController = require('../controller/funcController');


router.post('/registerFunc', funcController.registerFunc);
router.post('/registerFuncMed', funcController.registerFuncMed);



module.exports = router;