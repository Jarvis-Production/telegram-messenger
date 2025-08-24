package com.messenger.app.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.messenger.app.ui.screens.auth.LoginScreen
import com.messenger.app.ui.screens.auth.RegisterScreen
import com.messenger.app.ui.screens.chat.ChatListScreen
import com.messenger.app.ui.screens.chat.ChatScreen
import com.messenger.app.ui.screens.contacts.ContactsScreen
import com.messenger.app.ui.screens.profile.ProfileScreen
import com.messenger.app.viewmodel.AuthViewModel
import com.messenger.app.viewmodel.ChatViewModel
import com.messenger.app.viewmodel.MessageViewModel

sealed class Screen(val route: String, val title: String) {
    object Login : Screen("login", "Вход")
    object Register : Screen("register", "Регистрация")
    object ChatList : Screen("chat_list", "Чаты")
    object Chat : Screen("chat/{chatId}", "Чат")
    object Contacts : Screen("contacts", "Контакты")
    object Profile : Screen("profile", "Профиль")
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MessengerNavigation(
    navController: NavHostController = rememberNavController(),
    authViewModel: AuthViewModel,
    chatViewModel: ChatViewModel,
    messageViewModel: MessageViewModel
) {
    val authState by authViewModel.authState.collectAsState()
    
    if (authState.isAuthenticated) {
        // Основное приложение с табами
        MainTabNavigation(
            navController = navController,
            chatViewModel = chatViewModel,
            messageViewModel = messageViewModel
        )
    } else {
        // Экран аутентификации
        AuthNavigation(
            navController = navController,
            authViewModel = authViewModel
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainTabNavigation(
    navController: NavHostController,
    chatViewModel: ChatViewModel,
    messageViewModel: MessageViewModel
) {
    var selectedTab by remember { mutableStateOf(0) }
    
    Scaffold(
        bottomBar = {
            NavigationBar {
                NavigationBarItem(
                    icon = { Icon(Icons.Default.Chat, contentDescription = null) },
                    label = { Text("Чаты") },
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 }
                )
                NavigationBarItem(
                    icon = { Icon(Icons.Default.People, contentDescription = null) },
                    label = { Text("Контакты") },
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 }
                )
                NavigationBarItem(
                    icon = { Icon(Icons.Default.Person, contentDescription = null) },
                    label = { Text("Профиль") },
                    selected = selectedTab == 2,
                    onClick = { selectedTab = 2 }
                )
            }
        }
    ) { paddingValues ->
        when (selectedTab) {
            0 -> ChatListScreen(
                modifier = Modifier.padding(paddingValues),
                onChatClick = { chatId ->
                    navController.navigate("chat/$chatId")
                }
            )
            1 -> ContactsScreen(
                modifier = Modifier.padding(paddingValues)
            )
            2 -> ProfileScreen(
                modifier = Modifier.padding(paddingValues)
            )
        }
    }
    
    // Навигация к экрану чата
    NavHost(
        navController = navController,
        startDestination = "chat_list"
    ) {
        composable("chat/{chatId}") { backStackEntry ->
            val chatId = backStackEntry.arguments?.getString("chatId")
            chatId?.let { id ->
                ChatScreen(
                    chatId = id,
                    messageViewModel = messageViewModel,
                    onBackClick = { navController.popBackStack() }
                )
            }
        }
    }
}

@Composable
fun AuthNavigation(
    navController: NavHostController,
    authViewModel: AuthViewModel
) {
    NavHost(
        navController = navController,
        startDestination = Screen.Login.route
    ) {
        composable(Screen.Login.route) {
            LoginScreen(
                onLoginSuccess = {
                    // Автоматически переключится на основное приложение
                },
                onRegisterClick = {
                    navController.navigate(Screen.Register.route)
                }
            )
        }
        
        composable(Screen.Register.route) {
            RegisterScreen(
                onRegisterSuccess = {
                    // Автоматически переключится на основное приложение
                },
                onLoginClick = {
                    navController.popBackStack()
                }
            )
        }
    }
}

// Импорты для иконок
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Person
