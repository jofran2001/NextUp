import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  isLoggedIn: boolean;
  user: User | null;
  token: string | null;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isLoggedIn: false,
    user: null,
    token: null,
  });

  useEffect(() => {
    // Verificar se há um token salvo ao inicializar
    checkSavedToken();
  }, []);

  const checkSavedToken = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userData = await AsyncStorage.getItem('user');
      
      if (token && userData) {
        const user = JSON.parse(userData);
        setAuthState({
          isLoggedIn: true,
          user,
          token,
        });
      }
    } catch (error) {
      console.error('Erro ao verificar token salvo:', error);
    }
  };

  const login = async (user: User, token: string) => {
    try {
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      
      setAuthState({
        isLoggedIn: true,
        user,
        token,
      });
    } catch (error) {
      console.error('Erro ao salvar dados de login:', error);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      
      setAuthState({
        isLoggedIn: false,
        user: null,
        token: null,
      });
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const updateUserData = async (userData: { name: string; email: string }) => {
    try {
      if (!authState.user) {
        throw new Error('Usuário não logado');
      }

      // Atualizar dados localmente
      const updatedUser = {
        ...authState.user,
        ...userData,
      };

      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      
      setAuthState(prev => ({
        ...prev,
        user: updatedUser,
      }));
    } catch (error) {
      console.error('Erro ao atualizar dados do usuário:', error);
      throw error;
    }
  };

  return {
    ...authState,
    login,
    logout,
    updateUserData,
  };
};
