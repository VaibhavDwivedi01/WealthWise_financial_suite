import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class DecisionTreePredictor {

    public static class PredictRequest {
        public int age;
        public double income;
        public boolean hasDependents;
        public boolean ownsVehicle;
        public boolean hasHealthRisk;
    }

    public static class PredictResponse {
        public String recommendedProduct;
        public double recommendedCoverage;
        public String rationale;
        public List<String> decisionPath;
        public List<String> activeNodeIds;
        public TreeNodeDto treeStructure;

        public PredictResponse() {
            this.decisionPath = new ArrayList<>();
            this.activeNodeIds = new ArrayList<>();
        }
    }

    // A simplified DTO representation of the decision tree for the frontend to render
    public static class TreeNodeDto {
        public String id;
        public String label;
        public String conditionText;
        public boolean isLeaf;
        public String resultProduct;
        public double resultCoverage;
        public String resultRationale;
        public TreeNodeDto left;  // Yes path
        public TreeNodeDto right; // No path

        public TreeNodeDto(String id, String label, String conditionText) {
            this.id = id;
            this.label = label;
            this.conditionText = conditionText;
            this.isLeaf = false;
        }

        public TreeNodeDto(String id, String label, String resultProduct, double resultCoverage, String resultRationale) {
            this.id = id;
            this.label = label;
            this.resultProduct = resultProduct;
            this.resultCoverage = resultCoverage;
            this.resultRationale = resultRationale;
            this.isLeaf = true;
        }
    }

    // Abstract Class for Node
    public static abstract class Node {
        public String id;
        public String label;

        public Node(String id, String label) {
            this.id = id;
            this.label = label;
        }

        public abstract Node evaluate(PredictRequest req, PredictResponse resp);
        public abstract TreeNodeDto toDto();
    }

    // Split Node evaluating a binary condition
    public static class SplitNode extends Node {
        public String conditionText;
        public java.util.function.Predicate<PredictRequest> condition;
        public Node left;  // Mapped to YES
        public Node right; // Mapped to NO

        public SplitNode(String id, String label, String conditionText, java.util.function.Predicate<PredictRequest> condition) {
            super(id, label);
            this.conditionText = conditionText;
            this.condition = condition;
        }

        @Override
        public Node evaluate(PredictRequest req, PredictResponse resp) {
            resp.activeNodeIds.add(this.id);
            if (condition.test(req)) {
                resp.decisionPath.add(label + " -> YES: " + conditionText);
                return left;
            } else {
                resp.decisionPath.add(label + " -> NO: " + conditionText);
                return right;
            }
        }

        @Override
        public TreeNodeDto toDto() {
            TreeNodeDto dto = new TreeNodeDto(this.id, this.label, this.conditionText);
            if (this.left != null) dto.left = this.left.toDto();
            if (this.right != null) dto.right = this.right.toDto();
            return dto;
        }
    }

    // Leaf Node representing a final prediction result
    public static class LeafNode extends Node {
        public String recommendedProduct;
        public double recommendedCoverage;
        public String rationale;

        public LeafNode(String id, String label, String product, double coverage, String rationale) {
            super(id, label);
            this.recommendedProduct = product;
            this.recommendedCoverage = coverage;
            this.rationale = rationale;
        }

        @Override
        public Node evaluate(PredictRequest req, PredictResponse resp) {
            resp.activeNodeIds.add(this.id);
            resp.recommendedProduct = this.recommendedProduct;
            resp.recommendedCoverage = this.recommendedCoverage;
            resp.rationale = this.rationale;
            resp.decisionPath.add("Leaf Reached: Recommended " + this.recommendedProduct);
            return null; // Stop traversal
        }

        @Override
        public TreeNodeDto toDto() {
            return new TreeNodeDto(this.id, this.label, this.recommendedProduct, this.recommendedCoverage, this.rationale);
        }
    }

    private static Node root;

    static {
        buildDecisionTree();
    }

    private static void buildDecisionTree() {
        // Root: Age <= 35
        SplitNode ageNode = new SplitNode("N1", "Age Evaluator", "Is proposer's age 35 or under?", req -> req.age <= 35);

        // --- Young branch (<= 35) ---
        SplitNode youngDependents = new SplitNode("N2", "Dependents Evaluator (Young)", "Does the proposer have family dependents?", req -> req.hasDependents);
        
        // Young with dependents
        SplitNode youngDepIncome = new SplitNode("N4", "Income Evaluator (Young Parent)", "Is net annual income ₹8,00,000 ($10,000) or more?", req -> req.income >= 800000);
        LeafNode leafPremiumCombo = new LeafNode("L1", "Premium Shield Bundle", "Term Life (Premium) + Health Floater Plan", 10000000, 
            "As a young proposer with dependents and high income, a premium protection bundle is ideal. This safeguards your family's future with a ₹1 Crore Term Life policy and provides ₹10 Lakh Comprehensive Health cover for unexpected medical needs.");
        LeafNode leafStandardCombo = new LeafNode("L2", "Standard Shield Bundle", "Term Life (Standard) + Health Floater Plan", 5000000, 
            "As a young proposer with dependents and standard income, we recommend our standard protection bundle. A ₹50 Lakh Term Life policy secures your dependents, and a ₹5 Lakh Family Floater Health policy covers medical emergencies.");
        youngDepIncome.left = leafPremiumCombo;
        youngDepIncome.right = leafStandardCombo;
        youngDependents.left = youngDepIncome;

        // Young without dependents
        SplitNode youngNoDepVehicle = new SplitNode("N5", "Vehicle Ownership Evaluator (Young Single)", "Does the proposer own a vehicle?", req -> req.ownsVehicle);
        LeafNode leafAutoHealth = new LeafNode("L3", "Auto & Health Protection", "Comprehensive Auto Cover + Individual Health Plan", 500000, 
            "Since you are young and single with no dependents but own a vehicle, we recommend securing your assets and health. You get Comprehensive Auto Insurance to protect your vehicle, paired with a high-utility ₹5 Lakh Individual Health plan.");
        LeafNode leafSoloHealth = new LeafNode("L4", "Solo Health Care Plan", "Comprehensive Individual Health Insurance", 500000, 
            "As a young, single individual without dependents or vehicle assets, your primary risk is health. A ₹5 Lakh Individual Health Care plan ensures cashless protection against hospitalization while keeping premiums extremely affordable.");
        youngNoDepVehicle.left = leafAutoHealth;
        youngNoDepVehicle.right = leafSoloHealth;
        youngDependents.right = youngNoDepVehicle;

        ageNode.left = youngDependents;


        // --- Mature branch (> 35) ---
        SplitNode matureIncome = new SplitNode("N3", "Income Evaluator (Mature Proposer)", "Is net annual income ₹10,00,000 ($12,500) or more?", req -> req.income >= 1000000);
        
        // High Income Mature
        SplitNode matureHighIncomeRisk = new SplitNode("N6", "Health Risk Evaluator (Mature High-Earner)", "Do you have pre-existing health risks or smoke?", req -> req.hasHealthRisk);
        LeafNode leafPremiumHealthRiders = new LeafNode("L5", "Premium Health Shield & Critical Care", "High-Value Health Shield + Critical Illness Riders", 1500000, 
            "As a high-earning mature proposer with pre-existing risks or smoking habits, a top-tier health buffer is essential. A ₹15 Lakh Health policy with Critical Illness and OPD riders guarantees robust protection against chronic illnesses.");
        LeafNode leafPremiumLifeHealth = new LeafNode("L6", "Executive Financial Security Plan", "High-Value Term Life + Comprehensive Health Care", 15000000, 
            "As a high-earning mature proposer in excellent health, it is the perfect window to lock in high-value cover. We recommend a ₹1.5 Crore Term Life policy paired with a ₹10 Lakh Comprehensive Health floater.");
        matureHighIncomeRisk.left = leafPremiumHealthRiders;
        matureHighIncomeRisk.right = leafPremiumLifeHealth;
        matureIncome.left = matureHighIncomeRisk;

        // Standard Income Mature
        SplitNode matureStdDependents = new SplitNode("N7", "Dependents Evaluator (Mature Standard)", "Does the proposer have family dependents?", req -> req.hasDependents);
        LeafNode leafFamilyFloaterStd = new LeafNode("L7", "Family Health Floater", "Comprehensive Family Health Joint Shield", 750000, 
            "As a mature proposer with family dependents, safeguarding your household is priority. A ₹7.5 Lakh Family Floater Health policy covers you, your spouse, and children collectively, avoiding multi-premium overlaps.");
        
        SplitNode matureStdNoDepVehicle = new SplitNode("N15", "Vehicle Ownership Evaluator (Mature Single)", "Does the proposer own a vehicle?", req -> req.ownsVehicle);
        LeafNode leafAutoHealthStd = new LeafNode("L8", "Asset & Core Health Bundle", "Auto Protection + Individual Health Cover", 300000, 
            "For a single mature proposer with vehicle assets, we recommend a balanced layout. This covers your car under Comprehensive Auto Insurance and secures your well-being with a reliable ₹3 Lakh Individual Health plan.");
        LeafNode leafCoreHealthRider = new LeafNode("L9", "Individual Health Care & Critical Illness", "Standard Individual Health + Critical Illness Rider", 500000, 
            "As a mature single individual without dependents, prioritizing your future well-being is critical. A ₹5 Lakh Individual Health plan coupled with a Critical Illness rider provides deep risk loading buffers.");
        matureStdNoDepVehicle.left = leafAutoHealthStd;
        matureStdNoDepVehicle.right = leafCoreHealthRider;
        
        matureStdDependents.left = leafFamilyFloaterStd;
        matureStdDependents.right = matureStdNoDepVehicle;
        matureIncome.right = matureStdDependents;

        ageNode.right = matureIncome;

        root = ageNode;
    }

    public static PredictResponse predict(PredictRequest req) {
        PredictResponse resp = new PredictResponse();
        
        Node current = root;
        while (current != null) {
            current = current.evaluate(req, resp);
        }
        
        resp.treeStructure = root.toDto();
        return resp;
    }
}
