import com.google.gson.Gson;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class AppServer {

    private static final int PORT = 3000;
    private static final Gson gson = new Gson();

    // Google Gemini API Key
    private static final String GEMINI_API_KEY = "AIzaSyBRHX50u5WyI61vhmMOBui9g86aLtY90Es"; 

    public static void main(String[] args) throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);

        // Bind API handlers
        server.createContext("/api/calculate-emi", new EmiHandler());
        server.createContext("/api/calculate-insurance", new InsuranceHandler());
        server.createContext("/api/auth/register", new RegisterHandler());
        server.createContext("/api/auth/login", new LoginHandler());
        server.createContext("/api/history/save", new SaveHistoryHandler());
        server.createContext("/api/history/list", new ListHistoryHandler());
        server.createContext("/api/admin/data", new AdminDataHandler());
        server.createContext("/api/admin/delete-user", new AdminDeleteUserHandler());
        server.createContext("/api/bank-rates", new BankRatesHandler());
        server.createContext("/api/chatbot", new ChatbotHandler());
        
        server.createContext("/", new StaticFileHandler());

        server.setExecutor(null);
        server.start();
        System.out.println("Java Web Server running on http://localhost:" + PORT);
    }

    private static String readRequestBody(HttpExchange exchange) throws IOException {
        InputStream is = exchange.getRequestBody();
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        byte[] buffer = new byte[1024];
        int bytesRead;
        while ((bytesRead = is.read(buffer)) != -1) {
            bos.write(buffer, 0, bytesRead);
        }
        return new String(bos.toByteArray(), StandardCharsets.UTF_8);
    }

    private static void sendJsonResponse(HttpExchange exchange, int statusCode, Object responseObj) throws IOException {
        String json = gson.toJson(responseObj);
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);

        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type");

        exchange.sendResponseHeaders(statusCode, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private static boolean handleOptions(HttpExchange exchange) throws IOException {
        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
            exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
            exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type");
            exchange.sendResponseHeaders(204, -1);
            return true;
        }
        return false;
    }

    private static class EmiHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handleOptions(exchange)) return;

            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendJsonResponse(exchange, 405, new AppServer.ErrorResponse("Method Not Allowed"));
                return;
            }

            try {
                String body = readRequestBody(exchange);
                EmiCalculator.EmiRequest req = gson.fromJson(body, EmiCalculator.EmiRequest.class);

                if (req == null || req.principal <= 0 || req.interestRate < 0 || req.tenure <= 0) {
                    sendJsonResponse(exchange, 400, new AppServer.ErrorResponse("Invalid input parameters."));
                    return;
                }

                EmiCalculator.EmiResult result = EmiCalculator.calculate(req);
                sendJsonResponse(exchange, 200, result);
            } catch (Exception e) {
                e.printStackTrace();
                sendJsonResponse(exchange, 500, new AppServer.ErrorResponse("Server error during EMI calculation."));
            }
        }
    }

    private static class InsuranceHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handleOptions(exchange)) return;

            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendJsonResponse(exchange, 405, new AppServer.ErrorResponse("Method Not Allowed"));
                return;
            }

            try {
                String body = readRequestBody(exchange);
                InsuranceCalculator.InsuranceRequest req = gson.fromJson(body, InsuranceCalculator.InsuranceRequest.class);

                if (req == null || req.type == null || req.details == null) {
                    sendJsonResponse(exchange, 400, new AppServer.ErrorResponse("Invalid insurance request details."));
                    return;
                }

                InsuranceCalculator.InsuranceResult result = InsuranceCalculator.calculate(req);
                sendJsonResponse(exchange, 200, result);
            } catch (Exception e) {
                e.printStackTrace();
                sendJsonResponse(exchange, 500, new AppServer.ErrorResponse("Server error during insurance calculation."));
            }
        }
    }

    private static class RegisterHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handleOptions(exchange)) return;

            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendJsonResponse(exchange, 405, new AppServer.ErrorResponse("Method Not Allowed"));
                return;
            }

            try {
                String body = readRequestBody(exchange);
                Map<String, String> req = gson.fromJson(body, Map.class);
                
                String name = req.get("name");
                String email = req.get("email");
                String password = req.get("password");

                Database.User user = Database.registerUser(name, email, password);
                sendJsonResponse(exchange, 200, user);
            } catch (Exception e) {
                sendJsonResponse(exchange, 400, new AppServer.ErrorResponse(e.getMessage()));
            }
        }
    }

    private static class LoginHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handleOptions(exchange)) return;

            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendJsonResponse(exchange, 405, new AppServer.ErrorResponse("Method Not Allowed"));
                return;
            }

            try {
                String body = readRequestBody(exchange);
                Map<String, String> req = gson.fromJson(body, Map.class);
                
                String email = req.get("email");
                String password = req.get("password");

                Database.User user = Database.loginUser(email, password);
                if (user != null) {
                    sendJsonResponse(exchange, 200, user);
                } else {
                    sendJsonResponse(exchange, 401, new AppServer.ErrorResponse("Invalid email address or password."));
                }
            } catch (Exception e) {
                sendJsonResponse(exchange, 500, new AppServer.ErrorResponse("Server error during login."));
            }
        }
    }

    private static class SaveHistoryHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handleOptions(exchange)) return;

            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendJsonResponse(exchange, 405, new AppServer.ErrorResponse("Method Not Allowed"));
                return;
            }

            try {
                String body = readRequestBody(exchange);
                Map<String, Object> req = gson.fromJson(body, Map.class);
                
                int userId = ((Number) req.get("userId")).intValue();
                String calcType = (String) req.get("calcType");

                if ("loan".equalsIgnoreCase(calcType)) {
                    double principal = ((Number) req.get("loanAmount")).doubleValue();
                    double rate = ((Number) req.get("interestRate")).doubleValue();
                    double tenure = ((Number) req.get("tenure")).doubleValue();
                    double emi = ((Number) req.get("emi")).doubleValue();
                    
                    Database.LoanRecord rec = Database.saveLoan(userId, principal, rate, tenure, emi);
                    sendJsonResponse(exchange, 200, rec);
                } else if ("insurance".equalsIgnoreCase(calcType) || "life".equalsIgnoreCase(calcType) || "health".equalsIgnoreCase(calcType) || "auto".equalsIgnoreCase(calcType)) {
                    double coverage = ((Number) req.get("coverageAmount")).doubleValue();
                    double premium = ((Number) req.get("premium")).doubleValue();
                    double duration = ((Number) req.get("duration")).doubleValue();
                    String type = (String) req.get("insuranceType");

                    Database.InsuranceRecord rec = Database.saveInsurance(userId, coverage, premium, duration, type);
                    sendJsonResponse(exchange, 200, rec);
                } else {
                    sendJsonResponse(exchange, 400, new AppServer.ErrorResponse("Invalid calculation type."));
                }
            } catch (Exception e) {
                sendJsonResponse(exchange, 500, new AppServer.ErrorResponse("Server error saving history."));
            }
        }
    }

    private static class ListHistoryHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handleOptions(exchange)) return;

            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendJsonResponse(exchange, 405, new AppServer.ErrorResponse("Method Not Allowed"));
                return;
            }

            try {
                String body = readRequestBody(exchange);
                Map<String, Object> req = gson.fromJson(body, Map.class);
                int userId = ((Number) req.get("userId")).intValue();

                List<Database.LoanRecord> loans = Database.getUserLoans(userId);
                List<Database.InsuranceRecord> insurance = Database.getUserInsurance(userId);

                Map<String, Object> history = new HashMap<>();
                history.put("loans", loans);
                history.put("insurance", insurance);

                sendJsonResponse(exchange, 200, history);
            } catch (Exception e) {
                sendJsonResponse(exchange, 500, new AppServer.ErrorResponse("Server error retrieving history."));
            }
        }
    }

    private static class AdminDataHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handleOptions(exchange)) return;

            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendJsonResponse(exchange, 405, new AppServer.ErrorResponse("Method Not Allowed"));
                return;
            }

            try {
                String body = readRequestBody(exchange);
                Map<String, Object> req = gson.fromJson(body, Map.class);
                String email = (String) req.get("email");

                if (email == null || !email.toLowerCase().contains("admin")) {
                    sendJsonResponse(exchange, 403, new AppServer.ErrorResponse("Forbidden: Admin access required."));
                    return;
                }

                Map<String, Object> adminData = Database.getAdminData();
                sendJsonResponse(exchange, 200, adminData);
            } catch (Exception e) {
                e.printStackTrace();
                sendJsonResponse(exchange, 500, new AppServer.ErrorResponse("Server error retrieving admin data."));
            }
        }
    }

    private static class AdminDeleteUserHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handleOptions(exchange)) return;

            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendJsonResponse(exchange, 405, new AppServer.ErrorResponse("Method Not Allowed"));
                return;
            }

            try {
                String body = readRequestBody(exchange);
                Map<String, Object> req = gson.fromJson(body, Map.class);
                
                String adminEmail = (String) req.get("adminEmail");
                if (adminEmail == null || !adminEmail.toLowerCase().contains("admin")) {
                    sendJsonResponse(exchange, 403, new AppServer.ErrorResponse("Forbidden: Admin access required."));
                    return;
                }

                int targetUserId = ((Number) req.get("targetUserId")).intValue();
                boolean success = Database.deleteUser(targetUserId);
                
                Map<String, Object> response = new HashMap<>();
                response.put("success", success);
                sendJsonResponse(exchange, 200, response);
            } catch (Exception e) {
                e.printStackTrace();
                sendJsonResponse(exchange, 500, new AppServer.ErrorResponse("Server error during administrative user deletion."));
            }
        }
    }

    private static class BankRatesHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handleOptions(exchange)) return;

            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendJsonResponse(exchange, 405, new AppServer.ErrorResponse("Method Not Allowed"));
                return;
            }

            try {
                String body = readRequestBody(exchange);
                Map<String, Object> req = gson.fromJson(body, Map.class);
                
                String currency = (String) req.get("currency");
                int creditScore = ((Number) req.get("creditScore")).intValue();

                List<BankRates.BankProduct> list = BankRates.getRecommendations(currency, creditScore);
                sendJsonResponse(exchange, 200, list);
            } catch (Exception e) {
                e.printStackTrace();
                sendJsonResponse(exchange, 500, new AppServer.ErrorResponse("Server error fetching bank rates."));
            }
        }
    }

    private static class StaticFileHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String path = exchange.getRequestURI().getPath();
            
            if (path == null || path.equals("/") || path.isEmpty()) {
                path = "/index.html";
            }

            // Serve frontend files
            File file = new File("../frontend" + path);
            if (!file.exists() || file.isDirectory()) {
                if (!path.endsWith(".css") && !path.endsWith(".js") && !path.endsWith(".png") && !path.endsWith(".jpg") && !path.endsWith(".ico")) {
                    file = new File("../frontend/index.html");
                }
            }

            if (!file.exists()) {
                String response = "404 Not Found";
                exchange.sendResponseHeaders(404, response.length());
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(response.getBytes());
                }
                return;
            }

            // Determine Content Type
            String contentType = "text/plain";
            String name = file.getName().toLowerCase();
            if (name.endsWith(".html")) contentType = "text/html; charset=utf-8";
            else if (name.endsWith(".css")) contentType = "text/css; charset=utf-8";
            else if (name.endsWith(".js")) contentType = "application/javascript; charset=utf-8";
            else if (name.endsWith(".ico")) contentType = "image/x-icon";
            else if (name.endsWith(".png")) contentType = "image/png";
            else if (name.endsWith(".jpg") || name.endsWith(".jpeg")) contentType = "image/jpeg";
            else if (name.endsWith(".svg")) contentType = "image/svg+xml";

            exchange.getResponseHeaders().set("Content-Type", contentType);
            exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");

            byte[] bytes = Files.readAllBytes(file.toPath());
            exchange.sendResponseHeaders(200, bytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(bytes);
            }
        }
    }

    private static class ChatbotHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handleOptions(exchange)) return;

            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendJsonResponse(exchange, 405, new AppServer.ErrorResponse("Method Not Allowed"));
                return;
            }

            try {
                String body = readRequestBody(exchange);
                Map<String, String> req = gson.fromJson(body, Map.class);
                String userMessage = req.get("message");

                if (userMessage == null || userMessage.trim().isEmpty()) {
                    sendJsonResponse(exchange, 400, new AppServer.ErrorResponse("Message query is empty."));
                    return;
                }

                // Resolve API Key
                String apiKey = GEMINI_API_KEY;
                if (apiKey == null || apiKey.trim().isEmpty()) {
                    apiKey = System.getenv("GEMINI_API_KEY");
                }

                if (apiKey == null || apiKey.trim().isEmpty()) {
                    Map<String, Object> fallbackRes = new HashMap<>();
                    fallbackRes.put("fallback", true);
                    sendJsonResponse(exchange, 200, fallbackRes);
                    return;
                }

                // Call Gemini API pipeline
                HttpClient client = HttpClient.newHttpClient();

                String systemPrompt = "System instructions:\n" +
                    "You are 'Wealthy', a specialized personal finance advisor on the WealthWise Dashboard.\n" +
                    "1. ONLY answer questions related to loans, EMIs, credit scores, interest rates, prepayments, and personal insurance (life, health, auto).\n" +
                    "2. If the user asks an off-topic question, a personal question, a generic conversational question not related to finance, or any 'off' question, you must politely decline to answer. Say: 'I am designed to focus exclusively on your financial, loan, and insurance calculations. Let me know if you would like to model a scenario on the dashboard!'\n" +
                    "3. Keep your answers warm, professional, extremely concise (maximum 3 sentences), and format key figures cleanly.\n\n" +
                    "User query: ";

                // Build request payload
                Map<String, Object> reqBody = new HashMap<>();
                List<Map<String, Object>> contents = new ArrayList<>();
                Map<String, Object> contentObj = new HashMap<>();
                List<Map<String, Object>> parts = new ArrayList<>();
                Map<String, Object> partObj = new HashMap<>();

                partObj.put("text", systemPrompt + userMessage);
                parts.add(partObj);
                contentObj.put("parts", parts);
                contents.add(contentObj);
                reqBody.put("contents", contents);

                String requestJson = gson.toJson(reqBody);

                HttpResponse<String> response = null;
                String responseBody = "";
                boolean success = false;
                
                String[] models = {
                    "gemini-2.5-flash-lite",
                    "gemini-3.1-flash-lite",
                    "gemini-3.5-flash",
                    "gemini-flash-latest",
                    "gemini-2.5-flash"
                };
                
                for (String model : models) {
                    HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey))
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(requestJson, StandardCharsets.UTF_8))
                        .build();

                    try {
                        response = client.send(request, HttpResponse.BodyHandlers.ofString());
                        responseBody = response.body();

                        if (response.statusCode() == 200) {
                            success = true;
                            break;
                        } else {
                            System.err.println("Gemini Model " + model + " failed with Status: " + response.statusCode());
                            System.err.println("Error Response: " + responseBody);
                        }
                    } catch (Exception e) {
                        System.err.println("Failed to query Gemini Model " + model + ": " + e.getMessage());
                    }
                }

                if (success && response != null) {
                    Map<String, Object> resMap = gson.fromJson(responseBody, Map.class);
                    List<Map<String, Object>> candidates = (List<Map<String, Object>>) resMap.get("candidates");
                    if (candidates != null && !candidates.isEmpty()) {
                        Map<String, Object> candidate = candidates.get(0);
                        Map<String, Object> content = (Map<String, Object>) candidate.get("content");
                        if (content != null) {
                            List<Map<String, Object>> resParts = (List<Map<String, Object>>) content.get("parts");
                            if (resParts != null && !resParts.isEmpty()) {
                                String replyText = (String) resParts.get(0).get("text");
                                
                                Map<String, Object> successRes = new HashMap<>();
                                successRes.put("reply", replyText.trim());
                                sendJsonResponse(exchange, 200, successRes);
                                return;
                            }
                        }
                    }
                }

                // Local fallback on error
                Map<String, Object> errorFallbackRes = new HashMap<>();
                errorFallbackRes.put("fallback", true);
                sendJsonResponse(exchange, 200, errorFallbackRes);

            } catch (Exception e) {
                e.printStackTrace();
                Map<String, Object> errorFallbackRes = new HashMap<>();
                errorFallbackRes.put("fallback", true);
                sendJsonResponse(exchange, 200, errorFallbackRes);
            }
        }
    }

    public static class ErrorResponse {
        public String error;
        public ErrorResponse(String error) {
            this.error = error;
        }
    }
}
