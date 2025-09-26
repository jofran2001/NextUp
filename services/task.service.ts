import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Para emulador Android use 10.0.2.2, para dispositivo físico/Expo Go use seu IP local
const API_BASE_URL = 'http://192.168.1.125:5000/api/tasks';

export interface Task {
  _id?: string;
  title: string;
  description: string;
  status: 'alta' | 'media' | 'baixa' | 'em-andamento' | 'pendente' | 'concluida';
  priority: 'baixa' | 'media' | 'alta';
  creator: {
    _id: string;
    name: string;
    email: string;
  };
  responsible?: {
    _id: string;
    name: string;
    email: string;
  };
  dueDate?: string;
  completedAt?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  isOverdue?: boolean;
  daysUntilDue?: number;
}

export interface CreateTaskData {
  title: string;
  description: string;
  status?: Task['status'];
  priority?: Task['priority'];
  responsible?: string;
  dueDate?: string;
  tags?: string[];
}

export interface UpdateTaskData extends Partial<CreateTaskData> {
  _id: string;
}

export interface TaskFilters {
  status?: string;
  priority?: string;
  responsible?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface TaskResponse {
  tasks: Task[];
  totalPages: number;
  currentPage: number;
  total: number;
}

export interface TaskStats {
  statusStats: Array<{
    _id: string;
    count: number;
  }>;
  overdueTasks: number;
  totalTasks: number;
}

class TaskService {
  // Método para obter o token de autenticação
  private async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('token');
    } catch (error) {
      console.error('Erro ao obter token:', error);
      return null;
    }
  }

  // Método para configurar headers com autenticação
  private async getAuthHeaders() {
    const token = await this.getAuthToken();
    console.log('Token obtido para requisição:', token ? `Bearer ${token.substring(0, 20)}...` : 'Nenhum token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  // Listar tarefas com filtros
  async getTasks(filters: TaskFilters = {}): Promise<TaskResponse> {
    try {
      console.log('Buscando tarefas com filtros:', filters);
      
      const headers = await this.getAuthHeaders();
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      const url = `${API_BASE_URL}?${params.toString()}`;
      console.log('URL da requisição:', url);

      const response = await axios.get(url, {
        headers,
        timeout: 10000
      });

      console.log('Tarefas obtidas:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao buscar tarefas:', error);
      if (error.code === 'ECONNABORTED') {
        throw new Error('Tempo limite excedido. Verifique sua conexão.');
      }
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Não foi possível conectar ao servidor.');
      }
      if (error.response?.status === 401) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }
      throw new Error(error.response?.data?.message || 'Erro ao buscar tarefas');
    }
  }

  // Buscar tarefa específica
  async getTask(taskId: string): Promise<Task> {
    try {
      console.log('Buscando tarefa:', taskId);
      
      const headers = await this.getAuthHeaders();
      const response = await axios.get(`${API_BASE_URL}/${taskId}`, {
        headers,
        timeout: 10000
      });

      console.log('Tarefa obtida:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao buscar tarefa:', error);
      throw new Error(error.response?.data?.message || 'Erro ao buscar tarefa');
    }
  }

  // Criar nova tarefa
  async createTask(taskData: CreateTaskData): Promise<Task> {
    try {
      console.log('Criando tarefa:', taskData);
      
      const headers = await this.getAuthHeaders();
      const response = await axios.post(API_BASE_URL, taskData, {
        headers,
        timeout: 10000
      });

      console.log('Tarefa criada:', response.data);
      return response.data.task;
    } catch (error: any) {
      console.error('Erro ao criar tarefa:', error);
      if (error.response?.status === 401) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }
      throw new Error(error.response?.data?.message || 'Erro ao criar tarefa');
    }
  }

  // Atualizar tarefa
  async updateTask(taskData: UpdateTaskData): Promise<Task> {
    try {
      console.log('Atualizando tarefa:', taskData);
      
      const headers = await this.getAuthHeaders();
      const { _id, ...updateData } = taskData;
      
      const response = await axios.put(`${API_BASE_URL}/${_id}`, updateData, {
        headers,
        timeout: 10000
      });

      console.log('Tarefa atualizada:', response.data);
      return response.data.task;
    } catch (error: any) {
      console.error('Erro ao atualizar tarefa:', error);
      if (error.response?.status === 401) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }
      if (error.response?.status === 403) {
        throw new Error('Você não tem permissão para editar esta tarefa.');
      }
      throw new Error(error.response?.data?.message || 'Erro ao atualizar tarefa');
    }
  }

  // Deletar tarefa
  async deleteTask(taskId: string): Promise<void> {
    try {
      console.log('Deletando tarefa:', taskId);
      
      const headers = await this.getAuthHeaders();
      await axios.delete(`${API_BASE_URL}/${taskId}`, {
        headers,
        timeout: 10000
      });

      console.log('Tarefa deletada com sucesso');
    } catch (error: any) {
      console.error('Erro ao deletar tarefa:', error);
      if (error.response?.status === 401) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }
      if (error.response?.status === 403) {
        throw new Error('Você não tem permissão para deletar esta tarefa.');
      }
      throw new Error(error.response?.data?.message || 'Erro ao deletar tarefa');
    }
  }

  // Marcar tarefa como concluída
  async completeTask(taskId: string): Promise<Task> {
    try {
      console.log('Marcando tarefa como concluída:', taskId);
      
      const headers = await this.getAuthHeaders();
      const response = await axios.post(`${API_BASE_URL}/${taskId}/complete`, {}, {
        headers,
        timeout: 10000
      });

      console.log('Tarefa concluída:', response.data);
      return response.data.task;
    } catch (error: any) {
      console.error('Erro ao concluir tarefa:', error);
      throw new Error(error.response?.data?.message || 'Erro ao concluir tarefa');
    }
  }

  // Obter estatísticas do dashboard
  async getDashboardStats(): Promise<TaskStats> {
    try {
      console.log('Buscando estatísticas do dashboard');
      
      const headers = await this.getAuthHeaders();
      const response = await axios.get(`${API_BASE_URL}/stats/dashboard`, {
        headers,
        timeout: 10000
      });

      console.log('Estatísticas obtidas:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao buscar estatísticas:', error);
      throw new Error(error.response?.data?.message || 'Erro ao buscar estatísticas');
    }
  }
}

export default new TaskService();
