# EV Reachability Map

## 🚀 Live Application

Visit the Live Site Here: **[https://reachability-map.onrender.com/](https://reachability-map.onrender.com/)**

## Project Overview

The **EV Reachability Map** is a specialized geospatial application designed to enhance the planning and navigation experience for Electric Vehicle (EV) users. It provides immediate, visual feedback on a vehicle's range limit and optimizes routes, ensuring drivers can confidently manage battery consumption on any journey.

## Key Features

The application provides integrated routing, range calculation, and charging infrastructure visualization capabilities.

### 🗺️ Core Mapping & Visualization

- **Optimal Route Generation:**  
  After entering a starting point and destination, the system calculates and visualizes the most efficient route to the destination.

- **Charging Station Integration:**  
  Displays real-time locations of nearby charging stations as interactive markers on the map.

- **Battery Level Visualization:**  
  The application visualizes battery consumption along each segment of the optimal route using a color palette. Hovering over the vehicle on the map displays the estimated remaining battery percentage at that specific point.

### 🚗 Routing & Planning

- **Starting Point Setup:**  
  Users define their journey by inputting their address/coordinates and the vehicle's initial battery level.

- **Interactive Path Selectionn:**  
  Users can select a destination by directly clicking on the map. The system then calculates the most efficient route, accounting for battery consumption.

- **Battery Consumption Estimation:**  
  The system estimates and displays the remaining battery level upon arrival at the selected destination, helping users assess trip feasibility.

- **Charging at Stations:**  
  Selecting a charging station allows users to simulate recharging their EV battery, which updates the route and range accordingly.

- **Reset Journey:**  
  A dedicated Reset button allows users to clear all inputs and return the application to the original state, restoring the starting point and clearing any active routes or markers.
  
## Tech Stack Highlights

This application relies on a robust and scalable technology stack, emphasizing geospatial data performance and modern web mapping standards.

| Component            | Technology                       | Notes |
|----------------------|----------------------------------|-------|
| **Frontend**          | JavaScript (Vanilla JS), HTML, CSS | Powers the application logic and interactive User Interface. |
| **Mapping Library**   | Leaflet.js                       | Lightweight, performance-focused library for map rendering and control management. |
| **Geospatial Database**| PostgreSQL with PostGIS          | Used for high-performance storage and complex querying of geographic data, such as charging station locations and boundary data. |
| **Routing/Range APIs**| External/Custom Backend Service  | Provides specialized endpoints for `createPath` (routing) and `getalphashape` (range calculation). |
| **Deployment**        | Render                           | Cloud platform used for hosting the live application and its backend services. |

