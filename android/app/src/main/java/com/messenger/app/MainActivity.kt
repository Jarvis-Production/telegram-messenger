package com.messenger.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat
import androidx.navigation.compose.rememberNavController
import com.messenger.app.ui.theme.MessengerTheme
import com.messenger.app.navigation.MessengerNavigation
import com.messenger.app.viewmodel.AuthViewModel
import com.messenger.app.viewmodel.ChatViewModel
import com.messenger.app.viewmodel.MessageViewModel
import org.koin.androidx.viewmodel.ext.android.viewModel

class MainActivity : ComponentActivity() {
    
    private val authViewModel: AuthViewModel by viewModel()
    private val chatViewModel: ChatViewModel by viewModel()
    private val messageViewModel: MessageViewModel by viewModel()
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Настройка прозрачного статус бара
        WindowCompat.setDecorFitsSystemWindows(window, false)
        
        setContent {
            val darkTheme = isSystemInDarkTheme()
            val colorScheme = MessengerTheme.colorScheme(darkTheme)
            val view = LocalView.current
            
            SideEffect {
                val window = (view.context as android.app.Activity).window
                window.statusBarColor = colorScheme.primary.toArgb()
                WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
            }
            
            MessengerTheme(darkTheme = darkTheme) {
                Surface(
                    color = colorScheme.background
                ) {
                    val navController = rememberNavController()
                    
                    MessengerNavigation(
                        navController = navController,
                        authViewModel = authViewModel,
                        chatViewModel = chatViewModel,
                        messageViewModel = messageViewModel
                    )
                }
            }
        }
    }
}
