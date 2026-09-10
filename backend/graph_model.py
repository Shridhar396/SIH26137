"""
QuantumRoute - Road Network & Traffic Congestion Model
Simulates a synthetic city road network (grid topology + randomized arterial expressways)
with time-varying congestion and dynamic multi-objective edge costs.
"""

import math
import random
import time
from typing import Dict, List, Tuple, Any, Optional
import os
import networkx as nx
import osmnx as ox


class CityNetwork:
    """
    Synthetic city road network model.
    Generates realistic urban topology with intersections, road segments,
    per-node delivery demands, and dynamic congestion levels.
    """

    def __init__(
        self,
        num_nodes: int = 36,
        congestion_mode: str = "normal",  # 'normal' or 'rush_hour'
        alpha: float = 0.35,   # weight for physical distance
        beta: float = 0.40,    # weight for travel time
        gamma: float = 0.25,   # weight for congestion factor
        seed: Optional[int] = 42
    ):
        self.num_nodes = max(20, min(64, num_nodes))
        self.congestion_mode = congestion_mode
        self.alpha = alpha
        self.beta = beta
        self.gamma = gamma
        self.seed = seed
        self.graph = nx.Graph()
        self.nodes_data: Dict[int, Dict[str, Any]] = {}
        self.edges_data: List[Dict[str, Any]] = []
        
        
        self.generate_network()

    def generate_network(self):
        """Generates grid topology or loads offline OSM network."""
        if self.seed is not None:
            random.seed(self.seed)

        self.graph.clear()
        self.nodes_data.clear()
        self.edges_data.clear()

        osm_path = "backend/osm_network.graphml"
        if os.path.exists(osm_path):
            self._load_osm_network(osm_path)
            self.update_congestion(self.congestion_mode)
            return

        # Calculate grid dimensions (e.g. 36 -> 6x6, 40 -> 5x8, 48 -> 6x8)
        cols = int(math.ceil(math.sqrt(self.num_nodes)))
        rows = int(math.ceil(self.num_nodes / cols))

        zones = ["Downtown Core", "Commercial District", "Tech Corridor", "Logistics Port", "Residential West", "Midtown"]
        zone_coords = [
            (cols * 0.5, rows * 0.5), # Downtown
            (cols * 0.7, rows * 0.3), # Commercial
            (cols * 0.2, rows * 0.8), # Tech Corridor
            (cols * 0.85, rows * 0.8),# Port
            (cols * 0.15, rows * 0.2),# Residential
            (cols * 0.5, rows * 0.2)  # Midtown
        ]

        # Generate Nodes
        node_id = 0
        for r in range(rows):
            for c in range(cols):
                if node_id >= self.num_nodes:
                    break

                # Add jitter to grid coordinates for organic city street appearance
                jitter_x = (random.random() - 0.5) * 0.35
                jitter_y = (random.random() - 0.5) * 0.35
                x = round((c + 0.5 + jitter_x) * 100, 1)
                y = round((r + 0.5 + jitter_y) * 100, 1)

                # Determine closest urban zone
                closest_zone = zones[0]
                min_zd = float('inf')
                for zi, (zx, zy) in enumerate(zone_coords):
                    zd = (c - zx) ** 2 + (r - zy) ** 2
                    if zd < min_zd:
                        min_zd = zd
                        closest_zone = zones[zi]

                # Generate delivery demand (1 to 10 units) for VRP simulation
                # Start node (depot, index 0) has 0 demand
                demand = 0 if node_id == 0 else random.randint(1, 10)

                self.nodes_data[node_id] = {
                    "id": node_id,
                    "x": x,
                    "y": y,
                    "grid_r": r,
                    "grid_c": c,
                    "name": f"Station {node_id:02d}" if node_id == 0 else f"Node {node_id:02d}",
                    "is_depot": (node_id == 0),
                    "zone": "Central Depot" if node_id == 0 else closest_zone,
                    "demand": demand,
                }
                self.graph.add_node(node_id, **self.nodes_data[node_id])
                node_id += 1

        # Generate Grid Edges (Horizontal and Vertical roads)
        for r in range(rows):
            for c in range(cols):
                curr = r * cols + c
                if curr >= self.num_nodes:
                    continue

                # Right neighbor
                if c + 1 < cols:
                    right = r * cols + (c + 1)
                    if right < self.num_nodes:
                        self._add_road_edge(curr, right, is_arterial=False)

                # Down neighbor
                if r + 1 < rows:
                    down = (r + 1) * cols + c
                    if down < self.num_nodes:
                        self._add_road_edge(curr, down, is_arterial=False)

        # Add randomized expressway bypasses / diagonals to simulate avenues
        num_shortcuts = max(3, self.num_nodes // 5)
        for _ in range(num_shortcuts * 3):
            if num_shortcuts <= 0:
                break
            u = random.randint(0, self.num_nodes - 1)
            v = random.randint(0, self.num_nodes - 1)
            if u != v and not self.graph.has_edge(u, v):
                # Only add if reasonably close (e.g. 2-3 hops apart)
                p1 = (self.nodes_data[u]["x"], self.nodes_data[u]["y"])
                p2 = (self.nodes_data[v]["x"], self.nodes_data[v]["y"])
                dist = math.hypot(p1[0] - p2[0], p1[1] - p2[1])
                if 120 <= dist <= 280:
                    self._add_road_edge(u, v, is_arterial=True)
                    num_shortcuts -= 1

        # Ensure graph is fully connected (if any isolated components, bridge them)
        if not nx.is_connected(self.graph):
            components = list(nx.connected_components(self.graph))
            for i in range(len(components) - 1):
                u = next(iter(components[i]))
                v = next(iter(components[i + 1]))
                self._add_road_edge(u, v, is_arterial=False)

        # Compute initial edge costs and invalidate APSP cache
        self.update_congestion(self.congestion_mode)

    def _load_osm_network(self, filepath: str):
        """Loads a projected OSMnx graph and normalizes its coordinates."""
        G = ox.load_graphml(filepath)
        
        # 1. Normalize coordinates
        xs = [data['x'] for _, data in G.nodes(data=True)]
        ys = [data['y'] for _, data in G.nodes(data=True)]
        min_x = min(xs)
        min_y = min(ys)
        
        node_mapping = {}
        # Make depot the node closest to the center
        cx, cy = sum(xs)/len(xs), sum(ys)/len(ys)
        
        # Sort nodes by distance to center so index 0 is depot
        nodes_sorted = sorted(G.nodes(data=True), key=lambda item: math.hypot(float(item[1]['x']) - cx, float(item[1]['y']) - cy))
        
        for i, (osmid, data) in enumerate(nodes_sorted):
            node_mapping[osmid] = i
            # Normalize to start at 0,0
            nx_x = round(float(data['x']) - min_x, 1)
            nx_y = round(float(data['y']) - min_y, 1)
            
            demand = 0 if i == 0 else random.randint(1, 10)
            
            self.nodes_data[i] = {
                "id": i,
                "x": nx_x,
                "y": nx_y,
                "lat": float(data.get('lat', 0.0)),
                "lon": float(data.get('lon', 0.0)),
                "name": f"Station {i:02d}" if i == 0 else f"Node {i:02d}",
                "is_depot": (i == 0),
                "zone": "City Node",
                "demand": demand,
            }
            self.graph.add_node(i, **self.nodes_data[i])
            
        self.num_nodes = len(self.nodes_data)
        
        # 2. Add edges
        for u, v, data in G.edges(data=True):
            uid = node_mapping[u]
            vid = node_mapping[v]
            
            if self.graph.has_edge(uid, vid):
                continue
                
            dist = float(data.get('length', 0.0))
            if dist == 0.0:
                dist = math.hypot(self.nodes_data[uid]['x'] - self.nodes_data[vid]['x'], 
                                  self.nodes_data[uid]['y'] - self.nodes_data[vid]['y'])
                                  
            highway = str(data.get('highway', ''))
            is_arterial = 'primary' in highway or 'trunk' in highway or 'secondary' in highway
            
            try:
                maxspeed_val = data.get('maxspeed', 60.0 if is_arterial else 35.0)
                if isinstance(maxspeed_val, str):
                    import ast
                    try:
                        parsed = ast.literal_eval(maxspeed_val)
                        if isinstance(parsed, list): maxspeed_val = float(parsed[0])
                        else: maxspeed_val = float(parsed)
                    except:
                        maxspeed_val = float(maxspeed_val.replace(' km/h', '').replace(' mph', ''))
                speed_limit = float(maxspeed_val)
            except:
                speed_limit = 60.0 if is_arterial else 35.0
            
            base_congestion = random.uniform(0.1, 0.4)
            rush_congestion = min(0.95, base_congestion + (0.4 if is_arterial else 0.2))
            
            geom = data.get('geometry')
            geometry_coords = []
            if geom:
                try:
                    geometry_coords = [[lat, lon] for lon, lat in geom.coords]
                except Exception:
                    pass
            
            edge_info = {
                "u": min(uid, vid),
                "v": max(uid, vid),
                "distance": round(dist, 1),
                "speed_limit": speed_limit,
                "is_arterial": is_arterial,
                "congestion_normal": round(base_congestion, 3),
                "congestion_rush_hour": round(rush_congestion, 3),
                "current_congestion": round(base_congestion, 3),
                "travel_time": 0.0,
                "cost": 0.0,
                "geometry": geometry_coords,
            }
            self.edges_data.append(edge_info)
            self.graph.add_edge(uid, vid, **edge_info)
            
        # Ensure graph is fully connected
        if not nx.is_connected(self.graph):
            components = list(nx.connected_components(self.graph))
            for i in range(len(components) - 1):
                u = next(iter(components[i]))
                v = next(iter(components[i + 1]))
                dist = math.hypot(self.nodes_data[u]['x'] - self.nodes_data[v]['x'], 
                                  self.nodes_data[u]['y'] - self.nodes_data[v]['y'])
                edge_info = {
                    "u": min(u, v),
                    "v": max(u, v),
                    "distance": round(dist, 1),
                    "speed_limit": 35.0,
                    "is_arterial": False,
                    "congestion_normal": 0.1,
                    "congestion_rush_hour": 0.2,
                    "current_congestion": 0.1,
                    "travel_time": 0.0,
                    "cost": 0.0,
                }
                self.edges_data.append(edge_info)
                self.graph.add_edge(u, v, **edge_info)

    def _add_road_edge(self, u: int, v: int, is_arterial: bool = False):
        """Creates a bidirectional edge with base physical attributes."""
        x1, y1 = self.nodes_data[u]["x"], self.nodes_data[u]["y"]
        x2, y2 = self.nodes_data[v]["x"], self.nodes_data[v]["y"]
        dist = round(math.hypot(x1 - x2, y1 - y2), 1)

        # Arterial expressways have higher speed limit (60 km/h) vs local streets (35 km/h)
        speed_limit = 60.0 if is_arterial else 35.0

        # Baseline congestion factor c0
        # Downtown/central edges have higher baseline congestion
        cx = (x1 + x2) / 2.0
        cy = (y1 + y2) / 2.0
        center_x = (max(n["x"] for n in self.nodes_data.values()) + min(n["x"] for n in self.nodes_data.values())) / 2.0
        center_y = (max(n["y"] for n in self.nodes_data.values()) + min(n["y"] for n in self.nodes_data.values())) / 2.0
        dist_to_center = math.hypot(cx - center_x, cy - center_y)
        center_factor = max(0.0, 1.0 - (dist_to_center / 350.0))

        base_congestion_normal = min(0.65, max(0.08, 0.12 + 0.25 * center_factor + (random.random() * 0.15)))
        # Rush hour baseline: high bottleneck surges in center and expressways
        rush_boost = 0.45 * center_factor + (0.30 if is_arterial else 0.15)
        base_congestion_rush = min(0.95, max(0.20, base_congestion_normal + rush_boost + (random.random() * 0.15)))

        edge_info = {
            "u": min(u, v),
            "v": max(u, v),
            "distance": dist,
            "speed_limit": speed_limit,
            "is_arterial": is_arterial,
            "congestion_normal": round(base_congestion_normal, 3),
            "congestion_rush_hour": round(base_congestion_rush, 3),
            "current_congestion": round(base_congestion_normal, 3),
            "travel_time": 0.0,
            "cost": 0.0,
        }
        self.edges_data.append(edge_info)
        self.graph.add_edge(u, v, **edge_info)

    def update_congestion(self, mode: str, time_step: float = 0.0):
        """
        Updates edge congestion factors based on normal vs rush hour mode.
        cost(u, v, t) = alpha * distance + beta * travel_time + gamma * congestion_factor
        """
        self.congestion_mode = mode

        for edge in self.edges_data:
            u, v = edge["u"], edge["v"]
            if mode == "rush_hour":
                # Sine-wave dynamic surge with edge phase offsets to simulate dynamic traffic waves
                phase = (u * 7 + v * 13) % 360
                wave = 0.10 * math.sin(math.radians(phase + time_step * 30))
                cong = min(0.98, max(0.15, edge["congestion_rush_hour"] + wave))
            else:
                # Normal calm flow with minor random jitter
                cong = min(0.70, max(0.05, edge["congestion_normal"]))

            edge["current_congestion"] = round(cong, 3)

            # Effective speed degrades as congestion increases:
            # v_eff = v_free * (1 - 0.75 * congestion)
            effective_speed = max(8.0, edge["speed_limit"] * (1.0 - 0.75 * cong))
            
            # Travel time in minutes = (distance / effective_speed) * 60
            travel_time = round((edge["distance"] / effective_speed) * 60.0, 2)
            edge["travel_time"] = travel_time

            # Multi-objective edge cost:
            # Normalized components to comparable scales
            # dist ~ 100, travel_time ~ 100-300, cong ~ 0-1
            dist_term = edge["distance"] * 0.5
            time_term = travel_time * 1.5
            cong_term = (cong ** 1.8) * 150.0

            cost = round(self.alpha * dist_term + self.beta * time_term + self.gamma * cong_term, 2)
            edge["cost"] = cost

            # Update in networkx graph
            self.graph[u][v]["cost"] = cost
            self.graph[u][v]["current_congestion"] = cong
            self.graph[u][v]["travel_time"] = travel_time

    def update_tomtom_congestion(self, api_key: str):
        """Fetches live traffic incidents from TomTom and applies them to the network."""
        import urllib.request
        import json
        
        # Get bounding box
        lats = [n["lat"] for n in self.nodes_data.values() if n.get("lat")]
        lons = [n["lon"] for n in self.nodes_data.values() if n.get("lon")]
        
        if not lats or not lons:
            return  # Can't use TomTom without lat/lon
            
        min_lat, max_lat = min(lats), max(lats)
        min_lon, max_lon = min(lons), max(lons)
        
        # Add 0.005 padding (~500m)
        bbox = f"{min_lon-0.005},{min_lat-0.005},{max_lon+0.005},{max_lat+0.005}"
        
        url = f"https://api.tomtom.com/traffic/services/5/incidentDetails?key={api_key}&bbox={bbox}&fields={{incidents{{geometry{{coordinates}},properties{{magnitudeOfDelay,delay}}}}}}"
        
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'QuantumRoute/1.0'})
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode())
                
            incidents = data.get("incidents", [])
            
            # Reset congestion to base before applying live traffic
            for edge in self.edges_data:
                edge["current_congestion"] = edge["congestion_normal"]
                
            affected_nodes = set()
            
            for inc in incidents:
                coords = inc.get("geometry", {}).get("coordinates", [])
                delay_mag = inc.get("properties", {}).get("magnitudeOfDelay", 1) # 0=unknown, 1=minor, 2=moderate, 3=major, 4=undefined
                
                # Boost based on magnitude
                boost = 0.2 if delay_mag == 1 else 0.5 if delay_mag == 2 else 0.8
                
                for pt in coords:
                    inc_lon, inc_lat = pt[0], pt[1]
                    for n_id, n_data in self.nodes_data.items():
                        # Simple Euclidean distance in degrees; 0.001 is ~100m
                        if abs(n_data["lat"] - inc_lat) < 0.001 and abs(n_data["lon"] - inc_lon) < 0.001:
                            affected_nodes.add((n_id, boost))
                            
            # Apply to edges
            for n_id, boost in affected_nodes:
                for edge in self.edges_data:
                    if edge["u"] == n_id or edge["v"] == n_id:
                        new_cong = min(0.98, edge["current_congestion"] + boost)
                        edge["current_congestion"] = round(new_cong, 3)
                        
            # Recompute effective speed, travel time and cost
            for edge in self.edges_data:
                cong = edge["current_congestion"]
                effective_speed = max(8.0, edge["speed_limit"] * (1.0 - 0.75 * cong))
                travel_time = round((edge["distance"] / effective_speed) * 60.0, 2)
                edge["travel_time"] = travel_time
                
                dist_term = edge["distance"] * 0.5
                time_term = travel_time * 1.5
                cong_term = (cong ** 1.8) * 150.0
                
                cost = round(self.alpha * dist_term + self.beta * time_term + self.gamma * cong_term, 2)
                edge["cost"] = cost
                
                u, v = edge["u"], edge["v"]
                self.graph[u][v]["cost"] = cost
                self.graph[u][v]["current_congestion"] = cong
                self.graph[u][v]["travel_time"] = travel_time
                
            self.congestion_mode = "tomtom_live"
            
        except Exception as e:
            print(f"TomTom API failed: {e}. Falling back to simulated mode.")
            self.update_congestion("normal")

    def get_shortest_leg(self, u: int, v: int) -> Tuple[float, List[int], float, float]:
        """
        Returns (leg_cost, path_of_node_ids, leg_distance, leg_time) between any two nodes.
        Computes single-source Dijkstra lazily.
        """
        try:
            leg_cost, path = nx.single_source_dijkstra(self.graph, u, target=v, weight="cost")
        except nx.NetworkXNoPath:
            return float('inf'), [u, v], 0.0, 0.0

        # Calculate exact distance and travel time along path
        total_dist = 0.0
        total_time = 0.0
        for i in range(len(path) - 1):
            nu, nv = path[i], path[i + 1]
            edge_data = self.graph[nu][nv]
            total_dist += edge_data.get("distance", 0.0)
            total_time += edge_data.get("travel_time", 0.0)

        return leg_cost, path, round(total_dist, 1), round(total_time, 1)

    def get_cost_matrix(self, stop_nodes: List[int]) -> Tuple[List[List[float]], Dict[Tuple[int, int], List[int]]]:
        """
        Returns a square cost matrix for the subset of stop nodes (including start/depot).
        Used by optimization algorithms for instant O(1) leg lookup.
        Computes single-source Dijkstra lazily for each stop node.
        """
        n = len(stop_nodes)
        matrix = [[0.0] * n for _ in range(n)]
        legs: Dict[Tuple[int, int], List[int]] = {}

        for i in range(n):
            u = stop_nodes[i]
            lengths, paths = nx.single_source_dijkstra(self.graph, u, weight="cost")
            for j in range(n):
                v = stop_nodes[j]
                if i != j:
                    matrix[i][j] = lengths.get(v, float('inf'))
                    legs[(u, v)] = paths.get(v, [u, v])
                else:
                    matrix[i][j] = 0.0
                    legs[(u, v)] = [u]

        return matrix, legs

    def to_dict(self) -> Dict[str, Any]:
        """Serializes the network for frontend JSON delivery."""
        return {
            "num_nodes": self.num_nodes,
            "congestion_mode": self.congestion_mode,
            "nodes": list(self.nodes_data.values()),
            "edges": self.edges_data,
            "summary": {
                "total_edges": len(self.edges_data),
                "avg_congestion": round(sum(e["current_congestion"] for e in self.edges_data) / max(1, len(self.edges_data)), 3),
                "arterial_count": sum(1 for e in self.edges_data if e["is_arterial"]),
            }
        }
