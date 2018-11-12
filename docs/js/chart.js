/**
 * Construct a sample chart, accepting runtime environment loaded dependencies and data. This object is not aware of
 * where it runs: browser or node/V8
 *
 * @param d3
 * @param _jsonData json data string
 * @returns {Function}
 */


function chart(d3, _jsonData) {

  // loading sample.json
var jsonData = _jsonData["Data"]; 

// date manipulation to format
jsonData.forEach(function(d) { d.time = new Date(d.time * 1000); });

// helpers and constants
var margin = {top: 20, right: 20, bottom: 30, left: 50};
var margin = {top: 20, right: 20, bottom: 30, left: 10};
var width = 480 - margin.left - margin.right;
var height = 250 - margin.top - margin.bottom;

// var margin = {"top": 50, "right": 83, "bottom": 56, "left": 50};
// var width = 676 + margin.right + margin.left;
// var height = 390 + margin.top + margin.bottom;
//var timeFormat = d3.time.format("%c");
var timeFormat = d3.timeParse("%d-%b-%y");
var X = width/jsonData.length*0.25;


  
// find data range
var xDomain = d3.extent(jsonData, function (d, i){ return d.time; });
var yMin = d3.min(jsonData, function(d){ return Math.min(d.low); });
var yMax = d3.max(jsonData, function(d){ return Math.max(d.high); });

// scale using ranges, add 10pc padding to x-domain
//var xScale = d3.time.scale()
var xScale = d3.scaleTime()
  .domain(xDomain);

xScale.domain([-0.1,1.1].map(xScale.invert))
  .range([margin.left, width - margin.right]);

//var yScale = d3.scale.linear()
var yScale = d3.scaleLinear()
  .domain([yMin, yMax])
  .range([height - margin.top, margin.bottom]);



// set up axes
// var xAxis = d3.svg.axis()
//     .scale(xScale)
//     .orient("bottom")
//   .ticks(4)
//   .tickPadding(10);
// // .tickFormat(timeFormat)

 var xAxis = d3.axisBottom(xScale).ticks(4).tickPadding(10);

// var yAxis = d3.svg.axis()
//   .scale(yScale)
//   .orient("right")
//   .tickValues(yScale.domain());
  var yAxis = d3.axisRight(yScale).tickValues(yScale.domain())

  return function(g) {

    
// set up chart
//var svg = d3.select("svg").attr("width", width).attr("height", height);

var chart = g.append("svg") 
  .attr("version", "1.1")
  .attr("xmlns", "http://www.w3.org/2000/svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
  
      

// draw chart
chart.selectAll("line")
    .data(jsonData)
    .enter()
    .append("svg:line")
    .attr('x1', function(d,i) { return (xScale(d.time) - (X*0.5))})
    .attr( 'x2', function(d,i) { return xScale(d.time) - X*0.5; })
    .attr( 'y1', function(d,i) { return yScale(d.high); })
    .attr( 'y2', function(d,i) { return yScale(d.low); })
    .attr('stroke', 'black');
 

chart.selectAll("rect")
    .data(jsonData)
    .enter()
    .append("svg:rect")
      .attr('width', function(d){ return X})
      .attr('x', function(d,i) { return xScale(d.time) - X; })
      .attr('y', function(d,i) { return yScale(Math.max(d.open, d.close)); })
      .attr('height', function(d,i) { return yScale(Math.min(d.open, d.close)) - yScale(Math.max(d.open, d.close)); })
      .attr('fill',function (d) { return d.open > d.close ? "red" : "green" })
      .attr('stroke', 'black')
    

chart.append('g').call(xAxis)
  .attr('transform', 'translate(0, ' + (height - margin.bottom) + ')');

chart.append('g').call(yAxis)
    .attr('transform', 'translate(' + (width - margin.right) + ')')
    //  .attr("transform", "rotate(90)")
   }




     

}
// function chart(d3, techan, csvData) {
//   var margin = {top: 20, right: 20, bottom: 30, left: 50},
//       width = 960 - margin.left - margin.right,
//       height = 250 - margin.top - margin.bottom;

//   var parseDate = d3.timeParse("%d-%b-%y");

//   var x = techan.scale.financetime()
//     .range([0, width]);

//   var y = d3.scaleLinear()
//     .range([height, 0]);

//   var candlestick = techan.plot.candlestick()
//     .xScale(x)
//     .yScale(y);

//   var accessor = candlestick.accessor();

//   var xAxis = d3.axisBottom(x);

//   var yAxis = d3.axisLeft(y);

//   //var data = csvData.slice(0, 200).map(function (d) {
//   var data = csvData[Data].map(function (d) {
//     return {
//       d.Date = new Date(d.time * 1000); 
//       date: parseDate(d.Date),
//       open: +d.Open,
//       high: +d.High,
//       low: +d.Low,
//       close: +d.Close,
//       volume: +d.Volume
//     };
//   }).sort(function (a, b) {
//     return d3.ascending(a.date, b.date);
//   });

  // return function(g) {
  //   var svg = g.append("svg")
  //       .attr("version", "1.1")
  //       .attr("xmlns", "http://www.w3.org/2000/svg")
  //       .attr("width", width + margin.left + margin.right)
  //       .attr("height", height + margin.top + margin.bottom)
  //     .append("g")
  //       .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  //   x.domain(data.map(accessor.d));
  //   y.domain(techan.scale.plot.ohlc(data, accessor).domain());

  //   svg.append("g")
  //     .datum(data)
  //     .attr("class", "candlestick")
  //     .call(candlestick);

  //   svg.append("g")
  //     .attr("class", "x axis")
  //     .attr("transform", "translate(0," + height + ")")
  //     .call(xAxis);

  //   svg.append("g")
  //       .attr("class", "y axis")
  //       .call(yAxis)
  //     .append("text")
  //       .attr("transform", "rotate(-90)")
  //       .attr("y", 6)
  //       .attr("dy", ".71em")
  //       .style("text-anchor", "end")
  //       .text("Price ($)");
  // }
// }
// If we're in node
if(typeof module === 'object') {
  // Expose the chart
  module.exports = chart;

}