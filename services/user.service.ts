import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://192.168.1.125:5000/api';

export interface UserUpdateData {
  name: string;
  email: string;
}

export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
}

export interface UserStats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  completionRate: number;
  createdThisMonth: number;
}

class UserService {
  private async getAuthToken(): Promise<string> {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      throw new Error('Token não encontrado');
    }
    return token;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    try {
      const token = await this.getAuthToken();
      console.log('Token obtido para requisição:', `Bearer ${token.substring(0, 20)}...`);
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro na requisição');
      }

      return data;
    } catch (error) {
      console.error('Erro na requisição:', error);
      throw error;
    }
  }

  async updateProfile(userData: UserUpdateData): Promise<any> {
    console.log('Atualizando perfil:', userData);
    
    const result = await this.makeRequest('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });

    console.log('Perfil atualizado:', result);
    return result;
  }

  async changePassword(passwordData: PasswordChangeData): Promise<any> {
    console.log('Alterando senha...');
    
    const result = await this.makeRequest('/users/change-password', {
      method: 'PUT',
      body: JSON.stringify(passwordData),
    });

    console.log('Senha alterada com sucesso');
    return result;
  }

  async getUserStats(): Promise<UserStats> {
    console.log('Buscando estatísticas do usuário');
    
    const result = await this.makeRequest('/users/stats', {
      method: 'GET',
    });

    console.log('Estatísticas obtidas:', result);
    return result;
  }
}

export default new UserService();
