import Foundation
import Combine

class AuthenticationManager: ObservableObject {
    @Published var isAuthenticated = false
    @Published var currentUser: User?
    @Published var isLoading = false
    
    private var cancellables = Set<AnyCancellable>()
    private let apiService = APIService.shared
    
    init() {
        // Проверяем сохраненный токен при запуске
        checkStoredToken()
    }
    
    // MARK: - Public Methods
    
    func login(identifier: String, password: String, completion: @escaping (Result<Void, Error>) -> Void) {
        isLoading = true
        
        let loginData = LoginRequest(identifier: identifier, password: password)
        
        apiService.login(loginData) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false
                
                switch result {
                case .success(let response):
                    self?.handleSuccessfulAuth(response: response)
                    completion(.success(()))
                case .failure(let error):
                    completion(.failure(error))
                }
            }
        }
    }
    
    func register(username: String, email: String, password: String, firstName: String, lastName: String, completion: @escaping (Result<Void, Error>) -> Void) {
        isLoading = true
        
        let registerData = RegisterRequest(
            username: username,
            email: email,
            password: password,
            firstName: firstName,
            lastName: lastName
        )
        
        apiService.register(registerData) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false
                
                switch result {
                case .success(let response):
                    self?.handleSuccessfulAuth(response: response)
                    completion(.success(()))
                case .failure(let error):
                    completion(.failure(error))
                }
            }
        }
    }
    
    func logout() {
        // Отправляем запрос на сервер для выхода
        apiService.logout { [weak self] _ in
            DispatchQueue.main.async {
                self?.clearAuthData()
            }
        }
    }
    
    func updateProfile(firstName: String?, lastName: String?, phoneNumber: String?, completion: @escaping (Result<Void, Error>) -> Void) {
        let updateData = ProfileUpdateRequest(
            firstName: firstName,
            lastName: lastName,
            phoneNumber: phoneNumber
        )
        
        apiService.updateProfile(updateData) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let updatedUser):
                    self?.currentUser = updatedUser
                    completion(.success(()))
                case .failure(let error):
                    completion(.failure(error))
                }
            }
        }
    }
    
    func changePassword(currentPassword: String, newPassword: String, completion: @escaping (Result<Void, Error>) -> Void) {
        let passwordData = PasswordChangeRequest(
            currentPassword: currentPassword,
            newPassword: newPassword
        )
        
        apiService.changePassword(passwordData) { result in
            DispatchQueue.main.async {
                switch result {
                case .success:
                    completion(.success(()))
                case .failure(let error):
                    completion(.failure(error))
                }
            }
        }
    }
    
    // MARK: - Private Methods
    
    private func checkStoredToken() {
        guard let token = KeychainService.shared.getToken() else {
            return
        }
        
        // Проверяем валидность токена
        apiService.validateToken { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let user):
                    self?.currentUser = user
                    self?.isAuthenticated = true
                case .failure:
                    self?.clearAuthData()
                }
            }
        }
    }
    
    private func handleSuccessfulAuth(response: AuthResponse) {
        // Сохраняем токен
        KeychainService.shared.saveToken(response.token)
        
        // Обновляем состояние
        currentUser = response.user
        isAuthenticated = true
        
        // Сохраняем пользователя
        UserDefaults.standard.set(try? JSONEncoder().encode(response.user), forKey: "currentUser")
    }
    
    private func clearAuthData() {
        // Удаляем токен
        KeychainService.shared.deleteToken()
        
        // Очищаем состояние
        currentUser = nil
        isAuthenticated = false
        
        // Очищаем сохраненного пользователя
        UserDefaults.standard.removeObject(forKey: "currentUser")
    }
}

// MARK: - Data Models

struct LoginRequest: Codable {
    let identifier: String
    let password: String
}

struct RegisterRequest: Codable {
    let username: String
    let email: String
    let password: String
    let firstName: String
    let lastName: String
}

struct ProfileUpdateRequest: Codable {
    let firstName: String?
    let lastName: String?
    let phoneNumber: String?
}

struct PasswordChangeRequest: Codable {
    let currentPassword: String
    let newPassword: String
}

struct AuthResponse: Codable {
    let user: User
    let token: String
}

struct User: Codable, Identifiable {
    let id: String
    let username: String
    let email: String
    let firstName: String
    let lastName: String
    let avatar: String?
    let phoneNumber: String?
    let status: String
    let isOnline: Bool
    let lastSeen: Date
    
    var fullName: String {
        "\(firstName) \(lastName)"
    }
    
    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case username, email, firstName, lastName, avatar, phoneNumber, status, isOnline, lastSeen
    }
}

// MARK: - Keychain Service

class KeychainService {
    static let shared = KeychainService()
    
    private let service = "com.messenger.app"
    private let account = "authToken"
    
    private init() {}
    
    func saveToken(_ token: String) {
        let data = Data(token.utf8)
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecValueData as String: data
        ]
        
        SecItemDelete(query as CFDictionary)
        SecItemAdd(query as CFDictionary, nil)
    }
    
    func getToken() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        guard status == errSecSuccess,
              let data = result as? Data,
              let token = String(data: data, encoding: .utf8) else {
            return nil
        }
        
        return token
    }
    
    func deleteToken() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
        
        SecItemDelete(query as CFDictionary)
    }
}

// MARK: - API Service

class APIService {
    static let shared = APIService()
    
    private let baseURL = "http://localhost:3000/api"
    private var authToken: String? {
        KeychainService.shared.getToken()
    }
    
    private init() {}
    
    // MARK: - Authentication
    
    func login(_ request: LoginRequest, completion: @escaping (Result<AuthResponse, Error>) -> Void) {
        makeRequest(
            endpoint: "/auth/login",
            method: "POST",
            body: request,
            completion: completion
        )
    }
    
    func register(_ request: RegisterRequest, completion: @escaping (Result<AuthResponse, Error>) -> Void) {
        makeRequest(
            endpoint: "/auth/register",
            method: "POST",
            body: request,
            completion: completion
        )
    }
    
    func logout(completion: @escaping (Result<Void, Error>) -> Void) {
        makeRequest(
            endpoint: "/auth/logout",
            method: "POST",
            completion: completion
        )
    }
    
    func validateToken(completion: @escaping (Result<User, Error>) -> Void) {
        makeRequest(
            endpoint: "/auth/profile",
            method: "GET",
            completion: completion
        )
    }
    
    // MARK: - Profile
    
    func updateProfile(_ request: ProfileUpdateRequest, completion: @escaping (Result<User, Error>) -> Void) {
        makeRequest(
            endpoint: "/auth/profile",
            method: "PUT",
            body: request,
            completion: completion
        )
    }
    
    func changePassword(_ request: PasswordChangeRequest, completion: @escaping (Result<Void, Error>) -> Void) {
        makeRequest(
            endpoint: "/auth/change-password",
            method: "PUT",
            body: request,
            completion: completion
        )
    }
    
    // MARK: - Private Methods
    
    private func makeRequest<T: Codable, U: Codable>(
        endpoint: String,
        method: String,
        body: T? = nil,
        completion: @escaping (Result<U, Error>) -> Void
    ) {
        guard let url = URL(string: baseURL + endpoint) else {
            completion(.failure(APIError.invalidURL))
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        if let body = body {
            do {
                request.httpBody = try JSONEncoder().encode(body)
            } catch {
                completion(.failure(APIError.encodingError))
                return
            }
        }
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let data = data else {
                completion(.failure(APIError.noData))
                return
            }
            
            do {
                let result = try JSONDecoder().decode(U.self, from: data)
                completion(.success(result))
            } catch {
                completion(.failure(APIError.decodingError))
            }
        }.resume()
    }
}

// MARK: - Errors

enum APIError: LocalizedError {
    case invalidURL
    case noData
    case encodingError
    case decodingError
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Неверный URL"
        case .noData:
            return "Нет данных"
        case .encodingError:
            return "Ошибка кодирования"
        case .decodingError:
            return "Ошибка декодирования"
        }
    }
}
