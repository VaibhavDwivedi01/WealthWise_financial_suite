import java.util.ArrayList;
import java.util.List;

public class BankRates {

    public static class BankProduct {
        public String name;
        public double interestRate;
        public String logoIcon;
        public String benefitTag;

        public BankProduct(String name, double rate, String logo, String benefit) {
            this.name = name;
            this.interestRate = Math.round(rate * 100.0) / 100.0;
            this.logoIcon = logo;
            this.benefitTag = benefit;
        }
    }

    public static List<BankProduct> getRecommendations(String currency, int creditScore) {
        List<BankProduct> list = new ArrayList<>();
        
        // Dynamic base rate pegging based on credit profile
        double baseRate = 8.50; // standard Good (670-739)
        if ("usd".equalsIgnoreCase(currency)) {
            if (creditScore >= 800) baseRate = 6.25;
            else if (creditScore >= 740) baseRate = 7.15;
            else if (creditScore >= 670) baseRate = 8.50;
            else if (creditScore >= 580) baseRate = 10.75;
            else baseRate = 13.95;
            
            // Add premium USD banks with slight realistic variance
            list.add(new BankProduct("Chase Bank", baseRate - 0.20, "fa-building-columns", "Optimal APR discount & zero fee setup"));
            list.add(new BankProduct("Bank of America", baseRate - 0.10, "fa-landmark", "Low upfront legal charges & easy terms"));
            list.add(new BankProduct("Wells Fargo", baseRate, "fa-vault", "Standard flexible reducing balance plan"));
            list.add(new BankProduct("Citibank Premium", baseRate + 0.10, "fa-credit-card", "Fast processing for international buyers"));
        } else {
            // INR
            if (creditScore >= 800) baseRate = 8.25;
            else if (creditScore >= 740) baseRate = 8.40;
            else if (creditScore >= 670) baseRate = 8.55;
            else if (creditScore >= 580) baseRate = 10.75;
            else baseRate = 13.95;
            
            // Add premium INR banks
            list.add(new BankProduct("HDFC Bank", baseRate - 0.15, "fa-building-columns", "Fastest digital sanction & processing"));
            list.add(new BankProduct("ICICI Bank Corporate", baseRate - 0.10, "fa-landmark", "Flexible tenure extends up to 30 years"));
            list.add(new BankProduct("State Bank of India (SBI)", baseRate, "fa-vault", "Lowest processing fees & government backing"));
            list.add(new BankProduct("Axis Bank Direct", baseRate + 0.05, "fa-wallet", "Assured overdraft limits linked to loan account"));
        }
        
        return list;
    }
}
