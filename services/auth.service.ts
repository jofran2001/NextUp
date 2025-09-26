import axios from 'axios';

// Para emulador Android use 10.0.2.2, para dispositivo físico/Expo Go use seu IP local
// Se estiver testando no Expo Go (celular), use: 'http://192.168.1.125:5000/api/users'
// Se estiver testando no emulador Android, use: 'http://10.0.2.2:5000/api/users'
const API_BASE_URL = 'http://192.168.1.125:5000/api/users';

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

class AuthService {
  async login(data: LoginData): Promise<AuthResponse> {
    try {
      console.log('Fazendo login para:', data.email);
      console.log('URL:', `${API_BASE_URL}/login`);
      
      const response = await axios.post(`${API_BASE_URL}/login`, data, {
        timeout: 10000, // 10 segundos de timeout
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Login bem-sucedido:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Erro no login:', error);
      if (error.code === 'ECONNABORTED') {
        throw new Error('Tempo limite excedido. Verifique sua conexão.');
      }
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Não foi possível conectar ao servidor.');
      }
      throw new Error(error.response?.data?.message || 'Erro ao fazer login');
    }
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      console.log('Fazendo cadastro para:', data.email);
      console.log('URL:', `${API_BASE_URL}/register`);
      
      const response = await axios.post(`${API_BASE_URL}/register`, data, {
        timeout: 10000, // 10 segundos de timeout
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Cadastro bem-sucedido:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Erro no cadastro:', error);
      if (error.code === 'ECONNABORTED') {
        throw new Error('Tempo limite excedido. Verifique sua conexão.');
      }
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Não foi possível conectar ao servidor.');
      }
      throw new Error(error.response?.data?.message || 'Erro ao criar conta');
    }
  }
}

export default new AuthService();
