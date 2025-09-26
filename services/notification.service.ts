import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configurar como as notificações devem ser tratadas
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface NotificationData {
  taskId: string;
  taskTitle: string;
  dueDate: string;
  type: 'due_today' | 'overdue' | 'due_soon';
}

class NotificationService {
  // Registrar para notificações push
  async registerForPushNotifications(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        console.log('Notificações push requerem um dispositivo físico');
        return null;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Permissão para notificações negada');
        return null;
      }

      // Configurar canal de notificação no Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      // Verificar se estamos no Expo Go (SDK 53+ não suporta push notifications)
      if (Constants.appOwnership === 'expo') {
        console.log('⚠️  Expo Go não suporta notificações push no SDK 53+');
        console.log('📱 Usando apenas notificações locais');
        return 'expo-go-local-only';
      }

      try {
        let token: string;
        // Para builds de desenvolvimento/produção
        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
        
        if (projectId) {
          token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
          console.log('Token Expo obtido:', token);
        } else {
          token = (await Notifications.getDevicePushTokenAsync()).data;
          console.log('Token de dispositivo obtido:', token);
        }

        // Salvar o token localmente
        await AsyncStorage.setItem('@push_token', token);
        return token;
      } catch (pushError) {
        console.warn('Erro ao obter token push, continuando com notificações locais:', pushError);
        return 'local-notifications-only';
      }
    } catch (error) {
      console.error('Erro ao configurar notificações:', error);
      return null;
    }
  }

  // Agendar notificação local para tarefa
  async scheduleTaskNotification(
    taskId: string,
    taskTitle: string,
    dueDate: Date,
    type: NotificationData['type'] = 'due_today'
  ): Promise<string | null> {
    try {
      const now = new Date();
      const due = new Date(dueDate);
      
      // Calcular quando notificar
      let triggerDate: Date;
      let title: string;
      let body: string;

      switch (type) {
        case 'due_today':
          // Notificar às 9h do dia do vencimento
          triggerDate = new Date(due);
          triggerDate.setHours(9, 0, 0, 0);
          title = '📅 Tarefa vence hoje!';
          body = `"${taskTitle}" vence hoje. Não esqueça de completá-la.`;
          break;
          
        case 'due_soon':
          // Notificar 1 dia antes às 18h
          triggerDate = new Date(due);
          triggerDate.setDate(triggerDate.getDate() - 1);
          triggerDate.setHours(18, 0, 0, 0);
          title = '⏰ Tarefa vence amanhã';
          body = `"${taskTitle}" vence amanhã. Prepare-se!`;
          break;
          
        case 'overdue':
          // Notificar imediatamente
          triggerDate = new Date(now.getTime() + 1000); // 1 segundo
          title = '🚨 Tarefa em atraso!';
          body = `"${taskTitle}" está em atraso. Complete o quanto antes.`;
          break;
          
        default:
          return null;
      }

      // Não agendar se a data já passou
      if (triggerDate <= now) {
        return null;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            taskId,
            taskTitle,
            dueDate: dueDate.toISOString(),
            type
          },
          sound: 'default',
        },
        trigger: { 
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: Math.floor((triggerDate.getTime() - Date.now()) / 1000) 
        },
      });

      // Salvar ID da notificação para poder cancelar depois
      await this.saveNotificationId(taskId, type, notificationId);
      
      console.log(`Notificação agendada para ${triggerDate.toLocaleString()}: ${title}`);
      return notificationId;
    } catch (error) {
      console.error('Erro ao agendar notificação:', error);
      return null;
    }
  }

  // Agendar todas as notificações para uma tarefa
  async scheduleAllTaskNotifications(taskId: string, taskTitle: string, dueDate: Date) {
    const notifications = await Promise.all([
      this.scheduleTaskNotification(taskId, taskTitle, dueDate, 'due_soon'),
      this.scheduleTaskNotification(taskId, taskTitle, dueDate, 'due_today'),
    ]);
    
    return notifications.filter(id => id !== null);
  }

  // Cancelar notificações de uma tarefa
  async cancelTaskNotifications(taskId: string) {
    try {
      const notificationIds = await this.getNotificationIds(taskId);
      
      if (notificationIds.length > 0) {
        for (const id of notificationIds) {
          await Notifications.cancelScheduledNotificationAsync(id);
        }
        await this.removeNotificationIds(taskId);
        console.log(`Canceladas ${notificationIds.length} notificações para tarefa ${taskId}`);
      }
    } catch (error) {
      console.error('Erro ao cancelar notificações:', error);
    }
  }

  // Verificar tarefas com prazo próximo e agendar notificações
  async scheduleUpcomingTasksNotifications(tasks: Array<{
    _id: string;
    title: string;
    dueDate: string;
    status: string;
  }>) {
    const now = new Date();
    
    for (const task of tasks) {
      // Só agendar para tarefas não concluídas
      if (task.status === 'concluida' || !task.dueDate || !task._id) {
        continue;
      }

      const dueDate = new Date(task.dueDate);
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Agendar notificações para tarefas que vencem em até 2 dias
      if (daysUntilDue >= 0 && daysUntilDue <= 2) {
        await this.scheduleAllTaskNotifications(task._id, task.title, dueDate);
      }
      
      // Notificar tarefas em atraso imediatamente
      if (daysUntilDue < 0) {
        await this.scheduleTaskNotification(task._id, task.title, dueDate, 'overdue');
      }
    }
  }

  // Salvar ID da notificação
  private async saveNotificationId(taskId: string, type: string, notificationId: string) {
    try {
      const key = `notifications_${taskId}`;
      const existingData = await AsyncStorage.getItem(key);
      const notifications = existingData ? JSON.parse(existingData) : {};
      
      notifications[type] = notificationId;
      await AsyncStorage.setItem(key, JSON.stringify(notifications));
    } catch (error) {
      console.error('Erro ao salvar ID da notificação:', error);
    }
  }

  // Obter IDs das notificações de uma tarefa
  private async getNotificationIds(taskId: string): Promise<string[]> {
    try {
      const key = `notifications_${taskId}`;
      const data = await AsyncStorage.getItem(key);
      
      if (data) {
        const notifications = JSON.parse(data);
        return Object.values(notifications) as string[];
      }
      
      return [];
    } catch (error) {
      console.error('Erro ao obter IDs das notificações:', error);
      return [];
    }
  }

  // Remover IDs das notificações de uma tarefa
  private async removeNotificationIds(taskId: string) {
    try {
      const key = `notifications_${taskId}`;
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Erro ao remover IDs das notificações:', error);
    }
  }

  // Limpar todas as notificações
  async clearAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('Todas as notificações foram canceladas');
    } catch (error) {
      console.error('Erro ao cancelar todas as notificações:', error);
    }
  }

  // Obter notificações agendadas (para debug)
  async getScheduledNotifications() {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log('Notificações agendadas:', notifications.length);
      return notifications;
    } catch (error) {
      console.error('Erro ao obter notificações agendadas:', error);
      return [];
    }
  }

  // Alias para compatibilidade
  async getAllScheduledNotifications() {
    return this.getScheduledNotifications();
  }

  // Verificar se tem permissão
  async hasPermission(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      return false;
    }
  }
}

export default new NotificationService();
