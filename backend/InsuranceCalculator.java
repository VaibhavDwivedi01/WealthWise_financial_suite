import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class InsuranceCalculator {

    public static class InsuranceRequest {
        public String type;
        public Map<String, Object> details;
    }

    public static class InsuranceResult {
        public String insuranceType;
        public double sumAssured;
        public double coverageAmount;
        public double idv;
        public int age;
        public int userAge;
        public double vehicleAge;
        public int engineCapacity;
        public double noClaimBonus;
        public String gender;
        public boolean isSmoker;
        public int policyTerm;
        public String familyComposition;
        public Map<String, Double> breakdown;
        public double annualPremium;
        public double monthlyPremium;

        public InsuranceResult() {
            this.breakdown = new HashMap<>();
        }
    }

    private static double round(double val) {
        return Math.round(val * 100.0) / 100.0;
    }

    @SuppressWarnings("unchecked")
    public static InsuranceResult calculate(InsuranceRequest req) {
        if (req == null || req.type == null || req.details == null) {
            throw new IllegalArgumentException("Type and details are required.");
        }

        InsuranceResult result = new InsuranceResult();
        String type = req.type.toLowerCase();

        switch (type) {
            case "life": {
                double P = getDouble(req.details.get("sumAssured"), 500000);
                int A = getInt(req.details.get("age"), 30);
                String G = getString(req.details.get("gender"), "male");
                boolean S = getBoolean(req.details.get("smoker"), false);
                int T = getInt(req.details.get("tenure"), 20);

                double baseRate = 0.0001 * Math.pow(1.045, A - 18);
                double premium = P * baseRate;

                if ("female".equalsIgnoreCase(G)) premium *= 0.90;
                if (S) premium *= 1.50;

                double tenureMultiplier = 1 + (T - 10) * 0.01;
                premium *= Math.max(0.8, tenureMultiplier);

                double annualPreTax = premium;
                double taxes = annualPreTax * 0.18;
                double annualPremium = annualPreTax + taxes;

                result.insuranceType = "Term Life Insurance";
                result.sumAssured = P;
                result.age = A;
                result.gender = G;
                result.isSmoker = S;
                result.policyTerm = T;

                result.breakdown.put("basePremium", round(annualPreTax * 0.8));
                result.breakdown.put("riskLoading", S ? round(annualPreTax * 0.35) : 0.0);
                result.breakdown.put("genderDiscount", "female".equalsIgnoreCase(G) ? round(annualPreTax * 0.1) : 0.0);
                result.breakdown.put("taxes", round(taxes));

                result.annualPremium = round(annualPremium);
                result.monthlyPremium = round(annualPremium / 12.0);
                break;
            }

            case "health": {
                double coverage = getDouble(req.details.get("coverageAmount"), 500000);
                int userAge = getInt(req.details.get("age"), 30);
                boolean includeSpouse = getBoolean(req.details.get("includeSpouse"), false);
                int spouseAge = getInt(req.details.get("spouseAge"), userAge);
                int kidsCount = getInt(req.details.get("childrenCount"), 0);

                List<String> conditions = (List<String>) req.details.get("preExistingConditions");
                List<String> riders = (List<String>) req.details.get("riders");

                double coverageScale = coverage / 100000.0;
                double basePremium = getHealthBaseRate(userAge) * coverageScale;
                double spousePremium = 0;

                if (includeSpouse) {
                    spousePremium = getHealthBaseRate(spouseAge) * coverageScale * 0.75;
                }

                double childPremium = kidsCount * 120.0 * (coverageScale * 0.5);
                double subtotal = basePremium + spousePremium + childPremium;

                double medicalLoading = 0;
                if (conditions != null && !conditions.isEmpty()) {
                    double loaded = subtotal * Math.pow(1.20, conditions.size());
                    medicalLoading = loaded - subtotal;
                    subtotal = loaded;
                }

                double ridersPremium = 0;
                if (riders != null) {
                    for (String rider : riders) {
                        if ("critical".equalsIgnoreCase(rider)) ridersPremium += subtotal * 0.15;
                        if ("maternity".equalsIgnoreCase(rider)) ridersPremium += subtotal * 0.25;
                        if ("opd".equalsIgnoreCase(rider)) ridersPremium += subtotal * 0.10;
                    }
                }

                double preTaxTotal = subtotal + ridersPremium;
                double taxes = preTaxTotal * 0.18;
                double annualPremium = preTaxTotal + taxes;

                result.insuranceType = "Comprehensive Health Insurance";
                result.coverageAmount = coverage;
                result.userAge = userAge;
                result.familyComposition = "Self" + (includeSpouse ? " + Spouse" : "") + (kidsCount > 0 ? " + " + kidsCount + " Kid(s)" : "");

                result.breakdown.put("memberPremium", round(basePremium + spousePremium + childPremium));
                result.breakdown.put("medicalLoading", round(medicalLoading));
                result.breakdown.put("ridersPremium", round(ridersPremium));
                result.breakdown.put("taxes", round(taxes));

                result.annualPremium = round(annualPremium);
                result.monthlyPremium = round(annualPremium / 12.0);
                break;
            }

            case "auto": {
                double idv = getDouble(req.details.get("vehicleValue"), 800000);
                double vAge = getDouble(req.details.get("vehicleAge"), 1.0);
                int cc = getInt(req.details.get("engineCC"), 1200);
                double ncb = getDouble(req.details.get("ncbPercent"), 0.0);
                String pType = getString(req.details.get("policyType"), "comprehensive");

                double odPremium = 0;
                double tpPremium = 0;

                if ("comprehensive".equalsIgnoreCase(pType)) {
                    double odRate = 0.026;
                    if (vAge > 1 && vAge <= 2) odRate = 0.024;
                    else if (vAge > 2 && vAge <= 3) odRate = 0.022;
                    else if (vAge > 3 && vAge <= 5) odRate = 0.020;
                    else if (vAge > 5) odRate = 0.017;

                    odPremium = idv * odRate;
                    double ncbDiscount = odPremium * (ncb / 100.0);
                    odPremium = Math.max(0.0, odPremium - ncbDiscount);
                }

                if (cc < 1000) tpPremium = 95.0;
                else if (cc <= 1500) tpPremium = 145.0;
                else tpPremium = 210.0;

                double preTaxTotal = odPremium + tpPremium;
                double taxes = preTaxTotal * 0.18;
                double annualPremium = preTaxTotal + taxes;

                result.insuranceType = pType.substring(0, 1).toUpperCase() + pType.substring(1).toLowerCase() + " Auto Insurance";
                result.idv = idv;
                result.vehicleAge = vAge;
                result.engineCapacity = cc;
                result.noClaimBonus = ncb;

                result.breakdown.put("ownDamage", round(odPremium));
                result.breakdown.put("thirdParty", round(tpPremium));
                result.breakdown.put("taxes", round(taxes));

                result.annualPremium = round(annualPremium);
                result.monthlyPremium = round(annualPremium / 12.0);
                break;
            }

            default:
                throw new IllegalArgumentException("Unsupported insurance type: " + type);
        }

        return result;
    }

    private static double getHealthBaseRate(int age) {
        if (age <= 25) return 150.0;
        if (age <= 35) return 200.0;
        if (age <= 45) return 300.0;
        if (age <= 55) return 480.0;
        return 750.0;
    }

    private static double getDouble(Object obj, double def) {
        if (obj == null) return def;
        if (obj instanceof Number) return ((Number) obj).doubleValue();
        try {
            return Double.parseDouble(obj.toString());
        } catch (Exception e) {
            return def;
        }
    }

    private static int getInt(Object obj, int def) {
        if (obj == null) return def;
        if (obj instanceof Number) return ((Number) obj).intValue();
        try {
            return Integer.parseInt(obj.toString());
        } catch (Exception e) {
            return def;
        }
    }

    private static boolean getBoolean(Object obj, boolean def) {
        if (obj == null) return def;
        if (obj instanceof Boolean) return (Boolean) obj;
        return Boolean.parseBoolean(obj.toString());
    }

    private static String getString(Object obj, String def) {
        if (obj == null) return def;
        return obj.toString();
    }
}
