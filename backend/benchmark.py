"""
QuantumRoute - Scalability Benchmark Engine
Runs QPSO against Classical PSO and Genetic Algorithm across increasing stop counts (10, 20, 30, 40 stops).
Calculates:
- Final fitness / cost
- Runtime in milliseconds
- Convergence speed (iterations to reach within 5% of best-known solution proxy)
"""

import time
import random
from typing import Dict, List, Any
from backend.graph_model import CityNetwork
from backend.qpso import QPSOOptimizer
from backend.baselines import ClassicalPSOOptimizer, GeneticAlgorithmOptimizer


def run_scalability_benchmark(
    network_nodes: int = 48,
    stop_counts: List[int] = None,
    congestion_mode: str = "rush_hour",
    num_particles: int = 25,
    max_iterations: int = 60
) -> Dict[str, Any]:
    """
    Executes a multi-scale benchmark across 10, 20, 30, 40 stops.
    All algorithms evaluate the identical network and stop demands.
    """
    if stop_counts is None:
        stop_counts = [10, 20, 30, 40]

    # Filter stop_counts to ensure we have enough nodes in network
    valid_stop_counts = [s for s in stop_counts if s < network_nodes]
    if not valid_stop_counts:
        valid_stop_counts = [min(10, network_nodes - 2)]

    # Generate synthetic benchmark city network
    city = CityNetwork(num_nodes=network_nodes, congestion_mode=congestion_mode, seed=1337)
    
    algorithms = ["QPSO", "Classical PSO", "Genetic Algorithm"]
    
    results = {
        "stops_tested": valid_stop_counts,
        "algorithms": algorithms,
        "congestion_mode": congestion_mode,
        "cost_by_stop_count": {alg: [] for alg in algorithms},
        "runtime_by_stop_count": {alg: [] for alg in algorithms},
        "convergence_iter_by_stop_count": {alg: [] for alg in algorithms},
        "detailed_runs": []
    }

    depot = 0
    all_available_stops = list(range(1, city.num_nodes))

    for stop_count in valid_stop_counts:
        # Select deterministic subset of stops for consistency
        random.seed(42 + stop_count)
        selected_stops = random.sample(all_available_stops, stop_count)
        demands = {s: city.nodes_data[s]["demand"] for s in selected_stops}

        all_stops_with_depot = [depot] + selected_stops
        cost_matrix, _ = city.get_cost_matrix(all_stops_with_depot)

        # 1. Run QPSO
        qpso = QPSOOptimizer(
            cost_matrix=cost_matrix,
            stop_nodes=selected_stops,
            start_node=depot,
            demands=demands,
            vehicle_capacity=35,
            num_particles=num_particles,
            max_iterations=max_iterations,
            seed=42
        )
        res_qpso = qpso.optimize()

        # 2. Run Classical PSO
        pso = ClassicalPSOOptimizer(
            cost_matrix=cost_matrix,
            stop_nodes=selected_stops,
            start_node=depot,
            demands=demands,
            vehicle_capacity=35,
            num_particles=num_particles,
            max_iterations=max_iterations,
            seed=42
        )
        res_pso = pso.optimize()

        # 3. Run Genetic Algorithm
        ga = GeneticAlgorithmOptimizer(
            cost_matrix=cost_matrix,
            stop_nodes=selected_stops,
            start_node=depot,
            demands=demands,
            vehicle_capacity=35,
            population_size=num_particles,
            max_generations=max_iterations,
            seed=42
        )
        res_ga = ga.optimize()

        # Define Best-Known Proxy Optimum f* = min(QPSO, PSO, GA)
        best_known_fitness = min(res_qpso["best_cost"], res_pso["best_cost"], res_ga["best_cost"])
        target_fitness = best_known_fitness * 1.05  # Within 5% of best-known

        def get_iter_to_target(convergence: List[float], target: float) -> int:
            for idx, val in enumerate(convergence):
                if val <= target:
                    return idx + 1
            return len(convergence)

        iter_qpso = get_iter_to_target(res_qpso["convergence"], target_fitness)
        iter_pso = get_iter_to_target(res_pso["convergence"], target_fitness)
        iter_ga = get_iter_to_target(res_ga["convergence"], target_fitness)

        # Append to aggregates
        results["cost_by_stop_count"]["QPSO"].append(res_qpso["best_cost"])
        results["cost_by_stop_count"]["Classical PSO"].append(res_pso["best_cost"])
        results["cost_by_stop_count"]["Genetic Algorithm"].append(res_ga["best_cost"])

        results["runtime_by_stop_count"]["QPSO"].append(res_qpso["runtime_ms"])
        results["runtime_by_stop_count"]["Classical PSO"].append(res_pso["runtime_ms"])
        results["runtime_by_stop_count"]["Genetic Algorithm"].append(res_ga["runtime_ms"])

        results["convergence_iter_by_stop_count"]["QPSO"].append(iter_qpso)
        results["convergence_iter_by_stop_count"]["Classical PSO"].append(iter_pso)
        results["convergence_iter_by_stop_count"]["Genetic Algorithm"].append(iter_ga)

        results["detailed_runs"].append({
            "stops": stop_count,
            "best_known_proxy": best_known_fitness,
            "qpso": {"cost": res_qpso["best_cost"], "runtime_ms": res_qpso["runtime_ms"], "converged_iter": iter_qpso},
            "pso": {"cost": res_pso["best_cost"], "runtime_ms": res_pso["runtime_ms"], "converged_iter": iter_pso},
            "ga": {"cost": res_ga["best_cost"], "runtime_ms": res_ga["runtime_ms"], "converged_iter": iter_ga},
        })

    return results
