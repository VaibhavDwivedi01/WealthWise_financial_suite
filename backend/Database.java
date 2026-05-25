import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

public class Database {

    private static final String FILE_PATH = "../database.json"; // Store database in the root!
    private static final Gson gson = new GsonBuilder().setPrettyPrinting().create();
    private static DbData dbData = new DbData();

    public static class DbData {
        public List<User> users = new ArrayList<>();
        public List<LoanRecord> loans = new ArrayList<>();
        public List<InsuranceRecord> insurance = new ArrayList<>();
        
        public int lastUserId = 0;
        public int lastCalcId = 0;
        public int lastInsuranceId = 0;
    }

    public static class User {
        public int user_id;
        public String name;
        public String email;
        public transient String password;
        public String passwordHash;

        public User(int user_id, String name, String email, String passwordHash) {
            this.user_id = user_id;
            this.name = name;
            this.email = email;
            this.passwordHash = passwordHash;
        }
    }

    public static class LoanRecord {
        public int calc_id;
        public int user_id;
        public double loan_amount;
        public double interest_rate;
        public double tenure;
        public double emi;
        public String timestamp;
    }

    public static class InsuranceRecord {
        public int insurance_id;
        public int user_id;
        public double coverage_amount;
        public double premium;
        public double duration;
        public String insurance_type;
        public String timestamp;
    }

    static {
        load();
    }

    private static synchronized void load() {
        File file = new File(FILE_PATH);
        if (!file.exists()) {
            dbData = new DbData();
            save();
            return;
        }

        try (FileReader reader = new FileReader(file)) {
            DbData data = gson.fromJson(reader, DbData.class);
            if (data != null) {
                dbData = data;
            } else {
                dbData = new DbData();
            }
        } catch (IOException e) {
            e.printStackTrace();
            dbData = new DbData();
        }
    }

    private static synchronized void save() {
        try (FileWriter writer = new FileWriter(FILE_PATH)) {
            gson.toJson(dbData, writer);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    private static String hashPassword(String password) {
        if (password == null) return "";
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(password.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm missing", e);
        }
    }

    public static synchronized User registerUser(String name, String email, String password) throws Exception {
        if (name == null || name.trim().isEmpty() || email == null || email.trim().isEmpty() || password == null || password.trim().isEmpty()) {
            throw new IllegalArgumentException("Name, email, and password are required.");
        }

        for (User u : dbData.users) {
            if (u.email.equalsIgnoreCase(email)) {
                throw new Exception("Email address is already registered.");
            }
        }

        dbData.lastUserId++;
        String passHash = hashPassword(password);
        User newUser = new User(dbData.lastUserId, name.trim(), email.trim().toLowerCase(), passHash);
        dbData.users.add(newUser);
        save();
        return newUser;
    }

    public static synchronized User loginUser(String email, String password) {
        if (email == null || password == null) return null;
        
        String passHash = hashPassword(password);
        for (User u : dbData.users) {
            if (u.email.equalsIgnoreCase(email.trim()) && u.passwordHash.equals(passHash)) {
                return u;
            }
        }
        return null;
    }

    public static synchronized LoanRecord saveLoan(int userId, double principal, double rate, double tenure, double emi) {
        dbData.lastCalcId++;
        LoanRecord rec = new LoanRecord();
        rec.calc_id = dbData.lastCalcId;
        rec.user_id = userId;
        rec.loan_amount = principal;
        rec.interest_rate = rate;
        rec.tenure = tenure;
        rec.emi = emi;
        rec.timestamp = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new Date());

        dbData.loans.add(rec);
        save();
        return rec;
    }

    public static synchronized InsuranceRecord saveInsurance(int userId, double coverage, double premium, double duration, String type) {
        dbData.lastInsuranceId++;
        InsuranceRecord rec = new InsuranceRecord();
        rec.insurance_id = dbData.lastInsuranceId;
        rec.user_id = userId;
        rec.coverage_amount = coverage;
        rec.premium = premium;
        rec.duration = duration;
        rec.insurance_type = type;
        rec.timestamp = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new Date());

        dbData.insurance.add(rec);
        save();
        return rec;
    }

    public static synchronized List<LoanRecord> getUserLoans(int userId) {
        List<LoanRecord> list = new ArrayList<>();
        for (LoanRecord r : dbData.loans) {
            if (r.user_id == userId) {
                list.add(r);
            }
        }
        return list;
    }

    public static synchronized List<InsuranceRecord> getUserInsurance(int userId) {
        List<InsuranceRecord> list = new ArrayList<>();
        for (InsuranceRecord r : dbData.insurance) {
            if (r.user_id == userId) {
                list.add(r);
            }
        }
        return list;
    }

    public static synchronized java.util.Map<String, Object> getAdminData() {
        java.util.Map<String, Object> map = new java.util.HashMap<>();
        
        List<User> safeUsers = new ArrayList<>();
        for (User u : dbData.users) {
            safeUsers.add(new User(u.user_id, u.name, u.email, "PROTECTED"));
        }
        
        map.put("users", safeUsers);
        map.put("loans", dbData.loans);
        map.put("insurance", dbData.insurance);
        return map;
    }

    public static synchronized boolean deleteUser(int userId) {
        boolean removed = dbData.users.removeIf(u -> u.user_id == userId);
        dbData.loans.removeIf(l -> l.user_id == userId);
        dbData.insurance.removeIf(i -> i.user_id == userId);
        if (removed) {
            save();
        }
        return removed;
    }
}
