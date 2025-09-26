import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AuthService from '../services/auth.service';
import Dashboard from './dashboard';
import { useAuth } from '../hooks/useAuth';

const { height } = Dimensions.get('window');

export default function IndexPage() {
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [tab, setTab] = useState<'login' | 'register'>('login');
	const [loading, setLoading] = useState(false);
	const { isLoggedIn, user, login } = useAuth();

	// Limpar campos quando usuário faz logout
	useEffect(() => {
		if (!isLoggedIn) {
			setName('');
			setEmail('');
			setPassword('');
			setTab('login');
		}
	}, [isLoggedIn]);

	const handleLogin = async () => {
		if (!email || !password) {
			Alert.alert('Erro', 'Por favor, preencha todos os campos');
			return;
		}

		setLoading(true);
		try {
			const response = await AuthService.login({ email, password });
			await login(response.user, response.token);
			Alert.alert('Sucesso', `Bem-vindo, ${response.user.name}!`);
		} catch (error: any) {
			Alert.alert('Erro', error.message);
		} finally {
			setLoading(false);
		}
	};

	const handleRegister = async () => {
		if (!name || !email || !password) {
			Alert.alert('Erro', 'Por favor, preencha todos os campos');
			return;
		}

		setLoading(true);
		try {
			const response = await AuthService.register({ name, email, password });
			await login(response.user, response.token);
			Alert.alert('Sucesso', `Conta criada com sucesso! Bem-vindo, ${response.user.name}!`);
		} catch (error: any) {
			Alert.alert('Erro', error.message);
		} finally {
			setLoading(false);
		}
	};

	// Se o usuário estiver logado, mostrar o dashboard
	if (isLoggedIn) {
		return <Dashboard />;
	}

	return (
		<LinearGradient colors={["#3B82F6", "#10B981"]} style={styles.container}>
			<View style={styles.circle}>
				<View style={styles.checkMark}>
					<Text style={{ color: '#fff', fontSize: 32 }}>✓</Text>
				</View>
			</View>
			<Text style={styles.title}>NextUp</Text>
			<Text style={styles.subtitle}>Gerencie suas tarefas com eficiência</Text>
			<View style={styles.formContainer}>
				<View style={styles.tabContainer}>
					<TouchableOpacity style={[styles.tab, tab === 'login' && styles.activeTab]} onPress={() => setTab('login')}>
						<Text style={[styles.tabText, tab === 'login' && styles.activeTabText]}>Entrar</Text>
					</TouchableOpacity>
					<TouchableOpacity style={[styles.tab, tab === 'register' && styles.activeTab]} onPress={() => setTab('register')}>
						<Text style={[styles.tabText, tab === 'register' && styles.activeTabText]}>Cadastrar</Text>
					</TouchableOpacity>
				</View>
				{tab === 'login' ? (
					<View style={styles.innerForm}>
						<Text style={styles.welcome}>Bem-vindo de volta</Text>
						<Text style={styles.desc}>Entre com suas credenciais</Text>
						<Text style={styles.label}>E-mail</Text>
						<View style={styles.inputWrapper}>
							<Text style={styles.icon}>📧</Text>
							<TextInput
								style={styles.input}
								placeholder="seu@email.com"
								placeholderTextColor="#A0AEC0"
								value={email}
								onChangeText={setEmail}
								keyboardType="email-address"
								autoCapitalize="none"
							/>
						</View>
						<Text style={styles.label}>Senha</Text>
						<View style={styles.inputWrapper}>
							<Text style={styles.icon}>🔒</Text>
							<TextInput
								style={styles.input}
								placeholder="••••••••"
								placeholderTextColor="#A0AEC0"
								value={password}
								onChangeText={setPassword}
								secureTextEntry
							/>
						</View>
						<TouchableOpacity 
							style={[styles.button, loading && styles.buttonDisabled]} 
							onPress={handleLogin}
							disabled={loading}
						>
							<Text style={styles.buttonText}>
								{loading ? 'Entrando...' : 'Entrar'}
							</Text>
						</TouchableOpacity>
					</View>
				) : (
					<View style={styles.innerForm}>
						<Text style={styles.welcome}>Criar conta</Text>
						<Text style={styles.desc}>Preencha os dados para começar</Text>
						<Text style={styles.label}>Nome</Text>
						<View style={styles.inputWrapper}>
							<Text style={styles.icon}>👤</Text>
							<TextInput
								style={styles.input}
								placeholder="Seu nome"
								placeholderTextColor="#A0AEC0"
								value={name}
								onChangeText={setName}
							/>
						</View>
						<Text style={styles.label}>E-mail</Text>
						<View style={styles.inputWrapper}>
							<Text style={styles.icon}>📧</Text>
							<TextInput
								style={styles.input}
								placeholder="seu@email.com"
								placeholderTextColor="#A0AEC0"
								value={email}
								onChangeText={setEmail}
								keyboardType="email-address"
								autoCapitalize="none"
							/>
						</View>
						<Text style={styles.label}>Senha</Text>
						<View style={styles.inputWrapper}>
							<Text style={styles.icon}>🔒</Text>
							<TextInput
								style={styles.input}
								placeholder="••••••••"
								placeholderTextColor="#A0AEC0"
								value={password}
								onChangeText={setPassword}
								secureTextEntry
							/>
						</View>
						<TouchableOpacity 
							style={[styles.button, loading && styles.buttonDisabled]} 
							onPress={handleRegister}
							disabled={loading}
						>
							<Text style={styles.buttonText}>
								{loading ? 'Cadastrando...' : 'Cadastrar'}
							</Text>
						</TouchableOpacity>
					</View>
				)}
			</View>
		</LinearGradient>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'flex-start',
		paddingTop: height * 0.08,
	},
	circle: {
		width: 70,
		height: 70,
		borderRadius: 35,
		backgroundColor: '#60A5FA',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 16,
	},
	checkMark: {
		width: 50,
		height: 50,
		borderRadius: 25,
		backgroundColor: '#38BDF8',
		alignItems: 'center',
		justifyContent: 'center',
	},
	title: {
		fontSize: 28,
		fontWeight: 'bold',
		color: '#fff',
		marginBottom: 4,
	},
	subtitle: {
		color: '#E0E7EF',
		fontSize: 15,
		marginBottom: 32,
	},
	formContainer: {
		width: '90%',
		backgroundColor: '#F8FAFC',
		borderRadius: 16,
		padding: 20,
		shadowColor: '#000',
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 4,
	},
	tabContainer: {
		flexDirection: 'row',
		marginBottom: 16,
	},
	tab: {
		flex: 1,
		paddingVertical: 8,
		alignItems: 'center',
		borderBottomWidth: 2,
		borderBottomColor: 'transparent',
	},
	activeTab: {
		borderBottomColor: '#3B82F6',
		backgroundColor: '#fff',
		borderTopLeftRadius: 8,
		borderTopRightRadius: 8,
	},
	tabText: {
		color: '#A0AEC0',
		fontWeight: 'bold',
		fontSize: 16,
	},
	activeTabText: {
		color: '#3B82F6',
	},
	innerForm: {
		marginTop: 8,
	},
	welcome: {
		fontSize: 22,
		fontWeight: 'bold',
		color: '#1A202C',
		marginBottom: 2,
	},
	desc: {
		color: '#718096',
		marginBottom: 16,
	},
	label: {
		color: '#2D3748',
		fontWeight: 'bold',
		marginTop: 8,
		marginBottom: 4,
	},
	inputWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F1F5F9',
		borderRadius: 8,
		paddingHorizontal: 10,
		marginBottom: 8,
	},
	icon: {
		fontSize: 18,
		marginRight: 6,
		color: '#A0AEC0',
	},
	input: {
		flex: 1,
		height: 44,
		fontSize: 16,
		color: '#2D3748',
	},
	button: {
		backgroundColor: '#3B82F6',
		borderRadius: 8,
		paddingVertical: 12,
		alignItems: 'center',
		marginTop: 16,
	},
	buttonDisabled: {
		backgroundColor: '#A0AEC0',
	},
	buttonText: {
		color: '#fff',
		fontWeight: 'bold',
		fontSize: 17,
	},
});
