const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const userRoutes = require('./routes/userPacRoutes');
const funcRoutes = require('./routes/funcRoutes');
const agendamentoRoutes = require('./routes/agendamentoRoutes');
const disponibilidadeRoutes = require('./routes/disponibilidadeRoutes');


const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use('/api/users', userRoutes);
app.use('/api/funcs', funcRoutes);
app.use('/api/agendamentos', agendamentoRoutes);
app.use('/api/disponibilidade', disponibilidadeRoutes);

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log('Conectado ao banco de dados!');
});

app.get('/', (req, res) => {
    res.send('Servidor rodando! Bem-vindo ao sistema de consultas.');
});

app._router.stack.forEach(function(r){
    if (r.route && r.route.path){
        console.log('Rota registrada:', r.route.path)
    }
});
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});