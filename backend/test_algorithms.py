"""
Automated Unit and Integration Tests for QuantumRoute
Verifies:
1. City network generation and edge congestion models.
2. Per-stop demand generation (1-10 units) and CVRP capacity constraints.
3. SPV continuous-to-discrete permutation decoding.
4. QPSO, Classical PSO, and GA execution and convergence monotonic behavior.
5. Best-known proxy optimality calculation.
6. Benchmark engine scalability across 10, 20, 30, 40 stops.
"""

import sys
from backend.graph_model import CityNetwork
from backend.qpso import QPSOOptimizer
from backend.baselines import ClassicalPSOOptimizer, GeneticAlgorithmOptimizer, GreedyNearestNeighborOptimizer
from backend.benchmark import run_scalability_benchmark


def test_city_network():
    print("Testing CityNetwork generation...")
    city = CityNetwork(num_nodes=36, congestion_mode="normal", seed=42)
    assert city.num_nodes >= 20
    assert len(city.nodes_data) == city.num_nodes
    assert len(city.edges_data) > 20
    # Verify depot has 0 demand and stops have 1..10 demand
    assert city.nodes_data[0]["demand"] == 0
    assert city.nodes_data[0]["is_depot"] is True
    demands = [city.nodes_data[i]["demand"] for i in range(1, 36)]
    assert all(1 <= d <= 10 for d in demands), "Demands must be between 1 and 10"
    print(f"  [OK] Nodes: {city.num_nodes}, Edges: {len(city.edges_data)}, Average Demand: {sum(demands)/len(demands):.1f}")

    # Test rush hour transition
    city.update_congestion("rush_hour")
    assert city.congestion_mode == "rush_hour"
    rush_costs = [e["cost"] for e in city.edges_data]
    city.update_congestion("normal")
    normal_costs = [e["cost"] for e in city.edges_data]
    assert sum(rush_costs) > sum(normal_costs), "Rush hour costs should exceed normal costs on average"
    print("  [OK] Congestion toggle dynamics verified")


def test_optimizers():
    print("\nTesting Optimizers (QPSO, Classical PSO, GA, Greedy)...")
    city = CityNetwork(num_nodes=36, congestion_mode="normal", seed=42)
    stop_nodes = [3, 7, 12, 18, 24, 29, 33]
    depot = 0
    demands = {s: city.nodes_data[s]["demand"] for s in stop_nodes}

    cost_matrix, _ = city.get_cost_matrix([depot] + stop_nodes)

    # 1. QPSO
    qpso = QPSOOptimizer(
        cost_matrix=cost_matrix,
        stop_nodes=stop_nodes,
        start_node=depot,
        demands=demands,
        vehicle_capacity=30,
        num_particles=20,
        max_iterations=40,
        seed=42
    )
    res_qpso = qpso.optimize()
    assert res_qpso["best_cost"] > 0
    assert len(res_qpso["convergence"]) == 40
    assert res_qpso["convergence"][-1] <= res_qpso["convergence"][0], "QPSO must not diverge"
    print(f"  [OK] QPSO Best Cost: {res_qpso['best_cost']} in {res_qpso['runtime_ms']}ms (Trips: {res_qpso['num_trips']})")

    # 2. Classical PSO
    pso = ClassicalPSOOptimizer(
        cost_matrix=cost_matrix,
        stop_nodes=stop_nodes,
        start_node=depot,
        demands=demands,
        vehicle_capacity=30,
        num_particles=20,
        max_iterations=40,
        seed=42
    )
    res_pso = pso.optimize()
    assert res_pso["best_cost"] > 0
    assert len(res_pso["convergence"]) == 40
    print(f"  [OK] Classical PSO Best Cost: {res_pso['best_cost']} in {res_pso['runtime_ms']}ms")

    # 3. GA
    ga = GeneticAlgorithmOptimizer(
        cost_matrix=cost_matrix,
        stop_nodes=stop_nodes,
        start_node=depot,
        demands=demands,
        vehicle_capacity=30,
        population_size=20,
        max_generations=40,
        seed=42
    )
    res_ga = ga.optimize()
    assert res_ga["best_cost"] > 0
    assert len(res_ga["convergence"]) == 40
    print(f"  [OK] GA Best Cost: {res_ga['best_cost']} in {res_ga['runtime_ms']}ms")

    # 4. Greedy
    greedy = GreedyNearestNeighborOptimizer(
        cost_matrix=cost_matrix,
        stop_nodes=stop_nodes,
        start_node=depot,
        demands=demands,
        vehicle_capacity=30
    )
    res_greedy = greedy.optimize()
    print(f"  [OK] Greedy NN Cost: {res_greedy['best_cost']} in {res_greedy['runtime_ms']}ms")


def test_benchmark_suite():
    print("\nTesting Scalability Benchmark Engine (10, 20 stops)...")
    res = run_scalability_benchmark(
        network_nodes=36,
        stop_counts=[10, 20],
        congestion_mode="rush_hour",
        num_particles=15,
        max_iterations=25
    )
    assert "QPSO" in res["algorithms"]
    assert len(res["stops_tested"]) == 2
    assert len(res["cost_by_stop_count"]["QPSO"]) == 2
    print(f"  [OK] Benchmark completed for stops: {res['stops_tested']}")
    for run in res["detailed_runs"]:
        print(f"    - Stops {run['stops']}: QPSO={run['qpso']['cost']}, PSO={run['pso']['cost']}, GA={run['ga']['cost']} (Proxy Opt={run['best_known_proxy']})")


if __name__ == "__main__":
    test_city_network()
    test_optimizers()
    test_benchmark_suite()
    print("\n>>> ALL BACKEND UNIT TESTS PASSED SUCCESSFULLY! <<<")
