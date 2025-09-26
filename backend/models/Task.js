import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  status: {
    type: String,
    enum: ['alta', 'media', 'baixa', 'em-andamento', 'pendente', 'concluida'],
    default: 'pendente'
  },
  priority: {
    type: String,
    enum: ['baixa', 'media', 'alta'],
    default: 'media'
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  responsible: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  dueDate: {
    type: Date,
    required: false
  },
  completedAt: {
    type: Date,
    required: false
  },
  tags: [{
    type: String,
    trim: true
  }],
  attachments: [{
    filename: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true // Adiciona createdAt e updatedAt automaticamente
});

// Índices para otimizar consultas
taskSchema.index({ creator: 1 });
taskSchema.index({ responsible: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ createdAt: -1 });

// Middleware para popular dados do usuário automaticamente
taskSchema.pre(['find', 'findOne', 'findOneAndUpdate'], function() {
  this.populate('creator', 'name email');
  this.populate('responsible', 'name email');
});

// Virtual para verificar se a tarefa está atrasada
taskSchema.virtual('isOverdue').get(function() {
  if (!this.dueDate || this.status === 'concluida') return false;
  return new Date() > this.dueDate;
});

// Método para marcar como concluída
taskSchema.methods.markAsCompleted = function() {
  this.status = 'concluida';
  this.completedAt = new Date();
  return this.save();
};

// Método para calcular dias restantes até o prazo
taskSchema.virtual('daysUntilDue').get(function() {
  if (!this.dueDate) return null;
  const now = new Date();
  const due = new Date(this.dueDate);
  const diffTime = due - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Configurar virtuals para serem incluídos no JSON
taskSchema.set('toJSON', { virtuals: true });
taskSchema.set('toObject', { virtuals: true });

const Task = mongoose.model('Task', taskSchema);

export default Task;
