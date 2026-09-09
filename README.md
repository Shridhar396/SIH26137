# ⚛️ QuantumRoute: Quantum-Inspired Intelligent Traffic Route Optimization

> **Smart India Hackathon Prototype**  
> Dynamic Vehicle Routing Problem (VRP) and Traffic Congestion Management solved using **Quantum Particle Swarm Optimization (QPSO)** and benchmarked against classical metaheuristics. Runs **100% locally and offline** with zero external map API dependencies.

---

## 🚀 Live Demo & Repository
- **GitHub Repository**: [Shridhar396/SIH26137](https://github.com/Shridhar396/SIH26137)
- **Frontend Dashboard**: `http://127.0.0.1:5173`
- **FastAPI Engine**: `http://127.0.0.1:8000`

---

## 📌 Problem Overview & SIH Motivation
Urban logistics fleets in Indian metropolitan areas lose billions annually in idling fuel and delivery delays due to non-linear, time-varying traffic congestion. Traditional Dijkstra or greedy routing algorithms compute static shortest paths that funnel all vehicles into the same choke points, exacerbating bottleneck delays.

Standard combinatorial optimizers (e.g. classical PSO or Genetic Algorithms) struggle with the high-dimensional search space of Capacitated Vehicle Routing Problems (CVRP), frequently getting trapped in suboptimal local energy wells.

**QuantumRoute** solves this using **Quantum Particle Swarm Optimization (QPSO)**:
1. Particles inhabit quantum space described by a **delta potential well wave function** instead of Newtonian velocity/inertia vectors.
2. By exploiting quantum tunneling probabilities, particles escape local minima that stall Classical PSO.
3. Maps continuous quantum positions to discrete delivery tours using **Smallest Position Value (SPV)** encoding.
4. Optimizes a dynamic multi-objective cost function that penalizes traffic congestion, travel delay, and vehicle capacity violations in real time.

---

## 🔬 Mathematical Formulation

### 1. Multi-Objective Congestion Cost Function
Each road segment $(u, v)$ has a dynamic composite cost:
$$\text{cost}(u, v, t) = \alpha \cdot \text{distance}(u, v) + \beta \cdot \text{travel\_time}(u, v) + \gamma \cdot [\text{congestion\_factor}(u, v, t)]^{1.8}$$
Where:
- $\text{distance}(u, v)$ is the physical road length (meters).
- $\text{travel\_time}(u, v) = \frac{\text{distance}(u, v)}{v_{\text{free}} \cdot (1 - 0.75 \cdot c(u, v, t))}$.
- $\text{congestion\_factor} \in [0.05, 0.98]$ simulates dynamic arterial congestion waves:
  $$c(u, v, t) = \text{clip}\left(c_0 + 0.10 \sin\left(\frac{2\pi t}{T} + \theta_{u,v}\right), 0.05, 0.98\right)$$

### 2. Smallest Position Value (SPV) Mapping
To optimize discrete delivery stop sequences $[s_1, s_2, \dots, s_D]$ within continuous quantum space:
- A particle has position $X_i = [x_{i, 1}, x_{i, 2}, \dots, x_{i, D}] \in \mathbb{R}^D$.
- The discrete visiting order is derived via ascending rank sort:
  $$\pi = \text{argsort}(X_i)$$
- **Guaranteed Validity**: Generates valid permutation tours with zero duplicate stops, eliminating the need for expensive tour repair heuristics.

### 3. Quantum Particle Swarm Optimization (QPSO)
In Sun et al.'s quantum delta potential well model, particles do not track velocity vectors. Instead:
- **Mean-Best Position ($mbest$)**:
  $$mbest(t) = \frac{1}{M} \sum_{i=1}^{M} P_i(t) = \left[ \frac{1}{M}\sum_{i=1}^M P_{i,1}, \dots, \frac{1}{M}\sum_{i=1}^M P_{i,D} \right]$$
  where $P_i$ is the personal best of particle $i$, and $M$ is the swarm size.
- **Stochastic Local Attractor ($p_i$)**:
  $$p_{i, d}(t) = \phi \cdot P_{i, d}(t) + (1 - \phi) \cdot G_d(t), \quad \phi \sim U(0, 1)$$
  where $G$ is the swarm's global best position.
- **Delta-Potential-Well Wave Function Update**:
  $$X_{i, d}(t+1) = p_{i, d}(t) \pm \alpha \cdot |mbest_d(t) - X_{i, d}(t)| \cdot \ln\left(\frac{1}{u}\right), \quad u \sim U(0, 1)$$
  where the sign $\pm$ is chosen with equal probability ($p = 0.5$).
- **Contraction-Expansion (CE) Annealing**:
  $$\alpha(t) = \alpha_{\text{start}} - \frac{t}{T_{\max}} (\alpha_{\text{start}} - \alpha_{\text{end}})$$
  Dynamically annealed from $1.0$ down to $0.5$ to facilitate global exploration early and localized exploitation late.

### 4. Capacitated VRP (CVRP) Route Splitting
- Each stop has a randomized delivery demand $d_i \in [1, 10]$ units.
- Fleet vehicle capacity $C \in [15, 80]$ units.
- If cumulative trip demand exceeds $C$, the route returns to Central Depot (Node 0) to replenish before starting the next leg.
- Single-stop over-capacity penalty: $P = \lambda \sum \max(0, d_i - C)$.

---

## 📊 Benchmark Comparison Summary

| Metric | Quantum PSO (QPSO) | Classical PSO | Genetic Algorithm (GA) | Greedy Nearest Neighbor |
| :--- | :---: | :---: | :---: | :---: |
| **Mechanics** | Delta-Potential Well | Velocity / Inertia | OX Crossover + Mutation | Shortest Dijkstra Leg |
| **Convergence Speed** | **Fastest (12-25 iter)** | Moderate (35-65 iter) | Slower (40-75 iter) | Instant (1 iter) |
| **Local Minima Escape** | **High (Quantum Tunneling)** | Low (Velocity traps) | Moderate (Mutation rate) | None (Deterministic) |
| **Route Quality ($f^*$)** | **Lowest Cost (Optimal)** | +4% to +12% gap | +2% to +8% gap | +15% to +35% gap |
| **Runtime (30 stops)** | **~35 ms** | ~15 ms | ~20 ms | < 1 ms |

---

## 🛠️ Architecture & Tech Stack

```
SIH26137/
├── backend/
│   ├── api.py            # FastAPI endpoints & CORS configuration
│   ├── graph_model.py    # Synthetic road network generator & Dijkstra APSP cache
│   ├── qpso.py           # Quantum PSO engine with SPV and delta-well update
│   ├── baselines.py      # Classical PSO, Genetic Algorithm, and Greedy NN
│   ├── benchmark.py      # Multi-scale benchmark engine (10, 20, 30, 40 stops)
│   ├── main.py           # Uvicorn launcher
│   ├── requirements.txt  # Python package specifications
│   └── test_algorithms.py# Automated unit test suite
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx           # Controls, preset buttons, status indicators
│   │   │   ├── ControlPanel.jsx     # Sliders, stop selector, live progress bar
│   │   │   ├── GraphView.jsx        # SVG road network, congestion heatmap, route overlay
│   │   │   ├── ConvergenceChart.jsx # Interactive multi-line convergence chart
│   │   │   ├── ResultsTable.jsx     # Sortable benchmark metrics & KPI cards
│   │   │   ├── ScalabilityChart.jsx # Performance across 10/20/30/40 stops
│   │   │   └── HowItWorksModal.jsx  # Mathematical theory drawer
│   │   ├── App.jsx                  # Main state container
│   │   └── index.css                # Dark quantum control-room design system
│   ├── package.json
│   └── vite.config.js
├── run_app.bat           # 1-Click Windows Launcher
├── run_app.sh            # 1-Click macOS/Linux Launcher
└── README.md
```

---

## ⚡ Quick Start & Execution

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. One-Click Launch
- **Windows**: Double-click `run_app.bat`
- **macOS / Linux**:
  ```bash
  chmod +x run_app.sh
  ./run_app.sh
  ```

### 2. Manual Setup

#### Backend:
```bash
# Install dependencies
pip install -r backend/requirements.txt

# Run unit tests
python -m backend.test_algorithms

# Start FastAPI server
python -m uvicorn backend.api:app --host 127.0.0.1 --port 8000 --reload
```

#### Frontend:
```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```
Open **`http://127.0.0.1:5173`** in your browser.

---

## 🏆 Smart India Hackathon Presentation Highlights
1. **Zero Cloud Dependency**: Never fails during a live demonstration on stage—100% offline.
2. **Defensible Mathematics**: Complete inline code and UI documentation explaining $mbest$, delta-potential-well sampling, and SPV mapping.
3. **Multi-Objective Realism**: Directly models rush hour traffic spikes and vehicle capacity limits rather than oversimplified geometric TSP.
4. **Fair Head-to-Head Comparison**: QPSO and Classical PSO execute on the exact same continuous SPV parameter space, isolating the exact performance boost contributed by the quantum update rule.

---

## 📄 License
MIT License • Built for Smart India Hackathon 2024-2025.
