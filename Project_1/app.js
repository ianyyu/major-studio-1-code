import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import RiTa from "https://cdn.jsdelivr.net/npm/rita@2.8.31/+esm";
import Sentiment from "https://cdn.jsdelivr.net/npm/sentiment@5.0.2/+esm";

const sentiment = new Sentiment();

const COMMON_WORDS = ["the", "be", "to", "of", "and", "a", "in", "that", 
"have", "I", "it", "for", "not", "on", "with", "he", "as", "you", "do", "at", "no", "No","Want", "Like", "help", "want", "good"];


const fileNames = ["Biden_2021.txt", "Trump_2017.txt", "Obama_2009.txt", "Bush_2001.txt", "Clinton_1994.txt", "Bush_1989.txt", "Reagan_1982.txt", "Carter_1978.txt"];


// Define your frequency threshold
const FREQUENCY_THRESHOLD = 30; // Adjust this value as needed

// Modify your fetchData function
const fetchData = async (fileName) => {
  const text = await d3.text(`/sotu/${fileName}`);
  const tokenized = RiTa.tokenize(text);
  const scored = new Map();

  for (let i = 0; i < tokenized.length; i++) {
    const input = tokenized[i];
    const word = RiTa.stem(input);
    // Skip common words
    if (COMMON_WORDS.includes(word)) continue;

    let count = 1;
    let score = NaN;
    let category = "";

    if (scored.has(word)) {
      const prevEntry = scored.get(word);
      count = prevEntry.count + 1;
      score = prevEntry.score;
    } else {
      count = 1;
      score = sentiment.analyze(word).score;
    }

    if (score < 0) {
      category = "negative";
    } else if (score > 0) {
      category = "positive";
    } else {
      category = "neutral";
    }

    scored.set(word, { word, count, score, category });
  }

  // Filter out common words
  const uncommonWords = Array.from(scored.values()).filter(entry => entry.count <= FREQUENCY_THRESHOLD);

  return uncommonWords;
};



// Function to create a visualization for a given file
const createVisualization = async (containerId, fileName) => {
  // Fetch data for the specified file
  const title = fileName.replace(".txt", "").replace(/_/g, " ");
  const data = await fetchData(fileName);

const getTopWords = (arr, predicate) => {
  return (
    arr
      // use the predicate to filter the array
      .filter(predicate)
      // sort the array by count
      .sort((a, b) => b.count - a.count)
      // return the first 10 items
      .slice(0, 20)
  );
};

const WIDTH = 1200,
  HEIGHT = 650;

// a list of the top 10 occurring positive words
const positiveWords = getTopWords(data, (d) => d.score > 0);

// a list of the top 10 occurring negative words
const negativeWords = getTopWords(data, (d) => d.score < 0);

const arr = d3
  .merge([positiveWords, negativeWords])
  .sort((a, b) => b.count - a.count)
  .map((entry) => {
    // set initial x and y
    // this will be overwritten by d3.forceSimulation
    return Object.assign({}, entry, {
      // if entry is position, place on the left
      // if entry is negative, place on te right
      x: entry.category === 'positive' ? 0 : WIDTH,
      y: HEIGHT * 0.5,
    });
  });;

const [minSize, maxSize] = d3.extent(arr, (d) => d.count);

const sizeScale = d3.scaleLinear().domain([minSize, maxSize]).range([25, 110]);

const colorScale = d3
  .scaleOrdinal()
  .domain(["negative", "positive"])
  .range(["#FF9F1C", "#2EC4B6"]);

const gridContainer = d3.select("#visualization-grid");

const visualizationContainer = gridContainer
  .append("div")
  .style("border", "1px solid #ddd")
  .style("border-radius", "10px")
  .style("padding", "10px")
  .style("background", "#fff")
  .style("box-shadow", "0px 0px 2px hsla(0, 0%, 0%, 0.1)")
  .style("width", "100%");

visualizationContainer
  .append("h2")
  .style("margin", "0")
  .style("padding", "10px")
  .style("font-size", "1.2rem")
  .style("font-weight", 600)
  .style("color", "#333")
  .text(title);

// const app = d3


const chart = visualizationContainer
  .append("svg")
  .attr("width", WIDTH)
  .attr("height", HEIGHT)
  .attr("viewBox", `100 100 ${WIDTH} ${HEIGHT}`)
  .style("max-width", "100%")
  .style("height", "auto");

const circleLayer = chart.append("g").attr("data-layer", "circle-layer");

const ticked = () => {
  console.log({ arr });
  circleLayer
    .selectAll("g")
    .data(arr, (d) => d.word)
    .join(
      (enter) => {
        enter
          .append("g")
          .attr("transform", (d) => `translate(${d.x} ${d.y})`)
          .call((g) =>
            g
              .append("circle")
              .attr("r", (d) => sizeScale(d.count))
              .attr("fill", (d) => {
                const hex = colorScale(d.category);
                return `color-mix(in srgb, ${hex}, white 30%)`;
              })
          )
          .call((g) => {
            g.append("text")
              .attr("text-anchor", "middle")
              .attr("dominant-baseline", "middle")
              .attr('font-size', '16px')
              .attr('font-weight', 500)
              .attr("fill", (d) => {
                const hex = colorScale(d.category);
                return `color-mix(in srgb, ${hex}, black 70%)`;
              })
              .attr('transform', 'translate(0 -9)')
              .text((d) => d.word);

            g.append("text")
              .attr("text-anchor", "middle")
              .attr("dominant-baseline", "middle")
              .attr('font-size', '16px')
              .attr("fill", (d) => {
                const hex = colorScale(d.category);
                return `color-mix(in srgb, ${hex}, black 40%)`;
              })
              .attr('transform', 'translate(0 9)')
              .text((d) => d.count);
          });
      },
      (update) => {
        update.attr("transform", (d) => `translate(${d.x} ${d.y})`);
      },
      (exit) => {}
    );
};

const simulation = d3.forceSimulation(arr);

simulation.force("charge", d3.forceManyBody().strength(-70));

simulation.force(
  "x",
  d3.forceX().x((d) => {
    if (d.category === "positive") {
      return WIDTH / 3;
    } else {
      return (WIDTH / 3) * 2;
    }
  })
);

simulation.force("y", d3.forceY().y(HEIGHT * 0.5));

simulation.force(
  "collision",
  d3.forceCollide().radius((d) => sizeScale(d.count))
);

simulation.tick(50);

simulation.on("tick", ticked);
};

for (let i = 0; i < fileNames.length; i++) {
  createVisualization(`visualization${i + 1}`, fileNames[i]);
}