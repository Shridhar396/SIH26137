"""
QuantumRoute - Baseline Optimizers for Comparative Benchmarking
Implements:
1. Classical PSO (velocity + inertia update, same SPV encoding).
2. Genetic Algorithm (OX crossover, inversion mutation, elitism).
3. Greedy Nearest-Neighbor heuristic (Dijkstra-guided).
"""

import time
import random
from typing import List, Dict, Tuple, Any, Optional
import numpy as np


class ClassicalPSOOptimizer:
    """
    Standard Classical Particle Swarm Optimization (Kennedy & Eberhart 1995).
    Uses traditional velocity update with inertia weight (w), cognitive parameter (c1),
    and social parameter (c2). Operates on the exact same SPV encoding space as QPSO.
    
    Velocity update:
    V_{i,d}(t+1) = w * V_{i,d}(t) + c1 * r1 * (P_{i,d} - X_{i,d}) + c2 * r2 * (G_d - X_{i,d})
    Position update:
    X_{i,d}(t+1) = X_{i,d}(t) + V_{i,d}(t+1)
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
        w: float = 0.729,      # Inertia weight
        c1: float = 1.49445,   # Cognitive acceleration coefficient
        c2: float = 1.49445,   # Social acceleration coefficient
        seed: Optional[int] = None
    ):
        self.cost_matrix = cost_matrix
        self.stop_nodes = stop_nodes
        self.start_node = start_node
        self.demands = demands
        self.vehicle_capacity = vehicle_capacity
        self.num_particles = num_particles
        self.max_iterations = max_iterations
        self.w = w
        self.c1 = c1
        self.c2 = c2
        self.seed = seed

        self.all_nodes = [start_node] + [s for s in stop_nodes if s != start_node]
        self.node_to_idx = {node: i for i, node in enumerate(self.all_nodes)}
        self.dimension = len(stop_nodes)

    def evaluate_fitness(self, permutation: List[int]) -> Tuple[float, List[List[int]]]:
        if not permutation:
            return 0.0, [[self.start_node, self.start_node]]

        trips: List[List[int]] = []
        current_trip = [self.start_node]
        current_load = 0
        total_cost = 0.0
        penalty = 0.0
        depot_idx = self.node_to_idx[self.start_node]

        for stop_id in permutation:
            d = self.demands.get(stop_id, 0)
            if current_load + d > self.vehicle_capacity and len(current_trip) > 1:
                last_idx = self.node_to_idx[current_trip[-1]]
                total_cost += self.cost_matrix[last_idx][depot_idx]
                current_trip.append(self.start_node)
                trips.append(current_trip)

                current_trip = [self.start_node, stop_id]
                current_load = d
                total_cost += self.cost_matrix[depot_idx][self.node_to_idx[stop_id]]
            else:
                prev_idx = self.node_to_idx[current_trip[-1]]
                curr_idx = self.node_to_idx[stop_id]
                total_cost += self.cost_matrix[prev_idx][curr_idx]
                current_trip.append(stop_id)
                current_load += d

            if d > self.vehicle_capacity:
                penalty += (d - self.vehicle_capacity) * 50.0

        if len(current_trip) > 1:
            last_idx = self.node_to_idx[current_trip[-1]]
            total_cost += self.cost_matrix[last_idx][depot_idx]
            current_trip.append(self.start_node)
            trips.append(current_trip)

        return total_cost + penalty, trips

    def spv_decode(self, continuous_vector: np.ndarray) -> List[int]:
        order_indices = np.argsort(continuous_vector)
        return [self.stop_nodes[i] for i in order_indices]

    def optimize(self) -> Dict[str, Any]:
        if self.seed is not None:
            np.random.seed(self.seed)
            random.seed(self.seed)

        start_time = time.perf_counter()
        D = self.dimension
        M = self.num_particles

        if D <= 1:
            perm = self.stop_nodes[:]
            fit, trips = self.evaluate_fitness(perm)
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            flattened = [node for trip in trips for node in trip[:-1]] + [self.start_node]
            return {
                "algorithm": "Classical PSO",
                "best_cost": round(fit, 2),
                "best_route": flattened,
                "trips": trips,
                "convergence": [round(fit, 2)] * self.max_iterations,
                "runtime_ms": elapsed_ms,
                "iterations": self.max_iterations,
                "num_trips": len(trips),
            }

        # Position and Velocity initialization
        X = np.random.uniform(-4.0, 4.0, size=(M, D))
        V = np.random.uniform(-1.0, 1.0, size=(M, D))
        P = np.copy(X)
        pbest_fit = np.full(M, float('inf'))

        gbest_pos = np.copy(X[0])
        gbest_fit = float('inf')
        gbest_trips: List[List[int]] = []

        convergence_history: List[float] = []

        for i in range(M):
            perm = self.spv_decode(X[i])
            fit, trips = self.evaluate_fitness(perm)
            pbest_fit[i] = fit
            if fit < gbest_fit:
                gbest_fit = fit
                gbest_pos = np.copy(X[i])
                gbest_trips = trips

        convergence_history.append(round(gbest_fit, 2))

        for it in range(1, self.max_iterations):
            r1 = np.random.uniform(0.0, 1.0, size=(M, D))
            r2 = np.random.uniform(0.0, 1.0, size=(M, D))

            # Classical Velocity update equation
            V = self.w * V + self.c1 * r1 * (P - X) + self.c2 * r2 * (gbest_pos - X)
            # Velocity clamping to prevent explosion
            V = np.clip(V, -3.0, 3.0)

            # Classical Position update equation
            X = X + V
            X = np.clip(X, -8.0, 8.0)

            for i in range(M):
                perm = self.spv_decode(X[i])
                fit, trips = self.evaluate_fitness(perm)

                if fit < pbest_fit[i]:
                    pbest_fit[i] = fit
                    P[i] = np.copy(X[i])

                    if fit < gbest_fit:
                        gbest_fit = fit
                        gbest_pos = np.copy(X[i])
                        gbest_trips = trips

            convergence_history.append(round(gbest_fit, 2))

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        flattened_route: List[int] = []
        for trip_idx, trip in enumerate(gbest_trips):
            if trip_idx == 0:
                flattened_route.extend(trip)
            else:
                flattened_route.extend(trip[1:])

        return {
            "algorithm": "Classical PSO",
            "best_cost": round(gbest_fit, 2),
            "best_route": flattened_route,
            "trips": gbest_trips,
            "convergence": convergence_history,
            "runtime_ms": elapsed_ms,
            "iterations": self.max_iterations,
            "num_trips": len(gbest_trips),
        }


class GeneticAlgorithmOptimizer:
    """
    Genetic Algorithm with Order Crossover (OX), Inversion Mutation, and Elitism.
    Evaluates solutions across the same fitness landscape.
    """

    def __init__(
        self,
        cost_matrix: List[List[float]],
        stop_nodes: List[int],
        start_node: int,
        demands: Dict[int, int],
        vehicle_capacity: int = 35,
        population_size: int = 30,
        max_generations: int = 80,
        crossover_rate: float = 0.85,
        mutation_rate: float = 0.20,
        elitism_count: int = 2,
        seed: Optional[int] = None
    ):
        self.cost_matrix = cost_matrix
        self.stop_nodes = stop_nodes
        self.start_node = start_node
        self.demands = demands
        self.vehicle_capacity = vehicle_capacity
        self.pop_size = population_size
        self.max_generations = max_generations
        self.crossover_rate = crossover_rate
        self.mutation_rate = mutation_rate
        self.elitism_count = elitism_count
        self.seed = seed

        self.all_nodes = [start_node] + [s for s in stop_nodes if s != start_node]
        self.node_to_idx = {node: i for i, node in enumerate(self.all_nodes)}

    def evaluate_fitness(self, permutation: List[int]) -> Tuple[float, List[List[int]]]:
        if not permutation:
            return 0.0, [[self.start_node, self.start_node]]

        trips: List[List[int]] = []
        current_trip = [self.start_node]
        current_load = 0
        total_cost = 0.0
        penalty = 0.0
        depot_idx = self.node_to_idx[self.start_node]

        for stop_id in permutation:
            d = self.demands.get(stop_id, 0)
            if current_load + d > self.vehicle_capacity and len(current_trip) > 1:
                last_idx = self.node_to_idx[current_trip[-1]]
                total_cost += self.cost_matrix[last_idx][depot_idx]
                current_trip.append(self.start_node)
                trips.append(current_trip)

                current_trip = [self.start_node, stop_id]
                current_load = d
                total_cost += self.cost_matrix[depot_idx][self.node_to_idx[stop_id]]
            else:
                prev_idx = self.node_to_idx[current_trip[-1]]
                curr_idx = self.node_to_idx[stop_id]
                total_cost += self.cost_matrix[prev_idx][curr_idx]
                current_trip.append(stop_id)
                current_load += d

            if d > self.vehicle_capacity:
                penalty += (d - self.vehicle_capacity) * 50.0

        if len(current_trip) > 1:
            last_idx = self.node_to_idx[current_trip[-1]]
            total_cost += self.cost_matrix[last_idx][depot_idx]
            current_trip.append(self.start_node)
            trips.append(current_trip)

        return total_cost + penalty, trips

    def order_crossover(self, parent1: List[int], parent2: List[int]) -> List[int]:
        """Order Crossover (OX) preserves sub-sequence relative order."""
        size = len(parent1)
        if size <= 2:
            return parent1[:]
        cx1 = random.randint(0, size - 2)
        cx2 = random.randint(cx1 + 1, size - 1)

        child = [None] * size
        child[cx1:cx2 + 1] = parent1[cx1:cx2 + 1]
        copied_set = set(child[cx1:cx2 + 1])

        p2_idx = 0
        for i in range(size):
            if child[i] is None:
                while parent2[p2_idx] in copied_set:
                    p2_idx += 1
                child[i] = parent2[p2_idx]
                p2_idx += 1
        return child

    def mutate_inversion(self, individual: List[int]) -> List[int]:
        """2-Opt Inversion Mutation reverses a random contiguous segment."""
        if len(individual) <= 2:
            return individual
        i = random.randint(0, len(individual) - 2)
        j = random.randint(i + 1, len(individual) - 1)
        individual[i:j + 1] = reversed(individual[i:j + 1])
        return individual

    def optimize(self) -> Dict[str, Any]:
        if self.seed is not None:
            random.seed(self.seed)

        start_time = time.perf_counter()
        n = len(self.stop_nodes)

        if n <= 1:
            perm = self.stop_nodes[:]
            fit, trips = self.evaluate_fitness(perm)
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            flattened = [node for trip in trips for node in trip[:-1]] + [self.start_node]
            return {
                "algorithm": "Genetic Algorithm",
                "best_cost": round(fit, 2),
                "best_route": flattened,
                "trips": trips,
                "convergence": [round(fit, 2)] * self.max_generations,
                "runtime_ms": elapsed_ms,
                "iterations": self.max_generations,
                "num_trips": len(trips),
            }

        # Initialize Population with randomized permutations
        population: List[List[int]] = []
        for _ in range(self.pop_size):
            ind = self.stop_nodes[:]
            random.shuffle(ind)
            population.append(ind)

        # Evaluate initial population
        scored_pop = [(self.evaluate_fitness(ind), ind) for ind in population]
        scored_pop.sort(key=lambda x: x[0][0])

        best_fit = scored_pop[0][0][0]
        best_trips = scored_pop[0][0][1]
        best_ind = scored_pop[0][1][:]

        convergence_history: List[float] = [round(best_fit, 2)]

        for gen in range(1, self.max_generations):
            new_population: List[List[int]] = []

            # Elitism: retain top individuals
            for i in range(self.elitism_count):
                new_population.append(scored_pop[i][1][:])

            # Breeding loop
            while len(new_population) < self.pop_size:
                # Tournament Selection (k=3)
                tourn1 = random.sample(scored_pop, 3)
                parent1 = min(tourn1, key=lambda x: x[0][0])[1]

                tourn2 = random.sample(scored_pop, 3)
                parent2 = min(tourn2, key=lambda x: x[0][0])[1]

                # Crossover
                if random.random() < self.crossover_rate:
                    child = self.order_crossover(parent1, parent2)
                else:
                    child = parent1[:]

                # Mutation
                if random.random() < self.mutation_rate:
                    child = self.mutate_inversion(child)

                new_population.append(child)

            population = new_population
            scored_pop = [(self.evaluate_fitness(ind), ind) for ind in population]
            scored_pop.sort(key=lambda x: x[0][0])

            curr_best_fit = scored_pop[0][0][0]
            if curr_best_fit < best_fit:
                best_fit = curr_best_fit
                best_trips = scored_pop[0][0][1]
                best_ind = scored_pop[0][1][:]

            convergence_history.append(round(best_fit, 2))

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        flattened_route: List[int] = []
        for trip_idx, trip in enumerate(best_trips):
            if trip_idx == 0:
                flattened_route.extend(trip)
            else:
                flattened_route.extend(trip[1:])

        return {
            "algorithm": "Genetic Algorithm",
            "best_cost": round(best_fit, 2),
            "best_route": flattened_route,
            "trips": best_trips,
            "convergence": convergence_history,
            "runtime_ms": elapsed_ms,
            "iterations": self.max_generations,
            "num_trips": len(best_trips),
        }


class GreedyNearestNeighborOptimizer:
    """
    Greedy Nearest-Neighbor heuristic guided by Dijkstra graph weights.
    Provides deterministic baseline comparison.
    """

    def __init__(
        self,
        cost_matrix: List[List[float]],
        stop_nodes: List[int],
        start_node: int,
        demands: Dict[int, int],
        vehicle_capacity: int = 35
    ):
        self.cost_matrix = cost_matrix
        self.stop_nodes = stop_nodes
        self.start_node = start_node
        self.demands = demands
        self.vehicle_capacity = vehicle_capacity
        self.all_nodes = [start_node] + [s for s in stop_nodes if s != start_node]
        self.node_to_idx = {node: i for i, node in enumerate(self.all_nodes)}

    def optimize(self) -> Dict[str, Any]:
        start_time = time.perf_counter()
        unvisited = set(self.stop_nodes)
        trips: List[List[int]] = []
        current_trip = [self.start_node]
        current_load = 0
        total_cost = 0.0
        depot_idx = self.node_to_idx[self.start_node]

        curr_node = self.start_node

        while unvisited:
            curr_idx = self.node_to_idx[curr_node]
            # Find closest unvisited stop
            closest_stop = None
            min_dist = float('inf')

            for candidate in unvisited:
                c_idx = self.node_to_idx[candidate]
                if self.cost_matrix[curr_idx][c_idx] < min_dist:
                    min_dist = self.cost_matrix[curr_idx][c_idx]
                    closest_stop = candidate

            if closest_stop is None:
                break

            d = self.demands.get(closest_stop, 0)
            if current_load + d > self.vehicle_capacity and len(current_trip) > 1:
                # Return to depot
                total_cost += self.cost_matrix[curr_idx][depot_idx]
                current_trip.append(self.start_node)
                trips.append(current_trip)

                current_trip = [self.start_node, closest_stop]
                current_load = d
                total_cost += self.cost_matrix[depot_idx][self.node_to_idx[closest_stop]]
            else:
                total_cost += min_dist
                current_trip.append(closest_stop)
                current_load += d

            curr_node = closest_stop
            unvisited.remove(closest_stop)

        if len(current_trip) > 1:
            last_idx = self.node_to_idx[current_trip[-1]]
            total_cost += self.cost_matrix[last_idx][depot_idx]
            current_trip.append(self.start_node)
            trips.append(current_trip)

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        flattened = [node for trip in trips for node in trip[:-1]] + [self.start_node]

        return {
            "algorithm": "Greedy Nearest Neighbor",
            "best_cost": round(total_cost, 2),
            "best_route": flattened,
            "trips": trips,
            "convergence": [round(total_cost, 2)],
            "runtime_ms": elapsed_ms,
            "iterations": 1,
            "num_trips": len(trips),
        }
