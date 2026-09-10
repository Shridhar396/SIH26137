"""
QuantumRoute - Quantum Particle Swarm Optimization (QPSO) Engine
Solves combinatorial Vehicle Routing / Traveling Salesperson problems using:
1. Smallest Position Value (SPV) continuous-to-discrete mapping.
2. Quantum Delta-Potential-Well mechanics with mean-best position (mbest).
3. Dynamic Contraction-Expansion (CE) coefficient annealing.
4. Multi-objective dynamic congestion cost + Capacitated VRP (CVRP) penalty.
"""

import time
import math
import random
from typing import List, Dict, Tuple, Any, Optional
import numpy as np


class QPSOOptimizer:
    """
    Quantum-Inspired Particle Swarm Optimizer for Vehicle Routing.
    
    Mathematical Formulation:
    -------------------------
    1. Smallest Position Value (SPV) Rule:
       A continuous particle X_i = [x_1, x_2, ..., x_D] is mapped to a discrete
       visiting sequence via argsort: pi = argsort(X_i).
       
    2. Mean-Best Position (mbest):
       mbest(t) = (1 / M) * sum_{i=1}^M P_i(t)
       Where P_i is the personal best position of particle i, and M is swarm size.
       
    3. Stochastic Local Attractor (p_i):
       p_{i,d}(t) = phi * P_{i,d}(t) + (1 - phi) * G_d(t)
       Where phi ~ U(0, 1) and G is the global best position found so far.
       
    4. Delta-Potential-Well Wave Function Position Update:
       X_{i,d}(t+1) = p_{i,d}(t) +/- alpha * |mbest_d(t) - X_{i,d}(t)| * ln(1 / u)
       Where u ~ U(0, 1), +/- sign with p = 0.5, and alpha is the Contraction-Expansion (CE)
       coefficient dynamically annealed from 1.0 to 0.5.
    """

    def __init__(
        self,
        cost_matrix: List[List[float]],
        stop_nodes: List[int],
        start_node: int,
        demands: Dict[int, int],
        vehicle_capacity: int = 35,
        num_particles: int = 30,
        max_iterations: int = 80,
        alpha_start: float = 1.0,
        alpha_end: float = 0.5,
        capacity_penalty_weight: float = 50.0,
        seed: Optional[int] = None
    ):
        self.cost_matrix = cost_matrix
        self.stop_nodes = stop_nodes  # Ordered list of candidate delivery stops
        self.start_node = start_node  # Depot
        self.demands = demands        # Node id -> demand (1..10)
        self.vehicle_capacity = vehicle_capacity
        
        # Scale with problem size (roughly 2*D particles, 6*D iterations, bounded)
        D = len(stop_nodes)
        self.num_particles = min(100, max(30, 2 * D)) if num_particles == 30 else num_particles
        self.max_iterations = min(400, max(80, 6 * D)) if max_iterations == 80 else max_iterations
        
        self.alpha_start = alpha_start
        self.alpha_end = alpha_end
        self.penalty_weight = capacity_penalty_weight
        self.seed = seed

        # Map stop nodes to cost_matrix indices
        # Index 0 is reserved for start_node (depot)
        self.all_nodes = [start_node] + [s for s in stop_nodes if s != start_node]
        self.node_to_idx = {node: i for i, node in enumerate(self.all_nodes)}
        self.dimension = len(stop_nodes)  # Number of delivery stops to order

    def evaluate_fitness(self, permutation: List[int]) -> Tuple[float, List[List[int]], float]:
        """
        Evaluates the route cost for a given discrete permutation of stops.
        Implements Capacitated VRP (CVRP) route splitting:
        If current load + demand exceeds vehicle_capacity, vehicle returns to depot.
        Returns: (fitness, trips_list, raw_routing_cost)
        """
        if not permutation:
            return 0.0, [[self.start_node, self.start_node]], 0.0

        trips: List[List[int]] = []
        current_trip = [self.start_node]
        current_load = 0
        total_cost = 0.0
        penalty = 0.0

        depot_idx = self.node_to_idx[self.start_node]

        for stop_id in permutation:
            d = self.demands.get(stop_id, 0)
            
            # Check if this stop fits in current trip
            if current_load + d > self.vehicle_capacity and len(current_trip) > 1:
                # Return to depot
                last_idx = self.node_to_idx[current_trip[-1]]
                total_cost += self.cost_matrix[last_idx][depot_idx]
                current_trip.append(self.start_node)
                trips.append(current_trip)

                # Start fresh trip from depot
                current_trip = [self.start_node, stop_id]
                current_load = d
                total_cost += self.cost_matrix[depot_idx][self.node_to_idx[stop_id]]
            else:
                # Add to current trip
                prev_idx = self.node_to_idx[current_trip[-1]]
                curr_idx = self.node_to_idx[stop_id]
                total_cost += self.cost_matrix[prev_idx][curr_idx]
                current_trip.append(stop_id)
                current_load += d

            # If a single stop itself exceeds vehicle capacity, apply heavy penalty
            if d > self.vehicle_capacity:
                penalty += (d - self.vehicle_capacity) * self.penalty_weight

        # Close the final trip back to depot
        if len(current_trip) > 1:
            last_idx = self.node_to_idx[current_trip[-1]]
            total_cost += self.cost_matrix[last_idx][depot_idx]
            current_trip.append(self.start_node)
            trips.append(current_trip)

        # Capacity penalty if total fleet overload
        fitness = total_cost + penalty
        return fitness, trips, total_cost

    def spv_decode(self, continuous_vector: np.ndarray) -> List[int]:
        """
        Smallest Position Value (SPV) rule:
        Sorts continuous coordinates ascendingly; order of sorted indices
        yields discrete stop permutation sequence.
        """
        order_indices = np.argsort(continuous_vector)
        return [self.stop_nodes[i] for i in order_indices]

    def spv_encode(self, permutation: List[int]) -> np.ndarray:
        """
        Inverse SPV rule: Maps a discrete permutation back to continuous space
        so the swarm can inherit heuristically found solutions.
        """
        D = len(permutation)
        continuous = np.zeros(D)
        # Evenly space values from -4.0 to 4.0
        sorted_vals = np.linspace(-4.0, 4.0, D)
        for i, stop in enumerate(permutation):
            idx = self.stop_nodes.index(stop)
            continuous[idx] = sorted_vals[i]
        return continuous

    def two_opt(self, permutation: List[int]) -> List[int]:
        """
        Local search: greedily reverses contiguous segments to find a lower-cost route.
        """
        best_route = list(permutation)
        best_cost, _, _ = self.evaluate_fitness(best_route)
        
        improved = True
        while improved:
            improved = False
            for i in range(len(best_route) - 1):
                for j in range(i + 2, len(best_route) + 1):
                    # Reverse segment i to j-1
                    new_route = best_route[:i] + best_route[i:j][::-1] + best_route[j:]
                    new_cost, _, _ = self.evaluate_fitness(new_route)
                    if new_cost < best_cost:
                        best_cost = new_cost
                        best_route = new_route
                        improved = True
                        break # Greedily accept first improvement
                if improved:
                    break
        return best_route

    def optimize(self) -> Dict[str, Any]:
        """
        Executes Quantum Particle Swarm Optimization.
        Returns detailed results including convergence curve and optimal route.
        """
        if self.seed is not None:
            np.random.seed(self.seed)
            random.seed(self.seed)

        start_time = time.perf_counter()

        D = self.dimension
        M = self.num_particles

        if D <= 1:
            # Trivial single-stop case
            perm = self.stop_nodes[:]
            fitness, trips, raw_cost = self.evaluate_fitness(perm)
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            flattened_route = [node for trip in trips for node in trip[:-1]] + [self.start_node]
            return {
                "algorithm": "QPSO",
                "best_cost": round(fitness, 2),
                "raw_cost": round(raw_cost, 2),
                "best_route": flattened_route,
                "trips": trips,
                "convergence": [round(fitness, 2)] * self.max_iterations,
                "runtime_ms": elapsed_ms,
                "iterations": self.max_iterations,
                "num_trips": len(trips),
            }

        # Initialize Swarm: Continuous position vectors in [-4.0, 4.0]
        X = np.random.uniform(-4.0, 4.0, size=(M, D))
        
        # Greedy-seeded initialization for the first particle
        unvisited = set(self.stop_nodes)
        if self.start_node in unvisited:
            unvisited.remove(self.start_node)
        
        greedy_route = []
        current = self.start_node
        while unvisited:
            curr_idx = self.node_to_idx[current]
            next_node = min(unvisited, key=lambda n: self.cost_matrix[curr_idx][self.node_to_idx[n]])
            greedy_route.append(next_node)
            unvisited.remove(next_node)
            current = next_node
            
        # Seed the first particle with the greedy route
        if len(greedy_route) == D:
            X[0] = self.spv_encode(greedy_route)
        
        # Personal best positions (P) and personal best fitness values (pbest_fit)
        P = np.copy(X)
        pbest_fit = np.full(M, float('inf'))

        # Global best
        gbest_pos = np.copy(X[0])
        gbest_fit = float('inf')
        gbest_trips: List[List[int]] = []

        convergence_history: List[float] = []

        # Initial evaluation
        for i in range(M):
            perm = self.spv_decode(X[i])
            fit, trips, _ = self.evaluate_fitness(perm)
            pbest_fit[i] = fit
            if fit < gbest_fit:
                gbest_fit = fit
                gbest_pos = np.copy(X[i])
                gbest_trips = trips

        convergence_history.append(round(gbest_fit, 2))

        # Iteration Loop
        for it in range(1, self.max_iterations):
            # 1. Contraction-Expansion (CE) coefficient annealing
            # Linearly decreases from alpha_start (1.0) to alpha_end (0.5)
            # High alpha early enables wide global quantum tunneling; low alpha focuses on local refinement
            alpha = self.alpha_start - (it / self.max_iterations) * (self.alpha_start - self.alpha_end)

            # 2. Mean-Best Position (mbest) across all personal bests
            # mbest = (1 / M) * sum_{i=1}^M P_i
            mbest = np.mean(P, axis=0)

            # 3. Update each quantum particle
            for i in range(M):
                # Stochastic local attractor p_i
                phi = np.random.uniform(0.0, 1.0, size=D)
                p_i = phi * P[i] + (1.0 - phi) * gbest_pos

                # Random quantum potential variables
                u = np.random.uniform(1e-7, 1.0, size=D)
                # Random signs (+1 or -1 with 50% probability)
                signs = np.where(np.random.rand(D) > 0.5, 1.0, -1.0)

                # Quantum delta-potential well position update equation:
                # X(t+1) = p_i +/- alpha * |mbest - X| * ln(1 / u)
                quantum_step = alpha * np.abs(mbest - X[i]) * np.log(1.0 / u)
                X[i] = p_i + signs * quantum_step

                # Clamp values to reasonable search bounds [-8.0, 8.0]
                X[i] = np.clip(X[i], -8.0, 8.0)

                # Evaluate fitness with SPV decoding
                perm = self.spv_decode(X[i])
                fit, trips, _ = self.evaluate_fitness(perm)

                # Update personal best
                if fit < pbest_fit[i]:
                    pbest_fit[i] = fit
                    P[i] = np.copy(X[i])

                    # Update global best
                    if fit < gbest_fit:
                        gbest_fit = fit
                        gbest_pos = np.copy(X[i])
                        gbest_trips = trips

            # 2-opt polish on the global best every 10 iterations
            if it % 10 == 0:
                best_perm = self.spv_decode(gbest_pos)
                polished_perm = self.two_opt(best_perm)
                polished_fit, polished_trips, _ = self.evaluate_fitness(polished_perm)
                
                if polished_fit < gbest_fit:
                    gbest_fit = polished_fit
                    gbest_pos = self.spv_encode(polished_perm)
                    gbest_trips = polished_trips
                    
                    # Distribute improved global best to the worst particle to avoid stagnation
                    worst_idx = np.argmax(pbest_fit)
                    X[worst_idx] = np.copy(gbest_pos)
                    pbest_fit[worst_idx] = gbest_fit
                    P[worst_idx] = np.copy(gbest_pos)

            convergence_history.append(round(gbest_fit, 2))

        # Final 2-opt pass before returning
        best_perm = self.spv_decode(gbest_pos)
        final_perm = self.two_opt(best_perm)
        final_fit, final_trips, final_raw_cost = self.evaluate_fitness(final_perm)
        if final_fit < gbest_fit:
            gbest_fit = final_fit
            gbest_trips = final_trips

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        # Build full continuous route from trips
        flattened_route: List[int] = []
        for trip_idx, trip in enumerate(gbest_trips):
            if trip_idx == 0:
                flattened_route.extend(trip)
            else:
                # Skip duplicate start depot between trips
                flattened_route.extend(trip[1:])

        return {
            "algorithm": "QPSO",
            "best_cost": round(gbest_fit, 2),
            "raw_cost": round(gbest_fit, 2),
            "best_route": flattened_route,
            "trips": gbest_trips,
            "convergence": convergence_history,
            "runtime_ms": elapsed_ms,
            "iterations": self.max_iterations,
            "num_trips": len(gbest_trips),
        }
