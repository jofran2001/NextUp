import express from 'express';
import jwt from 'jsonwebtoken';
import Task from '../models/Task.js';
import User from '../models/User.js';

const router = express.Router();

// Middleware para verificar autenticação
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  console.log('Header de autorização recebido:', authHeader);
  console.log('Token extraído:', token ? `${token.substring(0, 20)}...` : 'Nenhum token');

  if (!token) {
    console.log('Erro: Token de acesso necessário');
    return res.status(401).json({ message: 'Token de acesso necessário' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.log('Erro na verificação do token:', err.message);
      return res.status(403).json({ message: 'Token inválido' });
    }
    console.log('Token válido para usuário:', user.userId);
    req.user = user;
    next();
  });
};

// GET /api/tasks - Listar todas as tarefas do usuário
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, priority, responsible, search, page = 1, limit = 10 } = req.query;
    const userId = req.user.userId;

    // Construir filtros
    const filters = {
      $or: [
        { creator: userId },
        { responsible: userId }
      ]
    };

    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    if (responsible) filters.responsible = responsible;
    
    if (search) {
      filters.$and = [
        filters.$or ? { $or: filters.$or } : {},
        {
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
          ]
        }
      ];
      delete filters.$or;
    }

    const tasks = await Task.find(filters)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Task.countDocuments(filters);

    res.json({
      tasks,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Erro ao buscar tarefas:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// GET /api/tasks/:id - Buscar tarefa específica
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.userId;

    const task = await Task.findOne({
      _id: taskId,
      $or: [
        { creator: userId },
        { responsible: userId }
      ]
    });

    if (!task) {
      return res.status(404).json({ message: 'Tarefa não encontrada' });
    }

    res.json(task);
  } catch (error) {
    console.error('Erro ao buscar tarefa:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// POST /api/tasks - Criar nova tarefa
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, status, priority, responsible, dueDate, tags } = req.body;
    const userId = req.user.userId;

    // Validações
    if (!title || !description) {
      return res.status(400).json({ message: 'Título e descrição são obrigatórios' });
    }

    // Verificar se o responsável existe (se fornecido)
    let responsibleUser = null;
    if (responsible) {
      responsibleUser = await User.findById(responsible);
      if (!responsibleUser) {
        return res.status(400).json({ message: 'Usuário responsável não encontrado' });
      }
    }

    const task = new Task({
      title,
      description,
      status: status || 'pendente',
      priority: priority || 'media',
      creator: userId,
      responsible: responsibleUser ? responsibleUser._id : null,
      dueDate: dueDate ? new Date(dueDate) : null,
      tags: tags || []
    });

    await task.save();
    await task.populate('creator', 'name email');
    if (responsibleUser) {
      await task.populate('responsible', 'name email');
    }

    res.status(201).json({
      message: 'Tarefa criada com sucesso',
      task
    });
  } catch (error) {
    console.error('Erro ao criar tarefa:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// PUT /api/tasks/:id - Atualizar tarefa
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.userId;
    const { title, description, status, priority, responsible, dueDate, tags } = req.body;

    // Buscar a tarefa
    const task = await Task.findOne({
      _id: taskId,
      $or: [
        { creator: userId },
        { responsible: userId }
      ]
    });

    if (!task) {
      return res.status(404).json({ message: 'Tarefa não encontrada' });
    }

    // Verificar permissões - apenas criador pode editar todos os campos
    const creatorId = task.creator._id ? task.creator._id.toString() : task.creator.toString();
    const isCreator = creatorId === userId;
    
    if (!isCreator && (title || description || responsible || dueDate)) {
      return res.status(403).json({ 
        message: 'Apenas o criador pode editar título, descrição, responsável e prazo' 
      });
    }

    // Verificar se o novo responsável existe
    if (responsible && responsible !== task.responsible?.toString()) {
      const responsibleUser = await User.findById(responsible);
      if (!responsibleUser) {
        return res.status(400).json({ message: 'Usuário responsável não encontrado' });
      }
    }

    // Atualizar campos permitidos
    const updateData = {};
    if (isCreator) {
      if (title) updateData.title = title;
      if (description) updateData.description = description;
      if (responsible !== undefined) updateData.responsible = responsible || null;
      if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
      if (tags) updateData.tags = tags;
    }
    
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;

    // Se marcando como concluída, definir data de conclusão
    if (status === 'concluida' && task.status !== 'concluida') {
      updateData.completedAt = new Date();
    }

    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Tarefa atualizada com sucesso',
      task: updatedTask
    });
  } catch (error) {
    console.error('Erro ao atualizar tarefa:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// DELETE /api/tasks/:id - Deletar tarefa
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.userId;

    const task = await Task.findOne({
      _id: taskId,
      creator: userId // Apenas o criador pode deletar
    });

    if (!task) {
      return res.status(404).json({ 
        message: 'Tarefa não encontrada ou você não tem permissão para deletá-la' 
      });
    }

    await Task.findByIdAndDelete(taskId);

    res.json({ message: 'Tarefa deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar tarefa:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// POST /api/tasks/:id/complete - Marcar tarefa como concluída
router.post('/:id/complete', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.userId;

    const task = await Task.findOne({
      _id: taskId,
      $or: [
        { creator: userId },
        { responsible: userId }
      ]
    });

    if (!task) {
      return res.status(404).json({ message: 'Tarefa não encontrada' });
    }

    await task.markAsCompleted();

    res.json({
      message: 'Tarefa marcada como concluída',
      task
    });
  } catch (error) {
    console.error('Erro ao concluir tarefa:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// GET /api/tasks/stats/dashboard - Estatísticas para dashboard
router.get('/stats/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const stats = await Task.aggregate([
      {
        $match: {
          $or: [
            { creator: userId },
            { responsible: userId }
          ]
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const overdueTasks = await Task.countDocuments({
      $or: [
        { creator: userId },
        { responsible: userId }
      ],
      dueDate: { $lt: new Date() },
      status: { $ne: 'concluida' }
    });

    const totalTasks = await Task.countDocuments({
      $or: [
        { creator: userId },
        { responsible: userId }
      ]
    });

    res.json({
      statusStats: stats,
      overdueTasks,
      totalTasks
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

export default router;
