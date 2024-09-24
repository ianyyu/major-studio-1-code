import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

// Set the dimensions of the canvas to fill the viewport with padding
const padding = 20; // Padding on all sides
const stageW = window.innerWidth - padding * 2;
const stageH = window.innerHeight * 1.5; // Increased height to accommodate visualization
const nodeRadius = 2.5;

// Function to map categories to colors
const categoryColor = {
  bee: "#E1A282",        // Changed from 'red' to '#E1A282'
  butterfly: "#80C9BC",  // Changed from 'green' to '#80C9BC'
  moth: "#AFB1C7",       // Changed from 'gray' to '#AFB1C7'
};

// Start with all nodes gray
let curCategoryColor = () => "gray";

// Function to determine the color of a node
const nodeColor = (n) =>
  n.controlId ? "transparent" : curCategoryColor(n.category) || "black";

// Function to setup the canvas
function setupCanvas(selector, W, H) {
  // Get the canvas element and its context
  const canvas = d3
    .select(selector)
    .attr("width", W)
    .attr("height", H)
    .style("width", W + "px")
    .style("height", H + "px")
    .style("margin", `${padding}px`)
    .node(); // Get the actual DOM node

  const stage = canvas.getContext("2d");

  // Translate the context to center the origin
  stage.translate(W / 2, H / 2);

  // Keeping <0, 0> in the middle of the stage
  const stageTop = -H / 2;
  const stageLeft = -W / 2;

  function drawDots(_nodes, getColor) {
    stage.clearRect(stageLeft, stageTop, W, H);

    // Separate nodes into control nodes and data nodes
    const controlNodes = _nodes.filter((n) => n.controlId);
    const dataNodes = _nodes.filter((n) => !n.controlId);

    // Determine moving nodes (nodes with significant velocity)
    const movingNodes = dataNodes.filter(
      (n) => Math.hypot(n.vx || 0, n.vy || 0) > 0.1
    );
    const stationaryNodes = dataNodes.filter(
      (n) => Math.hypot(n.vx || 0, n.vy || 0) <= 0.1
    );

    // Draw stationary data nodes
    stationaryNodes.forEach((n) => {
      stage.fillStyle = getColor(n);
      stage.beginPath();
      stage.arc(n.x, n.y, nodeRadius, 0, 2 * Math.PI, 0);
      stage.fill();
    });

    // Draw moving data nodes on top
    movingNodes.forEach((n) => {
      stage.fillStyle = getColor(n);
      stage.beginPath();
      stage.arc(n.x, n.y, nodeRadius, 0, 2 * Math.PI, 0);
      stage.fill();
    });
  }

  return { drawDots: drawDots, canvas: canvas };
}

// Function to create control nodes
const mkControlNode = (name, controlPos) => {
  const [x, y] = controlPos[name];
  return { fx: x, fy: y, controlId: name };
};

// Utility functions
// Generate batches of a given size
function* batches(iterable, size) {
  const it = iterable[Symbol.iterator]();
  let value,
    done = false;
  do {
    ({ value, done } = it.next());
    if (done) return value;

    let currBatch = 1;
    yield (function* () {
      yield value;
      while (currBatch < size) {
        ({ value, done } = it.next());
        if (done) return value;

        yield value;
        currBatch += 1;
      }
    })();
  } while (true);
}

// Your existing fetchData function
const fetchData = async () => {
  const data = await d3.json("data.json");
  return data;
};

// Main async function to load data and set up visualization
(async function () {
  // Fetch the data
  const data = await fetchData();

  // Process data and set up visualization

  // Set up the canvas
  const stage = setupCanvas("#stage", stageW, stageH);
  const canvas = stage.canvas;

  // Extract unique categories and countries
  const categories = Array.from(new Set(data.map((d) => d.category)));

  const countries = Array.from(
    new Set(
      data.map(function (d) {
        return (
          (d.geoLocation &&
            d.geoLocation[0] &&
            d.geoLocation[0].L2 &&
            d.geoLocation[0].L2.content) ||
          "Unknown"
        );
      })
    )
  );

  // Define control positions
  const controlPos = {
    init: [0, -stageH / 2 + 100], // Position at the top of the canvas
    // Positions for categories and countries will be added below
  };

  // Define positions for categories (arranged horizontally with spacing)
  const categorySpacing = Math.min(stageW / categories.length, 200); // Adjust spacing to fit within canvas
  categories.forEach(function (category, index) {
    const x = (index - (categories.length - 1) / 2) * categorySpacing;
    const y = -stageH / 4 + 150; // Position categories beneath the initial cluster
    controlPos[category] = [x, y];
  });

  // Define positions for countries (arranged in a grid)
  const numCols = Math.ceil(Math.sqrt(countries.length));
  const spacingX = Math.min(stageW / numCols, 150); // Adjust spacing to fit within canvas
  const spacingY = Math.min(stageH / numCols, 150);
  countries.forEach(function (country, index) {
    const row = Math.floor(index / numCols);
    const col = index % numCols;
    const x = (col - (numCols - 1) / 2) * spacingX;
    const y = (row - (numCols - 1) / 2) * spacingY + stageH / 4; // Shift further down
    controlPos[country] = [x, y];
  });

  // Create control nodes
  const controlNodeNames = Object.keys(controlPos);
  const controlNodes = controlNodeNames.map((name) =>
    mkControlNode(name, controlPos)
  );

  // Create nodes
  const nodes = controlNodes.concat(
    data.map(function (d) {
      return {
        category: d.category,
        country:
          (d.geoLocation &&
            d.geoLocation[0] &&
            d.geoLocation[0].L2 &&
            d.geoLocation[0].L2.content) ||
          "Unknown",
        x: controlPos.init[0] + (Math.random() - 0.5) * 50, // Start near the initial cluster
        y: controlPos.init[1] + (Math.random() - 0.5) * 50,
      };
    })
  );

  // Set up links
  const nodeIdx = (i) => i + controlNodes.length;
  const links = nodes.slice(controlNodes.length).map((n, i) => ({
    source: nodeIdx(i),
    target: "init",
  }));

  // Set up simulation
  const simulation = d3.forceSimulation(nodes);

  // Forces
  const linkForce = d3
    .forceLink(links)
    .strength(1.0)
    .distance(0)
    .id((node) => node.controlId || node.index);

  const chargeForce = d3.forceManyBody().strength((n, i) =>
    i < controlNodes.length ? 0 : -15
  );

  // Add collision force to prevent overlap
  const collisionForce = d3.forceCollide().radius(nodeRadius + 2).iterations(4);

  simulation
    .force("links", linkForce)
    .force("charge", chargeForce)
    .force("collision", collisionForce)
    .force("x", d3.forceX().strength(0.1))
    .force("y", d3.forceY().strength(0.1))
    .force(
      "bounding-box",
      function () {
        // Custom force to keep nodes within canvas bounds
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          const radius = nodeRadius + 2;
          n.x = Math.max(
            -stageW / 2 + radius,
            Math.min(stageW / 2 - radius, n.x)
          );
          n.y = Math.max(
            -stageH / 2 + radius,
            Math.min(stageH / 2 - radius, n.y)
          );
        }
      }
    );

  // On every tick, redraw with current colors
  simulation.on("tick.draw", () => stage.drawDots(nodes, nodeColor));

  // Animation control
  const simulationEnd = () =>
    new Promise((resolve) => simulation.on(`end.${+new Date()}`, resolve));

  // Initial simulation settings
  simulation.alphaMin(0.1).velocityDecay(0.6);
  chargeForce.distanceMax((1 / 3) * stageW);

  simulationEnd()
    .then(() => {
      // Nodes change color to their category colors
      curCategoryColor = (category) => categoryColor[category] || "black";
      chargeForce.distanceMax((1 / 6) * stageW);
      simulation.velocityDecay(0.5);

      // Adjust forces for tighter clustering by category
      linkForce.strength(1.0).distance(0);
      chargeForce.strength((n, i) => (i < controlNodes.length ? 0 : -15));

      // Adjust collision force for more rounded clusters
      collisionForce.radius(nodeRadius + 2).iterations(4);

      return targetAnimation((n) => n.category);
    })
    .then(() => {
      // Nodes split based on country
      chargeForce.distanceMax((1 / 6) * stageW);
      simulation.velocityDecay(0.5);

      // Adjust forces for tighter clustering by country
      linkForce.strength(1.0).distance(0);
      chargeForce.strength((n, i) => (i < controlNodes.length ? 0 : -15));

      return targetAnimation((n) => n.country);
    })
    .then(() => {
      // After final visualization, add subtitles below each cluster
      addSubtitles();
    });

  // Retarget each node to `newTarget(node)`
  // Animate in batches
  function targetAnimation(newTarget) {
    // Animate nodes from bottom to top
    // Collect the order only once for randomness during simulation
    const inds = d3.range(links.length);

    const changeBatches = batches(inds, 10);

    const updateSimulation = () => {
      linkForce.links(links);
      simulation.alpha(1);
    };

    // Restart simulation if it's over
    simulation.alpha(1).restart();

    // Process a batch every timer tick
    const timer = d3.interval(() => {
      const { value, done } = changeBatches.next();
      if (!done) {
        // Update current batch
        for (let i of value) {
          links[i].target = newTarget(nodes[nodeIdx(i)]);
        }
        updateSimulation();
      } else {
        timer.stop();
      }
    }, 30);

    return simulationEnd();
  }

  // ================================
  // Add subtitles below each cluster
  // ================================

  function addSubtitles() {
    // Remove existing subtitles if any
    d3.selectAll(".subtitle").remove();

    // Get positions of control nodes for countries
    const countryPositions = {};
    controlNodes.forEach((n) => {
      if (n.controlId && countries.includes(n.controlId)) {
        countryPositions[n.controlId] = {
          x: n.fx,
          y: n.fy,
        };
      }
    });

    // Append subtitles for each country cluster
    Object.keys(countryPositions).forEach((country) => {
      const pos = countryPositions[country];

      // Create a div for each subtitle
      d3.select("body")
        .append("div")
        .attr("class", "subtitle")
        .style("position", "absolute")
        .style("left", `${canvas.offsetLeft + stageW / 2 + pos.x}px`)
        .style("top", `${canvas.offsetTop + stageH / 2 + pos.y + 30}px`) // Adjust position below cluster
        .style("transform", "translate(-50%, 0)") // Center the text
        .style("text-align", "center")
        .style("font-size", "14px")
        .style("color", "#333")
        .text(country);
    });
  }

  // ================================
  // Add the event listener for hover
  // ================================

  // Create tooltip div
  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("background-color", "white")
    .style("padding", "5px")
    .style("border", "1px solid black")
    .style("border-radius", "3px")
    .style("font-size", "12px");

  // Mousemove event listener
  canvas.addEventListener("mousemove", function (event) {
    // Get bounding rectangle of canvas
    const rect = canvas.getBoundingClientRect();

    // Calculate mouse position relative to the canvas coordinate system
    const mouseX = event.clientX - rect.left - stageW / 2;
    const mouseY = event.clientY - rect.top - stageH / 2;

    let found = false;

    // Iterate over the nodes to check if mouse is over a dot
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.controlId) continue; // Skip control nodes

      // Calculate distance between mouse and node
      const dx = mouseX - n.x;
      const dy = mouseY - n.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= nodeRadius) {
        // Mouse is over this node
        tooltip
          .style("visibility", "visible")
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY + 10 + "px")
          .html("Category: " + n.category + "<br>Country: " + n.country);

        found = true;
        break; // Stop checking after finding the node
      }
    }

    if (!found) {
      // Hide tooltip if mouse is not over any node
      tooltip.style("visibility", "hidden");
    }
  });

  // Optional: Hide tooltip when mouse leaves the canvas
  canvas.addEventListener("mouseout", function () {
    tooltip.style("visibility", "hidden");
  });
})();
