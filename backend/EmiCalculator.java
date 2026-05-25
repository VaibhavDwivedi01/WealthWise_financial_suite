import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class EmiCalculator {

    public static class SinglePrepayment {
        public int month;
        public double amount;
    }

    public static class PrepaymentConfig {
        public double recurringMonthly;
        public List<SinglePrepayment> single;
    }

    public static class EmiRequest {
        public double principal;
        public double interestRate;
        public double tenure;
        public String tenureType;
        public PrepaymentConfig prepayments;
    }

    public static class AmortizationRecord {
        public int month;
        public double beginningBalance;
        public double emi;
        public double extraPaid;
        public double interestPaid;
        public double principalPaid;
        public double endingBalance;

        public AmortizationRecord(int month, double beg, double emi, double extra, double interest, double principal, double end) {
            this.month = month;
            this.beginningBalance = round(beg);
            this.emi = round(emi);
            this.extraPaid = round(extra);
            this.interestPaid = round(interest);
            this.principalPaid = round(principal);
            this.endingBalance = round(Math.max(0, end));
        }
    }

    public static class YearlySummary {
        public int year;
        public double emi;
        public double interestPaid;
        public double principalPaid;
        public double endingBalance;

        public YearlySummary(int year, double emi, double interest, double principal, double end) {
            this.year = year;
            this.emi = round(emi);
            this.interestPaid = round(interest);
            this.principalPaid = round(principal);
            this.endingBalance = round(Math.max(0, end));
        }
    }

    public static class LoanSummary {
        public double emi;
        public double totalInterest;
        public double totalPayment;
        public int tenureMonths;
        public List<AmortizationRecord> schedule;
        public List<YearlySummary> yearlySchedule;

        public LoanSummary(double emi, double totalInterest, double totalPayment, int tenureMonths, List<AmortizationRecord> schedule, List<YearlySummary> yearlySchedule) {
            this.emi = round(emi);
            this.totalInterest = round(totalInterest);
            this.totalPayment = round(totalPayment);
            this.tenureMonths = tenureMonths;
            this.schedule = schedule;
            this.yearlySchedule = yearlySchedule;
        }
    }

    public static class PrepaymentSummary {
        public double totalInterest;
        public double totalPayment;
        public int tenureMonths;
        public double totalPrepaymentsMade;
        public double interestSaved;
        public int monthsSaved;
        public double yearsSaved;
        public List<AmortizationRecord> schedule;
        public List<YearlySummary> yearlySchedule;

        public PrepaymentSummary(double totalInterest, double totalPayment, int tenureMonths, double totalPrepaymentsMade, double interestSaved, int monthsSaved, double yearsSaved, List<AmortizationRecord> schedule, List<YearlySummary> yearlySchedule) {
            this.totalInterest = round(totalInterest);
            this.totalPayment = round(totalPayment);
            this.tenureMonths = tenureMonths;
            this.totalPrepaymentsMade = round(totalPrepaymentsMade);
            this.interestSaved = round(interestSaved);
            this.monthsSaved = monthsSaved;
            this.yearsSaved = round(yearsSaved);
            this.schedule = schedule;
            this.yearlySchedule = yearlySchedule;
        }
    }

    public static class EmiResult {
        public LoanSummary standard;
        public PrepaymentSummary prepayment;

        public EmiResult(LoanSummary standard, PrepaymentSummary prepayment) {
            this.standard = standard;
            this.prepayment = prepayment;
        }
    }

    private static double round(double val) {
        return Math.round(val * 100.0) / 100.0;
    }

    public static EmiResult calculate(EmiRequest req) {
        double P = req.principal;
        double annualR = req.interestRate;
        double T = req.tenure;

        int totalMonths = "years".equalsIgnoreCase(req.tenureType) ? (int) Math.round(T * 12) : (int) Math.round(T);
        double r = annualR / (12 * 100);

        double standardEmi = 0;
        if (r == 0) {
            standardEmi = P / totalMonths;
        } else {
            standardEmi = (P * r * Math.pow(1 + r, totalMonths)) / (Math.pow(1 + r, totalMonths) - 1);
        }

        double balance = P;
        List<AmortizationRecord> standardSchedule = new ArrayList<>();
        double standardTotalInterest = 0;

        for (int month = 1; month <= totalMonths; month++) {
            double interestPaid = balance * r;
            double principalPaid = standardEmi - interestPaid;

            if (balance < principalPaid) {
                principalPaid = balance;
            }

            double endingBalance = balance - principalPaid;
            standardTotalInterest += interestPaid;

            standardSchedule.add(new AmortizationRecord(
                month, balance, interestPaid + principalPaid, 0, interestPaid, principalPaid, endingBalance
            ));

            balance = endingBalance;
            if (balance <= 0) break;
        }

        double standardTotalPayment = P + standardTotalInterest;
        List<YearlySummary> standardYearly = aggregateByYear(standardSchedule);
        LoanSummary standardSummary = new LoanSummary(
            standardEmi, standardTotalInterest, standardTotalPayment, totalMonths, standardSchedule, standardYearly
        );

        double prepayBalance = P;
        List<AmortizationRecord> prepaySchedule = new ArrayList<>();
        double prepayTotalInterest = 0;
        double totalPrepaymentsMade = 0;
        int prepayMonthsCount = 0;

        double recurringPrepay = 0;
        Map<Integer, Double> singlePrepayMap = new HashMap<>();

        if (req.prepayments != null) {
            recurringPrepay = req.prepayments.recurringMonthly;
            if (req.prepayments.single != null) {
                for (SinglePrepayment sp : req.prepayments.single) {
                    if (sp.amount > 0) {
                        singlePrepayMap.put(sp.month, singlePrepayMap.getOrDefault(sp.month, 0.0) + sp.amount);
                    }
                }
            }
        }

        for (int month = 1; month <= totalMonths; month++) {
            if (prepayBalance <= 0) break;

            double interestPaid = prepayBalance * r;
            double regularPrincipal = standardEmi - interestPaid;

            double extraThisMonth = recurringPrepay;
            if (singlePrepayMap.containsKey(month)) {
                extraThisMonth += singlePrepayMap.get(month);
            }

            double totalPrincipalAttempt = regularPrincipal + extraThisMonth;

            if (prepayBalance < totalPrincipalAttempt) {
                totalPrincipalAttempt = prepayBalance;
                extraThisMonth = Math.max(0, prepayBalance - regularPrincipal);
            }

            double actualPrincipalPaid = totalPrincipalAttempt;
            double endingBalance = prepayBalance - actualPrincipalPaid;

            prepayTotalInterest += interestPaid;
            totalPrepaymentsMade += extraThisMonth;
            prepayMonthsCount++;

            prepaySchedule.add(new AmortizationRecord(
                month, prepayBalance, interestPaid + regularPrincipal, extraThisMonth, interestPaid, actualPrincipalPaid, endingBalance
            ));

            prepayBalance = endingBalance;
        }

        double prepayTotalPayment = P + prepayTotalInterest;
        List<YearlySummary> prepayYearly = aggregateByYear(prepaySchedule);
        double interestSaved = Math.max(0, standardTotalInterest - prepayTotalInterest);
        int monthsSaved = Math.max(0, totalMonths - prepayMonthsCount);
        double yearsSaved = (double) monthsSaved / 12.0;

        PrepaymentSummary prepaySummary = new PrepaymentSummary(
            prepayTotalInterest, prepayTotalPayment, prepayMonthsCount, totalPrepaymentsMade, interestSaved, monthsSaved, yearsSaved, prepaySchedule, prepayYearly
        );

        return new EmiResult(standardSummary, prepaySummary);
    }

    private static List<YearlySummary> aggregateByYear(List<AmortizationRecord> schedule) {
        List<YearlySummary> yearly = new ArrayList<>();
        double yearlyInterest = 0;
        double yearlyPrincipal = 0;
        double yearlyEmi = 0;
        int year = 1;

        for (int i = 0; i < schedule.size(); i++) {
            AmortizationRecord rec = schedule.get(i);
            yearlyInterest += rec.interestPaid;
            yearlyPrincipal += rec.principalPaid;
            yearlyEmi += rec.emi + rec.extraPaid;

            if (rec.month % 12 == 0 || i == schedule.size() - 1) {
                yearly.add(new YearlySummary(
                    year, yearlyEmi, yearlyInterest, yearlyPrincipal, rec.endingBalance
                ));
                yearlyInterest = 0;
                yearlyPrincipal = 0;
                yearlyEmi = 0;
                year++;
            }
        }
        return yearly;
    }
}
