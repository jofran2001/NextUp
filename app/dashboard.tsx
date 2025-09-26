import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Dimensions,
  Alert,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../hooks/useAuth';
import { router } from 'expo-router';
import TaskService, { Task as TaskType, TaskFilters } from '../services/task.service';
import TaskModal from '../components/TaskModal';
import FilterChips from '../components/FilterChips';
import StatsCard from '../components/StatsCard';
import NotificationStatus from '../components/NotificationStatus';
import NotificationService from '../services/notification.service';

const { width } = Dimensions.get('window');

export default function Dashboard() {
  const [searchText, setSearchText] = useState('');
  const [viewMode, setViewMode] = useState<'lista' | 'calendario'>('lista');
  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskType | null>(null);
  const [filters, setFilters] = useState<TaskFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Sair', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await logout();
              router.push('/');
            } catch (error) {
              console.error('Erro no logout:', error);
              router.push('/');
            }
          }
        },
      ]
    );
  };

  // Carregar tarefas
  const loadTasks = useCallback(async () => {
    try {
      const currentFilters = {
        ...filters,
        search: searchText || undefined
      };
      
      const response = await TaskService.getTasks(currentFilters);
      setTasks(response.tasks);
      
      // Agendar notificações para tarefas com prazo
      const tasksForNotifications = response.tasks
        .filter(task => task._id && task.dueDate)
        .map(task => ({
          _id: task._id!,
          title: task.title,
          dueDate: task.dueDate!,
          status: task.status
        }));
      
      await NotificationService.scheduleUpcomingTasksNotifications(tasksForNotifications);
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, searchText]);

  // Carregar tarefas ao montar o componente
  useEffect(() => {
    loadTasks();
    initializeNotifications();
  }, [loadTasks]);

  // Inicializar notificações
  const initializeNotifications = async () => {
    try {
      await NotificationService.registerForPushNotifications();
    } catch (error) {
      console.error('Erro ao inicializar notificações:', error);
    }
  };

  // Refresh das tarefas
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTasks();
  }, [loadTasks]);

  // Abrir modal para nova tarefa
  const handleNewTask = () => {
    setEditingTask(null);
    setShowTaskModal(true);
  };

  // Abrir modal para editar tarefa
  const handleEditTask = (task: TaskType) => {
    setEditingTask(task);
    setShowTaskModal(true);
  };

  // Fechar modal
  const handleCloseModal = () => {
    setShowTaskModal(false);
    setEditingTask(null);
  };

  // Callback após salvar tarefa
  const handleTaskSaved = () => {
    loadTasks();
  };

  // Callback para mudança de filtros
  const handleFiltersChange = (newFilters: TaskFilters) => {
    setFilters(newFilters);
  };

  // Toggle filtros
  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  // Deletar tarefa
  const handleDeleteTask = (task: TaskType) => {
    Alert.alert(
      'Confirmar exclusão',
      `Tem certeza que deseja deletar a tarefa "${task.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Deletar',
          style: 'destructive',
          onPress: async () => {
            try {
              await TaskService.deleteTask(task._id!);
              Alert.alert('Sucesso', 'Tarefa deletada com sucesso!');
              loadTasks();
            } catch (error: any) {
              Alert.alert('Erro', error.message);
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'alta': return '#EF4444';
      case 'media': return '#F59E0B';
      case 'baixa': return '#10B981';
      case 'em-andamento': return '#3B82F6';
      case 'pendente': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'alta': return 'Alta';
      case 'media': return 'Média';
      case 'baixa': return 'Baixa';
      case 'em-andamento': return 'Em andamento';
      case 'pendente': return 'Pendente';
      default: return status;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={["#3B82F6", "#10B981"]} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>TaskManager</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.profileButton} 
              onPress={() => router.push('/profile')}
            >
              <Text style={styles.profileIcon}>👤</Text>
            </TouchableOpacity>
            <Text style={styles.welcomeText}>Olá, {user?.name}</Text>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>Sair</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>Painel de Tarefas</Text>
          <Text style={styles.subtitle}>Gerencie suas tarefas e acompanhe o progresso</Text>
        </View>

        {/* Notification Status */}
        <NotificationStatus />

        {/* New Task Button */}
        <TouchableOpacity style={styles.newTaskButton} onPress={handleNewTask}>
          <Text style={styles.newTaskIcon}>+</Text>
          <Text style={styles.newTaskText}>Nova Tarefa</Text>
        </TouchableOpacity>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar tarefas, criador ou responsável"
              placeholderTextColor="#9CA3AF"
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={loadTasks}
            />
            <TouchableOpacity 
              style={[styles.filterToggle, showFilters && styles.filterToggleActive]} 
              onPress={toggleFilters}
            >
              <Text style={[styles.filterToggleText, showFilters && styles.filterToggleTextActive]}>
                🎛️
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Filtros */}
        {showFilters && (
          <FilterChips
            filters={filters}
            onFiltersChange={handleFiltersChange}
          />
        )}

        {/* Estatísticas */}
        <StatsCard onStatsLoad={loadTasks} />

        {/* View Toggle */}
        <View style={styles.viewToggle}>
          <TouchableOpacity 
            style={[styles.toggleButton, viewMode === 'lista' && styles.activeToggle]}
            onPress={() => setViewMode('lista')}
          >
            <Text style={styles.toggleIcon}>☰</Text>
            <Text style={[styles.toggleText, viewMode === 'lista' && styles.activeToggleText]}>
              Lista
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleButton, viewMode === 'calendario' && styles.activeToggle]}
            onPress={() => setViewMode('calendario')}
          >
            <Text style={styles.toggleIcon}>📅</Text>
            <Text style={[styles.toggleText, viewMode === 'calendario' && styles.activeToggleText]}>
              Calendário
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tasks List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Carregando tarefas...</Text>
          </View>
        ) : (
          <View style={styles.tasksList}>
            {tasks.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Nenhuma tarefa encontrada</Text>
                <Text style={styles.emptySubtext}>Clique em "Nova Tarefa" para começar</Text>
              </View>
            ) : (
              tasks.map((task) => (
                <TouchableOpacity 
                  key={task._id} 
                  style={styles.taskCard}
                  onPress={() => handleEditTask(task)}
                  onLongPress={() => handleDeleteTask(task)}
                >
                  <View style={styles.taskHeader}>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) }]}>
                      <Text style={styles.statusText}>{getStatusText(task.status)}</Text>
                    </View>
                  </View>
                  
                  <Text style={styles.taskDescription}>{task.description}</Text>
                  
                  <View style={styles.taskDetails}>
                    <View style={styles.taskInfo}>
                      <Text style={styles.taskLabel}>
                        🕒 Criado em {new Date(task.createdAt || '').toLocaleDateString('pt-BR')}
                      </Text>
                    </View>
                    <View style={styles.taskInfo}>
                      <Text style={styles.taskLabel}>👤 Criador: {task.creator?.name || 'Desconhecido'}</Text>
                    </View>
                    {task.responsible && (
                      <View style={styles.taskInfo}>
                        <Text style={styles.taskLabel}>👥 Responsável: {task.responsible.name}</Text>
                      </View>
                    )}
                    {task.dueDate && (
                      <View style={styles.taskInfo}>
                        <Text style={styles.taskLabel}>
                          📅 Vence em {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                        </Text>
                      </View>
                    )}
                    {task.isOverdue && (
                      <View style={styles.taskInfo}>
                        <Text style={[styles.taskLabel, styles.overdueText]}>
                          ⚠️ Tarefa em atraso
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>
      
      {/* Task Modal */}
      <TaskModal
        visible={showTaskModal}
        onClose={handleCloseModal}
        onTaskSaved={handleTaskSaved}
        editingTask={editingTask}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  welcomeText: {
    fontSize: 14,
    color: '#E0E7EF',
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  titleSection: {
    marginTop: 24,
    marginBottom: 20,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  newTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  newTaskIcon: {
    fontSize: 20,
    color: '#fff',
    marginRight: 8,
  },
  newTaskText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
    color: '#9CA3AF',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  filterToggle: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  filterToggleActive: {
    backgroundColor: '#3B82F6',
  },
  filterToggleText: {
    fontSize: 16,
    color: '#6B7280',
  },
  filterToggleTextActive: {
    color: '#fff',
  },
  viewToggle: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  activeToggle: {
    backgroundColor: '#3B82F6',
  },
  toggleIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeToggleText: {
    color: '#fff',
  },
  tasksList: {
    paddingBottom: 20,
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  taskDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  taskDetails: {
    gap: 4,
  },
  taskInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  overdueText: {
    color: '#EF4444',
    fontWeight: '600',
  },
  profileButton: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  profileIcon: {
    color: 'white',
    fontSize: 18,
  },
});
