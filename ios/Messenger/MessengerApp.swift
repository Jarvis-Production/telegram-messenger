import SwiftUI
import Firebase

@main
struct MessengerApp: App {
    @StateObject private var authManager = AuthenticationManager()
    @StateObject private var chatManager = ChatManager()
    @StateObject private var messageManager = MessageManager()
    
    init() {
        FirebaseApp.configure()
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authManager)
                .environmentObject(chatManager)
                .environmentObject(messageManager)
                .preferredColorScheme(.light)
        }
    }
}

struct ContentView: View {
    @EnvironmentObject var authManager: AuthenticationManager
    
    var body: some View {
        Group {
            if authManager.isAuthenticated {
                MainTabView()
            } else {
                AuthenticationView()
            }
        }
        .animation(.easeInOut, value: authManager.isAuthenticated)
    }
}

struct MainTabView: View {
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            ChatListView()
                .tabItem {
                    Image(systemName: "message.fill")
                    Text("Чаты")
                }
                .tag(0)
            
            ContactsView()
                .tabItem {
                    Image(systemName: "person.2.fill")
                    Text("Контакты")
                }
                .tag(1)
            
            ProfileView()
                .tabItem {
                    Image(systemName: "person.circle.fill")
                    Text("Профиль")
                }
                .tag(2)
        }
        .accentColor(.blue)
    }
}

struct AuthenticationView: View {
    @State private var isLogin = true
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                // Логотип
                VStack(spacing: 10) {
                    Image(systemName: "message.circle.fill")
                        .font(.system(size: 80))
                        .foregroundColor(.blue)
                    
                    Text("Messenger")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .foregroundColor(.primary)
                    
                    Text("Современный мессенджер")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding(.top, 50)
                
                Spacer()
                
                // Форма входа/регистрации
                if isLogin {
                    LoginView()
                } else {
                    RegisterView()
                }
                
                Spacer()
                
                // Переключение между входом и регистрацией
                Button(action: {
                    withAnimation {
                        isLogin.toggle()
                    }
                }) {
                    Text(isLogin ? "Нет аккаунта? Зарегистрируйтесь" : "Уже есть аккаунт? Войдите")
                        .foregroundColor(.blue)
                }
                .padding(.bottom, 30)
            }
            .padding()
            .navigationBarHidden(true)
        }
    }
}

struct LoginView: View {
    @EnvironmentObject var authManager: AuthenticationManager
    @State private var identifier = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var showAlert = false
    @State private var alertMessage = ""
    
    var body: some View {
        VStack(spacing: 20) {
            Text("Вход в систему")
                .font(.title2)
                .fontWeight(.semibold)
            
            VStack(spacing: 15) {
                TextField("Email или имя пользователя", text: $identifier)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .autocapitalization(.none)
                    .keyboardType(.emailAddress)
                
                SecureField("Пароль", text: $password)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                
                Button(action: login) {
                    if isLoading {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                        Text("Войти")
                            .fontWeight(.semibold)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.blue)
                .foregroundColor(.white)
                .cornerRadius(10)
                .disabled(isLoading || identifier.isEmpty || password.isEmpty)
            }
        }
        .alert("Ошибка", isPresented: $showAlert) {
            Button("OK") { }
        } message: {
            Text(alertMessage)
        }
    }
    
    private func login() {
        isLoading = true
        
        authManager.login(identifier: identifier, password: password) { result in
            DispatchQueue.main.async {
                isLoading = false
                
                switch result {
                case .success:
                    break
                case .failure(let error):
                    alertMessage = error.localizedDescription
                    showAlert = true
                }
            }
        }
    }
}

struct RegisterView: View {
    @EnvironmentObject var authManager: AuthenticationManager
    @State private var username = ""
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var isLoading = false
    @State private var showAlert = false
    @State private var alertMessage = ""
    
    var body: some View {
        VStack(spacing: 20) {
            Text("Регистрация")
                .font(.title2)
                .fontWeight(.semibold)
            
            ScrollView {
                VStack(spacing: 15) {
                    TextField("Имя пользователя", text: $username)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .autocapitalization(.none)
                    
                    TextField("Email", text: $email)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .autocapitalization(.none)
                        .keyboardType(.emailAddress)
                    
                    TextField("Имя", text: $firstName)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                    
                    TextField("Фамилия", text: $lastName)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                    
                    SecureField("Пароль", text: $password)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                    
                    SecureField("Подтвердите пароль", text: $confirmPassword)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                    
                    Button(action: register) {
                        if isLoading {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Text("Зарегистрироваться")
                                .fontWeight(.semibold)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(10)
                    .disabled(isLoading || !isFormValid)
                }
            }
        }
        .alert("Ошибка", isPresented: $showAlert) {
            Button("OK") { }
        } message: {
            Text(alertMessage)
        }
    }
    
    private var isFormValid: Bool {
        !username.isEmpty && !email.isEmpty && !password.isEmpty && 
        !confirmPassword.isEmpty && !firstName.isEmpty && !lastName.isEmpty &&
        password == confirmPassword && password.count >= 6
    }
    
    private func register() {
        isLoading = true
        
        authManager.register(
            username: username,
            email: email,
            password: password,
            firstName: firstName,
            lastName: lastName
        ) { result in
            DispatchQueue.main.async {
                isLoading = false
                
                switch result {
                case .success:
                    break
                case .failure(let error):
                    alertMessage = error.localizedDescription
                    showAlert = true
                }
            }
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(AuthenticationManager())
        .environmentObject(ChatManager())
        .environmentObject(MessageManager())
}
