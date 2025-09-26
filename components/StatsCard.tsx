import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import TaskService, { TaskStats } from '../services/task.service';

interface StatsCardProps {
  onStatsLoad?: () => void;
}

export default function StatsCard({ onStatsLoad }: StatsCardProps) {
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const statsData = await TaskService.getDashboardStats();
      setStats(statsData);
      onStatsLoad?.();
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={styles.loadingText}>Carregando estatísticas...</Text>
        </View>
      </View>
    );
  }

  if (!stats) {
    return (
      <TouchableOpacity style={styles.container} onPress={loadStats}>
        <Text style={styles.errorText}>Erro ao carregar estatísticas</Text>
        <Text style={styles.retryText}>Toque para tentar novamente</Text>
      </TouchableOpacity>
    );
  }

  // Organizar estatísticas por status
  const statusCounts = stats.statusStats.reduce((acc, stat) => {
    acc[stat._id] = stat.count;
    return acc;
  }, {} as Record<string, number>);

  const completedTasks = statusCounts['concluida'] || 0;
  const pendingTasks = statusCounts['pendente'] || 0;
  const inProgressTasks = statusCounts['em-andamento'] || 0;
  const completionRate = stats.totalTasks > 0 ? Math.round((completedTasks / stats.totalTasks) * 100) : 0;

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#3B82F6", "#10B981"]} style={styles.header}>
        <Text style={styles.title}>Resumo das Tarefas</Text>
        <TouchableOpacity onPress={loadStats} style={styles.refreshButton}>
          <Text style={styles.refreshIcon}>🔄</Text>
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.content}>
        {/* Stats principais */}
        <View style={styles.mainStats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.totalTasks}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#10B981' }]}>{completedTasks}</Text>
            <Text style={styles.statLabel}>Concluídas</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#3B82F6' }]}>{inProgressTasks}</Text>
            <Text style={styles.statLabel}>Em Andamento</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{pendingTasks}</Text>
            <Text style={styles.statLabel}>Pendentes</Text>
          </View>
        </View>

        {/* Barra de progresso */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Taxa de Conclusão</Text>
            <Text style={styles.progressPercentage}>{completionRate}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${completionRate}%` }
              ]} 
            />
          </View>
        </View>

        {/* Alertas */}
        {stats.overdueTasks > 0 && (
          <View style={styles.alertSection}>
            <View style={styles.alert}>
              <Text style={styles.alertIcon}>⚠️</Text>
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>Tarefas em Atraso</Text>
                <Text style={styles.alertText}>
                  Você tem {stats.overdueTasks} tarefa{stats.overdueTasks > 1 ? 's' : ''} em atraso
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Estatísticas detalhadas */}
        <View style={styles.detailedStats}>
          <Text style={styles.detailedTitle}>Por Status</Text>
          <View style={styles.statusGrid}>
            {stats.statusStats.map((stat) => {
              const statusInfo = getStatusInfo(stat._id);
              return (
                <View key={stat._id} style={styles.statusItem}>
                  <View 
                    style={[
                      styles.statusIndicator, 
                      { backgroundColor: statusInfo.color }
                    ]} 
                  />
                  <Text style={styles.statusLabel}>{statusInfo.label}</Text>
                  <Text style={styles.statusCount}>{stat.count}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

// Helper function para obter informações do status
function getStatusInfo(status: string) {
  const statusMap: Record<string, { label: string; color: string }> = {
    'pendente': { label: 'Pendente', color: '#F59E0B' },
    'em-andamento': { label: 'Em Andamento', color: '#3B82F6' },
    'concluida': { label: 'Concluída', color: '#10B981' },
    'alta': { label: 'Alta Prioridade', color: '#EF4444' },
    'media': { label: 'Média Prioridade', color: '#F59E0B' },
    'baixa': { label: 'Baixa Prioridade', color: '#10B981' }
  };
  
  return statusMap[status] || { label: status, color: '#6B7280' };
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  refreshButton: {
    padding: 4,
  },
  refreshIcon: {
    fontSize: 16,
    color: '#fff',
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 4,
  },
  retryText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  mainStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  progressSection: {
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  alertSection: {
    marginBottom: 20,
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  alertIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 2,
  },
  alertText: {
    fontSize: 12,
    color: '#92400E',
  },
  detailedStats: {
    marginTop: 8,
  },
  detailedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  statusGrid: {
    gap: 8,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusLabel: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
  },
  statusCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    minWidth: 20,
    textAlign: 'right',
  },
});
