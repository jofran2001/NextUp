import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import TaskService, { CreateTaskData, UpdateTaskData, Task } from '../services/task.service';
import NotificationService from '../services/notification.service';

interface TaskModalProps {
  visible: boolean;
  onClose: () => void;
  onTaskSaved: () => void;
  editingTask?: Task | null;
}

export default function TaskModal({ visible, onClose, onTaskSaved, editingTask }: TaskModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'pendente' as Task['status'],
    priority: 'media' as Task['priority'],
    dueDate: '',
    tags: [] as string[]
  });
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (editingTask) {
      // Preencher formulário com dados da tarefa para edição
      setFormData({
        title: editingTask.title,
        description: editingTask.description,
        status: editingTask.status,
        priority: editingTask.priority,
        dueDate: editingTask.dueDate ? editingTask.dueDate.split('T')[0] : '',
        tags: editingTask.tags || []
      });
    } else {
      // Limpar formulário para nova tarefa
      setFormData({
        title: '',
        description: '',
        status: 'pendente',
        priority: 'media',
        dueDate: '',
        tags: []
      });
    }
    setTagInput('');
  }, [editingTask, visible]);

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      Alert.alert('Erro', 'Título e descrição são obrigatórios');
      return;
    }

    setLoading(true);
    try {
      // Converter data para formato ISO se fornecida
      let dueDateISO: string | undefined = undefined;
      if (formData.dueDate) {
        // Se a data está no formato DD/MM/YYYY, converter para YYYY-MM-DD
        if (formData.dueDate.includes('/')) {
          const [day, month, year] = formData.dueDate.split('/');
          dueDateISO = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        } else {
          dueDateISO = formData.dueDate;
        }
      }

      const taskData = {
        ...formData,
        dueDate: dueDateISO
      };

      if (editingTask) {
        // Atualizar tarefa existente
        const updateData: UpdateTaskData = {
          _id: editingTask._id!,
          ...taskData
        };
        const updatedTask = await TaskService.updateTask(updateData);
        
        // Reagendar notificações se a data mudou
        if (dueDateISO) {
          await NotificationService.cancelTaskNotifications(editingTask._id!);
          await NotificationService.scheduleAllTaskNotifications(
            editingTask._id!,
            taskData.title,
            new Date(dueDateISO)
          );
        }
        
        Alert.alert('Sucesso', 'Tarefa atualizada com sucesso!');
      } else {
        // Criar nova tarefa
        const createData: CreateTaskData = taskData;
        const createdTask = await TaskService.createTask(createData);
        
        // Agendar notificações se tem data de vencimento
        if (dueDateISO && createdTask._id) {
          await NotificationService.scheduleAllTaskNotifications(
            createdTask._id,
            taskData.title,
            new Date(dueDateISO)
          );
        }
        
        Alert.alert('Sucesso', 'Tarefa criada com sucesso!');
      }

      onTaskSaved();
      onClose();
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const statusOptions: Array<{ value: Task['status'], label: string, color: string }> = [
    { value: 'pendente', label: 'Pendente', color: '#F59E0B' },
    { value: 'em-andamento', label: 'Em Andamento', color: '#3B82F6' },
    { value: 'alta', label: 'Alta Prioridade', color: '#EF4444' },
    { value: 'media', label: 'Média Prioridade', color: '#F59E0B' },
    { value: 'baixa', label: 'Baixa Prioridade', color: '#10B981' },
    { value: 'concluida', label: 'Concluída', color: '#6B7280' }
  ];

  const priorityOptions: Array<{ value: Task['priority'], label: string, color: string }> = [
    { value: 'baixa', label: 'Baixa', color: '#10B981' },
    { value: 'media', label: 'Média', color: '#F59E0B' },
    { value: 'alta', label: 'Alta', color: '#EF4444' }
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <LinearGradient colors={["#3B82F6", "#10B981"]} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}
            </Text>
            <TouchableOpacity 
              onPress={handleSave} 
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              disabled={loading}
            >
              <Text style={styles.saveText}>
                {loading ? 'Salvando...' : 'Salvar'}
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Título */}
          <View style={styles.section}>
            <Text style={styles.label}>Título *</Text>
            <TextInput
              style={styles.input}
              placeholder="Digite o título da tarefa"
              value={formData.title}
              onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
              maxLength={200}
            />
          </View>

          {/* Descrição */}
          <View style={styles.section}>
            <Text style={styles.label}>Descrição *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Descreva os detalhes da tarefa"
              value={formData.description}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
              multiline
              numberOfLines={4}
              maxLength={1000}
            />
          </View>

          {/* Status */}
          <View style={styles.section}>
            <Text style={styles.label}>Status</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsContainer}>
              {statusOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    { borderColor: option.color },
                    formData.status === option.value && { backgroundColor: option.color }
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, status: option.value }))}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: formData.status === option.value ? '#fff' : option.color }
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Prioridade */}
          <View style={styles.section}>
            <Text style={styles.label}>Prioridade</Text>
            <View style={styles.priorityContainer}>
              {priorityOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.priorityButton,
                    { borderColor: option.color },
                    formData.priority === option.value && { backgroundColor: option.color }
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, priority: option.value }))}
                >
                  <Text
                    style={[
                      styles.priorityText,
                      { color: formData.priority === option.value ? '#fff' : option.color }
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Data de Vencimento */}
          <View style={styles.section}>
            <Text style={styles.label}>Data de Vencimento</Text>
            <TextInput
              style={styles.input}
              placeholder="DD/MM/YYYY ou YYYY-MM-DD"
              value={formData.dueDate}
              onChangeText={(text) => setFormData(prev => ({ ...prev, dueDate: text }))}
            />
            <Text style={styles.hint}>Formato: DD/MM/YYYY (ex: 31/12/2024) ou YYYY-MM-DD (ex: 2024-12-31)</Text>
          </View>

          {/* Tags */}
          <View style={styles.section}>
            <Text style={styles.label}>Tags</Text>
            <View style={styles.tagInputContainer}>
              <TextInput
                style={[styles.input, styles.tagInput]}
                placeholder="Adicionar tag"
                value={tagInput}
                onChangeText={setTagInput}
                onSubmitEditing={addTag}
              />
              <TouchableOpacity style={styles.addTagButton} onPress={addTag}>
                <Text style={styles.addTagText}>+</Text>
              </TouchableOpacity>
            </View>
            
            {formData.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {formData.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                    <TouchableOpacity onPress={() => removeTag(tag)}>
                      <Text style={styles.tagRemove}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  saveButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  optionsContainer: {
    flexDirection: 'row',
  },
  optionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  priorityText: {
    fontSize: 14,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  tagInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tagInput: {
    flex: 1,
  },
  addTagButton: {
    backgroundColor: '#3B82F6',
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTagText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#374151',
  },
  tagRemove: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: 'bold',
  },
});
