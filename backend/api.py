"""
QuantumRoute - FastAPI Backend Service
Exposes REST endpoints for:
- Synthetic road network generation & dynamic congestion updates
- Single & multi-algorithm route optimization (QPSO, Classical PSO, GA)
- Scalability benchmarking across 10, 20, 30, 40 stops
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
import time

from backend.graph_model import CityNetwork
from backend.qpso import QPSOOptimizer
from backend.baselines import ClassicalPSOOptimizer, GeneticAlgorithmOptimizer, GreedyNearestNeighborOptimizer
from backend.benchmark import run_scalability_benchmark

app = FastAPI(
    title="QuantumRoute API",
    description="Quantum-Inspired Intelligent Traffic Route Optimization with QPSO & Baselines",
    version="1.0.0"
)

# Enable CORS for local React/Vite development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global in-memory state for the active city network
current_network = CityNetwork(num_nodes=36, congestion_mode="normal", seed=42)

# Benchmark results cache to eliminate redundant computation
cached_benchmark_results: Dict[str, Any] = {}


# Pydantic Request Models
class GenerateNetworkRequest(BaseModel):
    num_nodes: int = Field(default=36, ge=20, le=64)
    congestion_mode: str = Field(default="normal", pattern="^(normal|rush_hour)$")
    seed: Optional[int] = 42


class OptimizeRequest(BaseModel):
    start_node: int = 0
    stop_nodes: List[int]
    vehicle_capacity: int = Field(default=35, ge=10, le=150)
    congestion_mode: Optional[str] = None
    algorithm: str = Field(default="all", pattern="^(qpso|pso|ga|greedy|all)$")
    num_particles: int = Field(default=30, ge=10, le=80)
    max_iterations: int = Field(default=80, ge=20, le=150)


@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "app": "QuantumRoute",
        "version": "1.0.0",
        "active_nodes": current_network.num_nodes,
        "congestion_mode": current_network.congestion_mode
    }


@app.post("/api/generate-network")
def generate_network(req: GenerateNetworkRequest):
    global current_network
    current_network = CityNetwork(
        num_nodes=req.num_nodes,
        congestion_mode=req.congestion_mode,
        seed=req.seed
    )
    return current_network.to_dict()


@app.post("/api/update-congestion")
def update_congestion(mode: str = Query(..., pattern="^(normal|rush_hour)$")):
    global current_network
    current_network.update_congestion(mode)
    return current_network.to_dict()


@app.post("/api/optimize")
def optimize_route(req: OptimizeRequest):
    global current_network

    # If congestion mode changed in optimize request, update it
    if req.congestion_mode and req.congestion_mode != current_network.congestion_mode:
        current_network.update_congestion(req.congestion_mode)

    # Validate stop nodes
    valid_nodes = set(current_network.nodes_data.keys())
    if req.start_node not in valid_nodes:
        raise HTTPException(status_code=400, detail=f"Start node {req.start_node} not in network")

    # Filter stop nodes to valid nodes excluding start_node
    cleaned_stops = [s for s in req.stop_nodes if s in valid_nodes and s != req.start_node]
    if not cleaned_stops:
        raise HTTPException(status_code=400, detail="At least 1 valid delivery stop must be specified")

    # Demands
    demands = {s: current_network.nodes_data[s]["demand"] for s in cleaned_stops}

    # Extract Dijkstra Cost Matrix for all stops + depot
    all_stops_ordered = [req.start_node] + cleaned_stops
    cost_matrix, _ = current_network.get_cost_matrix(all_stops_ordered)

    algorithms_to_run = ["qpso", "pso", "ga", "greedy"] if req.algorithm == "all" else [req.algorithm]

    results: Dict[str, Any] = {}

    # 1. QPSO
    if "qpso" in algorithms_to_run:
        qpso = QPSOOptimizer(
            cost_matrix=cost_matrix,
            stop_nodes=cleaned_stops,
            start_node=req.start_node,
            demands=demands,
            vehicle_capacity=req.vehicle_capacity,
            num_particles=req.num_particles,
            max_iterations=req.max_iterations,
            seed=42
        )
        results["qpso"] = qpso.optimize()

    # 2. Classical PSO
    if "pso" in algorithms_to_run:
        pso = ClassicalPSOOptimizer(
            cost_matrix=cost_matrix,
            stop_nodes=cleaned_stops,
            start_node=req.start_node,
            demands=demands,
            vehicle_capacity=req.vehicle_capacity,
            num_particles=req.num_particles,
            max_iterations=req.max_iterations,
            seed=42
        )
        results["pso"] = pso.optimize()

    # 3. Genetic Algorithm
    if "ga" in algorithms_to_run:
        ga = GeneticAlgorithmOptimizer(
            cost_matrix=cost_matrix,
            stop_nodes=cleaned_stops,
            start_node=req.start_node,
            demands=demands,
            vehicle_capacity=req.vehicle_capacity,
            population_size=req.num_particles,
            max_generations=req.max_iterations,
            seed=42
        )
        results["ga"] = ga.optimize()

    # 4. Greedy Nearest Neighbor
    if "greedy" in algorithms_to_run:
        greedy = GreedyNearestNeighborOptimizer(
            cost_matrix=cost_matrix,
            stop_nodes=cleaned_stops,
            start_node=req.start_node,
            demands=demands,
            vehicle_capacity=req.vehicle_capacity
        )
        results["greedy"] = greedy.optimize()

    # Determine ground-truth proxy optimum f* = min(all valid costs)
    valid_costs = [res["best_cost"] for res in results.values() if "best_cost" in res]
    best_known_proxy = min(valid_costs) if valid_costs else 0.0
    target_95 = best_known_proxy * 1.05

    # Compute convergence speed (iterations to reach within 5% of best known)
    for alg_key, res in results.items():
        conv = res.get("convergence", [])
        iter_to_95 = len(conv)
        for idx, val in enumerate(conv):
            if val <= target_95:
                iter_to_95 = idx + 1
                break
        res["iter_to_95_optimal"] = iter_to_95
        # Percent difference from best-known proxy
        res["gap_percent"] = round(((res["best_cost"] - best_known_proxy) / max(1.0, best_known_proxy)) * 100, 2)

    # Determine overall winner
    winner_key = min(results.keys(), key=lambda k: results[k]["best_cost"])
    winner_route = results[winner_key]["best_route"]

    # Compute detailed node-by-node path through intermediate road intersections for the best route
    detailed_path_coords: List[List[float]] = []
    detailed_path_node_ids: List[int] = []
    total_physical_distance = 0.0
    total_travel_time = 0.0

    for i in range(len(winner_route) - 1):
        u, v = winner_route[i], winner_route[i + 1]
        _, path_nodes, leg_dist, leg_time = current_network.get_shortest_leg(u, v)
        total_physical_distance += leg_dist
        total_travel_time += leg_time

        for p_idx, node_id in enumerate(path_nodes):
            if not detailed_path_node_ids or detailed_path_node_ids[-1] != node_id:
                detailed_path_node_ids.append(node_id)
                n_info = current_network.nodes_data[node_id]
                detailed_path_coords.append([n_info["x"], n_info["y"]])

    return {
        "results": results,
        "best_algorithm": winner_key,
        "best_known_proxy": best_known_proxy,
        "best_route_stops": winner_route,
        "detailed_path_node_ids": detailed_path_node_ids,
        "detailed_path_coords": detailed_path_coords,
        "total_physical_distance": round(total_physical_distance, 1),
        "total_travel_time_min": round(total_travel_time, 1),
        "total_stops_visited": len(cleaned_stops),
        "total_demand": sum(demands.values()),
        "congestion_mode": current_network.congestion_mode,
    }


@app.get("/api/benchmark")
def get_benchmark(
    congestion_mode: str = Query(default="rush_hour", pattern="^(normal|rush_hour)$"),
    num_particles: int = Query(default=25, ge=15, le=50),
    max_iterations: int = Query(default=60, ge=30, le=100)
):
    cache_key = f"{congestion_mode}_{num_particles}_{max_iterations}"
    if cache_key in cached_benchmark_results:
        return cached_benchmark_results[cache_key]

    benchmark_data = run_scalability_benchmark(
        network_nodes=48,
        stop_counts=[10, 20, 30, 40],
        congestion_mode=congestion_mode,
        num_particles=num_particles,
        max_iterations=max_iterations
    )
    cached_benchmark_results[cache_key] = benchmark_data
    return benchmark_data
