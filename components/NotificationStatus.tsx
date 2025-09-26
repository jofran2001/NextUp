import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import NotificationService from '../services/notification.service';

interface NotificationStatusProps {
  onStatusChange?: (hasPermission: boolean) => void;
}

interface NotificationStatus {
  hasPermission: boolean;
  isExpoPro: boolean;
  canUsePush: boolean;
  totalScheduled: number;
}

export default function NotificationStatus({ onStatusChange }: NotificationStatusProps) {
  const [status, setStatus] = useState<NotificationStatus>({
    hasPermission: false,
    isExpoPro: false,
    canUsePush: false,
    totalScheduled: 0
  });

  const checkNotificationStatus = async () => {
    try {
      const hasPermission = await NotificationService.hasPermission();
      const scheduled = await NotificationService.getAllScheduledNotifications();
      
      // Simular verificação do Expo Pro vs Go
      const isExpoPro = false; // Em desenvolvimento sempre será false
      const canUsePush = isExpoPro;

      const newStatus = {
        hasPermission,
        isExpoPro,
        canUsePush,
        totalScheduled: scheduled.length
      };

      setStatus(newStatus);
      onStatusChange?.(hasPermission);
    } catch (error) {
      console.error('Erro ao verificar status das notificações:', error);
    }
  };

  const requestPermissions = async () => {
    try {
      await NotificationService.registerForPushNotifications();
      await checkNotificationStatus();
    } catch (error) {
      console.error('Erro ao solicitar permissões:', error);
    }
  };

  useEffect(() => {
    checkNotificationStatus();
  }, []);

  const getStatusColor = (): [string, string] => {
    if (!status.hasPermission) return ['#ff6b6b', '#ff5252'];
    if (status.canUsePush) return ['#4CAF50', '#45a049'];
    return ['#ff9800', '#f57c00'];
  };

  const getStatusText = () => {
    if (!status.hasPermission) {
      return '❌ Sem permissão';
    }
    if (status.canUsePush) {
      return '✅ Push + Local';
    }
    return '📱 Apenas local';
  };

  const getStatusDescription = () => {
    if (!status.hasPermission) {
      return 'Toque para ativar notificações';
    }
    if (status.canUsePush) {
      return `${status.totalScheduled} notificações agendadas`;
    }
    return `${status.totalScheduled} notificações locais ativas`;
  };

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={!status.hasPermission ? requestPermissions : undefined}
      disabled={status.hasPermission}
    >
      <LinearGradient
        colors={getStatusColor()}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.content}>
          <Text style={styles.statusText}>{getStatusText()}</Text>
          <Text style={styles.description}>{getStatusDescription()}</Text>
          
          {!status.canUsePush && status.hasPermission && (
            <Text style={styles.hint}>
              💡 Para notificações push, use um Development Build
            </Text>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  gradient: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  content: {
    alignItems: 'center',
  },
  statusText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  description: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    textAlign: 'center',
  },
  hint: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
});
