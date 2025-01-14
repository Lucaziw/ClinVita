const registerUser = async (userData) => {
    try {
        const response = await fetch('http://localhost:3000/api/users/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        });
        if (response.ok) {
            const data = await response.json();
            console.log('Usuário registrado com ID:', data.id);
        } else {
            const error = await response.json();
            console.error('Erro ao registrar:', error);
        }
    } catch (err) {
        console.error('Erro na requisição:', err);
    }
};

const loginUser = async (credentials) => {
    try {
        const response = await fetch('http://localhost:3000/api/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
        });
        if (response.ok) {
            const data = await response.json();
            console.log('Token de autenticação:', data.token);
        } else {
            const error = await response.json();
            console.error('Erro ao fazer login:', error);
        }
    } catch (err) {
        console.error('Erro na requisição:', err);
    }
};

document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const cpf = document.getElementById('cpf').value;
    const senha = document.getElementById('senha').value;
    loginUser({ cpf, senha });
});
